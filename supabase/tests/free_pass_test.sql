-- UyService: bepul davr kodlari (migrations/…_free_passes.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- A — admin, M — usta (pasportli, komissiya, balans 0), N — pasportsiz usta, X — boshqa usta, C — mijoz
insert into auth.users (id, phone) values
  ('00000000-0000-4000-af10-00000000000a', '998907400000'),
  ('00000000-0000-4000-af10-000000000001', '998907400001'),
  ('00000000-0000-4000-af10-000000000002', '998907400002'),
  ('00000000-0000-4000-af10-000000000003', '998907400003'),
  ('00000000-0000-4000-af10-00000000000c', '998907400009');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-af10-00000000000a';
insert into public.masters (id, first_name, categories, billing_plan, passport_path) values
  ('00000000-0000-4000-af10-000000000001', 'Bepul', '{plumber}', 'commission', 'x/p.jpg'),
  ('00000000-0000-4000-af10-000000000002', 'Pasportsiz', '{plumber}', 'commission', null),
  ('00000000-0000-4000-af10-000000000003', 'Boshqa', '{plumber}', 'subscription', 'x/q.jpg');
update public.masters set verify_status = 'pending', online = true, balance = 0
 where id in ('00000000-0000-4000-af10-000000000001', '00000000-0000-4000-af10-000000000003');
update public.masters set online = true, balance = 0 where id = '00000000-0000-4000-af10-000000000002';

-- 1) Faqat admin kod yaratadi; muddat faqat 30 / 60 / 90
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-af10-000000000001';
do $$ begin
  begin
    perform public.admin_create_free_pass('+998907400001', 90);
    raise exception 'FAIL: usta o''ziga bepul kod yaratdi';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.free_passes (code, phone, days, redeem_by) values ('UYHACK1234', '+998907400001', 90, now() + interval '1 day');
    raise exception 'FAIL: usta free_passes jadvaliga yozdi';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.masters set free_until = now() + interval '1 year' where id = auth.uid();
    raise exception 'FAIL: usta free_until ni o''zi yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: bepul davrni faqat admin beradi (kod ham, muddat ham)';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-af10-00000000000a';
do $$ begin
  begin
    perform public.admin_create_free_pass('+998907400001', 45);
    raise exception 'FAIL: 45 kunlik kod yaratildi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_create_free_pass('12345', 30);
    raise exception 'FAIL: noto''g''ri raqamga kod yaratildi';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: muddat faqat 30/60/90, raqam tekshiriladi';
end $$;
create temp table codes (k text primary key, v text);
grant all on codes to authenticated;
insert into codes values
  ('m', public.admin_create_free_pass('907400001', 90)),
  ('n', public.admin_create_free_pass('+998 90 740 00 02', 30)),
  ('x', public.admin_create_free_pass('+998907400003', 60));
-- Ikkinchi kod shu raqamga — birinchisi bekor bo'ladi
insert into codes values ('m_old', (select v from codes where k = 'm'));
update codes set v = public.admin_create_free_pass('+998907400001', 90) where k = 'm';
do $$ begin
  if (select count(*) from public.admin_free_passes() where status = 'pending') <> 3
     or (select status from public.admin_free_passes() where code = (select v from codes where k = 'm_old')) <> 'revoked' then
    raise exception 'FAIL: kodlar ro''yxati: %', (select jsonb_agg(row_to_json(f)) from public.admin_free_passes() f);
  end if;
  if (select v from codes where k = 'm') !~ '^UY[A-Z2-9]{8}$' then raise exception 'FAIL: kod ko''rinishi'; end if;
  if not exists (select 1 from public.admin_log where action = 'free_pass' and details ->> 'phone' = '0001') then
    raise exception 'FAIL: jurnalga yozilmadi';
  end if;
  raise notice 'PASS: kod yaratiladi (UY + 8 belgi), jurnalga yoziladi; shu raqamga yangisi — eskisi bekor';
end $$;

-- 2) Kodni faqat o'sha raqam egasi, pasport bilan, bir marta kiritadi
set request.jwt.claim.sub = '00000000-0000-4000-af10-000000000003';
do $$ begin
  begin
    perform public.redeem_promo((select v from codes where k = 'm'));
    raise exception 'FAIL: boshqa raqamdagi usta kodni ishlatdi';
  exception when insufficient_privilege then
    if sqlerrm not like '%other_phone%' then raise; end if;
  end;
  raise notice 'PASS: kod faqat o''sha raqam egasi uchun';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-af10-000000000002';
