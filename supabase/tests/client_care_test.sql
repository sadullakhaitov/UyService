-- UyService: manzil tafsiloti, buyurtma chegaralari, murojaatlar, "mijoz eshikni ochmadi", hisobni o'chirish,
-- statistika (migrations/…_client_care.sql). Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- C — mijoz, D — boshqa mijoz, M — usta, A — admin
insert into auth.users (id, phone) values
  ('00000000-0000-4000-ca00-00000000000c', '998907290001'),
  ('00000000-0000-4000-ca00-00000000000d', '998907290002'),
  ('00000000-0000-4000-ca00-000000000001', '998907290003'),
  ('00000000-0000-4000-ca00-0000000000aa', '998907290004');
insert into public.masters (id, first_name, last_name, categories, billing_plan, passport_path) values
  ('00000000-0000-4000-ca00-000000000001', 'Eshik', 'Ustayev', '{plumber}', 'commission', 'x/passport.jpg');
update public.masters set verify_status = 'approved', balance = 100000, online = true where id = '00000000-0000-4000-ca00-000000000001';
update public.profiles set role = 'admin' where id = '00000000-0000-4000-ca00-0000000000aa';
update public.profiles set name = 'Dilnoza', push_token = 'ExponentPushToken[c]' where id = '00000000-0000-4000-ca00-00000000000c';

-- 1. Manzil tafsiloti yoziladi; 2. faol buyurtmalar chegarasi (3 ta)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng, entrance, floor, apartment, intercom, landmark) values
  ('00000000-0000-4000-cb00-000000000001', '00000000-0000-4000-ca00-00000000000c', 'plumber', 'tap', 'A', 41.31, 69.27, '2', '5', '34', '34K', 'Maktab yonida'),
  ('00000000-0000-4000-cb00-000000000002', '00000000-0000-4000-ca00-00000000000c', 'plumber', 'tap', 'B', 41.31, 69.27, null, null, null, null, null),
  ('00000000-0000-4000-cb00-000000000003', '00000000-0000-4000-ca00-00000000000c', 'plumber', 'tap', 'C', 41.31, 69.27, null, null, null, null, null);
do $$ begin
  begin
    insert into public.orders (client_id, category_id, problem_id, address, lat, lng)
    values ('00000000-0000-4000-ca00-00000000000c', 'plumber', 'tap', 'D', 41.31, 69.27);
    raise exception 'FAIL: 4-faol buyurtma yaratildi';
  exception when raise_exception then
    if sqlerrm not like '%too_many_active%' then raise; end if;
  end;
  begin
    insert into public.orders (client_id, category_id, address, lat, lng, landmark)
    values ('00000000-0000-4000-ca00-00000000000c', 'plumber', 'E', 41.31, 69.27, repeat('x', 121));
    raise exception 'FAIL: juda uzun mo''ljal qabul qilindi';
  exception when check_violation then null; when raise_exception then null;
  end;
  raise notice 'PASS: bir vaqtda 3 tadan ortiq faol buyurtma yo''q, maydonlar uzunligi cheklangan';
end $$;
reset role;

do $$ declare o public.orders; begin
  select * into o from public.orders where id = '00000000-0000-4000-cb00-000000000001';
  if o.entrance <> '2' or o.floor <> '5' or o.apartment <> '34' or o.intercom <> '34K' or o.landmark <> 'Maktab yonida' then
    raise exception 'FAIL: uy tafsiloti saqlanmadi: %', row_to_json(o);
  end if;
  if (select entrance from public.admin_orders where id = o.id) is not null then
    raise exception 'FAIL: admin_orders admin bo''lmaganga ko''rindi';
  end if;
  raise notice 'PASS: podyezd, qavat, xonadon, domofon va mo''ljal saqlanadi';
end $$;

