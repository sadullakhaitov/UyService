-- UyService: asosiy jadvallar (CLAUDE.md, 6-bo'lim).
-- Koordinatalar oddiy lat/lng ustunlarida yoziladi (ilovaga qulay), PostGIS `location` ulardan o'zi hisoblanadi.

create extension if not exists postgis with schema extensions;

-- ---------- Turlar ----------
create type public.user_role as enum ('client', 'master', 'admin');
create type public.verify_status as enum ('none', 'pending', 'approved', 'rejected');
create type public.billing_plan as enum ('subscription', 'commission');
create type public.order_status as enum (
  'scheduled', 'searching', 'assigned', 'on_the_way', 'arrived', 'in_progress', 'completed', 'cancelled'
);
create type public.offer_status as enum ('sent', 'accepted', 'declined', 'expired');

-- ---------- Foydalanuvchilar ----------
-- Har bir auth.users uchun bitta qator (trigger o'zi yaratadi)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text unique,
  name text,
  role public.user_role not null default 'client',
  language text not null default 'uz' check (language in ('uz', 'ru', 'en')),
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Usta anketasi va holati
create table public.masters (
  id uuid primary key references public.profiles (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  experience_years int not null default 0 check (experience_years between 0 and 80),
  categories text[] not null default '{}',
  -- quyidagilarni usta o'zi o'zgartira olmaydi (trigger: masters_guard)
  rating numeric(3, 2) not null default 5.00 check (rating between 0 and 5),
  jobs_count int not null default 0,
  activity int not null default 80 check (activity between 0 and 100),
  priority_points int not null default 0,
  verify_status public.verify_status not null default 'none',
  verify_note text, -- rad etilsa sababi (admin yozadi)
  balance int not null default 0,
  subscription_until timestamptz,
  busy boolean not null default false,
  -- usta o'zi o'zgartiradi
  passport_path text, -- storage: documents/<id>/...
  selfie_path text,
  works text[] not null default '{}', -- storage: works/<id>/...
  billing_plan public.billing_plan,
  plan_changed_at timestamptz,
  online boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ustaning oxirgi joylashuvi (har 5 s yangilanadi)
create table public.master_locations (
  master_id uuid primary key references public.masters (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  heading real,
  updated_at timestamptz not null default now()
);
create index master_locations_location_idx on public.master_locations using gist (location);

-- ---------- Katalog ----------
create table public.categories (
  id text primary key, -- plumber, electric, aircon, furniture, repair, appliance
  call_fee int not null default 50000,
  sort int not null default 0,
  color_main text,
  color_tint text,
  active boolean not null default true
);

create table public.problems (
  id text primary key,
  category_id text not null references public.categories (id) on delete cascade,
  price_min int, -- null — "kelishiladi"
  price_max int,
  sort int not null default 0
);

-- ---------- Buyurtmalar ----------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  category_id text not null references public.categories (id),
  problem_id text references public.problems (id),
  description text,
  photos text[] not null default '{}', -- storage: order-photos/<client_id>/...
  address text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326)
    generated always as (extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography) stored,
  preferred_master_id uuid references public.masters (id) on delete set null, -- "Mening ustalarim"dan
  status public.order_status not null default 'searching',
  scheduled_at timestamptz, -- null — "Hozir kerak"
  master_id uuid references public.masters (id) on delete set null,
  dispatch jsonb, -- DispatchState (supabase/functions/_shared/dispatch.ts)
  dispatch_rev int not null default 0, -- bir vaqtda ikki yozuvdan himoya
  call_fee int not null default 50000,
  price_work int check (price_work >= 0),
  price_parts int check (price_parts >= 0),
  platform_fee int, -- komissiya tarifida ustadan olinadigan ulush
  cancel_reason text,
  cancelled_by text check (cancelled_by in ('client', 'master', 'system')),
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_at is not null)
);
create index orders_client_idx on public.orders (client_id, created_at desc);
create index orders_master_idx on public.orders (master_id, created_at desc);
create index orders_active_idx on public.orders (status) where status in ('scheduled', 'searching');

-- Ustaga yuborilgan takliflar (60 s)
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  master_id uuid not null references public.masters (id) on delete cascade,
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 seconds',
  status public.offer_status not null default 'sent',
  responded_at timestamptz,
  score int,
  eta_min int,
  distance_km real
);
create index offers_master_idx on public.offers (master_id, status);
create index offers_order_idx on public.offers (order_id);
-- bir buyurtma bo'yicha bitta ustaga bir vaqtda faqat bitta ochiq taklif
create unique index offers_one_open_idx on public.offers (order_id, master_id) where status = 'sent';

-- ---------- Baholash, sevimlilar ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  master_id uuid not null references public.masters (id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now()
);
create index reviews_master_idx on public.reviews (master_id);

-- "Mening ustalarim"
create table public.favorites (
  client_id uuid not null references public.profiles (id) on delete cascade,
  master_id uuid not null references public.masters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, master_id)
);

-- ---------- Tarif ----------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  master_id uuid not null references public.masters (id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  amount int not null check (amount >= 0),
  status text not null default 'paid' check (status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz not null default now(),
  check (period_end > period_start)
);
create index subscriptions_master_idx on public.subscriptions (master_id, period_end desc);

-- ---------- Chat ----------
-- Buyurtma chati (order_id) yoki qo'llab-quvvatlash chati (support_user_id) — ikkalasidan biri
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete cascade,
  support_user_id uuid references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (length(text) between 1 and 4000),
  created_at timestamptz not null default now(),
  check ((order_id is null) <> (support_user_id is null))
);
create index chat_messages_order_idx on public.chat_messages (order_id, created_at);
create index chat_messages_support_idx on public.chat_messages (support_user_id, created_at);
