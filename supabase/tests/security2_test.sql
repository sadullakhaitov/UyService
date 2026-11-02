-- UyService: xavfsizlik tekshiruvi #2 (migrations/…_security_audit_2.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- N — yangi raqam (hech qachon kirmagan), O — avval kirgan, M — usta, C — buyurtmasi bor mijoz
insert into auth.users (id, phone, last_sign_in_at) values
  ('00000000-0000-4000-ac00-00000000000a', '998907900001', null),
  ('00000000-0000-4000-ac00-00000000000b', '998907900002', now()),
  ('00000000-0000-4000-ac00-00000000000c', '998907900003', null),
  ('00000000-0000-4000-ac00-00000000000d', '998907900004', null);
insert into public.masters (id, first_name, categories, billing_plan) values
  ('00000000-0000-4000-ac00-00000000000c', 'Usta', '{plumber}', 'commission');
insert into public.orders (client_id, category_id, address, lat, lng) values
  ('00000000-0000-4000-ac00-00000000000d', 'plumber', 'Uy', 41.31, 69.27);

do $$ begin
  assert public.otp_screen_put('998907900001', '123456'), 'yangi raqam — ekranda';
  assert public.otp_screen_code('+998 90 790 00 01') = '123456', 'yangi raqam kodi o''qiladi';
  assert not public.otp_screen_put('998907900002', '123456'), 'avval kirgan — ekranda emas';
  assert not public.otp_screen_put('998907900003', '123456'), 'usta — ekranda emas';
  assert not public.otp_screen_put('+998907900004', '123456'), 'buyurtmasi bor mijoz — ekranda emas';
  assert public.otp_screen_code('998907900002') is null and public.otp_screen_code('998907900003') is null
     and public.otp_screen_code('998907900004') is null, 'ularning kodi o''qilmaydi';
  assert not public.otp_screen_put('12345', '123456') and not public.otp_screen_put('998907900009', 'abc'),
    'noto''g''ri raqam/kod yozilmaydi';
  raise notice 'PASS: ekrandagi kod faqat yangi raqamga (avval kirgan, usta, mijoz hisobini olib bo''lmaydi)';
end $$;

-- Chat: daqiqasiga 20 tadan ortiq xabar yozilmaydi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ac00-00000000000a';
do $$
declare i int;
begin
  for i in 1..20 loop
    insert into public.chat_messages (support_user_id, sender_id, text) values (auth.uid(), auth.uid(), 'salom ' || i);
  end loop;
  begin
    insert into public.chat_messages (support_user_id, sender_id, text) values (auth.uid(), auth.uid(), 'spam');
    raise exception 'FAIL: 21-xabar yozildi';
  exception when sqlstate '54000' then null;
  end;
  raise notice 'PASS: chat — daqiqasiga 20 tadan ortiq yozilmaydi';
end $$;
reset role;

-- Statistika: qurilma almashtirib yozish — umumiy chegara (kirmaganlar uchun 600/daqiqa)
reset request.jwt.claim.sub;
set role anon;
do $$ declare g int; begin
  for g in 1..700 loop insert into public.app_events (device, name) values ('device-' || g, 'app_open'); end loop;
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.app_events where user_id is null and device like 'device-%') = 600, 'anon hodisalar 600 da to''xtadi';
  raise notice 'PASS: statistika — qurilma almashtirib bazani to''ldirib bo''lmaydi';
end $$;
