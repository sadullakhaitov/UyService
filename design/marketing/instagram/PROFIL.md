# Instagram: @uyservice.uz — akkauntni tayyorlash

[instagram-agent-skill](https://github.com/Jakeschincariol/instagram-agent-skill) qoidalari asosida tayyorlangan (`ig-profile`, `ig-plan`, `ig-carousel`, `ig-caption`, `ig-story`, `ig-reel`, `ig-human`).
Matnlar skill'ning tekshiruv skriptlaridan o'tgan:
- `caption.py`: FAIL yo'q. Uning "ask" va "contraction" tekshiruvlari faqat inglizcha so'zlarni taniydi, shuning uchun o'zbekcha matnda WARN beradi.
- `detect.py`: uzun tire, ko'rinmas belgilar, shablon so'zlar yo'q.
- `beats.py`: Reels ssenariylari vaqti o'lchangan.

Taxminiy ko'rinish: [`profil-maket.png`](profil-maket.png).

**Hech narsa avtomatik joylanmaydi.** Hammasini telefoningizda o'zingiz kiritasiz va joylaysiz.

---

## 1. Hozirgi baho: 5 / 100

| Band | Ball | Holat |
|---|---|---|
| Ism maydoni (qalin qator) | 0 / 12 | bo'sh |
| Bio 1-qator | 0 / 12 | bo'sh |
| Bio davomi | 0 / 8 | bo'sh |
| Qadalgan 3 post | 0 / 10 | post yo'q |
| Havola | 0 / 8 | yo'q |
| Highlights | 0 / 8 | yo'q |
| To'r (birinchi 9 post) | 0 / 8 | bo'sh |
| Profil surati | 0 / 6 | yo'q |
| Nik (`uyservice.uz`) | 5 / 6 | o'qiladi, sayt bilan bir xil. Telegram'da `@uyservice_bot`, to'liq bir xil emas |
| Kategoriya va kontaktlar | 0 / 6 | shaxsiy akkaunt |
| Oxirgi faollik | 0 / 10 | post yo'q |
| Stories | 0 / 6 | yo'q |

## 2. Sozlash tartibi (Instagram rus tilida)

1. **Профессиональный аккаунт**: ☰ → Настройки → Тип аккаунта и инструменты → «Переключиться на профессиональный аккаунт» → **Бизнес**.
   - Kategoriya: qidiruvga «дом» yoki «ремонт» deb yozing va eng yaqinini tanlang, masalan «Услуги для дома».
   - «Показывать в профиле» yoqilgan bo'lsin.
2. **Контакты**: telefon `+998 90 121 88 87`, e-mail `support@uyservice.uz`. Manzil kiritmang.
3. **Фото профиля**: [`avatar.png`](avatar.png) (yashil fon, oq belgi; doira ichida ham to'g'ri chiqadi).
4. **Редактировать профиль**:
   - **Имя**: `UyService | Usta chaqirish`. Instagram qidiruvi shu maydonni o'qiydi.
   - **О себе**: quyidagi bio.
   - **Ссылки** → «Добавить внешнюю ссылку»: `https://uyservice.uz`, nomi `Usta chaqirish`. Faqat bitta havola qo'ying: ikkita havola menyuga aylanib qoladi, odamlar esa kamroq bosadi. Telegram bot «Aloqa» highlight'ida turadi.
5. Avval 9 ta postni joylang (5-bo'lim), keyin uchtasini qadang (⋯ → «Закрепить в профиле»).
6. Highlights: har biriga 1–3 ta story qo'shing (4-bo'lim), muqova — `highlight-*.png`.

## 3. Profil matnlari (nusxalab qo'ying)

**Ism maydoni** (30 belgigacha), uchta variant:

```
UyService | Usta chaqirish
```
```
UyService | Мастер на дом
```
```
UyService | Uyga usta
```

Tavsiyam — birinchisi: odamlar aynan "usta chaqirish" deb qidiradi.

**Bio** (122 / 150 belgi):

```
Uyda nimadir buzildimi? Eng yaqin usta keladi.
Chaqiruv 50 000 so'm, ish qilinsa narx ichida.
30 kun kafolat. Naqd to'lov.
```

1-qator kim uchun va nima o'zgarishini aytadi, 2–3-qator aniq taklif. Tarif foizlari va obuna narxi hali tasdiqlanmagan, ular bio'da ham, postlarda ham yo'q.

## 4. Highlights (5 ta, mijoz beradigan savollar bo'yicha)

| Nomi | Muqova | Ichiga |
|---|---|---|
| Narx | `highlight-narx.png` | `post-3-narx` story qilib, "chaqiruv narx ichida" tushuntirish |
| Qanday? | `highlight-qanday.png` | `post-2-qanday-ishlaydi`, ilovadan ekran yozuvi (buyurtma → usta yo'lda) |
| Kafolat | `highlight-kafolat.png` | `post-4-kafolat`, "Kafolat" tugmasi qayerdaligi |
| Ustalarga | `highlight-ustalar.png` | `story-2-usta` (QR → uyservice.uz/usta) |
| Aloqa | `highlight-aloqa.png` | `story-3-telegram`, telefon, ish vaqti 08:00–22:00 |

`highlight-xizmatlar.png` zaxirada: "Qanday?" o'rniga ishlatsa bo'ladi.

## 5. Birinchi 9 post (to'r) va qadalgan uchtasi

Pastdagi qatordan boshlab, eskisidan yangisiga joylang. To'rda eng yangisi chap tepada turadi:

| Tartib | Fayl | Turi |
|---|---|---|
| 1 | `post-6-ustalar` | rasm |
| 2 | `post-1-buzildimi` | rasm |
| 3 | `post-5-xizmatlar` | rasm |
| 4 | `post-3-narx` | rasm |
| 5 | `reel-2-kran-oqyapti` | Reels muqovasi (video — 6-bo'lim) |
| 6 | `karusel-5-savol/01…09` | karusel, 9 slayd |
| 7 | `post-4-kafolat` | rasm · **qadash** |
| 8 | `post-2-qanday-ishlaydi` | rasm · **qadash** |
| 9 | `reel-1-uyservice-nima` | Reels muqovasi · **qadash** |

Qadalgan uchtasining har biri boshqa vazifani bajaradi:
- **Tanishuv**: `reel-1` — "UyService nima?".
- **Taklif**: `post-2` — 3 qadamda qanday ishlaydi.
- **Ishonch**: `post-4` — 30 kun kafolat.

Haqiqiy dalil (birinchi bajarilgan buyurtmalar, mijoz sharhi, raqamlar) hali yo'q. Shu sababli "ishonch" o'rnida hozircha kafolat turibdi. Birinchi haqiqiy sharh paydo bo'lishi bilan o'sha post bilan almashtiring. Uni o'ylab topmang.

### Izohlar (caption)

Qoidalar:
- Izohga havola qo'ymang, chunki u bosilmaydi. Havola bio'da turadi.
- Hashteg ko'pi bilan 5 ta.
- Har postda bitta iltimos bo'lsin.

**reel-1, UyService nima?**
```
Biz kimmiz va nega UyService'ni ochdik, 30 soniyada.

Uyda kran oqsa yoki rozetka ishlamay qolsa, odatda tanish-bilishdan usta so'raymiz. Kim keladi, qachon keladi, qancha so'raydi, oldindan bilmaymiz.

UyService'da usta chaqirish oson: muammoni tanlaysiz, eng yaqin santexnik yoki elektrik keladi, xaritada kelayotganini ko'rib turasiz.

Narx ish boshlanishidan oldin ilovada kelishiladi. Chaqiruv 50 000 so'm, ish qilinsa shu narx ichida. Bajarilgan ishga 30 kun kafolat.

Usta kerak bo'lsa, profildagi havolani bosing.

#ustachaqirish #santexnik #elektrik #toshkent #uyservice
```

**karusel, 5 savol**
```
Usta chaqirishdan oldin shu 5 savolni bering. Keyin "bunaqa kelishmagandik" degan gap chiqmaydi.

Ko'pchilik narxni usta ishni boshlab yuborgandan keyin so'raydi. Xato shu.

Tortishuv ham, ortiqcha pul ham aynan shu yerdan boshlanadi: usta 300 000 deydi, siz 150 000 kutgan edingiz, kran esa allaqachon yechib qo'yilgan.

Karuselda 5 ta savol bor va har biriga qanday javob eshitishingiz kerakligi. Santexnik, elektrik, konditsioner ustasi, farqi yo'q.

Saqlab qo'ying. Kerak bo'ladi.

#ustachaqirish #santexnik #elektrik #uyuchun #uyservice
```
Alt matn (1-slayd): `Usta chaqirishdan oldin beriladigan 5 savol: chaqiruv narxi, narx qachon aytiladi, ehtiyot qism, kafolat, kim keladi.`

**reel-2, kran oqyapti**
```
Kran oqyaptimi? Ustani kutayotganda shu 2 ishni qiling.

Birinchi: kvartiraga suv kiradigan umumiy kranni yoping. U odatda hojatxona yoki oshxonadagi quvur yonida, hisoblagich oldida turadi. Burang, oxirigacha.

Ikkinchi: polni artib, oqayotgan joy tagiga chelak qo'ying. Pastdagi qo'shni sizga rahmat aytadi.

Hammasi 2 daqiqa.

Shundan keyin usta chaqirish mumkin. UyService'da eng yaqin santexnik keladi, narx ishdan oldin aytiladi, chaqiruv 50 000 so'm.

Qo'shningizga yuboring, bir kun kerak bo'lib qoladi.

#santexnik #ustachaqirish #toshkent #uyuchun #uyservice
```

Qolgan rasmli postlar (`post-1…6`) uchun izoh qisqa bo'lsin:
- 1-qator rasmdagi sarlavhani takrorlamasin, uni davom ettirsin.
- Bitta iltimos qo'shing ("Saqlab qo'ying" yoki "Profildagi havola").
- 3–5 ta hashteg.

## 6. Reels ssenariylari

**Tayyor videolar:** `reel-1-uyservice-nima.mp4` va `reel-2-kran-oqyapti.mp4` (1080×1920, ovozsiz). Joylashda: Instagram'dagi musiqa kutubxonasidan ohang tanlang (litsenziyali, bepul), muqova — shu nomdagi `.png` («Обложка» → «Добавить из галереи»). Video matnli — ovoz yoqilmasa ham tushunarli.

Vaqtni `beats.py` o'lchagan; o'zbekcha so'zlar uzun, shuning uchun aslida 20–25 soniya chiqadi. Qisqa video — yaxshi.

Variantlar:
- telefon ekranini yozib, ustidan ovoz qo'yish;
- kameraga gapirish;
- yuzsiz: qo'l bilan telefon ko'rsatiladi.

Birinchi 2 soniyadagi gap ekranda ham yozuv bo'lib tursin.

**reel-1: "UyService nima?"** (~22 s)

```
0:00  HOOK   Uyda kran oqsa, kimga qo'ng'iroq qilasiz?          [yuz yoki oqayotgan kran]
0:02         Tanishingizga. U esa boshqa tanishiga.
0:04         Biz buni bitta tugmaga aylantirdik.                 [ilova ochiladi]
0:06         Muammoni tanlaysiz: kran, rozetka, konditsioner.    [kategoriya bosiladi]
0:08         Eng yaqin usta keladi, xaritada kelayotganini ko'rasiz.  [xarita, usta belgisi]
0:11         Narxni u ko'rib aytadi, siz ilovada rozi bo'lasiz.  [narx ekrani]
0:14         Chaqiruv 50 000 so'm. Ish qilinsa, narx ichida.     [ekranda: 50 000]
0:16         30 kun kafolat.                                      [ekranda: 30 kun]
0:18  CTA    Keyingi safar kran oqsa, kimga qo'ng'iroq qilasiz?  [ekranda: uyservice.uz]
```

Oxirgi gap birinchisini takrorlaydi: video qayta aylanganda boshi bilan ulanadi, ikkinchi ko'rish bepul qamrov beradi.

**reel-2: "Kran oqyaptimi?"** (~18 s)

```
0:00  HOOK   Kran oqyaptimi? Ustani chaqirishdan oldin buni qiling.
0:03         Birinchi: umumiy suv kranini toping. Odatda hisoblagich oldida.   [kranni ko'rsatish]
0:06         Oxirigacha burang. Suv to'xtaydi.
0:08         Ikkinchi: polni arting, tagiga chelak qo'ying.
0:10         Pastdagi qo'shni rahmat aytadi.
0:12         Hammasi 2 daqiqa.
0:13         Endi usta chaqirsangiz bo'ladi. UyService'da eng yaqin santexnik keladi.
0:16  CTA    Kran oqsa, avval kranni yoping.
```

Keyingi Reels g'oyalari (bir xil tuzilma: muammo → 2–3 maslahat → UyService):
- "Rozetka uchqun chiqaryaptimi?" — avval avtomatni o'chiring.
- "Konditsioner suv tomizyaptimi?"
- "Usta bo'lsangiz, buyurtmani qayerdan olasiz?" — ustalar uchun, `post-6` mavzusi.

## 7. Stories: har kuni 3–5 kadr

Birinchi kun namunasi:

```
1  [qo'l bilan telefon, ilova ochilmoqda]   "Bugun ishga tushdik."
2  [ekran yozuvi: kategoriya → xarita]       "Kran, rozetka, konditsioner. Eng yaqin usta keladi."
3  [post-3-narx]                             "Chaqiruv 50 000, ish qilinsa narx ichida."
4  [SO'ROVNOMA]                              "Oxirgi marta ustani qanday topdingiz?"  Tanishdan / Internetdan
5  [havola stikeri → uyservice.uz]           "Kerak bo'lsa, shu yerda."
```

So'rovnomaga javob berganlarning har biriga qisqa javob yozing (odam o'zi birinchi yozgan bo'lsa, yozish mumkin). Yozmagan odamlarga ommaviy xabar yubormang: Instagram buning uchun akkauntni cheklaydi.

Haftada bir marta **savol qutisi** qo'ying: "Uyingizda qaysi ish uchun usta topish eng qiyin?" Javoblar keyingi Reels mavzulari bo'ladi.

## 8. Birinchi hafta rejasi (Toshkent vaqti)

Joylash vaqti: mijozlar ishdan qaytgan payt, 19:00–21:00. Lekin vaqtdan ko'ra birinchi 2 soniya ko'proq hal qiladi.

```
DUSH   9 ta to'r postini joylash, 3 tasini qadash, highlights   + stories
SESH   19:30  REEL      tanishuv   reel-1 "UyService nima?"
CHOR   stories (so'rovnoma) + 20 daqiqa izoh yozish
PAYSH  19:30  KARUSEL   o'rgatish  "5 savol"
JUMA   19:30  REEL      o'rgatish  reel-2 "Kran oqyaptimi?"
SHAN   stories (savol qutisi)
YAKSH  —
```

**Har kuni 20 daqiqa izoh yozing** (joylashdan oldin):
- 5 ta katta sahifa: shahar, tuman va mahalla sahifalari, yangi uylar (novostroyka) sahifalari.
- 3 ta tengdosh: mahalliy xizmat, qurilish mollari do'konlari.
- 2 ta xaridor: uy-ro'zg'or, ta'mir va interyer blogerlari.

Izoh — fikr, savol yoki foydali qo'shimcha. Izohda reklama qilmang.

## 9. Kutilayotgan baho

| Bosqich | Baho |
|---|---|
| Faqat sozlash (2–5-bo'lim) | **≈ 72 / 100** |
| + 1 hafta muntazam post va stories | **≈ 85 / 100** |

Qolgan ballarni qayta yozib bo'lmaydi, ular faqat vaqt bilan keladi:
- haqiqiy dalil: birinchi buyurtmalar va sharhlar (mijoz roziligi bilan);
- har kuni stories;
- izohlarga javob berish.

## 10. Qilmang

- Obunachi yoki layk sotib olish, "follow/unfollow".
- Yozmagan odamlarga ommaviy xabar yuborish.
- O'ylab topilgan sharh, raqam yoki "1000+ usta" kabi da'vo.
- "30 daqiqada keladi" kabi va'da: usta vaqti joyiga qarab har xil.
- Hali tasdiqlanmagan tarif raqamlari (obuna narxi, komissiya foizi, taklif bonusi).
- Izohga havola qo'yish, 5 tadan ortiq hashteg, `#viral` yoki `#fyp`.

---

Rasmlar `design/marketing/build.js` dan yig'iladi (`ONLY=instagram` — faqat shular). Ovoz va uslub: [`voice.md`](voice.md).