do $$ begin
  begin
    perform public.redeem_promo((select v from codes where k = 'n'));
    raise exception 'FAIL: pasportsiz usta bepul davr oldi';
  exception when object_not_in_prerequisite_state then null;
  end;
  raise notice 'PASS: pasportsiz bepul davr yo''q';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-af10-000000000001';
do $$ declare r jsonb; begin
  begin
    perform public.redeem_promo((select v from codes where k = 'm_old'));
    raise exception 'FAIL: bekor qilingan kod ishladi';
  exception when no_data_found then null;
  end;
  if public.master_fee_percent((select m from public.masters m where id = auth.uid())) <> 15 then
    raise exception 'FAIL: oldingi ulush 15%% emas';
  end if;
  r := public.redeem_promo(lower((select v from codes where k = 'm')));
  if (r ->> 'free_days')::int <> 90 or (r ->> 'free_until')::timestamptz < now() + interval '89 days' then
    raise exception 'FAIL: redeem natijasi: %', r;
  end if;
  begin
    perform public.redeem_promo((select v from codes where k = 'm'));
    raise exception 'FAIL: kod ikki marta ishladi';
  exception when unique_violation then null;
  end;
  raise notice 'PASS: kod kichik harf bilan ham ishlaydi, bir marta; 90 kun';
end $$;

-- 3) Bepul davrda: ulush 0, balans 0 bilan ham buyurtma oladi
reset role;
do $$ declare m public.masters; begin
  select * into m from public.masters where id = '00000000-0000-4000-af10-000000000001';
  if public.master_fee_percent(m) <> 0 or not public.master_can_take_orders(m) then
    raise exception 'FAIL: bepul davrda ulush % / can_take %', public.master_fee_percent(m), public.master_can_take_orders(m);
  end if;
  select * into m from public.masters where id = '00000000-0000-4000-af10-000000000002';
  if public.master_can_take_orders(m) then raise exception 'FAIL: pasportsiz, balanssiz usta buyurtma oladi'; end if;
  raise notice 'PASS: bepul davrda ulush 0%%, balans talab qilinmaydi';
end $$;

-- Buyurtma: qabul qilinganda 0% qotiriladi, "kechilgan ulush" yoziladi; yakunda platform_fee = 0
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-af10-00000000000c';
insert into public.orders (id, client_id, category_id, problem_id, address, lat, lng) values
  ('00000000-0000-4000-af20-000000000001', '00000000-0000-4000-af10-00000000000c', 'plumber', 'tap', 'A', 41.31, 69.27);
do $$ begin
  begin
    update public.orders set fee_waived_percent = 50 where id = '00000000-0000-4000-af20-000000000001';
    raise exception 'FAIL: mijoz fee_waived_percent yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: kechilgan ulushni faqat server yozadi';
end $$;
reset role;
update public.orders set master_id = '00000000-0000-4000-af10-000000000001', status = 'on_the_way'
 where id = '00000000-0000-4000-af20-000000000001';
update public.orders set status = 'arrived' where id = '00000000-0000-4000-af20-000000000001';
update public.orders set door_verified_at = now(), price_work = 200000, price_status = 'approved', status = 'in_progress'
 where id = '00000000-0000-4000-af20-000000000001';
-- Bepul davr ish o'rtasida tugasa ham — qabul paytidagi 0% qoladi
update public.masters set free_until = now() - interval '1 minute' where id = '00000000-0000-4000-af10-000000000001';
update public.orders set status = 'completed' where id = '00000000-0000-4000-af20-000000000001';
do $$ declare o public.orders; begin
  select * into o from public.orders where id = '00000000-0000-4000-af20-000000000001';
  if o.fee_percent <> 0 or o.platform_fee <> 0 or o.fee_waived_percent <> 15 then
    raise exception 'FAIL: buyurtma ulushi: fee % platform % waived %', o.fee_percent, o.platform_fee, o.fee_waived_percent;
  end if;
  if (select balance from public.masters where id = o.master_id) <> 0 then raise exception 'FAIL: balansdan yechildi'; end if;
  raise notice 'PASS: bepul davrda olingan ish keyin tugasa ham bepul (kechilgan ulush 15%% yozildi)';
end $$;

