-- UyService: Telegram orqali kirish (Mini App). Odam botdagi "Ochish" tugmasi bilan uyservice.uz'ni Telegram ichida
-- ochadi; Telegram raqamini tasdiqlab beradi — SMS kod kerak emas, keyingi ochilishlarda o'zi kiradi.
--   profiles.telegram_id — qaysi Telegram akkaunti shu profilga bog'langan (bitta Telegram — bitta profil)
--   telegram_contacts    — bot orqali ulashilgan raqamlar (telegram-bot webhook yozadi; telegram-auth o'qiydi)
-- Ikkalasini faqat server (Edge Functions, service_role) o'zgartiradi.

alter table public.profiles add column telegram_id bigint unique;

create table public.telegram_contacts (
  telegram_id bigint primary key,
  phone text not null,
  created_at timestamptz not null default now()
);
alter table public.telegram_contacts enable row level security;
revoke all on public.telegram_contacts from anon, authenticated;

-- Foydalanuvchi o'z telegram_id sini o'zgartira olmaydi (boshqa birovning Telegram'iga "ulanib" olmasin)
create or replace function public.profiles_telegram_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if not public.is_privileged() and new.telegram_id is distinct from old.telegram_id then
    raise exception 'profiles.telegram_id: faqat server bog''laydi' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_telegram_guard
  before update on public.profiles
  for each row execute function public.profiles_telegram_guard();

-- telegram-auth: shu email kimga tegishli (Telegram kirishi uchun yashirin email: tg<id>@telegram.uyservice.uz)
create or replace function public.auth_user_by_email(p_email text) returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1
$$;
revoke execute on function public.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;
