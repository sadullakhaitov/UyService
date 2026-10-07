-- UyService: push-bildirishnomalar navbati sinovi (migrations/…_push.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- C — mijoz (token bor), M — usta (token bor), N — usta (tokensiz)
insert into auth.users (id, phone) values
  ('00000000-0000-4000-8000-00000000000c', '998909000001'),
  ('00000000-0000-4000-8000-000000000001', '998909000002'),
  ('00000000-0000-4000-8000-000000000002', '998909000003');
insert into public.masters (id, first_name, categories, billing_plan) values
  ('00000000-0000-4000-8000-000000000001', 'Pusher', '{plumber}', 'commission'),
  ('00000000-0000-4000-8000-000000000002', 'Silent', '{plumber}', 'commission');
update public.masters set verify_status = 'approved', balance = 100000, online = true
 where id in ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');

-- ---------- Ruxsatlar ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000c';
update public.profiles set push_token = 'ExponentPushToken[client]', language = 'ru' where id = auth.uid();
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
update public.profiles set push_token = 'ExponentPushToken[master]' where id = auth.uid();
do $$ begin
  begin
    perform 1 from public.push_outbox;
    raise exception 'FAIL: foydalanuvchi push_outbox ni o''qidi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.app_settings;
    raise exception 'FAIL: foydalanuvchi app_settings ni o''qidi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.claim_push(10);
    raise exception 'FAIL: foydalanuvchi claim_push chaqirdi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.enqueue_push(auth.uid(), 'done', '{}'::jsonb, null);
    raise exception 'FAIL: foydalanuvchi o''ziga push yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: push navbati va sozlamalari ilovaga yopiq, o''z tokenini yoza oladi';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng)
values ('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8000-00000000000c', 'plumber', 'tap', 'A', 41.31, 69.27);
reset role;

-- ---------- Taklif → ustaga "Yangi buyurtma" ----------
insert into public.offers (order_id, master_id, eta_min, distance_km) values
  ('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8000-000000000001', 7, 2.4),
  ('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8000-000000000002', 9, 3.1);
do $$ begin
  if (select count(*) from public.push_outbox where kind = 'offer') <> 1
     or not exists (select 1 from public.push_outbox where kind = 'offer' and user_id = '00000000-0000-4000-8000-000000000001'
                    and params ->> 'category' = 'plumber' and (params ->> 'min')::int = 7 and url = '/master/offer') then
    raise exception 'FAIL: offer push: %', (select json_agg(o) from public.push_outbox o);
  end if;
  raise notice 'PASS: taklif — tokeni bor ustaga "Yangi buyurtma", tokensiz ustaga yozilmaydi';
end $$;

-- Usta "Yangi buyurtma"ni o'chirib qo'ydi
update public.profiles set notify_offers = false where id = '00000000-0000-4000-8000-000000000001';
update public.offers set status = 'expired' where order_id = '00000000-0000-4000-8100-000000000001';
insert into public.offers (order_id, master_id, eta_min) values ('00000000-0000-4000-8100-000000000001', '00000000-0000-4000-8000-000000000001', 7);
do $$ begin
  if (select count(*) from public.push_outbox where kind = 'offer') <> 1 then raise exception 'FAIL: o''chirilgan bo''lsa ham offer push yozildi'; end if;
  raise notice 'PASS: usta sozlamada o''chirgan bo''lsa "Yangi buyurtma" yuborilmaydi';
end $$;
update public.profiles set notify_offers = true where id = '00000000-0000-4000-8000-000000000001';

-- ---------- Buyurtma oqimi → mijozga ----------
update public.offers set status = 'accepted' where order_id = '00000000-0000-4000-8100-000000000001' and status = 'sent';
update public.orders set master_id = '00000000-0000-4000-8000-000000000001', status = 'on_the_way'
 where id = '00000000-0000-4000-8100-000000000001';
