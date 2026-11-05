# UyService — xavfsizlik auditi #3 (5-noyabr 2026)

Egasining ruxsati bilan o'tkazilgan to'liq tekshiruv. Usul: avval kodni o'qish (statik tahlil), keyin topilganini
**mahalliy** bazada (Postgres 16 + PostGIS + PostgREST, hamma migratsiyalar) va sinov hisoblari bilan tasdiqlash.
Haqiqiy server, haqiqiy foydalanuvchilar ma'lumoti, DoS va buzuvchi sinovlar ishlatilmadi.

Oldingi tekshiruvlar: #1 — 10-oktabr (`…_security_hardening.sql`, 8 band), #2 — 2-noyabr (`…_security_audit_2.sql`:
ekrandagi kod orqali begona hisobga kirish, chat/statistika chegaralari). Ular takrorlanmadi — tuzatilgani tekshirildi.

Tuzatishlar: `supabase/migrations/20261105000027_security_audit_3.sql`, `supabase/functions/_shared/otp.ts`,
`supabase/functions/telegram-auth/index.ts`, `components/map/osm/html.ts`, `public/_headers`.
Sinovlar: `supabase/tests/security3_test.sql`, `supabase/tests/e2e/otp_e2e.ts` (yangi tekshiruvlar).

---

## 1. Qisqacha xulosa

Server himoyasi umuman kuchli: hamma jadvalda RLS yoqilgan, admin funksiyalarining hammasi (28 ta) server tomonida
`assert_admin()` bilan tekshiriladi, narx, balans, reyting, tasdiq holati kabi ustunlarni foydalanuvchi o'zgartira
olmaydi (triggerlar), admin ko'rinishlari `security_invoker`, maxfiy kalitlar git'da yo'q.

Bu safar **6 ta tasdiqlangan** muammo topildi va tuzatildi:

| # | Muammo | Daraja |
|---|---|---|
| V1 | Raqamni oldindan egallab, keyin egasining hisobini kuzatish (ekrandagi kod) | **Yuqori** |
| V2 | Xarita kutubxonasi CDN'dan imzosiz (SRI yo'q) va sayt bilan bir manzilda ishlaydi | O'rta |
| V3 | Bitta hisob Storage'ni cheksiz to'ldira olardi | O'rta |
| V4 | Matn va ro'yxat maydonlari cheklanmagan (bazani to'ldirish) | O'rta |
| V5 | Usta hujjat/surat yo'liga boshqa odamning faylini yoza olardi | Past |
| V6 | Clickjacking: sayt istalgan begona sahifa ichiga joylanardi; Telegram kirishida blok tekshiruvi to'liq emas | Past |

Va **5 ta ehtimoliy** (xavfsiz sinab bo'lmaydigan yoki sozlamaga bog'liq) muammo — 5-bo'lim. Eng muhimi: **P1 —
kirish kodlari chegarasini tugatib, hammaning kirishini to'xtatish** (Captcha kerak).

## 2. Ilova tuzilmasi

- **Ilova:** Expo (React Native) — telefon, brauzer va Telegram Mini App uchun bitta kod. Sayt — Cloudflare Workers
  (statik fayllar, `public/_headers`).
- **Server:** o'z serverimiz yo'q — Supabase: Postgres + PostGIS (RLS, triggerlar, SECURITY DEFINER funksiyalar),
  Auth (telefon + kod), Storage (3 ta papka), Realtime (postgres_changes, RLS bilan), 8 ta Edge Function.
- **Kirish:** telefon → kod. Kod yo'li: Telegram bot (raqamni Telegram tasdiqlagan bo'lsa) → Eskiz SMS → VAQTINCHA
  ilova ekranida (faqat yangi raqamga). Telegram Mini App — `initData` imzosi (HMAC) + raqam → bir martalik magic link.
- **Ishonch chegaralari:** brauzer/ilova (ishonchsiz) ↔ PostgREST (`anon`/`authenticated`, RLS) ↔ Edge Functions
  (`service_role`, o'zi tekshiradi) ↔ tashqi xizmatlar (Telegram, Eskiz, Expo Push, OpenStreetMap CDN'lari).
- **Maxfiy ma'lumotlar:** telefon, aniq manzil va uy tafsiloti, pasport va selfi, ustaning balansi, yozishmalar,
  eshik kodi.

## 3. Hujum yuzasi