-- 3. Usta: 1-buyurtmaga yetib keldi, mijoz eshikni ochmadi; 2-buyurtma yakunlandi (narxga rozi)
update public.orders set master_id = '00000000-0000-4000-ca00-000000000001', status = 'arrived'
 where id = '00000000-0000-4000-cb00-000000000001';
update public.orders set master_id = '00000000-0000-4000-ca00-000000000001', status = 'on_the_way'
 where id = '00000000-0000-4000-cb00-000000000002';
update public.masters set busy = true where id = '00000000-0000-4000-ca00-000000000001';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-000000000001';
do $$ begin
  begin
    perform public.master_client_absent('00000000-0000-4000-cb00-000000000002');
    raise exception 'FAIL: yetib kelmasdan "eshikni ochmadi" bosildi';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: "mijoz eshikni ochmadi" — faqat yetib kelgandan keyin';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000d';
do $$ begin
  begin
    perform public.master_client_absent('00000000-0000-4000-cb00-000000000001');
    raise exception 'FAIL: begona odam buyurtmani yopdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: begona odam "eshikni ochmadi" deya olmaydi';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-000000000001';
select public.master_client_absent('00000000-0000-4000-cb00-000000000001', 'Qo''ng''iroqqa javob bermadi');
reset role;

do $$ declare o public.orders; begin
  select * into o from public.orders where id = '00000000-0000-4000-cb00-000000000001';
  if o.status <> 'cancelled' or o.cancel_reason <> 'client_absent' or o.cancelled_by <> 'master' then
    raise exception 'FAIL: buyurtma yopilmadi: %', row_to_json(o);
  end if;
  if not exists (select 1 from public.order_reports where order_id = o.id and kind = 'client_absent') then
    raise exception 'FAIL: murojaat yozilmadi';
  end if;
  if not exists (select 1 from public.push_outbox where user_id = o.client_id and kind = 'absent') then
    raise exception 'FAIL: mijozga xabar yuborilmadi';
  end if;
  raise notice 'PASS: mijoz eshikni ochmasa buyurtma to''lovsiz yopiladi, mijozga xabar va adminga murojaat';
end $$;

-- 2-buyurtma yakunlandi: narxga rozi bo'lingan, "Ish tugadi" xabarida jami summa
update public.orders set status = 'arrived' where id = '00000000-0000-4000-cb00-000000000002';
update public.orders set door_verified_at = now(), price_work = 120000, price_parts = 30000, price_status = 'proposed' where id = '00000000-0000-4000-cb00-000000000002';
update public.orders set price_status = 'approved', status = 'in_progress' where id = '00000000-0000-4000-cb00-000000000002';
update public.orders set status = 'completed' where id = '00000000-0000-4000-cb00-000000000002';
do $$ begin
  if not exists (select 1 from public.push_outbox where kind = 'done' and (params ->> 'sum')::int = 150000) then
    raise exception 'FAIL: "Ish tugadi" xabarida jami summa yo''q: %', (select jsonb_agg(params) from public.push_outbox where kind = 'done');
  end if;
  raise notice 'PASS: ish tugaganda mijozga chek — jami summa';
end $$;

-- 4. Mijoz murojaatlari
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000d';
do $$ begin
  begin
    perform public.report_order('00000000-0000-4000-cb00-000000000002', 'quality', 'Yomon');
    raise exception 'FAIL: begona mijoz murojaat qildi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: faqat o''z buyurtmasiga murojaat';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
