-- UyService: admin foydalanuvchi yoki usta hisobini o'chiradi (o'zi o'chirgandagidek: shaxsiy ma'lumot o'chadi,
-- kirish yopiladi, buyurtmalar tarixi anonim qoladi). Adminni (avval adminlikdan olib tashlash kerak) va o'zini — yo'q;
-- faol buyurtmasi bo'lsa — yo'q (avval buyurtmani bekor qiling). Sabab majburiy, jurnalga yoziladi.
-- O'chirilgan hisoblar admin ro'yxatlarida ko'rinmaydi. Fayllarni (Storage) admin panelning o'zi o'chiradi.

-- Umumiy tozalash (delete_my_account va admin_delete_account ishlatadi) — tashqaridan chaqirilmaydi
create or replace function public.wipe_account(uid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.masters set online = false, busy = false, first_name = '', last_name = '',
         passport_path = null, selfie_path = null, photo_path = null, works = '{}', verify_status = 'none'
   where id = uid;
  delete from public.master_locations where master_id = uid;
  delete from public.favorites where client_id = uid or master_id = uid;
  delete from public.chat_messages where support_user_id = uid;
  delete from public.push_outbox where user_id = uid and sent_at is null;
  delete from public.telegram_contacts where telegram_id = (select telegram_id from public.profiles where id = uid);
  update public.profiles set phone = null, name = null, push_token = null, telegram_id = null,
         blocked_at = now(), blocked_reason = 'deleted', deleted_at = now()
   where id = uid;

  -- Kirish: raqam bo'shatiladi, sessiyalar o'chiriladi, akkaunt bloklanadi
  begin
    update auth.users set phone = null, email = null, raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = uid;
    delete from auth.sessions where user_id = uid;
    delete from auth.identities where user_id = uid;
  exception when others then
    null; -- sinov muhitida auth sxemasi qisqartirilgan
  end;
end $$;
revoke execute on function public.wipe_account(uuid) from public, anon, authenticated;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'account: ruxsat yo''q' using errcode = '42501'; end if;
  if public.is_admin() then
    raise exception 'account: admin_self' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders
              where (client_id = uid or master_id = uid) and status not in ('completed', 'cancelled')) then
    raise exception 'account: active_orders' using errcode = 'P0001';
  end if;
  perform public.wipe_account(uid);
end $$;

create or replace function public.admin_delete_account(p_profile uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare p public.profiles; reason text := public.admin_clean(p_reason); is_m boolean;
begin
  perform public.assert_admin();
  if reason is null then raise exception 'admin: o''chirish sababini yozing' using errcode = '22023'; end if;
  select * into p from public.profiles where id = p_profile for update;
  if not found or p.deleted_at is not null then raise exception 'admin: foydalanuvchi topilmadi' using errcode = 'P0002'; end if;
  if p.id = auth.uid() or p.role = 'admin' then
    raise exception 'admin: admin_target' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders
              where (client_id = p.id or master_id = p.id) and status not in ('completed', 'cancelled')) then
    raise exception 'admin: active_orders' using errcode = 'P0001';
  end if;
  is_m := exists (select 1 from public.masters where id = p.id);
  perform public.wipe_account(p.id);
  -- Jurnalda kim o'chirilgani: ism va raqamning oxirgi 4 raqami (to'liq shaxsiy ma'lumot saqlanmaydi)
  perform public.admin_write_log('delete_account', case when is_m then 'master' else 'user' end, p.id::text,
    jsonb_build_object('reason', reason, 'name', p.name, 'phone', case when p.phone is null then null else '…' || right(p.phone, 4) end));
end $$;
revoke execute on function public.admin_delete_account(uuid, text) from public, anon;
grant execute on function public.admin_delete_account(uuid, text) to authenticated;

-- O'chirilgan hisoblar admin ro'yxatlarida ko'rinmaydi
create or replace view public.admin_masters with (security_invoker = true) as
  select m.id, m.first_name, m.last_name, p.phone, p.name, p.language, p.blocked_at, p.blocked_reason,
         m.experience_years, m.categories, m.rating, m.jobs_count, m.activity, m.priority_points,
         m.verify_status, m.verify_note, m.balance, m.subscription_until, m.busy, m.online,
         m.billing_plan, m.photo_path, m.passport_path, m.selfie_path, m.works, m.submitted_at, m.created_at,
         public.master_fee_percent(m) as fee_percent,
         public.master_can_take_orders(m) as can_take,
         l.lat, l.lng, l.updated_at as seen_at,
         (select count(*) from public.reviews r where r.master_id = m.id)::int as reviews_count,
         lower(concat_ws(' ', m.first_name, m.last_name, p.phone, p.name)) as search
  from public.masters m
  join public.profiles p on p.id = m.id
  left join public.master_locations l on l.master_id = m.id
  where public.is_admin() and p.deleted_at is null;

create or replace view public.admin_users with (security_invoker = true) as
  select p.id, p.phone, p.name, p.role, p.language, p.blocked_at, p.blocked_reason, p.created_at,
         exists (select 1 from public.masters m where m.id = p.id) as is_master,
         (select count(*) from public.orders o where o.client_id = p.id)::int as orders_count,
         (select count(*) from public.orders o where o.client_id = p.id and o.status = 'completed')::int as completed_count,
         (select coalesce(sum(public.order_total(o)), 0) from public.orders o where o.client_id = p.id and o.status = 'completed')::bigint as spent,
         (select max(o.created_at) from public.orders o where o.client_id = p.id) as last_order_at,
         lower(concat_ws(' ', p.name, p.phone)) as search
  from public.profiles p
  where public.is_admin() and p.deleted_at is null;
