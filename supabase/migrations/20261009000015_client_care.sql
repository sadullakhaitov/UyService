-- Mijoz va usta uchun "unutiladigan" qismlar (tanqidiy ko'rib chiqishdan keyin, 9-oktabr):
-- 1) manzil tafsiloti, 2) suiiste'mollikdan himoya (faol buyurtmalar chegarasi), 3) murojaatlar (muammo, kafolat,
-- mijoz eshikni ochmadi), 4) hisobni o'chirish, 5) o'z statistikamiz va xatolar jurnali.

-- ---------- 1. Manzil tafsiloti (ko'p qavatli uy): usta adashmasligi uchun ----------
alter table public.orders
  add column entrance text check (char_length(entrance) <= 12),
  add column floor text check (char_length(floor) <= 12),
  add column apartment text check (char_length(apartment) <= 12),
  add column intercom text check (char_length(intercom) <= 12),
  add column landmark text check (char_length(landmark) <= 120);

-- ---------- 2. Suiiste'mollikdan himoya ----------
-- Bir mijozda bir vaqtda ko'pi bilan 3 ta faol buyurtma, sutkasiga 10 ta; 30 kunda 3 marta "eshikni ochmadi" bo'lsa —
-- yangi buyurtma admin bilan gaplashguncha yopiladi. Admin va server cheklanmaydi.
-- security definer EMAS: is_privileged() chaqiruvchining rolini ko'rishi kerak (mijoz o'z buyurtmalarini RLS bilan ko'radi)
create or replace function public.orders_limits() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_privileged() then return new; end if;
  if (select count(*) from public.orders
       where client_id = new.client_id and status not in ('completed', 'cancelled')) >= 3 then
    raise exception 'orders: too_many_active' using errcode = 'P0001';
  end if;
  if (select count(*) from public.orders
       where client_id = new.client_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'orders: too_many_today' using errcode = 'P0001';
  end if;
  if (select count(*) from public.orders
       where client_id = new.client_id and cancel_reason = 'client_absent'
         and updated_at > now() - interval '30 days') >= 3 then
    raise exception 'orders: no_show_limit' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger orders_limits
  before insert on public.orders
  for each row execute function public.orders_limits();

-- ---------- 3. Murojaatlar: muammo, kafolat, mijoz eshikni ochmadi ----------
-- Har bir murojaat qo'llab-quvvatlash chatiga ham yoziladi (admin o'sha yerda javob beradi) va buyurtma sahifasida ko'rinadi.
create table public.order_reports (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('warranty', 'overcharge', 'quality', 'no_show_master', 'client_absent', 'other')),
  text text check (char_length(text) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text check (char_length(resolution) <= 1000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index order_reports_order_idx on public.order_reports (order_id);
create index order_reports_open_idx on public.order_reports (created_at desc) where status = 'open';
alter table public.order_reports enable row level security;
create policy "reports: o'zimniki" on public.order_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
grant select on public.order_reports to authenticated;

create or replace function public.report_label(p_kind text) returns text
language sql immutable as $$
  select case p_kind
    when 'warranty' then 'Kafolat bo''yicha murojaat'
    when 'overcharge' then 'Kelishilgandan ko''p pul olindi'
    when 'quality' then 'Ish sifatsiz'
    when 'no_show_master' then 'Usta kelmadi'
    when 'client_absent' then 'Mijoz eshikni ochmadi'
    else 'Boshqa muammo' end
$$;

-- Mijoz: muammo yoki kafolat. Kafolat — yakunlangan, narxga rozi bo'lingan va 30 kun o'tmagan buyurtmaga
create or replace function public.report_order(p_order uuid, p_kind text, p_text text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  uid uuid := auth.uid();
  txt text := nullif(left(btrim(coalesce(p_text, '')), 1000), '');
  rid uuid;
begin
  select * into o from public.orders where id = p_order;
  if not found or o.client_id is distinct from uid then
    raise exception 'reports: ruxsat yo''q' using errcode = '42501';
  end if;
  if p_kind not in ('warranty', 'overcharge', 'quality', 'no_show_master', 'other') then
    raise exception 'reports: noto''g''ri tur' using errcode = '22023';
  end if;
  if p_kind = 'warranty' and not (o.status = 'completed' and o.price_status = 'approved'
       and o.completed_at > now() - interval '30 days') then
    raise exception 'reports: warranty_expired' using errcode = '22023';
  end if;
  if p_kind in ('overcharge', 'quality', 'other') and txt is null then
    raise exception 'reports: text_required' using errcode = '22023';
  end if;
  if (select count(*) from public.order_reports where reporter_id = uid and status = 'open') >= 5 then
    raise exception 'reports: too_many_open' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.order_reports where order_id = p_order and reporter_id = uid and kind = p_kind and status = 'open') then
    raise exception 'reports: already_open' using errcode = '23505';
  end if;
  insert into public.order_reports (order_id, reporter_id, kind, text) values (p_order, uid, p_kind, txt) returning id into rid;
  insert into public.chat_messages (support_user_id, sender_id, text)
  values (uid, uid, left(public.report_label(p_kind) || ' · #' || left(p_order::text, 8) || coalesce(E'\n' || txt, ''), 2000));
  return rid;
end $$;

-- Usta: yetib keldi, lekin mijoz eshikni ochmadi / javob bermadi. Buyurtma yopiladi (to'lovsiz), aktivlik kamaymaydi,
-- mijozga xabar boradi; 30 kunda 3 marta bo'lsa mijoz yangi buyurtma bera olmaydi (orders_limits)
create or replace function public.master_client_absent(p_order uuid, p_text text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  uid uuid := auth.uid();
  txt text := nullif(left(btrim(coalesce(p_text, '')), 1000), '');
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.master_id is distinct from uid then
    raise exception 'orders: ruxsat yo''q' using errcode = '42501';
  end if;
  if o.status <> 'arrived' then
    raise exception 'orders: faqat yetib kelgandan keyin' using errcode = '22023';
  end if;
  update public.orders set status = 'cancelled', cancelled_by = 'master', cancel_reason = 'client_absent' where id = p_order;
  update public.masters set busy = false where id = uid;
  insert into public.order_reports (order_id, reporter_id, kind, text) values (p_order, uid, 'client_absent', txt);
  perform public.enqueue_push(o.client_id, 'absent', '{}'::jsonb, '/client/history');
end $$;

-- Admin: murojaatlar ro'yxati va yopish (jurnalga yoziladi)
create or replace view public.admin_reports with (security_invoker = true) as
  select r.id, r.order_id, r.kind, r.text, r.status, r.resolution, r.resolved_at, r.created_at,
         r.reporter_id, p.name as reporter_name, p.phone as reporter_phone,
         (r.reporter_id = o.master_id) as by_master,
         o.category_id, o.problem_id, o.status as order_status, o.client_id, o.master_id,
         nullif(concat_ws(' ', m.first_name, m.last_name), '') as master_name
  from public.order_reports r
  join public.profiles p on p.id = r.reporter_id
  join public.orders o on o.id = r.order_id
  left join public.masters m on m.id = o.master_id
  where public.is_admin();
grant select on public.admin_reports to authenticated;

alter table public.admin_log drop constraint admin_log_target_type_check;
alter table public.admin_log add constraint admin_log_target_type_check
  check (target_type in ('master', 'user', 'order', 'review', 'category', 'problem', 'support', 'promo', 'report'));

create or replace function public.admin_resolve_report(p_report uuid, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare note text := public.admin_clean(p_note); r public.order_reports;
begin
  perform public.assert_admin();
  if note is null then raise exception 'admin: yechimni yozing' using errcode = '22023'; end if;
  select * into r from public.order_reports where id = p_report for update;
  if not found then raise exception 'admin: murojaat topilmadi' using errcode = 'P0002'; end if;
  if r.status = 'resolved' then raise exception 'admin: murojaat allaqachon yopilgan' using errcode = '22023'; end if;
  update public.order_reports set status = 'resolved', resolution = note, resolved_by = auth.uid(), resolved_at = now() where id = p_report;
  perform public.admin_write_log('report_resolve', 'report', p_report::text, jsonb_build_object('kind', r.kind, 'order', r.order_id, 'note', note));
end $$;

-- Buyurtmalar ro'yxati: uy tafsiloti va ochiq murojaatlar soni (ustunlar oxiriga qo'shiladi)
create or replace view public.admin_orders with (security_invoker = true) as
  select o.id, o.status, o.category_id, o.problem_id, o.description, o.photos, o.address, o.lat, o.lng,
         o.scheduled_at, o.created_at, o.accepted_at, o.completed_at, o.updated_at,
         o.call_fee, o.price_work, o.price_parts, public.order_total(o) as total, o.platform_fee,
         o.cancel_reason, o.cancelled_by, o.preferred_master_id,
         o.client_id, c.name as client_name, c.phone as client_phone,
         o.master_id, nullif(concat_ws(' ', m.first_name, m.last_name), '') as master_name, mp.phone as master_phone,
         lower(concat_ws(' ', o.id::text, o.address, c.name, c.phone, m.first_name, m.last_name, mp.phone)) as search,
         o.entrance, o.floor, o.apartment, o.intercom, o.landmark,
         (select count(*)::int from public.order_reports r where r.order_id = o.id and r.status = 'open') as open_reports
  from public.orders o
  join public.profiles c on c.id = o.client_id
  left join public.masters m on m.id = o.master_id
  left join public.profiles mp on mp.id = o.master_id
  where public.is_admin();

-- Push: "Ish tugadi" — mijozga chek (jami summa, naqd); "Mijoz eshikni ochmadi" — mijozga
create or replace function public.orders_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  track text := '/client/tracking?id=' || new.id;
  v_name text;
  v_min int;
begin
  if new.master_id is not null and old.master_id is null then
    select first_name into v_name from public.masters where id = new.master_id;
    select eta_min into v_min from public.offers
     where order_id = new.id and master_id = new.master_id order by sent_at desc limit 1;
    perform public.enqueue_push(new.client_id, 'found', jsonb_build_object('name', coalesce(v_name, ''), 'min', coalesce(v_min, 10)), track);
  end if;

  if new.master_id is null and old.master_id is not null and new.status = 'searching' then
    perform public.enqueue_push(new.client_id, 'requeued', '{}'::jsonb, '/client/searching?id=' || new.id);
  end if;

  if new.dispatch ->> 'done' = 'none' and (old.dispatch ->> 'done') is distinct from 'none' then
    perform public.enqueue_push(new.client_id, 'none', '{}'::jsonb, '/client/searching?id=' || new.id);
  end if;

  if new.status is distinct from old.status then
    if new.status = 'arrived' then
      perform public.enqueue_push(new.client_id, 'arrived', jsonb_build_object('category', new.category_id), track);
    elsif new.status = 'completed' then
      perform public.enqueue_push(new.client_id, 'done',
        jsonb_build_object('sum', public.order_total(new), 'inspection', new.price_status = 'declined'), '/client/rate?id=' || new.id);
      if new.price_status = 'declined' then
        perform public.enqueue_push(new.master_id, 'priceDeclined', jsonb_build_object('fee', new.call_fee), '/master/job');
      end if;
    elsif new.status = 'in_progress' and new.price_status = 'approved' then
      perform public.enqueue_push(new.master_id, 'priceApproved', '{}'::jsonb, '/master/job');
    elsif new.status = 'cancelled' and new.cancelled_by in ('client', 'admin') and old.master_id is not null then
      perform public.enqueue_push(old.master_id, 'cancelled', '{}'::jsonb, '/master');
    end if;
  end if;

  if new.price_status = 'proposed' and old.price_status <> 'proposed' then
    perform public.enqueue_push(new.client_id, 'price',
      jsonb_build_object('sum', coalesce(new.price_work, 0) + coalesce(new.price_parts, 0)), track);
  end if;
  return null;
end $$;

-- ---------- 4. Hisobni o'chirish (App Store talabi va qonun) ----------
-- Shaxsiy ma'lumot o'chiriladi: raqam, ism, push, Telegram, ustaning ismi/hujjatlari/ish rasmlari yo'llari, joylashuvi,
-- qo'llab-quvvatlash yozishmalari; kirish yopiladi (shu raqam bilan keyin yangi akkaunt ochsa bo'ladi).
-- Buyurtmalar, baholar va balans tarixi anonim holda qoladi (boshqa tomon va hisob-kitob uchun kerak).
-- Fayllarni (Storage) ilova o'zi o'chiradi — foydalanuvchi faqat o'z papkasini o'chira oladi.
alter table public.profiles add column deleted_at timestamptz;

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

  update public.masters set online = false, busy = false, first_name = '', last_name = '',
         passport_path = null, selfie_path = null, photo_path = null, works = '{}', verify_status = 'none'
   where id = uid;
  delete from public.master_locations where master_id = uid;
  delete from public.favorites where client_id = uid;
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

-- ---------- 5. O'z statistikamiz va xatolar jurnali (uchinchi tomon xizmatisiz) ----------
-- Voronka: ilova ochildi → buyurtma ekrani → yuborildi → raqam → kirdi → buyurtma yaratildi; usta anketasi.
-- Faqat yoziladi (anon ham), o'qish — faqat admin. Har qurilma daqiqasiga ko'pi bilan 60 yozuv.
create table public.app_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  device text not null check (char_length(device) between 8 and 64),
  name text not null check (name in ('app_open', 'order_open', 'order_submit', 'phone_open', 'signed_in', 'order_created',
    'order_failed', 'no_master', 'order_completed', 'rated', 'master_register_open', 'master_registered', 'master_online',
    'report_sent', 'account_deleted')),
  props jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2000),
  platform text check (platform in ('web', 'ios', 'android', 'telegram'))
);
create index app_events_at_idx on public.app_events (at desc);
create index app_events_device_idx on public.app_events (device, at desc);

create table public.app_errors (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  device text not null check (char_length(device) between 8 and 64),
  message text not null check (char_length(message) <= 500),
  stack text check (char_length(stack) <= 4000),
  screen text check (char_length(screen) <= 200),
  platform text check (platform in ('web', 'ios', 'android', 'telegram')),
  version text check (char_length(version) <= 40)
);
create index app_errors_at_idx on public.app_errors (at desc);

alter table public.app_events enable row level security;
alter table public.app_errors enable row level security;
create policy "events: yozish" on public.app_events for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy "errors: yozish" on public.app_errors for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
create policy "events: admin" on public.app_events for select to authenticated using (public.is_admin());
create policy "errors: admin" on public.app_errors for select to authenticated using (public.is_admin());
grant insert on public.app_events, public.app_errors to anon, authenticated;
grant select on public.app_events, public.app_errors to authenticated;
grant usage on sequence public.app_events_id_seq, public.app_errors_id_seq to anon, authenticated;

-- Bir qurilmadan juda ko'p yozuv — jim tashlanadi (xato qaytarilmaydi, ilova to'xtamaydi)
create or replace function public.app_log_throttle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'app_events' then
    if (select count(*) from public.app_events where device = new.device and at > now() - interval '1 minute') >= 60 then return null; end if;
  else
    if (select count(*) from public.app_errors where device = new.device and at > now() - interval '1 minute') >= 20 then return null; end if;
  end if;
  new.at := now();
  return new;
end $$;
create trigger app_events_throttle before insert on public.app_events for each row execute function public.app_log_throttle();
create trigger app_errors_throttle before insert on public.app_errors for each row execute function public.app_log_throttle();

-- Admin: voronka (har bosqichda nechta qurilma) va eng ko'p uchragan xatolar
create or replace function public.admin_funnel(p_days int default 7)
returns table (name text, devices bigint, events bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
    select e.name, count(distinct e.device), count(*)
    from public.app_events e
    where e.at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
    group by e.name;
end $$;

create or replace function public.admin_errors(p_days int default 7)
returns table (message text, screen text, platform text, count bigint, devices bigint, last_at timestamptz, stack text)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
    select x.message, x.screen, x.platform, count(*), count(distinct x.device), max(x.at),
           (array_agg(x.stack order by x.at desc))[1]
    from public.app_errors x
    where x.at > now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)))
    group by x.message, x.screen, x.platform
    order by max(x.at) desc
    limit 100;
end $$;

-- ---------- Huquqlar ----------
revoke execute on function public.orders_limits(), public.app_log_throttle(), public.report_label(text) from public, anon, authenticated;
revoke execute on function public.report_order(uuid, text, text), public.master_client_absent(uuid, text),
  public.delete_my_account(), public.admin_resolve_report(uuid, text), public.admin_funnel(int), public.admin_errors(int)
  from public, anon;
grant execute on function public.report_order(uuid, text, text), public.master_client_absent(uuid, text),
  public.delete_my_account(), public.admin_resolve_report(uuid, text), public.admin_funnel(int), public.admin_errors(int)
  to authenticated;