do $$ begin
  begin
    perform public.report_order('00000000-0000-4000-cb00-000000000003', 'warranty');
    raise exception 'FAIL: yakunlanmagan buyurtmaga kafolat';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.report_order('00000000-0000-4000-cb00-000000000002', 'quality', '   ');
    raise exception 'FAIL: matnsiz shikoyat';
  exception when invalid_parameter_value then null;
  end;
  perform public.report_order('00000000-0000-4000-cb00-000000000002', 'warranty', 'Kran yana oqyapti');
  begin
    perform public.report_order('00000000-0000-4000-cb00-000000000002', 'warranty', 'Yana');
    raise exception 'FAIL: bir xil ochiq murojaat ikki marta';
  exception when unique_violation then null;
  end;
  if not exists (select 1 from public.chat_messages where support_user_id = auth.uid() and text like 'Kafolat%Kran yana oqyapti') then
    raise exception 'FAIL: murojaat qo''llab-quvvatlash chatiga yozilmadi';
  end if;
  if (select count(*) from public.order_reports) <> 1 then
    raise exception 'FAIL: mijoz boshqalarning murojaatini ko''rdi';
  end if;
  raise notice 'PASS: kafolat — faqat yakunlangan ishga, chatga yoziladi, takror yo''q, faqat o''zinikini ko''radi';
end $$;
reset role;

-- Kafolat muddati o'tgan
update public.orders set completed_at = now() - interval '31 days' where id = '00000000-0000-4000-cb00-000000000002';
update public.order_reports set status = 'resolved' where order_id = '00000000-0000-4000-cb00-000000000002';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
do $$ begin
  begin
    perform public.report_order('00000000-0000-4000-cb00-000000000002', 'warranty');
    raise exception 'FAIL: 30 kundan keyin kafolat';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: kafolat 30 kun';
end $$;
reset role;
update public.order_reports set status = 'open', resolved_at = null where order_id = '00000000-0000-4000-cb00-000000000002';

-- 5. Admin murojaatni yopadi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
do $$ declare rid uuid := (select id from public.order_reports where kind = 'warranty'); begin
  begin
    perform public.admin_resolve_report(rid, 'ok');
    raise exception 'FAIL: mijoz murojaatni yopdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: murojaatni faqat admin yopadi';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-0000000000aa';
do $$ declare rid uuid := (select id from public.order_reports where kind = 'warranty'); begin
  if (select count(*) from public.admin_reports) <> 2 then raise exception 'FAIL: admin hamma murojaatni ko''rmadi'; end if;
  if (select open_reports from public.admin_orders where id = '00000000-0000-4000-cb00-000000000002') <> 1 then
    raise exception 'FAIL: buyurtmadagi ochiq murojaatlar soni';
  end if;
  perform public.admin_resolve_report(rid, 'Usta ertaga bepul keladi');
  if (select status from public.order_reports where id = rid) <> 'resolved' then raise exception 'FAIL: yopilmadi'; end if;
  if not exists (select 1 from public.admin_log where action = 'report_resolve' and target_id = rid::text) then
    raise exception 'FAIL: jurnalga yozilmadi';
  end if;
  raise notice 'PASS: admin murojaatni yechim bilan yopadi, jurnalga yoziladi';
end $$;
reset role;

-- 6. 30 kunda 3 marta "eshikni ochmadi" — yangi buyurtma yopiladi
do $$ declare i int; oid uuid; begin
  for i in 1..2 loop
    oid := gen_random_uuid();
    insert into public.orders (id, client_id, category_id, address, lat, lng, master_id, status, cancelled_by, cancel_reason)
    values (oid, '00000000-0000-4000-ca00-00000000000c', 'plumber', 'X', 41.31, 69.27, '00000000-0000-4000-ca00-000000000001', 'cancelled', 'master', 'client_absent');
  end loop;
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
do $$ begin
  begin
    insert into public.orders (client_id, category_id, address, lat, lng) values ('00000000-0000-4000-ca00-00000000000c', 'plumber', 'Y', 41.31, 69.27);
    raise exception 'FAIL: 3 marta eshik ochilmagandan keyin buyurtma qabul qilindi';
  exception when raise_exception then
    if sqlerrm not like '%no_show_limit%' then raise; end if;
  end;
  raise notice 'PASS: 3 marta "eshikni ochmadi" — yangi buyurtma admin bilan gaplashguncha yopiq';
end $$;
reset role;

