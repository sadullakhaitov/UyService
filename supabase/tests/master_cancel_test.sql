-- UyService: usta bekor qilsa buyurtma keyingi ustaga o'tadi (migrations/…_master_cancel.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- C — mijoz (push tokeni bor), M — usta, X — boshqa usta
insert into auth.users (id, phone) values
  ('00000000-0000-4000-a500-00000000000c', '998907100001'),
  ('00000000-0000-4000-a500-000000000001', '998907100002'),
  ('00000000-0000-4000-a500-000000000002', '998907100003');
insert into public.masters (id, first_name, categories, billing_plan) values
  ('00000000-0000-4000-a500-000000000001', 'Bekor', '{plumber}', 'commission'),
  ('00000000-0000-4000-a500-000000000002', 'Boshqa', '{plumber}', 'commission');
update public.masters set verify_status = 'approved', balance = 100000, online = true, activity = 80
 where id in ('00000000-0000-4000-a500-000000000001', '00000000-0000-4000-a500-000000000002');
update public.profiles set push_token = 'ExponentPushToken[c]' where id = '00000000-0000-4000-a500-00000000000c';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-a500-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng) values
  ('00000000-0000-4000-a600-000000000001', '00000000-0000-4000-a500-00000000000c', 'plumber', 'tap', 'A', 41.31, 69.27),
  ('00000000-0000-4000-a600-000000000002', '00000000-0000-4000-a500-00000000000c', 'plumber', 'tap', 'B', 41.31, 69.27);
reset role;

-- Server ustani tayinladi (offer-respond): 1-buyurtma — usta yo'lda, 2-buyurtma — ish boshlangan
insert into public.offers (order_id, master_id, status, eta_min) values
  ('00000000-0000-4000-a600-000000000001', '00000000-0000-4000-a500-000000000001', 'accepted', 7),
  ('00000000-0000-4000-a600-000000000002', '00000000-0000-4000-a500-000000000001', 'accepted', 7);
update public.orders set master_id = '00000000-0000-4000-a500-000000000001', status = 'on_the_way',
       dispatch = '{"startedAt": 1, "radiusIdx": 1, "radiusAt": 1, "declined": ["00000000-0000-4000-a500-0000000000aa"], "offer": null, "done": "accepted", "events": []}'
 where id = '00000000-0000-4000-a600-000000000001';
update public.orders set master_id = '00000000-0000-4000-a500-000000000001', status = 'arrived'
 where id = '00000000-0000-4000-a600-000000000002';
update public.orders set door_verified_at = now(), price_work = 100000, price_status = 'proposed' where id = '00000000-0000-4000-a600-000000000002';
update public.orders set price_status = 'approved', status = 'in_progress' where id = '00000000-0000-4000-a600-000000000002';
update public.masters set busy = true where id = '00000000-0000-4000-a500-000000000001';

set role authenticated;
-- Begona usta va mijoz bekor qila olmaydi
set request.jwt.claim.sub = '00000000-0000-4000-a500-000000000002';
do $$ begin
  begin
    perform public.master_cancel_order('00000000-0000-4000-a600-000000000001', 'Mashina buzildi');
    raise exception 'FAIL: boshqa usta bekor qildi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: faqat tayinlangan usta bekor qila oladi';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-a500-000000000001';
do $$ begin
  begin
    perform public.master_cancel_order('00000000-0000-4000-a600-000000000001', '  ');
    raise exception 'FAIL: sababsiz bekor qilindi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.master_cancel_order('00000000-0000-4000-a600-000000000002', 'Kech qoldim');
    raise exception 'FAIL: ish boshlangandan keyin bekor qilindi';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: sababsiz va ish boshlangandan keyin bekor qilib bo''lmaydi';
end $$;

-- Haqiqiy bekor qilish
select public.master_cancel_order('00000000-0000-4000-a600-000000000001', 'Mashina buzildi');
reset role;

do $$ declare o public.orders; m public.masters; f public.offers; begin
  select * into o from public.orders where id = '00000000-0000-4000-a600-000000000001';
  select * into m from public.masters where id = '00000000-0000-4000-a500-000000000001';
  select * into f from public.offers where order_id = o.id and master_id = m.id;
  if o.status <> 'searching' or o.master_id is not null or o.fee_percent is not null or o.cancelled_by is not null then
    raise exception 'FAIL: buyurtma qidiruvga qaytmadi: %', row_to_json(o);
  end if;
  if o.dispatch ->> 'done' is not null or (o.dispatch ->> 'radiusIdx')::int <> 0
     or o.dispatch -> 'declined' <> '["00000000-0000-4000-a500-000000000001"]'::jsonb then
    raise exception 'FAIL: qidiruv holati: %', o.dispatch;
  end if;
  if m.busy or m.activity <> 70 then
    raise exception 'FAIL: usta busy=% activity=% (false, 70 kutilgan)', m.busy, m.activity;
  end if;
  if f.status <> 'cancelled' or f.cancel_reason <> 'Mashina buzildi' then
    raise exception 'FAIL: taklif: % %', f.status, f.cancel_reason;
  end if;
  if not exists (select 1 from public.push_outbox where user_id = o.client_id and kind = 'requeued' and url = '/client/searching?id=' || o.id) then
    raise exception 'FAIL: mijozga "Usta bekor qildi" push yo''q';
  end if;
  raise notice 'PASS: usta bekor qildi → buyurtma qidiruvda (eng kichik radiusdan, faqat shu ustasiz), usta bo''sh, aktivlik −10, sabab saqlandi, mijozga xabar';
end $$;

-- Usta endi bu buyurtmani ko'rmaydi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-a500-000000000001';
do $$ begin
  if exists (select 1 from public.orders where id = '00000000-0000-4000-a600-000000000001') then
    raise exception 'FAIL: bekor qilgan usta buyurtmani hali ko''radi';
  end if;
  raise notice 'PASS: bekor qilgan usta buyurtmani (va mijoz manzilini) endi ko''rmaydi';
end $$;
reset role;
