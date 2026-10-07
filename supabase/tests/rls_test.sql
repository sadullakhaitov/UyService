-- UyService: RLS va triggerlar sinovi (lokal Postgres + supabase_stub.sql + migrations/*.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi (psql -v ON_ERROR_STOP=1).
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- ---------- Tayyorgarlik (postgres sifatida) ----------
-- A, B — mijozlar; M1, M2 — ustalar; AD — admin. Buyurtma Chilonzorda (seed ustalaridan ~8 km uzoqda).
insert into auth.users (id, phone) values
  ('00000000-0000-4000-b000-00000000000a', '998901111111'),
  ('00000000-0000-4000-b000-00000000000b', '+998902222222'),
  ('00000000-0000-4000-b000-000000000001', '998903333333'),
  ('00000000-0000-4000-b000-000000000002', '998904444444'),
  ('00000000-0000-4000-b000-0000000000ad', '998905555555');

do $$ begin
  if (select phone from public.profiles where id = '00000000-0000-4000-b000-00000000000a') <> '+998901111111'
     or (select phone from public.profiles where id = '00000000-0000-4000-b000-00000000000b') <> '+998902222222' then
    raise exception 'FAIL: profil avtomatik yaratilmadi';
  end if;
  raise notice 'PASS: auth.users → profiles (telefon +998...)';
end $$;

update public.profiles set role = 'admin' where id = '00000000-0000-4000-b000-0000000000ad';

-- ---------- Usta anketasi (usta o'zi) ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
insert into public.masters (id, first_name, categories, verify_status, rating, balance, billing_plan)
values ('00000000-0000-4000-b000-000000000001', 'Usta1', '{plumber,electric}', 'pending', 1.0, 999999, 'commission');
do $$ declare m public.masters; begin
  select * into m from public.masters where id = '00000000-0000-4000-b000-000000000001';
  if m.rating <> 5 or m.balance <> 0 or m.verify_status <> 'pending' or m.plan_changed_at is null or m.submitted_at is null then
    raise exception 'FAIL: usta yaratishda himoyalangan ustunlar tiklanmadi: %', row_to_json(m);
  end if;
  raise notice 'PASS: usta anketasi — reyting/balans server qiymatida, verify_status=pending';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000002';
do $$ begin
  begin
    insert into public.masters (id, first_name, categories, verify_status)
    values ('00000000-0000-4000-b000-000000000002', 'Usta2', '{plumber}', 'approved');
    raise exception 'FAIL: usta o''zini tasdiqlangan qilib yaratdi';
  exception when insufficient_privilege then raise notice 'PASS: usta o''zini approved qilib yarata olmaydi';
  end;
  begin
    insert into public.masters (id, first_name) values ('00000000-0000-4000-b000-000000000001', 'Begona');
    raise exception 'FAIL: boshqa birovning nomidan usta yaratildi';
  exception when insufficient_privilege or unique_violation then raise notice 'PASS: boshqa id bilan usta yaratib bo''lmaydi';
  end;
end $$;
insert into public.masters (id, first_name, categories) values ('00000000-0000-4000-b000-000000000002', 'Usta2', '{plumber}');
reset role;

-- Admin (SQL Editor) M1 ni tasdiqlaydi, balans beradi, ikkalasi onlayn; joylashuv — Chilonzor
update public.masters set verify_status = 'approved', balance = 50000, online = true
  where id = '00000000-0000-4000-b000-000000000001';
update public.masters set online = true where id = '00000000-0000-4000-b000-000000000002';

-- ---------- Usta o'z qatorini o'zgartiradi ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
do $$ declare n int; begin
  begin
    update public.masters set verify_status = 'rejected' where id = '00000000-0000-4000-b000-000000000001';
    raise exception 'FAIL: usta verify_status ni o''zgartirdi';
  exception when insufficient_privilege then raise notice 'PASS: usta o''z verify_status ini o''zgartira olmaydi';
  end;
  begin
    update public.masters set balance = 1000000 where id = '00000000-0000-4000-b000-000000000001';
    raise exception 'FAIL: usta balansini o''zgartirdi';
  exception when insufficient_privilege then raise notice 'PASS: usta balans/reytingni o''zgartira olmaydi';
  end;
  update public.masters set first_name = 'Jasur', billing_plan = 'subscription', online = true
    where id = '00000000-0000-4000-b000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: usta o''z ismini o''zgartira olmadi'; end if;
  update public.masters set billing_plan = 'commission' where id = '00000000-0000-4000-b000-000000000001';
  -- boshqa ustaning qatori ko'rinmaydi
  update public.masters set first_name = 'X' where id = '00000000-0000-4000-b000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: usta boshqa ustani o''zgartirdi'; end if;
  raise notice 'PASS: usta ism/tarif/onlaynni o''zgartiradi, boshqa ustaga tegolmaydi';
end $$;
insert into public.master_locations (master_id, lat, lng, heading) values ('00000000-0000-4000-b000-000000000001', 41.2760, 69.2040, 90);
do $$ begin
  begin
    insert into public.master_locations (master_id, lat, lng) values ('00000000-0000-4000-b000-000000000002', 41.2765, 69.2045);
    raise exception 'FAIL: usta boshqa ustaning joylashuvini yozdi';
  exception when insufficient_privilege then raise notice 'PASS: master_locations — faqat o''z qatori';
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000002';
insert into public.master_locations (master_id, lat, lng) values ('00000000-0000-4000-b000-000000000002', 41.2765, 69.2045)
  on conflict (master_id) do update set lat = excluded.lat, lng = excluded.lng;
update public.masters set verify_status = 'pending' where id = '00000000-0000-4000-b000-000000000002';
reset role;

-- ---------- Buyurtma ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000a';
insert into public.orders (id, client_id, category_id, problem_id, description, address, lat, lng, status, master_id, platform_fee, photos)
values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-00000000000a', 'plumber', 'tap',
        'Jo''mrak oqyapti', 'Chilonzor 9-kvartal', 41.2750, 69.2050, 'completed', '00000000-0000-4000-b000-000000000001', 0,
        '{00000000-0000-4000-b000-00000000000a/tap.jpg}');
do $$ declare o public.orders; begin
  select * into o from public.orders where id = '00000000-0000-4000-c000-000000000001';
  if o.status <> 'searching' or o.master_id is not null or o.platform_fee is not null or o.call_fee <> 50000 then
    raise exception 'FAIL: buyurtma yaratishda server ustunlari tiklanmadi: %', row_to_json(o);
  end if;
  begin
    insert into public.orders (client_id, category_id, problem_id, lat, lng)
    values ('00000000-0000-4000-b000-00000000000a', 'plumber', 'socket', 41.27, 69.2);
    raise exception 'FAIL: kategoriyaga mos bo''lmagan muammo qabul qilindi';
  exception when check_violation then null;
  end;
  raise notice 'PASS: mijoz buyurtma yaratadi (status=searching, master_id=null, call_fee=50000)';
end $$;
insert into public.orders (client_id, category_id, lat, lng, scheduled_at)
values ('00000000-0000-4000-b000-00000000000a', 'electric', 41.28, 69.21, now() + interval '3 hours');
do $$ begin
  if not exists (select 1 from public.orders where category_id = 'electric' and status = 'scheduled') then
    raise exception 'FAIL: rejalashtirilgan buyurtma scheduled holatida emas';
  end if;
  raise notice 'PASS: scheduled_at berilsa — status=scheduled';
end $$;

-- Mijoz B
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000b';
do $$ declare n int; begin
  if exists (select 1 from public.orders) then raise exception 'FAIL: B mijoz A ning buyurtmasini ko''rdi'; end if;
  update public.orders set status = 'cancelled' where id = '00000000-0000-4000-c000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: B mijoz A ning buyurtmasini bekor qildi'; end if;
  begin
    insert into public.orders (client_id, category_id, lat, lng) values ('00000000-0000-4000-b000-00000000000a', 'plumber', 41.27, 69.2);
    raise exception 'FAIL: B mijoz A nomidan buyurtma yaratdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: mijoz B mijoz A ning buyurtmasini ko''rmaydi, o''zgartirmaydi, uning nomidan yaratmaydi';
end $$;

-- Usta taklifsiz buyurtmani ko'rmaydi
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
do $$ begin
  if exists (select 1 from public.orders) then raise exception 'FAIL: usta taklifsiz buyurtmani ko''rdi'; end if;
  raise notice 'PASS: usta taklif kelmaguncha buyurtmani ko''rmaydi';
end $$;

-- ---------- nearby_masters (Edge Function — service_role) ----------
set role anon;
do $$ begin
  begin
    perform * from public.nearby_masters(41.275, 69.205, 3, 'plumber');
    raise exception 'FAIL: anon nearby_masters ni chaqirdi';
  exception when insufficient_privilege then raise notice 'PASS: nearby_masters — ilovadan (anon/authenticated) yopiq';
  end;
end $$;
set role service_role;
do $$ declare ids uuid[]; d double precision; begin
  select array_agg(id), min(distance_km) into ids, d
  from public.nearby_masters(41.2750, 69.2050, 3, 'plumber', '00000000-0000-4000-c000-000000000001');
  if ids is distinct from array['00000000-0000-4000-b000-000000000001'::uuid] then
    raise exception 'FAIL: nearby_masters noto''g''ri: % (faqat M1 kutilgan; M2 ning balansi yo''q)', ids;
  end if;
  if d < 0.05 or d > 0.3 then raise exception 'FAIL: masofa noto''g''ri: % km', d; end if;
  if exists (select 1 from public.nearby_masters(41.2750, 69.2050, 3, 'aircon')) then
    raise exception 'FAIL: boshqa kategoriya ustasi qaytdi';
  end if;
  if (select count(*) from public.nearby_masters(41.311, 69.279, 3, 'plumber')) <> 2 then
    raise exception 'FAIL: markazda seed ustalari (101, 103) topilmadi';
  end if;
  raise notice 'PASS: nearby_masters — M1 (% m), M2 balansi limitdan past bo''lgani uchun yo''q', round((d * 1000)::numeric);
end $$;
-- Pasportsiz (tasdiqlanmagan) usta ham buyurtma oladi — faqat ulushi +5%
do $$ declare m public.masters; begin
  update public.masters set balance = 50000 where id = '00000000-0000-4000-b000-000000000002';
  if not exists (select 1 from public.nearby_masters(41.2750, 69.2050, 3, 'plumber') where id = '00000000-0000-4000-b000-000000000002') then
    raise exception 'FAIL: tasdiqlanmagan (pending) usta buyurtma olmadi';
  end if;
  select * into m from public.masters where id = '00000000-0000-4000-b000-000000000002';
  if public.master_fee_percent(m) <> 15 then raise exception 'FAIL: tasdiqlanmagan komissiya ulushi % (15 kutilgan)', public.master_fee_percent(m); end if;
  m.billing_plan := 'subscription';
  if public.master_fee_percent(m) <> 5 then raise exception 'FAIL: tasdiqlanmagan obuna ulushi % (5 kutilgan)', public.master_fee_percent(m); end if;
  m.verify_status := 'approved';
  if public.master_fee_percent(m) <> 0 then raise exception 'FAIL: tasdiqlangan obuna ulushi % (0 kutilgan)', public.master_fee_percent(m); end if;
  update public.masters set balance = 0 where id = '00000000-0000-4000-b000-000000000002';
  raise notice 'PASS: pasportsiz usta ham buyurtma oladi; ulush: komissiya 10/15%%, obuna 0/5%%';
end $$;
reset role;

-- Eski joylashuv (2 daqiqadan oldin) va band usta chiqmaydi
set session_replication_role = replica;
update public.master_locations set updated_at = now() - interval '5 minutes' where master_id = '00000000-0000-4000-b000-000000000001';
set session_replication_role = origin;
do $$ begin
  if exists (select 1 from public.nearby_masters(41.2750, 69.2050, 3, 'plumber')) then
    raise exception 'FAIL: joylashuvi eski usta qaytdi';
  end if;
  update public.master_locations set lat = lat where master_id = '00000000-0000-4000-b000-000000000001';
  update public.masters set busy = true where id = '00000000-0000-4000-b000-000000000001';
  if exists (select 1 from public.nearby_masters(41.2750, 69.2050, 3, 'plumber')) then
    raise exception 'FAIL: band usta qaytdi';
  end if;
  update public.masters set busy = false, balance = 10000 where id = '00000000-0000-4000-b000-000000000001';
  if exists (select 1 from public.nearby_masters(41.2750, 69.2050, 3, 'plumber')) then
    raise exception 'FAIL: balansi limitdan past usta qaytdi';
  end if;
  update public.masters set balance = 50000 where id = '00000000-0000-4000-b000-000000000001';
  if not exists (select 1 from public.nearby_masters(41.2750, 69.2050, 3, 'plumber')) then
    raise exception 'FAIL: M1 qaytmadi';
  end if;
  raise notice 'PASS: nearby_masters — eski joylashuv, band, balansi past usta chiqmaydi';
end $$;

-- ---------- Taklif ----------
insert into public.offers (order_id, master_id) values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001');
do $$ begin
  if exists (select 1 from public.nearby_masters(41.2750, 69.2050, 3, 'plumber', '00000000-0000-4000-c000-000000000099')) then
    raise exception 'FAIL: ochiq taklifi bor usta boshqa buyurtmaga qaytdi';
  end if;
  raise notice 'PASS: ochiq taklifi bor usta boshqa buyurtmaga taklif olmaydi';
end $$;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
do $$ begin
  if (select count(*) from public.orders) <> 1 or (select count(*) from public.offers) <> 1 then
    raise exception 'FAIL: usta taklif qilingan buyurtmani ko''rmadi';
  end if;
  if (select count(*) from public.profiles where id = '00000000-0000-4000-b000-00000000000a') <> 0 then
    raise exception 'FAIL: usta tayinlanmasdan mijoz telefonini ko''rdi';
  end if;
  raise notice 'PASS: usta taklif qilingan buyurtmani ko''radi (mijoz telefoni hali yopiq)';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000002';
do $$ begin
  if exists (select 1 from public.offers) or exists (select 1 from public.orders) then
    raise exception 'FAIL: M2 boshqa ustaning taklifini ko''rdi';
  end if;
  raise notice 'PASS: M2 boshqa ustaning taklifi va buyurtmasini ko''rmaydi';
end $$;
reset role;

-- Qabul (offer-respond / dispatch funksiyasi bajaradi)
update public.offers set status = 'accepted', responded_at = now() where order_id = '00000000-0000-4000-c000-000000000001';
update public.orders set master_id = '00000000-0000-4000-b000-000000000001', status = 'on_the_way'
  where id = '00000000-0000-4000-c000-000000000001';
update public.masters set busy = true where id = '00000000-0000-4000-b000-000000000001';

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000a';
do $$ begin
  if (select count(*) from public.master_locations) <> 1 then raise exception 'FAIL: mijoz o''z ustasining joyini ko''rmadi'; end if;
  if (select count(*) from public.profiles where id = '00000000-0000-4000-b000-000000000001') <> 1 then
    raise exception 'FAIL: mijoz tayinlangan usta profilini ko''rmadi';
  end if;
  if (select count(*) from public.masters) <> 0 then raise exception 'FAIL: mijoz masters jadvalini (balans, hujjatlar) ko''rdi'; end if;
  if (select first_name from public.master_cards where id = '00000000-0000-4000-b000-000000000001') <> 'Jasur' then
    raise exception 'FAIL: master_cards ishlamadi';
  end if;
  begin
    update public.orders set price_work = 1 where id = '00000000-0000-4000-c000-000000000001';
    raise exception 'FAIL: mijoz narxni o''zgartirdi';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.orders set master_id = null where id = '00000000-0000-4000-c000-000000000001';
    raise exception 'FAIL: mijoz ustani almashtirdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: mijoz ustaning joyi va profilini ko''radi, buyurtma ustunlarini o''zgartira olmaydi';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000b';
do $$ begin
  if exists (select 1 from public.master_locations) or exists (select 1 from public.profiles where id <> auth.uid()) then
    raise exception 'FAIL: B mijoz begona ustaning joyi yoki profilini ko''rdi';
  end if;
  raise notice 'PASS: B mijoz begona ustaning joylashuvini ko''rmaydi';
end $$;

-- Usta ish jarayoni
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
do $$ begin
  if (select count(*) from public.profiles where id = '00000000-0000-4000-b000-00000000000a') <> 1 then
    raise exception 'FAIL: tayinlangan usta mijoz profilini ko''rmadi';
  end if;
  begin
    update public.orders set status = 'completed' where id = '00000000-0000-4000-c000-000000000001';
    raise exception 'FAIL: usta on_the_way → completed qildi';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.orders set price_work = 100000 where id = '00000000-0000-4000-c000-000000000001';
    raise exception 'FAIL: usta narxni to''g''ridan-to''g''ri yozdi';
  exception when insufficient_privilege then null;
  end;
  if exists (select 1 from public.order_secrets) or public.order_door_code('00000000-0000-4000-c000-000000000001') is not null then
    raise exception 'FAIL: usta eshik kodini ko''rdi';
  end if;
  update public.orders set status = 'arrived' where id = '00000000-0000-4000-c000-000000000001';
  begin
    update public.orders set status = 'in_progress' where id = '00000000-0000-4000-c000-000000000001';
    raise exception 'FAIL: usta mijoz roziligisiz ishni boshladi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.propose_price('00000000-0000-4000-c000-000000000001', 100000, 30000);
    raise exception 'FAIL: usta eshik kodisiz narx yubordi';
  exception when invalid_parameter_value then null;
  end;
  if public.verify_door_code('00000000-0000-4000-c000-000000000001', '0000') then
    raise exception 'FAIL: noto''g''ri kod qabul qilindi';
  end if;
end $$;
-- Mijoz kodni ko'radi va ustaga aytadi
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000a';
select public.order_door_code('00000000-0000-4000-c000-000000000001') as door_code \gset
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
select public.verify_door_code('00000000-0000-4000-c000-000000000001', :'door_code') as door_ok \gset
do $$ begin
  if (select door_verified_at from public.orders where id = '00000000-0000-4000-c000-000000000001') is null then
    raise exception 'FAIL: to''g''ri kod qabul qilinmadi';
  end if;
  begin
    perform public.propose_price('00000000-0000-4000-c000-000000000001', 10000, 0);
    raise exception 'FAIL: chaqiruvdan arzon ish narxi qabul qilindi';
  exception when invalid_parameter_value then null;
  end;
  perform public.propose_price('00000000-0000-4000-c000-000000000001', 100000, 30000);
  begin
    update public.orders set status = 'completed' where id = '00000000-0000-4000-c000-000000000001';
    raise exception 'FAIL: usta narx javobini kutmasdan yopdi';
  exception when insufficient_privilege then null;
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000a';
do $$ begin
  begin
    update public.orders set status = 'cancelled' where id = '00000000-0000-4000-c000-000000000001';
    raise exception 'FAIL: mijoz usta ichkariga kirgach bepul bekor qildi';
  exception when insufficient_privilege then null;
  end;
  perform public.respond_price('00000000-0000-4000-c000-000000000001', true);
  if (select status from public.orders where id = '00000000-0000-4000-c000-000000000001') <> 'in_progress' then
    raise exception 'FAIL: mijoz rozi bo''lgach ish boshlanmadi';
  end if;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
do $$ begin
  update public.orders set status = 'completed' where id = '00000000-0000-4000-c000-000000000001';
  raise notice 'PASS: usta Yetib keldim → eshik kodi → narx → mijoz rozi → Tugatdim (bosqich tashlab o''tib bo''lmaydi)';
end $$;
reset role;
do $$ declare o public.orders; m public.masters; begin
  select * into o from public.orders where id = '00000000-0000-4000-c000-000000000001';
  select * into m from public.masters where id = '00000000-0000-4000-b000-000000000001';
  -- komissiya 10%: (100 000 ish, chaqiruv ichida + 30 000 qism) × 10% = 13 000
  if o.platform_fee <> 13000 or o.completed_at is null or o.accepted_at is null then
    raise exception 'FAIL: platform_fee=% (13000 kutilgan)', o.platform_fee;
  end if;
  if m.busy or m.jobs_count <> 1 or m.balance <> 37000 then
    raise exception 'FAIL: usta holati: busy=% jobs=% balance=%', m.busy, m.jobs_count, m.balance;
  end if;
  raise notice 'PASS: ish tugadi — platform_fee 13 000, balans 50 000 → 37 000, jobs_count=1, busy=false';
end $$;

-- ---------- Baholash ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000b';
do $$ begin
  begin
    insert into public.reviews (order_id, client_id, master_id, stars)
    values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-b000-000000000001', 1);
    raise exception 'FAIL: B mijoz begona buyurtmani baholadi';
  exception when insufficient_privilege then raise notice 'PASS: begona mijoz baholay olmaydi';
  end;
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000a';
insert into public.reviews (order_id, client_id, master_id, stars, tags)
values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-b000-000000000001', 4, '{fast}');
do $$ begin
  if (select rating from public.master_cards where id = '00000000-0000-4000-b000-000000000001') <> 4 then
    raise exception 'FAIL: reyting yangilanmadi';
  end if;
  begin
    insert into public.reviews (order_id, client_id, master_id, stars)
    values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-b000-000000000001', 5);
    raise exception 'FAIL: bitta buyurtmaga ikki baho';
  exception when unique_violation then null;
  end;
  begin
    insert into public.reviews (order_id, client_id, master_id, stars)
    select id, client_id, '00000000-0000-4000-b000-000000000001', 5 from public.orders where status = 'scheduled';
    raise exception 'FAIL: tugamagan buyurtmaga baho';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: mijoz ish tugagach baholaydi (reyting 4.00), ikkinchi marta yoki tugamaganni — yo''q';
end $$;

-- ---------- Sevimlilar ----------
insert into public.favorites (client_id, master_id) values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-b000-000000000001');
do $$ begin
  begin
    insert into public.favorites (client_id, master_id) values ('00000000-0000-4000-b000-00000000000b', '00000000-0000-4000-b000-000000000001');
    raise exception 'FAIL: begona nomidan sevimli qo''shildi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: favorites — faqat o''zim';
end $$;

-- ---------- Chat ----------
insert into public.chat_messages (order_id, sender_id, text)
values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-00000000000a', 'Salom, qachon kelasiz?');
insert into public.chat_messages (support_user_id, sender_id, text)
values ('00000000-0000-4000-b000-00000000000a', '00000000-0000-4000-b000-00000000000a', 'Yordam kerak');
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
insert into public.chat_messages (order_id, sender_id, text)
values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001', '10 daqiqada');
do $$ begin
  if (select count(*) from public.chat_messages) <> 2 then raise exception 'FAIL: usta buyurtma chatini ko''rmadi'; end if;
  raise notice 'PASS: chat — mijoz va usta yozadi va o''qiydi (qo''llab-quvvatlash chati ustaga ko''rinmaydi)';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000b';
do $$ begin
  if exists (select 1 from public.chat_messages) then raise exception 'FAIL: B begona chatni o''qidi'; end if;
  begin
    insert into public.chat_messages (order_id, sender_id, text)
    values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-00000000000b', 'spam');
    raise exception 'FAIL: B begona chatga yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: chat — begona o''qiy olmaydi va yoza olmaydi';
end $$;

-- ---------- Profil: o'zini admin qilish ----------
do $$ begin
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'FAIL: foydalanuvchi o''zini admin qildi';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set role = 'master', name = 'Bek', language = 'ru' where id = auth.uid();
  raise notice 'PASS: profil — ism/til/rolni o''zgartiradi, admin bo''la olmaydi';
end $$;

-- ---------- Storage ----------
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000a';
insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-4000-b000-00000000000a/passport.jpg');
insert into storage.objects (bucket_id, name) values ('order-photos', '00000000-0000-4000-b000-00000000000a/tap.jpg');
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('documents', '00000000-0000-4000-b000-00000000000b/passport.jpg');
    raise exception 'FAIL: begona papkaga fayl yuklandi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: storage — faqat o''z papkasiga yuklaydi';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-00000000000b';
do $$ begin
  if exists (select 1 from storage.objects) then raise exception 'FAIL: B begona hujjatni ko''rdi'; end if;
  raise notice 'PASS: storage — begona hujjat va buyurtma rasmlari ko''rinmaydi';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000001';
do $$ begin
  if (select array_agg(name) from storage.objects) is distinct from array['00000000-0000-4000-b000-00000000000a/tap.jpg'] then
    raise exception 'FAIL: usta buyurtma rasmini ko''rmadi yoki pasportni ko''rdi';
  end if;
  raise notice 'PASS: storage — usta o''z buyurtmasining rasmini ko''radi, mijoz pasportini emas';
end $$;
reset role;

-- ---------- Admin ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-0000000000ad';
do $$ begin
  if (select count(*) from public.orders) <> 2 or (select count(*) from public.masters) < 5 then
    raise exception 'FAIL: admin hamma narsani ko''rmadi';
  end if;
  update public.masters set verify_status = 'approved' where id = '00000000-0000-4000-b000-000000000002';
  if (select count(*) from storage.objects) <> 2 then raise exception 'FAIL: admin hujjatlarni ko''rmadi'; end if;
  raise notice 'PASS: admin hamma buyurtma, usta va hujjatni ko''radi, ustani tasdiqlaydi';
end $$;

-- ---------- Mehmon (anon) ----------
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  if (select count(*) from public.categories) <> 6 or (select count(*) from public.problems) <> 22 then
    raise exception 'FAIL: katalog mehmonga ko''rinmadi';
  end if;
  if exists (select 1 from public.orders) or exists (select 1 from public.profiles) or exists (select 1 from public.master_locations) then
    raise exception 'FAIL: mehmon yopiq ma''lumotni ko''rdi';
  end if;
  if (select count(*) from public.masters_around(41.2750, 69.2050, 3)) <> 2 then
    raise exception 'FAIL: masters_around: %', (select count(*) from public.masters_around(41.2750, 69.2050, 3));
  end if;
  raise notice 'PASS: mehmon katalog va atrofdagi ustalarni (~100 m aniqlikda) ko''radi, boshqasini emas';
end $$;
reset role;

-- ---------- Bekor qilish (usta) ----------
update public.masters set busy = true, activity = 50 where id = '00000000-0000-4000-b000-000000000002';
insert into public.orders (id, client_id, category_id, lat, lng, master_id, status)
values ('00000000-0000-4000-c000-000000000002', '00000000-0000-4000-b000-00000000000b', 'plumber', 41.27, 69.2,
        '00000000-0000-4000-b000-000000000002', 'on_the_way');
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-b000-000000000002';
update public.orders set status = 'cancelled', cancel_reason = 'mashina buzildi' where id = '00000000-0000-4000-c000-000000000002';
reset role;
do $$ declare m public.masters; begin
  select * into m from public.masters where id = '00000000-0000-4000-b000-000000000002';
  if m.busy or m.activity <> 40 or (select cancelled_by from public.orders where id = '00000000-0000-4000-c000-000000000002') <> 'master' then
    raise exception 'FAIL: usta bekor qilganda: busy=% activity=%', m.busy, m.activity;
  end if;
  raise notice 'PASS: usta bekor qilsa — aktivlik −10, busy=false, cancelled_by=master';
end $$;

-- ---------- Obuna ----------
insert into public.subscriptions (master_id, period_start, period_end, amount)
values ('00000000-0000-4000-b000-000000000002', now(), now() + interval '30 days', 149000);
do $$ begin
  if (select subscription_until from public.masters where id = '00000000-0000-4000-b000-000000000002') < now() + interval '29 days' then
    raise exception 'FAIL: obuna muddati uzaymadi';
  end if;
  raise notice 'PASS: to''langan obuna masters.subscription_until ni uzaytiradi';
end $$;

do $$ begin raise notice 'ALL RLS TESTS PASSED'; end $$;
