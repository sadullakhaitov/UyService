-- UyService: admin panel funksiyalari sinovi (lokal Postgres + supabase_stub.sql + migrations/*.sql + seed.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- AD — admin, U — oddiy mijoz, M — usta (pending), seed ustasi 101 — tasdiqlangan
insert into auth.users (id, phone) values
  ('00000000-0000-4000-d000-0000000000ad', '998907000001'),
  ('00000000-0000-4000-d000-00000000000c', '998907000002'),
  ('00000000-0000-4000-d000-000000000001', '998907000003');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-d000-0000000000ad';
insert into public.masters (id, first_name, last_name, categories, verify_status, billing_plan, passport_path)
values ('00000000-0000-4000-d000-000000000001', 'Test', 'Usta', '{plumber}', 'pending', 'commission', '00000000-0000-4000-d000-000000000001/passport.jpg');

-- ---------- Ruxsatlar ----------
set role anon;
do $$ begin
  begin
    perform public.admin_stats(7);
    raise exception 'FAIL: mehmon admin_stats chaqirdi';
  exception when insufficient_privilege then raise notice 'PASS: mehmon admin funksiyalarini chaqira olmaydi';
  end;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-d000-00000000000c';
do $$ declare n int; begin
  begin
    perform public.admin_set_verify('00000000-0000-4000-d000-000000000001', 'approved');
    raise exception 'FAIL: oddiy foydalanuvchi ustani tasdiqladi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_adjust_balance('00000000-0000-4000-d000-000000000001', 100000, 'topup');
    raise exception 'FAIL: oddiy foydalanuvchi balans qo''shdi';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set blocked_at = null, blocked_reason = 'x' where id = '00000000-0000-4000-d000-00000000000c';
    raise exception 'FAIL: foydalanuvchi o''zining blok ustunini o''zgartirdi';
  exception when insufficient_privilege then null;
  end;
  select count(*) into n from public.admin_masters;
  if n <> 0 then raise exception 'FAIL: oddiy foydalanuvchi admin_masters ko''rdi (%)', n; end if;
  select count(*) into n from public.admin_log_view;
  if n <> 0 then raise exception 'FAIL: oddiy foydalanuvchi jurnalni ko''rdi'; end if;
  raise notice 'PASS: oddiy foydalanuvchi admin amallarini bajara olmaydi, admin ro''yxatlari unga bo''sh';
end $$;

-- ---------- Admin ----------
set request.jwt.claim.sub = '00000000-0000-4000-d000-0000000000ad';
do $$ declare m public.masters; n int; begin
  select count(*) into n from public.admin_masters;
  if n < 4 then raise exception 'FAIL: admin ustalarni ko''rmadi (%)', n; end if;

  begin
    perform public.admin_set_verify('00000000-0000-4000-d000-000000000001', 'rejected', '   ');
    raise exception 'FAIL: sababsiz rad etildi';
  exception when invalid_parameter_value then null;
  end;
  perform public.admin_set_verify('00000000-0000-4000-d000-000000000001', 'rejected', 'Pasport rasmi xira');
  select * into m from public.masters where id = '00000000-0000-4000-d000-000000000001';
  if m.verify_status <> 'rejected' or m.verify_note <> 'Pasport rasmi xira' then raise exception 'FAIL: rad etilmadi'; end if;
  perform public.admin_set_verify('00000000-0000-4000-d000-000000000001', 'approved');
  select * into m from public.masters where id = '00000000-0000-4000-d000-000000000001';
  if m.verify_status <> 'approved' or m.verify_note is not null then raise exception 'FAIL: tasdiqlanmadi'; end if;
  if public.master_fee_percent(m) <> 10 then raise exception 'FAIL: tasdiqlangach ulush 10%% emas'; end if;
  select count(*) into n from public.admin_log where target_id = '00000000-0000-4000-d000-000000000001' and action = 'verify';
  if n <> 2 then raise exception 'FAIL: jurnalga yozilmadi (%)', n; end if;
  raise notice 'PASS: tasdiqlash / rad etish (sabab majburiy), jurnalga yoziladi';
end $$;

do $$ declare b int; n int; begin
  b := public.admin_adjust_balance('00000000-0000-4000-d000-000000000001', 50000, 'topup', 'Naqd to''lov');
  if b <> 50000 then raise exception 'FAIL: balans %', b; end if;
  begin
    perform public.admin_adjust_balance('00000000-0000-4000-d000-000000000001', -10000, 'topup');
    raise exception 'FAIL: "to''ldirish" bilan yechildi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_adjust_balance('00000000-0000-4000-d000-000000000001', -10000, 'adjust');
    raise exception 'FAIL: sababsiz tuzatish';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_adjust_balance('00000000-0000-4000-d000-000000000001', 20000000, 'topup');
    raise exception 'FAIL: juda katta summa';
  exception when invalid_parameter_value then null;
  end;
  b := public.admin_adjust_balance('00000000-0000-4000-d000-000000000001', -10000, 'adjust', 'Xato kiritilgan');
  select count(*) into n from public.balance_ops where master_id = '00000000-0000-4000-d000-000000000001';
  if b <> 40000 or n <> 2 then raise exception 'FAIL: balans %, amallar %', b, n; end if;
  raise notice 'PASS: balans to''ldirish/tuzatish chegaralangan, balance_ops tarixiga yoziladi';
end $$;

do $$ declare u timestamptz; u2 timestamptz; begin
  u := public.admin_add_subscription('00000000-0000-4000-d000-000000000001', 30, 149000);
  if u < now() + interval '29 days' or u > now() + interval '31 days' then raise exception 'FAIL: obuna muddati %', u; end if;
  u2 := public.admin_add_subscription('00000000-0000-4000-d000-000000000001', 30, 149000);
  if u2 < u + interval '29 days' then raise exception 'FAIL: obuna ustiga qo''shilmadi'; end if;
  begin
    perform public.admin_add_subscription('00000000-0000-4000-d000-000000000001', 0, 149000);
    raise exception 'FAIL: 0 kun';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_set_priority('00000000-0000-4000-d000-000000000001', 60);
    raise exception 'FAIL: prioritet 60';
  exception when invalid_parameter_value then null;
  end;
  perform public.admin_set_priority('00000000-0000-4000-d000-000000000001', 20);
  if (select priority_points from public.masters where id = '00000000-0000-4000-d000-000000000001') <> 20 then
    raise exception 'FAIL: prioritet';
  end if;
  raise notice 'PASS: obuna muddati uzayadi (ustiga qo''shiladi), prioritet −50…+50';
end $$;

-- Bloklash: seed ustasi 101 — onlayn, Toshkent markazida
do $$ declare n int; begin
  begin
    perform public.admin_set_blocked('00000000-0000-4000-d000-0000000000ad', true, 'test');
    raise exception 'FAIL: admin o''zini blokladi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_blocked('00000000-0000-4000-a000-000000000101', true, '');
    raise exception 'FAIL: sababsiz bloklandi';
  exception when invalid_parameter_value then null;
  end;
  perform public.admin_set_blocked('00000000-0000-4000-a000-000000000101', true, 'Shikoyatlar');
  perform public.admin_set_blocked('00000000-0000-4000-d000-00000000000c', true, 'Soxta buyurtmalar');
  if (select online from public.masters where id = '00000000-0000-4000-a000-000000000101') then
    raise exception 'FAIL: bloklangan usta onlayn qoldi';
  end if;
  select count(*) into n from public.admin_log where action = 'block';
  if n <> 2 then raise exception 'FAIL: blok jurnali %', n; end if;
end $$;
reset role;
update public.masters set online = true where id = '00000000-0000-4000-a000-000000000101';
update public.master_locations set updated_at = now() where master_id = '00000000-0000-4000-a000-000000000101';
do $$ declare n int; begin
  select count(*) into n from public.nearby_masters(41.3165, 69.2790, 3, 'plumber') where id = '00000000-0000-4000-a000-000000000101';
  if n <> 0 then raise exception 'FAIL: bloklangan usta taklif oladi'; end if;
  select count(*) into n from public.nearby_masters(41.3165, 69.2790, 10, 'aircon');
  if n < 1 then raise exception 'FAIL: boshqa ustalar ham yo''qoldi'; end if;
  raise notice 'PASS: bloklangan usta onlayn bo''lsa ham taklif olmaydi';
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-d000-00000000000c';
do $$ begin
  begin
    insert into public.orders (client_id, category_id, problem_id, address, lat, lng)
    values ('00000000-0000-4000-d000-00000000000c', 'plumber', 'tap', 'X', 41.31, 69.27);
    raise exception 'FAIL: bloklangan mijoz buyurtma berdi';
  exception when insufficient_privilege then raise notice 'PASS: bloklangan mijoz buyurtma bera olmaydi';
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-d000-0000000000ad';
do $$ begin
  perform public.admin_set_blocked('00000000-0000-4000-d000-00000000000c', false);
  perform public.admin_set_blocked('00000000-0000-4000-a000-000000000101', false);
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-d000-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng)
values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-00000000000c', 'plumber', 'tap', 'Chilonzor', 41.31, 69.27);
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng)
values ('00000000-0000-4000-e000-000000000002', '00000000-0000-4000-d000-00000000000c', 'plumber', 'tap', 'Yunusobod', 41.36, 69.28);
reset role;

-- Buyurtma 1 — usta tayinlanadi va bajariladi (server: Edge Function), keyin mijoz baho beradi
update public.orders set master_id = '00000000-0000-4000-d000-000000000001', status = 'assigned' where id = '00000000-0000-4000-e000-000000000001';
update public.masters set busy = true where id = '00000000-0000-4000-d000-000000000001';
update public.orders set price_work = 150000, status = 'completed' where id = '00000000-0000-4000-e000-000000000001';
do $$ declare o public.orders; b int; n int; begin
  select * into o from public.orders where id = '00000000-0000-4000-e000-000000000001';
  -- tasdiqlangan, komissiya 10%: 150 000 (chaqiruv ichida) × 10% = 15 000
  if o.platform_fee <> 15000 then raise exception 'FAIL: platform_fee %', o.platform_fee; end if;
  select balance into b from public.masters where id = '00000000-0000-4000-d000-000000000001';
  select count(*) into n from public.balance_ops where order_id = o.id and kind = 'fee' and amount = -15000 and balance_after = b;
  if b <> 25000 or n <> 1 then raise exception 'FAIL: ulush balansdan yechilmadi / tarixga yozilmadi (balans %, %)', b, n; end if;
  raise notice 'PASS: ish tugadi — ulush (chaqiruv ish narxi ichida) balansdan yechiladi va balance_ops''ga yoziladi';
end $$;
insert into public.reviews (id, order_id, client_id, master_id, stars, comment)
values ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-00000000000c',
        '00000000-0000-4000-d000-000000000001', 1, 'Haqorat');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-d000-0000000000ad';
do $$ declare o public.orders; r numeric; n int; begin
  begin
    perform public.admin_cancel_order('00000000-0000-4000-e000-000000000001', 'Test');
    raise exception 'FAIL: bajarilgan buyurtma bekor qilindi';
  exception when invalid_parameter_value then null;
  end;
  perform public.admin_cancel_order('00000000-0000-4000-e000-000000000002', 'Mijoz qo''ng''iroq qilib so''radi');
  select * into o from public.orders where id = '00000000-0000-4000-e000-000000000002';
  if o.status <> 'cancelled' or o.cancelled_by <> 'admin' then raise exception 'FAIL: bekor qilinmadi: % %', o.status, o.cancelled_by; end if;

  select rating into r from public.masters where id = '00000000-0000-4000-d000-000000000001';
  if r <> 1 then raise exception 'FAIL: reyting % (1 kutilgan)', r; end if;
  perform public.admin_delete_review('00000000-0000-4000-f000-000000000001', 'Haqoratli sharh');
  select rating into r from public.masters where id = '00000000-0000-4000-d000-000000000001';
  if r <> 5 then raise exception 'FAIL: sharh o''chgach reyting % (5 kutilgan)', r; end if;
  select count(*) into n from public.admin_orders where id in ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-e000-000000000002');
  if n <> 2 then raise exception 'FAIL: admin_orders %', n; end if;
  if (select total from public.admin_orders where id = '00000000-0000-4000-e000-000000000001') <> 150000 then
    raise exception 'FAIL: admin_orders.total';
  end if;
  raise notice 'PASS: buyurtmani bekor qilish (cancelled_by=admin), sharhni o''chirish reytingni qayta hisoblaydi';
end $$;

do $$ declare s jsonb; begin
  s := public.admin_stats(30);
  if (s -> 'period' ->> 'orders')::int < 2 or (s -> 'period' ->> 'completed')::int < 1
     or (s -> 'period' ->> 'revenue')::int < 15000 or jsonb_array_length(s -> 'daily') < 30
     or (s -> 'live' ->> 'pending') is null or jsonb_array_length(s -> 'top_masters') < 1 then
    raise exception 'FAIL: admin_stats %', s;
  end if;
  raise notice 'PASS: admin_stats — davr, jonli holat, kunlar, kategoriyalar, top ustalar';
end $$;

do $$ declare n int; begin
  begin
    perform public.admin_update_category('plumber', -5, true);
    raise exception 'FAIL: manfiy chaqiruv narxi';
  exception when invalid_parameter_value then null;
  end;
  perform public.admin_update_category('plumber', 60000, true);
  if (select call_fee from public.categories where id = 'plumber') <> 60000 then raise exception 'FAIL: call_fee'; end if;
  perform public.admin_update_category('plumber', 50000, true);
  begin
    perform public.admin_update_problem('tap', 200000, 100000);
    raise exception 'FAIL: min > max';
  exception when invalid_parameter_value then null;
  end;
  perform public.admin_update_problem('tap', 60000, 130000);
  perform public.admin_update_problem('paint', null, null);
  raise notice 'PASS: katalog (chaqiruv narxi, narx oralig''i) tekshiruv bilan o''zgaradi';

  perform public.admin_support_reply('00000000-0000-4000-d000-00000000000c', 'Assalomu alaykum, qanday yordam bera olamiz?');
  begin
    perform public.admin_support_reply('00000000-0000-4000-d000-00000000000c', '   ');
    raise exception 'FAIL: bo''sh xabar';
  exception when invalid_parameter_value then null;
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-d000-00000000000c';
insert into public.chat_messages (support_user_id, sender_id, text)
values ('00000000-0000-4000-d000-00000000000c', '00000000-0000-4000-d000-00000000000c', 'Usta kelmadi');
set request.jwt.claim.sub = '00000000-0000-4000-d000-0000000000ad';
do $$ declare w boolean; n int; begin
  select waiting, messages into w, n from public.admin_support_threads() where user_id = '00000000-0000-4000-d000-00000000000c';
  if not w or n <> 2 then raise exception 'FAIL: support threads waiting=% n=%', w, n; end if;
  raise notice 'PASS: qo''llab-quvvatlash — javob kutayotgan suhbatlar ko''rinadi';

  begin
    perform public.admin_set_role('+998 90 700 00 01', false);
    raise exception 'FAIL: admin o''zini olib tashladi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_set_role('+998 99 999 99 99', true);
    raise exception 'FAIL: ro''yxatdan o''tmagan raqam';
  exception when no_data_found then null;
  end;
  perform public.admin_set_role('+998 90 700 00 02', true);
  if (select role from public.profiles where id = '00000000-0000-4000-d000-00000000000c') <> 'admin' then raise exception 'FAIL: admin tayinlanmadi'; end if;
  perform public.admin_set_role('998907000002', false);
  if (select role from public.profiles where id = '00000000-0000-4000-d000-00000000000c') <> 'client' then raise exception 'FAIL: admin olib tashlanmadi'; end if;
  select count(*) into n from public.admin_log_view;
  if n < 10 then raise exception 'FAIL: jurnal %', n; end if;
  begin
    delete from public.admin_log;
    select count(*) into n from public.admin_log;
    if n < 10 then raise exception 'FAIL: admin jurnalni o''chirdi'; end if;
  end;
  raise notice 'PASS: adminlar raqam bo''yicha tayinlanadi/olinadi (o''zini emas), jurnalni o''chirib bo''lmaydi';
end $$;
reset role;

do $$ begin raise notice 'ALL ADMIN TESTS PASSED'; end $$;
