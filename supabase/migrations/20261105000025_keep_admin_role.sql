-- Admin usta bo'lib ro'yxatdan o'tsa ham admin bo'lib qoladi (5-noyabr).
-- Sabab: usta anketasi (lib/live.ts → liveSaveMaster) profiles.role = 'master' yozardi; admin "imtiyozli"
-- bo'lgani uchun profiles_guard uni to'xtatmasdi — admin o'z huquqini bilmasdan yo'qotardi
-- ("У этого номера нет прав администратора"). Ustalik masters jadvalidagi qatordan bilinadi, role'dan emas.

-- 1) Qo'riqchi: ilova (anon/authenticated) admin rolini o'zgartira olmaydi — jim saqlanadi.
--    Adminni olib tashlash — faqat admin_set_role (security definer) yoki server orqali.
create or replace function public.profiles_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.role = 'admin' and new.role is distinct from old.role
     and current_user in ('anon', 'authenticated') then
    new.role := old.role;
  end if;
  if not public.is_privileged() then
    if new.role = 'admin' and (tg_op = 'INSERT' or old.role <> 'admin') then
      raise exception 'profiles.role: faqat admin tayinlaydi' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.phone is distinct from old.phone then
      raise exception 'profiles.phone: o''zgartirib bo''lmaydi' using errcode = '42501';
    end if;
    if tg_op = 'INSERT' then
      new.blocked_at := null;
      new.blocked_reason := null;
      new.deleted_at := null;
    elsif (new.blocked_at, new.blocked_reason) is distinct from (old.blocked_at, old.blocked_reason) then
      raise exception 'profiles: bloklashni faqat admin o''zgartiradi' using errcode = '42501';
    elsif new.deleted_at is distinct from old.deleted_at then
      raise exception 'profiles.deleted_at: faqat server' using errcode = '42501';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

-- 2) Shu xato bilan huquqini yo'qotgan adminlarni qaytarish: admin panelda amal qilgan (admin_log'da muallif)
--    yoki admin qilib tayinlangan, keyin olib tashlanmagan, hozir 'master' bo'lib qolgan hisoblar.
with ever_admin as (
  select admin_id as id, max(created_at) as at from public.admin_log where admin_id is not null group by admin_id
  union all
  select target_id::uuid, max(created_at) from public.admin_log
   where action = 'grant_admin' and target_type = 'user' and target_id ~ '^[0-9a-f-]{36}$' group by target_id
), revoked as (
  select target_id::uuid as id, max(created_at) as at from public.admin_log
   where action = 'revoke_admin' and target_type = 'user' and target_id ~ '^[0-9a-f-]{36}$' group by target_id
)
update public.profiles p set role = 'admin'
 where p.role = 'master' and p.deleted_at is null
   and exists (select 1 from ever_admin e where e.id = p.id
                and not exists (select 1 from revoked r where r.id = p.id and r.at >= e.at));

-- 3) Zaxira: birorta admin qolmagan bo'lsa — kompaniya raqami (constants/company.ts, +998 90 121 88 87)
update public.profiles set role = 'admin'
 where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = '998901218887' and deleted_at is null
   and not exists (select 1 from public.profiles where role = 'admin' and deleted_at is null);
