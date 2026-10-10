-- UyService: usta Telegram'ni (yoki ilovani) yig'ib qo'ysa ham ishda qoladi — "fon rejimi".
-- Muammo: Mini App yig'ilsa sahifa to'xtaydi, joylashuv kelmay qoladi va usta 2 daqiqadan keyin ro'yxatdan chiqardi.
-- Yechim:
--   1) Ilova ochiq — oldingidek: joylashuv har 5 s, "onlayn" — oxirgi 2 daqiqada joylashuv kelgan bo'lsa.
--   2) Fon rejimi — usta xabarni ilova yopiq paytda ham oladigan bo'lsa (Telegram bot yoki telefon push'i, "Yangi buyurtma"
--      yoqilgan): oxirgi ma'lum joylashuv 45 daqiqagacha amal qiladi — taklif bot xabari bo'lib keladi.
--   3) Telegram'da "jonli joylashuv" ulashilsa (bot chatida 📎 → Joylashuv) — muddati tugaguncha joylashuv o'zi yangilanadi
--      (telegram-bot → master_locations), usta yursa ham taklif to'g'ri joyga keladi.
--   4) 35 daqiqa joylashuv kelmasa — bot "Hali ishdamisiz?" deb so'raydi («📍 Joylashuvni yuborish» — bitta bosish);
--      45 daqiqada ham kelmasa — buyurtmalar to'xtaydi va bu haqda xabar boradi (online o'chmaydi: ilova ochilsa
--      yoki joylashuv yuborilsa, darhol davom etadi).

alter table public.masters
  add column if not exists live_until timestamptz,      -- Telegram jonli joylashuvi shu vaqtgacha
  add column if not exists bg_pinged_at timestamptz,    -- "Hali ishdamisiz?" yuborilgan payt
  add column if not exists bg_lost_at timestamptz;      -- "Buyurtmalar to'xtadi" yuborilgan payt

-- Bu ustunlarni faqat server yozadi (usta o'zini "doim onlayn" qilib qo'ymasin)
create or replace function public.masters_presence_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    new.live_until := null; new.bg_pinged_at := null; new.bg_lost_at := null;
  elsif (new.live_until, new.bg_pinged_at, new.bg_lost_at) is distinct from (old.live_until, old.bg_pinged_at, old.bg_lost_at) then
    raise exception 'masters.live_until: faqat server' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists masters_presence_guard on public.masters;
create trigger masters_presence_guard before insert or update on public.masters
  for each row execute function public.masters_presence_guard();

-- Usta xabarni ilova yopiq paytda ham oladimi (Telegram bot yoki Expo push) va "Yangi buyurtma" yoqilganmi
create or replace function public.master_reachable(p_master uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_master and p.notify_offers and (p.telegram_id is not null or p.push_token is not null)
      and p.deleted_at is null)
$$;

-- Usta hozir "joyida"mi (onlayn bo'lishidan tashqari): ilova ochiq — 2 daqiqa; fon rejimi — 45 daqiqa;
-- Telegram jonli joylashuvi — muddati tugaguncha (turgan joyida yangilanish siyrak keladi), lekin 8 soatdan eski emas
create or replace function public.master_present(p_master uuid, p_live_until timestamptz, p_loc_at timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select p_loc_at > now() - interval '2 minutes'
      or (public.master_reachable(p_master)
          and (p_loc_at > now() - interval '45 minutes'
               or (p_live_until > now() and p_loc_at > now() - interval '8 hours')))
$$;

-- Joylashuv kelsa — eslatma bayroqlari tozalanadi (keyingi safar yana so'raladi)
create or replace function public.master_locations_presence() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.masters set bg_pinged_at = null, bg_lost_at = null
   where id = new.master_id and (bg_pinged_at is not null or bg_lost_at is not null);
  return new;
end $$;
drop trigger if exists master_locations_presence on public.master_locations;
create trigger master_locations_presence after insert or update on public.master_locations
  for each row execute function public.master_locations_presence();

-- Taqsimlash nomzodlari: 2 daqiqa o'rniga master_present
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
    and public.master_present(m.id, m.live_until, l.updated_at)
    and extensions.st_dwithin(l.location, p.pt, p_radius_km * 1000)
    and not exists (
      select 1 from public.offers o
      where o.master_id = m.id and o.status = 'sent' and o.expires_at > now()
        and (p_order_id is null or o.order_id <> p_order_id))
    and (p_order_id is null or m.id <> (select client_id from public.orders where id = p_order_id))
  order by distance_km
  limit 50
$$;

-- Mijoz xaritasidagi "N onlayn" ham xuddi shunday
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
    and public.master_present(m.id, m.live_until, l.updated_at)
    and (p_category is null or p_category = any (m.categories))
    and extensions.st_dwithin(l.location, p.pt, least(p_radius_km, 10) * 1000)
  order by 3
  limit 30
$$;

-- Eslatmalar (offer-timeout har 15 s chaqiradi): 35 daqiqada "Hali ishdamisiz?", 45 daqiqada "Buyurtmalar to'xtadi".
-- Faqat fon rejimidagi (xabar oladigan), bo'sh, jonli joylashuvsiz ustalarga; har bosqich bir marta.
create or replace function public.presence_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select m.id, l.updated_at, m.bg_pinged_at, m.bg_lost_at
    from public.masters m join public.master_locations l on l.master_id = m.id
    where m.online and not m.busy
      and (m.live_until is null or m.live_until <= now())
      and l.updated_at < now() - interval '35 minutes'
      and l.updated_at > now() - interval '12 hours'
      and (m.bg_lost_at is null)
      and public.master_reachable(m.id)
  loop
    if r.updated_at < now() - interval '45 minutes' then
      perform public.enqueue_push(r.id, 'presenceLost', '{}'::jsonb, '/master');
      update public.masters set bg_lost_at = now() where id = r.id;
      n := n + 1;
    elsif r.bg_pinged_at is null then
      perform public.enqueue_push(r.id, 'stillWorking', '{}'::jsonb, '/master');
      update public.masters set bg_pinged_at = now() where id = r.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

revoke execute on function public.presence_reminders(), public.master_reachable(uuid),
  public.master_present(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.presence_reminders() to service_role;

-- Usta o'z holatini ko'radi: fon rejimi ishlaydimi, jonli joylashuv qachongacha (ilovadagi karta uchun)
create or replace function public.my_presence() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reachable', public.master_reachable(auth.uid()),
    'telegram', (select p.telegram_id is not null from public.profiles p where p.id = auth.uid()),
    'live_until', (select m.live_until from public.masters m where m.id = auth.uid()),
    'location_at', (select l.updated_at from public.master_locations l where l.master_id = auth.uid()))
$$;
revoke execute on function public.my_presence() from public, anon;
grant execute on function public.my_presence() to authenticated;

-- Admin bosh sahifasi: "hozir onlayn" — fon rejimidagilar bilan
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
         where m.online and public.master_present(m.id, m.live_until, l.updated_at)) as online,
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
