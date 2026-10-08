-- UyService: usta buyurtmani bekor qilsa — buyurtma yopilmaydi, keyingi ustaga o'tadi.
-- Mijoz qaytadan chaqirishi shart emas: "Usta bekor qildi, yangi usta qidirilmoqda" (push) va qidiruv o'zi boshlanadi.
--   - bekor qilgan usta qayta taklif olmaydi (orders.dispatch → declined); avval rad etganlar yana taklif olishi
--     mumkin (o'shanda band bo'lgandir — mijozga tezroq usta topilsin)
--   - ustaning aktivligi −10 (TZ, 7-bo'lim), u yana bo'sh (busy = false)
--   - sabab offers.cancel_reason'da qoladi (admin buyurtma tarixida ko'radi)
-- Qidiruvni offer-timeout (har 15 s) davom ettiradi; mijoz ilovasi buni sezib darhol ham chaqiradi (lib/live.ts).

alter type public.offer_status add value if not exists 'cancelled';
alter table public.offers add column if not exists cancel_reason text;

create or replace function public.master_cancel_order(p_order uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  reason text := left(btrim(coalesce(p_reason, '')), 300);
begin
  select * into o from public.orders where id = p_order for update;
  if not found or o.master_id is distinct from auth.uid() then
    raise exception 'orders: ruxsat yo''q' using errcode = '42501';
  end if;
  if o.status not in ('assigned', 'on_the_way', 'arrived') then
    raise exception 'orders: ish boshlangandan keyin bekor qilib bo''lmaydi' using errcode = '22023';
  end if;
  if reason = '' then
    raise exception 'orders: sabab kerak' using errcode = '22023';
  end if;

  update public.offers set status = 'cancelled', responded_at = now(), cancel_reason = reason
   where order_id = p_order and master_id = o.master_id and status = 'accepted';
  update public.masters set busy = false, activity = greatest(0, activity - 10) where id = o.master_id;
  update public.order_secrets set attempts = 0, locked_until = null where order_id = p_order;

  -- Qidiruv boshidan (eng kichik radius), faqat shu ustasiz
  update public.orders set
    status = 'searching',
    master_id = null,
    accepted_at = null,
    fee_percent = null,
    door_verified_at = null,
    price_work = null,
    price_parts = null,
    price_status = 'none',
    price_sent_at = null,
    dispatch = jsonb_build_object(
      'startedAt', now_ms, 'radiusIdx', 0, 'radiusAt', now_ms,
      'declined', jsonb_build_array(o.master_id::text),
      'offer', null, 'done', null, 'events', '[]'::jsonb),
    dispatch_rev = o.dispatch_rev + 1
  where id = p_order;
end $$;

revoke execute on function public.master_cancel_order(uuid, text) from public, anon;
grant execute on function public.master_cancel_order(uuid, text) to authenticated;

-- Push: oldingi qoidalar + "Usta bekor qildi — yangi usta qidirilmoqda" (mijozga)
create or replace function public.orders_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  track text := '/client/tracking?id=' || new.id;
  v_name text;
  v_min int;
begin
  -- Usta topildi
  if new.master_id is not null and old.master_id is null then
    select first_name into v_name from public.masters where id = new.master_id;
    select eta_min into v_min from public.offers
     where order_id = new.id and master_id = new.master_id order by sent_at desc limit 1;
    perform public.enqueue_push(new.client_id, 'found', jsonb_build_object('name', coalesce(v_name, ''), 'min', coalesce(v_min, 10)), track);
  end if;

  -- Usta bekor qildi, buyurtma qidiruvga qaytdi
  if new.master_id is null and old.master_id is not null and new.status = 'searching' then
    perform public.enqueue_push(new.client_id, 'requeued', '{}'::jsonb, '/client/searching?id=' || new.id);
  end if;

  -- Qidiruv natijasiz tugadi ("Hozir bo'sh usta yo'q")
  if new.dispatch ->> 'done' = 'none' and (old.dispatch ->> 'done') is distinct from 'none' then
    perform public.enqueue_push(new.client_id, 'none', '{}'::jsonb, '/client/searching?id=' || new.id);
  end if;

  if new.status is distinct from old.status then
    if new.status = 'arrived' then
      perform public.enqueue_push(new.client_id, 'arrived', jsonb_build_object('category', new.category_id), track);
    elsif new.status = 'completed' then
      perform public.enqueue_push(new.client_id, 'done', '{}'::jsonb, '/client/rate?id=' || new.id);
      if new.price_status = 'declined' then
        perform public.enqueue_push(new.master_id, 'priceDeclined', jsonb_build_object('fee', new.call_fee), '/master/job');
      end if;
    elsif new.status = 'in_progress' and new.price_status = 'approved' then
      perform public.enqueue_push(new.master_id, 'priceApproved', '{}'::jsonb, '/master/job');
    elsif new.status = 'cancelled' and new.cancelled_by in ('client', 'admin') and old.master_id is not null then
      perform public.enqueue_push(old.master_id, 'cancelled', '{}'::jsonb, '/master');
    end if;
  end if;

  -- Usta narx yubordi
  if new.price_status = 'proposed' and old.price_status <> 'proposed' then
    perform public.enqueue_push(new.client_id, 'price',
      jsonb_build_object('sum', coalesce(new.price_work, 0) + coalesce(new.price_parts, 0)), track);
  end if;
  return null;
end $$;
