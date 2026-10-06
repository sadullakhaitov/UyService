-- UyService: kim nimani ko'radi va yozadi (Row Level Security). Hamma jadvalda yoqilgan.
-- Admin (profiles.role = 'admin') — hamma narsa. Edge Function'lar service_role bilan ishlaydi (RLS'dan tashqarida).

-- Jadvallararo tekshiruvlar — SECURITY DEFINER (siyosatlar bir-biriga aylanib qolmasligi uchun)
create or replace function public.is_order_client(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders where id = p_order and client_id = auth.uid())
$$;

-- Buyurtmaning ikki tomoni: mijoz yoki tayinlangan usta
create or replace function public.is_order_party(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders
    where id = p_order and (client_id = auth.uid() or master_id = auth.uid())
  )
$$;

-- Ustaga shu buyurtma bo'yicha ochiq taklif bormi
create or replace function public.has_open_offer(p_order uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.offers
    where order_id = p_order and master_id = auth.uid() and status = 'sent'
  )
$$;

-- Bu usta mening faol buyurtmamga tayinlanganmi (joylashuvini ko'rish uchun)
create or replace function public.is_my_active_master(p_master uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders
    where client_id = auth.uid() and master_id = p_master
      and status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
  )
$$;

-- Faol buyurtmadagi qarshi tomon (mijoz ↔ usta) — ism va telefon ko'rinadi
create or replace function public.is_active_counterpart(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders
    where status in ('assigned', 'on_the_way', 'arrived', 'in_progress')
      and ((client_id = auth.uid() and master_id = p_profile) or (master_id = auth.uid() and client_id = p_profile))
  )
$$;

alter table public.profiles enable row level security;
alter table public.masters enable row level security;
alter table public.master_locations enable row level security;
alter table public.categories enable row level security;
alter table public.problems enable row level security;
alter table public.orders enable row level security;
alter table public.offers enable row level security;
alter table public.reviews enable row level security;
alter table public.favorites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.chat_messages enable row level security;

-- Admin — hamma jadvalda hamma narsa
do $$
declare t text;
begin
  foreach t in array array['profiles', 'masters', 'master_locations', 'categories', 'problems', 'orders',
                           'offers', 'reviews', 'favorites', 'subscriptions', 'chat_messages'] loop
    execute format(
      'create policy "admin: hammasi" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- profiles ----------
create policy "profiles: o'zim" on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy "profiles: faol buyurtmadagi qarshi tomon" on public.profiles for select to authenticated
  using (public.is_active_counterpart(id));
create policy "profiles: o'zim yarataman" on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "profiles: o'zim o'zgartiraman" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- masters ----------
-- To'liq qator (balans, hujjatlar) faqat ustaning o'ziga; mijozlar — public.master_cards orqali
create policy "masters: o'zim" on public.masters for select to authenticated
  using (id = (select auth.uid()));
create policy "masters: anketa yarataman" on public.masters for insert to authenticated
  with check (id = (select auth.uid()));
create policy "masters: o'zim o'zgartiraman" on public.masters for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Ustaning ochiq kartochkasi (tasdiqlanganlar): ism, reyting, kategoriyalar, ish namunalari
create view public.master_cards as
  select id, first_name, last_name, experience_years, categories, rating, jobs_count, works
  from public.masters
  where verify_status = 'approved';
grant select on public.master_cards to anon, authenticated;

-- ---------- master_locations ----------
create policy "master_locations: o'zim" on public.master_locations for all to authenticated
  using (master_id = (select auth.uid())) with check (master_id = (select auth.uid()));
create policy "master_locations: mening ustam" on public.master_locations for select to authenticated
  using (public.is_my_active_master(master_id));

-- ---------- categories, problems ----------
create policy "categories: hamma o'qiydi" on public.categories for select to anon, authenticated using (true);
create policy "problems: hamma o'qiydi" on public.problems for select to anon, authenticated using (true);

-- ---------- orders ----------
create policy "orders: mijoz" on public.orders for select to authenticated
  using (client_id = (select auth.uid()));
create policy "orders: usta (tayinlangan)" on public.orders for select to authenticated
  using (master_id = (select auth.uid()));
create policy "orders: usta (taklif)" on public.orders for select to authenticated
  using (public.has_open_offer(id));
create policy "orders: mijoz yaratadi" on public.orders for insert to authenticated
  with check (client_id = (select auth.uid()));
-- qaysi ustunlar o'zgarishi mumkinligini trigger tekshiradi (orders_guard)
create policy "orders: mijoz yoki usta o'zgartiradi" on public.orders for update to authenticated
  using (client_id = (select auth.uid()) or master_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) or master_id = (select auth.uid()));

-- ---------- offers ----------
-- Faqat ustaning o'ziga; yaratish va javob — Edge Function'lar orqali
create policy "offers: usta" on public.offers for select to authenticated
  using (master_id = (select auth.uid()));

-- ---------- reviews ----------
create policy "reviews: mijoz yoki usta o'qiydi" on public.reviews for select to authenticated
  using (client_id = (select auth.uid()) or master_id = (select auth.uid()));
create policy "reviews: mijoz ish tugagach yozadi" on public.reviews for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = (select auth.uid())
        and o.status = 'completed' and o.master_id = reviews.master_id
    )
  );

-- ---------- favorites ----------
create policy "favorites: o'zim" on public.favorites for all to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));

-- ---------- subscriptions ----------
create policy "subscriptions: usta o'qiydi" on public.subscriptions for select to authenticated
  using (master_id = (select auth.uid()));

-- ---------- chat_messages ----------
create policy "chat: buyurtma tomonlari o'qiydi" on public.chat_messages for select to authenticated
  using ((order_id is not null and public.is_order_party(order_id)) or support_user_id = (select auth.uid()));
create policy "chat: buyurtma tomonlari yozadi" on public.chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and ((order_id is not null and public.is_order_party(order_id)) or support_user_id = (select auth.uid()))
  );
