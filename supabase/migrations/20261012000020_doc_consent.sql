-- UyService: pasport va selfi uchun alohida rozilik (selfi — biometrik ma'lumot; Maxfiylik siyosati, 4-bo'lim).
-- Ilovada rozilik belgilanmaguncha hujjat yuklab bo'lmaydi; server ham rozilik vaqtisiz pasport/selfi yo'lini qabul qilmaydi.
-- Rozilik vaqtini server qo'yadi (telefon soati emas) va keyin o'zgartirib bo'lmaydi.

alter table public.masters add column if not exists doc_consent_at timestamptz;

create or replace function public.masters_doc_consent_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if public.is_privileged() then return new; end if;
  if tg_op = 'UPDATE' and old.doc_consent_at is not null then
    new.doc_consent_at := old.doc_consent_at;               -- bir marta beriladi, keyin o'zgarmaydi
  elsif new.doc_consent_at is not null then
    new.doc_consent_at := now();
  end if;
  if new.doc_consent_at is null
     and ((new.passport_path is not null and (tg_op = 'INSERT' or new.passport_path is distinct from old.passport_path))
       or (new.selfie_path is not null and (tg_op = 'INSERT' or new.selfie_path is distinct from old.selfie_path))) then
    raise exception 'doc_consent: pasport va selfi uchun rozilik kerak' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists masters_doc_consent_guard on public.masters;
create trigger masters_doc_consent_guard before insert or update on public.masters
  for each row execute function public.masters_doc_consent_guard();
