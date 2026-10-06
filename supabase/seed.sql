-- UyService: lokal sinov uchun demo ma'lumotlar (`npx supabase db reset` paytida ishlaydi).
-- Haqiqiy loyihaga `db push` bu faylni yubormaydi. Katalog (kategoriyalar, muammolar) — migratsiyada.
-- Toshkent markazi atrofida 3 ta tasdiqlangan, onlayn demo usta.

insert into auth.users (id, phone) values
  ('00000000-0000-4000-a000-000000000101', '998900000101'),
  ('00000000-0000-4000-a000-000000000102', '998900000102'),
  ('00000000-0000-4000-a000-000000000103', '998900000103')
on conflict (id) do nothing;

update public.profiles set role = 'master', name = v.name
from (values
  ('00000000-0000-4000-a000-000000000101'::uuid, 'Jasur'),
  ('00000000-0000-4000-a000-000000000102'::uuid, 'Bobur'),
  ('00000000-0000-4000-a000-000000000103'::uuid, 'Sardor')
) v (id, name)
where profiles.id = v.id;

insert into public.masters (id, first_name, last_name, experience_years, categories, rating, activity,
                            verify_status, billing_plan, balance, online)
values
  ('00000000-0000-4000-a000-000000000101', 'Jasur', 'Karimov', 8, '{plumber,appliance}', 4.90, 92, 'approved', 'commission', 50000, true),
  ('00000000-0000-4000-a000-000000000102', 'Bobur', 'Aliyev', 5, '{electric,repair}', 4.70, 85, 'approved', 'commission', 50000, true),
  ('00000000-0000-4000-a000-000000000103', 'Sardor', 'Tursunov', 3, '{aircon,furniture,plumber}', 4.50, 78, 'approved', 'commission', 50000, true)
on conflict (id) do nothing;

insert into public.master_locations (master_id, lat, lng) values
  ('00000000-0000-4000-a000-000000000101', 41.3165, 69.2790),
  ('00000000-0000-4000-a000-000000000102', 41.3050, 69.2700),
  ('00000000-0000-4000-a000-000000000103', 41.3220, 69.2950)
on conflict (master_id) do update set lat = excluded.lat, lng = excluded.lng;
