-- UyService: serverdan push-bildirishnomalar (ilova yopiq bo'lsa ham keladi).
--
-- Qanday ishlaydi:
--   1) ilova Expo push tokenini profiles.push_token ga yozadi (lib/push.ts), til — profiles.language
--   2) buyurtma/taklif o'zgarganda triggerlar push_outbox navbatiga yozadi (kimga, qaysi xabar, qaysi ekran)
--   3) `push-send` Edge Function navbatni Expo Push API orqali yuboradi. Uni ikki yo'l bilan chaqiriladi:
--      - darhol: navbatga yozilganda pg_net bilan (configure_push sozlangan bo'lsa)
--      - zaxira: `offer-timeout` har 15 soniyada navbatni ham bo'shatadi
--
-- Yoqish (bir marta, Supabase → SQL Editor; CRON_SECRET — offer-timeout uchun yozilgan qiymatning o'zi):
--   select public.configure_push('https://<PROJECT_REF>.supabase.co', '<CRON_SECRET>');

-- Usta "Yangi buyurtma" bildirishnomasini o'chirib qo'yishi mumkin (Profil → Sozlamalar)
alter table public.profiles add column notify_offers boolean not null default true;

create table public.push_outbox (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- offer | found | arrived | price | done | none | cancelled | priceApproved | priceDeclined
  kind text not null,
  params jsonb not null default '{}'::jsonb,
  url text,
  created_at timestamptz not null default now(),
  -- yuborishga olingan payt (push-send ikki marta yubormasligi uchun "olib qo'yadi")
  claimed_at timestamptz,
  sent_at timestamptz,
  attempts int not null default 0,
  error text
);
create index push_outbox_pending_idx on public.push_outbox (created_at) where sent_at is null;

-- Faqat server: ilova bu jadvallarni ko'rmaydi va yozmaydi
create table public.app_settings (
  key text primary key,
  value text not null
);
alter table public.push_outbox enable row level security;
alter table public.app_settings enable row level security;
revoke all on public.push_outbox, public.app_settings from anon, authenticated;
revoke all on sequence public.push_outbox_id_seq from anon, authenticated;

-- Navbatga yozish: token bo'lmasa (ilova hali ro'yxatdan o'tkazmagan / web) — yozilmaydi
create or replace function public.enqueue_push(p_user uuid, p_kind text, p_params jsonb default '{}'::jsonb, p_url text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  if not exists (
    select 1 from public.profiles
    where id = p_user and push_token is not null and (p_kind <> 'offer' or notify_offers)
  ) then return; end if;
  insert into public.push_outbox (user_id, kind, params, url) values (p_user, p_kind, coalesce(p_params, '{}'::jsonb), p_url);
end $$;

-- Navbat to'ldi — push-send'ni darhol chaqirish (pg_net, so'rov tranzaksiya tugagach ketadi).
-- Sozlanmagan / pg_net yo'q bo'lsa jim o'tadi: xabar zaxira yo'l bilan (offer-timeout) ketadi
create or replace function public.push_kick() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_url text := (select value from public.app_settings where key = 'push_url');
  v_secret text := (select value from public.app_settings where key = 'cron_secret');
begin
  if v_url is null or v_secret is null then return null; end if;
  begin
    execute 'select net.http_post(url := $1, headers := $2, body := ''{}''::jsonb, timeout_milliseconds := 10000)'
      using v_url, jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret);
  exception when others then
    null; -- bildirishnoma yuborilmasa ham buyurtma o'zgarishi bekor bo'lmasin
  end;
  return null;
end $$;

create trigger push_outbox_kick
  after insert on public.push_outbox
  for each statement execute function public.push_kick();

-- push-send chaqiradi: yuboriladigan xabarlarni "olib qo'yadi" (bir vaqtda ikki chaqiruv bo'lsa ham bir marta)
create or replace function public.claim_push(p_limit int default 100)
returns table (id bigint, kind text, params jsonb, url text, token text, language text)
language sql security definer set search_path = public as $$
  with picked as (
    select o.id from public.push_outbox o
    where o.sent_at is null and o.attempts < 3 and o.created_at > now() - interval '15 minutes'
      and (o.claimed_at is null or o.claimed_at < now() - interval '1 minute')
    order by o.created_at
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  ), upd as (
    update public.push_outbox o
       set claimed_at = now(), attempts = o.attempts + 1
      from picked where o.id = picked.id
    returning o.id, o.kind, o.params, o.url, o.user_id
  )
  select upd.id, upd.kind, upd.params, upd.url, p.push_token, p.language
  from upd join public.profiles p on p.id = upd.user_id
  where p.push_token is not null
$$;

-- push-send natijani yozadi. p_dead — "DeviceNotRegistered" bo'lgan tokenlar (ilova o'chirilgan) — tozalanadi
create or replace function public.finish_push(p_sent bigint[], p_failed bigint[], p_error text default null, p_dead text[] default '{}')
returns void
language sql security definer set search_path = public as $$
  update public.push_outbox set sent_at = now(), error = null where id = any (coalesce(p_sent, '{}'));
  update public.push_outbox set claimed_at = null, error = p_error where id = any (coalesce(p_failed, '{}'));
  update public.profiles set push_token = null where push_token = any (coalesce(p_dead, '{}'));
  delete from public.push_outbox where sent_at < now() - interval '7 days' or created_at < now() - interval '7 days';
$$;

revoke execute on function public.enqueue_push(uuid, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.claim_push(int) from public, anon, authenticated;
revoke execute on function public.finish_push(bigint[], bigint[], text, text[]) from public, anon, authenticated;
revoke execute on function public.push_kick() from public, anon, authenticated;
grant execute on function public.claim_push(int) to service_role;
grant execute on function public.finish_push(bigint[], bigint[], text, text[]) to service_role;

-- ---------- Qachon nima yuboriladi (lib/notify.ts dagi mahalliy bildirishnomalar bilan bir xil) ----------

-- Ustaga: yangi buyurtma taklifi (60 s)
create or replace function public.offers_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if new.status <> 'sent' then return null; end if;
  select * into o from public.orders where id = new.order_id;
  perform public.enqueue_push(new.master_id, 'offer',
    jsonb_build_object('category', o.category_id, 'min', new.eta_min, 'km', new.distance_km),
    '/master/offer');
  return null;
end $$;

create trigger offers_push
  after insert on public.offers
  for each row execute function public.offers_push();

-- Mijoz va ustaga: buyurtma holati o'zgardi
create or replace function public.orders_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  track text := '/client/tracking?id=' || new.id;
  v_name text;
  v_min int;
begin
  -- Usta topildi
  if new.master_id is not null and old.master_id is null then
    select first_name into v_name from public.masters where id = new.master_id;
    select eta_min into v_min from public.offers
     where order_id = new.id and master_id = new.master_id order by sent_at desc limit 1;
    perform public.enqueue_push(new.client_id, 'found', jsonb_build_object('name', coalesce(v_name, ''), 'min', coalesce(v_min, 10)), track);
  end if;

  -- Qidiruv natijasiz tugadi ("Hozir bo'sh usta yo'q")
  if new.dispatch ->> 'done' = 'none' and (old.dispatch ->> 'done') is distinct from 'none' then
    perform public.enqueue_push(new.client_id, 'none', '{}'::jsonb, '/client/searching?id=' || new.id);
  end if;

  if new.status is distinct from old.status then
    if new.status = 'arrived' then
      perform public.enqueue_push(new.client_id, 'arrived', jsonb_build_object('category', new.category_id), track);
    elsif new.status = 'completed' then
      perform public.enqueue_push(new.client_id, 'done', '{}'::jsonb, '/client/rate?id=' || new.id);
      if new.price_status = 'declined' then
        perform public.enqueue_push(new.master_id, 'priceDeclined', jsonb_build_object('fee', new.call_fee), '/master/job');
      end if;
    elsif new.status = 'in_progress' and new.price_status = 'approved' then
      perform public.enqueue_push(new.master_id, 'priceApproved', '{}'::jsonb, '/master/job');
    elsif new.status = 'cancelled' and new.cancelled_by in ('client', 'admin') and old.master_id is not null then
      perform public.enqueue_push(old.master_id, 'cancelled', '{}'::jsonb, '/master');
    end if;
  end if;

  -- Usta narx yubordi
  if new.price_status = 'proposed' and old.price_status <> 'proposed' then
    perform public.enqueue_push(new.client_id, 'price',
      jsonb_build_object('sum', coalesce(new.price_work, 0) + coalesce(new.price_parts, 0)), track);
  end if;
  return null;
end $$;

create trigger orders_push
  after update on public.orders
  for each row execute function public.orders_push();

revoke execute on function public.offers_push() from public, anon, authenticated;
revoke execute on function public.orders_push() from public, anon, authenticated;

-- ---------- Sozlash (faqat SQL Editor'dan) ----------
create or replace function public.configure_push(p_project_url text, p_cron_secret text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  begin
    create extension if not exists pg_net with schema extensions;
  exception when others then
    raise exception 'pg_net yoqilmadi (%). Dashboard → Database → Extensions → pg_net ni yoqing', sqlerrm;
  end;
  insert into public.app_settings (key, value) values
    ('push_url', rtrim(p_project_url, '/') || '/functions/v1/push-send'),
    ('cron_secret', p_cron_secret)
  on conflict (key) do update set value = excluded.value;
end $$;

revoke execute on function public.configure_push(text, text) from public, anon, authenticated, service_role;
