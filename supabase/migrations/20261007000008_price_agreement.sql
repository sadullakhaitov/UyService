-- UyService: narx kelishuvi va eshik kodi (CLAUDE.md 4-bo'lim "Narx kelishuvi va eshik kodi").
-- Ilovadagi oqim bilan bir xil (lib/orderSimulator.ts, app/master/job.tsx):
--   1) buyurtmada 4 xonali eshik kodi — faqat mijoz ko'radi (order_secrets). Usta yetib kelgach mijozdan so'rab
--      kiritadi (verify_door_code) — kelgan odam o'sha usta ekani tasdiqlanadi. 5 marta xato → 10 daqiqa kutish
--   2) usta narx yuboradi (propose_price): ish (chaqiruv ichida) ≥ chaqiruv narxi, ish va qism ≤ 10 mln;
--      faqat 'arrived' holatida va kod tasdiqlangandan keyin
--   3) mijoz javob beradi (respond_price): rozi → ish boshlanadi (in_progress); rozi emas → buyurtma yopiladi,
--      faqat chaqiruv to'lanadi (ko'rik, kafolat yo'q)
--   4) usta "Faqat ko'rik": arrived → completed (narx yuborilmagan bo'lsa, kod tasdiqlangan bo'lsa)
--   5) platforma ulushi foizi usta taklifni QABUL QILGAN paytda qotiriladi (orders.fee_percent) — ish o'rtasida
--      hujjat yuklab yoki tarif almashtirib foizni o'zgartirib bo'lmaydi

alter table public.orders
  add column price_status text not null default 'none'
    check (price_status in ('none', 'proposed', 'approved', 'declined')),
  add column price_sent_at timestamptz,
  add column door_verified_at timestamptz,
  add column fee_percent int check (fee_percent between 0 and 100);

-- Eshik kodi alohida jadvalda: buyurtma qatorini usta ham o'qiydi, kodni esa faqat mijoz ko'rishi kerak
create table public.order_secrets (
  order_id uuid primary key references public.orders (id) on delete cascade,
  door_code text not null check (door_code ~ '^[0-9]{4}$'),
  attempts int not null default 0,
  locked_until timestamptz
);
alter table public.order_secrets enable row level security;
create policy "order_secrets: mijoz" on public.order_secrets for select to authenticated
  using (public.is_order_client(order_id));
create policy "admin: hammasi" on public.order_secrets for select to authenticated
  using (public.is_admin());
