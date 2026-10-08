# UyService — Texnik topshiriq (CLAUDE.md)

Claude Code har safar shu faylni o'qiydi. Asl TZ: "UstaTop — Texnik topshiriq (TZ)", 6-oktabr 2026.
Quyida asl TZ + keyin qabul qilingan qarorlar.

## 0. Qabul qilingan qarorlar (asl TZ'dagi ochiq savollar)

| Savol | Qaror |
|---|---|
| Platforma nomi | **UyService**, domen **uyservice.uz** ("UstaTop" o'rniga) |
| Logotip | **Xaritadagi belgi (pin) ichida uy** (B varianti, 7-oktabr): yashil `#0E5A4B` pin, oq uy, to'q sariq eshik — "yaqiningizdagi ustani xaritada topamiz". Yozuv: **Uy** yashil (rangli fonda — to'q sariq) + **Service**. Ilova ichida — `assets/logo.png` (yashil) va `logo-light.png` (oq; tungi rejim va rangli fon), `components/ui/Logo.tsx` → `LogoMark` (`light` berilmasa rejimga qarab); ilova ikonkasi — `assets/icon.png` (yashil fon, oq pin); Android — `android-icon-foreground/background/monochrome.png`; ochilish ekrani — `splash-icon.png` (oq fon) va `splash-icon-dark.png` (tungi); brauzer — `favicon.png`. Asl SVG — `design/logo/` |
| Chaqiruv narxi | **50 000 so'm**, hamma kategoriya uchun bir xil — `constants/categories.ts` → `CALL_FEE`. **Ish qilinsa — narx ichida**: usta kelib ko'radi, narx taklif qiladi (ish ≥ 50 000 + ehtiyot qismlar), mijoz ilovada tasdiqlaydi; rozi bo'lmasa — faqat 50 000 (ko'rik), kafolat yo'q |
| Sayt rejimi | Supabase kaliti yo'q ekan — **sinov rejimi** (`lib/demo.ts` → `DEMO`): tepada doim "Sinov rejimi" belgisi (`components/ui/DemoBanner.tsx`), demo tugmalar ("Keyingisi (demo)", "Demo: admin tasdiqladi", balansni to'ldirish) faqat shu rejimda ko'rinadi |
| Pasport va selfi | **Ixtiyoriy.** Usta ularsiz ham buyurtma oladi, faqat platforma ulushi **+5 foiz punkt**: komissiya 10% → 15%, obuna 0% → 5% (balansdan). Pasport yuklanib admin tasdiqlagach qo'shimcha olib tashlanadi. `constants/billing.ts` → `UNVERIFIED_SURCHARGE_PERCENT`, `feePercent()`; server — `master_fee_percent()` |
| Admin panel | **uyservice.uz/admin** — alohida sayt emas, shu ilovaning `app/admin/` bo'limi (kompyuter uchun yon menyu, telefonda chiqadigan menyu). Kirish: admin raqami + SMS kod (`profiles.role = 'admin'`; sinov rejimida — kompaniya raqami, istalgan 6 xonali kod). Batafsil — 4-bo'lim "Admin" |
| Telegram | **Bot + Mini App**: botdagi "Ochish" tugmasi uyservice.uz'ni Telegram ichida ochadi; "Telegram orqali kirish" — raqamni Telegram tasdiqlaydi, SMS kerak emas, keyingi safar o'zi kiradi (`lib/telegram.ts`, `supabase/functions/telegram-auth`, `telegram-bot`; sozlash — `supabase/README.md` 11-bo'lim). Bot tokeni faqat Supabase sirlarida (`TELEGRAM_BOT_TOKEN`), ilovada/git'da emas. Bildirishnomalar ("Yangi buyurtma", "Usta topildi" …) telefon ilovasi bo'lmagan Telegram foydalanuvchisiga **bot xabari** bo'lib keladi ("Ochish" → kerakli ekran; `…_telegram_push.sql`, `_shared/push.ts`), kirgach bot yozishiga ruxsat so'raladi |
| Komissiya yoki obuna | **Usta o'zi tanlaydi**: oylik obuna YOKI komissiya. Ro'yxatdan o'tishda `master/plan` ekrani, keyin "Daromad" → "Tarifni o'zgartirish". Narx/foiz: `constants/billing.ts` (⚠️ 149 000 so'm/oy va 10% — hali tasdiqlanmagan) |

## 1. Loyiha haqida qisqacha

UyService — O'zbekiston bo'ylab uyga usta chaqirish ilovasi (xizmat hududi — butun respublika: mijoz qayerda bo'lsa, o'sha atrofdagi ustalar): mijoz kategoriyani tanlaydi, tizim Yandex Go'dagidek eng mos ustani topib beradi, mijoz uni xaritada kelayotganini ko'rib turadi.

**Kim uchun:** Mijoz (uyida muammo bo'lgan odam), Usta (santexnik, elektrik va boshqa mutaxassislar), Admin (ustalarni tasdiqlaydi, buyurtmalarni kuzatadi).

**MVP ichida bor:** bitta mobil ilova, ikki rejim (Mijoz / Usta, kirishda tanlanadi); 6 ta kategoriya: Santexnik, Elektrik, Konditsioner, Mebel, Ta'mirlash, Maishiy texnika; "Hozir kerak" rejimi (real vaqtda qidirish va xaritada kuzatish); telefon raqam + SMS kod; baholash va "Mening ustalarim"; faqat naqd to'lov; ustaning tarif tanlovi (obuna / komissiya).

**MVP ichida yo'q (keyingi bosqichlar):** karta orqali to'lov (Click/Payme), veb-sayt, alohida admin panel. (Qo'shildi: uch til — o'zbek, rus, ingliz; "Vaqtni tanlash" — rejalashtirilgan buyurtma; mijoz ↔ usta chati; manzilni yozib qidirish.)

## 2. Texnologiyalar

Hammasi TypeScript'da, o'z serverimiz yo'q.

| Qism | Nima ishlatamiz |
|---|---|
| Mobil ilova | Expo SDK 57 (React Native) + TypeScript |
| Ekranlar orasida o'tish | Expo Router (fayl nomi = ekran) |
| Xarita | **Yandex Maps** JS API 2.1 — hamma joyda bir xil: telefonda `react-native-webview` ichida (Expo Go'da ham ishlaydi), brauzer/Telegram'da iframe ichida. Kalit: `EXPO_PUBLIC_YANDEX_MAPS_KEY` |
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

Yangi paket: `npx expo install <paket>`. Tekshirish: `npm run typecheck`; server — `bash supabase/tests/run.sh` (GitHub'da CI o'zi ishga tushiradi).

## 3. Papka tuzilmasi

```
app/                      ← ekranlar (Expo Router)
  _layout.tsx             ← shriftlar, gesture, safe-area
  index.tsx               ← rolga qarab yo'naltirish
  welcome.tsx             ← birinchi ochilish: til tanlash (O'zbek / Русский / English)
  (auth)/phone.tsx        ← telefon raqam (/phone?next=order|master)
  (auth)/code.tsx         ← SMS kod
  client/(tabs)/          ← mijoz ilovasi, pastki menyu 4 bo'lim (kompyuterda — chap menyu; components/ui/TabChrome.tsx usta bilan umumiy)
    index.tsx             ← Asosiy (/client): salom + ism, manzil, aylanuvchi banner (chaqiruv narxi, kafolat, usta bo'lish),
                            muammo bo'yicha qidiruv, faol buyurtmalar, "Ko'p so'raladi" chiplari, 6 xizmat, Hozir/Vaqtni tanlash, Mening ustalarim
    map.tsx               ← Xarita (/client/map): oldingi xaritali bosh sahifa o'zgarishsiz (pin, atrofdagi ustalar, kategoriyalar)
    orders.tsx            ← Buyurtmalar: hozirgi buyurtmalar + tarix (components/order/HistoryList.tsx)
    account.tsx           ← Profil (/client/account): mehmon/kirgan, "Usta bo'lib ishlash", til, ko'rinish
  client/address.tsx      ← manzilni yozib qidirish (lib/geocode.ts)
  client/order.tsx        ← muammo, tavsif, rasm, narx; rejalashtirishda kun va soat
  client/searching.tsx    ← usta qidirilmoqda (to'lqinlar, radius, takliflar) yoki rejalashtirilgan buyurtma ┐ ikkalasi bitta ekran —
  client/chat.tsx         ← mijoz ↔ usta chati (buyurtma bo'yicha)
  client/tracking.tsx     ← usta yo'lda (bekor qilish — sabab bilan, components/sheets/CancelSheet.tsx) ┘ components/order/LiveOrder.tsx:
                            bitta xarita, faqat panel almashadi (SearchingPanel ↔ TrackingPanel) — usta topilganda xarita qayta yuklanmaydi
  client/master.tsx       ← usta haqida: reyting, maqtovlar, sharhlar
  client/rate.tsx         ← ish tugadi, baholash
  client/history.tsx      ← buyurtmalar tarixi (useHistory, telefonda saqlanadi: baho, izoh, bekor sababi)
  usta.tsx                ← uyservice.uz/usta?ref=KOD — do'st yuborgan "Usta bo'lib ishlash" havolasi (kod anketaga o'zi yoziladi)
  about.tsx               ← "Biz haqimizda": logotip bosilganda ochiladi (missiya, qanday ishlaydi, kafolatlar, aloqa — constants/company.ts: support@uyservice.uz, Telegram @uyservice_bot, +998 90 121 88 87, 08:00–22:00)
  admin/                  ← admin panel (uyservice.uz/admin): login.tsx — kirish; (panel)/ — himoyalangan bo'limlar
    (panel)/_layout.tsx   ← huquq tekshiruvi (adminApi.me), 8 soat harakatsizlik → qayta kirish, AdminShell + Stack
    (panel)/index.tsx     ← bosh sahifa: KPI (oldingi davrga nisbatan), hozirgi holat, grafiklar, kategoriyalar, top ustalar
    (panel)/verification, orders/, masters/, users/, reviews, support, map, finance, catalog, log, settings
  legal/[doc].tsx         ← foydalanish shartlari va maxfiylik siyosati (constants/legal.ts, 3 tilda, ⚠️ QORALAMA — yurist tekshirishi kerak)
  master/(tabs)/          ← usta ilovasi, pastki menyu 4 bo'lim (Yandex Pro tuzilmasi)
    index.tsx             ← Buyurtmalar: xarita, filtr, zoom, aktivlik, "surib ishga chiqish"
    money.tsx             ← Pul: kunlik daromad, balans va limit / obuna, tarif
    chats.tsx             ← Chatlar: qo'llab-quvvatlash, yangiliklar, mijozlar
    profile.tsx           ← Profil: reyting, aktivlik, kategoriyalar, tarif, hujjatlar, chiqish
  master/chat/[id].tsx    ← chat oynasi (components/chat/ChatView.tsx)
  master/register.tsx     ← usta anketasi, 4 qadam: profil surati (majburiy)+ism+tajriba, kategoriyalar, pasport (+selfi), ish namunalari
  master/plan.tsx         ← tarif tanlash: obuna yoki komissiya
  master/offer.tsx        ← yangi buyurtma (useMasterWork.offer), 60 soniya taymer
  master/job.tsx          ← mijozga borish, ishni boshlash/tugatish (useMasterWork.job)
  master/documents.tsx    ← hujjatlar, shaxsni tasdiqlash, admin tekshiruvi holati (+ demo tasdiqlash)
  master/works.tsx, edit.tsx, promo.tsx, invite.tsx, learn.tsx, settings.tsx  ← profil bo'limlari
components/
  map/                    ← xarita bilan bog'liq hamma narsa
    MapBase.tsx           ← Yandex xaritasi WebView ichida (Android/iOS)
    MapBase.web.tsx       ← Yandex xaritasi iframe ichida (brauzer); yuklanmasa → FakeMap.tsx
    yandex/html.ts        ← xarita sahifasi: belgilar, to'lqinlar, yo'l, silliq siljish (60 fps sahifaning o'zida)
    yandex/useYandexMap.ts ← props → holat; React ↔ sahifa xabarlari (state / flyTo / zoomBy ↔ moveStart / moveEnd)
    FakeMap.tsx           ← zaxira soxta xarita (faqat dizayn/demo)
    ClientDot.tsx, CenterPin.tsx, MasterIcon.tsx, usePulse.ts, useBlink.ts
  ui/                     ← Button, Card, Chip, Rating, Logo, ...
  admin/                  ← admin UI: kit.tsx (tugma, badge, panel, tabs, qidiruv, sahifalash), Table.tsx (jadval ↔ telefonda kartochka),
                            Dialog.tsx (tasdiqlash / sabab bilan), Charts.tsx (dataviz qoidalari), Shell.tsx (menyu, sahifa, toast), format.ts, csv.ts
  sheets/Sheet.tsx        ← pastdan chiqadigan panel (kompyuterda — chapda suzuvchi oyna); ichidagi matn maydoni — `SheetInput`
  sheets/ModalSheet.tsx   ← oyna ustidagi panel (bekor qilish, filtr): telefonda pastdan, kompyuterda o'rtada dialog
  ui/PageFrame.tsx        ← kompyuter brauzeri: oddiy sahifalar o'rtada ustun (navigator `screenLayout`)
lib/                      ← i18n, geo, location, routes, supabase
  dispatch.ts             ← usta qidirish algoritmi (TZ 7-bo'lim), toza funksiyalar — 7-bosqichda Edge Function'ga ko'chadi
  orderSimulator.ts       ← sinov rejimi: mijoz buyurtmalari uchun soxta "server" (dispatch + soxta ustalar javobi va harakati)
  live.ts                 ← server rejimi (`LIVE` — Supabase kaliti bor): buyurtma yaratish, holatlar Realtime + so'rov (zaxira) bilan,
                            usta kartasi va jonli joyi, narx/kod RPC'lari, usta takliflari, ish bosqichlari, anketa (Storage), baholash
  masterFeed.ts           ← usta tomoni: takliflar oqimi, joylashuvni har 5 s yuborish, useBlocked
  backend.ts              ← ustaning joylashuvi (server rejimida master_locations ga)
  notify.ts               ← bildirishnomalar (mahalliy; ilova orqa fonda bo'lsa chiqadi)
  telegram.ts             ← Telegram Mini App: oyna sozlamalari, avtomatik kirish, requestContact → telegram-auth → sessiya (sinovda — soxta kirish)
  afterSignIn.ts          ← raqam tasdiqlangach (SMS yoki Telegram) qayerga o'tish
  push.ts                 ← serverdan push: Expo push tokeni → profiles.push_token (til, "Yangi buyurtma" sozlamasi bilan); chiqishda o'chiriladi
  geocode.ts              ← manzil qidirish butun O'zbekiston bo'ylab, foydalanuvchiga yaqinlari birinchi (Yandex Geocoder, kalit bo'lmasa OSM Nominatim)
  schedule.ts, photos.ts  ← rejalashtirish vaqtlari; rasm tanlash/suratga olish
  share.ts                ← ulashish (telefonda tizim oynasi, brauzerda nusxalash): taklif havolasi, "Do'stlarga tavsiya qilish"
  yandex.ts               ← Yandex kaliti + HTTP Geocoder (qidiruv, koordinatadan manzil); kalit bo'lmasa — Nominatim / telefon xizmati
  useLayout.ts            ← `useWide()` — kompyuter brauzeri (≥ 900 px): yon panel, o'rtadagi ustun, chap menyu
  useMyLocation.ts        ← telefon joyi (bitta, butun ilova uchun): avval oxirgi ma'lum joy, keyin aniq GPS; `useLocStatus`
  useOnline.ts            ← internet bormi (NetInfo); yo'q bo'lsa tepada banner (components/ui/OfflineBanner.tsx)
  demo.ts                 ← `DEMO` — sinov rejimi (Supabase kaliti yo'q)
  dialog.ts               ← `notice` / `confirm` — brauzerda ham ishlaydi (RN-web'da `Alert.alert` jim). `Alert` ishlatmang
  masterGuard.ts          ← `guardActiveJob` — faol ish bo'lsa rol almashish/chiqish to'xtatiladi
  admin/                  ← admin ma'lumotlari: types.ts (AdminApi), supabase.ts (admin_* view/RPC), demo.ts (sinov rejimi, namunaviy
                            ma'lumotlar butun O'zbekiston bo'ylab, shu brauzerda saqlanadi), rules.ts (chegaralar = server), hooks.ts, session.ts
  supabase.ts, auth.ts    ← Supabase mijozi (faqat .env'da kalit bo'lsa), SMS kod bilan kirish
store/                    ← Zustand (foydalanuvchi, buyurtma, usta)
constants/                ← theme, categories (+ CALL_FEE), dispatch, billing
locales/uz.json           ← ilovadagi barcha matnlar
mocks/                    ← soxta ma'lumotlar (5-bosqichgacha); soxta ustalar har doim mijoz manzili atrofida (`mastersAround`)
design/logo/              ← logotip asl fayllari (SVG, ko'rinish varag'i)
design/print/             ← bosma varaqalar (HTML + PDF + PNG): ustalar uchun A5 (QR → uyservice.uz/usta), podyezd e'loni A4 (QR → uyservice.uz, yirtib olinadigan qismlar)
supabase/                 ← server (tayyor, hali joylanmagan): README.md — joylash bo'yicha qo'llanma
  migrations/             ← 14 ta: jadvallar, mantiq (triggerlar, nearby_masters), RLS, katalog, storage+realtime, cron, admin, narx kelishuvi, push, ochiq sharhlar, Telegram, Telegram orqali bildirishnoma, usta bekor qilsa — keyingi ustaga, promokod va do'st taklifi
  functions/_shared/dispatch.ts ← usta qidirish algoritmining YAGONA manbai (ilova ham shuni ishlatadi)
  functions/{dispatch,offer-respond,offer-timeout,send-sms,push-send,telegram-auth,telegram-bot} ← Edge Functions (send-sms — Eskiz.uz orqali SMS; push-send — push_outbox → Expo Push API yoki Telegram bot; telegram-* — Telegram orqali kirish va bot)
  tests/                  ← run.sh — hammasi: supabase_stub.sql + rls/admin/price/push/telegram/master_cancel/promo_test.sql + unit/ (Telegram imzosi, yo'l bo'yicha vaqt) + e2e/ (usta qidirish va push, Deno + PostgREST)
.github/workflows/ci.yml  ← har push'da: typecheck, deno check, server sinovlari (Postgres+PostGIS+PostgREST)
public/index.html         ← brauzer sahifasi: telefon uchun viewport, theme-color, overscroll yo'q, 100dvh
public/_headers           ← sayt keshi (nomida hash bor fayllar uzoq saqlanadi)
wrangler.jsonc            ← sayt (uyservice.uz) Cloudflare Workers'da: build `npx expo export --platform web` → `dist`, deploy `npx wrangler deploy`; hamma yo'llar index.html'ga (SPA)
eas.json                  ← do'kon uchun build: preview (APK), production; kalitlar expo.dev muhitlaridan (`environment`, supabase/README.md 14-bo'lim)
```

Eslatma: asl TZ'da `(client)/`, `(master)/` guruhlari edi; ikkala guruhning `index.tsx`i bir xil `/` manzilga to'qnashgani uchun oddiy `client/` va `master/` papkalari ishlatildi.

## 4. Ekranlar

**Mijoz** (pastki menyu: Asosiy · Xarita · Buyurtmalar · Profil; bir vaqtda bir nechta usta chaqira oladi — masalan, santexnik va elektrik; faol buyurtmalar bosh sahifada kartalar bo'lib turadi, `useOrders` + `lib/orderSimulator.ts`): Bosh sahifa (to'liq ekran xarita, manzil, qidiruv, "Hozir kerak", 6 kategoriya, "Mening ustalarim") → Buyurtma (muammo chiplari, taxminiy narx, tavsif, 3 tagacha rasm, chaqiruv narxi 50 000, kafolat) → Qidirilmoqda (to'lqinlar, miltillovchi ustalar, holat matni, progress) → Usta yo'lda (harakatlanuvchi belgi, yo'l chizig'i, "N daqiqa", profil, qo'ng'iroq) → Ish tugadi (narx tafsiloti, kafolat sanasi, 5 yulduz, teglar, "Mening ustalarim", 4–5 yulduzda "Do'stlarga tavsiya qilish") → Tarix (qayta chaqirish).

**Usta** (pastki menyu: Buyurtmalar · Pul · Chatlar · Profil — Yandex Pro tuzilmasi, Mejgorod yo'q):
- Buyurtmalar: to'liq xarita, filtr (kategoriya, radius), zoom ±, joylashuv; panelda aktivlik va bugungi daromad, tarif kartasi, "surib ishga chiqish" tugmasi. Buyurtma yopiq bo'lsa tepada qizil banner (balans limitdan past / obuna tugagan); hujjatsiz ishlayotgan bo'lsa — to'q sariq eslatma (bloklamaydi).
- Pul: kunlik daromad + 7 kunlik tanlov, komissiya tarifida balans va limit (`BALANCE_LIMIT`, platforma ulushi ish yakunida balansdan yechiladi), obuna tarifida obuna muddati; "Yordam" → qo'llab-quvvatlash chati.
- Chatlar: qo'llab-quvvatlash, yangiliklar, mijozlar bilan yozishmalar (server rejimida — `chat_messages`, Realtime + har 3 s; admin qo'llab-quvvatlashdan javob beradi; sinovda — mahalliy).
- Profil: reyting, aktivlik, prioritet; kategoriyalar, tarif, to'lov; ish namunalari; hujjatlar, shaxsni tasdiqlash; promokod, do'stni taklif; o'qish (qo'llanma); sozlamalar (bildirishnomalar, til), chiqish. Promokodlar: server rejimida admin yaratadi (admin → Narxlar va katalog → Promokodlar: prioritet 0–50 va/yoki balansga bonus, chegara, muddat; har usta bir marta; `redeem_promo`); sinov rejimida — `UYSERVICE` (+10 prioritet), `BIRINCHI` (+20 000 balans), `USTA2026`. Do'st taklifi: har ustaning kodi `masters.invite_code` (server beradi), yangi usta anketada kiritadi yoki `uyservice.uz/usta?ref=KOD` havolasidan keladi (`apply_invite_code`); u `INVITE_JOBS` = 5 ta ishni bajargach taklif qilganga `INVITE_BONUS` = 30 000 (⚠️ tasdiqlanmagan; server — `invite_bonus()`), balans tarixiga va xabar bilan.
- Tarif tanlash (birinchi kirishda) → Yangi buyurtma (60 s aylana taymer, tebranish, qabul/rad) → Ish jarayoni (Yetib keldim → eshik kodi → narx yuborish → mijoz rozi bo'lsa ish → Tugatdim; mijozdan naqd olinadigan summa va platforma ulushi — qabul paytidagi foiz bo'yicha).
- Usta ish boshlanmasdan (yo'lda / yetib kelgach) sabab bilan bekor qilsa — buyurtma yopilmaydi, **keyingi ustaga o'tadi** (`master_cancel_order`): aktivlik −10, shu usta qayta taklif olmaydi, mijozga "Usta bekor qildi — yangi usta qidirilmoqda" (push + qidiruv ekrani), sabab admin buyurtma sahifasida.

**Narx kelishuvi va eshik kodi** (soxta mijoz/usta — `lib/orderSimulator.ts`: `approvePrice`, `declinePrice`, `completeOrder`; usta — `master/job.tsx`; server rejimida — `lib/live.ts` → RPC'lar):
1. Buyurtmada 4 xonali **eshik kodi** (`makeDoorCode`). Mijoz kuzatuv ekranida ko'radi; usta yetib kelgach mijozdan so'rab kiritadi — noto'g'ri bo'lsa davom etmaydi (kelgan odam o'sha usta ekani tasdiqlanadi).
2. Usta ko'rib **narx yuboradi**: ish (chaqiruv ichida, kamida `CALL_FEE`, ko'pi bilan 10 mln, 3 mln dan oshsa qayta so'raladi) + ehtiyot qismlar. Yoki "Faqat ko'rik (50 000)".
3. Mijoz "Roziman, boshlasin" → ish boshlanadi; "Rozi emasman" → faqat chaqiruv to'lanadi, tarixda "Faqat ko'rik".
4. Taklifda mijoz ismi va aniq manzil qabul qilgandan keyin ko'rinadi. Platforma ulushi foizi usta taklifni **qabul qilgan paytda** qotiriladi (`MasterJob.feePercent`) — ish o'rtasida hujjat almashtirib foizni o'zgartirib bo'lmaydi.
5. Serverda ham xuddi shunday (`…_price_agreement.sql`): eshik kodi `order_secrets`da (usta ko'rmaydi), usta `verify_door_code` (5 xato → 10 daqiqa kutish) → `propose_price` → mijoz `respond_price`; narxni to'g'ridan-to'g'ri yozib bo'lmaydi; usta ichkariga kirgach mijoz bepul bekor qila olmaydi (faqat "Rozi emasman" — ko'rik); ulush foizi `orders.fee_percent`da qotiriladi.

**Saqlanadigan holat** (AsyncStorage, `version` + `migrate`): mijoz buyurtmalari (`uyservice-orders`), tarix (bo'sh boshlanadi), ustaning taklifi va joriy ishi (`uyservice-master-work`) — sahifa yangilansa yo'qolmaydi. Usta daromadi kunlar bo'yicha (`earnings`, `dayKey`, `earningOn`) — "bugun" har kuni noldan. Yangi usta: reyting yo'q ("—"), balans 0 (sinovda 50 000), kategoriyalar bo'sh. Chiqish (`logoutAll`) — hamma store tozalanadi (til, mavzu, oxirgi joy qoladi), oldin tasdiq so'raladi. Usta **profil surati majburiy** (`profile.photo`, old kamera). Brauzerda tanlangan har qanday rasm (muammo rasmi, ish namunalari, hujjat, profil) kichraytirilib data: URL bo'lib saqlanadi — sahifa yangilansa yo'qolmaydi (`lib/photos.ts`: `PHOTO_MAX` 800, `DOC_MAX` 1280, `AVATAR_MAX` 320 px). Telefon raqami operator kodi bilan tekshiriladi (20, 33, 50, 55, 77, 88, 90, 91, 93, 94, 95, 97, 98, 99). Buyurtma topilmasa — `components/ui/NotFound.tsx`.

**Admin** (`app/admin/`, ma'lumot — `lib/admin`: server ulangan bo'lsa `supabase.ts`, aks holda `demo.ts`; ikkalasi bitta `AdminApi`):
- Bo'limlar: Bosh sahifa · Hujjat tekshiruvi · Buyurtmalar · Jonli xarita · Ustalar · Foydalanuvchilar · Sharhlar · Qo'llab-quvvatlash · Moliya · Narxlar va katalog · Amallar jurnali · Sozlamalar.
- Amallar (hammasi jurnalga yoziladi, sabab kerak bo'lganlari — sababsiz bajarilmaydi): hujjatni tasdiqlash/rad etish/qayta tekshiruvga; balans (to'ldirish, bonus, qaytarish, tuzatish — `balance_ops` tarixi); obuna qayd etish; prioritet (−50…+50); bloklash (usta taklif olmaydi, mijoz buyurtma bera olmaydi; adminni bloklab bo'lmaydi); buyurtmani bekor qilish (`cancelled_by = 'admin'`); sharhni o'chirish (reyting qayta hisoblanadi); chaqiruv narxi va narx oraliqlari; adminlarni raqam bo'yicha qo'shish/olib tashlash (o'zini emas); qo'llab-quvvatlashga javob.
- Chegaralar `lib/admin/rules.ts` = server (`…_admin.sql`). Filtrlar manzil satrida (`?f=active&q=...`) — havolani ulashsa bo'ladi. Ro'yxatlar CSV (Excel) ga yuklanadi. Grafiklarda "Jadval" ko'rinishi bor.
- Sinov rejimida shu qurilmada ro'yxatdan o'tgan usta ham ro'yxatda (`LOCAL_MASTER_ID`) — admin tasdiqlasa/balans qo'shsa, ilovadagi `useMaster` ham o'zgaradi. Sozlamalar → "Sinov ma'lumotlarini tiklash".
- Xavfsizlik: `/admin*` — `noindex`, `X-Frame-Options: DENY` (`public/_headers`); 5 marta noto'g'ri kod — 60 s kutish; 8 soat harakatsizlik — chiqish.

**Rejalashtirish ("Vaqtni tanlash"):** bugun/ertaga/indinga, 08:00–21:00 har soat, eng erta — hozirdan 1,5 soat keyin. Buyurtma `scheduled` holatida turadi, usta qidirish belgilangan vaqtdan 30 daqiqa oldin avtomatik boshlanadi (`SCHEDULE_LEAD_MS`).

**Bildirishnomalar:** bosilganda tegishli ekran ochiladi (`data.url`, `useNotificationTaps`); mijozga "Usta topildi", "Usta yetib keldi", "Usta narx taklif qildi", "Ish tugadi", "Bo'sh usta yo'q"; ustaga "Yangi buyurtma" (Sozlamalarda o'chirish mumkin). Ilova ekranda ochiq bo'lsa chiqmaydi. Server ulanganda xuddi shu xabarlar serverdan push bo'lib keladi (ilova yopiq bo'lsa ham): triggerlar → `push_outbox` → `push-send` (Expo Push API), foydalanuvchi tilida; ustaga qo'shimcha "Mijoz narxga rozi / rozi emas", "Mijoz bekor qildi". Sozlash — `supabase/README.md` 10-bo'lim (EAS projectId + FCM kerak).

**Kirish (mehmon birinchi):** ilova ochilganda — til tanlash, keyin darhol mijoz bosh sahifasi. Telegram ichida ochilsa — raqam ekranida birinchi "Telegram orqali kirish" (SMS'siz), server rejimida bog'langan foydalanuvchi ochilishi bilan o'zi kiradi. Ro'yxatdan o'tish (telefon → SMS kod) faqat mijoz hamma narsani tanlab "Usta chaqirish"ni bosganda so'raladi; tasdiqlangach buyurtma avtomatik yuboriladi. Usta bo'lish — Profil → "Usta bo'lib ishlash" (raqam tasdiqlanadi → tarif). Til, raqam, rol telefonda saqlanadi (AsyncStorage). Usta ro'yxatdan o'tganda (`master/register`) ism, tajriba, kategoriyalar, pasport rasmi (+ ixtiyoriy selfi) va ish namunalarini yuklaydi; pasport va selfi ixtiyoriy — ularsiz ham buyurtma oladi, faqat ulushi +5% (`useMaster().verified`, `profile.status`: none (pasportsiz) → pending (yuklandi) → approved/rejected; ustada tepada to'q sariq eslatma "Hujjatsiz: ulush 15%"). Usta ma'lumotlari telefonda saqlanadi (`uyservice-master`), "onlayn" holati saqlanmaydi.

## 5. Xarita va animatsiyalar

- Xarita har doim to'liq orqa fonda, panellar ustidan chiqadi; 60 fps.
- Yandex xaritasi (standart Yandex uslubi), boshqaruv tugmalari va "Yandex Kartada ochish" bloki o'chirilgan; POI bosilmaydi. Hamma belgilar — xarita sahifasining o'zida (`yandex/html.ts`), React faqat holat yuboradi.
- Ochilganda kamera telefonning haqiqiy joyiga (GPS) 16-zoom bilan uchib keladi: avval oxirgi ma'lum joy (darhol), keyin aniq GPS. Oxirgi joy va manzil telefonda saqlanadi (`useUser().lastLocation`) — keyingi ochilishda xarita darhol shu yerdan boshlanadi; birinchi ochilishda — Toshkent umumiy ko'rinishi va "Joylashuv aniqlanmoqda…". Ruxsat berilmasa — manzil kartasida ogohlantirish, xaritani surib tanlanadi. Xarita yuklanmasdan oldin kelgan GPS ham yo'qolmaydi (MapBase navbatga qo'yadi). Manzil nomi: Yandex → telefon xizmati → OpenStreetMap. Ko'k nuqta — foydalanuvchi joyi; "joylashuv" tugmasi har bosilganda GPS'ni qayta oladi.
- Xarita ustidagi suzuvchi tugmalar (logo, tarix, profil, «+ / −», joylashuv) — shisha uslubida, `shadow.float` soyasi kuchliroq (rang-barang Yandex xaritasida ajralib turishi uchun). «+ / −» — `components/map/MapZoom.tsx` (mijoz bosh sahifasi va usta xaritasida bir xil, `MapHandle.zoomBy`).
- Pin ustida pufakcha: eng yaqin ustagacha taxminiy vaqt ("3 daq"), Yandex'dagidek.
- Mijoz belgisi: to'q sariq doira + "nafas oluvchi" halqa. Manzil xaritani surish bilan tanlanadi: markazdagi pin surilganda ko'tariladi, to'xtaganda tushadi.
- Atrofdagi ustalar ~100 m aniqlikda (`lib/geo.ts` → `blur`).
- Qidiruv: 3 ta to'lqin (4 s, 1,33 s farq, cheksiz, yumshoq paydo bo'lib so'nadi) — xaritaning o'zida metrda chiziladi (`usePulse` + `Circle`), xarita surilsa nuqtadan ajralmaydi; usta belgilari 0,35 ↔ 1 miltillaydi; kamera 16 → 14.
- Usta yo'lda: yo'l ko'chalar bo'ylab (OSRM: routing.openstreetmap.de, javob bermasa router.project-osrm.org, bir marta qayta urinish). Haqiqiy yo'l kelguncha chiziq chizilmaydi va usta joyida turadi; 15 s ichida kelmasa (`ROUTE_WAIT_MS`) — taxminiy yo'l. `resample` yo'lning hamma burilish nuqtalarini saqlaydi (chiziq va belgi burchakni kesmaydi), qadam ≤ 12 m, har 1 s (`STEP_MS`); "N daqiqa" qolgan yo'l uzunligidan; yo'l chizig'i joyida yangilanadi (miltillamaydi); kamera har ~20 s da ikkalasini sig'diradi.
- Tugmalar bosilganda biroz kichrayadi (`components/ui/Pressable.tsx`), panellar prujina bilan chiqadi.
- Usta ilovasi: SVG aylana taymer 60 → 0, oxirgi 5 soniyada tebranish.
- Usta tomonida belgi telefonning jonli GPS'i bo'yicha (`useWatchLocation` — butun ilova uchun bitta kuzatuv; brauzerda `navigator.geolocation.watchPosition`, telefonda expo-location): usta yursa — yuradi, tursa — turadi. Batareya va qizish uchun ikki rejim: `'precise'` (eng aniq, har ~1 s) — faqat mijozga borayotganda (`master/job`, `on_the_way`); `'balanced'` (o'rtacha, ~5 s / 10 m) — buyurtma kutayotganda; oflayn bo'lsa joylashuv serverga yuborilmaydi. Aniqligi 100 m dan yomon nuqtalar tashlanadi, lekin 8 s yaxshi nuqta kelmasa borini oladi (belgi qotib qolmaydi). Buyurtmalar xaritasida kamera ustaning ortidan yuradi (`MapHandle.panTo`, zoom o'zgarmaydi); xaritani qo'lda sursa — kuzatish to'xtaydi, "joylashuv" tugmasi qayta yoqadi. Ish jarayonida yo'l 150 m siljiganda qayta hisoblanadi.

## 6. Ma'lumotlar bazasi (Supabase, 5-bosqich)

9 ta jadval, hammasiga RLS: `profiles`, `masters`, `master_locations`, `categories`, `problems`, `orders`, `offers`, `reviews`, `favorites`.

Qo'shimcha (tarif qarori uchun):
- `masters.billing_plan` — `'subscription' | 'commission'`
- `masters.plan_changed_at` — oxirgi o'zgartirish sanasi
- `subscriptions` — (master_id, period_start, period_end, amount, status) — obuna to'lovlari
- `orders.platform_fee` — ustadan olinadigan ulush (`order_total` × `orders.fee_percent`; ilovada — `constants/billing.ts` → `feePercent`)

`categories.call_fee` = 50 000 (hammasi uchun).

Admin uchun (`…_admin.sql`): `profiles.blocked_at/blocked_reason`, `masters.photo_path` (profil surati, `works` bucket), `admin_log` (jurnal, faqat o'qiladi), `balance_ops` (balans tarixi; ish yakunidagi ulush ham yoziladi), `admin_*` ko'rinishlari va funksiyalari, `admin_stats(days)`. Narx: `order_total` = ish (chaqiruv ichida) + qism, narx bo'lmasa — chaqiruv; `platform_fee` = `order_total` × ulush %.

Buyurtma holatlari: `scheduled → searching → assigned → on_the_way → arrived → in_progress → completed`, istalgan joyda `cancelled`. `orders.scheduled_at` — rejalashtirilgan vaqt (null — "Hozir kerak").

## 7. Usta qidirish algoritmi

Koeffitsientlar: `constants/dispatch.ts`. Filtr (kategoriya, onlayn, band emas, rad etmagan, buyurtma olishi mumkin — balans/obuna; hujjat tasdig'i shart emas) → radius 3/6/10 km → eng yaqin 10 ta uchun Google Routes → ball:

`ball = 100 − (yetib kelish daqiqasi × 3) + (reyting − 4) × 20 + aktivlik × 0,2 + prioritet ballari`

Eng yuqori ballga taklif, 60 s taymer (usta ma'lumotlarni o'qib ulgurishi uchun). Rad/vaqt o'tdi → aktivlik −5, keyingi ustaga. Radiusda hech kim bo'lmasa `radiusWaitSec` (10 s) kutib, keyingi radiusga. 3 radiusdan keyin ham topilmasa yoki `giveUpAfterSec` (3 daqiqa) o'tsa — "Hozir bo'sh usta yo'q" + "Qayta urinish". Aktivlik: qabul +2, rad −5, bekor −10; 0–100. "Mening ustalarim"dan tanlansa — taklif birinchi unga (10 km ichida bo'lsa, radiusdan qat'i nazar).

Kod: `supabase/functions/_shared/dispatch.ts` (`rankCandidates`, `advanceDispatch`, `respondDispatch`, `applyActivity`) — tashqi holatsiz; ilova (`lib/dispatch.ts` → sinov rejimida `lib/orderSimulator.ts`) va Edge Functions (`_shared/engine.ts`) bir xil faylni ishlatadi. Yetib kelish vaqti serverda haqiqiy yo'l bo'yicha: eng yaqin 10 ta uchun bitta OSRM "table" so'rovi (`_shared/eta.ts`, 2,5 s; javob bo'lmasa — taxminiy `estimateEtaMin`; `DISPATCH_ROUTING=off` — o'chirish, `OSRM_URL` — o'z server); keyin Google Routes / Yandex — faqat shu fayl o'zgaradi.

## 8. Dizayn qoidalari

| Narsa | Qiymat (`constants/theme.ts`) |
|---|---|
| Asosiy rang | `#0E5A4B` to'q yashil (ishonch), ustidagi matn oq |
| Urg'u rangi | `#E8772E` to'q sariq (mehnat/asbob rangi) — mijoz nuqtasi, yulduzlar, aktivlik |
| Matn | `#0B2A24` asosiy, `#4E625C` ikkinchi darajali |
| Fon | `#F6F8F7` sahifa, `#FFFFFF` kartalar (tungi: `#0E1513`, `#17211E`) |
| Xarita foni | `#E9EEEB`, yo'llar oq |
| Kategoriya ranglari | `constants/categories.ts` → `main/onMain/tint/ink`: santexnik — suv ko'k, elektrik — chaqmoq sariq, konditsioner — sovuq ko'k, mebel — yog'och, ta'mirlash — bo'yoq binafsha, maishiy texnika — po'lat. Shu kategoriyaga oid hamma narsa (tugma, chip, to'lqin, yo'l chizig'i, usta belgisi, ETA) o'z rangida |
| Burchaklar | tugma 16, karta 18, panel 28 |
| Tugma balandligi | kamida 44, asosiy tugma 56 |

- Har bir ekranda bitta asosiy (yashil) tugma, qolganlari och kulrang.
- Panellar pastdan chiqadi, yuqori burchaklari yumaloq, tepasida tortish chizig'i.
- Hamma matn `locales/{uz,ru,en}.json`da, kodda `t('kalit')`; yangi kalit uchala faylga qo'shiladi. Son bilan o'zgaradigan matn — ko'plik obyekti `{one, few, many, other}` (ru: one/few/many, en: one/other, uz: other), son `count` (yoki `n`, `days`, `years`) parametridan olinadi. Tizim chatlari (qo'llab-quvvatlash, yangiliklar) ham kalitlar bilan (`i18n: true`, `chatTitle`/`msgText`).
- `Text` komponenti `fontSize` berilib `lineHeight` berilmasa, uni o'zi hisoblaydi (harflar tepasi kesilmasligi uchun).
- **Kunduzgi va tungi rejim**: `constants/theme.ts` — ikki palitra (`light`, `dark`), `colors.x` har o'qilganda joriy rejim rangini beradi. Ekran uslublari `StyleSheet.create` emas, **`themed(() => ({ ... }))`** bilan yoziladi (har rejimga bir marta yaratiladi). Rangni modul darajasida o'zgarmasga saqlamang (funksiya qiling); qattiq hex o'rniga token qo'shing. Kategoriya ranglari ham ikki variantli (`pick(day, night)`). Tanlov: Profil/Sozlamalar → "Ko'rinish" (Avtomatik / Kunduzgi / Tungi, `useUser().themeMode`). Almashganda **ekranlar yopilmaydi** — rangli har bir komponent boshida `useScheme()` chaqiradi va joyida qayta chiziladi; yangi komponent yozsangiz, uni ham qo'shing. Telegram'dagidek animatsiya: yangi rejim bosilgan joydan doira bo'lib ochiladi (`components/ui/ThemeReveal.tsx`, react-native-view-shot; brauzerda animatsiyasiz). Xarita: Yandex 2.1 da tungi xarita yo'q — xarita qatlami CSS filtr bilan qorong'ilashtiriladi (`yandex/html.ts` → `applyDark`), belgilar o'z rangida.
- **Kompyuter brauzeri** (`useWide()`, ≥ 900 px): xaritali ekranlarda panel chapda suzuvchi shisha oyna (420 px), xarita fokus nuqtasi o'ng tomondagi bo'sh joy markazida (`MapInsets.left`); oddiy sahifalar o'rtada 600 px ustun (`PageFrame`, yonida logotip va brend foni); usta menyusi — chapda vertikal (`SideRail`); oynalar — o'rtada dialog. Telefon brauzerida — mobil ko'rinish (`public/index.html`: viewport-fit, 100dvh, kattalashmaydi). Brauzerda matn maydonlari klaviatura yopuvchi `Pressable` ichida bo'lmasin (bosilganda fokus yo'qoladi) — `AuthShell`dagi `DismissArea`ga qarang; matn maydoni shrifti ≥ 16.
- **Liquid Glass**: xarita/kontent ustidagi tugmalar, pastki panel (Sheet), usta menyusi, oynalar — `components/ui/Glass.tsx` (`GlassBg` — ota element orqasidagi shisha qatlam, `strong` — ko'p matnli panellar uchun). iOS 26+ — tizimning haqiqiy Liquid Glass'i (expo-glass-effect), eski iOS va brauzer — xiralashtirish (expo-blur), Android — yarim shaffof shisha tus. Shisha ustidagi ikonka/kontent `position: relative` bo'lishi kerak (brauzerda absolute qatlam ustidan chiziladi). Uslub — minimalizm: kam chiziq, ko'p havo, shisha faqat suzuvchi elementlarda.
- Yandex ranglari/logotipi ishlatilmaydi.
- **Sayt hajmi** (brauzer/Telegram): har ekran alohida fayl (`app.config.ts` → expo-router `asyncRoutes.web`) — admin panel mijozga yuklanmaydi; `babel.config.js` lucide ikonkalarini bittalab import qiladi (butun to'plam emas); `ThemeReveal.web.tsx` — brauzerda ekran suratini oladigan kutubxona yo'q. Yangi og'ir kutubxona qo'shsangiz — faqat kerakli ekranda import qiling.

## 9. Bosqichlar

1. ✅ Loyiha skeleti, papkalar, `theme.ts`.
2. ✅ Xarita: `MapBase` (Yandex), uchib kelish, nafas oluvchi nuqta.
3. ✅ Mijoz ekranlari (soxta ma'lumot bilan).
4. ✅ Animatsiyalar (to'lqinlar, miltillash, zoom, silliq usta belgisi, oqib turuvchi yo'l) — telefonda sinab ko'rish kerak.
5. 🟡 Supabase: migratsiyalar, PostGIS, RLS, Storage, Realtime, SMS (Eskiz.uz) — yozilgan va mahalliy sinalgan (`supabase/`); kirish (`lib/auth.ts`) va hamma ekranlar (`lib/live.ts`) kalit bo'lsa o'zi serverga ulanadi — ikki brauzerda (mijoz + usta) mahalliy Postgres + PostgREST + Edge Functions bilan to'liq oqim sinaldi (ro'yxatdan o'tish → buyurtma → taklif → kod → narx → yakun → baho). Qoladi: loyihani yaratish va joylash (`supabase/README.md`), Eskiz.uz akkaunti.
6. ✅ Usta ilovasi — ekranlar, anketa, profil bo'limlari; server rejimida anketa `masters` + Storage'ga, onlayn holati, takliflar (Realtime + har 3 s so'rov), ish bosqichlari serverda; joylashuv har 5 s `master_locations`ga.
7. ✅ Taqsimlash: algoritm (`supabase/functions/_shared/dispatch.ts`) va Edge Functions; ilova server rejimida ularni ishlatadi (sinov rejimida — soxta simulyator).
8. ✅ Admin panel (uyservice.uz/admin): hamma bo'limlar, sinov rejimi va Supabase manbasi, server funksiyalari va sinovlari.
9. 🟡 Sayqal: internet yo'qligi banneri, xato ekrani (ErrorBoundary), bekor qilish sabablari, serverdan push (yozilgan va sinalgan) tayyor; qoladi — ikki telefonda sinov.

## 10. Ishga tushirish

```bash
npm install
cp .env.example .env      # kalitlarni yozing (git'ga yuklanmaydi)
npx expo start            # telefonda Expo Go bilan QR kodni skanerlang
npm run web               # brauzerda (xarita soxta, faqat dizayn uchun)
npm run typecheck
```

Xarita (Yandex, WebView) Expo Go'da ham ishlaydi; telefonda internet bo'lishi kerak.

## 11. Kalitlar

Yandex va Supabase kalitlari `.env` faylida, git'ga yuklanmaydi. Eskiz.uz login/paroli ilovaga emas, Supabase secrets'ga yoziladi (`supabase/README.md`). Yandex kaliti: developer.tech.yandex.ru → "JavaScript API и HTTP Геокодер"; HTTP Referer cheklovi `uyservice.uz` (telefonda xarita sahifasi shu manzil nomidan ochiladi, `MAP_BASE_URL`). Kalit bo'lmasa xarita cheklangan rejimda ishlaydi yoki umuman ochilmasligi mumkin — kalit qo'yish shart.
