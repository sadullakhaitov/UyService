-- UyService: admin yangi yo'nalish (kategoriya) va muammo turini qo'shadi va o'chiradi.
-- Asl 6 ta yo'nalish va 22 ta muammoning nomi ilovada (locales/*.json); admin qo'shganlarining nomi shu yerda (3 tilda).
-- O'chirish — "yumshoq": deleted_at qo'yiladi, ilovada ko'rinmaydi, yangi buyurtma berilmaydi,
-- lekin eski buyurtmalar tarixida nomi saqlanadi (orders.category_id / problem_id unga bog'langan).

alter table public.categories
  add column if not exists name_uz text,
  add column if not exists name_ru text,
  add column if not exists name_en text,
  add column if not exists icon text,      -- constants/categories.ts → CUSTOM_ICONS kaliti
  add column if not exists tone text,      -- constants/categories.ts → TONES kaliti
  add column if not exists deleted_at timestamptz;

alter table public.problems
  add column if not exists name_uz text,
  add column if not exists name_ru text,
  add column if not exists name_en text,
  add column if not exists deleted_at timestamptz;

-- Ilova bilan bir xil ro'yxatlar (constants/categories.ts)
create or replace function public.catalog_icons() returns text[]
language sql immutable as $$
  select array['wrench', 'hammer', 'trees', 'flower', 'sparkles', 'spray', 'truck', 'key', 'flame', 'tv', 'bug', 'shield']
$$;
create or replace function public.catalog_tones() returns text[]
language sql immutable as $$
  select array['green', 'teal', 'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'amber', 'brown', 'slate']
$$;

-- Nomlar: o'zbekchasi majburiy, ruscha/inglizcha bo'sh bo'lsa — o'zbekchasi
create or replace function public.catalog_names(p_uz text, p_ru text, p_en text)
returns text[]
language plpgsql immutable as $$
declare uz text := public.admin_clean(p_uz, 40);
begin
  if uz is null then raise exception 'admin: nomini yozing' using errcode = '22023'; end if;
  return array[uz, coalesce(public.admin_clean(p_ru, 40), uz), coalesce(public.admin_clean(p_en, 40), uz)];
end $$;

-- Yangi yo'nalish
create or replace function public.admin_create_category(
  p_name_uz text, p_name_ru text, p_name_en text, p_icon text, p_tone text, p_call_fee int default 50000)
returns text
language plpgsql security definer set search_path = public as $$
declare n text[]; v_id text; v_sort int;
begin
  perform public.assert_admin();
  n := public.catalog_names(p_name_uz, p_name_ru, p_name_en);
  if p_icon is null or not (p_icon = any (public.catalog_icons())) then
    raise exception 'admin: ikonka noto''g''ri' using errcode = '22023';
  end if;
  if p_tone is null or not (p_tone = any (public.catalog_tones())) then
    raise exception 'admin: rang noto''g''ri' using errcode = '22023';
  end if;
  if p_call_fee is null or p_call_fee < 0 or p_call_fee > 1000000 then
    raise exception 'admin: chaqiruv narxi 0–1 000 000' using errcode = '22023';
  end if;
  if exists (select 1 from public.categories where deleted_at is null and lower(name_uz) = lower(n[1])) then
    raise exception 'admin: bunday nomli yo''nalish bor' using errcode = '23505';
  end if;
  v_id := 'c' || substr(md5(gen_random_uuid()::text), 1, 8);
  select coalesce(max(sort), 0) + 1 into v_sort from public.categories;
  insert into public.categories (id, call_fee, sort, active, name_uz, name_ru, name_en, icon, tone)
  values (v_id, p_call_fee, v_sort, true, n[1], n[2], n[3], p_icon, p_tone);
  perform public.admin_write_log('category_create', 'category', v_id, jsonb_build_object(
    'name', n[1], 'icon', p_icon, 'tone', p_tone, 'call_fee', p_call_fee));
  return v_id;
end $$;

-- Yo'nalishni o'chirish (sabab bilan): muammolari ham o'chadi
create or replace function public.admin_delete_category(p_id text, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare c public.categories; reason text := public.admin_clean(p_reason);
begin
  perform public.assert_admin();
  if reason is null then raise exception 'admin: o''chirish sababini yozing' using errcode = '22023'; end if;
  select * into c from public.categories where id = p_id and deleted_at is null for update;
  if not found then raise exception 'admin: kategoriya topilmadi' using errcode = 'P0002'; end if;
  update public.categories set deleted_at = now(), active = false where id = p_id;
  update public.problems set deleted_at = now() where category_id = p_id and deleted_at is null;
  perform public.admin_write_log('category_delete', 'category', p_id, jsonb_build_object(
    'reason', reason, 'name', c.name_uz));
end $$;

-- Yangi muammo turi (narx oralig'i: ikkalasi null — "kelishiladi")
create or replace function public.admin_create_problem(
  p_category text, p_name_uz text, p_name_ru text, p_name_en text, p_min int, p_max int)
returns text
language plpgsql security definer set search_path = public as $$
declare n text[]; v_id text; v_sort int;
begin
  perform public.assert_admin();
  n := public.catalog_names(p_name_uz, p_name_ru, p_name_en);
  if (p_min is null) <> (p_max is null) or p_min < 0 or p_max > 100000000 or p_min > p_max then
    raise exception 'admin: narx oralig''i noto''g''ri' using errcode = '22023';
  end if;
  perform 1 from public.categories where id = p_category and deleted_at is null for update;
  if not found then raise exception 'admin: kategoriya topilmadi' using errcode = 'P0002'; end if;
  if exists (select 1 from public.problems where category_id = p_category and deleted_at is null and lower(name_uz) = lower(n[1])) then
    raise exception 'admin: bunday nomli muammo bor' using errcode = '23505';
  end if;
  v_id := 'p' || substr(md5(gen_random_uuid()::text), 1, 8);
  select coalesce(max(sort), 0) + 1 into v_sort from public.problems where category_id = p_category;
  insert into public.problems (id, category_id, price_min, price_max, sort, name_uz, name_ru, name_en)
  values (v_id, p_category, p_min, p_max, v_sort, n[1], n[2], n[3]);
  perform public.admin_write_log('problem_create', 'problem', v_id, jsonb_build_object(
    'name', n[1], 'category', p_category, 'price', jsonb_build_array(p_min, p_max)));
  return v_id;
end $$;

-- Muammo turini o'chirish (sabab bilan)
create or replace function public.admin_delete_problem(p_id text, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare pr public.problems; reason text := public.admin_clean(p_reason);
begin
  perform public.assert_admin();
  if reason is null then raise exception 'admin: o''chirish sababini yozing' using errcode = '22023'; end if;
  select * into pr from public.problems where id = p_id and deleted_at is null for update;
  if not found then raise exception 'admin: muammo topilmadi' using errcode = 'P0002'; end if;
  update public.problems set deleted_at = now() where id = p_id;
  perform public.admin_write_log('problem_delete', 'problem', p_id, jsonb_build_object(
    'reason', reason, 'name', pr.name_uz, 'category', pr.category_id));
end $$;

-- O'chirilganni tahrirlab bo'lmaydi (yoqib qo'yish ham — aks holda o'chirilgan yo'nalishga buyurtma ochilardi)
create or replace function public.admin_update_category(p_id text, p_call_fee int, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare c public.categories;
begin
  perform public.assert_admin();
  if p_call_fee is null or p_call_fee < 0 or p_call_fee > 1000000 then
    raise exception 'admin: chaqiruv narxi 0–1 000 000' using errcode = '22023';
  end if;
  select * into c from public.categories where id = p_id and deleted_at is null for update;
  if not found then raise exception 'admin: kategoriya topilmadi' using errcode = 'P0002'; end if;
  update public.categories set call_fee = p_call_fee, active = coalesce(p_active, true) where id = p_id;
  perform public.admin_write_log('category', 'category', p_id, jsonb_build_object(
    'call_fee', jsonb_build_array(c.call_fee, p_call_fee), 'active', jsonb_build_array(c.active, coalesce(p_active, true))));
end $$;

create or replace function public.admin_update_problem(p_id text, p_min int, p_max int)
returns void
language plpgsql security definer set search_path = public as $$
declare pr public.problems;
begin
  perform public.assert_admin();
  if (p_min is null) <> (p_max is null) or p_min < 0 or p_max > 100000000 or p_min > p_max then
    raise exception 'admin: narx oralig''i noto''g''ri' using errcode = '22023';
  end if;
  select * into pr from public.problems where id = p_id and deleted_at is null for update;
  if not found then raise exception 'admin: muammo topilmadi' using errcode = 'P0002'; end if;
  update public.problems set price_min = p_min, price_max = p_max where id = p_id;
  perform public.admin_write_log('problem', 'problem', p_id, jsonb_build_object(
    'from', jsonb_build_array(pr.price_min, pr.price_max), 'to', jsonb_build_array(p_min, p_max)));
end $$;

-- O'chirilgan muammo turiga yangi buyurtma berilmaydi (o'chirilgan yo'nalish — active = false, oldingi tekshiruv ushlaydi)
create or replace function public.orders_problem_alive() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.problem_id is not null and exists (select 1 from public.problems where id = new.problem_id and deleted_at is not null) then
    raise exception 'orders.problem_id: muammo turi o''chirilgan' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists orders_problem_alive on public.orders;
create trigger orders_problem_alive before insert on public.orders
  for each row execute function public.orders_problem_alive();

do $$ declare f text; begin
  foreach f in array array[
    'admin_create_category(text, text, text, text, text, int)', 'admin_delete_category(text, text)',
    'admin_create_problem(text, text, text, text, int, int)', 'admin_delete_problem(text, text)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $$;
