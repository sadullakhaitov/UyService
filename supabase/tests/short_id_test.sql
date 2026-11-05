-- UyService: foydalanuvchining qisqa ID raqami (migrations/…_user_short_id.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into auth.users (id, phone) values
  ('00000000-0000-4000-ae00-00000000000a', '998907960001'),
  ('00000000-0000-4000-ae00-00000000000b', '998907960002'),
  ('00000000-0000-4000-ae00-00000000000c', '998907960003');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-ae00-00000000000c';

do $$
declare a bigint; b bigint;
begin
  select short_id into a from public.profiles where id = '00000000-0000-4000-ae00-00000000000a';
  select short_id into b from public.profiles where id = '00000000-0000-4000-ae00-00000000000b';
  assert a >= 10001 and b > a, 'yangi profilga ketma-ket ID beriladi';
  assert not exists (select short_id from public.profiles group by short_id having count(*) > 1), 'ID takrorlanmaydi';
  raise notice 'PASS: har bir foydalanuvchiga takrorlanmas qisqa ID (10001 dan)';
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae00-00000000000a';
do $$
declare a bigint;
begin
  select short_id into a from public.profiles where id = auth.uid();
  assert a is not null, 'o''z ID''sini o''qiydi';
  update public.profiles set short_id = 1 where id = auth.uid();
  assert (select short_id from public.profiles where id = auth.uid()) = a, 'ID o''zgarmaydi';
  raise notice 'PASS: foydalanuvchi o''z ID''sini ko''radi, o''zgartira olmaydi';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-ae00-00000000000c';
do $$
declare b bigint;
begin
  select short_id into b from public.profiles where id = '00000000-0000-4000-ae00-00000000000b';
  assert (select count(*) from public.admin_users where search like '%id ' || b || '%') = 1, 'admin ID bo''yicha topadi';
  assert (select short_id from public.admin_users where id = '00000000-0000-4000-ae00-00000000000b') = b, 'admin_users.short_id';
  raise notice 'PASS: admin foydalanuvchini ID bo''yicha topadi';
end $$;
reset role;
reset request.jwt.claim.sub;
