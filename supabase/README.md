# UyService — server (Supabase) ni ishga tushirish

Bu papkada serverning hammasi tayyor: jadvallar, xavfsizlik qoidalari (RLS), usta qidirish funksiyalari va SMS yuborish.
Quyidagi qadamlarni **bir marta**, tartib bilan bajaring. Hamma buyruqlar **Windows PowerShell**da,
loyiha papkasida (`UyService`) yoziladi.

> Kalitlar bo'lmasa ilova hozirgidek demo rejimda ishlayveradi — hech narsa buzilmaydi.
>
> **Qisqa yo'l:** 1-bo'limdagi loyihani yaratgach, qolgan 2–5, 8–11-bo'limlarni bitta skript bajaradi:
> `powershell -ExecutionPolicy Bypass -File supabase\setup.ps1` (URL, anon kalit, baza paroli va bot tokenini
> so'raydi; oxirida SQL Editor'ga qo'yiladigan 2 qatorni nusxalab beradi). Quyidagi bo'limlar — qo'lda qilish yoki
> nima bo'layotganini tushunish uchun.
>
> **Keyingi yangilanishlar** (yangi migratsiya yoki funksiya qo'shilganda): `git pull`, keyin
> `powershell -ExecutionPolicy Bypass -File supabase\update.ps1` — faqat `db push` va `functions deploy`
> (sirlar, cron va Telegram o'zgarmaydi, SQL Editor'da hech narsa qilish shart emas).

---

## 1. Supabase loyihasini yaratish

1. [supabase.com](https://supabase.com) → **Start your project** → GitHub yoki email bilan kiring.
2. **New project**:
   - Name: `uyservice`
   - Database Password: kuchli parol o'ylab toping va **saqlab qo'ying** (keyin kerak bo'ladi)
   - Region: **Central EU (Frankfurt)** (Toshkentga eng yaqini; Singapore ham bo'ladi)
3. Loyiha 1–2 daqiqada tayyor bo'ladi.

## 2. Kalitlarni ilovaga yozish

1. Supabase → **Project Settings** → **API** (yoki **API Keys**). Ikkita qiymatni oling:
   - **Project URL** — `https://abcdefghijklmnop.supabase.co` ko'rinishida. Undagi `abcdefghijklmnop` — bu
     sizning **PROJECT_REF**ingiz, quyida ko'p kerak bo'ladi.
   - **anon public** kalit (yangi loyihalarda **publishable** kalit, `sb_publishable_...`).
2. PowerShell'da:

   ```powershell
   Copy-Item .env.example .env   # agar .env hali bo'lmasa
   notepad .env
   ```

3. Ochilgan faylga yozing va saqlang:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=bu_yerga_anon_kalit
   ```

   ⚠️ **service_role** (yoki **secret**) kalitni `.env`ga hech qachon yozmang — u faqat serverda.

## 3. Supabase CLI ga kirish va loyihani ulash

```powershell
npx supabase --version            # birinchi marta CLI yuklab olinadi
npx supabase login                # brauzer ochiladi → "Authorize"
npx supabase link --project-ref PROJECT_REF
```

`link` ma'lumotlar bazasi parolini so'raydi — 1-qadamdagi parol.

## 4. Jadvallarni yaratish

```powershell
npx supabase db push
```

`Do you want to push these migrations?` → `Y`. Tekshirish: Supabase → **Table Editor** — `orders`, `masters`,
`categories` (6 ta kategoriya) va boshqa jadvallar paydo bo'ladi.

## 5. Funksiyalarni yuklash

```powershell
npx supabase functions deploy
```

Bu 7 ta funksiyani yuklaydi: `dispatch` (usta qidirish), `offer-respond` (usta javobi),
`offer-timeout` (har 15 soniyada tekshiruv), `send-sms` (SMS kod), `push-send` (bildirishnomalar),
`telegram-auth` va `telegram-bot` (Telegram orqali kirish, 11-bo'lim). Docker so'rasa — oxiriga `--use-api` qo'shing:
`npx supabase functions deploy --use-api`.

## 6. Eskiz.uz (SMS)

1. [my.eskiz.uz](https://my.eskiz.uz) da ro'yxatdan o'ting, shartnoma va balansni rasmiylashtiring.
2. **Muhim:** Eskiz faqat oldindan **tasdiqlangan shablon** matnlarini yuboradi. Kabinetda SMS shablon so'rovini
   yuboring: `UyService kodi: 123456` (kod o'rnida raqam). Tasdiqlanmaguncha faqat Eskiz'ning test matni
   ketadi va bizning kodlarimiz yetib bormaydi.
   Agar Eskiz boshqa matnni tasdiqlasa — `SMS_TEMPLATE` sirini o'sha matnga qo'ying (`{code}` — kod joyi).
3. Jo'natuvchi nomi standart `4546`. O'z nomingiz (masalan `UyService`) tasdiqlansa — `ESKIZ_FROM`ga yozing.

## 7. Telefon orqali kirishni yoqish

1. Supabase → **Authentication** → **Sign In / Providers** → **Phone** → yoqing (**Enable Phone provider**).
   SMS provayder so'ralsa, istalgan birini tanlab qoldiring — keyingi qadamdagi hook yoqilgach u ishlatilmaydi.
2. Supabase → **Authentication** → **Hooks** → **Add hook** → **Send SMS hook**:
   - Type: **HTTPS**
   - URL: `https://PROJECT_REF.supabase.co/functions/v1/send-sms`
   - **Generate secret** → chiqqan `v1,whsec_...` qiymatni nusxalang → **Create**.
3. (Ixtiyoriy, sinov uchun) **Phone** sozlamalarida **Test Phone Numbers** — masalan `998901234567=123456`:
   shu raqamga SMS ketmaydi, kod har doim `123456`.

## 8. Sirlarni (secrets) yozish

PowerShell'da bitta buyruq (qiymatlarni o'zingiznikiga almashtiring). **Qo'shtirnoqlar shart** —
PowerShell vergulni boshqacha tushunadi:

```powershell
$cron = [guid]::NewGuid().ToString("N"); $cron   # tasodifiy sir — ekrandagi qiymatni saqlab qo'ying
npx supabase secrets set "ESKIZ_EMAIL=siz@example.uz" "ESKIZ_PASSWORD=eskiz_parol" "ESKIZ_FROM=4546" "SEND_SMS_HOOK_SECRET=v1,whsec_..." "CRON_SECRET=$cron"
```

Tekshirish: `npx supabase secrets list`.

## 9. Har 15 soniyada tekshiruvni yoqish (pg_cron)

Javob bermagan ustadan keyingisiga o'tish, radiusni kengaytirish va rejalashtirilgan buyurtmalarni boshlash
uchun kerak.

1. Supabase → **Database** → **Extensions** → `pg_cron` va `pg_net` ni yoqing.
2. Supabase → **SQL Editor** → yangi so'rov:

   ```sql
   select public.schedule_offer_timeout('https://PROJECT_REF.supabase.co', 'CRON_SECRET_QIYMATI');
   ```

   (`CRON_SECRET_QIYMATI` — 8-qadamdagi `$cron`.) **Run**. Tekshirish bir daqiqadan keyin:

   ```sql
   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
   ```

   O'chirish kerak bo'lsa: `select public.unschedule_offer_timeout();`

## 10. Push-bildirishnomalar (ilova yopiq bo'lsa ham)

1. SQL Editor'da (9-bo'limdagi `CRON_SECRET` qiymatining o'zi bilan):
   ```sql
   select public.configure_push('https://PROJECT_REF.supabase.co', 'CRON_SECRET_QIYMATI');
   ```
   Endi buyurtma o'zgarganda baza `push-send`ni darhol chaqiradi (zaxira — `offer-timeout` har 15 s).
2. Telefon ilovasi tokenni o'zi yozadi (`lib/push.ts`), lekin buning uchun ilova **EAS orqali yig'ilgan** bo'lishi
   kerak (Expo Go'da Android push ishlamaydi): `npx eas init` → chiqqan ID'ni `EAS_PROJECT_ID` qilib yozing (`.env` va expo.dev, 14-bo'lim);
   Android uchun Firebase (FCM) kaliti — `npx eas credentials` → Android → Push Notifications.
3. Tekshirish: `select kind, sent_at, error from push_outbox order by id desc limit 20;`

Nima qachon ketadi: ustaga — "Yangi buyurtma" (Sozlamalarda o'chirsa bo'ladi), "Mijoz narxga rozi / rozi emas",
"Mijoz bekor qildi"; mijozga — "Usta topildi", "Usta yetib keldi", "Usta narx taklif qildi", "Ish tugadi",
"Hozir bo'sh usta yo'q". Matn foydalanuvchi tilida (`profiles.language`), bosilganda tegishli ekran ochiladi.

**Telegram orqali ham:** telefon ilovasi yo'q (push tokeni yo'q), lekin Telegram bilan kirgan foydalanuvchiga xuddi
shu xabarlar **bot orqali** keladi — Telegram yopiq bo'lsa ham, telefon ovoz chiqaradi; "Ochish" tugmasi kerakli ekranni
(masalan, `/master/offer`) Telegram ichida ochadi. Buning uchun 11-bo'limdagi `TELEGRAM_BOT_TOKEN` siri va
`npx supabase functions deploy push-send offer-timeout` yetarli (EAS/FCM shart emas). Botni bloklagan odamga xabar
qayta-qayta yuborilmaydi.

## 11. Telegram (bot + Mini App, SMS'siz kirish)

Odam botni ochadi → "Ilovani ochish" → uyservice.uz Telegram ichida ochiladi → "Telegram orqali kirish" →
Telegram raqamni tasdiqlaydi → profilga kiradi. Keyingi safar o'zi kiradi. SMS (Eskiz) kerak emas.

1. Telegram'da **@BotFather** → `/newbot` → nom va username → **token** chiqadi. Tokenni hech kimga yubormang,
   faqat Supabase sirlariga yozasiz.
2. Sirlar (`$tg` — tasodifiy webhook siri):
   ```powershell
   $tg = [guid]::NewGuid().ToString("N")
   npx supabase secrets set "TELEGRAM_BOT_TOKEN=123456:ABC..." "TELEGRAM_WEBHOOK_SECRET=$tg" "APP_URL=https://uyservice.uz"
   npx supabase functions deploy telegram-auth telegram-bot push-send offer-timeout
   ```
   (`push-send` va `offer-timeout` — bildirishnomalar bot orqali ketishi uchun, 10-bo'lim.)
3. Webhook (bot xabarlarini serverga yo'naltirish), PowerShell'da:
   ```powershell
   Invoke-RestMethod "https://api.telegram.org/bot<TOKEN>/setWebhook" -Method Post -Body @{ url = "https://PROJECT_REF.supabase.co/functions/v1/telegram-bot"; secret_token = $tg }
   ```
   Javobda `"ok": true` bo'lishi kerak.
4. @BotFather → `/mybots` → bot → **Bot Settings** → **Menu Button** → URL: `https://uyservice.uz`, matn: `Ochish`.
   (Ixtiyoriy: **Configure Mini App** → `https://uyservice.uz` — havola `t.me/<bot>/app` ko'rinishida ham ochiladi.)
5. Supabase → **Authentication** → **Sign In / Providers** → **Email** yoqilgan bo'lsin (Telegram kirishi ichkarida
   yashirin email `tg<id>@telegram.uyservice.uz` va bir martalik havola ishlatadi; foydalanuvchiga xat ketmaydi).

Tekshirish: botga `/start` → "Ilovani ochish" → Profil → Kirish → **Telegram orqali kirish** → raqamni ulashing.
Faqat O'zbekiston raqamlari (+998) qabul qilinadi; boshqa raqamda — SMS kod bilan kirish taklif qilinadi.

## 12. O'zingizni admin qilish

Birinchi adminni faqat SQL orqali tayinlash mumkin (keyingilarini admin panelning o'zidan qo'shasiz).

1. Ilovaga o'z raqamingiz bilan kiring (SMS kod keladi) — shunda `profiles` jadvalida qatoringiz paydo bo'ladi.
2. Supabase → **SQL Editor**:

   ```sql
   update public.profiles set role = 'admin' where phone = '+998901234567';
   ```

## 13. Admin panel

Manzil: **uyservice.uz/admin** (telefondagi ilovada ham `/admin`). Kirish — admin raqami + SMS kod.
8 soat harakatsizlikdan keyin qayta kirish so'raladi. Har bir amal `admin_log` jurnaliga yoziladi.

| Bo'lim | Nima qiladi |
|---|---|
| Bosh sahifa | buyurtmalar, aylanma, platforma daromadi (oldingi davrga nisbatan), onlayn ustalar, navbatlar, grafiklar |
| Hujjat tekshiruvi | pasport va selfi yonma-yon → **Tasdiqlash** yoki sabab bilan **Rad etish** (`admin_set_verify`) |
| Buyurtmalar | filtr, qidiruv, tafsilot (vaqt chizig'i, takliflar, chat, narx), sabab bilan bekor qilish (`admin_cancel_order`), CSV |
| Jonli xarita | onlayn ustalar va ochiq buyurtmalar butun respublika bo'ylab |
| Ustalar | hujjat, tarif, balans, reyting; **balans** (`admin_adjust_balance` → `balance_ops`), **obuna** (`admin_add_subscription`), **prioritet**, **bloklash** (`admin_set_blocked`) |
| Foydalanuvchilar | buyurtmalari, sharhlari, bloklash (bloklangan mijoz buyurtma bera olmaydi, usta taklif olmaydi) |
| Sharhlar | shikoyatlar (1–2★), sabab bilan o'chirish — reyting qayta hisoblanadi (`admin_delete_review`) |
| Qo'llab-quvvatlash | murojaatlar (javob kutayotganlari birinchi) va javob yozish (`admin_support_reply`) |
| Moliya | daromad, o'rtacha chek, balans amallari tarixi, buyurtma ololmayotgan ustalar |
| Narxlar va katalog | chaqiruv narxi, kategoriyani yoqish/o'chirish, muammolar narx oralig'i |
| Amallar jurnali | kim, qachon, nima qildi (o'zgartirib/o'chirib bo'lmaydi) |
| Sozlamalar | adminlarni raqam bo'yicha qo'shish / olib tashlash (`admin_set_role`), ko'rinish, til |

Huquqlar serverda tekshiriladi: ro'yxatlar `admin_*` ko'rinishlari (faqat admin uchun to'la, boshqalarga bo'sh),
amallar `admin_*` funksiyalari (ichida `assert_admin()`, qiymat chegaralari, jurnal). Sinov: `tests/admin_test.sql`.

Kerak bo'lsa SQL Editor'dan ham qilish mumkin (masalan, server ulanmasdan oldin):
`update public.masters set verify_status = 'approved' where id = '...'`.

---

## 14. Telefon ilovasini (APK) yig'ish

`.env` fayli git'ga yuklanmaydi, shuning uchun EAS bulutida yig'ilgan APK uni ko'rmaydi — kalitlar **expo.dev**'ga
bir marta yoziladi (`eas.json`: `preview` → `preview` muhiti, `production` → `production`):

```powershell
npx eas login
npx eas init                       # chiqqan ID — EAS_PROJECT_ID
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://PROJECT_REF.supabase.co" --visibility plaintext
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "ANON_KALIT" --visibility plaintext
npx eas env:create --environment preview --name EXPO_PUBLIC_YANDEX_MAPS_KEY --value "YANDEX_KALIT" --visibility plaintext
npx eas env:create --environment preview --name EAS_PROJECT_ID --value "EAS_ID" --visibility plaintext
npx eas build --profile preview --platform android   # tayyor APK havolasi chiqadi
```

`production` uchun ham xuddi shu buyruqlar (`--environment production`). Bu kalitlar ilova ichida baribir ochiq
turadi (anon kalit va Yandex kaliti shunday mo'ljallangan) — maxfiy kalitlar (service_role, Eskiz, Telegram) bu
yerga **yozilmaydi**, ular faqat Supabase sirlarida.

## 15. Sayt (uyservice.uz) uchun kalitlar — Cloudflare

`.env` fayli git'ga yuklanmaydi, sayt esa Cloudflare'da GitHub'dagi koddan yig'iladi — shuning uchun kalitlarni
Cloudflare'ga ham bir marta yozish kerak, aks holda sayt sinov rejimida qolaveradi:

1. dash.cloudflare.com → **Workers & Pages** → `uyservice` → **Settings** → **Build** → **Variables and secrets**
   (build vaqtidagi o'zgaruvchilar).
2. Qo'shing: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_YANDEX_MAPS_KEY`
   (qiymatlari `.env`dagi bilan bir xil).
3. **Deployments** → oxirgisi → **Retry deployment** (yoki GitHub'ga yangi push). Tepadagi "Sinov rejimi" belgisi
   yo'qolsa — sayt serverga ulandi.

## 16. Mijozni himoya qilish, murojaatlar, statistika (`…_client_care.sql`)

- **Uy tafsiloti**: `orders.entrance / floor / apartment / intercom / landmark` — usta qabul qilgach ko'radi, admin buyurtma sahifasida.
- **Chegaralar** (`orders_limits`): mijozda bir vaqtda ko'pi bilan 3 ta faol buyurtma, sutkasiga 10 ta; 30 kunda 3 marta
  "mijoz eshikni ochmadi" bo'lsa — yangi buyurtma yopiq (admin bilan gaplashguncha). Admin cheklanmaydi.
- **Murojaatlar** (`order_reports`): mijoz — `report_order` (kafolat 30 kun ichida va faqat narxga rozi bo'lingan ishga;
  ortiqcha pul, sifat, usta kelmadi, boshqa); usta — `master_client_absent` (yetib kelgandan keyin; buyurtma to'lovsiz yopiladi,
  aktivlik kamaymaydi, mijozga xabar). Har murojaat qo'llab-quvvatlash chatiga ham yoziladi. Admin → "Murojaatlar" (`admin_reports`,
  `admin_resolve_report`, jurnalga yoziladi).
- **Chek**: "Ish tugadi" push/Telegram xabarida jami summa (naqd) va kafolat.
- **Hisobni o'chirish** (`delete_my_account`): raqam, ism, push, Telegram, ustaning ismi/hujjat yo'llari, joylashuvi va
  qo'llab-quvvatlash yozishmalari o'chadi; kirish yopiladi (auth.users raqami bo'shatiladi, bloklanadi). Buyurtmalar, baholar,
  balans tarixi anonim qoladi. Faol buyurtma bo'lsa yoki admin bo'lsa — rad. Fayllarni ilova o'zi o'chiradi (Storage, o'z papkasi).
- **Statistika** (`app_events`, `app_errors`): ilova yozadi (anon ham), faqat admin o'qiydi; qurilmadan daqiqasiga ≤ 60 hodisa,
  ≤ 20 xato. Admin → "Statistika" (`admin_funnel`, `admin_errors`): voronka va xatolar.
- Sinov: `tests/client_care_test.sql`.

## Eskiz.uz hali yo'q bo'lsa

- **Mijoz va ustalar** Telegram orqali kiradi (11-bo'lim) — SMS kerak emas. Oddiy brauzerda raqam + SMS bilan kirish
  Eskiz ulanmaguncha ishlamaydi (6, 7-bo'limlarning SMS qismini keyinga qoldiring).
- **Admin panel** SMS kod bilan kiradi. Vaqtincha: Authentication → Sign In / Providers → Phone → **Test Phone Numbers**
  ga o'z raqamingizni va faqat o'zingiz biladigan 6 xonali kodni yozing (`998901234567=******`) — shu raqamga SMS
  ketmaydi, kod har doim shu. Bu kod parol kabi: hech kimga bermang, Eskiz ulangach o'chiring.

## Nima qayerda

| Fayl | Nima |
|---|---|
| `migrations/…_schema.sql` | jadvallar (TZ 6-bo'lim) |
| `migrations/…_logic.sql` | triggerlar (usta o'z reytingi/balansini o'zgartira olmaydi, ish tugaganda komissiya), `nearby_masters`, `masters_around` |
| `migrations/…_rls.sql` | kim nimani ko'radi (RLS) |
| `migrations/…_catalog.sql` | 6 kategoriya, 22 muammo, chaqiruv narxi 50 000 |
| `migrations/…_storage_realtime.sql` | fayl papkalari (`documents`, `works`, `order-photos`) va Realtime |
| `migrations/…_cron.sql` | `schedule_offer_timeout()` |
| `functions/_shared/dispatch.ts` | usta qidirish algoritmi — **ilova bilan bitta fayl** (`lib/dispatch.ts` shuni ishlatadi) |
| `functions/_shared/engine.ts` | algoritmni bazaga ulaydigan qadam (takliflar, aktivlik, tayinlash) |
| `functions/_shared/push.ts` | push navbatini Expo Push API orqali yuborish, matnlar (uz/ru/en) |
| `functions/_shared/telegram.ts` | Telegram Mini App imzosini tekshirish (initData, kontakt) |
| `functions/*/index.ts` | `dispatch`, `offer-respond`, `offer-timeout`, `send-sms`, `push-send`, `telegram-auth`, `telegram-bot` |
| `migrations/…_telegram.sql` | `profiles.telegram_id`, `telegram_contacts` (faqat server) |
| `seed.sql` | faqat lokal sinov uchun 3 ta demo usta (`db push` uni yubormaydi) |
| `migrations/…_admin.sql` | admin panel: bloklash, `admin_log`, `balance_ops`, `admin_*` funksiyalari va ko'rinishlari, `admin_stats` |
| `migrations/…_price_agreement.sql` | narx kelishuvi va eshik kodi: `order_secrets` (kodni faqat mijoz ko'radi), `order_door_code`, `verify_door_code` (5 xato → 10 daq), `propose_price`, `respond_price`; ulush foizi qabul paytida qotiriladi (`orders.fee_percent`) |
| `migrations/…_push.sql` | push navbati (`push_outbox`), triggerlar (kimga nima), `claim_push` / `finish_push`, `configure_push` |
| `tests/` | lokal Postgres'da RLS sinovi (`rls_test.sql`), admin (`admin_test.sql`), narx kelishuvi (`price_test.sql`), push (`push_test.sql`), Telegram (`telegram_test.sql`); `unit/`, `e2e/` (Deno) |

Ilova tomoni: `lib/supabase.ts` (ulanish), `lib/auth.ts` (SMS kod), `lib/telegram.ts` (Telegram orqali kirish),
`lib/live.ts` (buyurtma, takliflar, ish bosqichlari, chat — kalit bo'lsa hamma ekranlar shu orqali ishlaydi),
`lib/backend.ts` (ustaning joylashuvi), `lib/push.ts` (push tokeni).

### Usta qidirish qanday ishlaydi

1. Mijoz buyurtma yaratadi (`orders`, status `searching`) → ilova `dispatch` funksiyasini chaqiradi.
2. `dispatch` 10 km ichidagi mos ustalarni oladi (`nearby_masters`: onlayn, tasdiqlangan, band emas, tarifi ochiq,
   joylashuvi 2 daqiqadan yangi) va eng yuqori ballisiga taklif yozadi (`offers`, 60 s).
3. Usta Realtime orqali taklifni ko'radi va `offer-respond` bilan javob beradi: qabul → buyurtma `on_the_way`,
   aktivlik +2; rad → aktivlik −5 va taklif keyingi ustaga.
4. `offer-timeout` har 15 s: 60 s javobsiz taklif yopiladi (−5), radius 3 → 6 → 10 km, 3 daqiqada topilmasa
   `dispatch.done = 'none'` ("Hozir bo'sh usta yo'q"). Rejalashtirilgan buyurtmalar vaqtidan 30 daqiqa oldin
   qidiruvga chiqadi.

### Dasturchi uchun: lokal sinov

Docker kerak emas — oddiy PostgreSQL 16 + PostGIS yetadi (ulanish — `PGHOST`, `PGUSER` va h.k.):

```bash
bash supabase/tests/run.sh                                  # SQL: RLS, admin, narx kelishuvi, push
PGRST_BIN=$(which postgrest) bash supabase/tests/run.sh     # + E2E: usta qidirish va push (Deno + PostgREST)
deno check --no-lock --node-modules-dir=none supabase/functions/*/index.ts
```

GitHub'da har push'da shular avtomatik ishlaydi (`.github/workflows/ci.yml`) + ilovaning `npm run typecheck`.
