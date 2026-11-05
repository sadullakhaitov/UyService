-- Xavfsizlik tekshiruvi #3 (5-noyabr). Hisobot — docs/xavfsizlik-auditi-3.md.
--  1) Raqamni oldindan egallab, keyin egasining hisobini kuzatish (pre-account takeover).
--     Ekrandagi kod (…_otp_on_screen.sql) yangi raqamga hech qanday tasdiqsiz beriladi. Hujumchi hali ilovaga
--     kirmagan odamning raqamiga kod so'rab, ekrandan o'qib kiradi va sessiyasini saqlab qoladi. Keyin raqam egasi
--     o'zi kirsa (Telegram bot yoki SMS orqali — ular raqam egasini tasdiqlaydi), o'sha hisobga kiradi, lekin
--     hujumchining sessiyasi ham ishlayveradi: egasining manzillari, buyurtmalari, yozishmalari, usta bo'lsa —
--     hujjatlari va balansi hujumchiga ko'rinadi.
--     Endi: ekran orqali ochilgan raqam "da'vo" sifatida yoziladi (otp_screen_claims). Shu raqamga kod birinchi
--     marta Telegram yoki SMS bilan ketganda (yoki raqam Telegram orqali kirganda) hisobning BOSHQA HAMMA
--     sessiyalari o'chiriladi — ekran orqali kirgan begona chiqib ketadi, qayta ekrandan kira olmaydi
--     (avval kirgan hisobga ekranda kod chiqmaydi — …_security_audit_2.sql).
--  2) Raqamni almashtirish (auth phone_change) ekrandagi kod bilan: kirgan foydalanuvchi o'z hisobiga begona
--     (hali ro'yxatdan o'tmagan) raqamni yozib olishi mumkin edi. Endi ekrandagi kod faqat shu raqamning o'z,
--     hali hech qachon kirmagan hisobiga beriladi.
--  3) Matn maydonlari cheklanmagan edi (ism, manzil, bekor qilish sababi, sharh, rasm ro'yxatlari) — bitta hisob
--     megabaytlab yozib, bazani (bepul tarifda 500 MB) to'ldira olardi va boshqalarning ekranini buzardi.
--  4) Usta pasport/selfi/surat/ish namunasi yo'liga BOSHQA odamning fayl yo'lini yoza olardi (masalan, boshqa
--     ustaning pasporti — admin tekshiruvida "hujjat" bo'lib ko'rinardi). Endi faqat o'z papkasi: "<id>/...".
--  5) Fayl yuklash cheklanmagan edi: bitta hisob ochiq "works" papkasiga cheksiz 10 MB'lik fayl yuklab, Storage'ni
--     (bepul tarifda 1 GB) to'ldira olardi. Endi bitta foydalanuvchi sutkasiga 40 ta, jami 300 ta fayl (ilovada
--     eng ko'pi: anketa 9 ta, ish namunalari 12 ta, buyurtma rasmi 3 ta × 10 buyurtma). Admin — cheklovsiz.

-- ---------- 1) Ekran orqali ochilgan raqamlar ----------
create table if not exists public.otp_screen_claims (
  phone text primary key, -- faqat raqamlar: 998XXXXXXXXX
  created_at timestamptz not null default now()
);
alter table public.otp_screen_claims enable row level security;
revoke all on public.otp_screen_claims from anon, authenticated;

-- ---------- 1, 2) Ekrandagi kod ----------
-- p_user — send-sms hook'dagi foydalanuvchi (kod kimga so'ralgan). U boshqa raqamli yoki avval kirgan bo'lsa
-- (raqam almashtirish, begona hisob) — ekranda emas.
drop function if exists public.otp_screen_put(text, text);
create or replace function public.otp_screen_put(p_phone text, p_code text, p_user uuid default null) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  ids uuid[];
  u_phone text;
  u_signed timestamptz;
