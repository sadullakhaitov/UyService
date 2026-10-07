-- UyService: Telegram bog'lanishi himoyasi (migrations/…_telegram.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into auth.users (id, phone, email) values
  ('00000000-0000-4000-7000-00000000000a', '998907770001', 'tg777@telegram.uyservice.uz');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-7000-00000000000a';
do $$ begin
  begin
    update public.profiles set telegram_id = 12345 where id = auth.uid();
    raise exception 'FAIL: foydalanuvchi telegram_id ni o''zi yozdi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.auth_user_by_email('tg777@telegram.uyservice.uz');
    raise exception 'FAIL: foydalanuvchi auth_user_by_email chaqirdi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.telegram_contacts;
    raise exception 'FAIL: foydalanuvchi telegram_contacts ni o''qidi';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set name = 'Aziz' where id = auth.uid();
  raise notice 'PASS: telegram_id, telegram_contacts va email qidiruvi faqat serverga';
end $$;
reset role;
set role service_role;
do $$ begin
  if public.auth_user_by_email('TG777@telegram.uyservice.uz') <> '00000000-0000-4000-7000-00000000000a' then
    raise exception 'FAIL: auth_user_by_email';
  end if;
  update public.profiles set telegram_id = 777 where id = '00000000-0000-4000-7000-00000000000a';
  insert into public.telegram_contacts (telegram_id, phone) values (777, '998907770001');
  raise notice 'PASS: server Telegram''ni bog''laydi va kontaktni saqlaydi';
end $$;
reset role;
