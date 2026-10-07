-- UyService: ustaning sharhlari hammaga ko'rinadi ("Usta haqida" ekrani — app/client/master.tsx).
-- reviews jadvalining o'zi yopiq (mijoz va usta faqat o'zinikini ko'radi); bu ko'rinish faqat ochiq qismini beradi:
-- baho, teglar, izoh, sana va muallifning ismi (familiya va telefon emas).
create or replace view public.master_reviews as
  select r.id, r.master_id, r.stars, r.tags, r.comment, r.created_at,
         nullif(split_part(coalesce(p.name, ''), ' ', 1), '') as author
  from public.reviews r
  join public.profiles p on p.id = r.client_id
  where p.blocked_at is null;

grant select on public.master_reviews to anon, authenticated;
