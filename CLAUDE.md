# UyService — Texnik topshiriq (CLAUDE.md)

Claude Code har safar shu faylni o'qiydi. Asl TZ: "UstaTop — Texnik topshiriq (TZ)", 6-oktabr 2026.
Quyida asl TZ + keyin qabul qilingan qarorlar.

## 0. Qabul qilingan qarorlar (asl TZ'dagi ochiq savollar)

| Savol | Qaror |
|---|---|
| Platforma nomi | **UyService**, domen **uyservice.uz** ("UstaTop" o'rniga) |
| Logotip | Hozircha yo'q — vaqtinchalik belgi `components/ui/Logo.tsx` (uy tomi + kalit). Haqiqiy logo kelganda faqat shu fayl almashadi |
| Chaqiruv narxi | **50 000 so'm**, hamma kategoriya uchun bir xil — `constants/categories.ts` → `CALL_FEE` |
| Komissiya yoki obuna | **Usta o'zi tanlaydi**: oylik obuna YOKI komissiya. Ro'yxatdan o'tishda `master/plan` ekrani, keyin "Daromad" → "Tarifni o'zgartirish". Narx/foiz: `constants/billing.ts` (⚠️ 149 000 so'm/oy va 10% — hali tasdiqlanmagan) |

## 1. Loyiha haqida qisqacha

UyService — Toshkentda uyga usta chaqirish ilovasi: mijoz kategoriyani tanlaydi, tizim Yandex Go'dagidek eng mos ustani topib beradi, mijoz uni xaritada kelayotganini ko'rib turadi.

**Kim uchun:** Mijoz (uyida muammo bo'lgan odam), Usta (santexnik, elektrik va boshqa mutaxassislar), Admin (ustalarni tasdiqlaydi, buyurtmalarni kuzatadi).

**MVP ichida bor:** bitta mobil ilova, ikki rejim (Mijoz / Usta, kirishda tanlanadi); 6 ta kategoriya: Santexnik, Elektrik, Konditsioner, Mebel, Ta'mirlash, Maishiy texnika; "Hozir kerak" rejimi (real vaqtda qidirish va xaritada kuzatish); telefon raqam + SMS kod; baholash va "Mening ustalarim"; faqat naqd to'lov; ustaning tarif tanlovi (obuna / komissiya).

**MVP ichida yo'q (keyingi bosqichlar):** "Vaqtni tanlash" (ilovada "Tez kunda" belgisi bilan turibdi), karta orqali to'lov (Click/Payme), chat, rus tili, veb-sayt, alohida admin panel.

## 2. Texnologiyalar

Hammasi TypeScript'da, o'z serverimiz yo'q.

| Qism | Nima ishlatamiz |
|---|---|
| Mobil ilova | Expo SDK 57 (React Native) + TypeScript |
| Ekranlar orasida o'tish | Expo Router (fayl nomi = ekran) |
| Xarita | react-native-maps (Android — Google Maps; iOS Expo Go'da Apple Maps) |
| Yo'nalish va vaqt | Hozircha bepul OSRM (OpenStreetMap) — haqiqiy ko'chalar bo'ylab yo'l va vaqt (`lib/routes.ts`); 7-bosqichda Google Routes API |
| Manzil qidirish | Google Places API (keyinroq) |
| Animatsiyalar | react-native-reanimated 4 |
| Pastdan chiqadigan panel | @gorhom/bottom-sheet 5 |
| Backend | Supabase (Postgres + PostGIS, Auth, Realtime, Edge Functions, Storage) |
| SMS kod | Supabase Auth + Eskiz.uz |
| Bildirishnomalar | Expo Notifications |
| Holat boshqaruvi | Zustand (`store/`) |
| Ikonkalar | lucide-react-native (chiziqli, 2 px) |
| Shriftlar | Manrope (matn), Unbounded (faqat logotip) |

Yangi paket: `npx expo install <paket>`. Tekshirish: `npm run typecheck`.

## 3. Papka tuzilmasi

```
app/                      ← ekranlar (Expo Router)
  _layout.tsx             ← shriftlar, gesture, safe-area
  index.tsx               ← rolga qarab yo'naltirish
  (auth)/phone.tsx        ← telefon raqam (/phone)
  (auth)/code.tsx         ← SMS kod (/code)
  (auth)/role.tsx         ← Mijoz yoki Usta (/role)
  client/index.tsx        ← bosh sahifa: xarita + kategoriyalar (/client)
  client/order.tsx        ← muammo, tavsif, rasm, narx
  client/searching.tsx    ← usta qidirilmoqda (to'lqinlar)
  client/tracking.tsx     ← usta yo'lda
  client/rate.tsx         ← ish tugadi, baholash
  client/history.tsx      ← buyurtmalar tarixi
  master/plan.tsx         ← tarif tanlash: obuna yoki komissiya
  master/index.tsx        ← onlayn/oflayn + xarita
  master/offer.tsx        ← yangi buyurtma, 15 soniya taymer
  master/job.tsx          ← mijozga borish, ishni boshlash/tugatish
  master/earnings.tsx     ← daromad, reyting, tarif
components/
  map/                    ← xarita bilan bog'liq hamma narsa
    MapBase.tsx           ← haqiqiy xarita (Android/iOS)
    MapBase.web.tsx       ← brauzer uchun soxta xarita (faqat dizaynni ko'rish)
    PulseRings.tsx, ClientDot.tsx, CenterPin.tsx, MasterIcon.tsx, RouteLine.tsx
    mapStyle.json         ← xarita ranglari
  ui/                     ← Button, Card, Chip, Rating, Logo, ...
  sheets/Sheet.tsx        ← pastdan chiqadigan panel
lib/                      ← i18n, geo, location, routes, supabase
store/                    ← Zustand (foydalanuvchi, buyurtma, usta)
constants/                ← theme, categories (+ CALL_FEE), dispatch, billing
locales/uz.json           ← ilovadagi barcha matnlar
mocks/                    ← soxta ma'lumotlar (5-bosqichgacha); soxta ustalar har doim mijoz manzili atrofida (`mastersAround`)
design/                   ← dizayn skrinshotlari
supabase/migrations, supabase/functions/{dispatch,offer-timeout}  ← 5–7-bosqich
```

Eslatma: asl TZ'da `(client)/`, `(master)/` guruhlari edi; ikkala guruhning `index.tsx`i bir xil `/` manzilga to'qnashgani uchun oddiy `client/` va `master/` papkalari ishlatildi.

## 4. Ekranlar

**Mijoz:** Bosh sahifa (to'liq ekran xarita, manzil, qidiruv, "Hozir kerak", 6 kategoriya, "Mening ustalarim") → Buyurtma (muammo chiplari, taxminiy narx, tavsif, 3 tagacha rasm, chaqiruv narxi 50 000, kafolat) → Qidirilmoqda (to'lqinlar, miltillovchi ustalar, holat matni, progress) → Usta yo'lda (harakatlanuvchi belgi, yo'l chizig'i, "N daqiqa", profil, qo'ng'iroq) → Ish tugadi (narx tafsiloti, kafolat sanasi, 5 yulduz, teglar, "Mening ustalarim") → Tarix (qayta chaqirish).

**Usta:** Tarif tanlash (birinchi kirishda) → Bosh sahifa (katta Onlayn/Oflayn tugma, bugungi daromad, aktivlik) → Yangi buyurtma (15 s aylana taymer, tebranish, qabul/rad) → Ish jarayoni (Yetib keldim → Ishni boshladim → Tugatdim + yakuniy narx, platforma ulushi tarifga qarab) → Daromad (kun/hafta/oy, reyting, aktivlik, joriy tarif).

**Kirish:** telefon → SMS kod → rol. Usta ro'yxatdan o'tganda ism, kategoriyalar, pasport rasmi va ish namunalarini yuklaydi; admin tasdiqlamaguncha buyurtma olmaydi (`useMaster().verified`).

## 5. Xarita va animatsiyalar

- Xarita har doim to'liq orqa fonda, panellar ustidan chiqadi; 60 fps.
- O'z rang uslubimiz (`mapStyle.json`): POI o'chirilgan, yo'llar oq, binolar och kulrang-yashil.
- Ochilganda kamera telefonning haqiqiy joyiga (GPS) 16-zoom bilan uchib keladi; ko'k nuqta — foydalanuvchi joyi; "joylashuv" tugmasi har bosilganda GPS'ni qayta oladi.
- Pin ustida pufakcha: eng yaqin ustagacha taxminiy vaqt ("3 daq"), Yandex'dagidek.
- Mijoz belgisi: to'q sariq doira + "nafas oluvchi" halqa. Manzil xaritani surish bilan tanlanadi: markazdagi pin surilganda ko'tariladi, to'xtaganda tushadi.
- Atrofdagi ustalar ~100 m aniqlikda (`lib/geo.ts` → `blur`).
- Qidiruv: 3 ta to'lqin (2,4 s, 0,8 s farq, cheksiz) — xaritaning o'zida metrda chiziladi (`usePulse` + `Circle`), xarita surilsa nuqtadan ajralmaydi; usta belgilari 0,35 ↔ 1 miltillaydi; kamera 16 → 14.
- Usta yo'lda: yo'l ko'chalar bo'ylab (OSRM), soxta GPS har 5 s da yo'l bo'ylab ~60 m; nuqtalar orasida 5 s silliq interpolatsiya + burilish; "N daqiqa" qolgan yo'l uzunligidan; yo'l chizig'i chiziq-chiziq (iOS'da oqadi; Android'da `lineDashPhase` yo'q); kamera ikkalasini `fitToCoordinates`.
- Tugmalar bosilganda biroz kichrayadi (`components/ui/Pressable.tsx`), panellar prujina bilan chiqadi.
- Usta ilovasi: SVG aylana taymer 15 → 0, oxirgi 5 soniyada tebranish.

## 6. Ma'lumotlar bazasi (Supabase, 5-bosqich)

9 ta jadval, hammasiga RLS: `profiles`, `masters`, `master_locations`, `categories`, `problems`, `orders`, `offers`, `reviews`, `favorites`.

Qo'shimcha (tarif qarori uchun):
- `masters.billing_plan` — `'subscription' | 'commission'`
- `masters.plan_changed_at` — oxirgi o'zgartirish sanasi
- `subscriptions` — (master_id, period_start, period_end, amount, status) — obuna to'lovlari
- `orders.platform_fee` — komissiya tarifidagi ustadan olinadigan ulush (`constants/billing.ts` → `platformCut`)

`categories.call_fee` = 50 000 (hammasi uchun).

Buyurtma holatlari: `searching → assigned → on_the_way → arrived → in_progress → completed`, istalgan joyda `cancelled`.

## 7. Usta qidirish algoritmi

Koeffitsientlar: `constants/dispatch.ts`. Filtr (kategoriya, onlayn, tasdiqlangan, band emas, rad etmagan) → radius 3/6/10 km → eng yaqin 10 ta uchun Google Routes → ball:

`ball = 100 − (yetib kelish daqiqasi × 3) + (reyting − 4) × 20 + aktivlik × 0,2 + prioritet ballari`

Eng yuqori ballga taklif, 15 s taymer. Rad/vaqt o'tdi → aktivlik −5, keyingi ustaga. 3 radiusdan keyin ham topilmasa (≈3 daqiqa) — "Hozir bo'sh usta yo'q" + "Qayta urinish". Aktivlik: qabul +2, rad −5, bekor −10; 0–100. "Mening ustalarim"dan tanlansa — taklif birinchi unga.

## 8. Dizayn qoidalari

| Narsa | Qiymat (`constants/theme.ts`) |
|---|---|
| Asosiy rang | `#0E5A4B` to'q yashil (ishonch), ustidagi matn oq |
| Urg'u rangi | `#E8772E` to'q sariq (mehnat/asbob rangi) — mijoz nuqtasi, yulduzlar, aktivlik |
| Matn | `#0B2A24` asosiy, `#4E625C` ikkinchi darajali |
| Fon | `#F6F8F7` sahifa, `#FFFFFF` kartalar |
| Xarita foni | `#E9EEEB`, yo'llar oq |
| Burchaklar | tugma 16, karta 18, panel 28 |
| Tugma balandligi | kamida 44, asosiy tugma 56 |

- Har bir ekranda bitta asosiy (yashil) tugma, qolganlari och kulrang.
- Panellar pastdan chiqadi, yuqori burchaklari yumaloq, tepasida tortish chizig'i.
- Hamma matn `locales/uz.json`da (o'zbek, lotin), kodda `t('kalit')`.
- Tungi rejim MVP'da yo'q. Yandex ranglari/logotipi ishlatilmaydi.

## 9. Bosqichlar

1. ✅ Loyiha skeleti, papkalar, `theme.ts`.
2. ✅ Xarita: `MapBase`, `mapStyle.json`, uchib kelish, nafas oluvchi nuqta.
3. ✅ Mijoz ekranlari (soxta ma'lumot bilan).
4. ✅ Animatsiyalar (to'lqinlar, miltillash, zoom, silliq usta belgisi, oqib turuvchi yo'l) — telefonda sinab ko'rish kerak.
5. ⏳ Supabase: migratsiyalar, PostGIS, RLS, telefon + SMS (Eskiz.uz) kirish.
6. 🟡 Usta ilovasi — ekranlar tayyor (soxta), joylashuvni har 5 s `master_locations`ga yozish qoladi.
7. ⏳ Taqsimlash: `supabase/functions/dispatch`, `offer-timeout`, Realtime.
8. ⏳ Sayqal: push, xatolar, internet yo'qligi, ikki telefonda sinov.

## 10. Ishga tushirish

```bash
npm install
cp .env.example .env      # kalitlarni yozing (git'ga yuklanmaydi)
npx expo start            # telefonda Expo Go bilan QR kodni skanerlang
npm run web               # brauzerda (xarita soxta, faqat dizayn uchun)
npm run typecheck
```

Xarita Expo Go'da ishlamasa — "development build": `npx eas-cli build --profile development`.

## 11. Kalitlar

Google va Supabase kalitlari `.env` faylida, git'ga yuklanmaydi. Google kalitini faqat ilovangizga cheklang (Google Cloud → Credentials → Application restrictions; paket nomi `uz.uyservice.app`).
