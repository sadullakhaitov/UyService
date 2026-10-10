# UyService — reklama to'plami

**Hammasini bitta faylda yuklab olish:** [`design/UyService-reklama.zip`](https://github.com/sadullakhaitov/UyService/raw/claude/awesome-goldberg-nul9rt/design/UyService-reklama.zip) (PNG, PDF, SVG — asl o'lchamda; rasmlar qayta yig'ilsa ZIP ham yangilanadi).

Hammasi bitta skriptdan yig'iladi: `build.js` (matn, rang, o'lcham — shu yerda). PDF — bosmaxonaga (vektor, shriftlar ichida), PNG — ko'rish va ijtimoiy tarmoqlar uchun.
QR-kodlar: mijoz → `https://uyservice.uz`, usta → `https://uyservice.uz/usta`, Telegram → `https://t.me/uyservice_bot`.
Avvalgi varaqalar: `design/print/` (ustalar uchun A5, podyezd e'loni A4 — yirtib olinadigan qismlar bilan).

## Bosma (`print/`)

| Fayl | O'lcham | Qayerga |
|---|---|---|
| `afisha-a3` | 297×420 mm | do'kon, podyezd, lift, apteka oynasi |
| `varaqa-a6` | 105×148 mm, 2 tomon | qo'lda tarqatish, pochta qutilari |
| `vizitka-mijoz` | 90×50 mm (+2 mm bleed), 2 tomon | mijozlarga, ustalar ish joyida qoldiradi |
| `vizitka-usta` | 90×50 mm (+2 mm bleed), 2 tomon | qurilish bozori, xo'jalik do'konlari — ustalarni jalb qilish |
| `eshik-osmasi` | 100×210 mm, 2 tomon | eshik dastagiga osiladi (teshik — 34 mm, kesish chizig'i belgilangan) |
| `stiker-mijoz`, `stiker-usta`, `stiker-telegram` | 70×70 mm (+2 mm bleed) | lift, podyezd eshigi, kassa yonida |
| `rollup-85x200` | 850×2000 mm | ko'rgazma, do'kon kirish joyi |
| `banner-300x100` | 3000×1000 mm | bino devori, ko'cha, panjara |

Bosmaxonaga: PDF faylni bering. Vizitka va stikerlarda chetdan 2 mm "bleed" bor (kesiladi) — "obrez 2 mm" deb ayting. Rang — RGB (bosmaxona CMYK ga o'tkazadi; asosiy yashil `#0E5A4B` va to'q sariq `#E8772E` — birinchi nusxani ko'rib tasdiqlang). QR-kodni bosishdan oldin telefon bilan skanerlab tekshiring.

## Instagram (`instagram/`)

**Akkauntni tayyorlash — [`instagram/PROFIL.md`](instagram/PROFIL.md)**: profil matnlari (ism maydoni, bio, havola), highlights, birinchi 9 post tartibi va qadaladigan 3 tasi, tayyor izohlar, Reels ssenariylari, stories, birinchi hafta rejasi. Taxminiy ko'rinish — `instagram/profil-maket.png`. Uslub — `instagram/voice.md`.

- `post-1…6` — 1080×1350 (lenta): brend, qanday ishlaydi, narx, kafolat, xizmatlar, ustalar uchun.
- `reel-1-uyservice-nima.mp4` (29 s), `reel-2-kran-oqyapti.mp4` (23 s) — tayyor Reels videolari 1080×1920, 30 fps, ovozsiz (musiqani Instagram'da qo'shing); `.png` — ularning muqovalari (matn o'rtadagi 1080×1440 da — to'rda kesilmaydi). Qayta yig'ish: `node design/marketing/reels.js` (QR_MOD, PW — build.js kabi; ffmpeg kerak).
- `reel-1-uyservice-nima-ovozli.mp4` (39 s) — o'sha video **o'zbekcha ovoz**, animatsiya effektlari (tomchi, telefon, bosish, xarita, hisoblagich, kafolat) va yengil fon musiqasi bilan. Ovoz — espeak-ng sintezi (kompyuter ovozi; jonli ovoz yozilsa, `audio.py` uni o'rniga qo'yadi), effektlar va musiqa `audio.py` ichida sintez qilingan — litsenziya muammosi yo'q. Qayta yig'ish: `bash design/marketing/reel1-ovozli.sh` (matn — `tts_voice.py` → `LINES`).
- `karusel-5-savol/01…09` — karusel "Usta chaqirishdan oldin 5 savol" (1080×1350).
- `story-1…3` — 1080×1920: mijoz (havola stikerini pastdagi tugma ustiga qo'ying), usta (QR), Telegram.
- `avatar` — profil surati (doira ichida ham to'g'ri ko'rinadi), Telegram bot va kanal uchun ham.
- `highlight-*` — "Aktual" muqovalari: narx, qanday, kafolat, ustalar, aloqa (+ xizmatlar zaxirada).
- `social/havola-1200x630` — havola ulashilganda chiqadigan rasm (Telegram, Facebook, WhatsApp).

Izoh qoidalari: havola izohga emas — bio'ga (izohda bosilmaydi); hashteg ko'pi bilan 5 ta; bitta iltimos. Tayyor izohlar — `PROFIL.md`.

## Logotiplar (`logo/`)

PNG — shaffof fon (yuqori aniqlik), PDF — vektor (bosma, bannerlar). `logo-gorizontal` (oq fon uchun), `-oq` (to'q fon uchun), `-yashil-fon`, `logo-vertikal`, `belgi-yashil` / `belgi-oq` (faqat belgi), `ikonka` (yumaloq kvadrat). Asl SVG — `design/logo/`.

## Qayta yig'ish

```bash
# bir marta, loyihadan tashqari papkada: npm i qrcode playwright
QR_MOD=<papka>/node_modules/qrcode PW=<papka>/node_modules/playwright node design/marketing/build.js
# faqat bir qismi: ONLY=instagram (nomga mos regex)
```

`screens/` — ilovaning haqiqiy ekranlari (telefon ramkalari ichida ishlatiladi). Ilova o'zgarsa — yangi suratlarni shu nomlar bilan qo'ying.
