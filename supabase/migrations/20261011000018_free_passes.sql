-- UyService: bepul davr kodlari (ishga tushirish aksiyasi). Admin ustaning raqamiga 30 / 60 / 90 kunlik shaxsiy kod
-- yaratadi (admin → Narxlar va katalog → Bepul davr), kod Telegram yoki SMS bilan boradi (functions/free-pass-send).
-- Usta kodni Profil → Promokod bo'limiga kiritadi → shu muddat davomida platforma hech qanday ulush olmaydi:
-- komissiya ham, obuna ham, hujjatsizlik qo'shimchasi ham yo'q, balans talab qilinmaydi.
-- Qoidalar:
--   - kod faqat o'sha raqam egasi uchun (profiles.phone) va bir marta; har usta umrida bitta kod ishlatadi
--     (keyin admin usta sahifasidan uzaytira oladi);
--   - pasport majburiy: kod kiritishda pasport yuklangan bo'lishi kerak; hujjat rad etilsa — bepul davr to'xtaydi;
--   - kodni yaratilganidan 30 kun ichida kiritish kerak;
--   - ulush foizi buyurtma qabul qilingan paytda qotiriladi — bepul davrda olingan ish keyin tugasa ham bepul;
--   - tugashidan 7 va 1 kun oldin, tugaganda — ustaga xabar (offer-timeout → free_pass_reminders).

alter table public.masters
  add column if not exists free_until timestamptz,
  add column if not exists free_notified smallint not null default 0;
-- Buyurtma bepul davrda olingan bo'lsa — odatdagi ulush foizi (statistika: "kechilgan ulush")
alter table public.orders add column if not exists fee_waived_percent int;

-- Usta bepul davrini o'zi o'zgartira olmaydi
create or replace function public.masters_free_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    new.free_until := null;
    new.free_notified := 0;
  elsif (new.free_until, new.free_notified) is distinct from (old.free_until, old.free_notified) then
    raise exception 'masters.free_until: faqat server' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists masters_free_guard on public.masters;
create trigger masters_free_guard before insert or update on public.masters
  for each row execute function public.masters_free_guard();

-- ---------- Ulush ----------
-- Bepul davr hozir amaldami: muddati tugamagan va pasport yuklangan (tekshiruvda yoki tasdiqlangan)
create or replace function public.master_free(m public.masters) returns boolean
language sql stable as $$
  select coalesce(m.free_until > now(), false) and m.verify_status in ('pending', 'approved')
$$;

-- Odatdagi ulush (bepul davrsiz): komissiya 10 / obuna 0, hujjati tasdiqlanmagan — yana +5
create or replace function public.master_base_fee_percent(m public.masters) returns int
language sql immutable as $$
  select (case coalesce(m.billing_plan, 'commission') when 'commission' then 10 else 0 end)
       + (case when m.verify_status = 'approved' then 0 else 5 end)
$$;

-- constants/billing.ts → feePercent: bepul davrda 0
create or replace function public.master_fee_percent(m public.masters) returns int
language sql stable as $$
  select case when public.master_free(m) then 0 else public.master_base_fee_percent(m) end
$$;

-- Buyurtma olish mumkinmi: bepul davrda — doim (balans va obuna shart emas)
create or replace function public.master_can_take_orders(m public.masters) returns boolean
language sql stable as $$
  select public.master_free(m)
      or ((public.master_fee_percent(m) = 0 or m.balance >= 20000)
          and (coalesce(m.billing_plan, 'commission') <> 'subscription' or coalesce(m.subscription_until > now(), false)))
$$;

-- Usta tayinlanganda bepul davrda bo'lsa — kechilgan ulush foizi yoziladi (faqat server tayinlaydi)
create or replace function public.orders_free_fee() returns trigger
language plpgsql set search_path = public as $$
declare m public.masters;
begin
  if tg_op = 'INSERT' then
    if not public.is_privileged() then new.fee_waived_percent := null; end if;
    return new;
  end if;
  if new.master_id is not null and old.master_id is null then
    select * into m from public.masters where id = new.master_id;
    new.fee_waived_percent := case when found and public.master_free(m) then public.master_base_fee_percent(m) end;
  elsif new.fee_waived_percent is distinct from old.fee_waived_percent and not public.is_privileged() then
    raise exception 'orders.fee_waived_percent: faqat server' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists orders_free_fee on public.orders;
