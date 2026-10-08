-- UyService: bildirishnomalar Telegram bot orqali ham (Mini App'da ishlaydiganlar uchun).
-- Telegram ichida sayt yopilsa yoki orqa fonga o'tsa, sahifa to'xtaydi: "Yangi buyurtma" ko'rinmaydi. Shuning uchun
-- telefon ilovasi (Expo push tokeni) bo'lmagan, lekin Telegram bilan kirgan foydalanuvchiga xuddi shu xabarlar
-- bot orqali boradi — "Ochish" tugmasi kerakli ekranni Telegram ichida ochadi (supabase/functions/_shared/push.ts).
--   push_token bor            → Expo push (telefon ilovasi)
--   push_token yo'q, telegram → bot xabari (TELEGRAM_BOT_TOKEN sozlangan bo'lsa)

-- Navbatga yozish: Expo tokeni YOKI Telegram bog'langan bo'lsa
create or replace function public.enqueue_push(p_user uuid, p_kind text, p_params jsonb default '{}'::jsonb, p_url text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  if not exists (
    select 1 from public.profiles
    where id = p_user and (push_token is not null or telegram_id is not null) and (p_kind <> 'offer' or notify_offers)
  ) then return; end if;
  insert into public.push_outbox (user_id, kind, params, url) values (p_user, p_kind, coalesce(p_params, '{}'::jsonb), p_url);
end $$;

-- claim_push endi Telegram id'ni ham qaytaradi (qaytariladigan ustunlar o'zgargani uchun qayta yaratiladi)
drop function public.claim_push(int);
create function public.claim_push(p_limit int default 100)
returns table (id bigint, kind text, params jsonb, url text, token text, language text, telegram_id bigint)
language sql security definer set search_path = public as $$
  with picked as (
    select o.id from public.push_outbox o
    where o.sent_at is null and o.attempts < 3 and o.created_at > now() - interval '15 minutes'
      and (o.claimed_at is null or o.claimed_at < now() - interval '1 minute')
    order by o.created_at
    limit greatest(1, least(p_limit, 500))
    for update skip locked
  ), upd as (
    update public.push_outbox o
       set claimed_at = now(), attempts = o.attempts + 1
      from picked where o.id = picked.id
    returning o.id, o.kind, o.params, o.url, o.user_id
  )
  select upd.id, upd.kind, upd.params, upd.url, p.push_token, p.language, p.telegram_id
  from upd join public.profiles p on p.id = upd.user_id
  where p.push_token is not null or p.telegram_id is not null
$$;

revoke execute on function public.claim_push(int) from public, anon, authenticated;
grant execute on function public.claim_push(int) to service_role;
