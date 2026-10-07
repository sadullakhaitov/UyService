-- UyService: narx kelishuvi va eshik kodi sinovi (migrations/…_price_agreement.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- C — mijoz, M — tasdiqlangan usta (komissiya 10%), X — begona foydalanuvchi
insert into auth.users (id, phone) values
  ('00000000-0000-4000-9000-00000000000c', '998908000001'),
  ('00000000-0000-4000-9000-000000000001', '998908000002'),
  ('00000000-0000-4000-9000-00000000000f', '998908000003');
insert into public.masters (id, first_name, categories, billing_plan)
values ('00000000-0000-4000-9000-000000000001', 'Narx', '{plumber}', 'commission');
update public.masters set verify_status = 'approved', balance = 100000, online = true
 where id = '00000000-0000-4000-9000-000000000001';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-9000-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng) values
  ('00000000-0000-4000-9100-000000000001', '00000000-0000-4000-9000-00000000000c', 'plumber', 'tap', 'A', 41.31, 69.27),
  ('00000000-0000-4000-9100-000000000002', '00000000-0000-4000-9000-00000000000c', 'plumber', 'tap', 'B', 41.31, 69.27),
  ('00000000-0000-4000-9100-000000000003', '00000000-0000-4000-9000-00000000000c', 'plumber', 'tap', 'C', 41.31, 69.27);
do $$ begin
  if (select count(*) from public.order_secrets) <> 3
     or exists (select 1 from public.order_secrets where door_code !~ '^[1-9][0-9]{3}$') then
    raise exception 'FAIL: mijoz o''z buyurtmalarining eshik kodini ko''rmadi';
  end if;
  begin
    update public.order_secrets set door_code = '1111';
    if exists (select 1 from public.order_secrets where door_code = '1111') then
      raise exception 'FAIL: mijoz eshik kodini o''zgartirdi';
    end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: yangi buyurtmada 4 xonali eshik kodi, faqat mijozga ko''rinadi, o''zgartirib bo''lmaydi';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-9000-00000000000f';
do $$ begin
  if exists (select 1 from public.order_secrets) or public.order_door_code('00000000-0000-4000-9100-000000000001') is not null then
    raise exception 'FAIL: begona eshik kodini ko''rdi';
  end if;
  raise notice 'PASS: begona foydalanuvchi eshik kodini ko''rmaydi';
end $$;
reset role;

-- Server ustani tayinlaydi (offer-respond). Ulush foizi shu payt qotiriladi: tasdiqlangan → 10%
update public.orders set master_id = '00000000-0000-4000-9000-000000000001', status = 'arrived'
 where id in ('00000000-0000-4000-9100-000000000001', '00000000-0000-4000-9100-000000000002', '00000000-0000-4000-9100-000000000003');
do $$ begin
  if exists (select 1 from public.orders where client_id = '00000000-0000-4000-9000-00000000000c' and fee_percent is distinct from 10) then
    raise exception 'FAIL: fee_percent qabul paytida qotirilmadi';
  end if;
  raise notice 'PASS: ulush foizi usta tayinlanganda qotiriladi (10%%)';
end $$;
-- Keyin usta hujjatsiz bo'lib qoldi (15%) — qabul qilingan buyurtmalarga ta'sir qilmasligi kerak
update public.masters set verify_status = 'none' where id = '00000000-0000-4000-9000-000000000001';

