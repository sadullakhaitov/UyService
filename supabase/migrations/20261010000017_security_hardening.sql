-- UyService: xavfsizlik tekshiruvi natijalari (10-oktabr). Har bir band — topilgan teshik va uning yopilishi.
--  1) Usta taklifni qabul qilishdan oldin tarifini almashtirib ulushdan qochardi → tayinlash paytida usta buyurtma
--     olishi mumkinligi (balans/obuna) va bloklanmagani qayta tekshiriladi
--  2) "Mijoz eshikni ochmadi" — eshik kodi kiritilgandan yoki narx yuborilgandan keyin ham bosilardi → endi faqat kod
--     kiritilmagan, narx yuborilmagan va yetib kelganiga kamida 10 daqiqa bo'lgan bo'lsa; ustaning aktivligi kamaymaydi
--  3) Mijoz ham, usta ham istalgan paytda cancel_reason'ni o'zgartira olardi (masalan, "eshik ochilmadi" belgilarini
--     o'chirish yoki qo'shish) → faqat bekor qilish bilan birga, "client_absent"ni esa faqat server yozadi
--  4) profiles.deleted_at himoyalanmagan edi (o'zini admin ro'yxatidan yashirish) → faqat server
--  5) Faol buyurtmadagi qarshi tomon profilning hamma ustunini (push_token, telegram_id) o'qiy olardi → yopildi
--  6) Taklif olgan usta qabul qilishdan oldin buyurtmaning hamma ustunini (aniq manzil, xonadon, domofon) o'qiy olardi →
--     endi faqat offer_preview() orqali: kategoriya, muammo, tavsif va taxminiy joy
--  7) Buyurtma rasmi: mijoz buyurtmaga boshqa odamning rasm yo'lini yozib, ustaga ko'rsatishi mumkin edi → faqat o'z papkasi
--  8) Mayda: tavsif uzunligi, o'chirilgan kategoriyaga buyurtma, anon uchun yordamchi funksiyalar

-- ---------- 2) yetib kelgan vaqt ----------
alter table public.orders add column if not exists arrived_at timestamptz;

-- ---------- 1, 2, 3) buyurtma qo'riqchisi (oxirgi ta'rif — …_price_agreement.sql, shu yerda almashtiriladi) ----------
create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  uid uuid := auth.uid();
  pct int;
  allowed text[];
  changed text[];
  priv boolean := public.is_privileged();
  m public.masters;
begin
  if tg_op = 'INSERT' then
    if not priv then
      -- mijoz faqat buyurtmaning o'zini yozadi; qolganini server to'ldiradi
      new.master_id := null;
      new.dispatch := null;
      new.dispatch_rev := 0;
      new.price_work := null;
      new.price_parts := null;
      new.price_status := 'none';
      new.price_sent_at := null;
      new.door_verified_at := null;
      new.arrived_at := null;
      new.fee_percent := null;
      new.platform_fee := null;
      new.cancel_reason := null;
      new.cancelled_by := null;
      new.accepted_at := null;
      new.completed_at := null;
      new.status := case when new.scheduled_at is not null then 'scheduled'::public.order_status else 'searching'::public.order_status end;
      -- 7) rasmlar faqat mijozning o'z papkasidan
      if exists (select 1 from unnest(coalesce(new.photos, '{}')) p where split_part(p, '/', 1) <> new.client_id::text) then
        raise exception 'orders.photos: faqat o''z rasmlaringiz' using errcode = '42501';
      end if;
      -- 8) o'chirilgan kategoriyaga buyurtma berilmaydi
      if not exists (select 1 from public.categories where id = new.category_id and active) then
        raise exception 'orders.category_id: kategoriya faol emas' using errcode = '23514';
      end if;
    end if;
    new.call_fee := coalesce((select call_fee from public.categories where id = new.category_id), new.call_fee);
    if new.problem_id is not null
       and not exists (select 1 from public.problems where id = new.problem_id and category_id = new.category_id) then
      raise exception 'orders.problem_id: kategoriyaga mos emas' using errcode = '23514';
    end if;
    return new;
  end if;

  -- UPDATE
  if not priv then
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
    -- 3) sabab faqat bekor qilish bilan birga; "eshik ochilmadi"ni faqat server (master_client_absent) yozadi
    if new.cancel_reason is distinct from old.cancel_reason
       and not (new.status = 'cancelled' and old.status <> 'cancelled') then
      raise exception 'orders.cancel_reason: faqat bekor qilishda' using errcode = '42501';
    end if;
    if new.cancel_reason = 'client_absent' and new.cancel_reason is distinct from old.cancel_reason then
      raise exception 'orders.cancel_reason: client_absent faqat server orqali' using errcode = '42501';
    end if;
  end if;

  -- Hosilaviy ustunlar
  if new.status = 'cancelled' and old.status <> 'cancelled' then
    new.cancelled_by := case
      -- server funksiyasi aniq ko'rsatgan bo'lsa (masalan, eshik ochilmadi — 'system'), o'shani qoldiramiz
      when priv and new.cancelled_by is not null and new.cancelled_by is distinct from old.cancelled_by then new.cancelled_by
      when uid is not null and uid = old.client_id then 'client'
      when uid is not null and uid = old.master_id then 'master'
      else coalesce(new.cancelled_by, 'system') end;
  end if;
  if new.status = 'arrived' and old.status <> 'arrived' then
    new.arrived_at := now();
  end if;
  -- Usta tayinlandi — 1) u hozir buyurtma olishi mumkinmi (balans/obuna, blok) qayta tekshiriladi:
  -- tarifni qabul qilishdan oldin almashtirib, ulushdan qochib bo'lmaydi. Ulush foizi shu paytdagi holat bo'yicha qotiriladi
  if new.master_id is not null and old.master_id is null then
    select * into m from public.masters where id = new.master_id;
    if not found or not public.master_can_take_orders(m) or public.is_blocked(new.master_id) then
      raise exception 'orders.master_id: usta hozir buyurtma ololmaydi' using errcode = 'P0001';
    end if;
    new.accepted_at := now();
    if new.fee_percent is null then
      new.fee_percent := public.master_fee_percent(m);
    end if;
  end if;
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
    pct := new.fee_percent;
    if pct is null then
      select public.master_fee_percent(x) into pct from public.masters x where x.id = new.master_id;
    end if;
    -- constants/billing.ts → platformCut: mijoz to'laydigan summa × ulush %
    new.platform_fee := round(public.order_total(new) * coalesce(pct, 10) / 100.0)::int;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ---------- 2) "Mijoz eshikni ochmadi" ----------
