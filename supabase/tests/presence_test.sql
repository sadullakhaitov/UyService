-- UyService: fon rejimi — usta Telegram'ni yig'ib qo'ysa ham ishda qoladi (migrations/…_background_presence.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- T — Telegram'li usta, W — faqat brauzer (xabar olmaydi), Q — Telegram'li, lekin "Yangi buyurtma" o'chiq, C — mijoz
insert into auth.users (id, phone) values
  ('00000000-0000-4000-ab00-000000000001', '998907500001'),
  ('00000000-0000-4000-ab00-000000000002', '998907500002'),
  ('00000000-0000-4000-ab00-000000000003', '998907500003'),
  ('00000000-0000-4000-ab00-00000000000c', '998907500009');
insert into public.masters (id, first_name, categories, billing_plan) values
  ('00000000-0000-4000-ab00-000000000001', 'Telegram', '{plumber}', 'commission'),
  ('00000000-0000-4000-ab00-000000000002', 'Brauzer', '{plumber}', 'commission'),
  ('00000000-0000-4000-ab00-000000000003', 'Jim', '{plumber}', 'commission');
update public.masters set verify_status = 'approved', balance = 100000, online = true
 where id::text like '00000000-0000-4000-ab00-00000000000%';
update public.profiles set telegram_id = 75001 where id = '00000000-0000-4000-ab00-000000000001';
update public.profiles set telegram_id = 75003, notify_offers = false where id = '00000000-0000-4000-ab00-000000000003';
insert into public.master_locations (master_id, lat, lng) values
  ('00000000-0000-4000-ab00-000000000001', 39.6500, 66.9600),
  ('00000000-0000-4000-ab00-000000000002', 39.6505, 66.9605),
  ('00000000-0000-4000-ab00-000000000003', 39.6495, 66.9595);

-- Joylashuv yoshini sinov uchun qo'lda qo'yamiz (odatda updated_at ni server qo'yadi)
create or replace function pg_temp.age_loc(p_master uuid, p_minutes int) returns void language plpgsql as $$
begin
  alter table public.master_locations disable trigger master_locations_touch;
  update public.master_locations set updated_at = now() - make_interval(mins => p_minutes) where master_id = p_master;
  alter table public.master_locations enable trigger master_locations_touch;
end $$;
create or replace function pg_temp.near() returns text language sql as $$
  select coalesce(string_agg(n.id::text, ',' order by n.id), '')
  from public.nearby_masters(39.65, 66.96, 3, 'plumber') n
$$;
create or replace function pg_temp.around() returns int language sql as $$
  select count(*)::int from public.masters_around(39.65, 66.96, 3)
$$;

-- 1) Fon rejimi ustunlarini usta o'zi yozolmaydi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ab00-000000000002';
do $$ begin
  begin
    update public.masters set live_until = now() + interval '1 year' where id = auth.uid();
    raise exception 'FAIL: usta live_until ni o''zi yozdi';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.masters set bg_lost_at = null, bg_pinged_at = now() where id = auth.uid();
    raise exception 'FAIL: usta eslatma bayrog''ini o''zi yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: fon rejimi muddatini faqat server yozadi';
end $$;
-- my_presence: o'zining holati
set request.jwt.claim.sub = '00000000-0000-4000-ab00-000000000001';
do $$ declare j jsonb := public.my_presence(); begin
  if not (j->>'reachable')::boolean or not (j->>'telegram')::boolean then raise exception 'FAIL: my_presence %', j; end if;
  raise notice 'PASS: usta o''z holatini ko''radi (Telegram, xabar boradi)';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-ab00-000000000002';
do $$ begin
  if (public.my_presence()->>'reachable')::boolean then raise exception 'FAIL: brauzerdagi usta "xabar boradi" deb ko''rindi'; end if;
  raise notice 'PASS: brauzerdagi usta — fon rejimi yo''q';
end $$;
reset role;

-- 2) Ilova ochiq (joylashuv yangi) — hammasi ro'yxatda
do $$ begin
  if pg_temp.near() <> '00000000-0000-4000-ab00-000000000001,00000000-0000-4000-ab00-000000000002,00000000-0000-4000-ab00-000000000003' then
    raise exception 'FAIL: yangi joylashuvli ustalar: %', pg_temp.near();
  end if;
  raise notice 'PASS: ilova ochiq — hamma usta taklif oladi';
end $$;

-- 3) 10 daqiqa joylashuv kelmadi (Telegram yig'ilgan): faqat xabar oladigan usta qoladi
select pg_temp.age_loc(id, 10) from public.masters where id::text like '00000000-0000-4000-ab00-00000000000%';
do $$ begin
  if pg_temp.near() <> '00000000-0000-4000-ab00-000000000001' then raise exception 'FAIL: 10 daqiqa: %', pg_temp.near(); end if;
  if pg_temp.around() <> 1 then raise exception 'FAIL: mijoz xaritasida % ta', pg_temp.around(); end if;
  raise notice 'PASS: Telegram yig''ilgan usta 10 daqiqadan keyin ham taklif oladi; brauzerdagi va bildirishnomasi o''chig''i — yo''q';
end $$;

-- 4) 40 daqiqa — "Hali ishdamisiz?" (bir marta), 50 daqiqa — ro'yxatdan chiqadi va "Buyurtmalar to'xtatildi" (bir marta)
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000001', 40);
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000002', 40);
do $$ declare n int; begin
  n := public.presence_reminders();
  if n <> 1 then raise exception 'FAIL: 40 daqiqa: % ta eslatma', n; end if;
  if not exists (select 1 from public.push_outbox where user_id = '00000000-0000-4000-ab00-000000000001' and kind = 'stillWorking') then
    raise exception 'FAIL: "Hali ishdamisiz?" navbatda yo''q';
  end if;
  if public.presence_reminders() <> 0 then raise exception 'FAIL: eslatma takrorlandi'; end if;
  if pg_temp.near() <> '00000000-0000-4000-ab00-000000000001' then raise exception 'FAIL: 40 daqiqada ro''yxatdan chiqdi'; end if;
  raise notice 'PASS: 35 daqiqadan keyin — "Hali ishdamisiz?" (bir marta, faqat xabar oladigan ustaga)';