| Kirish nuqtasi | Kim chaqiradi | Himoya |
|---|---|---|
| PostgREST jadvallari (24 ta) | anon / authenticated | RLS + ustun huquqlari + triggerlar (`*_guard`) |
| RPC: 22 ta anon/authenticated uchun ochiq funksiya | anon | ichida `auth.uid()` tekshiruvi; `otp_screen_code` — faqat yangi raqam kodi |
| RPC: 42 ta authenticated funksiya (28 tasi `admin_*`) | kirgan foydalanuvchi | `assert_admin()` yoki egasi tekshiruvi |
| Ko'rinishlar: `master_cards`, `master_reviews` | anon | ochiq ma'lumot (ism, reyting, ish namunalari) |
| Storage: `documents`, `order-photos` (yopiq), `works` (ochiq) | authenticated | papka = `auth.uid()`, rasm turlari, 10 MB |
| Edge: `dispatch`, `offer-respond`, `free-pass-send` | kirgan foydalanuvchi | JWT + egasi/admin tekshiruvi |
| Edge: `offer-timeout`, `push-send` | pg_cron | `x-cron-secret` |
| Edge: `send-sms` | Supabase Auth hook | Standard Webhooks imzosi |
| Edge: `telegram-bot` | Telegram | `X-Telegram-Bot-Api-Secret-Token` |
| Edge: `telegram-auth` | ilova (Telegram ichida) | `initData` va kontakt imzosi (HMAC, vaqt bilan) |
| Sayt `uyservice.uz` | hamma | HSTS, nosniff, `/admin` — noindex + iframe taqiq |

## 4. Tasdiqlangan zaifliklar

### V1. Raqamni oldindan egallab, keyin egasining hisobini kuzatish — YUQORI

- **Joyi:** `supabase/functions/_shared/otp.ts` → `deliverOtp`, `…_otp_on_screen.sql` / `…_security_audit_2.sql` →
  `otp_screen_put`, `otp_screen_code`; `supabase/functions/telegram-auth/index.ts`.
- **Sabab:** ekrandagi kod (Eskiz ulanmaguncha vaqtincha) yangi raqamga raqam egasi ekanini hech qanday tasdiqlamay
  beriladi. #2 tekshiruv *mavjud* hisoblarni yopgan, lekin *kelajakdagi* egasini emas.
- **Shart:** qurbon hali ilovaga kirmagan; uning Telegram'i botga ulanmagan; Eskiz ulanmagan.
- **Hujum:** hujumchi qurbonning raqamini kiritadi → kod ekranda chiqadi → kiradi va sessiyani saqlab qo'yadi
  (refresh token muddatsiz). Keyin qurbon o'zi kiradi (botga raqamini ulashib, kodni Telegram'dan oladi yoki
  Telegram orqali) — Supabase uni **o'sha hisobga** kiritadi, hujumchining sessiyasi esa yopilmaydi. Hujumchi
  qurbonning manzili, xonadon/domofon, buyurtmalari, yozishmalari, usta bo'lsa — pasporti va balansini ko'radi.
- **Kutilgan:** raqam egasi tasdiqlanganda begona sessiyalar yopilishi. **Haqiqiy:** yopilmasdi.
- **Qo'shimcha (P-turdagi, ham yopildi):** kirgan foydalanuvchi o'z hisobiga raqamni almashtirish (`phone_change`)
  kodini so'rasa, `otp_screen_put` kodni so'ragan hisobni tekshirmasdi — begona yangi raqamni o'ziga yozib olish yo'li.
- **Tuzatish:** ekran orqali ochilgan raqam `otp_screen_claims`ga yoziladi. Shu raqamga kod birinchi marta Telegram
  yoki SMS bilan ketganda (yoki Telegram orqali kirganda) `otp_owner_verified` hisobning **hamma** sessiyalarini
  (`auth.sessions`, `auth.refresh_tokens`) o'chiradi; egasi hozirgina olgan kod bilan yangisini ochadi. Hujumchi qayta
  ekrandan kira olmaydi (avval kirgan hisobga ekranda kod chiqmaydi). `otp_screen_put` endi kod so'ralgan hisobni
  (`p_user`) ham tekshiradi: boshqa raqamli yoki avval kirgan hisob — ekranda emas.
