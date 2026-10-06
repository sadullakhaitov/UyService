-- UyService: kategoriyalar va muammolar (constants/categories.ts bilan bir xil).
-- Chaqiruv narxi hamma kategoriya uchun 50 000 so'm (CALL_FEE). Matnlar ilovada: locales/*.json → categories.<id>, problems.<id>

insert into public.categories (id, call_fee, sort, color_main, color_tint) values
  ('plumber', 50000, 1, '#0B6FB8', '#E3F1FB'),
  ('electric', 50000, 2, '#F5B800', '#FFF6D6'),
  ('aircon', 50000, 3, '#0E7490', '#E0F4F8'),
  ('furniture', 50000, 4, '#8B5A2B', '#F5ECE3'),
  ('repair', 50000, 5, '#6D3FC0', '#EFE8FA'),
  ('appliance', 50000, 6, '#3F5A6B', '#E8EEF2')
on conflict (id) do update set call_fee = excluded.call_fee, sort = excluded.sort, color_main = excluded.color_main, color_tint = excluded.color_tint;

insert into public.problems (id, category_id, price_min, price_max, sort) values
  ('tap', 'plumber', 50000, 120000, 1),
  ('toilet', 'plumber', 80000, 200000, 2),
  ('pipe', 'plumber', 100000, 300000, 3),
  ('clog', 'plumber', 60000, 150000, 4),
  ('boiler', 'plumber', 150000, 250000, 5),
  ('noPower', 'electric', 60000, 200000, 1),
  ('socket', 'electric', 40000, 100000, 2),
  ('chandelier', 'electric', 80000, 200000, 3),
  ('wiring', 'electric', 200000, 800000, 4),
  ('acNotCooling', 'aircon', 100000, 300000, 1),
  ('acCleaning', 'aircon', 120000, 200000, 2),
  ('acInstall', 'aircon', 300000, 600000, 3),
  ('acLeak', 'aircon', 80000, 200000, 4),
  ('assembly', 'furniture', 100000, 400000, 1),
  ('hinge', 'furniture', 40000, 120000, 2),
  ('furnitureFix', 'furniture', 80000, 250000, 3),
  ('paint', 'repair', null, null, 1),
  ('tile', 'repair', null, null, 2),
  ('door', 'repair', 80000, 250000, 3),
  ('washer', 'appliance', 100000, 350000, 1),
  ('fridge', 'appliance', 120000, 400000, 2),
  ('stove', 'appliance', 80000, 250000, 3)
on conflict (id) do update set category_id = excluded.category_id, price_min = excluded.price_min, price_max = excluded.price_max, sort = excluded.sort;
