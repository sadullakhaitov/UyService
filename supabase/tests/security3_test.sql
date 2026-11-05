-- UyService: xavfsizlik tekshiruvi #3 (migrations/…_security_audit_3.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- V — raqam egasi (hali kirmagan), A — hujumchining o'z hisobi (avval kirgan), U — usta
insert into auth.users (id, phone, last_sign_in_at) values
  ('00000000-0000-4000-ae37-00000000000a', '998907910001', null),
  ('00000000-0000-4000-ae37-00000000000b', '998907910002', now()),
  ('00000000-0000-4000-ae37-00000000000c', '998907910003', now());

-- 1) Ekran orqali ochilgan raqam: egasi Telegram/SMS bilan kod olganda boshqa sessiyalar o'chadi
do $$ begin
  assert public.otp_screen_put('998907910001', '111111', '00000000-0000-4000-ae37-00000000000a'), 'yangi raqam — ekranda';
  assert exists (select 1 from public.otp_screen_claims where phone = '998907910001'), 'da''vo yozildi';
  -- hujumchi ekrandagi kod bilan kirdi — sessiyasi bor
  insert into auth.sessions (id, user_id) values ('00000000-0000-4000-ae37-0000000000f1', '00000000-0000-4000-ae37-00000000000a');
  insert into auth.refresh_tokens (token, user_id, session_id)
    values ('t1', '00000000-0000-4000-ae37-00000000000a', '00000000-0000-4000-ae37-0000000000f1');
  update auth.users set last_sign_in_at = now() where id = '00000000-0000-4000-ae37-00000000000a';
  -- endi ekranda qayta chiqmaydi
  assert not public.otp_screen_put('998907910001', '222222', '00000000-0000-4000-ae37-00000000000a'), 'kirgan hisob — ekranda emas';
  -- egasi botga raqamini ulashdi, kod Telegram'dan ketdi
  assert public.otp_owner_verified('+998 90 791 00 01'), 'egasi tasdiqlandi — sessiyalar o''chdi';
  assert not exists (select 1 from auth.sessions where user_id = '00000000-0000-4000-ae37-00000000000a'), 'begona sessiya qolmadi';
  assert not exists (select 1 from auth.refresh_tokens where user_id = '00000000-0000-4000-ae37-00000000000a'), 'refresh token qolmadi';
  assert not exists (select 1 from public.otp_screen_claims where phone = '998907910001'), 'da''vo bir martalik';
  -- keyingi kodlarda (da'vo yo'q) egasining o'z sessiyalariga tegilmaydi
  insert into auth.sessions (user_id) values ('00000000-0000-4000-ae37-00000000000a');
  assert not public.otp_owner_verified('998907910001'), 'da''vosiz raqam — hech narsa o''chmaydi';
  assert exists (select 1 from auth.sessions where user_id = '00000000-0000-4000-ae37-00000000000a'), 'egasining sessiyasi joyida';
  -- ekran orqali hech qachon ochilmagan raqam — sessiyalarga tegilmaydi
  insert into auth.sessions (user_id) values ('00000000-0000-4000-ae37-00000000000c');
  assert not public.otp_owner_verified('998907910003'), 'oddiy raqam — false';
  assert exists (select 1 from auth.sessions where user_id = '00000000-0000-4000-ae37-00000000000c'), 'usta sessiyasi joyida';
  raise notice 'PASS: raqamni oldindan egallagan begona egasi kirganda chiqarib yuboriladi';
end $$;

-- 2) Raqam almashtirish: kirgan hisob begona yangi raqamga ekrandan kod ololmaydi
do $$ begin
  assert not public.otp_screen_put('998907919999', '333333', '00000000-0000-4000-ae37-00000000000b'),
    'boshqa raqamli (kirgan) hisob — yangi raqamga ekranda kod yo''q';
  assert public.otp_screen_code('998907919999') is null, 'kod o''qilmaydi';
  assert public.otp_screen_put('998907918888', '444444'), 'foydalanuvchisiz (eski chaqiruv) — yangi raqamga ishlaydi';
  raise notice 'PASS: ekrandagi kod bilan hisobga begona raqamni yozib bo''lmaydi';
end $$;

-- otp_owner_verified ilovadan chaqirilmaydi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae37-00000000000b';
do $$ begin
  begin
    perform public.otp_owner_verified('998907910001');
    raise exception 'FAIL: oddiy foydalanuvchi otp_owner_verified chaqirdi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.otp_screen_claims;
    raise exception 'FAIL: otp_screen_claims o''qildi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: sessiyalarni o''chirish faqat serverda';
end $$;
reset role;

-- 3) Chegaralar: ism, manzil, sabab, sharh
insert into public.profiles (id, phone) values ('00000000-0000-4000-ae37-00000000000b', '+998907910002') on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae37-00000000000b';
do $$ begin
  begin
    update public.profiles set name = repeat('x', 5000) where id = auth.uid();
    raise exception 'FAIL: 5000 belgili ism yozildi';
  exception when check_violation then null;
  end;
  update public.profiles set name = 'Ali Valiyev' where id = auth.uid();
  begin
    insert into public.orders (client_id, category_id, address, lat, lng) values (auth.uid(), 'plumber', repeat('a', 10000), 41.3, 69.2);
    raise exception 'FAIL: 10000 belgili manzil yozildi';
  exception when check_violation then null;
  end;
  raise notice 'PASS: matn maydonlari cheklangan (bazani to''ldirib bo''lmaydi)';
end $$;

-- 4) Usta fayl yo'li — faqat o'z papkasi
reset role;
insert into public.profiles (id, phone) values ('00000000-0000-4000-ae37-00000000000c', '+998907910003') on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae37-00000000000c';
do $$ begin
  insert into public.masters (id, first_name, categories, billing_plan, photo_path, works)
  values (auth.uid(), 'Usta', '{plumber}', 'commission',
          '00000000-0000-4000-ae37-00000000000c/photo-1.jpg', '{00000000-0000-4000-ae37-00000000000c/work-1.jpg}');
  begin
    update public.masters set passport_path = '00000000-0000-4000-ac00-00000000000c/passport-1.jpg', doc_consent_at = now()
     where id = auth.uid();
    raise exception 'FAIL: boshqa odamning pasport yo''li yozildi';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.masters set works = works || '00000000-0000-4000-ae37-00000000000c/../x/work.jpg'::text where id = auth.uid();
    raise exception 'FAIL: ".." yo''li yozildi';
  exception when insufficient_privilege then null;
  end;
  update public.masters set passport_path = '00000000-0000-4000-ae37-00000000000c/passport-2.jpg', doc_consent_at = now()
   where id = auth.uid();
  update public.masters set first_name = 'Usta aka' where id = auth.uid(); -- boshqa ustunlar erkin
  raise notice 'PASS: usta faqat o''z papkasidagi faylni yoza oladi';
end $$;
reset role;

-- 5) Fayl yuklash: sutkasiga 40 tadan ortiq emas
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae37-00000000000c';
do $$ declare i int; begin
  for i in 1..40 loop
    insert into storage.objects (bucket_id, name) values ('works', '00000000-0000-4000-ae37-00000000000c/w-' || i || '.jpg');
  end loop;
  begin
    insert into storage.objects (bucket_id, name) values ('works', '00000000-0000-4000-ae37-00000000000c/w-41.jpg');
    raise exception 'FAIL: 41-fayl yuklandi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: bitta hisob Storage''ni cheksiz to''ldira olmaydi (sutkasiga 40 fayl)';
end $$;
reset role;