- **Qoldiq xavf:** hujumchining *access token*i muddati tugaguncha (Supabase standarti — 1 soat) ishlaydi. Ekrandagi
  kod qolar ekan, yangi raqamga birinchi kirgan odam egasimi — bilib bo'lmaydi. To'liq yechim — Eskiz SMS ulash va
  `OTP_ON_SCREEN=off`.

```sql
-- egasi tasdiqlandi → begona sessiyalar o'chadi
delete from public.otp_screen_claims where phone = d;
if not found then return false; end if;
delete from auth.refresh_tokens where user_id = any (select i::text from unnest(ids) i);
delete from auth.sessions where user_id = any (ids);
```

### V2. Xarita kutubxonasi CDN'dan imzosiz va sayt bilan bir manzilda — O'RTA

- **Joyi:** `components/map/osm/html.ts` (MapLibre `unpkg.com`dan), `components/map/MapBase.web.tsx` (blob iframe).
- **Sabab:** xarita sahifasi `blob:` manzildan, `sandbox`siz ochiladi — u **uyservice.uz bilan bir manzilga** (origin)
  ega va ota sahifaning `localStorage`iga (Supabase sessiyasi, admin sessiyasi — admin panelda "Jonli xarita" bor)
  yeta oladi. Skript `integrity` (SRI)siz yuklanardi: unpkg buzilsa yoki faylni almashtirsa, begona kod hammaning
  sessiyasini o'g'irlay olardi (ta'minot zanjiri hujumi).
- **Tuzatish:** `<script>` va `<link>`ga SHA-384 `integrity` + `crossorigin="anonymous"`. Fayl o'zgarsa brauzer uni
  ishga tushirmaydi, xarita zaxira ko'rinishga o'tadi (`onerror` → `script`).
- **Dalil:** Playwright'da asl fayl yuklanadi (`maplibregl` bor), bitta qator qo'shilgan fayl — bloklanadi.

### V3. Storage'ni cheksiz to'ldirish — O'RTA

- **Joyi:** `…_storage_realtime.sql` → `"storage: o'z papkam (yuklash)"`.
- **Sabab:** faqat papka egasi va 10 MB/fayl tekshirilardi, fayllar soni — yo'q. Ochiq `works` papkasiga skript bilan
  minglab fayl yuklab, Storage'ni (bepul tarifda 1 GB) to'ldirish mumkin edi — ish namunalari va hujjatlar yuklanmay qoladi.
- **Tuzatish:** `storage_upload_ok()` — bitta foydalanuvchi sutkasiga 40 ta, jami 300 ta fayl (ilovada eng ko'pi:
  anketa 9, ish namunalari 12, buyurtma rasmi 3 × 10). Admin — cheklovsiz.

### V4. Matn va ro'yxat maydonlari cheklanmagan — O'RTA

- **Joyi:** `profiles.name`, `profiles.push_token`, `masters.first_name/last_name/categories/works`,
  `orders.address/cancel_reason/photos`, `reviews.comment/tags`.
- **Sabab:** ilova `maxLength` qo'yadi, server — yo'q. API orqali megabaytlik ism/manzil/sharh yozib, bazani
  (500 MB) to'ldirish yoki ustaning/adminning ekranini buzish mumkin edi (sharh hammaga ochiq ko'rinadi).
- **Tuzatish:** `check` cheklovlar (`not valid` — eski qatorlar tekshirilmaydi): ism ≤ 120, manzil ≤ 500, sabab ≤ 1000,
  sharh ≤ 2000, rasm ≤ 10, ish namunasi ≤ 30 va h.k. (ilovadagidan ancha keng).

### V5. Usta boshqa odamning fayl yo'lini yoza olardi — PAST

- **Joyi:** `masters.passport_path/selfie_path/photo_path/works` (`masters_guard`da tekshiruv yo'q edi).
- **Sabab:** `orders.photos` uchun #1 tekshiruvda yopilgan teshik ustalarda qolgan edi. Usta boshqa ustaning pasport
  yo'lini yozsa, admin tekshiruvida begona pasport "uning hujjati" bo'lib ko'rinardi (fayl nomida vaqt bor — taxmin
  qilish qiyin, shuning uchun past).