end $$;
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000001', 50);
do $$ declare n int; begin
  if pg_temp.near() <> '' then raise exception 'FAIL: 50 daqiqa: %', pg_temp.near(); end if;
  n := public.presence_reminders();
  if n <> 1
     or not exists (select 1 from public.push_outbox where user_id = '00000000-0000-4000-ab00-000000000001' and kind = 'presenceLost') then
    raise exception 'FAIL: "Buyurtmalar to''xtatildi" yuborilmadi';
  end if;
  if public.presence_reminders() <> 0 then raise exception 'FAIL: "to''xtatildi" takrorlandi'; end if;
  if not (select online from public.masters where id = '00000000-0000-4000-ab00-000000000001') then
    raise exception 'FAIL: online o''chib qoldi (ilova ochilsa darhol davom etishi kerak)';
  end if;
  raise notice 'PASS: 45 daqiqadan keyin — ro''yxatdan chiqadi, bir marta xabar; online o''zgarmaydi';
end $$;

-- 5) Joylashuv keldi (bot yoki ilova) — darhol qaytadi, eslatma bayroqlari tozalanadi
update public.master_locations set lat = 39.6501 where master_id = '00000000-0000-4000-ab00-000000000001';
do $$ begin
  if pg_temp.near() not like '00000000-0000-4000-ab00-000000000001%' then raise exception 'FAIL: joylashuvdan keyin qaytmadi'; end if;
  if exists (select 1 from public.masters where id = '00000000-0000-4000-ab00-000000000001' and (bg_pinged_at is not null or bg_lost_at is not null)) then
    raise exception 'FAIL: eslatma bayroqlari tozalanmadi';
  end if;
  raise notice 'PASS: joylashuv kelishi bilan usta qaytadi, keyingi safar yana eslatiladi';
end $$;

-- 6) Telegram jonli joylashuvi: turgan joyida yangilanish kelmasa ham (3 soat) muddati tugaguncha ro'yxatda; eslatma yo'q
update public.masters set live_until = now() + interval '2 hours' where id = '00000000-0000-4000-ab00-000000000001';
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000001', 180);
do $$ begin
  if pg_temp.near() <> '00000000-0000-4000-ab00-000000000001' then raise exception 'FAIL: jonli joylashuv: %', pg_temp.near(); end if;
  if public.presence_reminders() <> 0 then raise exception 'FAIL: jonli joylashuvda eslatma ketdi'; end if;
  raise notice 'PASS: jonli joylashuv — muddati tugaguncha ro''yxatda, eslatmasiz';
end $$;
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000001', 9 * 60);
do $$ begin
  if pg_temp.near() <> '' then raise exception 'FAIL: 9 soatlik joylashuv bilan ro''yxatda'; end if;
  raise notice 'PASS: jonli bo''lsa ham 8 soatdan eski joylashuv bilan taklif yo''q';
end $$;
update public.masters set live_until = now() - interval '1 minute' where id = '00000000-0000-4000-ab00-000000000001';
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000001', 60);
do $$ begin
  if pg_temp.near() <> '' then raise exception 'FAIL: jonli muddat tugagach ham ro''yxatda'; end if;
  raise notice 'PASS: jonli joylashuv tugagach — oddiy 45 daqiqa qoidasi';
end $$;

-- 7) Band (ishda) yoki offlayn ustaga eslatma bormaydi
delete from public.push_outbox;
update public.masters set bg_pinged_at = null, bg_lost_at = null, live_until = null where id = '00000000-0000-4000-ab00-000000000001';
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000001', 40);
update public.masters set busy = true where id = '00000000-0000-4000-ab00-000000000001';
do $$ begin
  if public.presence_reminders() <> 0 then raise exception 'FAIL: ishdagi ustaga eslatma'; end if;
end $$;
update public.masters set busy = false, online = false where id = '00000000-0000-4000-ab00-000000000001';
do $$ begin
  if public.presence_reminders() <> 0 then raise exception 'FAIL: offlayn ustaga eslatma'; end if;
  raise notice 'PASS: ishdagi va offlayn ustaga eslatma yo''q';
end $$;

-- 8) Admin bosh sahifasi: "hozir onlayn" fon rejimidagilarni ham sanaydi
update public.masters set online = true where id = '00000000-0000-4000-ab00-000000000001';
select pg_temp.age_loc('00000000-0000-4000-ab00-000000000001', 10);
insert into auth.users (id, phone) values ('00000000-0000-4000-ab00-0000000000aa', '998907500010');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-ab00-0000000000aa';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ab00-0000000000aa';
do $$ declare n int; seed int; begin
  -- seed.sql'dagi namunaviy ustalar (ilovasi ochiq) + fon rejimidagi T
  select count(*) into seed from public.masters m join public.master_locations l on l.master_id = m.id
   where m.online and m.id::text not like '%-ab00-%' and l.updated_at > now() - interval '2 minutes';
  n := (public.admin_stats(7)->'live'->>'online')::int;
  if n <> seed + 1 then raise exception 'FAIL: admin "onlayn" = % (kutilgan %)', n, seed + 1; end if;
  raise notice 'PASS: admin panelda fon rejimidagi usta ham onlayn';
end $$;
reset role;
