-- Har bir foydalanuvchining qisqa ID raqami (5-noyabr): profilda "ID 10234", admin panelda shu raqam bo'yicha qidiriladi.
-- 10001 dan boshlab ketma-ket, yangi profilga o'zi beriladi, o'zgarmaydi. Ichki uuid (profiles.id) avvalgidek qoladi.

create sequence if not exists public.profiles_short_id_seq start with 10001;

alter table public.profiles add column if not exists short_id bigint;

-- Mavjud foydalanuvchilar — ro'yxatdan o'tgan tartibida
update public.profiles p set short_id = s.n
  from (select id, nextval('public.profiles_short_id_seq') as n
          from (select id from public.profiles where short_id is null order by created_at, id) o) s
 where p.id = s.id;

alter table public.profiles alter column short_id set default nextval('public.profiles_short_id_seq');
alter table public.profiles alter column short_id set not null;
alter sequence public.profiles_short_id_seq owned by public.profiles.short_id;
create unique index if not exists profiles_short_id_key on public.profiles (short_id);

-- O'zgarmaydi: ilova ham, admin ham yozolmaydi
create or replace function public.profiles_short_id_lock() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.short_id is distinct from old.short_id then
    new.short_id := old.short_id;
  end if;
  return new;
end $$;
drop trigger if exists profiles_short_id_lock on public.profiles;
create trigger profiles_short_id_lock before update on public.profiles
  for each row execute function public.profiles_short_id_lock();

-- Ilova o'z ID'sini o'qiydi (ustunlar bo'yicha ruxsat — …_security_hardening.sql)
grant select (short_id) on public.profiles to authenticated;

-- Admin ko'rinishlari: short_id oxiriga, qidiruvda "id 10234"
create or replace view public.admin_masters with (security_invoker = true) as
  select m.id, m.first_name, m.last_name, p.phone, p.name, p.language, p.blocked_at, p.blocked_reason,
         m.experience_years, m.categories, m.rating, m.jobs_count, m.activity, m.priority_points,
         m.verify_status, m.verify_note, m.balance, m.subscription_until, m.busy, m.online,
         m.billing_plan, m.photo_path, m.passport_path, m.selfie_path, m.works, m.submitted_at, m.created_at,
         public.master_fee_percent(m) as fee_percent,
         public.master_can_take_orders(m) as can_take,
         l.lat, l.lng, l.updated_at as seen_at,
         (select count(*) from public.reviews r where r.master_id = m.id)::int as reviews_count,
         lower(concat_ws(' ', m.first_name, m.last_name, p.phone, p.name, 'id ' || p.short_id)) as search,
         m.free_until,
         p.short_id
  from public.masters m
  join public.profiles p on p.id = m.id
  left join public.master_locations l on l.master_id = m.id
  where public.is_admin() and p.deleted_at is null;

create or replace view public.admin_users with (security_invoker = true) as
  select p.id, p.phone, p.name, p.role, p.language, p.blocked_at, p.blocked_reason, p.created_at,
         exists (select 1 from public.masters m where m.id = p.id) as is_master,
         (select count(*) from public.orders o where o.client_id = p.id)::int as orders_count,
         (select count(*) from public.orders o where o.client_id = p.id and o.status = 'completed')::int as completed_count,
         (select coalesce(sum(public.order_total(o)), 0) from public.orders o where o.client_id = p.id and o.status = 'completed')::bigint as spent,
         (select max(o.created_at) from public.orders o where o.client_id = p.id) as last_order_at,
         lower(concat_ws(' ', p.name, p.phone, 'id ' || p.short_id)) as search,
         p.short_id
  from public.profiles p
  where public.is_admin() and p.deleted_at is null;