- **Tuzatish:** `masters_paths_guard` — yo'l faqat `<o'z id>/…`, `..` yo'q, ≤ 300 belgi.

### V6. Clickjacking va Telegram kirishida blok tekshiruvi — PAST

- **Clickjacking:** `/*` uchun hech qanday iframe cheklovi yo'q edi (Telegram veb-versiyasi uchun ataylab) — begona
  sayt uyservice.uz'ni yashirin joylab, foydalanuvchini aldab bostirishi mumkin edi. Tuzatish:
  `Content-Security-Policy: frame-ancestors 'self' https://web.telegram.org https://*.telegram.org`; `/admin*` — `'none'`.
- **Telegram kirishi:** bloklangan hisob faqat Telegram allaqachon bog'langan bo'lsa to'xtatilardi; birinchi Telegram
  kirishida (kontakt orqali) — yo'q. Tuzatish: har doim `profiles.blocked_at` tekshiriladi.

## 5. Ehtimoliy zaifliklar (xavfsiz sinab bo'lmaydi yoki sozlamaga bog'liq)

| # | Muammo | Daraja | Nima qilish kerak |
|---|---|---|---|
| P1 | **Kirishni to'xtatish:** kod chegarasi butun loyiha uchun soatiga 300 ta (`deploy-supabase.yml`). Skript har xil raqamlarga kod so'rab, bir soat ichida hammaning kirishini to'xtatishi mumkin; Eskiz ulangach — har SMS pul (SMS pumping). DoS bo'lgani uchun sinalmadi. | O'rta | Supabase → Authentication → Attack Protection → **Captcha (Cloudflare Turnstile, bepul)** yoqish + ilovaga Turnstile vidjeti. Alohida vazifa. |
| P2 | **Ekrandagi kod — soxta hisoblar:** yangi raqamga egasini tekshirmay kod beriladi, ya'ni istalgancha hisob ochish mumkin (soxta buyurtmalar bilan ustalarni bezovta qilish — har hisobga 3 faol / sutkasiga 10). V1, V3, V4 zararini kamaytirdi, ildizi — vaqtinchalik qaror. | O'rta | Eskiz paketini olish → `ESKIZ_*` sirlari → `OTP_ON_SCREEN=off`. |
| P3 | **Email orqali ro'yxatdan o'tish:** Supabase'da Email provayderi yoqilgan bo'lsa, telefonsiz hisob ochish mumkin (Telegram kirishi yashirin email ishlatadi, shuning uchun o'chirib bo'lmaydi). | Past | ✅ Har deploy'da `mailer_autoconfirm=false` qilinadi (`deploy-supabase.yml`) — email tasdiqlanmasa hisob ochilmaydi. |
| P4 | **Ustalar ro'yxati hammaga ochiq:** `master_cards` (anon) — hamma ustaning id, to'liq ismi, surati; raqobatchi butun bazani yig'ib olishi mumkin. | Past | ✅ Familiya faqat bosh harf bilan: "Alisher V." (`…_security_audit_3b.sql`). |
| P5 | **Fayllar qoladi:** hisob o'chirilganda fayllar faqat ilova tomonidan o'chiriladi (xato bo'lsa pasport Storage'da qoladi); pasport almashtirilsa eskisi qoladi. | Past | ✅ Server navbati `storage_trash` → `offer-timeout` Storage API bilan o'chiradi (`_shared/cleanup.ts`). |

Ma'lumot uchun (zaiflik emas): Edge Function'lar 500 xatoda ichki xato matnini qaytarardi — ✅ endi `server_error`
(matn logda); deploy'da Supabase CLI versiyasini olish ba'zan "rate limit" bilan to'xtardi — ✅ bir marta qayta urinadi; CORS `*` (cookie yo'q,
token bilan — xavfsiz); admin 8 soatlik chiqishi faqat ilova tomonida (server sessiyasi refresh token bilan uzayadi);
eshik kodi 4 xonali (5 xato → 10 daqiqa — usta allaqachon tayinlangan, maqsad — shaxsini tasdiqlash).

## 6. Xavf bahosi

| # | Ehtimollik | Ta'sir | Daraja | Holat |
|---|---|---|---|---|
| V1 | O'rta (raqamni bilish yetarli, kutish kerak) | Yuqori (manzil, hujjat, balans) | Yuqori | ✅ tuzatildi |
| V2 | Past (CDN buzilishi kerak) | Juda yuqori (hamma sessiya) | O'rta | ✅ tuzatildi |
| V3 | Yuqori (skript bilan oson) | O'rta (fayl yuklash to'xtaydi) | O'rta | ✅ tuzatildi |
| V4 | Yuqori | O'rta | O'rta | ✅ tuzatildi |
| V5 | Past | O'rta | Past | ✅ tuzatildi |
| V6 | Past | Past | Past | ✅ tuzatildi |
| P1 | O'rta | Yuqori (hech kim kira olmaydi) | O'rta | ⏳ Captcha kerak |
| P2 | Yuqori | O'rta | O'rta | ⏳ Eskiz kerak |

## 7. Dalillar va qayta ishlab chiqarish (faqat mahalliy sinov bazasi)

```bash
bash supabase/tests/run.sh                                  # SQL sinovlar
PGRST_BIN=/yo'l/postgrest bash supabase/tests/run.sh        # + E2E
```

- V1: `security3_test.sql` — raqam ekran orqali ochiladi, "hujumchi" sessiyasi yaratiladi, egasi tasdiqlanganda
  sessiya va refresh token yo'qoladi; da'vosiz raqam va boshqa foydalanuvchi sessiyasiga tegilmaydi; oddiy
  foydalanuvchi `otp_owner_verified` va `otp_screen_claims`ga yeta olmaydi. `otp_e2e.ts` — SMS ketganda da'vo yopiladi;
  kirgan hisob begona yangi raqamga ekrandan kod ololmaydi.
- V2: Playwright: asl fayl — `typeof maplibregl === 'object'`; o'zgartirilgan fayl — `undefined`, `onerror` ishladi.
- V3: 40 ta fayl yuklanadi, 41-chisi — `insufficient_privilege`.
- V4: 5000 belgili ism va 10 000 belgili manzil — `check_violation`.
- V5: boshqa id papkasidagi pasport yo'li va `..` — `insufficient_privilege`; o'z papkasi — o'tadi.

## 8. Tavsiya etilgan tuzatishlar (navbat bilan)

1. ✅ V1–V6 — shu PR'da.
2. **Eskiz SMS'ni ulash va ekrandagi kodni o'chirish** (`OTP_ON_SCREEN=off`) — P2 va V1'ning ildizi.
3. **Captcha (Turnstile)** kirish kodiga — P1.
4. ✅ P3, P4, P5 — ikkinchi PR'da (`…_security_audit_3b.sql`, `_shared/cleanup.ts`, `deploy-supabase.yml`).
5. Eskiz ulanguncha ekrandagi kod qoladi (egasining qarori, 5-noyabr) — V1 tuzatishi shu davrda himoya qiladi.

## 9. Xavfsiz kod bo'yicha qoidalar (keyingi ishlar uchun)

- Foydalanuvchi yozadigan har bir yangi ustun — server `check` chegarasi bilan (ilovadagi `maxLength` yetmaydi).
- Fayl yo'li saqlanadigan har ustun — `<auth.uid()>/` bilan boshlanishi trigger bilan tekshirilsin.
- Yangi SECURITY DEFINER funksiya: `set search_path`, ichida `auth.uid()`/`assert_admin()`, `revoke … from public, anon`.
- Tashqi CDN'dan skript — faqat aniq versiya + `integrity`.
- Kirish yo'lini o'zgartirganda: "raqam egasi tasdiqlanganmi?" va "eski sessiyalar nima bo'ladi?" — ikkalasini o'ylash.

## 10. Sinov ro'yxati (har relizdan oldin)

- [ ] `bash supabase/tests/run.sh` (CI o'zi ishga tushiradi) — hammasi PASS.
- [ ] Oddiy foydalanuvchi bilan: boshqa odamning buyurtmasi, profili, balansi, hujjati, chatini o'qib/o'zgartirib bo'lmaydi.
- [ ] Admin bo'lmagan hisob `admin_*` funksiyasini chaqirsa — `42501`.
- [ ] Yangi ustun/jadval: RLS yoqilgan, `anon` huquqi kerakmi — tekshirildi.
- [ ] Narx, balans, reyting, tasdiq holati, `fee_percent` — faqat server yozadi.
- [ ] Yangi Edge Function: JWT yoki imzo tekshiruvi, xato matnida maxfiy narsa yo'q.
- [ ] Yangi tashqi skript — `integrity` bor.
- [ ] Kalitlar faqat Supabase/Cloudflare/GitHub sirlarida, `.env` git'da yo'q.