-- ---------- 1) Mijoz narxga rozi emas → faqat chaqiruv (ko'rik) ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-9000-00000000000c';
select public.order_door_code('00000000-0000-4000-9100-000000000001') as code1 \gset
set request.jwt.claim.sub = '00000000-0000-4000-9000-000000000001';
select public.verify_door_code('00000000-0000-4000-9100-000000000001', :'code1') as ok1 \gset
do $$ begin
  begin
    perform public.propose_price('00000000-0000-4000-9100-000000000001', 20000000, 0);
    raise exception 'FAIL: 10 mln dan qimmat narx qabul qilindi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.propose_price('00000000-0000-4000-9100-000000000001', 100000, -1);
    raise exception 'FAIL: manfiy qism narxi qabul qilindi';
  exception when invalid_parameter_value then null;
  end;
  perform public.propose_price('00000000-0000-4000-9100-000000000001', 300000, 50000);
  begin
    perform public.respond_price('00000000-0000-4000-9100-000000000001', true);
    raise exception 'FAIL: usta mijoz o''rniga narxni tasdiqladi';
  exception when insufficient_privilege then null;
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-9000-00000000000c';
do $$ begin
  perform public.respond_price('00000000-0000-4000-9100-000000000001', false);
  begin
    perform public.respond_price('00000000-0000-4000-9100-000000000001', true);
    raise exception 'FAIL: rad etilgan narxni qayta tasdiqlab bo''ldi';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
do $$ declare o public.orders; begin
  select * into o from public.orders where id = '00000000-0000-4000-9100-000000000001';
  -- 50 000 × 10% = 5 000 (hujjat keyin yo'qolgan bo'lsa ham — qabul paytidagi 10%)
  if o.status <> 'completed' or o.price_status <> 'declined' or public.order_total(o) <> 50000 or o.platform_fee <> 5000 then
    raise exception 'FAIL: rad etish: status=% price=% total=% fee=%', o.status, o.price_status, public.order_total(o), o.platform_fee;
  end if;
  raise notice 'PASS: mijoz rozi emas — buyurtma yopiladi, faqat chaqiruv 50 000, ulush qabul paytidagi 10%% (5 000)';
end $$;

-- ---------- 2) Usta "Faqat ko'rik" ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-9000-000000000001';
do $$ begin
  begin
    update public.orders set status = 'completed' where id = '00000000-0000-4000-9100-000000000002';
    raise exception 'FAIL: usta eshik kodisiz ko''rikni yopdi';
  exception when insufficient_privilege then null;
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-9000-00000000000c';
select public.order_door_code('00000000-0000-4000-9100-000000000002') as code2 \gset
set request.jwt.claim.sub = '00000000-0000-4000-9000-000000000001';
select public.verify_door_code('00000000-0000-4000-9100-000000000002', :'code2') as ok2 \gset
update public.orders set status = 'completed' where id = '00000000-0000-4000-9100-000000000002';
reset role;
do $$ declare o public.orders; begin
  select * into o from public.orders where id = '00000000-0000-4000-9100-000000000002';
  if o.status <> 'completed' or o.price_status <> 'none' or public.order_total(o) <> 50000 or o.platform_fee <> 5000 then
    raise exception 'FAIL: faqat ko''rik: status=% total=% fee=%', o.status, public.order_total(o), o.platform_fee;
  end if;
  raise notice 'PASS: "Faqat ko''rik" — eshik kodi tasdiqlangach, chaqiruv narxi bilan yopiladi';
end $$;

-- ---------- 3) Kodni taxmin qilish — 5 xatodan keyin 10 daqiqa kutish ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-9000-000000000001';
do $$ declare i int; c text; begin
  for i in 1..5 loop
    -- har safar to'g'ri bo'lmagan kod (mijoz kodini bilmaymiz — 4 xonali emas)
    if public.verify_door_code('00000000-0000-4000-9100-000000000003', '00' || i) then
      raise exception 'FAIL: noto''g''ri kod qabul qilindi';
    end if;
  end loop;
  begin
    perform public.verify_door_code('00000000-0000-4000-9100-000000000003', '1234');
    raise exception 'FAIL: 5 xatodan keyin ham kod tekshirildi';
  exception when program_limit_exceeded then null;
  end;
  raise notice 'PASS: 5 marta xato koddan keyin tekshirish vaqtincha yopiladi';
end $$;
reset role;

-- Hammasi tugadi: balans 100 000 − 5 000 − 5 000
do $$ declare b int; n int; begin
  select balance into b from public.masters where id = '00000000-0000-4000-9000-000000000001';
  select count(*) into n from public.balance_ops where master_id = '00000000-0000-4000-9000-000000000001' and kind = 'fee';
  if b <> 90000 or n <> 2 then raise exception 'FAIL: balans % (90000), ulush yozuvlari % (2)', b, n; end if;
  raise notice 'PASS: ulushlar balansdan yechildi va balance_ops''ga yozildi';
end $$;
