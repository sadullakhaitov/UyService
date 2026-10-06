-- UyService: yordamchi funksiyalar va triggerlar.
-- Qoida: ilova (anon/authenticated) faqat ruxsat etilgan ustunlarni o'zgartira oladi;
-- Edge Function'lar (service_role) va SQL Editor (postgres) — hamma narsani.

-- ---------- Kim? ----------
-- Admin: profiles.role = 'admin'
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- Ishonchli chaqiruvchi: service_role, postgres yoki admin. (SECURITY INVOKER — current_user chaqiruvchining o'zi)
create or replace function public.is_privileged() returns boolean
language sql stable set search_path = public as $$
  select current_user not in ('anon', 'authenticated') or public.is_admin()
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------- profiles ----------
-- Yangi foydalanuvchi (SMS orqali kirdi) — profil o'zi yaratiladi
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, phone, name, language)
  values (
    new.id,
    case when new.phone is null or new.phone = '' then null
         when left(new.phone, 1) = '+' then new.phone
         else '+' || new.phone end,
    nullif(new.raw_user_meta_data ->> 'name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'uz')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Oddiy foydalanuvchi o'zini admin qila olmaydi, telefon raqamini almashtira olmaydi
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
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- masters ----------
-- Usta o'zi o'zgartira olmaydigan ustunlar: reyting, aktivlik, balans, tekshiruv holati va h.k.
-- Faqat bitta istisno: anketani yuborganda verify_status none/rejected → pending.
create or replace function public.masters_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.is_privileged() then
    if tg_op = 'INSERT' then
      new.rating := 5.00;
      new.jobs_count := 0;
      new.activity := 80;
      new.priority_points := 0;
      new.balance := 0;
      new.subscription_until := null;
      new.busy := false;
      new.verify_note := null;
      if new.verify_status not in ('none', 'pending') then
        raise exception 'masters.verify_status: faqat admin tasdiqlaydi' using errcode = '42501';
      end if;
    else
      if new.verify_status is distinct from old.verify_status
         and not (new.verify_status = 'pending' and old.verify_status in ('none', 'rejected')) then
        raise exception 'masters.verify_status: faqat admin tasdiqlaydi' using errcode = '42501';
      end if;
      if (new.rating, new.jobs_count, new.activity, new.priority_points, new.balance, new.busy, new.verify_note)
           is distinct from (old.rating, old.jobs_count, old.activity, old.priority_points, old.balance, old.busy, old.verify_note)
         or new.subscription_until is distinct from old.subscription_until
         or new.id <> old.id then
        raise exception 'masters: bu ustunni faqat admin o''zgartiradi' using errcode = '42501';
      end if;
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.billing_plan is not null then new.plan_changed_at := now(); end if;
  elsif new.billing_plan is distinct from old.billing_plan then
    new.plan_changed_at := now();
  end if;
  if new.verify_status = 'pending' and (tg_op = 'INSERT' or old.verify_status <> 'pending') then
    new.submitted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger masters_guard
  before insert or update on public.masters
  for each row execute function public.masters_guard();

-- Buyurtma olish mumkinmi (ilovadagi useBlocked bilan bir xil):
-- komissiya — balans >= BALANCE_LIMIT (constants/billing.ts, 20 000), obuna — muddati tugamagan
create or replace function public.master_can_take_orders(m public.masters) returns boolean
language sql stable as $$
  select m.verify_status = 'approved'
     and case coalesce(m.billing_plan, 'commission')
           when 'commission' then m.balance >= 20000
           else coalesce(m.subscription_until > now(), false)
         end
$$;

-- Aktivlik 0..100 oralig'ida (qabul +2, rad/vaqt o'tdi −5, bekor −10 — _shared/dispatch.ts → DISPATCH.activity)
create or replace function public.bump_activity(p_master uuid, p_delta int) returns int
language sql security definer set search_path = public as $$
  update public.masters set activity = greatest(0, least(100, activity + p_delta))
  where id = p_master
  returning activity
$$;

-- ---------- master_locations ----------
-- Vaqtni server qo'yadi (telefon soati noto'g'ri bo'lishi mumkin)
create or replace function public.master_locations_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger master_locations_touch
  before insert or update on public.master_locations
  for each row execute function public.master_locations_touch();

