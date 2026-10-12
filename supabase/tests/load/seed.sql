-- Yuklama sinovi uchun soxta foydalanuvchilar (faqat lokal baza!): :clients mijoz, :masters usta, :history eski buyurtma.
-- Hammasi "LOAD-" belgili; haqiqiy loyihaga hech qachon yuklanmaydi (supabase/tests/load/run.sh faqat lokal bazani ishlatadi).
\set ON_ERROR_STOP 1
set session_replication_role = replica; -- triggerlar o'chiq: tez yuklash (limitlar, push, guard)

insert into auth.users (id, phone)
select ('00000000-0000-4000-d000-' || lpad(n::text, 12, '0'))::uuid, '99890' || lpad((1000000 + n)::text, 7, '0')
from generate_series(1, :clients) n;
insert into auth.users (id, phone)
select ('00000000-0000-4000-e000-' || lpad(n::text, 12, '0'))::uuid, '99891' || lpad((1000000 + n)::text, 7, '0')
from generate_series(1, :masters) n;

insert into public.profiles (id, phone, name, role)
select id, '+' || phone, 'LOAD-' || right(id::text, 4), (case when id::text like '%-e000-%' then 'master' else 'client' end)::public.user_role
from auth.users where id::text like '00000000-0000-4000-d000-%' or id::text like '00000000-0000-4000-e000-%'
on conflict (id) do update set name = excluded.name, role = excluded.role;

-- Ustalar: 2 ta yo'nalish (6 tadan), Toshkent markazidan ~7 km ichida, tasdiqlangan, balans yetarli
insert into public.masters (id, first_name, last_name, categories, verify_status, balance, online, rating, activity, billing_plan)
select ('00000000-0000-4000-e000-' || lpad(n::text, 12, '0'))::uuid, 'LOAD', 'Usta ' || n,
       array[(array['plumber','electric','aircon','furniture','repair','appliance'])[1 + n % 6],
             (array['plumber','electric','aircon','furniture','repair','appliance'])[1 + (n / 6) % 6]],
       'approved', 1000000, false, 4 + (n % 10) / 10.0, 60 + n % 40, 'commission'
from generate_series(1, :masters) n;
insert into public.master_locations (master_id, lat, lng)
select ('00000000-0000-4000-e000-' || lpad(n::text, 12, '0'))::uuid,
       41.311 + (random() - 0.5) * 0.12, 69.279 + (random() - 0.5) * 0.16
from generate_series(1, :masters) n;

-- Eski buyurtmalar (bir necha oylik ish): jadvallar bo'sh bo'lmasin, so'rovlar haqiqiy hajmda sinalsin
insert into public.orders (client_id, master_id, category_id, lat, lng, status, price_status, price_work, call_fee, created_at, updated_at, completed_at)
select ('00000000-0000-4000-d000-' || lpad((1 + n % :clients)::text, 12, '0'))::uuid,
       ('00000000-0000-4000-e000-' || lpad((1 + n % :masters)::text, 12, '0'))::uuid,
       (array['plumber','electric','aircon','furniture','repair','appliance'])[1 + n % 6],
       41.31, 69.28, 'completed', 'approved', 120000, 50000,
       now() - (n % 90 + 2) * interval '1 day', now() - (n % 90 + 2) * interval '1 day', now() - (n % 90 + 2) * interval '1 day'
from generate_series(1, :history) n;
insert into public.chat_messages (order_id, sender_id, text, created_at)
select o.id, o.client_id, 'LOAD eski xabar', o.created_at from public.orders o where o.status = 'completed' limit :history;

set session_replication_role = origin;
analyze;
