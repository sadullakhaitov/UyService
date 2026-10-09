-- UyService: admin hisobni o'chiradi (migrations/…_admin_delete.sql). "PASS ..." — o'tdi, "FAIL ..." — to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- C — mijoz, M — usta, B — faol buyurtmali mijoz, A — admin, A2 — boshqa admin
insert into auth.users (id, phone) values
  ('00000000-0000-4000-cd00-00000000000c', '998907390001'),
  ('00000000-0000-4000-cd00-000000000001', '998907390002'),
  ('00000000-0000-4000-cd00-00000000000b', '998907390003'),
  ('00000000-0000-4000-cd00-0000000000aa', '998907390004'),
  ('00000000-0000-4000-cd00-0000000000a2', '998907390005');
insert into public.masters (id, first_name, last_name, categories, billing_plan, passport_path) values
  ('00000000-0000-4000-cd00-000000000001', 'Olim', 'Ustayev', '{plumber}', 'commission', 'x/passport.jpg');
update public.profiles set role = 'admin' where id in ('00000000-0000-4000-cd00-0000000000aa', '00000000-0000-4000-cd00-0000000000a2');
update public.profiles set name = 'Kamola' where id = '00000000-0000-4000-cd00-00000000000c';
insert into public.orders (id, client_id, category_id, address, lat, lng, status, cancelled_by) values
  ('00000000-0000-4000-cd10-000000000001', '00000000-0000-4000-cd00-00000000000c', 'plumber', 'A', 41.31, 69.27, 'cancelled', 'client'),
  ('00000000-0000-4000-cd10-000000000002', '00000000-0000-4000-cd00-00000000000b', 'plumber', 'B', 41.31, 69.27, 'searching', null);

set role authenticated;
-- Oddiy foydalanuvchi o'chira olmaydi
set request.jwt.claim.sub = '00000000-0000-4000-cd00-00000000000b';
do $$ begin
  begin
    perform public.admin_delete_account('00000000-0000-4000-cd00-00000000000c', 'test');
    raise exception 'FAIL: oddiy foydalanuvchi boshqani o''chirdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: admin bo''lmagan odam hisob o''chira olmaydi';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-cd00-0000000000aa';
do $$ begin
  begin
    perform public.admin_delete_account('00000000-0000-4000-cd00-00000000000c', '  ');
    raise exception 'FAIL: sababsiz o''chirildi';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: sababsiz o''chirilmaydi';
end $$;
do $$ begin
  begin
    perform public.admin_delete_account('00000000-0000-4000-cd00-0000000000a2', 'test');
    raise exception 'FAIL: boshqa admin o''chirildi';
  exception when insufficient_privilege then
    if sqlerrm not like '%admin_target%' then raise; end if;
  end;
  begin
    perform public.admin_delete_account('00000000-0000-4000-cd00-0000000000aa', 'test');
    raise exception 'FAIL: admin o''zini o''chirdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: adminni va o''zini o''chirib bo''lmaydi';
end $$;
do $$ begin
  begin
    perform public.admin_delete_account('00000000-0000-4000-cd00-00000000000b', 'test');
    raise exception 'FAIL: faol buyurtmali hisob o''chirildi';
  exception when raise_exception then
    if sqlerrm not like '%active_orders%' then raise; end if;
  end;
  raise notice 'PASS: faol buyurtmasi bo''lsa o''chirilmaydi';
end $$;

select public.admin_delete_account('00000000-0000-4000-cd00-00000000000c', 'Foydalanuvchi so''radi');
select public.admin_delete_account('00000000-0000-4000-cd00-000000000001', 'Soxta usta');
do $$ begin
  if exists (select 1 from public.admin_users where id = '00000000-0000-4000-cd00-00000000000c') then raise exception 'FAIL: o''chirilgan mijoz ro''yxatda'; end if;
  if exists (select 1 from public.admin_masters where id = '00000000-0000-4000-cd00-000000000001') then raise exception 'FAIL: o''chirilgan usta ro''yxatda'; end if;
  if not exists (select 1 from public.admin_users where id = '00000000-0000-4000-cd00-00000000000b') then raise exception 'FAIL: boshqa foydalanuvchi yo''qoldi'; end if;
  raise notice 'PASS: o''chirilganlar admin ro''yxatlarida ko''rinmaydi';
end $$;
do $$ begin
  begin
    perform public.admin_delete_account('00000000-0000-4000-cd00-00000000000c', 'yana');
    raise exception 'FAIL: ikki marta o''chirildi';
  exception when no_data_found then null;
  end;
  raise notice 'PASS: o''chirilgan hisobni qayta o''chirib bo''lmaydi';
end $$;
reset role;

do $$ declare p public.profiles; m public.masters; l public.admin_log; begin
  select * into p from public.profiles where id = '00000000-0000-4000-cd00-00000000000c';
  if p.phone is not null or p.name is not null or p.deleted_at is null or p.blocked_at is null then
    raise exception 'FAIL: mijoz ma''lumotlari qoldi: %', row_to_json(p);
  end if;
  if not exists (select 1 from public.orders where client_id = p.id) then raise exception 'FAIL: buyurtmalar tarixi o''chdi'; end if;
  select * into m from public.masters where id = '00000000-0000-4000-cd00-000000000001';
  if m.first_name <> '' or m.passport_path is not null then raise exception 'FAIL: usta hujjatlari qoldi: %', row_to_json(m); end if;
  select * into l from public.admin_log where action = 'delete_account' and target_id = '00000000-0000-4000-cd00-00000000000c';
  if l.id is null or l.target_type <> 'user' or l.details->>'reason' <> 'Foydalanuvchi so''radi' or l.details->>'name' <> 'Kamola'
     or l.details->>'phone' <> '…0001' then
    raise exception 'FAIL: jurnal yozuvi noto''g''ri: %', row_to_json(l);
  end if;
  if not exists (select 1 from public.admin_log where action = 'delete_account' and target_type = 'master' and target_id = '00000000-0000-4000-cd00-000000000001') then
    raise exception 'FAIL: usta o''chirilgani jurnalda yo''q';
  end if;
  raise notice 'PASS: shaxsiy ma''lumot o''chadi, tarix anonim qoladi, jurnalda sabab va raqamning oxiri';
end $$;