create trigger orders_free_fee before insert or update on public.orders
  for each row execute function public.orders_free_fee();

-- ---------- Kodlar ----------
create table if not exists public.free_passes (
  code text primary key check (code ~ '^[A-Z0-9]{6,20}$'),
  phone text not null check (phone ~ '^\+998[0-9]{9}$'),
  days int not null check (days in (30, 60, 90)),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  redeem_by timestamptz not null,
  sent_via text check (sent_via in ('telegram', 'sms')),
  sent_at timestamptz,
  redeemed_by uuid unique references public.masters (id) on delete set null,
  redeemed_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text
);
create index if not exists free_passes_phone_idx on public.free_passes (phone);
alter table public.free_passes enable row level security;
revoke all on public.free_passes from anon, authenticated;

create or replace function public.new_free_pass_code() returns text
language plpgsql volatile set search_path = public as $$
declare c text;
begin
  loop
    -- O, 0, I, 1 yo'q — og'zaki aytganda adashmasin
    c := 'UY' || array_to_string(array(
      select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1) from generate_series(1, 8)), '');
    exit when not exists (select 1 from public.free_passes where code = c)
          and not exists (select 1 from public.promo_codes where code = c);
  end loop;
  return c;
end $$;

-- Usta kodni kiritadi (Profil → Promokod): oddiy promokod yoki bepul davr kodi — bitta joy.
-- Bepul davr kodi: { free_days, free_until }; oddiy promokod: { priority, bonus }
create or replace function public.redeem_promo(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.promo_codes;
  fp public.free_passes;
  m public.masters;
  c text := upper(btrim(coalesce(p_code, '')));
  b int;
  until timestamptz;
begin
  select * into m from public.masters where id = auth.uid() for update;
  if not found then
    raise exception 'promo: faqat usta' using errcode = '42501';
  end if;

  -- Bepul davr kodi
  select * into fp from public.free_passes where code = c for update;
  if found then
    if fp.revoked_at is not null then raise exception 'promo: bunday kod yo''q' using errcode = 'P0002'; end if;
    if fp.redeemed_at is not null then
      if fp.redeemed_by = m.id then raise exception 'promo: allaqachon ishlatilgan' using errcode = '23505'; end if;
      raise exception 'promo: bunday kod yo''q' using errcode = 'P0002';
    end if;
    if fp.redeem_by < now() then raise exception 'promo: muddati o''tgan' using errcode = '22023'; end if;
    if (select phone from public.profiles where id = m.id) is distinct from fp.phone then
      raise exception 'promo: other_phone' using errcode = '42501';
    end if;
    if exists (select 1 from public.free_passes where redeemed_by = m.id) then
      raise exception 'promo: free_used' using errcode = '23505';
    end if;
    if m.passport_path is null or m.verify_status not in ('pending', 'approved') then
      raise exception 'promo: passport_required' using errcode = '55000';
    end if;
    until := greatest(now(), coalesce(m.free_until, now())) + make_interval(days => fp.days);
    update public.masters set free_until = until, free_notified = 0 where id = m.id;
    update public.free_passes set redeemed_by = m.id, redeemed_at = now() where code = c;
    return jsonb_build_object('free_days', fp.days, 'free_until', until);
  end if;

  -- Oddiy promokod (…_promo_referrals.sql)
  select * into p from public.promo_codes where code = c for update;
  if not found or not p.active then raise exception 'promo: bunday kod yo''q' using errcode = 'P0002'; end if;
  if p.expires_at is not null and p.expires_at < now() then raise exception 'promo: muddati o''tgan' using errcode = '22023'; end if;
  if exists (select 1 from public.promo_redemptions where code = c and master_id = m.id) then
    raise exception 'promo: allaqachon ishlatilgan' using errcode = '23505';
  end if;
  if p.max_uses is not null and (select count(*) from public.promo_redemptions where code = c) >= p.max_uses then
    raise exception 'promo: chegara tugagan' using errcode = '22023';
  end if;
  begin
    insert into public.promo_redemptions (code, master_id) values (c, m.id);
  exception when unique_violation then
    raise exception 'promo: allaqachon ishlatilgan' using errcode = '23505';
  end;
  update public.masters
     set priority_points = least(50, priority_points + p.priority),
         balance = balance + p.bonus
   where id = m.id
   returning balance into b;
  if p.bonus > 0 then
    insert into public.balance_ops (master_id, amount, balance_after, kind, note)
    values (m.id, p.bonus, b, 'bonus', 'promo:' || c);
  end if;
  return jsonb_build_object('priority', p.priority, 'bonus', p.bonus);
end $$;

-- Usta ilovasi: o'z bepul davri (useMaster.freeUntil; syncMaster masters qatoridan ham o'qiydi)

