-- UyService: admin yo'nalish va muammo turini qo'shadi/o'chiradi (migrations/…_catalog_edit.sql).
-- Har bir tekshiruv "PASS ..." deb yozadi; xato bo'lsa "FAIL ..." bilan to'xtaydi.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

-- AD — admin, C — mijoz
insert into auth.users (id, phone) values
  ('00000000-0000-4000-ce00-0000000000ad', '998907800001'),
  ('00000000-0000-4000-ce00-00000000000c', '998907800002');
update public.profiles set role = 'admin' where id = '00000000-0000-4000-ce00-0000000000ad';
create temp table ids (k text primary key, v text);
grant all on ids to authenticated;

-- ---------- Oddiy foydalanuvchi qo'sha/o'chira olmaydi ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ce00-00000000000c';
do $$ begin
  begin
    perform public.admin_create_category('Bog''bon', null, null, 'trees', 'green', 50000);
    raise exception 'FAIL: mijoz yo''nalish qo''shdi';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_delete_category('plumber', 'test');
    raise exception 'FAIL: mijoz yo''nalishni o''chirdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: oddiy foydalanuvchi katalogni o''zgartira olmaydi';
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform public.admin_create_problem('plumber', 'X', null, null, null, null);
    raise exception 'FAIL: mehmon muammo qo''shdi';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS: mehmon katalogni o''zgartira olmaydi';
end $$;
reset role;

-- ---------- Admin qo'shadi ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ce00-0000000000ad';
do $$ declare c text; p text; r public.categories; pr public.problems; begin
  c := public.admin_create_category('  Bog''bon ', 'Садовник', '', 'trees', 'green', 60000);
  select * into r from public.categories where id = c;
  if r.name_uz <> 'Bog''bon' or r.name_ru <> 'Садовник' or r.name_en <> 'Bog''bon' or not r.active or r.call_fee <> 60000
     or r.sort <= (select max(sort) from public.categories where id <> c) then
    raise exception 'FAIL: yo''nalish noto''g''ri saqlandi: %', row_to_json(r);
  end if;
  insert into ids values ('cat', c);
  raise notice 'PASS: yo''nalish qo''shildi (bo''sh tarjima — o''zbekchasi, oxirida)';

  begin
    perform public.admin_create_category('bog''BON', null, null, 'trees', 'green', 50000);
    raise exception 'FAIL: bir xil nomli yo''nalish qo''shildi';
  exception when unique_violation then null;
  end;
  begin
    perform public.admin_create_category('  ', null, null, 'trees', 'green', 50000);
    raise exception 'FAIL: nomsiz yo''nalish qo''shildi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_create_category('Tozalash', null, null, 'rocket', 'green', 50000);
    raise exception 'FAIL: noma''lum ikonka qabul qilindi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_create_category('Tozalash', null, null, 'sparkles', '#ff0000', 50000);
    raise exception 'FAIL: noma''lum rang qabul qilindi';
  exception when invalid_parameter_value then null;
  end;
  raise notice 'PASS: takror nom, bo''sh nom, noma''lum ikonka/rang rad etiladi';

  p := public.admin_create_problem(c, 'O''t o''rish', 'Покос травы', 'Lawn mowing', 100000, 300000);
  select * into pr from public.problems where id = p;
  if pr.category_id <> c or pr.price_min <> 100000 or pr.name_en <> 'Lawn mowing' then
    raise exception 'FAIL: muammo noto''g''ri saqlandi';
  end if;
  insert into ids values ('problem', p);
  perform public.admin_create_problem(c, 'Daraxt kesish', null, null, null, null);
  begin
    perform public.admin_create_problem(c, 'Gul', null, null, 100, null);
    raise exception 'FAIL: yarim narx oralig''i qabul qilindi';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.admin_create_problem('nope', 'Gul', null, null, null, null);
    raise exception 'FAIL: yo''q yo''nalishga muammo qo''shildi';
  exception when no_data_found then null;
  end;
  raise notice 'PASS: muammo turi qo''shildi, noto''g''ri narx/yo''nalish rad etiladi';

  if (select count(*) from public.admin_log where action in ('category_create', 'problem_create')) <> 3 then
    raise exception 'FAIL: jurnalga yozilmadi';
  end if;
  raise notice 'PASS: qo''shish jurnalga yozildi';
