-- UyService: admin panel (uyservice.uz/admin) uchun server qismi.
-- Admin — profiles.role = 'admin' (README, 10-bo'lim). Hamma admin amallari shu yerdagi RPC funksiyalar orqali:
-- huquq tekshiriladi, qiymatlar chegaralanadi va har bir amal admin_log jurnaliga yoziladi.
-- Ro'yxatlar uchun admin_* ko'rinishlari (view) — faqat admin ko'radi (boshqalarga bo'sh).

-- ---------- Ustaning profil surati (majburiy, ilovada) ----------
-- works bucket'ida (ochiq): "<usta id>/avatar.jpg". Mijoz kartochkasida ham ko'rinadi
alter table public.masters add column if not exists photo_path text;
create or replace view public.master_cards as
  select id, first_name, last_name, experience_years, categories, rating, jobs_count, works,
         verify_status = 'approved' as verified, photo_path
  from public.masters;

-- ---------- Bloklash ----------
alter table public.profiles
  add column if not exists blocked_at timestamptz,
  add column if not exists blocked_reason text;

create or replace function public.is_blocked(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_profile and blocked_at is not null)
$$;

-- profiles_guard: oddiy foydalanuvchi bloklash ustunlarini o'zgartira olmaydi
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
    elsif (new.blocked_at, new.blocked_reason) is distinct from (old.blocked_at, old.blocked_reason) then
      raise exception 'profiles: bloklashni faqat admin o''zgartiradi' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- Bloklangan mijoz buyurtma bera olmaydi
drop policy if exists "orders: mijoz yaratadi" on public.orders;
create policy "orders: mijoz yaratadi" on public.orders for insert to authenticated
  with check (client_id = (select auth.uid()) and not public.is_blocked((select auth.uid())));

-- Bloklangan usta taklif olmaydi va xaritada ko'rinmaydi (oldingi ta'rif + "not is_blocked")
create or replace function public.nearby_masters(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision,
  p_category text,
  p_order_id uuid default null
)
returns table (
  id uuid,
  lat double precision,
  lng double precision,
  distance_km double precision,
  rating numeric,
  activity int,
  priority_points int,
  categories text[]
)
language sql stable security definer set search_path = public, extensions as $$
  select m.id, l.lat, l.lng,
         extensions.st_distance(l.location, p.pt) / 1000.0 as distance_km,
         m.rating, m.activity, m.priority_points, m.categories
  from public.masters m
  join public.master_locations l on l.master_id = m.id
  cross join (select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt) p
  where m.online
    and not m.busy
    and not public.is_blocked(m.id)
    and public.master_can_take_orders(m)
    and p_category = any (m.categories)
    and l.updated_at > now() - interval '2 minutes'
    and extensions.st_dwithin(l.location, p.pt, p_radius_km * 1000)
    and not exists (
      select 1 from public.offers o
      where o.master_id = m.id and o.status = 'sent' and o.expires_at > now()
        and (p_order_id is null or o.order_id <> p_order_id))
    and (p_order_id is null or m.id <> (select client_id from public.orders where id = p_order_id))
  order by distance_km
  limit 50
$$;

create or replace function public.masters_around(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 3,
  p_category text default null
)
returns table (lat double precision, lng double precision, distance_km double precision, categories text[])
language sql stable security definer set search_path = public, extensions as $$
  select round(l.lat / (100 / 111000.0)) * (100 / 111000.0),
         round(l.lng / (100 / 111000.0)) * (100 / 111000.0),
         round((extensions.st_distance(l.location, p.pt) / 1000.0)::numeric, 1)::double precision,
         m.categories
  from public.masters m
  join public.master_locations l on l.master_id = m.id
  cross join (select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as pt) p
  where m.online
    and not public.is_blocked(m.id)
    and l.updated_at > now() - interval '2 minutes'
    and (p_category is null or p_category = any (m.categories))
    and extensions.st_dwithin(l.location, p.pt, least(p_radius_km, 10) * 1000)
  order by 3
  limit 30