create or replace function public.master_client_absent(p_order uuid, p_text text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  uid uuid := auth.uid();
  txt text := nullif(left(btrim(coalesce(p_text, '')), 1000), '');
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.master_id is distinct from uid then
    raise exception 'orders: ruxsat yo''q' using errcode = '42501';
  end if;
  if o.status <> 'arrived' then
    raise exception 'orders: faqat yetib kelgandan keyin' using errcode = '22023';
  end if;
  -- Eshik kodi kiritilgan yoki narx yuborilgan bo'lsa — mijoz eshikni ochgan
  if o.door_verified_at is not null or o.price_status <> 'none' then
    raise exception 'orders: door_opened' using errcode = '22023';
  end if;
  if o.arrived_at is not null and o.arrived_at > now() - interval '10 minutes' then
    raise exception 'orders: too_early' using errcode = '22023';
  end if;
  -- cancelled_by = 'system' — ustaning aktivligi kamaymaydi (orders_after_update faqat 'master'da −10)
  update public.orders set status = 'cancelled', cancelled_by = 'system', cancel_reason = 'client_absent' where id = p_order;
  update public.masters set busy = false where id = uid;
  insert into public.order_reports (order_id, reporter_id, kind, text) values (p_order, uid, 'client_absent', txt);
  perform public.enqueue_push(o.client_id, 'absent', '{}'::jsonb, '/client/history');
end $$;

-- ---------- 4) profil qo'riqchisi: deleted_at ham faqat server ----------
create or replace function public.profiles_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.is_privileged() then
    if new.role = 'admin' and (tg_op = 'INSERT' or old.role <> 'admin') then
      raise exception 'profiles.role: faqat admin tayinlaydi' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.phone is distinct from old.phone then
      raise exception 'profiles.phone: o''zgartirib bo''lmaydi' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.blocked_at := null;
      new.blocked_reason := null;
      new.deleted_at := null;
    elsif (new.blocked_at, new.blocked_reason) is distinct from (old.blocked_at, old.blocked_reason) then
      raise exception 'profiles: bloklashni faqat admin o''zgartiradi' using errcode = '42501';
    elsif new.deleted_at is distinct from old.deleted_at then
      raise exception 'profiles.deleted_at: faqat server' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- ---------- 5) profil ustunlari: push_token va telegram_id boshqalarga ko'rinmaydi ----------
-- Ilova o'qiydigani: id, phone, name, role, language, blocked_at (admin ko'rinishlari — yana bir nechtasi)
revoke select on public.profiles from anon, authenticated;
grant select (id, phone, name, role, language, notify_offers, blocked_at, blocked_reason, deleted_at, created_at, updated_at)
  on public.profiles to authenticated;

-- ---------- 6) taklif: usta buyurtmani qabul qilguncha faqat qisqa ma'lumotni ko'radi ----------
drop policy if exists "orders: usta (taklif)" on public.orders;

create or replace function public.offer_preview(p_order uuid)
returns table (id uuid, category_id text, problem_id text, description text, lat double precision, lng double precision)
language sql stable security definer set search_path = public as $$
  -- Joy ~150 m aniqlikda (mahalla darajasi): masofa va yo'nalish uchun yetarli, aniq uy ko'rinmaydi
  select o.id, o.category_id::text, o.problem_id::text, left(o.description, 500),
         round(o.lat::numeric, 3)::double precision, round(o.lng::numeric, 3)::double precision
  from public.orders o
  where o.id = p_order
    and exists (select 1 from public.offers f
                where f.order_id = o.id and f.master_id = auth.uid() and f.status = 'sent')
$$;
revoke execute on function public.offer_preview(uuid) from public, anon;
grant execute on function public.offer_preview(uuid) to authenticated;

-- ---------- 7) buyurtma rasmi: yo'l mijozning o'z papkasida bo'lishi shart ----------
create or replace function public.can_see_order_photo(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where p_name = any (o.photos)
      and split_part(p_name, '/', 1) = o.client_id::text
      and (o.master_id = auth.uid()
        or exists (select 1 from public.offers f where f.order_id = o.id and f.master_id = auth.uid() and f.status = 'sent'))
  )
$$;

-- ---------- 8) mayda ----------
alter table public.orders drop constraint if exists orders_description_len;
alter table public.orders add constraint orders_description_len check (description is null or char_length(description) <= 2000) not valid;

revoke execute on function public.is_blocked(uuid) from public, anon;
grant execute on function public.is_blocked(uuid) to authenticated;
