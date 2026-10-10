-- UyService: pasport va selfi uchun alohida rozilik (migrations/…_doc_consent.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into auth.users (id, phone) values ('00000000-0000-4000-ac00-000000000001', '998907600001');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ac00-000000000001';
do $$ begin
  begin
    insert into public.masters (id, first_name, categories, billing_plan, passport_path)
    values (auth.uid(), 'Rozisiz', '{plumber}', 'commission', 'x/passport.jpg');
    raise exception 'FAIL: rozilikisiz pasport qabul qilindi';
  exception when check_violation then null;
  end;
  raise notice 'PASS: rozilikisiz pasport yuklab bo''lmaydi';
end $$;
-- Hujjatsiz anketa — rozilik shart emas
insert into public.masters (id, first_name, categories, billing_plan) values (auth.uid(), 'Usta', '{plumber}', 'commission');
do $$ begin
  begin
    update public.masters set selfie_path = 'x/selfie.jpg' where id = auth.uid();
    raise exception 'FAIL: rozilikisiz selfi qabul qilindi';
  exception when check_violation then null;
  end;
  raise notice 'PASS: hujjatsiz anketa — rozilik so''ralmaydi; selfi uchun ham rozilik kerak';
end $$;
-- Rozilik bilan: vaqtni server qo'yadi (telefon yuborgan 2001-yil emas), keyin o'zgarmaydi
update public.masters set doc_consent_at = '2001-01-01', passport_path = 'x/passport.jpg' where id = auth.uid();
do $$ declare t timestamptz; begin
  select doc_consent_at into t from public.masters where id = auth.uid();
  if t is null or t < now() - interval '1 minute' then raise exception 'FAIL: rozilik vaqti %', t; end if;
  update public.masters set doc_consent_at = null where id = auth.uid();
  if (select doc_consent_at from public.masters where id = auth.uid()) is distinct from t then
    raise exception 'FAIL: rozilik vaqti o''zgardi';
  end if;
  update public.masters set passport_path = 'x/passport2.jpg' where id = auth.uid();
  raise notice 'PASS: rozilik bilan pasport yuklanadi, vaqtini server qo''yadi va u o''zgarmaydi';
end $$;
reset role;