-- 7. Statistika va xatolar: anon yozadi, o'qiy olmaydi; throttling; admin voronka
set role anon;
insert into public.app_events (device, name, platform) values ('device-0001', 'app_open', 'web'), ('device-0001', 'order_open', 'web');
insert into public.app_errors (device, message, screen, platform) values ('device-0001', 'TypeError: x is undefined', '/client/order', 'web');
do $$ begin
  begin
    insert into public.app_events (device, name) values ('device-0001', 'hack');
    raise exception 'FAIL: noma''lum hodisa yozildi';
  exception when check_violation then null;
  end;
  begin
    perform 1 from public.app_events;
    if found then raise exception 'FAIL: anon statistikani o''qidi'; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: ilova statistika yozadi, lekin o''qiy olmaydi';
end $$;
do $$ declare i int; begin
  for i in 1..70 loop insert into public.app_events (device, name) values ('device-spam1', 'app_open'); end loop;
end $$;
reset role;
do $$ begin
  if (select count(*) from public.app_events where device = 'device-spam1') <> 60 then
    raise exception 'FAIL: bir qurilmadan daqiqasiga 60 tadan ko''p yozildi: %', (select count(*) from public.app_events where device = 'device-spam1');
  end if;
  raise notice 'PASS: bir qurilmadan daqiqasiga ko''pi bilan 60 yozuv';
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-0000000000aa';
do $$ begin
  if (select devices from public.admin_funnel(7) where name = 'app_open') <> 2 then raise exception 'FAIL: voronka'; end if;
  if (select count from public.admin_errors(7) where message like 'TypeError%') <> 1 then raise exception 'FAIL: xatolar'; end if;
  raise notice 'PASS: admin voronka va xatolarni ko''radi';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
do $$ begin
  begin
    perform public.admin_funnel(7);
    raise exception 'FAIL: mijoz voronkani ko''rdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: voronka faqat adminga';
end $$;
reset role;

-- 8. Hisobni o'chirish
update public.orders set status = 'on_the_way' where id = '00000000-0000-4000-cb00-000000000003';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
do $$ begin
  begin
    perform public.delete_my_account();
    raise exception 'FAIL: faol buyurtma bilan hisob o''chirildi';
  exception when raise_exception then
    if sqlerrm not like '%active_orders%' then raise; end if;
  end;
  raise notice 'PASS: faol buyurtma bo''lsa hisob o''chirilmaydi';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-0000000000aa';
do $$ begin
  begin
    perform public.delete_my_account();
    raise exception 'FAIL: admin o''zini o''chirdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: admin o''z hisobini o''chira olmaydi';
end $$;
reset role;
update public.orders set status = 'cancelled', cancelled_by = 'client', cancel_reason = 'changed' where id = '00000000-0000-4000-cb00-000000000003';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ca00-00000000000c';
select public.delete_my_account();
set request.jwt.claim.sub = '00000000-0000-4000-ca00-000000000001';
select public.delete_my_account();
reset role;
do $$ declare p public.profiles; m public.masters; begin
  select * into p from public.profiles where id = '00000000-0000-4000-ca00-00000000000c';
  if p.phone is not null or p.name is not null or p.push_token is not null or p.deleted_at is null or p.blocked_at is null then
    raise exception 'FAIL: mijoz ma''lumotlari qoldi: %', row_to_json(p);
  end if;
  if exists (select 1 from public.chat_messages where support_user_id = p.id) then raise exception 'FAIL: yozishmalar qoldi'; end if;
  if (select count(*) from public.orders where client_id = p.id) < 3 then raise exception 'FAIL: buyurtmalar tarixi o''chib ketdi'; end if;
  select * into m from public.masters where id = '00000000-0000-4000-ca00-000000000001';
  if m.first_name <> '' or m.passport_path is not null or m.online then raise exception 'FAIL: usta ma''lumotlari qoldi: %', row_to_json(m); end if;
  raise notice 'PASS: hisob o''chirilganda shaxsiy ma''lumot o''chadi, buyurtmalar tarixi anonim qoladi';
end $$;
