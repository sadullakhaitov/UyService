-- UyService: promokodlar va do'st taklifi (migrations/…_promo_referrals.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- A — admin, I — taklif qiluvchi usta, N — yangi usta, X — oddiy mijoz
insert into auth.users (id, phone) values
  ('00000000-0000-4000-a700-00000000000a', '998907200001'),
  ('00000000-0000-4000-a700-000000000001', '998907200002'),
  ('00000000-0000-4000-a700-000000000002', '998907200003'),
  ('00000000-0000-4000-a700-00000000000c', '998907200004');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-a700-00000000000a';
update public.profiles set push_token = 'ExponentPushToken[i]' where id = '00000000-0000-4000-a700-000000000001';

-- Usta o'zi anketa yuboradi: kod server tomonidan beriladi, "kim taklif qildi"ni o'zi yoza olmaydi
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-a700-000000000001';
insert into public.masters (id, first_name, categories, billing_plan) values ('00000000-0000-4000-a700-000000000001', 'Taklif', '{plumber}', 'commission');
set request.jwt.claim.sub = '00000000-0000-4000-a700-000000000002';
insert into public.masters (id, first_name, categories, billing_plan, invite_code, referred_by)
values ('00000000-0000-4000-a700-000000000002', 'Yangi', '{plumber}', 'commission', 'USHACK', '00000000-0000-4000-a700-000000000002');
do $$ declare n public.masters; begin
  select * into n from public.masters where id = auth.uid();
  if n.invite_code is null or n.invite_code = 'USHACK' or n.invite_code !~ '^US[A-HJ-NP-Z2-9]{6}$' or n.referred_by is not null then
    raise exception 'FAIL: anketa: kod=% referred_by=%', n.invite_code, n.referred_by;
  end if;
  begin
    update public.masters set referred_by = '00000000-0000-4000-a700-000000000001' where id = auth.uid();
    raise exception 'FAIL: usta referred_by ni o''zi yozdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: taklif kodi server beradi (oson o''qiladi), usta uni va "kim taklif qildi"ni o''zi yoza olmaydi';
end $$;

-- Yangi usta taklif kodini kiritadi (kodni do'stidan oladi — boshqa ustaning qatorini o'qiy olmaydi)
reset role;
select set_config('test.icode', invite_code, false) from public.masters where id = '00000000-0000-4000-a700-000000000001';
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-a700-000000000002';
do $$ declare code text := current_setting('test.icode'); name text; begin
  begin
    perform public.apply_invite_code('USXXXXXX');
    raise exception 'FAIL: noto''g''ri kod qabul qilindi';
  exception when no_data_found then null;
  end;
  name := public.apply_invite_code(lower(code));
  if name <> 'Taklif' or (select referred_by from public.masters where id = auth.uid()) <> '00000000-0000-4000-a700-000000000001' then
    raise exception 'FAIL: kod qo''llanmadi: %', name;
  end if;
  raise notice 'PASS: yangi usta do''stining kodini kiritadi (katta-kichik harf farqi yo''q)';
end $$;
set request.jwt.claim.sub = '00000000-0000-4000-a700-000000000001';
do $$ declare code text; r record; begin
  select invite_code into code from public.masters where id = auth.uid();
  begin
    perform public.apply_invite_code(code);
    raise exception 'FAIL: o''z kodini kiritdi';
  exception when invalid_parameter_value then null;
  end;
  select * into r from public.my_invites();
  if r.code <> code or r.invited <> 1 or r.paid <> 0 then raise exception 'FAIL: my_invites: %', row_to_json(r); end if;
  raise notice 'PASS: o''z kodini kiritib bo''lmaydi; "Taklif qildim: 1, bonus: 0"';
end $$;
reset role;

-- 5-ish yakunlandi → taklif qilganga bonus (bir marta)
update public.masters set jobs_count = 4 where id = '00000000-0000-4000-a700-000000000002';
do $$ begin
  if (select balance from public.masters where id = '00000000-0000-4000-a700-000000000001') <> 0 then raise exception 'FAIL: 4-ishda bonus berildi'; end if;
