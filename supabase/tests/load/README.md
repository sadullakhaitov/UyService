# Yuklama sinovi (100 mijoz + 100 usta)

`bash supabase/tests/load/run.sh` — lokal bazada (migratsiyalar + soxta foydalanuvchilar) bir vaqtda
`CLIENTS` mijoz va `MASTERS` usta ilovadagidek ishlaydi. Haqiqiy loyihaga tegmaydi.

Brauzer, telefon (PWA) va Telegram — hammasi bir xil sayt va bir xil Supabase, shuning uchun server uchun
farqi yo'q: har biri bir xil so'rovlarni yuboradi.

Har foydalanuvchi nima qiladi (oraliqlar — `lib/live.ts`, `lib/masterFeed.ts`, `lib/around.ts` dagidek):

- **usta** — onlayn, joylashuv har 5 s, yangi taklif har 3 s, o'z holati har 60 s; taklifni o'qiydi (2–10 s),
  85% qabul qiladi → yo'l → yetib keldim → eshik kodi → narx → tugatdim; chat
- **mijoz** — katalog, atrofdagi ustalar har 20 s, tarix; buyurtma → holat har 4 s (faol — 2 s) → usta kartasi,
  joyi → narxga javob (90% rozi) → baho; keyingi buyurtma
- **server** — `dispatch`, `offer-respond` (o'sha `_shared/engine.ts`), `offer-timeout` har 15 s

Sozlamalar: `DURATION_S` (300), `RAMP_S` (60), `HISTORY` (20 000 eski buyurtma — jadvallar bo'sh bo'lmasin),
`DB_POOL` (15), `CPUS` (`0,1` — baza 2 yadroda, kichik Supabase serveridek), `DISPATCH_ROUTING=on` +
`OSRM_URL` — yo'l xizmati (sinovda — kechikishli soxta server, ochiq OSRM'ga yuklama bermaslik uchun).

## Natija (12-oktabr 2026)

| | 100 + 100 | 100 + 100, yo'l xizmati ~1,2 s | 1000 + 1000 |
|---|---|---|---|
| So'rov/s (o'rtacha) | ~140 | ~140 | ~900 (2 yadro to'ldi) |
| Javob vaqti p95 | 5 ms | 5 ms | ~1 s |
| Xatolar | 0 | 0 | 0 |
| Usta topilishi (p50 / p95) | 12 s / 37 s | 12 s / 48 s | 19 s / 69 s |
| `offer-timeout` bir aylanishi | 0,3 s | **16,8 s** → tuzatildi: 4,7 s | 157 s |
| Bitta ustaga ikki buyurtmadan taklif | 1 | **21** → tuzatildi: 0 | 633 |

Tuzatilgan:

1. **Bitta ustaga bir vaqtda ikki taklif.** Ikki buyurtma bir vaqtda qidirilganda (ayniqsa yo'l xizmatini kutayotganda)
   ikkalasi bitta ustani tanlardi; usta bittasini ko'rardi, ikkinchisi 60 s jim turib "vaqt o'tdi" bo'lardi — mijoz
   ortiqcha kutardi, usta nohaq −5 aktivlik olardi. Endi taklif qatori oldin yoziladi va bitta ustaga faqat bitta
   ochiq taklif (`…_offer_one_per_master.sql`), band usta chetlab o'tiladi.
2. **`offer-timeout` ketma-ket edi** — har qidiruv yo'l xizmatini kutgani uchun 100 mijozda bir aylanish 15 s dan
   oshardi (keyingi chaqiruv bilan ustma-ust). Endi 8 tadan parallel (`stepActiveSearches`).
3. **Realtime filtrsiz edi** (`offers`, `chat_messages`) — har yangi taklif/xabar barcha ochiq ustalar/chatlar uchun
   serverda tekshirilardi. Endi faqat o'ziniki.

Server (sinovda — 2 yadro) 200 kishida 5 ms da javob beradi — zaxira katta; 1000 + 1000 da sekinlashadi, lekin to'xtamaydi.