-- ---------- orders ----------
create or replace function public.orders_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  uid uuid := auth.uid();
  plan public.billing_plan;
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
      -- mijoz: faqat bekor qilish
      allowed := array['status', 'cancel_reason'];
      if new.status is distinct from old.status
         and not (new.status = 'cancelled' and old.status in ('scheduled', 'searching', 'assigned', 'on_the_way', 'arrived')) then
        raise exception 'orders.status: mijoz faqat bekor qila oladi' using errcode = '42501';
      end if;
    elsif uid = old.master_id then
      -- usta: Yetib keldim → Ishni boshladim → Tugatdim (+ narx), yoki bekor qilish
      allowed := array['status', 'price_work', 'price_parts', 'cancel_reason'];
      if new.status is distinct from old.status and not (
           (old.status = 'assigned' and new.status = 'on_the_way')
        or (old.status = 'on_the_way' and new.status = 'arrived')
        or (old.status = 'arrived' and new.status = 'in_progress')
        or (old.status = 'in_progress' and new.status = 'completed')
        or (old.status in ('assigned', 'on_the_way', 'arrived') and new.status = 'cancelled')) then
        raise exception 'orders.status: % → % mumkin emas', old.status, new.status using errcode = '42501';
      end if;
      if (new.price_work is distinct from old.price_work or new.price_parts is distinct from old.price_parts)
         and old.status <> 'in_progress' then
        raise exception 'orders: narx faqat ish jarayonida yoziladi' using errcode = '42501';
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
  if new.status = 'completed' and old.status <> 'completed' then
    new.completed_at := now();
    select billing_plan into plan from public.masters where id = new.master_id;
    -- constants/billing.ts → platformCut: komissiya 10% (chaqiruv + ish + qism), obuna 0
    new.platform_fee := case when coalesce(plan, 'commission') = 'commission'
      then round((new.call_fee + coalesce(new.price_work, 0) + coalesce(new.price_parts, 0)) * 10 / 100.0)::int
      else 0 end;
  end if;
  if new.master_id is not null and old.master_id is null then
    new.accepted_at := now();
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger orders_guard
  before insert or update on public.orders
  for each row execute function public.orders_guard();

-- Buyurtma tugadi / bekor bo'ldi — ustaning holati (band emas, ishlar soni, balans, aktivlik)
create or replace function public.orders_after_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;

  if new.status = 'completed' and new.master_id is not null then
    update public.masters
       set busy = false,
           jobs_count = jobs_count + 1,
           balance = balance - coalesce(new.platform_fee, 0)
     where id = new.master_id;
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

create trigger orders_after_update
  after update on public.orders
  for each row execute function public.orders_after_update();

-- ---------- reviews ----------
-- Ustaning reytingi — barcha baholarning o'rtachasi
create or replace function public.reviews_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare mid uuid := coalesce(new.master_id, old.master_id);
begin
  update public.masters
     set rating = coalesce((select round(avg(stars)::numeric, 2) from public.reviews where master_id = mid), 5.00)
   where id = mid;
  return null;
end $$;

create trigger reviews_after_change
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_after_change();

-- ---------- subscriptions ----------
-- To'langan obuna — ustaning obuna muddati uzayadi
create or replace function public.subscriptions_after_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'paid' then
    update public.masters
       set subscription_until = greatest(coalesce(subscription_until, new.period_end), new.period_end)
     where id = new.master_id;
  end if;
  return null;
end $$;

create trigger subscriptions_after_change
  after insert or update on public.subscriptions
  for each row execute function public.subscriptions_after_change();

-- ---------- Usta qidirish ----------
-- Taklif yuborsa bo'ladigan ustalar: onlayn, tasdiqlangan, band emas, tarifi ochiq,
-- joylashuvi 2 daqiqadan eski emas, boshqa buyurtmada ochiq taklifi yo'q. Eng yaqini birinchi.
-- Faqat Edge Function'lar (service_role) chaqiradi — aniq joylashuvlar mijozga ko'rinmaydi.
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

revoke execute on function public.nearby_masters(double precision, double precision, double precision, text, uuid) from public, anon, authenticated;
grant execute on function public.nearby_masters(double precision, double precision, double precision, text, uuid) to service_role;
revoke execute on function public.bump_activity(uuid, int) from public, anon, authenticated;
grant execute on function public.bump_activity(uuid, int) to service_role;

-- Bosh sahifa xaritasi uchun: atrofdagi ustalar ~100 m aniqlikda (lib/geo.ts → blur), kimligi ko'rinmaydi
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
  where m.online and m.verify_status = 'approved'
    and l.updated_at > now() - interval '2 minutes'
    and (p_category is null or p_category = any (m.categories))
    and extensions.st_dwithin(l.location, p.pt, least(p_radius_km, 10) * 1000)
  order by 3
  limit 30
$$;
grant execute on function public.masters_around(double precision, double precision, double precision, text) to anon, authenticated;
