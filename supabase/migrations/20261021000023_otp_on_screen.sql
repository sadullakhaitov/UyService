-- VAQTINCHA (21-oktabr, Eskiz SMS paketi olinguncha): kirish kodi ekranda.
-- Raqam egasining Telegram'i ma'lum bo'lsa kod avvalgidek @uyservice_bot'dan keladi. Ma'lum bo'lmasa va Eskiz
-- ulanmagan bo'lsa — send-sms hook kodni shu jadvalga yozadi, ilova kod ekranida uni ko'rsatadi (otp_screen_code).
-- Eskiz ulansa (ESKIZ_EMAIL siri) — kod yana SMS bilan ketadi, bu jadval ishlatilmaydi. O'chirish: OTP_ON_SCREEN=off.
-- Admin raqamlariga kod hech qachon ekranda chiqmaydi (admin panel himoyasi) — ular Telegram orqali oladi.

create table public.otp_screen (
  phone text primary key, -- faqat raqamlar: 998XXXXXXXXX
  code text not null,
  created_at timestamptz not null default now()
);
alter table public.otp_screen enable row level security;
revoke all on public.otp_screen from anon, authenticated;

-- send-sms hook (service_role): kodni yozadi. Raqam admin bo'lsa — yozmaydi, false
create or replace function public.otp_screen_put(p_phone text, p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if exists (select 1 from public.profiles
              where role = 'admin' and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = d) then
    return false;
  end if;
  delete from public.otp_screen where created_at < now() - interval '1 hour';
  insert into public.otp_screen (phone, code) values (d, p_code)
    on conflict (phone) do update set code = excluded.code, created_at = now();
  return true;
end $$;
revoke execute on function public.otp_screen_put(text, text) from public, anon, authenticated;
grant execute on function public.otp_screen_put(text, text) to service_role;

-- Ilova (kod ekrani): shu raqamga 10 daqiqa ichida yaratilgan kod yoki null
create or replace function public.otp_screen_code(p_phone text) returns text
language sql stable security definer set search_path = public as $$
  select code from public.otp_screen
   where phone = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
     and created_at > now() - interval '10 minutes'
$$;
revoke execute on function public.otp_screen_code(text) from public;
grant execute on function public.otp_screen_code(text) to anon, authenticated, service_role;

-- Kod ishlatilgach (kirgan foydalanuvchi) — o'chiriladi
create or replace function public.otp_screen_done() returns void
language sql security definer set search_path = public as $$
  delete from public.otp_screen
   where phone = (select regexp_replace(coalesce(phone, ''), '\D', '', 'g') from auth.users where id = auth.uid())
$$;
revoke execute on function public.otp_screen_done() from public, anon;
grant execute on function public.otp_screen_done() to authenticated;