$$;

-- Admin buyurtmani bekor qilishi mumkin
alter table public.orders drop constraint if exists orders_cancelled_by_check;
alter table public.orders add constraint orders_cancelled_by_check
  check (cancelled_by in ('client', 'master', 'system', 'admin'));

-- ---------- Jurnal va balans tarixi ----------
create table if not exists public.admin_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null check (target_type in ('master', 'user', 'order', 'review', 'category', 'problem', 'support')),
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_log_created_idx on public.admin_log (created_at desc);
create index if not exists admin_log_target_idx on public.admin_log (target_type, target_id, created_at desc);

-- Ustaning balansidagi har bir o'zgarish: to'ldirish, tuzatish, bonus, platforma ulushi
create table if not exists public.balance_ops (
  id bigint generated always as identity primary key,
  master_id uuid not null references public.masters (id) on delete cascade,
  amount int not null check (amount <> 0),
  balance_after int not null,
  kind text not null check (kind in ('topup', 'adjust', 'bonus', 'refund', 'fee')),
  order_id uuid references public.orders (id) on delete set null,
  note text,
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists balance_ops_master_idx on public.balance_ops (master_id, created_at desc);
create index if not exists balance_ops_created_idx on public.balance_ops (created_at desc);

alter table public.admin_log enable row level security;
alter table public.balance_ops enable row level security;
-- Jurnalni faqat admin o'qiydi; yozish — faqat funksiyalar orqali (to'g'ridan-to'g'ri yozib/o'chirib bo'lmaydi)
create policy "admin_log: admin o'qiydi" on public.admin_log for select to authenticated using (public.is_admin());
create policy "balance_ops: admin o'qiydi" on public.balance_ops for select to authenticated using (public.is_admin());
create policy "balance_ops: usta o'zinikini o'qiydi" on public.balance_ops for select to authenticated
  using (master_id = (select auth.uid()));

-- Ish tugaganda platforma ulushi balansdan yechiladi — endi balans tarixiga ham yoziladi
create or replace function public.orders_after_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare b int;
begin
  if new.status = old.status then return new; end if;

  if new.status = 'completed' and new.master_id is not null then
    update public.masters
       set busy = false,
           jobs_count = jobs_count + 1,
           balance = balance - coalesce(new.platform_fee, 0)
     where id = new.master_id
     returning balance into b;
    if coalesce(new.platform_fee, 0) > 0 then
      insert into public.balance_ops (master_id, amount, balance_after, kind, order_id)
      values (new.master_id, -new.platform_fee, b, 'fee', new.id);
    end if;
  elsif new.status = 'cancelled' then
    update public.offers set status = 'expired', responded_at = now()
     where order_id = new.id and status = 'sent';
    if old.master_id is not null then
      update public.masters
         set busy = false,
             activity = case when new.cancelled_by = 'master' then greatest(0, activity - 10) else activity end
       where id = old.master_id;
    end if;
  end if;
  return new;
end $$;

-- ---------- Yordamchilar ----------
create or replace function public.assert_admin() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'admin: ruxsat yo''q' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_write_log(p_action text, p_type text, p_target text, p_details jsonb default '{}'::jsonb)
returns void
language sql security definer set search_path = public as $$
  insert into public.admin_log (admin_id, action, target_type, target_id, details)
  values (auth.uid(), p_action, p_type, p_target, coalesce(p_details, '{}'::jsonb))
$$;

-- Bo'sh/uzun matnni tozalash (sabab, izoh)
create or replace function public.admin_clean(p text, p_max int default 500) returns text
language sql immutable as $$
  select nullif(left(btrim(coalesce(p, '')), p_max), '')
$$;

-- ---------- Admin amallari ----------
-- Hujjatlarni tasdiqlash / rad etish / qayta tekshiruvga qaytarish
create or replace function public.admin_set_verify(p_master uuid, p_status public.verify_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare old_status public.verify_status; note text := public.admin_clean(p_note);
begin
  perform public.assert_admin();
  select verify_status into old_status from public.masters where id = p_master for update;
  if not found then raise exception 'admin: usta topilmadi' using errcode = 'P0002'; end if;
  if p_status = 'rejected' and note is null then
    raise exception 'admin: rad etish sababini yozing' using errcode = '22023';
  end if;
  update public.masters
     set verify_status = p_status,
         verify_note = case when p_status = 'rejected' then note else null end
   where id = p_master;
  perform public.admin_write_log('verify', 'master', p_master::text,
    jsonb_build_object('from', old_status, 'to', p_status, 'note', note));
end $$;

-- Balansni to'ldirish (+) yoki tuzatish (−). Bir martada ko'pi bilan 10 mln so'm
create or replace function public.admin_adjust_balance(p_master uuid, p_amount int, p_kind text, p_note text default null)
returns int
language plpgsql security definer set search_path = public as $$
declare b int; note text := public.admin_clean(p_note);
begin
  perform public.assert_admin();
  if p_amount is null or p_amount = 0 or abs(p_amount) > 10000000 then
    raise exception 'admin: summa noto''g''ri' using errcode = '22023';
  end if;
  if p_kind not in ('topup', 'adjust', 'bonus', 'refund') then
    raise exception 'admin: amal turi noto''g''ri' using errcode = '22023';
  end if;
  if p_amount < 0 and p_kind <> 'adjust' then
    raise exception 'admin: yechish faqat "tuzatish" bilan' using errcode = '22023';
  end if;
  if p_kind = 'adjust' and note is null then
    raise exception 'admin: tuzatish sababini yozing' using errcode = '22023';
  end if;
  update public.masters set balance = balance + p_amount where id = p_master returning balance into b;
  if not found then raise exception 'admin: usta topilmadi' using errcode = 'P0002'; end if;
  insert into public.balance_ops (master_id, amount, balance_after, kind, note, admin_id)
  values (p_master, p_amount, b, p_kind, note, auth.uid());
  perform public.admin_write_log('balance', 'master', p_master::text,
    jsonb_build_object('amount', p_amount, 'kind', p_kind, 'balance', b, 'note', note));
  return b;
end $$;

-- Obuna to'lovini qayd etish: muddat hozirgi tugash sanasidan (yoki bugundan) uzayadi
create or replace function public.admin_add_subscription(p_master uuid, p_days int, p_amount int)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare until timestamptz; start timestamptz;
begin
  perform public.assert_admin();
  if p_days is null or p_days < 1 or p_days > 366 then
    raise exception 'admin: kunlar 1–366' using errcode = '22023';
  end if;
  if p_amount is null or p_amount < 0 or p_amount > 10000000 then
    raise exception 'admin: summa noto''g''ri' using errcode = '22023';
  end if;
  select greatest(now(), coalesce(subscription_until, now())) into start from public.masters where id = p_master for update;
  if not found then raise exception 'admin: usta topilmadi' using errcode = 'P0002'; end if;
  insert into public.subscriptions (master_id, period_start, period_end, amount, status)
  values (p_master, start, start + make_interval(days => p_days), p_amount, 'paid');
  select subscription_until into until from public.masters where id = p_master;
  perform public.admin_write_log('subscription', 'master', p_master::text,
    jsonb_build_object('days', p_days, 'amount', p_amount, 'until', until));
  return until;
end $$;

-- Prioritet ballari (taqsimlashda qo'shimcha ball): −50…+50
create or replace function public.admin_set_priority(p_master uuid, p_points int)
returns void
language plpgsql security definer set search_path = public as $$
declare old_points int;
begin
  perform public.assert_admin();
  if p_points is null or p_points < -50 or p_points > 50 then
    raise exception 'admin: prioritet −50…+50' using errcode = '22023';
  end if;
  select priority_points into old_points from public.masters where id = p_master for update;
  if not found then raise exception 'admin: usta topilmadi' using errcode = 'P0002'; end if;
  update public.masters set priority_points = p_points where id = p_master;
  perform public.admin_write_log('priority', 'master', p_master::text, jsonb_build_object('from', old_points, 'to', p_points));
end $$;

-- Bloklash / blokdan chiqarish. O'zini va boshqa adminni bloklab bo'lmaydi
create or replace function public.admin_set_blocked(p_profile uuid, p_blocked boolean, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.user_role; reason text := public.admin_clean(p_reason);
begin
  perform public.assert_admin();
  select role into r from public.profiles where id = p_profile for update;
  if not found then raise exception 'admin: foydalanuvchi topilmadi' using errcode = 'P0002'; end if;
  if p_blocked then
    if p_profile = auth.uid() or r = 'admin' then
      raise exception 'admin: adminni bloklab bo''lmaydi' using errcode = '42501';
    end if;
    if reason is null then raise exception 'admin: bloklash sababini yozing' using errcode = '22023'; end if;
    update public.profiles set blocked_at = now(), blocked_reason = reason where id = p_profile;
    update public.masters set online = false where id = p_profile;
  else
    update public.profiles set blocked_at = null, blocked_reason = null where id = p_profile;
  end if;
  perform public.admin_write_log(case when p_blocked then 'block' else 'unblock' end,
    case when exists (select 1 from public.masters where id = p_profile) then 'master' else 'user' end,
    p_profile::text, jsonb_build_object('reason', reason));
end $$;

-- Buyurtmani bekor qilish (yakunlanmagan bo'lsa)
create or replace function public.admin_cancel_order(p_order uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare st public.order_status; reason text := public.admin_clean(p_reason);
begin
  perform public.assert_admin();
  if reason is null then raise exception 'admin: bekor qilish sababini yozing' using errcode = '22023'; end if;
  select status into st from public.orders where id = p_order for update;
  if not found then raise exception 'admin: buyurtma topilmadi' using errcode = 'P0002'; end if;
  if st in ('completed', 'cancelled') then
    raise exception 'admin: buyurtma allaqachon yakunlangan' using errcode = '22023';
  end if;
  update public.orders set status = 'cancelled', cancel_reason = reason, cancelled_by = 'admin' where id = p_order;
  perform public.admin_write_log('cancel', 'order', p_order::text, jsonb_build_object('from', st, 'reason', reason));
end $$;

-- Sharhni o'chirish (moderatsiya) — ustaning reytingi trigger orqali qayta hisoblanadi
create or replace function public.admin_delete_review(p_review uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare r public.reviews; reason text := public.admin_clean(p_reason);
begin
  perform public.assert_admin();
  if reason is null then raise exception 'admin: o''chirish sababini yozing' using errcode = '22023'; end if;
  delete from public.reviews where id = p_review returning * into r;
  if not found then raise exception 'admin: sharh topilmadi' using errcode = 'P0002'; end if;
  perform public.admin_write_log('delete_review', 'review', p_review::text, jsonb_build_object(
    'reason', reason, 'stars', r.stars, 'comment', r.comment, 'master_id', r.master_id, 'order_id', r.order_id));
end $$;

-- Katalog: chaqiruv narxi va kategoriyani yoqish/o'chirish
create or replace function public.admin_update_category(p_id text, p_call_fee int, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare c public.categories;
begin
  perform public.assert_admin();
  if p_call_fee is null or p_call_fee < 0 or p_call_fee > 1000000 then
    raise exception 'admin: chaqiruv narxi 0–1 000 000' using errcode = '22023';
  end if;
  select * into c from public.categories where id = p_id for update;
  if not found then raise exception 'admin: kategoriya topilmadi' using errcode = 'P0002'; end if;
  update public.categories set call_fee = p_call_fee, active = coalesce(p_active, true) where id = p_id;
  perform public.admin_write_log('category', 'category', p_id, jsonb_build_object(
    'call_fee', jsonb_build_array(c.call_fee, p_call_fee), 'active', jsonb_build_array(c.active, coalesce(p_active, true))));
end $$;

-- Muammoning taxminiy narx oralig'i (null — "kelishiladi")
create or replace function public.admin_update_problem(p_id text, p_min int, p_max int)
returns void
language plpgsql security definer set search_path = public as $$
declare pr public.problems;
begin
  perform public.assert_admin();
  if (p_min is null) <> (p_max is null) or p_min < 0 or p_max > 100000000 or p_min > p_max then
    raise exception 'admin: narx oralig''i noto''g''ri' using errcode = '22023';
  end if;
  select * into pr from public.problems where id = p_id for update;
  if not found then raise exception 'admin: muammo topilmadi' using errcode = 'P0002'; end if;
  update public.problems set price_min = p_min, price_max = p_max where id = p_id;
  perform public.admin_write_log('problem', 'problem', p_id, jsonb_build_object(
    'from', jsonb_build_array(pr.price_min, pr.price_max), 'to', jsonb_build_array(p_min, p_max)));
end $$;

-- Admin tayinlash / olib tashlash (telefon raqami bo'yicha). O'zini olib tashlab bo'lmaydi
create or replace function public.admin_set_role(p_phone text, p_admin boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid; r public.user_role; v_phone text := '+' || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  perform public.assert_admin();
  select id, role into pid, r from public.profiles where profiles.phone = v_phone for update;
  if not found then
    raise exception 'admin: bu raqam ilovada ro''yxatdan o''tmagan' using errcode = 'P0002';
  end if;
  if not p_admin and pid = auth.uid() then
    raise exception 'admin: o''zingizni olib tashlab bo''lmaydi' using errcode = '42501';
  end if;
  if p_admin then
    update public.profiles set role = 'admin', blocked_at = null, blocked_reason = null where id = pid;
  elsif r = 'admin' then
    update public.profiles
       set role = case when exists (select 1 from public.masters where id = pid) then 'master'::public.user_role else 'client'::public.user_role end
     where id = pid;
  end if;
  perform public.admin_write_log(case when p_admin then 'grant_admin' else 'revoke_admin' end, 'user', pid::text,
    jsonb_build_object('phone', v_phone));
  return pid;
end $$;

-- Qo'llab-quvvatlash: admin foydalanuvchiga javob yozadi
create or replace function public.admin_support_reply(p_user uuid, p_text text)
returns void
language plpgsql security definer set search_path = public as $$
declare txt text := public.admin_clean(p_text, 4000);
begin
  perform public.assert_admin();
  if txt is null then raise exception 'admin: xabar bo''sh' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'admin: foydalanuvchi topilmadi' using errcode = 'P0002';
  end if;
  insert into public.chat_messages (support_user_id, sender_id, text) values (p_user, auth.uid(), txt);
end $$;

-- ---------- Ko'rinishlar (faqat admin uchun; boshqalarga bo'sh) ----------
create or replace view public.admin_masters with (security_invoker = true) as
  select m.id, m.first_name, m.last_name, p.phone, p.name, p.language, p.blocked_at, p.blocked_reason,
         m.experience_years, m.categories, m.rating, m.jobs_count, m.activity, m.priority_points,
         m.verify_status, m.verify_note, m.balance, m.subscription_until, m.busy, m.online,
         m.billing_plan, m.photo_path, m.passport_path, m.selfie_path, m.works, m.submitted_at, m.created_at,
         public.master_fee_percent(m) as fee_percent,
         public.master_can_take_orders(m) as can_take,
         l.lat, l.lng, l.updated_at as seen_at,
         (select count(*) from public.reviews r where r.master_id = m.id)::int as reviews_count,
         lower(concat_ws(' ', m.first_name, m.last_name, p.phone, p.name)) as search
  from public.masters m
  join public.profiles p on p.id = m.id
  left join public.master_locations l on l.master_id = m.id
  where public.is_admin();

create or replace view public.admin_orders with (security_invoker = true) as
  select o.id, o.status, o.category_id, o.problem_id, o.description, o.photos, o.address, o.lat, o.lng,
         o.scheduled_at, o.created_at, o.accepted_at, o.completed_at, o.updated_at,
         o.call_fee, o.price_work, o.price_parts, public.order_total(o) as total, o.platform_fee,
         o.cancel_reason, o.cancelled_by, o.preferred_master_id,
         o.client_id, c.name as client_name, c.phone as client_phone,
         o.master_id, nullif(concat_ws(' ', m.first_name, m.last_name), '') as master_name, mp.phone as master_phone,
         lower(concat_ws(' ', o.id::text, o.address, c.name, c.phone, m.first_name, m.last_name, mp.phone)) as search
  from public.orders o
  join public.profiles c on c.id = o.client_id
  left join public.masters m on m.id = o.master_id
  left join public.profiles mp on mp.id = o.master_id
  where public.is_admin();

create or replace view public.admin_users with (security_invoker = true) as
  select p.id, p.phone, p.name, p.role, p.language, p.blocked_at, p.blocked_reason, p.created_at,
         exists (select 1 from public.masters m where m.id = p.id) as is_master,
         (select count(*) from public.orders o where o.client_id = p.id)::int as orders_count,
         (select count(*) from public.orders o where o.client_id = p.id and o.status = 'completed')::int as completed_count,
         (select coalesce(sum(public.order_total(o)), 0) from public.orders o where o.client_id = p.id and o.status = 'completed')::bigint as spent,
         (select max(o.created_at) from public.orders o where o.client_id = p.id) as last_order_at,
         lower(concat_ws(' ', p.name, p.phone)) as search
  from public.profiles p
  where public.is_admin();

create or replace view public.admin_reviews with (security_invoker = true) as
  select r.id, r.order_id, r.stars, r.tags, r.comment, r.created_at,
         r.client_id, c.name as client_name, c.phone as client_phone,
         r.master_id, nullif(concat_ws(' ', m.first_name, m.last_name), '') as master_name,
         o.category_id, o.problem_id
  from public.reviews r
  join public.profiles c on c.id = r.client_id
  join public.masters m on m.id = r.master_id
  join public.orders o on o.id = r.order_id
  where public.is_admin();

create or replace view public.admin_balance_ops with (security_invoker = true) as
  select b.id, b.master_id, nullif(concat_ws(' ', m.first_name, m.last_name), '') as master_name,
         b.amount, b.balance_after, b.kind, b.order_id, b.note, b.admin_id, a.phone as admin_phone, b.created_at
  from public.balance_ops b
  join public.masters m on m.id = b.master_id
  left join public.profiles a on a.id = b.admin_id
  where public.is_admin();

create or replace view public.admin_log_view with (security_invoker = true) as
  select l.id, l.admin_id, a.phone as admin_phone, a.name as admin_name, l.action, l.target_type, l.target_id,
         l.details, l.created_at
  from public.admin_log l
  left join public.profiles a on a.id = l.admin_id
  where public.is_admin();

grant select on public.admin_masters, public.admin_orders, public.admin_users, public.admin_reviews,
  public.admin_balance_ops, public.admin_log_view to authenticated;
revoke select on public.admin_masters, public.admin_orders, public.admin_users, public.admin_reviews,
  public.admin_balance_ops, public.admin_log_view from anon;

-- Qo'llab-quvvatlash suhbatlari: oxirgi xabar bo'yicha, javob kutayotganlari birinchi
create or replace function public.admin_support_threads()
returns table (user_id uuid, name text, phone text, role public.user_role, last_text text, last_at timestamptz,
               waiting boolean, messages int)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
    select p.id, p.name, p.phone, p.role, last.text, last.created_at,
           last.sender_id = p.id, cnt.n::int
    from public.profiles p
    join lateral (select c.text, c.created_at, c.sender_id from public.chat_messages c
                  where c.support_user_id = p.id order by c.created_at desc limit 1) last on true
    join lateral (select count(*) as n from public.chat_messages c where c.support_user_id = p.id) cnt on true
    order by (last.sender_id = p.id) desc, last.created_at desc
    limit 300;
end $$;

-- ---------- Statistika (bosh sahifa) ----------
-- p_days kunlik davr va undan oldingi xuddi shunday davr (o'zgarish foizi uchun). Kunlar Toshkent vaqti bo'yicha
create or replace function public.admin_stats(p_days int default 30)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d int := greatest(1, least(coalesce(p_days, 30), 366));
  t_to timestamptz := now();
  t_from timestamptz := now() - make_interval(days => d);
  p_from timestamptz := now() - make_interval(days => 2 * d);
  res jsonb;
begin
  perform public.assert_admin();
  with
  per as (
    select
      count(*) filter (where o.created_at >= t_from) as orders,
      count(*) filter (where o.created_at >= t_from and o.status = 'completed') as completed,
      count(*) filter (where o.created_at >= t_from and o.status = 'cancelled') as cancelled,
      coalesce(sum(public.order_total(o)) filter (where o.created_at >= t_from and o.status = 'completed'), 0) as gmv,
      coalesce(sum(o.platform_fee) filter (where o.created_at >= t_from and o.status = 'completed'), 0) as revenue,
      count(*) filter (where o.created_at < t_from) as p_orders,
      count(*) filter (where o.created_at < t_from and o.status = 'completed') as p_completed,
      count(*) filter (where o.created_at < t_from and o.status = 'cancelled') as p_cancelled,
      coalesce(sum(public.order_total(o)) filter (where o.created_at < t_from and o.status = 'completed'), 0) as p_gmv,
      coalesce(sum(o.platform_fee) filter (where o.created_at < t_from and o.status = 'completed'), 0) as p_revenue
    from public.orders o where o.created_at >= p_from
  ),
  usr as (
    select
      count(*) filter (where p.created_at >= t_from and not exists (select 1 from public.masters m where m.id = p.id)) as clients,
      count(*) filter (where p.created_at >= p_from and p.created_at < t_from and not exists (select 1 from public.masters m where m.id = p.id)) as p_clients
    from public.profiles p where p.created_at >= p_from
  ),
  mst as (
    select
      count(*) filter (where m.created_at >= t_from) as masters,
      count(*) filter (where m.created_at >= p_from and m.created_at < t_from) as p_masters
    from public.masters m where m.created_at >= p_from
  ),
  rev as (
    select avg(r.stars) filter (where r.created_at >= t_from) as rating,
           count(*) filter (where r.created_at >= t_from) as reviews,
           avg(r.stars) filter (where r.created_at < t_from) as p_rating
    from public.reviews r where r.created_at >= p_from
  ),
  live as (
    select
      (select count(*) from public.masters m join public.master_locations l on l.master_id = m.id
         where m.online and l.updated_at > now() - interval '2 minutes') as online,
      (select count(*) from public.masters m where m.busy) as busy,
      (select count(*) from public.orders o where o.status in ('assigned', 'on_the_way', 'arrived', 'in_progress')) as active,
      (select count(*) from public.orders o where o.status = 'searching') as searching,
      (select count(*) from public.orders o where o.status = 'scheduled') as scheduled,
      (select count(*) from public.masters m where m.verify_status = 'pending') as pending,
      (select count(*) from public.masters m where not public.master_can_take_orders(m)) as blocked_by_balance,
      (select count(*) from (select distinct on (c.support_user_id) c.support_user_id, c.sender_id from public.chat_messages c
         where c.support_user_id is not null order by c.support_user_id, c.created_at desc) x
         where x.sender_id = x.support_user_id) as support_waiting
  ),
  days as (
    select gs::date as day from generate_series(
      (t_from at time zone 'Asia/Tashkent')::date::timestamp, (t_to at time zone 'Asia/Tashkent')::date::timestamp, interval '1 day') gs
  ),
  daily as (
    select dd.day,
      count(o.id) as orders,
      count(o.id) filter (where o.status = 'completed') as completed,
      count(o.id) filter (where o.status = 'cancelled') as cancelled,
      coalesce(sum(public.order_total(o)) filter (where o.status = 'completed'), 0) as gmv,
      coalesce(sum(o.platform_fee) filter (where o.status = 'completed'), 0) as revenue
    from days dd
    left join public.orders o on (o.created_at at time zone 'Asia/Tashkent')::date = dd.day and o.created_at >= t_from
    group by dd.day order by dd.day
  ),
  bycat as (
    select o.category_id, count(*) as orders, count(*) filter (where o.status = 'completed') as completed,
           coalesce(sum(public.order_total(o)) filter (where o.status = 'completed'), 0) as gmv
    from public.orders o where o.created_at >= t_from group by o.category_id order by 2 desc
  ),
  reasons as (
    select coalesce(o.cancel_reason, '—') as reason, o.cancelled_by, count(*) as n
    from public.orders o where o.created_at >= t_from and o.status = 'cancelled'
    group by 1, 2 order by 3 desc limit 8
  ),
  top as (
    select m.id, nullif(concat_ws(' ', m.first_name, m.last_name), '') as name,
           case when exists (select 1 from public.reviews r where r.master_id = m.id) then m.rating end as rating,
           count(o.id) as jobs, coalesce(sum(public.order_total(o)), 0) as gmv, coalesce(sum(o.platform_fee), 0) as revenue
    from public.orders o join public.masters m on m.id = o.master_id
    where o.created_at >= t_from and o.status = 'completed'
    group by m.id order by jobs desc, gmv desc limit 8
  )
  select jsonb_build_object(
    'days', d,
    'period', (select to_jsonb(per) from per) || (select to_jsonb(usr) from usr) || (select to_jsonb(mst) from mst)
              || (select to_jsonb(rev) from rev),
    'live', (select to_jsonb(live) from live),
    'daily', coalesce((select jsonb_agg(to_jsonb(daily)) from daily), '[]'::jsonb),
    'by_category', coalesce((select jsonb_agg(to_jsonb(bycat)) from bycat), '[]'::jsonb),
    'cancel_reasons', coalesce((select jsonb_agg(to_jsonb(reasons)) from reasons), '[]'::jsonb),
    'top_masters', coalesce((select jsonb_agg(to_jsonb(top)) from top), '[]'::jsonb)
  ) into res;
  return res;
end $$;

-- Funksiyalar: faqat tizimga kirganlar chaqiradi (ichida assert_admin), mehmonlar umuman chaqira olmaydi
do $$
declare f text;
begin
  foreach f in array array[
    'admin_set_verify(uuid, public.verify_status, text)',
    'admin_adjust_balance(uuid, int, text, text)',
    'admin_add_subscription(uuid, int, int)',
    'admin_set_priority(uuid, int)',
    'admin_set_blocked(uuid, boolean, text)',
    'admin_cancel_order(uuid, text)',
    'admin_delete_review(uuid, text)',
    'admin_update_category(text, int, boolean)',
    'admin_update_problem(text, int, int)',
    'admin_set_role(text, boolean)',
    'admin_support_reply(uuid, text)',
    'admin_support_threads()',
    'admin_stats(int)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
-- Ichki yordamchilar — tashqaridan chaqirilmaydi
revoke execute on function public.admin_write_log(text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.assert_admin() from public, anon;