-- 4) Eslatmalar: 7 kun, 1 kun, tugadi — har biri bir marta
update public.profiles set push_token = 'ExponentPushToken[free]' where id = '00000000-0000-4000-af10-000000000001';
update public.masters set free_until = now() + interval '5 days', free_notified = 0 where id = '00000000-0000-4000-af10-000000000001';
do $$ begin
  if public.free_pass_reminders() <> 1 or public.free_pass_reminders() <> 0 then raise exception 'FAIL: 7 kunlik eslatma'; end if;
  update public.masters set free_until = now() + interval '5 hours' where id = '00000000-0000-4000-af10-000000000001';
  if public.free_pass_reminders() <> 1 then raise exception 'FAIL: 1 kunlik eslatma'; end if;
  update public.masters set free_until = now() - interval '1 minute' where id = '00000000-0000-4000-af10-000000000001';
  if public.free_pass_reminders() <> 1 or public.free_pass_reminders() <> 0 then raise exception 'FAIL: tugadi eslatmasi'; end if;
  if (select count(*) from public.push_outbox where user_id = '00000000-0000-4000-af10-000000000001' and kind in ('freeEnding', 'freeEnded')) <> 3 then
    raise exception 'FAIL: push navbati: %', (select jsonb_agg(kind) from public.push_outbox where user_id = '00000000-0000-4000-af10-000000000001');
  end if;
  raise notice 'PASS: tugashidan 7 va 1 kun oldin va tugaganda — bittadan xabar';
end $$;

-- 5) Admin: uzaytirish / to'xtatish (sabab bilan), bekor qilish; hujjat rad etilsa — bepul davr to'xtaydi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-af10-00000000000a';
do $$ declare u timestamptz; begin
  begin
    perform public.admin_set_free('00000000-0000-4000-af10-000000000001', 30, '');
    raise exception 'FAIL: sababsiz uzaytirildi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_set_free('00000000-0000-4000-af10-000000000002', 30, 'Sinov');
    raise exception 'FAIL: pasportsiz ustaga bepul davr berildi';
  exception when invalid_parameter_value then null;
  end;
  u := public.admin_set_free('00000000-0000-4000-af10-000000000001', 60, 'Faol usta');
  if u < now() + interval '59 days' then raise exception 'FAIL: uzaytirish: %', u; end if;
  if (select active_masters from public.admin_free_stats()) <> 1 or (select waived from public.admin_free_stats()) <> 30000 then
    raise exception 'FAIL: statistika: %', (select row_to_json(s) from public.admin_free_stats() s);
  end if;
  if (select free_until from public.admin_masters where id = '00000000-0000-4000-af10-000000000001') is null then
    raise exception 'FAIL: admin_masters.free_until';
  end if;
  begin
    perform public.admin_create_free_pass('+998907400001', 30);
    raise exception 'FAIL: bepul davrdan foydalangan ustaga yana kod yaratildi';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: admin uzaytiradi (sabab, pasport bilan), statistika: 1 usta, kechilgan 30 000';
end $$;
reset role;
update public.masters set verify_status = 'rejected' where id = '00000000-0000-4000-af10-000000000001';
do $$ begin
  if public.master_fee_percent((select m from public.masters m where id = '00000000-0000-4000-af10-000000000001')) = 0 then
    raise exception 'FAIL: hujjat rad etilgan ustada bepul davr davom etdi';
  end if;
  raise notice 'PASS: hujjat rad etilsa — bepul davr amal qilmaydi';
end $$;
update public.masters set verify_status = 'approved' where id = '00000000-0000-4000-af10-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-af10-00000000000a';
do $$ begin
  perform public.admin_revoke_free_pass((select v from codes where k = 'm'), 'Qoidabuzarlik');
  if (select free_until from public.masters where id = '00000000-0000-4000-af10-000000000001') is not null then
    raise exception 'FAIL: kod bekor qilinganda bepul davr to''xtamadi';
  end if;
  perform public.admin_set_free('00000000-0000-4000-af10-000000000003', 0, 'Sinov');
  raise notice 'PASS: ishlatilgan kod bekor qilinsa — bepul davr to''xtaydi';
end $$;
reset role;

-- 6) Oddiy promokod avvalgidek ishlaydi
insert into public.promo_codes (code, priority, bonus) values ('ODDIY', 5, 1000);
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-af10-000000000003';
do $$ declare r jsonb; begin
  r := public.redeem_promo('oddiy');
  if (r ->> 'priority')::int <> 5 or (r ->> 'bonus')::int <> 1000 then raise exception 'FAIL: oddiy promokod: %', r; end if;
  raise notice 'PASS: oddiy promokod ham shu joyda ishlaydi';
end $$;
reset role;
