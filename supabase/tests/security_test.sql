-- UyService: xavfsizlik tekshiruvida topilgan teshiklar yopilganini tekshirish (migrations/…_security_hardening.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- C — mijoz, M — usta (komissiya, balans bor), X — begona mijoz
insert into auth.users (id, phone) values
  ('00000000-0000-4000-ae00-00000000000c', '998907300001'),
  ('00000000-0000-4000-ae00-000000000001', '998907300002'),
  ('00000000-0000-4000-ae00-00000000000d', '998907300003');
insert into public.masters (id, first_name, categories, billing_plan) values
  ('00000000-0000-4000-ae00-000000000001', 'Xavfsiz', '{plumber}', 'commission');
update public.masters set verify_status = 'approved', balance = 100000, online = true
 where id = '00000000-0000-4000-ae00-000000000001';
update public.profiles set push_token = 'ExponentPushToken[sec]', telegram_id = 777000111
 where id = '00000000-0000-4000-ae00-00000000000c';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae00-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, apartment, lat, lng) values
  ('00000000-0000-4000-af00-000000000001', '00000000-0000-4000-ae00-00000000000c', 'plumber', 'tap', 'Aniq uy 12', '45', 41.311081, 69.279737);

-- 7) begona rasm yo'li va 8) juda uzun tavsif, faol bo'lmagan kategoriya
do $$ begin
  begin
    insert into public.orders (client_id, category_id, address, lat, lng, photos)
    values ('00000000-0000-4000-ae00-00000000000c', 'plumber', 'A', 41.31, 69.27, array['00000000-0000-4000-ae00-00000000000d/x.jpg']);
    raise exception 'FAIL: buyurtmaga begona rasm yo''li yozildi';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.orders (client_id, category_id, address, lat, lng, description)
    values ('00000000-0000-4000-ae00-00000000000c', 'plumber', 'A', 41.31, 69.27, repeat('x', 2001));
    raise exception 'FAIL: 2000 belgidan uzun tavsif yozildi';
  exception when check_violation then null;
  end;
  raise notice 'PASS: buyurtmada faqat o''z rasmlari, tavsif ≤ 2000 belgi';
end $$;
reset role;
update public.categories set active = false where id = 'electrician';
set role authenticated;
do $$ begin
  begin
    insert into public.orders (client_id, category_id, address, lat, lng)
    values ('00000000-0000-4000-ae00-00000000000c', 'electrician', 'A', 41.31, 69.27);
    raise exception 'FAIL: o''chirilgan kategoriyaga buyurtma berildi';
  exception when check_violation then null;
  end;
  raise notice 'PASS: o''chirilgan kategoriyaga buyurtma berilmaydi';
end $$;
reset role;
update public.categories set active = true where id = 'electrician';

-- 6) taklif: usta qabul qilguncha aniq manzil va xonadon yopiq
insert into public.offers (order_id, master_id, status, eta_min) values
  ('00000000-0000-4000-af00-000000000001', '00000000-0000-4000-ae00-000000000001', 'sent', 6);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae00-000000000001';
do $$ declare v record; begin
  if exists (select 1 from public.orders where id = '00000000-0000-4000-af00-000000000001') then
    raise exception 'FAIL: usta qabul qilmasdan aniq manzilni ko''rdi';
  end if;
  select * into v from public.offer_preview('00000000-0000-4000-af00-000000000001');
  if v.id is null or v.category_id <> 'plumber' or v.lat <> 41.311 or v.lng <> 69.280 then
    raise exception 'FAIL: offer_preview: %', row_to_json(v);
  end if;
  raise notice 'PASS: taklifda faqat kategoriya, muammo va taxminiy joy (~150 m)';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ae00-00000000000d';
do $$ begin
  if exists (select 1 from public.offer_preview('00000000-0000-4000-af00-000000000001')) then
    raise exception 'FAIL: begona odam taklifni ko''rdi';
  end if;
  raise notice 'PASS: offer_preview — faqat taklif olgan ustaga';
end $$;

