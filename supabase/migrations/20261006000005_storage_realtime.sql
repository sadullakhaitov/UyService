-- UyService: fayllar (Storage) va jonli yangilanishlar (Realtime).
-- Fayl yo'li har doim "<foydalanuvchi id>/<fayl nomi>" — birinchi papka egasining id'si.
--   documents     — pasport, selfi (yopiq: usta o'zi va admin)
--   works         — ish namunalari (ochiq, hamma ko'radi)
--   order-photos  — buyurtma rasmlari (yopiq: mijoz, shu buyurtmaga taklif olgan / tayinlangan usta, admin)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('documents', 'documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('works', 'works', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('order-photos', 'order-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

-- Usta buyurtma rasmini ko'ra oladimi: rasm buyurtmada bor va unga taklif kelgan yoki u tayinlangan
create or replace function public.can_see_order_photo(p_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where p_name = any (o.photos)
      and (o.master_id = auth.uid()
        or exists (select 1 from public.offers f where f.order_id = o.id and f.master_id = auth.uid() and f.status = 'sent'))
  )
$$;

create policy "storage: o'z papkam (yuklash)" on storage.objects for insert to authenticated
  with check (bucket_id in ('documents', 'works', 'order-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage: o'z papkam (o'qish)" on storage.objects for select to authenticated
  using (bucket_id in ('documents', 'works', 'order-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage: o'z papkam (almashtirish)" on storage.objects for update to authenticated
  using (bucket_id in ('documents', 'works', 'order-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage: o'z papkam (o'chirish)" on storage.objects for delete to authenticated
  using (bucket_id in ('documents', 'works', 'order-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "storage: ish namunalari ochiq" on storage.objects for select to anon, authenticated
  using (bucket_id = 'works');
create policy "storage: buyurtma rasmlari ustaga" on storage.objects for select to authenticated
  using (bucket_id = 'order-photos' and public.can_see_order_photo(name));
create policy "storage: admin" on storage.objects for all to authenticated
  using (bucket_id in ('documents', 'works', 'order-photos') and public.is_admin())
  with check (bucket_id in ('documents', 'works', 'order-photos') and public.is_admin());

-- Realtime: ilova shu jadvallardagi o'zgarishlarni jonli oladi (RLS hisobga olinadi)
do $$
declare t text;
begin
  foreach t in array array['orders', 'offers', 'master_locations', 'chat_messages'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
