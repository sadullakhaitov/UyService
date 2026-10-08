-- UyService: promokodlar va "Do'stni taklif qilish" — serverda (sinov rejimida ilova o'zi hisoblaydi).
--
-- Promokod (Profil → Promokod): admin yaratadi (admin panel → Narxlar va katalog → Promokodlar).
--   Beradi: prioritet ballari (taqsimlashda qo'shimcha ball, jami −50…+50) va/yoki balansga bonus.
--   Har usta bitta kodni bir marta ishlatadi; kodda ishlatish chegarasi va muddati bo'lishi mumkin.
-- Taklif (Profil → Do'stni taklif qilish): har ustaning o'z kodi (masters.invite_code). Yangi usta anketada
--   kodni kiritadi (yoki uyservice.uz/usta?ref=KOD havolasidan keladi) → masters.referred_by.
--   U 5 ta ishni bajargach, taklif qilgan ustaning balansiga bonus tushadi (constants/billing.ts → INVITE_BONUS,
--   INVITE_JOBS — shu yerdagi invite_bonus() / invite_jobs() bilan bir xil) va unga xabar boradi.

-- ---------- Taklif ----------
create or replace function public.invite_bonus() returns int language sql immutable as $$ select 30000 $$;
create or replace function public.invite_jobs() returns int language sql immutable as $$ select 5 $$;

alter table public.masters
  add column invite_code text unique,
  add column referred_by uuid references public.masters (id) on delete set null,
  add column referral_paid_at timestamptz;

create or replace function public.new_invite_code() returns text
language plpgsql volatile set search_path = public as $$
declare c text;
begin
  loop
    -- O, 0, I, 1 yo'q — og'zaki aytganda adashmasin
    c := 'US' || array_to_string(array(
      select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1) from generate_series(1, 6)), '');
    exit when not exists (select 1 from public.masters where invite_code = c);
  end loop;
  return c;
end $$;

update public.masters set invite_code = public.new_invite_code() where invite_code is null;

-- Usta o'zi o'zgartira olmaydi: kod, kim taklif qilgani (faqat apply_invite_code orqali), bonus to'langani
create or replace function public.masters_referral_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_privileged() then
      new.referred_by := null;
      new.referral_paid_at := null;
      new.invite_code := null;
    end if;
    new.invite_code := coalesce(new.invite_code, public.new_invite_code());
  elsif not public.is_privileged()
        and (new.invite_code, new.referred_by, new.referral_paid_at) is distinct from (old.invite_code, old.referred_by, old.referral_paid_at) then
    raise exception 'masters: taklif ma''lumotlarini faqat server o''zgartiradi' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger masters_referral_guard
  before insert or update on public.masters
  for each row execute function public.masters_referral_guard();

-- Taklif qilingan usta 5-ishni yakunladi → taklif qilganga bonus (bir marta)
create or replace function public.masters_invite_bonus() returns trigger
language plpgsql security definer set search_path = public as $$
declare b int;
begin
  if new.referred_by is null or old.referral_paid_at is not null
     or new.jobs_count < public.invite_jobs() or old.jobs_count >= public.invite_jobs() then
    return null;
  end if;
  update public.masters set referral_paid_at = now() where id = new.id;
  update public.masters set balance = balance + public.invite_bonus() where id = new.referred_by returning balance into b;
  if b is null then return null; end if;
  insert into public.balance_ops (master_id, amount, balance_after, kind, note)
  values (new.referred_by, public.invite_bonus(), b, 'bonus', 'invite:' || new.id);
  perform public.enqueue_push(new.referred_by, 'inviteBonus',
    jsonb_build_object('sum', public.invite_bonus(), 'name', coalesce(new.first_name, '')), '/master/money');
  return null;
end $$;

create trigger masters_invite_bonus
  after update of jobs_count on public.masters
  for each row execute function public.masters_invite_bonus();

-- Yangi usta taklif kodini kiritadi (anketada). Qaytaradi: taklif qilgan ustaning ismi
create or replace function public.apply_invite_code(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare me public.masters; inviter public.masters;
begin
  select * into me from public.masters where id = auth.uid() for update;
  if not found then raise exception 'invite: avval anketani yuboring' using errcode = 'P0002'; end if;
  select * into inviter from public.masters where invite_code = upper(btrim(coalesce(p_code, '')));
  if not found then raise exception 'invite: bunday kod yo''q' using errcode = 'P0002'; end if;
  if inviter.id = me.id then raise exception 'invite: o''z kodingiz' using errcode = '22023'; end if;
  if me.referred_by is not null then
    if me.referred_by = inviter.id then return inviter.first_name; end if;
    raise exception 'invite: kod allaqachon kiritilgan' using errcode = '23505';
  end if;
  if me.jobs_count > 0 then raise exception 'invite: kod faqat yangi ustaga' using errcode = '22023'; end if;
  update public.masters set referred_by = inviter.id where id = me.id;
  return inviter.first_name;
end $$;

-- "Do'stni taklif qilish" ekrani: mening kodim, nechta taklif qildim, nechtasi uchun bonus oldim
create or replace function public.my_invites() returns table (code text, invited int, paid int)
language sql stable security definer set search_path = public as $$
  select m.invite_code,
         (select count(*)::int from public.masters r where r.referred_by = m.id),
         (select count(*)::int from public.masters r where r.referred_by = m.id and r.referral_paid_at is not null)
  from public.masters m where m.id = auth.uid()
$$;

-- ---------- Promokodlar ----------
alter table public.admin_log drop constraint admin_log_target_type_check;
alter table public.admin_log add constraint admin_log_target_type_check
  check (target_type in ('master', 'user', 'order', 'review', 'category', 'problem', 'support', 'promo'));

create table public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  priority int not null default 0 check (priority between 0 and 50),
  bonus int not null default 0 check (bonus between 0 and 1000000),
  max_uses int check (max_uses is null or max_uses between 1 and 100000),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (priority > 0 or bonus > 0)
);
create table public.promo_redemptions (
  code text not null references public.promo_codes (code) on delete cascade,
  master_id uuid not null references public.masters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (code, master_id)
);
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
revoke all on public.promo_codes, public.promo_redemptions from anon, authenticated;

-- Usta promokodni qo'llaydi. Qaytaradi: { priority, bonus } — nima berildi
create or replace function public.redeem_promo(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.promo_codes;
  c text := upper(btrim(coalesce(p_code, '')));
  b int;
begin
  if not exists (select 1 from public.masters where id = auth.uid()) then
    raise exception 'promo: faqat usta' using errcode = '42501';
  end if;
  select * into p from public.promo_codes where code = c for update;
  if not found or not p.active then raise exception 'promo: bunday kod yo''q' using errcode = 'P0002'; end if;
  if p.expires_at is not null and p.expires_at < now() then raise exception 'promo: muddati o''tgan' using errcode = '22023'; end if;
  if exists (select 1 from public.promo_redemptions where code = c and master_id = auth.uid()) then
    raise exception 'promo: allaqachon ishlatilgan' using errcode = '23505';
  end if;
  if p.max_uses is not null and (select count(*) from public.promo_redemptions where code = c) >= p.max_uses then
    raise exception 'promo: chegara tugagan' using errcode = '22023';
  end if;
  begin
    insert into public.promo_redemptions (code, master_id) values (c, auth.uid());
  exception when unique_violation then
    raise exception 'promo: allaqachon ishlatilgan' using errcode = '23505';
  end;
  update public.masters
     set priority_points = least(50, priority_points + p.priority),
         balance = balance + p.bonus
   where id = auth.uid()
   returning balance into b;
  if p.bonus > 0 then
    insert into public.balance_ops (master_id, amount, balance_after, kind, note)
    values (auth.uid(), p.bonus, b, 'bonus', 'promo:' || c);
  end if;
  return jsonb_build_object('priority', p.priority, 'bonus', p.bonus);
end $$;

-- Admin: ro'yxat va saqlash (yaratish / o'zgartirish / o'chirib qo'yish)
create or replace function public.admin_promos()
returns table (code text, priority int, bonus int, max_uses int, uses int, expires_at timestamptz, active boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.assert_admin();
  return query
    select p.code, p.priority, p.bonus, p.max_uses,
           (select count(*)::int from public.promo_redemptions r where r.code = p.code),
           p.expires_at, p.active, p.created_at
    from public.promo_codes p order by p.created_at desc;
end $$;

create or replace function public.admin_save_promo(p_code text, p_priority int, p_bonus int, p_max_uses int, p_expires_at timestamptz, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare c text := upper(btrim(coalesce(p_code, ''))); old public.promo_codes;
begin
  perform public.assert_admin();
  if c !~ '^[A-Z0-9]{3,20}$' then raise exception 'admin: kod 3–20 ta lotin harfi yoki raqam' using errcode = '22023'; end if;
  if coalesce(p_priority, 0) not between 0 and 50 then raise exception 'admin: prioritet 0–50' using errcode = '22023'; end if;
  if coalesce(p_bonus, 0) not between 0 and 1000000 then raise exception 'admin: bonus 0–1 000 000' using errcode = '22023'; end if;
  if coalesce(p_priority, 0) = 0 and coalesce(p_bonus, 0) = 0 then raise exception 'admin: prioritet yoki bonus kerak' using errcode = '22023'; end if;
  if p_max_uses is not null and p_max_uses not between 1 and 100000 then raise exception 'admin: chegara 1–100 000' using errcode = '22023'; end if;
  select * into old from public.promo_codes where code = c;
  insert into public.promo_codes (code, priority, bonus, max_uses, expires_at, active)
  values (c, coalesce(p_priority, 0), coalesce(p_bonus, 0), p_max_uses, p_expires_at, coalesce(p_active, true))
  on conflict (code) do update set priority = excluded.priority, bonus = excluded.bonus, max_uses = excluded.max_uses,
    expires_at = excluded.expires_at, active = excluded.active;
  perform public.admin_write_log('promo', 'promo', c, jsonb_build_object(
    'new', old.code is null, 'priority', coalesce(p_priority, 0), 'bonus', coalesce(p_bonus, 0),
    'max_uses', p_max_uses, 'active', coalesce(p_active, true)));
end $$;

revoke execute on function public.masters_invite_bonus() from public, anon, authenticated;
revoke execute on function public.apply_invite_code(text) from public, anon;
revoke execute on function public.my_invites() from public, anon;
revoke execute on function public.redeem_promo(text) from public, anon;
revoke execute on function public.admin_promos() from public, anon;
revoke execute on function public.admin_save_promo(text, int, int, int, timestamptz, boolean) from public, anon;
grant execute on function public.apply_invite_code(text), public.my_invites(), public.redeem_promo(text),
  public.admin_promos(), public.admin_save_promo(text, int, int, int, timestamptz, boolean) to authenticated;