-- ---------- Admin ----------
-- Kod yaratish: raqam (+998XXXXXXXXX yoki 9 xona) va 30 / 60 / 90 kun. Shu raqamning oldingi ishlatilmagan kodlari bekor bo'ladi.
create or replace function public.admin_create_free_pass(p_phone text, p_days int) returns text
language plpgsql security definer set search_path = public as $$
declare
  d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  ph text;
  c text;
  mid uuid;
begin
  perform public.assert_admin();
  if length(d) = 9 then d := '998' || d; end if;
  if d !~ '^998[0-9]{9}$' then raise exception 'admin: phone' using errcode = '22023'; end if;
  ph := '+' || d;
  if p_days is null or p_days not in (30, 60, 90) then raise exception 'admin: days' using errcode = '22023'; end if;
  select m.id into mid from public.masters m join public.profiles pr on pr.id = m.id
   where pr.phone = ph and pr.deleted_at is null;
  if mid is not null and exists (select 1 from public.free_passes where redeemed_by = mid) then
    raise exception 'admin: free_used' using errcode = '22023';
  end if;
  update public.free_passes set revoked_at = now(), revoke_reason = 'replaced'
   where phone = ph and redeemed_at is null and revoked_at is null;
  c := public.new_free_pass_code();
  insert into public.free_passes (code, phone, days, created_by, redeem_by)
  values (c, ph, p_days, auth.uid(), now() + interval '30 days');
  perform public.admin_write_log('free_pass', 'promo', c, jsonb_build_object('phone', right(d, 4), 'days', p_days));
  return c;
end $$;

