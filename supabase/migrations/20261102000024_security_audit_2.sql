-- Xavfsizlik tekshiruvi #2 (2-noyabr).
--  1) Ekrandagi kirish kodi (…_otp_on_screen.sql) orqali BEGONA HISOBGA KIRISH yopildi.
-- Teshik: otp_screen_code(raqam) ni har kim (anon) chaqira oladi. Hujumchi istalgan raqamga kod so'rab
-- (signInWithOtp), shu raqam uchun ekranga yozilgan kodni o'qib, o'sha odamning hisobiga kirardi — ustaning
-- balansi, hujjatlari, mijozning manzillari va buyurtmalari. Telegram'i bog'lanmagan har bir foydalanuvchi xavfda edi.
-- Endi kod ekranda faqat YANGI raqamga chiqadi (hali hech qachon kirmagan, buyurtmasi va usta anketasi yo'q) —
-- u yerda o'g'irlanadigan narsa yo'q. Avval kirgan odam kodni @uyservice_bot'dan oladi («Raqamni ulashish» —
-- raqam egasi ekanini Telegram tasdiqlaydi) yoki Eskiz ulangach SMS'dan. Ilova buni allaqachon ko'rsatadi
-- (auth.noChannel: "Botga kirib raqamingizni ulashing").
--  2) Chat va statistika jadvallarini skript bilan to'ldirib bazani to'xtatish — chegaralar (pastda).

create or replace function public.otp_screen_put(p_phone text, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  ids uuid[];
begin
  if d !~ '^998\d{9}$' or coalesce(p_code, '') !~ '^\d{4,10}$' then
    return false;
  end if;
  select coalesce(array_agg(distinct x.id), '{}') into ids from (
    select u.id from auth.users u where u.phone in (d, '+' || d)
    union
    select p.id from public.profiles p where p.phone in (d, '+' || d)
  ) x;
  -- Admin — hech qachon; avval kirgan, usta anketasi yoki buyurtmasi bor hisob — ekranda emas
  if exists (select 1 from public.profiles where id = any (ids) and role = 'admin')
     or exists (select 1 from auth.users where id = any (ids) and last_sign_in_at is not null)
     or exists (select 1 from public.masters where id = any (ids))
     or exists (select 1 from public.orders where client_id = any (ids)) then
    delete from public.otp_screen where phone = d;
    return false;
  end if;
  delete from public.otp_screen where created_at < now() - interval '1 hour';
  insert into public.otp_screen (phone, code) values (d, p_code)
    on conflict (phone) do update set code = excluded.code, created_at = now();
  return true;
end $$;
revoke execute on function public.otp_screen_put(text, text) from public, anon, authenticated;
grant execute on function public.otp_screen_put(text, text) to service_role;

-- Ekrandagi kod 10 emas, 5 daqiqa amal qiladi (Supabase kodi ham shuncha kerak bo'ladi)
create or replace function public.otp_screen_code(p_phone text) returns text
language sql stable security definer set search_path = public as $$
  select code from public.otp_screen
   where phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
     and created_at > now() - interval '5 minutes'
$$;
revoke execute on function public.otp_screen_code(text) from public;
grant execute on function public.otp_screen_code(text) to anon, authenticated, service_role;

-- Hozir turgan kodlar (eski qoida bilan yozilgan) — o'chiriladi
delete from public.otp_screen;

-- ---------- Bazani to'ldirib yuborish (bepul tarifda baza 500 MB, to'lsa — faqat o'qish rejimi) ----------
-- Chat: bitta hisob cheksiz xabar yoza olardi (qo'llab-quvvatlash chatiga skript bilan har biri 4000 belgi →
-- soatiga yuzlab MB). Endi: daqiqasiga 20 ta, sutkasiga 300 ta (odam bunga yetmaydi). Admin — cheklovsiz.
create index if not exists chat_messages_sender_idx on public.chat_messages (sender_id, created_at desc);

create or replace function public.chat_throttle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- server (service_role, auth.uid() yo'q) va admin — cheklovsiz. is_privileged() bu yerda yaramaydi:
  -- security definer ichida current_user — funksiya egasi
  if auth.uid() is null or public.is_admin() then return new; end if;
  if (select count(*) from public.chat_messages
       where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20
     or (select count(*) from public.chat_messages
          where sender_id = new.sender_id and created_at > now() - interval '1 day') >= 300 then
    raise exception 'chat: juda ko''p xabar, birozdan keyin yozing' using errcode = '54000';
  end if;
  new.created_at := now();
  return new;
end $$;
revoke execute on function public.chat_throttle() from public, anon, authenticated;
drop trigger if exists chat_messages_throttle on public.chat_messages;
create trigger chat_messages_throttle before insert on public.chat_messages
  for each row execute function public.chat_throttle();

-- Statistika (app_events / app_errors): cheklov qurilma bo'yicha edi — qurilma nomini har safar almashtirsa
-- (anon, kirmasdan) cheksiz yozardi. Endi kirmaganlar uchun umumiy chegara ham: daqiqasiga 600 hodisa / 100 xato.
create or replace function public.app_log_throttle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'app_events' then
    if (select count(*) from public.app_events where device = new.device and at > now() - interval '1 minute') >= 60 then return null; end if;
    if new.user_id is null and (select count(*) from (select 1 from public.app_events
          where at > now() - interval '1 minute' and user_id is null limit 600) x) >= 600 then return null; end if;
  else
    if (select count(*) from public.app_errors where device = new.device and at > now() - interval '1 minute') >= 20 then return null; end if;
    if new.user_id is null and (select count(*) from (select 1 from public.app_errors
          where at > now() - interval '1 minute' and user_id is null limit 100) x) >= 100 then return null; end if;
  end if;
  new.at := now();
  return new;
end $$;
revoke execute on function public.app_log_throttle() from public, anon, authenticated;