-- 1) usta taklif kelgach tarifni obunaga (faol obunasiz) almashtirib, ulushsiz qabul qila olmaydi
set request.jwt.claim.sub = '00000000-0000-4000-ae00-000000000001';
update public.masters set billing_plan = 'subscription' where id = '00000000-0000-4000-ae00-000000000001';
reset role;
do $$ begin
  begin
    update public.orders set master_id = '00000000-0000-4000-ae00-000000000001', status = 'on_the_way'
     where id = '00000000-0000-4000-af00-000000000001';
    raise exception 'FAIL: obunasi yo''q usta ulushsiz (0%%) qabul qildi';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  raise notice 'PASS: tayinlashda usta buyurtma olishi mumkinligi qayta tekshiriladi (tarif almashtirish hiylasi)';
end $$;
update public.masters set billing_plan = 'commission' where id = '00000000-0000-4000-ae00-000000000001';
update public.offers set status = 'accepted' where order_id = '00000000-0000-4000-af00-000000000001';
update public.orders set master_id = '00000000-0000-4000-ae00-000000000001', status = 'on_the_way'
 where id = '00000000-0000-4000-af00-000000000001';
do $$ begin
  if (select fee_percent from public.orders where id = '00000000-0000-4000-af00-000000000001') <> 10 then
    raise exception 'FAIL: ulush foizi qotirilmadi';
  end if;
  raise notice 'PASS: qabul qilinganda ulush 10%% qotirildi';
end $$;

-- 5) qarshi tomon profilning ism/telefonini ko'radi, push_token va telegram_id — yo'q
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae00-000000000001';
do $$ begin
  if (select phone from public.profiles where id = '00000000-0000-4000-ae00-00000000000c') is null then
    raise exception 'FAIL: tayinlangan usta mijoz telefonini ko''rmadi';
  end if;
  begin
    perform push_token from public.profiles where id = '00000000-0000-4000-ae00-00000000000c';
    raise exception 'FAIL: usta mijozning push_token''ini o''qidi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform telegram_id from public.profiles where id = '00000000-0000-4000-ae00-00000000000c';
    raise exception 'FAIL: usta mijozning telegram_id''sini o''qidi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: qarshi tomonga faqat ism va telefon (push_token, telegram_id yopiq)';
end $$;

-- 3) sabab faqat bekor qilish bilan birga; client_absent — faqat server
set request.jwt.claim.sub = '00000000-0000-4000-ae00-000000000001';
do $$ begin
  begin
    update public.orders set cancel_reason = 'client_absent' where id = '00000000-0000-4000-af00-000000000001';
    raise exception 'FAIL: usta bekor qilmasdan sababni yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: sabab bekor qilishsiz yozilmaydi';
end $$;
update public.orders set status = 'arrived' where id = '00000000-0000-4000-af00-000000000001';
do $$ begin
  begin
    update public.orders set status = 'cancelled', cancel_reason = 'client_absent' where id = '00000000-0000-4000-af00-000000000001';
    raise exception 'FAIL: usta o''zi "client_absent" deb yozdi (mijozni bloklash)';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: "client_absent"ni faqat server yozadi';
end $$;

-- 2) yetib kelgandan keyin: eshik kodi kiritilgan bo'lsa — "eshikni ochmadi" deyib bo'lmaydi
reset role;
do $$ begin
  if (select arrived_at from public.orders where id = '00000000-0000-4000-af00-000000000001') is null then
    raise exception 'FAIL: arrived_at yozilmadi';
  end if;
end $$;
update public.orders set arrived_at = now() - interval '20 minutes', door_verified_at = now()
 where id = '00000000-0000-4000-af00-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae00-000000000001';
do $$ begin
  begin
    perform public.master_client_absent('00000000-0000-4000-af00-000000000001');
    raise exception 'FAIL: kod kiritilgandan keyin "eshikni ochmadi" o''tdi';
  exception when invalid_parameter_value then
    if sqlerrm not like '%door_opened%' then raise; end if;
  end;
  raise notice 'PASS: eshik kodi kiritilgan bo''lsa "eshikni ochmadi" yo''q';
end $$;

-- 4) foydalanuvchi o'zini "o'chirilgan" qilib admin ro'yxatidan yashira olmaydi
set request.jwt.claim.sub = '00000000-0000-4000-ae00-00000000000d';
do $$ begin
  begin
    update public.profiles set deleted_at = now() where id = '00000000-0000-4000-ae00-00000000000d';
    raise exception 'FAIL: foydalanuvchi deleted_at''ni o''zi yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: profiles.deleted_at — faqat server';
end $$;
reset role;