create or replace function public.admin_free_passes()
returns table (code text, phone text, days int, created_at timestamptz, redeem_by timestamptz, sent_via text, sent_at timestamptz,
               redeemed_at timestamptz, master_id uuid, master_name text, free_until timestamptz, revoked_at timestamptz,
               revoke_reason text, status text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
    select f.code, f.phone, f.days, f.created_at, f.redeem_by, f.sent_via, f.sent_at, f.redeemed_at, f.redeemed_by,
           nullif(concat_ws(' ', m.first_name, m.last_name), ''), m.free_until, f.revoked_at, f.revoke_reason,
           case when f.revoked_at is not null then 'revoked'
                when f.redeemed_at is not null then 'redeemed'
                when f.redeem_by < now() then 'expired'
                else 'pending' end
    from public.free_passes f
    left join public.masters m on m.id = f.redeemed_by
    order by f.created_at desc
    limit 1000;
end $$;

-- Bekor qilish (sabab bilan). Ishlatilgan bo'lsa — ustaning bepul davri ham to'xtaydi
create or replace function public.admin_revoke_free_pass(p_code text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare f public.free_passes; r text := public.admin_clean(p_reason);
begin
  perform public.assert_admin();
  if r is null then raise exception 'admin: sababni yozing' using errcode = '22023'; end if;
  select * into f from public.free_passes where code = upper(btrim(coalesce(p_code, ''))) for update;
  if not found then raise exception 'admin: kod topilmadi' using errcode = 'P0002'; end if;
  if f.revoked_at is not null then raise exception 'admin: kod allaqachon bekor qilingan' using errcode = '22023'; end if;
  update public.free_passes set revoked_at = now(), revoke_reason = r where code = f.code;
  if f.redeemed_by is not null then
    update public.masters set free_until = null where id = f.redeemed_by and free_until > now();
  end if;
  perform public.admin_write_log('free_pass_revoke', 'promo', f.code, jsonb_build_object('reason', r, 'redeemed', f.redeemed_by is not null));
end $$;

-- Usta sahifasi: bepul davrni uzaytirish (30 / 60 / 90 kun) yoki to'xtatish (0), sabab bilan
create or replace function public.admin_set_free(p_master uuid, p_days int, p_reason text) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare m public.masters; r text := public.admin_clean(p_reason); until timestamptz;
begin
  perform public.assert_admin();
  if r is null then raise exception 'admin: sababni yozing' using errcode = '22023'; end if;
  if p_days is null or p_days not in (0, 30, 60, 90) then raise exception 'admin: days' using errcode = '22023'; end if;
  select * into m from public.masters where id = p_master for update;
  if not found then raise exception 'admin: usta topilmadi' using errcode = 'P0002'; end if;
  if p_days > 0 and (m.passport_path is null or m.verify_status not in ('pending', 'approved')) then
    raise exception 'admin: passport_required' using errcode = '22023';
  end if;
  until := case when p_days = 0 then null else greatest(now(), coalesce(m.free_until, now())) + make_interval(days => p_days) end;
  update public.masters set free_until = until, free_notified = 0 where id = m.id;
  perform public.admin_write_log('free_period', 'master', m.id::text, jsonb_build_object(
    'days', p_days, 'from', m.free_until, 'to', until, 'reason', r));
  return until;
end $$;

-- Moliya: bepul davr statistikasi
create or replace function public.admin_free_stats()
returns table (active_masters int, waived bigint, pending int, redeemed int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query select
    (select count(*)::int from public.masters m where public.master_free(m)),
    (select coalesce(sum(round(public.order_total(o) * o.fee_waived_percent / 100.0)), 0)::bigint
       from public.orders o where o.status = 'completed' and o.fee_waived_percent is not null),
    (select count(*)::int from public.free_passes f where f.redeemed_at is null and f.revoked_at is null and f.redeem_by > now()),
    (select count(*)::int from public.free_passes f where f.redeemed_at is not null);
end $$;

-- Admin ro'yxati: ustaning bepul davri (oxirgi ustun — create or replace view faqat oxiriga qo'sha oladi)
create or replace view public.admin_masters with (security_invoker = true) as
  select m.id, m.first_name, m.last_name, p.phone, p.name, p.language, p.blocked_at, p.blocked_reason,
         m.experience_years, m.categories, m.rating, m.jobs_count, m.activity, m.priority_points,
         m.verify_status, m.verify_note, m.balance, m.subscription_until, m.busy, m.online,
         m.billing_plan, m.photo_path, m.passport_path, m.selfie_path, m.works, m.submitted_at, m.created_at,
         public.master_fee_percent(m) as fee_percent,
         public.master_can_take_orders(m) as can_take,
         l.lat, l.lng, l.updated_at as seen_at,
         (select count(*) from public.reviews r where r.master_id = m.id)::int as reviews_count,
         lower(concat_ws(' ', m.first_name, m.last_name, p.phone, p.name)) as search,
         m.free_until
  from public.masters m
  join public.profiles p on p.id = m.id
  left join public.master_locations l on l.master_id = m.id
  where public.is_admin() and p.deleted_at is null;

-- ---------- Eslatmalar (offer-timeout har 15 s chaqiradi; har bosqich bir marta) ----------
-- 1 — 7 kun qoldi, 2 — 1 kun qoldi, 3 — tugadi
create or replace function public.free_pass_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; stage smallint;
begin
  for r in
    select m.id, m.free_until, m.free_notified from public.masters m
    where m.free_until is not null and m.free_until > now() - interval '1 day' and m.free_notified < 3
      and m.free_until < now() + interval '7 days'
    for update skip locked
  loop
    stage := case when r.free_until <= now() then 3 when r.free_until < now() + interval '1 day' then 2 else 1 end;
    if stage <= r.free_notified then continue; end if;
    perform public.enqueue_push(r.id, case when stage = 3 then 'freeEnded' else 'freeEnding' end,
      jsonb_build_object('days', greatest(1, ceil(extract(epoch from (r.free_until - now())) / 86400)::int)), '/master/money');
    update public.masters set free_notified = stage where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.redeem_promo(text) from public, anon;
grant execute on function public.redeem_promo(text) to authenticated;
revoke execute on function public.admin_create_free_pass(text, int), public.admin_free_passes(), public.admin_revoke_free_pass(text, text),
  public.admin_set_free(uuid, int, text), public.admin_free_stats() from public, anon;
grant execute on function public.admin_create_free_pass(text, int), public.admin_free_passes(), public.admin_revoke_free_pass(text, text),
  public.admin_set_free(uuid, int, text), public.admin_free_stats() to authenticated;
revoke execute on function public.free_pass_reminders(), public.new_free_pass_code() from public, anon, authenticated;
