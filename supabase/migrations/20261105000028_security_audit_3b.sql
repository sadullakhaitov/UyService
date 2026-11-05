-- Xavfsizlik tekshiruvi #3, ikkinchi qism (5-noyabr). Hisobot — docs/xavfsizlik-auditi-3.md (P4, P5).
--  P4) Ustalar ro'yxati (master_cards) hammaga ochiq — har ustaning TO'LIQ familiyasi bilan. Raqobatchi butun
--      bazani yig'ib olishi mumkin edi. Endi familiyaning faqat bosh harfi: "Alisher V." (Yandex'dagidek).
--  P5) Fayllar serverda qolardi: hisob o'chirilganda pasport, selfi, rasmlarni faqat ilova o'chirardi (xato bo'lsa —
--      qoladi), pasport/surat almashtirilsa eskisi abadiy qolardi. Endi server navbatga yozadi (storage_trash),
--      offer-timeout (har 15 s) Storage API orqali o'chiradi (_shared/cleanup.ts).

-- ---------- P4 ----------
create or replace view public.master_cards as
  select id, first_name,
         case when btrim(coalesce(last_name, '')) = '' then '' else upper(left(btrim(last_name), 1)) || '.' end as last_name,
         experience_years, categories, rating, jobs_count, works,
         verify_status = 'approved' as verified,
         photo_path
  from public.masters;
grant select on public.master_cards to anon, authenticated;

-- ---------- P5 ----------
create table if not exists public.storage_trash (
  id bigserial primary key,
  bucket text not null check (bucket in ('documents', 'works', 'order-photos')),
  path text not null,            -- fayl yo'li yoki papka ("<uid>/" — ichidagi hammasi)
  created_at timestamptz not null default now(),
  attempts int not null default 0
);
alter table public.storage_trash enable row level security;
revoke all on public.storage_trash from anon, authenticated;

-- Ustaning eski fayllari (almashtirilgan yoki olib tashlangan)
create or replace function public.masters_trash_files() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.passport_path is not null and old.passport_path is distinct from new.passport_path then
    insert into public.storage_trash (bucket, path) values ('documents', old.passport_path);
  end if;
  if old.selfie_path is not null and old.selfie_path is distinct from new.selfie_path then
    insert into public.storage_trash (bucket, path) values ('documents', old.selfie_path);
  end if;
  if old.photo_path is not null and old.photo_path is distinct from new.photo_path then
    insert into public.storage_trash (bucket, path) values ('works', old.photo_path);
  end if;
  insert into public.storage_trash (bucket, path)
    select 'works', w from unnest(coalesce(old.works, '{}')) w
     where w <> all (coalesce(new.works, '{}')) and w is distinct from new.photo_path;
  return null;
end $$;

drop trigger if exists masters_trash_files on public.masters;
create trigger masters_trash_files
  after update of passport_path, selfie_path, photo_path, works on public.masters
  for each row execute function public.masters_trash_files();

-- Hisob o'chirildi (delete_my_account / admin_delete_account) — uchala papkadagi hamma fayli
create or replace function public.profiles_trash_files() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    insert into public.storage_trash (bucket, path)
      select b, new.id::text || '/' from unnest(array['documents', 'works', 'order-photos']) b;
  end if;
  return null;
end $$;

drop trigger if exists profiles_trash_files on public.profiles;
create trigger profiles_trash_files
  after update of deleted_at on public.profiles
  for each row execute function public.profiles_trash_files();