update public.orders set status = 'arrived' where id = '00000000-0000-4000-8100-000000000001';
update public.orders set door_verified_at = now() where id = '00000000-0000-4000-8100-000000000001';
update public.orders set price_work = 200000, price_parts = 50000, price_status = 'proposed' where id = '00000000-0000-4000-8100-000000000001';
update public.orders set price_status = 'approved', status = 'in_progress' where id = '00000000-0000-4000-8100-000000000001';
update public.orders set status = 'completed' where id = '00000000-0000-4000-8100-000000000001';
do $$ declare kinds text; begin
  select string_agg(kind || ':' || coalesce(params ->> 'name', params ->> 'category', params ->> 'sum', ''), ',' order by id) into kinds
    from public.push_outbox where user_id = '00000000-0000-4000-8000-00000000000c';
  if kinds <> 'found:Pusher,arrived:plumber,price:250000,done:' then raise exception 'FAIL: mijoz push ketma-ketligi: %', kinds; end if;
  if (select string_agg(kind, ',' order by id) from public.push_outbox where user_id = '00000000-0000-4000-8000-000000000001') <> 'offer,priceApproved' then
    raise exception 'FAIL: usta push: %', (select string_agg(kind, ',' order by id) from public.push_outbox where user_id = '00000000-0000-4000-8000-000000000001');
  end if;
  if (select url from public.push_outbox where kind = 'done') <> '/client/rate?id=00000000-0000-4000-8100-000000000001' then
    raise exception 'FAIL: done url';
  end if;
  raise notice 'PASS: mijozga — Usta topildi → yetib keldi → narx → Ish tugadi; ustaga — narx tasdiqlandi';
end $$;

-- ---------- Mijoz bekor qildi → ustaga ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng)
values ('00000000-0000-4000-8100-000000000002', '00000000-0000-4000-8000-00000000000c', 'plumber', 'tap', 'B', 41.31, 69.27);
reset role;
update public.orders set master_id = '00000000-0000-4000-8000-000000000001', status = 'on_the_way'
 where id = '00000000-0000-4000-8100-000000000002';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-00000000000c';
update public.orders set status = 'cancelled', cancel_reason = 'Boshqa usta topdim' where id = '00000000-0000-4000-8100-000000000002';
reset role;
-- Qidiruv natijasiz tugadi
update public.orders set dispatch = '{"done": "none"}'::jsonb where id = '00000000-0000-4000-8100-000000000002';
do $$ begin
  if not exists (select 1 from public.push_outbox where kind = 'cancelled' and user_id = '00000000-0000-4000-8000-000000000001') then
    raise exception 'FAIL: bekor qilinganda ustaga push yo''q';
  end if;
  if not exists (select 1 from public.push_outbox where kind = 'none' and user_id = '00000000-0000-4000-8000-00000000000c') then
    raise exception 'FAIL: "bo''sh usta yo''q" push yo''q';
  end if;
  raise notice 'PASS: mijoz bekor qilsa — ustaga, qidiruv natijasiz — mijozga xabar';
end $$;

-- ---------- push-send: olib qo'yish, natija, o'lik token ----------
set role service_role;
do $$ declare n int; m int; begin
  select count(*) into n from public.claim_push(100);
  select count(*) into m from public.claim_push(100);
  if n <> (select count(*) from public.push_outbox) or m <> 0 then
    raise exception 'FAIL: claim_push % / ikkinchi marta % (0 kutilgan)', n, m;
  end if;
  perform public.finish_push(
    (select array_agg(id) from public.push_outbox where user_id = '00000000-0000-4000-8000-00000000000c'),
    (select array_agg(id) from public.push_outbox where user_id = '00000000-0000-4000-8000-000000000001' and kind = 'cancelled'),
    'HTTP 500', array['ExponentPushToken[client]']);
  raise notice 'PASS: claim_push har xabarni bir marta beradi';
end $$;
reset role;
do $$ begin
  if exists (select 1 from public.push_outbox where user_id = '00000000-0000-4000-8000-00000000000c' and sent_at is null) then
    raise exception 'FAIL: yuborilganlar belgilanmadi';
  end if;
  if (select claimed_at from public.push_outbox where kind = 'cancelled') is not null then
    raise exception 'FAIL: xato bo''lgan xabar qayta urinishga qaytmadi';
  end if;
  if (select push_token from public.profiles where id = '00000000-0000-4000-8000-00000000000c') is not null then
    raise exception 'FAIL: o''lik token tozalanmadi';
  end if;
  raise notice 'PASS: finish_push — yuborilgan/qayta urinish/o''lik token tozalash';
end $$;
