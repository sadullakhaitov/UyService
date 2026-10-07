insert into auth.users (id, phone) values
  ('00000000-0000-4000-b000-00000000000a', '998901111111'),
  ('00000000-0000-4000-b000-000000000001', '998903333333'),
  ('00000000-0000-4000-b000-000000000002', '998904444444');
insert into public.masters (id, first_name, categories, verify_status, balance, online, rating, activity, billing_plan) values
  ('00000000-0000-4000-b000-000000000001', 'M1', '{plumber}', 'approved', 50000, true, 4.9, 80, 'commission'),
  ('00000000-0000-4000-b000-000000000002', 'M2', '{plumber}', 'approved', 50000, true, 4.0, 80, 'commission');
insert into public.master_locations (master_id, lat, lng) values
  ('00000000-0000-4000-b000-000000000001', 41.2760, 69.2040),
  ('00000000-0000-4000-b000-000000000002', 41.2770, 69.2060);
insert into public.orders (id, client_id, category_id, lat, lng) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-00000000000a', 'plumber', 41.2750, 69.2050),
  ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-00000000000a', 'aircon', 41.2750, 69.2050);
insert into public.orders (id, client_id, category_id, lat, lng, status, scheduled_at) values
  ('00000000-0000-4000-c000-000000000004', '00000000-0000-4000-b000-00000000000a', 'plumber', 41.2750, 69.2050, 'scheduled', now() + interval '10 minutes'),
  ('00000000-0000-4000-c000-000000000005', '00000000-0000-4000-b000-00000000000a', 'plumber', 41.2750, 69.2050, 'scheduled', now() + interval '3 hours');