begin
  if d !~ '^998\d{9}$' or coalesce(p_code, '') !~ '^\d{4,10}$' then
    return false;
  end if;
  if p_user is not null then
    select regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), u.last_sign_in_at into u_phone, u_signed
      from auth.users u where u.id = p_user;
    if found and ((u_phone <> '' and u_phone <> d) or u_signed is not null) then
      delete from public.otp_screen where phone = d;
      return false;
    end if;
  end if;
  select coalesce(array_agg(distinct x.id), '{}') into ids from (
    select u.id from auth.users u where u.phone in (d, '+' || d)
    union
    select p.id from public.profiles p where p.phone in (d, '+' || d)
    union
    select p_user where p_user is not null
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
  insert into public.otp_screen_claims (phone) values (d) on conflict (phone) do nothing;
  return true;
end $$;
revoke execute on function public.otp_screen_put(text, text, uuid) from public, anon, authenticated;
grant execute on function public.otp_screen_put(text, text, uuid) to service_role;

-- Raqam egasi tasdiqlandi (kod Telegram/SMS bilan ketdi yoki Telegram orqali kirdi). Raqam ilgari ekran orqali
-- ochilgan bo'lsa — hisobning hamma sessiyalari o'chiriladi (egasi hozir kod bilan yangisini oladi). true — o'chirildi.
create or replace function public.otp_owner_verified(p_phone text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  ids uuid[];
begin
  delete from public.otp_screen_claims where phone = d;
  if not found then return false; end if;
  delete from public.otp_screen where phone = d;
  select coalesce(array_agg(distinct x.id), '{}') into ids from (
    select u.id from auth.users u where u.phone in (d, '+' || d)
    union
    select p.id from public.profiles p where p.phone in (d, '+' || d)
  ) x;
  if cardinality(ids) = 0 then return false; end if;
  -- refresh_tokens sessiyaga bog'langan (on delete cascade), lekin eski yozuvlar uchun alohida ham o'chiramiz
  delete from auth.refresh_tokens where user_id = any (select i::text from unnest(ids) i);
  delete from auth.sessions where user_id = any (ids);
  return true;
end $$;
revoke execute on function public.otp_owner_verified(text) from public, anon, authenticated;
grant execute on function public.otp_owner_verified(text) to service_role;

-- ---------- 3) Matn va ro'yxat chegaralari (ilovadagidan ancha keng; eski qatorlar tekshirilmaydi) ----------
alter table public.profiles
  add constraint profiles_name_len check (name is null or char_length(name) <= 120) not valid,
  add constraint profiles_push_token_len check (push_token is null or char_length(push_token) <= 300) not valid;
alter table public.masters
  add constraint masters_first_name_len check (char_length(first_name) <= 60) not valid,
  add constraint masters_last_name_len check (char_length(last_name) <= 60) not valid,
  add constraint masters_categories_max check (cardinality(categories) <= 30) not valid,
  add constraint masters_works_max check (cardinality(works) <= 30) not valid,
  add constraint masters_paths_len check (char_length(coalesce(passport_path, '')) <= 300
    and char_length(coalesce(selfie_path, '')) <= 300 and char_length(coalesce(photo_path, '')) <= 300) not valid;
alter table public.orders
  add constraint orders_address_len check (address is null or char_length(address) <= 500) not valid,
  add constraint orders_cancel_reason_len check (cancel_reason is null or char_length(cancel_reason) <= 1000) not valid,
  add constraint orders_photos_max check (cardinality(photos) <= 10) not valid;
alter table public.reviews
  add constraint reviews_comment_len check (comment is null or char_length(comment) <= 2000) not valid,
  add constraint reviews_tags_max check (cardinality(tags) <= 20) not valid;

-- ---------- 4) Ustaning fayl yo'llari — faqat o'z papkasi ----------
create or replace function public.masters_paths_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  own text := new.id::text || '/';
  p text;
begin
  if public.is_privileged() then return new; end if;
  foreach p in array array[new.passport_path, new.selfie_path, new.photo_path] || coalesce(new.works, '{}') loop
    if p is not null and (left(p, length(own)) <> own or p like '%..%' or char_length(p) > 300) then
      -- o'zgarmagan eski qiymat — tegmaymiz
      if tg_op = 'UPDATE' and (p = old.passport_path or p = old.selfie_path or p = old.photo_path or p = any (old.works)) then
        continue;
      end if;
      raise exception 'masters: fayl faqat o''z papkangizdan' using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists masters_paths_guard on public.masters;
create trigger masters_paths_guard
  before insert or update on public.masters
  for each row execute function public.masters_paths_guard();

-- ---------- 5) Fayl yuklash chegarasi ----------
create or replace function public.storage_upload_ok() returns boolean
language sql stable security definer set search_path = public, storage as $$
  select public.is_admin() or (
    (select count(*) from storage.objects o
      where (storage.foldername(o.name))[1] = auth.uid()::text
        and o.bucket_id in ('documents', 'works', 'order-photos')
        and o.created_at > now() - interval '24 hours') < 40
    and (select count(*) from storage.objects o
      where (storage.foldername(o.name))[1] = auth.uid()::text
        and o.bucket_id in ('documents', 'works', 'order-photos')) < 300)
$$;
revoke execute on function public.storage_upload_ok() from public, anon;
grant execute on function public.storage_upload_ok() to authenticated, service_role;

drop policy if exists "storage: o'z papkam (yuklash)" on storage.objects;
create policy "storage: o'z papkam (yuklash)" on storage.objects for insert to authenticated
  with check (bucket_id in ('documents', 'works', 'order-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and public.storage_upload_ok());
