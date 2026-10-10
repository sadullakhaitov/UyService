# Yurist bilan hal qilinadigan masalalar

Ilova va hujjatlarda qilsa bo'ladigan hamma narsa qilingan (10-oktabr). Quyidagilar — faqat egasi va yurist hal qiladigan qarorlar.
Matnlar: `constants/legal.ts` (Foydalanish shartlari va Maxfiylik siyosati, 3 tilda; sahifada "qoralama" belgisi turibdi).

## 1. Ma'lumotlarni O'zbekistonda saqlash — eng muhimi
- "Shaxsga doir ma'lumotlar to'g'risida"gi Qonun (O'RQ-547), **27-1-modda**: O'zbekiston fuqarolarining ma'lumotlari O'zbekistondagi serverlarda to'planishi va saqlanishi kerak.
- Hozir baza (Supabase) **chet elda**. Variantlar: bazani O'zbekistondagi data-markazga ko'chirish (Supabase'ni o'z serverida ishlatish mumkin) yoki asosiy nusxani shu yerda yuritish.
- Bazani **Shaxsga doir ma'lumotlar davlat reyestri**dan o'tkazish.
- Hal bo'lgach — Maxfiylik siyosatining 6-bo'limini tekshirish (hozir qonun talabi yozilgan, lekin amalda bajarilmagan).

## 2. Kompaniya ma'lumotlari
- Yuridik shaxs (MChJ yoki YaTT) — nomi, STIR, yuridik manzil. `constants/legal.ts` boshidagi `COMPANY`, `TIN`, `ADDRESS` ga yoziladi (hozir `[Kompaniya nomi]`, `[STIR]`, `[yuridik manzil]`).
- Shu bilan birga kerak bo'ladi: Eskiz.uz shartnomasi, Click/Payme, App Store / Google Play akkauntlari.

## 3. Tasdiqlanmagan raqamlar (ilovada ustalarga ko'rinadi)
- Obuna — **149 000 so'm/oy**, komissiya — **10%** (`constants/billing.ts`, server `master_fee_percent`).
- Do'st taklifi bonusi — **30 000 so'm**, 5 ta ishdan keyin (`invite_bonus()`).
- Tasdiqlangach shu fayllar o'zgaradi; shartlar matni raqamlarni o'zi oladi.

## 4. Kafolat
- Shartlarda: kafolatni **usta** beradi (30 kun, 5-bo'lim), platforma murojaatni qabul qiladi. Reklamada "30 kun kafolat" deyiladi.
- Yurist tasdiqlasin: usta kafolatni bajarmasa platforma nima qiladi (qaytadan usta yuboradimi, ustani bloklaydimi, pul qaytaradimi) — iste'molchilar huquqlarini himoya qilish qonuni bo'yicha javobgarlik kimda.

## 5. Ustalarning maqomi va soliq
- Shartlarda: usta mustaqil ijrochi (YaTT yoki o'zini o'zi band qilgan), soliqni o'zi to'laydi. Yurist tasdiqlasin: platforma komissiya olganda soliq agenti bo'ladimi, ustalardan qanday hujjat talab qilish kerak.

## 6. To'lovlar keyinroq (Click/Payme ulanganda)
- Ommaviy oferta + **pulni qaytarish tartibi** (ustaning balansi, obuna, bekor qilingan to'lovlar) — to'lov tizimlari talab qiladi.

## 7. Matnlarni umumiy tekshirish
- Foydalanish shartlari va Maxfiylik siyosati (3 tilda) — yurist o'qib chiqqach "qoralama" belgisi olib tashlanadi (`DRAFT_NOTE`).
- 16 yosh (mijoz) / 18 yosh (usta) chegarasi, ma'lumotlarni saqlash muddatlari (3 yil, 30 kun, 12 oy) — tasdiqlansin.
