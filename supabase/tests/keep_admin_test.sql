-- UyService: admin usta bo'lib ro'yxatdan o'tsa ham admin qoladi (migrations/…_keep_admin_role.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into auth.users (id, phone) values ('00000000-0000-4000-ad00-00000000000a', '998907950001');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-ad00-00000000000a';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ad00-00000000000a';
do $$ begin
  -- Usta anketasi: masters qatori + profiles.role = 'master' (eski ilova shunday yozadi)
  insert into public.masters (id, first_name, categories, billing_plan) values (auth.uid(), 'Admin', '{plumber}', 'commission');
  update public.profiles set role = 'master', name = 'Admin Usta' where id = auth.uid();
  assert (select role from public.profiles where id = auth.uid()) = 'admin', 'admin roli saqlanadi';
  assert (select name from public.profiles where id = auth.uid()) = 'Admin Usta', 'ism yoziladi';
  assert public.is_admin(), 'admin panelga kira oladi';
  raise notice 'PASS: admin usta bo''lib ro''yxatdan o''tsa ham admin qoladi';
end $$;
reset role;
reset request.jwt.claim.sub;

-- Server (admin_set_role) orqali olib tashlash ishlaydi
do $$ begin
  update public.profiles set role = 'master' where id = '00000000-0000-4000-ad00-00000000000a';
  assert (select role from public.profiles where id = '00000000-0000-4000-ad00-00000000000a') = 'master', 'server o''zgartira oladi';
  raise notice 'PASS: server adminlikni olib tashlay oladi';
end $$;