-- yozish faqat server funksiyalari orqali (siyosat yo'q → RLS rad etadi)

-- Mijoz to'laydigan summa: narx kelishilgan bo'lsa — ish (chaqiruv ichida) + qism; aks holda — faqat chaqiruv
create or replace function public.order_total(o public.orders) returns int
language sql immutable as $$
  select case when o.price_status = 'approved'
              then coalesce(o.price_work, o.call_fee) + coalesce(o.price_parts, 0)
              else o.call_fee end
$$;

-- Yangi buyurtma — eshik kodi (store/index.ts → makeDoorCode: 1000…9999)
create or replace function public.orders_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.order_secrets (order_id, door_code)
  values (new.id, (1000 + floor(random() * 9000))::int::text)
  on conflict (order_id) do nothing;
  return null;
end $$;

create trigger orders_after_insert
  after insert on public.orders
  for each row execute function public.orders_after_insert();

-- Mavjud buyurtmalar uchun ham
insert into public.order_secrets (order_id, door_code)
select id, (1000 + floor(random() * 9000))::int::text from public.orders
on conflict (order_id) do nothing;

-- Qo'riqchi: narx endi to'g'ridan-to'g'ri yozilmaydi — faqat propose_price / respond_price orqali
create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  uid uuid := auth.uid();
  pct int;
  allowed text[];
  changed text[];
begin
  if tg_op = 'INSERT' then
    if not public.is_privileged() then
      -- mijoz faqat buyurtmaning o'zini yozadi; qolganini server to'ldiradi
      new.master_id := null;
      new.dispatch := null;
      new.dispatch_rev := 0;
      new.price_work := null;
      new.price_parts := null;
      new.price_status := 'none';
      new.price_sent_at := null;
      new.door_verified_at := null;
      new.fee_percent := null;
      new.platform_fee := null;
      new.cancel_reason := null;
      new.cancelled_by := null;
      new.accepted_at := null;
      new.completed_at := null;
      new.status := case when new.scheduled_at is not null then 'scheduled'::public.order_status else 'searching'::public.order_status end;
    end if;
    new.call_fee := coalesce((select call_fee from public.categories where id = new.category_id), new.call_fee);
    if new.problem_id is not null
       and not exists (select 1 from public.problems where id = new.problem_id and category_id = new.category_id) then
      raise exception 'orders.problem_id: kategoriyaga mos emas' using errcode = '23514';
    end if;
    return new;
  end if;

  -- UPDATE
  if not public.is_privileged() then
    select array_agg(n.key) into changed
    from jsonb_each(to_jsonb(new)) n
    join jsonb_each(to_jsonb(old)) o using (key)
    where n.value is distinct from o.value and n.key not in ('updated_at', 'location');

    if uid = old.client_id then
      -- mijoz: faqat bekor qilish — usta eshik kodini kiritib ichkariga kirgunga qadar
      -- (keyin "Rozi emasman" — faqat chaqiruv to'lanadi, respond_price)
      allowed := array['status', 'cancel_reason'];
      if new.status is distinct from old.status
         and not (new.status = 'cancelled'
                  and (old.status in ('scheduled', 'searching', 'assigned', 'on_the_way')
                       or (old.status = 'arrived' and old.door_verified_at is null))) then
        raise exception 'orders.status: mijoz faqat bekor qila oladi' using errcode = '42501';
      end if;
    elsif uid = old.master_id then
      -- usta: Yetib keldim → (kod, narx, mijoz roziligi) → Tugatdim; yoki "Faqat ko'rik"; yoki bekor qilish
      allowed := array['status', 'cancel_reason'];
      if new.status is distinct from old.status and not (
           (old.status = 'assigned' and new.status = 'on_the_way')
        or (old.status = 'on_the_way' and new.status = 'arrived')
        or (old.status = 'in_progress' and new.status = 'completed')
        or (old.status = 'arrived' and new.status = 'completed'
            and old.door_verified_at is not null and old.price_status = 'none')
        or (old.status in ('assigned', 'on_the_way', 'arrived') and new.status = 'cancelled')) then
        raise exception 'orders.status: % → % mumkin emas', old.status, new.status using errcode = '42501';
      end if;
    else
      raise exception 'orders: ruxsat yo''q' using errcode = '42501';
    end if;

    if exists (select 1 from unnest(coalesce(changed, '{}')) c where c <> all (allowed)) then
      raise exception 'orders: bu ustunlarni o''zgartirib bo''lmaydi: %', changed using errcode = '42501';
    end if;
  end if;

  -- Hosilaviy ustunlar
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_by := case
      when uid is not null and uid = old.client_id then 'client'
      when uid is not null and uid = old.master_id then 'master'
      else coalesce(new.cancelled_by, 'system') end;
  end if;
  -- Usta tayinlandi — ulush foizi shu paytdagi tarif va hujjat holati bo'yicha qotiriladi
  if new.master_id is not null and old.master_id is null then
    new.accepted_at := now();
    if new.fee_percent is null then
      select public.master_fee_percent(m) into new.fee_percent from public.masters m where m.id = new.master_id;
    end if;
  end if;
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
    pct := new.fee_percent;
    if pct is null then
      select public.master_fee_percent(m) into pct from public.masters m where m.id = new.master_id;
    end if;
    -- constants/billing.ts → platformCut: mijoz to'laydigan summa × ulush %
    new.platform_fee := round(public.order_total(new) * coalesce(pct, 10) / 100.0)::int;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ---------- Ilova chaqiradigan funksiyalar ----------

-- Mijoz: eshik kodini ko'rish (kuzatuv ekrani)
create or replace function public.order_door_code(p_order uuid) returns text
language sql stable security definer set search_path = public as $$
  select s.door_code from public.order_secrets s
  join public.orders o on o.id = s.order_id
  where s.order_id = p_order and o.client_id = auth.uid()
$$;

-- Usta: mijoz aytgan kodni tekshirish. true — to'g'ri (narx yuborish ochiladi), false — noto'g'ri
create or replace function public.verify_door_code(p_order uuid, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare o public.orders; s public.order_secrets;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.master_id is distinct from auth.uid() then
    raise exception 'orders: ruxsat yo''q' using errcode = '42501';
  end if;
  if o.status <> 'arrived' then
    raise exception 'orders: kod faqat yetib kelgandan keyin kiritiladi' using errcode = '22023';
  end if;
  if o.door_verified_at is not null then return true; end if;

  select * into s from public.order_secrets where order_id = p_order for update;
  if s.locked_until is not null and s.locked_until > now() then
    raise exception 'orders: urinishlar ko''p, keyinroq qayta urining' using errcode = '54000';
  end if;
  if s.door_code = btrim(coalesce(p_code, '')) then
    update public.order_secrets set attempts = 0, locked_until = null where order_id = p_order;
    update public.orders set door_verified_at = now() where id = p_order;
    return true;
  end if;
  update public.order_secrets
     set attempts = case when s.attempts + 1 >= 5 then 0 else s.attempts + 1 end,
         locked_until = case when s.attempts + 1 >= 5 then now() + interval '10 minutes' else null end
   where order_id = p_order;
  return false;
end $$;

-- Usta: narx yuborish (ish chaqiruv narxini o'z ichiga oladi)
create or replace function public.propose_price(p_order uuid, p_work int, p_parts int default 0) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.master_id is distinct from auth.uid() then
    raise exception 'orders: ruxsat yo''q' using errcode = '42501';
  end if;
  if o.status <> 'arrived' or o.door_verified_at is null then
    raise exception 'orders: narx eshik kodi tasdiqlangandan keyin yuboriladi' using errcode = '22023';
  end if;
  if o.price_status <> 'none' then
    raise exception 'orders: narx allaqachon yuborilgan' using errcode = '22023';
  end if;
  if p_work is null or p_work < o.call_fee or p_work > 10000000
     or coalesce(p_parts, 0) < 0 or coalesce(p_parts, 0) > 10000000 then
    raise exception 'orders: narx chegaradan tashqarida' using errcode = '22023';
  end if;
  update public.orders
     set price_work = p_work, price_parts = coalesce(p_parts, 0), price_status = 'proposed', price_sent_at = now()
   where id = p_order;
end $$;

-- Mijoz: narxga javob. Rozi — ish boshlanadi; rozi emas — faqat chaqiruv (ko'rik), buyurtma yopiladi
create or replace function public.respond_price(p_order uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.client_id is distinct from auth.uid() then
    raise exception 'orders: ruxsat yo''q' using errcode = '42501';
  end if;
  if o.status <> 'arrived' or o.price_status <> 'proposed' then
    raise exception 'orders: javob kutilayotgan narx yo''q' using errcode = '22023';
  end if;
  if p_approve then
    update public.orders set price_status = 'approved', status = 'in_progress' where id = p_order;
  else
    update public.orders set price_status = 'declined', status = 'completed' where id = p_order;
  end if;
end $$;

revoke execute on function public.order_door_code(uuid) from public, anon;
revoke execute on function public.verify_door_code(uuid, text) from public, anon;
revoke execute on function public.propose_price(uuid, int, int) from public, anon;
revoke execute on function public.respond_price(uuid, boolean) from public, anon;
grant execute on function public.order_door_code(uuid) to authenticated;
grant execute on function public.verify_door_code(uuid, text) to authenticated;
grant execute on function public.propose_price(uuid, int, int) to authenticated;
grant execute on function public.respond_price(uuid, boolean) to authenticated;
revoke execute on function public.orders_after_insert() from public, anon, authenticated;
