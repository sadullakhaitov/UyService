-- Bitta ustaga bir vaqtda faqat bitta ochiq taklif.
-- Yuklama sinovi (100 mijoz + 100 usta, supabase/tests/load): bir vaqtda qidirilayotgan ikki buyurtma yo'l xizmatini
-- kutayotganda bitta ustani tanlab, ikkalasi ham unga taklif yuborardi. Usta faqat bittasini ko'rardi, ikkinchisi
-- 60 s jim turib "vaqt o'tdi" bo'lardi: mijoz ortiqcha kutardi, ustaning aktivligi esa nohaq −5.
-- Endi taklif qatori buyurtmadan oldin yoziladi (_shared/engine.ts), ikkinchi buyurtma bu indeksga urilib keyingi ustaga o'tadi.

-- Hozir ochiq turgan takroriylar: ustaning eng yangi taklifi qoladi, eskilari yopiladi (qidiruv keyingi ustaga o'tadi)
update public.offers o
   set status = 'expired', responded_at = now()
 where o.status = 'sent'
   and exists (select 1 from public.offers n
                where n.master_id = o.master_id and n.status = 'sent'
                  and (n.sent_at, n.id) > (o.sent_at, o.id));

create unique index if not exists offers_one_open_per_master_idx on public.offers (master_id) where status = 'sent';
