-- UyService: xavfsizlik #3, ikkinchi qism (migrations/…_security_audit_3b.sql).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

insert into auth.users (id, phone) values ('00000000-0000-4000-ae38-00000000000a', '998907920001');
insert into public.masters (id, first_name, last_name, categories, billing_plan, passport_path, photo_path, works, doc_consent_at) values
  ('00000000-0000-4000-ae38-00000000000a', 'Alisher', 'valiyev', '{plumber}', 'commission',
   '00000000-0000-4000-ae38-00000000000a/passport-1.jpg', '00000000-0000-4000-ae38-00000000000a/photo-1.jpg',
   '{00000000-0000-4000-ae38-00000000000a/w-1.jpg,00000000-0000-4000-ae38-00000000000a/w-2.jpg}', now());

-- P4: ochiq kartada familiya — faqat bosh harf
set role anon;
do $$ declare c record; begin
  select first_name, last_name into c from public.master_cards where id = '00000000-0000-4000-ae38-00000000000a';
  assert c.first_name = 'Alisher' and c.last_name = 'V.', format('karta: %s %s', c.first_name, c.last_name);
  raise notice 'PASS: ochiq usta kartasida familiya faqat bosh harf bilan';
end $$;
reset role;

-- P5: almashtirilgan pasport, olib tashlangan ish namunasi — navbatga
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae38-00000000000a';
update public.masters set passport_path = '00000000-0000-4000-ae38-00000000000a/passport-2.jpg',
       works = '{00000000-0000-4000-ae38-00000000000a/w-2.jpg}' where id = auth.uid();
do $$ begin
  begin
    perform 1 from public.storage_trash;
    raise exception 'FAIL: foydalanuvchi storage_trash''ni o''qidi';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  assert exists (select 1 from public.storage_trash where bucket = 'documents' and path = '00000000-0000-4000-ae38-00000000000a/passport-1.jpg'), 'eski pasport navbatda';
  assert exists (select 1 from public.storage_trash where bucket = 'works' and path = '00000000-0000-4000-ae38-00000000000a/w-1.jpg'), 'olib tashlangan ish namunasi navbatda';
  assert not exists (select 1 from public.storage_trash where path like '%w-2.jpg' or path like '%passport-2.jpg'), 'ishlatilayotgan fayllar navbatda emas';
  raise notice 'PASS: almashtirilgan hujjat va ish namunasi serverda o''chirishga yoziladi';
end $$;

-- P5: hisob o'chirildi — uchala papka navbatga
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ae38-00000000000a';
select public.delete_my_account();
reset role;
do $$ begin
  assert (select count(*) from public.storage_trash where path = '00000000-0000-4000-ae38-00000000000a/') = 3, 'uchala papka navbatda';
  raise notice 'PASS: hisob o''chirilganda fayllari serverda o''chiriladi';
end $$;