end $$;
update public.masters set jobs_count = 5 where id = '00000000-0000-4000-a700-000000000002';
update public.masters set jobs_count = 6 where id = '00000000-0000-4000-a700-000000000002';
do $$ begin
  if (select balance from public.masters where id = '00000000-0000-4000-a700-000000000001') <> public.invite_bonus() then
    raise exception 'FAIL: bonus: %', (select balance from public.masters where id = '00000000-0000-4000-a700-000000000001');
  end if;
  if (select count(*) from public.balance_ops where master_id = '00000000-0000-4000-a700-000000000001' and kind = 'bonus' and note like 'invite:%') <> 1 then
    raise exception 'FAIL: balance_ops';
  end if;
  if not exists (select 1 from public.push_outbox where user_id = '00000000-0000-4000-a700-000000000001' and kind = 'inviteBonus') then
    raise exception 'FAIL: bonus haqida xabar yo''q';
  end if;
  raise notice 'PASS: do''st 5-ishni bajardi → taklif qilganga % so''m (bir marta), balans tarixi va xabar', public.invite_bonus();
end $$;

-- ---------- Promokodlar ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-a700-000000000002';
do $$ begin
  begin
    perform public.admin_save_promo('HACK', 50, 1000000, null, null, true);
    raise exception 'FAIL: usta promokod yaratdi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.promo_codes;
    raise exception 'FAIL: usta promokodlar ro''yxatini ko''rdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: promokodni faqat admin yaratadi, ro''yxat ustaga yopiq';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-a700-00000000000a';
select public.admin_save_promo('birinchi', 0, 20000, 1, null, true);
select public.admin_save_promo('UYSERVICE', 10, 0, null, null, true);
select public.admin_save_promo('ESKI', 5, 0, null, now() - interval '1 day', true);
do $$ begin
  begin
    perform public.admin_save_promo('BO SH', 0, 0, null, null, true);
    raise exception 'FAIL: noto''g''ri promokod saqlandi';
  exception when invalid_parameter_value then null;
  end;
  if (select count(*) from public.admin_promos()) <> 3 or not exists (select 1 from public.admin_log where action = 'promo' and target_id = 'BIRINCHI') then
    raise exception 'FAIL: admin_promos / jurnal';
  end if;
  raise notice 'PASS: admin promokod yaratadi (kod katta harfga), tekshiradi va jurnalga yozadi';
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-a700-000000000002';
do $$ declare r jsonb; m public.masters; begin
  r := public.redeem_promo(' birinchi ');
  if (r ->> 'bonus')::int <> 20000 then raise exception 'FAIL: redeem: %', r; end if;
  begin
    perform public.redeem_promo('BIRINCHI');
    raise exception 'FAIL: bir kod ikki marta';
  exception when unique_violation then null;
  end;
  begin
    perform public.redeem_promo('ESKI');
    raise exception 'FAIL: muddati o''tgan kod';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.redeem_promo('YOQ');
    raise exception 'FAIL: yo''q kod';
  exception when no_data_found then null;
  end;
  perform public.redeem_promo('UYSERVICE');
  select * into m from public.masters where id = auth.uid();
  if m.balance <> 20000 or m.priority_points <> 10 then raise exception 'FAIL: balans % prioritet %', m.balance, m.priority_points; end if;
  raise notice 'PASS: usta promokodni qo''llaydi: balans +20 000, prioritet +10; takror, eskirgan, yo''q kod — rad';
end $$;

-- Chegara: BIRINCHI faqat 1 marta (boshqa usta ham ishlata olmaydi)
set request.jwt.claim.sub = '00000000-0000-4000-a700-000000000001';
do $$ begin
  begin
    perform public.redeem_promo('BIRINCHI');
    raise exception 'FAIL: chegara ishlamadi';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: ishlatish chegarasi tugagan kod boshqa ustaga ham berilmaydi';
end $$;

-- Mijoz promokod ishlata olmaydi
set request.jwt.claim.sub = '00000000-0000-4000-a700-00000000000c';
do $$ begin
  begin
    perform public.redeem_promo('UYSERVICE');
    raise exception 'FAIL: mijoz promokod ishlatdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: promokod faqat ustalar uchun';
end $$;
reset role;