end $$;
reset role;

-- ---------- Mijoz yangi yo'nalishni ko'radi va buyurtma beradi ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ce00-00000000000c';
do $$ declare c text := (select v from ids where k = 'cat'); p text := (select v from ids where k = 'problem'); begin
  if not exists (select 1 from public.categories where id = c and name_uz = 'Bog''bon') then
    raise exception 'FAIL: mijoz yangi yo''nalishni ko''rmaydi';
  end if;
  insert into public.orders (client_id, category_id, problem_id, address, lat, lng)
  values (auth.uid(), c, p, 'Bog'' 1', 41.31, 69.27);
  if (select call_fee from public.orders where category_id = c) <> 60000 then
    raise exception 'FAIL: chaqiruv narxi yo''nalishdan olinmadi';
  end if;
  raise notice 'PASS: mijoz yangi yo''nalishga buyurtma beradi (chaqiruv narxi o''zidan)';
end $$;
reset role;

-- ---------- O'chirish ----------
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ce00-0000000000ad';
do $$ declare c text := (select v from ids where k = 'cat'); p text := (select v from ids where k = 'problem'); begin
  begin
    perform public.admin_delete_problem(p, ' ');
    raise exception 'FAIL: sababsiz o''chirildi';
  exception when invalid_parameter_value then null;
  end;
  perform public.admin_delete_problem(p, 'Takror');
  if (select deleted_at from public.problems where id = p) is null then raise exception 'FAIL: muammo o''chmadi'; end if;
  begin
    perform public.admin_update_problem(p, 1, 2);
    raise exception 'FAIL: o''chirilgan muammo tahrirlandi';
  exception when no_data_found then null;
  end;
  raise notice 'PASS: muammo turi sabab bilan o''chiriladi, keyin tahrirlanmaydi';

  perform public.admin_delete_category(c, 'Kerak emas');
  if (select active or deleted_at is null from public.categories where id = c) then raise exception 'FAIL: yo''nalish o''chmadi'; end if;
  if exists (select 1 from public.problems where category_id = c and deleted_at is null) then
    raise exception 'FAIL: yo''nalishning muammolari o''chmadi';
  end if;
  begin
    perform public.admin_update_category(c, 50000, true);
    raise exception 'FAIL: o''chirilgan yo''nalish qayta yoqildi';
  exception when no_data_found then null;
  end;
  -- o'chirilgan nom bilan yangisini qo'shsa bo'ladi
  perform public.admin_create_category('Bog''bon', null, null, 'flower', 'teal', 50000);
  raise notice 'PASS: yo''nalish o''chiriladi (muammolari bilan), qayta yoqilmaydi, nomi bo''shaydi';

  -- asl yo'nalishning muammosini ham o'chirsa bo'ladi
  perform public.admin_delete_problem('boiler', 'Kerak emas');
  if (select count(*) from public.admin_log where action in ('category_delete', 'problem_delete')) <> 3 then
    raise exception 'FAIL: o''chirish jurnalga yozilmadi';
  end if;
  raise notice 'PASS: asl muammo ham o''chadi; o''chirish jurnalga yozildi';
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-ce00-00000000000c';
do $$ declare c text := (select v from ids where k = 'cat'); begin
  begin
    insert into public.orders (client_id, category_id, address, lat, lng) values (auth.uid(), c, 'A', 41.31, 69.27);
    raise exception 'FAIL: o''chirilgan yo''nalishga buyurtma berildi';
  exception when check_violation then null;
  end;
  begin
    insert into public.orders (client_id, category_id, problem_id, address, lat, lng) values (auth.uid(), 'plumber', 'boiler', 'A', 41.31, 69.27);
    raise exception 'FAIL: o''chirilgan muammoga buyurtma berildi';
  exception when check_violation then null;
  end;
  -- eski buyurtma joyida, nomi o'qiladi
  if not exists (select 1 from public.orders o join public.categories k on k.id = o.category_id where k.id = c and k.name_uz = 'Bog''bon') then
    raise exception 'FAIL: eski buyurtma yoki nomi yo''qoldi';
  end if;
  raise notice 'PASS: o''chirilganga yangi buyurtma yo''q, eski buyurtma nomi bilan qoladi';
end $$;
reset role;
