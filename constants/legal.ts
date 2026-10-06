// Huquqiy hujjatlar: Foydalanish shartlari (ommaviy oferta) va Maxfiylik siyosati — uch tilda.
// ⚠️ QORALAMA. E'lon qilishdan oldin yurist tekshirsin; [Kompaniya nomi], STIR, manzil to'ldirilsin.
// Narx, foiz, kafolat muddati shu yerga constants'dan olinadi — u yerda o'zgarsa, matn ham o'zgaradi.
import { BALANCE_LIMIT, BILLING } from './billing';
import { CALL_FEE, WARRANTY_DAYS } from './categories';

export type LegalDoc = 'terms' | 'privacy';
export type LegalLang = 'uz' | 'ru' | 'en';
export type LegalSection = { h: string; p: string[] };
export type LegalText = { title: string; updated: string; sections: LegalSection[] };

// Hujjatlar versiyasi (oxirgi tahrir sanasi). Matn o'zgarsa — shu ham yangilanadi.
export const LEGAL_VERSION = '2026-10-06';

// Hujjat tepasidagi ogohlantirish (hujjatning o'zida emas)
export const DRAFT_NOTE: Record<LegalLang, string> = {
  uz: `Bu hujjat qoralama. Rasmiy e'lon qilinishidan oldin yurist tomonidan tekshiriladi va to'ldiriladi.`,
  ru: `Это черновик документа. До официальной публикации он будет проверен и дополнен юристом.`,
  en: `This document is a draft. It will be reviewed and completed by a lawyer before official publication.`,
};

const COMPANY = '[Kompaniya nomi]';
const TIN = '[STIR]';
const ADDRESS = '[yuridik manzil]';
const EMAIL = 'support@uyservice.uz';
const SITE = 'uyservice.uz';

// 50000 → "50 000" (bo'linmas bo'sh joy bilan)
const num = (v: number) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const fee = num(CALL_FEE);
const subFee = num(BILLING.subscription.monthlyFee);
const pct = BILLING.commission.commissionPercent;
const limit = num(BALANCE_LIMIT);
const days = WARRANTY_DAYS;

// ─── Foydalanish shartlari ───────────────────────────────────────────────

const termsUz: LegalText = {
  title: 'Foydalanish shartlari',
  updated: `Oxirgi tahrir: 2026-yil 6-oktabr`,
  sections: [
    {
      h: '1. Umumiy qoidalar',
      p: [
        `Ushbu Foydalanish shartlari (keyingi o'rinlarda — Shartlar) UyService mobil ilovasi va ${SITE} xizmatidan (keyingi o'rinlarda — Platforma) foydalanish tartibini belgilaydi. Platforma operatori — ${COMPANY} (STIR: ${TIN}, manzil: ${ADDRESS}), keyingi o'rinlarda — Operator.`,
        `Shartlar ommaviy oferta hisoblanadi. Telefon raqamingizni SMS kod bilan tasdiqlab, buyurtma berganingizda yoki usta sifatida ro'yxatdan o'tganingizda Shartlarni to'liq qabul qilgan bo'lasiz. Rozi bo'lmasangiz, Platformadan foydalanmang.`,
      ],
    },
    {
      h: '2. Platforma nima qiladi',
      p: [
        `Platforma — mijozlarni uyda xizmat ko'rsatuvchi mustaqil ustalar (santexnik, elektrik, konditsioner, mebel, ta'mirlash, maishiy texnika) bilan bog'laydigan vositachi. Operator ta'mirlash ishlarini o'zi bajarmaydi va ustalarning ish beruvchisi emas.`,
        `Usta mustaqil ijrochi (yakka tartibdagi tadbirkor yoki o'zini o'zi band qilgan shaxs) sifatida ishlaydi. Ish bo'yicha shartnoma mijoz va usta o'rtasida tuziladi; Operator buyurtmani yetkazish, ustani topish, aloqa va baholash vositalarini taqdim etadi.`,
      ],
    },
    {
      h: '3. Hisob va ro\'yxatdan o\'tish',
      p: [
        `Platformani ko'rish uchun ro'yxatdan o'tish shart emas. Buyurtma berish yoki usta bo'lib ishlash uchun telefon raqami SMS kod orqali tasdiqlanadi. Platformadan 16 yoshga to'lgan shaxslar foydalanishi mumkin; usta bo'lib ishlash uchun 18 yoshga to'lgan bo'lish kerak.`,
        `Hisobingiz orqali qilingan barcha harakatlar uchun o'zingiz javobgarsiz. SMS kodni hech kimga bermang. Raqamingiz boshqa birovning qo'liga o'tgan deb gumon qilsangiz, darhol ${EMAIL} manziliga yozing.`,
      ],
    },
    {
      h: '4. Mijozning majburiyatlari',
      p: [
        `Mijoz muammoni, manzilni va aloqa ma'lumotlarini to'g'ri ko'rsatadi, usta kelganda uyda bo'ladi (yoki ishonchli shaxsni qoldiradi) va ish uchun xavfsiz sharoit yaratadi.`,
        `Mijoz kelishilgan narxni ish tugagach naqd to'laydi, ustaga hurmat bilan munosabatda bo'ladi va Platformadan qonunga zid maqsadlarda foydalanmaydi. Platformadan topilgan ustaga keyingi ishlar uchun Platformani chetlab buyurtma berishga undash tavsiya etilmaydi — bunday ishlarga kafolat va yordam tatbiq etilmaydi.`,
      ],
    },
    {
      h: '5. Ustaning majburiyatlari',
      p: [
        `Usta haqiqiy ma'lumotlarni ko'rsatadi va shaxsini tasdiqlash uchun pasport rasmini (ixtiyoriy ravishda selfi) yuklaydi. Operator ma'lumotlarni tekshirib chiqmaguncha usta buyurtma ololmaydi. Operator sababini ko'rsatmasdan tasdiqlashni rad etishi mumkin.`,
        `Usta ishni sifatli, o'z vaqtida va xavfsizlik qoidalariga rioya qilib bajaradi. Aniq narx usta kelib ko'rgandan keyin, ish boshlanishidan oldin mijoz bilan kelishiladi; kelishilgan narxni mijozning roziligisiz oshirish mumkin emas.`,
        `Usta bajargan ishiga ${days} kun kafolat beradi: shu muddatda ishdagi kamchilik aniqlansa, uni qo'shimcha haq olmasdan tuzatadi. Kafolat mijoz aybi bilan yuzaga kelgan nosozliklar va mijoz bergan materiallarga tatbiq etilmaydi.`,
        `Usta soliq va boshqa majburiy to'lovlarni o'zi to'laydi hamda faoliyati uchun zarur ruxsatnomalarga ega bo'lishi kerak.`,
      ],
    },
    {
      h: '6. Narxlar va to\'lovlar',
      p: [
        `Hozircha to'lov faqat naqd pulda, to'g'ridan-to'g'ri ustaga amalga oshiriladi. Chaqiruv narxi (usta kelib ko'rishi) — ${fee} so'm, barcha kategoriyalar uchun bir xil. Ilovada ko'rsatilgan ish narxlari taxminiy; yakuniy narx joyida kelishiladi.`,
        `Usta Platformadan foydalanish uchun ikki tarifdan birini tanlaydi: oylik obuna — oyiga ${subFee} so'm, yoki komissiya — har bir ish narxining ${pct}% (chaqiruv narxi ham kiradi). Komissiya tarifida Operator ulushi ustaning Platformadagi balansidan yechiladi; balans ${limit} so'mdan past bo'lsa, yangi buyurtmalar vaqtincha yopiladi. Tarifni ilovaning "Pul" bo'limida o'zgartirish mumkin.`,
        `Operator tariflar narxini o'zgartirishi mumkin; bu haqda ustalar kamida 14 kun oldin xabardor qilinadi.`,
      ],
    },
    {
      h: '7. Bekor qilish',
      p: [
        `Mijoz buyurtmani usta yetib kelguniga qadar bepul bekor qilishi mumkin. Usta yetib kelib, muammoni ko'rib chiqqandan keyin bekor qilinsa, mijoz chaqiruv narxini (${fee} so'm) to'laydi.`,
        `Usta qabul qilingan buyurtmani faqat uzrli sabab bilan bekor qilishi mumkin. Tez-tez bekor qilish va javobsiz qoldirish ustaning aktivlik ko'rsatkichini pasaytiradi, takrorlansa hisob vaqtincha yoki butunlay bloklanishi mumkin.`,
      ],
    },
    {
      h: '8. Baholash va sharhlar',
      p: [
        `Ish tugagach mijoz ustani 1 dan 5 gacha yulduz bilan baholaydi va sharh qoldirishi mumkin. Baho va sharh faqat haqiqatda bajarilgan buyurtma bo'yicha qoldiriladi va boshqa foydalanuvchilarga ko'rinadi.`,
        `Haqorat, shaxsiy ma'lumotlar, reklama yoki yolg'on ma'lumot bo'lgan sharhlar taqiqlanadi. Pul yoki chegirma evaziga baho so'rash, sun'iy baho qo'yish man etiladi. Operator bunday sharhlarni o'chirish va qoidabuzar hisobini bloklash huquqiga ega.`,
      ],
    },
    {
      h: '9. Javobgarlikni cheklash',
      p: [
        `Usta bajargan ishning sifati, muddati va natijasi uchun usta javobgar. Operator mijoz va usta o'rtasidagi kelishuv tomoni emas, biroq nizo yuzaga kelganda uni hal qilishga ko'maklashadi: yozishmalarni ko'rib chiqadi, kafolat ishlarini tashkil qiladi, qoidabuzar ustani bloklaydi.`,
        `Operator Platformaning uzluksiz ishlashiga harakat qiladi, lekin aloqa, internet, GPS va uchinchi tomon xizmatlaridagi uzilishlar uchun javob bermaydi. Xaritadagi joylashuv va yetib kelish vaqti taxminiy. Qonun yo'l qo'ygan doirada Operatorning javobgarligi bevosita haqiqiy zarar bilan cheklanadi.`,
      ],
    },
    {
      h: '10. Nizolarni hal qilish',
      p: [
        `Shartlarga O'zbekiston Respublikasi qonunchiligi qo'llaniladi. Nizolar avval muzokara yo'li bilan hal qilinadi: shikoyatingizni ${EMAIL} manziliga yuboring, biz 10 ish kuni ichida javob beramiz.`,
        `Kelishuvga erishilmasa, nizo O'zbekiston Respublikasi qonunchiligiga muvofiq Toshkent shahridagi vakolatli sudda ko'rib chiqiladi. Bu iste'molchilarning qonunda belgilangan huquqlarini cheklamaydi.`,
      ],
    },
    {
      h: '11. Shartlarning o\'zgarishi',
      p: [
        `Operator Shartlarni o'zgartirishi mumkin. Yangi tahrir ilovada e'lon qilingan kundan kuchga kiradi; muhim o'zgarishlar haqida ilova orqali oldindan xabar beriladi. O'zgarishlardan keyin Platformadan foydalanishni davom ettirish yangi tahrirga rozilik hisoblanadi.`,
      ],
    },
    {
      h: '12. Aloqa',
      p: [`Savol, taklif va shikoyatlar uchun: ${EMAIL} yoki ilovadagi qo'llab-quvvatlash chati. Operator: ${COMPANY}, STIR ${TIN}, ${ADDRESS}.`],
    },
  ],
};

const termsRu: LegalText = {
  title: 'Условия использования',
  updated: 'Последняя редакция: 6 октября 2026 г.',
  sections: [
    {
      h: '1. Общие положения',
      p: [
        `Настоящие Условия использования (далее — Условия) определяют порядок использования мобильного приложения UyService и сервиса ${SITE} (далее — Платформа). Оператор Платформы — ${COMPANY} (ИНН: ${TIN}, адрес: ${ADDRESS}), далее — Оператор.`,
        `Условия являются публичной офертой. Подтверждая номер телефона SMS-кодом, оформляя заказ или регистрируясь в качестве мастера, вы полностью принимаете Условия. Если вы не согласны, не пользуйтесь Платформой.`,
      ],
    },
    {
      h: '2. Что делает Платформа',
      p: [
        `Платформа — посредник, который соединяет клиентов с независимыми мастерами по дому (сантехника, электрика, кондиционеры, мебель, ремонт, бытовая техника). Оператор сам не выполняет ремонтные работы и не является работодателем мастеров.`,
        `Мастер работает как независимый исполнитель (индивидуальный предприниматель или самозанятый). Договор на выполнение работ заключается между клиентом и мастером; Оператор предоставляет инструменты для передачи заказа, поиска мастера, связи и оценки.`,
      ],
    },
    {
      h: '3. Аккаунт и регистрация',
      p: [
        `Просматривать Платформу можно без регистрации. Чтобы сделать заказ или работать мастером, нужно подтвердить номер телефона SMS-кодом. Пользоваться Платформой могут лица от 16 лет; работать мастером — от 18 лет.`,
        `Вы отвечаете за все действия, совершённые через ваш аккаунт. Никому не сообщайте SMS-код. Если подозреваете, что вашим номером воспользовался кто-то другой, сразу напишите на ${EMAIL}.`,
      ],
    },
    {
      h: '4. Обязанности клиента',
      p: [
        `Клиент правильно указывает проблему, адрес и контакты, находится дома к приезду мастера (или оставляет доверенное лицо) и обеспечивает безопасные условия для работы.`,
        `Клиент оплачивает согласованную цену наличными после завершения работы, уважительно относится к мастеру и не использует Платформу в противоправных целях. На работы, заказанные у мастера в обход Платформы, гарантия и поддержка не распространяются.`,
      ],
    },
    {
      h: '5. Обязанности мастера',
      p: [
        `Мастер указывает достоверные данные и загружает фото паспорта (по желанию — селфи) для подтверждения личности. Пока Оператор не проверит данные, мастер не получает заказы. Оператор вправе отказать в подтверждении без объяснения причин.`,
        `Мастер выполняет работу качественно, в срок и с соблюдением правил безопасности. Точная цена согласовывается с клиентом после осмотра, до начала работ; повышать согласованную цену без согласия клиента нельзя.`,
        `Мастер даёт гарантию ${days} дней на выполненную работу: если в этот срок обнаружен недостаток, он устраняет его без дополнительной оплаты. Гарантия не распространяется на поломки по вине клиента и на материалы, предоставленные клиентом.`,
        `Мастер самостоятельно уплачивает налоги и иные обязательные платежи и должен иметь разрешения, необходимые для своей деятельности.`,
      ],
    },
    {
      h: '6. Цены и оплата',
      p: [
        `Сейчас оплата только наличными, напрямую мастеру. Стоимость вызова (выезд и осмотр) — ${fee} сум, одинаково для всех категорий. Цены работ в приложении ориентировочные; итоговая цена согласуется на месте.`,
        `За пользование Платформой мастер выбирает один из двух тарифов: месячная подписка — ${subFee} сум в месяц, или комиссия — ${pct}% от стоимости каждой работы (включая стоимость вызова). На тарифе с комиссией доля Оператора списывается с баланса мастера на Платформе; если баланс ниже ${limit} сум, новые заказы временно закрываются. Тариф можно сменить в разделе «Деньги».`,
        `Оператор может изменять стоимость тарифов, уведомив мастеров не менее чем за 14 дней.`,
      ],
    },
    {
      h: '7. Отмена',
      p: [
        `Клиент может бесплатно отменить заказ до приезда мастера. Если мастер приехал и осмотрел проблему, при отмене клиент оплачивает стоимость вызова (${fee} сум).`,
        `Мастер может отменить принятый заказ только по уважительной причине. Частые отмены и пропущенные заказы снижают показатель активности; при повторении аккаунт может быть заблокирован временно или навсегда.`,
      ],
    },
    {
      h: '8. Оценки и отзывы',
      p: [
        `После работы клиент оценивает мастера от 1 до 5 звёзд и может оставить отзыв. Оценка и отзыв оставляются только по реально выполненному заказу и видны другим пользователям.`,
        `Запрещены отзывы с оскорблениями, персональными данными, рекламой или ложной информацией, а также накрутка оценок и просьбы об оценке за деньги или скидку. Оператор вправе удалять такие отзывы и блокировать нарушителей.`,
      ],
    },
    {
      h: '9. Ограничение ответственности',
      p: [
        `За качество, сроки и результат работы отвечает мастер. Оператор не является стороной соглашения между клиентом и мастером, но помогает урегулировать спор: изучает переписку, организует гарантийный ремонт, блокирует недобросовестных мастеров.`,
        `Оператор стремится к бесперебойной работе Платформы, но не отвечает за сбои связи, интернета, GPS и сторонних сервисов. Местоположение на карте и время прибытия — ориентировочные. В пределах, допустимых законом, ответственность Оператора ограничена прямым реальным ущербом.`,
      ],
    },
    {
      h: '10. Разрешение споров',
      p: [
        `К Условиям применяется законодательство Республики Узбекистан. Споры сначала решаются путём переговоров: направьте претензию на ${EMAIL}, мы ответим в течение 10 рабочих дней.`,
        `Если договориться не удалось, спор рассматривается компетентным судом города Ташкента в соответствии с законодательством Республики Узбекистан. Это не ограничивает права потребителей, установленные законом.`,
      ],
    },
    {
      h: '11. Изменение Условий',
      p: [
        `Оператор может изменять Условия. Новая редакция вступает в силу со дня публикации в приложении; о существенных изменениях мы предупреждаем заранее через приложение. Продолжая пользоваться Платформой после изменений, вы соглашаетесь с новой редакцией.`,
      ],
    },
    {
      h: '12. Контакты',
      p: [`Вопросы, предложения и жалобы: ${EMAIL} или чат поддержки в приложении. Оператор: ${COMPANY}, ИНН ${TIN}, ${ADDRESS}.`],
    },
  ],
};

const termsEn: LegalText = {
  title: 'Terms of Use',
  updated: 'Last updated: October 6, 2026',
  sections: [
    {
      h: '1. General',
      p: [
        `These Terms of Use (the "Terms") govern your use of the UyService mobile app and the ${SITE} service (the "Platform"). The Platform is operated by ${COMPANY} (TIN: ${TIN}, address: ${ADDRESS}) (the "Operator").`,
        `These Terms are a public offer. By confirming your phone number with an SMS code, placing an order or registering as a master, you accept the Terms in full. If you do not agree, do not use the Platform.`,
      ],
    },
    {
      h: '2. What the Platform does',
      p: [
        `The Platform is an intermediary that connects clients with independent home-service masters (plumbing, electrical, air conditioning, furniture, renovation, home appliances). The Operator does not perform repair work itself and is not the masters' employer.`,
        `Masters work as independent contractors (sole proprietors or self-employed persons). The contract for the work is made between the client and the master; the Operator provides the tools for placing orders, finding a master, communication and ratings.`,
      ],
    },
    {
      h: '3. Account and registration',
      p: [
        `You can browse the Platform without registering. To place an order or work as a master, you confirm your phone number with an SMS code. You must be at least 16 to use the Platform and at least 18 to work as a master.`,
        `You are responsible for everything done through your account. Never share your SMS code. If you suspect someone else has used your number, write to ${EMAIL} immediately.`,
      ],
    },
    {
      h: '4. Client obligations',
      p: [
        `The client describes the problem, address and contact details accurately, is at home when the master arrives (or leaves a trusted person) and provides safe conditions for the work.`,
        `The client pays the agreed price in cash once the work is done, treats the master with respect and does not use the Platform for unlawful purposes. Work ordered from a master outside the Platform is not covered by the warranty or support.`,
      ],
    },
    {
      h: '5. Master obligations',
      p: [
        `The master provides accurate information and uploads a passport photo (and, optionally, a selfie) for identity verification. The master receives no orders until the Operator has checked these details. The Operator may refuse verification without giving reasons.`,
        `The master performs the work well, on time and in line with safety rules. The exact price is agreed with the client after inspection and before the work starts; the agreed price may not be raised without the client's consent.`,
        `The master gives a ${days}-day warranty on the work: if a defect appears within that period, the master fixes it at no extra charge. The warranty does not cover damage caused by the client or materials supplied by the client.`,
        `The master pays their own taxes and other mandatory charges and must hold any permits their work requires.`,
      ],
    },
    {
      h: '6. Prices and payment',
      p: [
        `For now, payment is cash only, made directly to the master. The call-out fee (visit and inspection) is ${fee} UZS, the same for all categories. Prices shown in the app are estimates; the final price is agreed on site.`,
        `To use the Platform, a master chooses one of two plans: a monthly subscription of ${subFee} UZS per month, or a commission of ${pct}% of each job's price (including the call-out fee). On the commission plan, the Operator's share is deducted from the master's Platform balance; if the balance falls below ${limit} UZS, new orders are paused. The plan can be changed in the "Money" section of the app.`,
        `The Operator may change plan prices with at least 14 days' notice to masters.`,
      ],
    },
    {
      h: '7. Cancellation',
      p: [
        `The client may cancel an order free of charge until the master arrives. If the master has arrived and inspected the problem, the client pays the call-out fee (${fee} UZS) on cancellation.`,
        `A master may cancel an accepted order only for a good reason. Frequent cancellations and missed offers lower the master's activity score; repeated violations may lead to a temporary or permanent block.`,
      ],
    },
    {
      h: '8. Ratings and reviews',
      p: [
        `After the work, the client rates the master from 1 to 5 stars and may leave a review. Ratings and reviews may only be left for an order that was actually completed and are visible to other users.`,
        `Reviews containing insults, personal data, advertising or false information are not allowed, nor are fake ratings or asking for ratings in exchange for money or discounts. The Operator may remove such reviews and block violators.`,
      ],
    },
    {
      h: '9. Limitation of liability',
      p: [
        `The master is responsible for the quality, timing and result of the work. The Operator is not a party to the agreement between client and master, but helps resolve disputes: it reviews the chat history, arranges warranty repairs and blocks dishonest masters.`,
        `The Operator works to keep the Platform running without interruption but is not liable for outages of mobile networks, the internet, GPS or third-party services. Map locations and arrival times are estimates. To the extent permitted by law, the Operator's liability is limited to direct actual damage.`,
      ],
    },
    {
      h: '10. Disputes',
      p: [
        `These Terms are governed by the laws of the Republic of Uzbekistan. Disputes are first resolved by negotiation: send your complaint to ${EMAIL} and we will reply within 10 business days.`,
        `If no agreement is reached, the dispute is heard by the competent court in Tashkent under the laws of the Republic of Uzbekistan. This does not limit consumers' statutory rights.`,
      ],
    },
    {
      h: '11. Changes to the Terms',
      p: [
        `The Operator may change these Terms. A new version takes effect on the day it is published in the app; we give advance notice of material changes through the app. Continuing to use the Platform after a change means you accept the new version.`,
      ],
    },
    {
      h: '12. Contact',
      p: [`Questions, suggestions and complaints: ${EMAIL} or the support chat in the app. Operator: ${COMPANY}, TIN ${TIN}, ${ADDRESS}.`],
    },
  ],
};

// ─── Maxfiylik siyosati ──────────────────────────────────────────────────
// TODO(egasi): asosiy ma'lumotlar bazasi qayerda turishini tasdiqlang. Qonun (ZRU-547, 27-1-modda)
// O'zbekiston fuqarolari ma'lumotlarini O'zbekistondagi serverlarda saqlashni talab qiladi; Supabase
// hozir chet elda (masalan, EI). Asosiy bazani O'zbekistonga ko'chirish (yoki nusxasini u yerda yuritish)
// va Davlat reyestrida ro'yxatdan o'tish hal bo'lmaguncha 6-bo'lim matnini e'lon qilmang.

const privacyUz: LegalText = {
  title: 'Maxfiylik siyosati',
  updated: `Oxirgi tahrir: 2026-yil 6-oktabr`,
  sections: [
    {
      h: '1. Umumiy qoidalar',
      p: [
        `Ushbu Maxfiylik siyosati UyService ilovasi (Platforma) qanday shaxsga doir ma'lumotlarni yig'ishi, ulardan qanday foydalanishi va himoya qilishini tushuntiradi. Ma'lumotlar operatori — ${COMPANY} (STIR: ${TIN}, manzil: ${ADDRESS}).`,
        `Biz O'zbekiston Respublikasining "Shaxsga doir ma'lumotlar to'g'risida"gi Qonuni (2019-yil 2-iyuldagi O'RQ-547-son) va boshqa qonun hujjatlariga amal qilamiz.`,
      ],
    },
    {
      h: '2. Qanday ma\'lumotlarni yig\'amiz',
      p: [
        `Barcha foydalanuvchilar: telefon raqami, ism (agar ko'rsatsangiz), tanlangan til; qurilma ma'lumotlari — model, operatsion tizim, ilova versiyasi, bildirishnoma tokeni, xatolar jurnali.`,
        `Joylashuv: ruxsat bersangiz — GPS bo'yicha joylashuv (mijozda — manzilni aniqlash va yaqin ustani topish uchun; ustada — onlayn bo'lganda har 5 soniyada, buyurtma va yo'lni ko'rsatish uchun).`,
        `Buyurtmalar: kategoriya, muammo tavsifi, manzil, siz yuklagan rasmlar, vaqt, narx, baho va sharhlar; mijoz va usta o'rtasidagi chat xabarlari, qo'llab-quvvatlash bilan yozishmalar.`,
        `Ustalar qo'shimcha ravishda: ism-familiya, tajriba, kategoriyalar, pasport rasmi va ixtiyoriy selfi, ish namunalari rasmlari, tanlangan tarif, balans va to'lovlar tarixi, aktivlik va reyting.`,
      ],
    },
    {
      h: '3. Ma\'lumotlardan nima uchun foydalanamiz',
      p: [
        `Hisobga kirish (SMS kod), buyurtmani qabul qilish va eng yaqin mos ustani topish, xaritada ustaning kelishini ko'rsatish, mijoz va usta o'rtasidagi aloqa, bildirishnomalar yuborish.`,
        `Ustaning shaxsini tasdiqlash va firibgarlikning oldini olish, nizolar va kafolat murojaatlarini ko'rib chiqish, tariflarni hisoblash, xizmat sifatini yaxshilash va xatolarni tuzatish. Biz ma'lumotlaringizni sotmaymiz va reklama uchun uchinchi shaxslarga bermaymiz.`,
      ],
    },
    {
      h: '4. Huquqiy asos',
      p: [
        `Ma'lumotlaringizga ishlov berishning asosiy asosi — sizning roziligingiz: telefon raqamini tasdiqlash va Shartlarni qabul qilish orqali hamda qurilmangizda joylashuv, kamera va bildirishnomalarga ruxsat berganingizda alohida beriladi.`,
        `Ba'zi ma'lumotlar Foydalanish shartlarini bajarish va qonunda belgilangan majburiyatlarni (masalan, davlat organlarining qonuniy so'rovlari) bajarish uchun ishlatiladi. Rozilikni istalgan vaqtda qaytarib olishingiz mumkin — 8-bo'limga qarang.`,
      ],
    },
    {
      h: '5. Kim nimani ko\'radi',
      p: [
        `Usta yangi buyurtma taklifida faqat kategoriya, muammo tavsifi, rasmlar va taxminiy masofani ko'radi. Mijozning aniq manzili, ismi va telefon raqami usta buyurtmani qabul qilgandan keyingina ochiladi.`,
        `Mijoz tayinlangan ustaning ismi, rasmi, reytingi, sharhlari va buyurtma davomida uning joylashuvini ko'radi. Pasport va selfi boshqa foydalanuvchilarga hech qachon ko'rsatilmaydi — ularni faqat Operatorning tekshiruvchi xodimlari ko'radi.`,
        `Baho va sharhlar (ismingizning qisqartmasi bilan) boshqa foydalanuvchilarga ko'rinadi. Operator xodimlari ma'lumotlarga faqat ish vazifasi doirasida (qo'llab-quvvatlash, nizolar, tekshiruv) kiradi.`,
      ],
    },
    {
      h: '6. Saqlash joyi va muddati',
      p: [
        `Qonunning 27-1-moddasiga muvofiq Operator O'zbekiston fuqarolarining shaxsga doir ma'lumotlarini O'zbekiston hududida joylashgan ma'lumotlar bazalarida to'playdi va saqlaydi hamda bazani shaxsga doir ma'lumotlar bazalarining Davlat reyestrida ro'yxatdan o'tkazadi.`,
        `Ayrim texnik xizmatlar (bulutli infratuzilma, xarita, bildirishnomalar) chet elda joylashgan bo'lishi mumkin. Ma'lumotlarni chet elga uzatish faqat qonunda belgilangan tartibda, ma'lumotlar yetarli himoya qilinadigan holda va zarur hajmda amalga oshiriladi.`,
        `Muddatlar: hisob ma'lumotlari — hisob faol bo'lguncha; buyurtmalar, chat va sharhlar — buyurtma yakunlangandan keyin 3 yil (nizolar va kafolat uchun); ustaning hujjatlari — usta Platformada ishlaguncha va hisob o'chirilgandan keyin 30 kun; joylashuv tarixi — 30 kun; texnik jurnallar — 12 oy. Muddat tugagach ma'lumotlar o'chiriladi yoki shaxsni aniqlab bo'lmaydigan holga keltiriladi.`,
      ],
    },
    {
      h: '7. Xizmat ko\'rsatuvchi hamkorlar',
      p: [
        `Platforma ishlashi uchun ma'lumotlarning bir qismi hamkorlarga beriladi: SMS yuborish xizmati (telefon raqami), xarita va yo'nalish xizmatlari (koordinatalar), bildirishnoma xizmati (qurilma tokeni), bulutli ma'lumotlar bazasi va fayl saqlash xizmati. Hamkorlar ma'lumotlardan faqat bizning topshirig'imiz bilan va maxfiylikni saqlash sharti bilan foydalanadi.`,
        `Qonunda nazarda tutilgan hollarda ma'lumotlar vakolatli davlat organlariga ularning qonuniy so'rovi asosida beriladi.`,
      ],
    },
    {
      h: '8. Sizning huquqlaringiz',
      p: [
        `Siz o'zingiz haqingizdagi ma'lumotlar bilan tanishish, ularni tuzatish, ishlov berishni cheklash, rozilikni qaytarib olish va hisobingizni hamda ma'lumotlaringizni o'chirishni talab qilish huquqiga egasiz.`,
        `Buning uchun ilovadagi qo'llab-quvvatlash chatiga yoki ${EMAIL} manziliga hisobingizga bog'langan raqamdan murojaat qiling. Biz 10 ish kuni ichida javob beramiz. Qonun saqlashni talab qiladigan ma'lumotlar (masalan, to'lovlar hisobi) belgilangan muddat tugaguncha saqlanadi.`,
        `Joylashuv, kamera va bildirishnomalarga ruxsatni istalgan vaqtda telefon sozlamalarida o'chirishingiz mumkin; bunda ilovaning ayrim funksiyalari ishlamasligi mumkin.`,
      ],
    },
    {
      h: '9. Bolalar',
      p: [
        `Platforma 16 yoshga to'lmagan shaxslar uchun mo'ljallanmagan va ular ro'yxatdan o'tishi mumkin emas. Agar 16 yoshga to'lmagan bola ma'lumotlarini bergani ma'lum bo'lsa, hisob va ma'lumotlar o'chiriladi.`,
      ],
    },
    {
      h: '10. Xavfsizlik',
      p: [
        `Ma'lumotlar uzatishda shifrlanadi (HTTPS/TLS), bazaga kirish qatorlar darajasidagi huquqlar bilan cheklangan — har bir foydalanuvchi faqat o'ziga tegishli ma'lumotlarni ko'radi. Ustalarning hujjatlari yopiq omborda saqlanadi.`,
        `Hech bir tizim mutlaq xavfsiz emas. Ma'lumotlar sizib chiqishi aniqlansa, biz zararni kamaytirish choralarini ko'ramiz va qonunda belgilangan tartibda foydalanuvchilar hamda vakolatli organni xabardor qilamiz.`,
      ],
    },
    {
      h: '11. O\'zgarishlar va aloqa',
      p: [
        `Siyosat o'zgarsa, yangi tahrir ilovada e'lon qilinadi; muhim o'zgarishlar haqida oldindan xabar beramiz.`,
        `Ma'lumotlar bo'yicha savollar: ${EMAIL}. Operator: ${COMPANY}, STIR ${TIN}, ${ADDRESS}.`,
      ],
    },
  ],
};

const privacyRu: LegalText = {
  title: 'Политика конфиденциальности',
  updated: 'Последняя редакция: 6 октября 2026 г.',
  sections: [
    {
      h: '1. Общие положения',
      p: [
        `Настоящая Политика конфиденциальности объясняет, какие персональные данные собирает приложение UyService (Платформа), как оно их использует и защищает. Оператор персональных данных — ${COMPANY} (ИНН: ${TIN}, адрес: ${ADDRESS}).`,
        `Мы соблюдаем Закон Республики Узбекистан «О персональных данных» от 2 июля 2019 года № ЗРУ-547 и иные акты законодательства.`,
      ],
    },
    {
      h: '2. Какие данные мы собираем',
      p: [
        `Все пользователи: номер телефона, имя (если указано), выбранный язык; данные устройства — модель, операционная система, версия приложения, токен уведомлений, журнал ошибок.`,
        `Местоположение: с вашего разрешения — GPS-координаты (у клиента — чтобы определить адрес и найти ближайшего мастера; у мастера — каждые 5 секунд, пока он на линии, чтобы показывать заказы и маршрут).`,
        `Заказы: категория, описание проблемы, адрес, загруженные фото, время, цена, оценки и отзывы; сообщения в чате между клиентом и мастером, переписка с поддержкой.`,
        `Дополнительно у мастеров: ФИО, опыт, категории, фото паспорта и необязательное селфи, фото примеров работ, выбранный тариф, баланс и история платежей, активность и рейтинг.`,
      ],
    },
    {
      h: '3. Зачем мы используем данные',
      p: [
        `Вход в аккаунт (SMS-код), приём заказа и поиск ближайшего подходящего мастера, отображение движения мастера на карте, связь клиента и мастера, отправка уведомлений.`,
        `Подтверждение личности мастера и защита от мошенничества, рассмотрение споров и гарантийных обращений, расчёт тарифов, улучшение сервиса и исправление ошибок. Мы не продаём ваши данные и не передаём их третьим лицам для рекламы.`,
      ],
    },
    {
      h: '4. Правовое основание',
      p: [
        `Основное основание обработки — ваше согласие: оно даётся при подтверждении номера телефона и принятии Условий, а также отдельно — при разрешении доступа к геолокации, камере и уведомлениям на устройстве.`,
        `Часть данных используется для исполнения Условий использования и обязанностей, установленных законом (например, законных запросов государственных органов). Согласие можно отозвать в любой момент — см. раздел 8.`,
      ],
    },
    {
      h: '5. Кто что видит',
      p: [
        `В предложении нового заказа мастер видит только категорию, описание проблемы, фото и примерное расстояние. Точный адрес, имя и телефон клиента открываются только после того, как мастер принял заказ.`,
        `Клиент видит имя, фото, рейтинг и отзывы назначенного мастера и его местоположение во время заказа. Паспорт и селфи никогда не показываются другим пользователям — их видят только проверяющие сотрудники Оператора.`,
        `Оценки и отзывы (с сокращённым именем) видны другим пользователям. Сотрудники Оператора получают доступ к данным только в рамках своих обязанностей (поддержка, споры, проверка).`,
      ],
    },
    {
      h: '6. Место и срок хранения',
      p: [
        `В соответствии со статьёй 27-1 Закона Оператор осуществляет сбор и хранение персональных данных граждан Узбекистана в базах данных, расположенных на территории Республики Узбекистан, и регистрирует базу в Государственном реестре баз персональных данных.`,
        `Отдельные технические сервисы (облачная инфраструктура, карты, уведомления) могут находиться за рубежом. Трансграничная передача данных осуществляется только в порядке, установленном законом, при условии надлежащей защиты данных и в необходимом объёме.`,
        `Сроки: данные аккаунта — пока аккаунт активен; заказы, чаты и отзывы — 3 года после завершения заказа (для споров и гарантии); документы мастера — пока мастер работает на Платформе и 30 дней после удаления аккаунта; история местоположения — 30 дней; технические журналы — 12 месяцев. По истечении срока данные удаляются или обезличиваются.`,
      ],
    },
    {
      h: '7. Партнёры-обработчики',
      p: [
        `Для работы Платформы часть данных передаётся партнёрам: сервису отправки SMS (номер телефона), сервисам карт и маршрутов (координаты), сервису уведомлений (токен устройства), облачной базе данных и файловому хранилищу. Партнёры используют данные только по нашему поручению и с соблюдением конфиденциальности.`,
        `В случаях, предусмотренных законом, данные предоставляются уполномоченным государственным органам по их законному запросу.`,
      ],
    },
    {
      h: '8. Ваши права',
      p: [
        `Вы вправе знакомиться со своими данными, исправлять их, ограничивать обработку, отзывать согласие и требовать удаления аккаунта и данных.`,
        `Для этого напишите в чат поддержки в приложении или на ${EMAIL} с номера, привязанного к аккаунту. Мы ответим в течение 10 рабочих дней. Данные, хранение которых требует закон (например, учёт платежей), хранятся до окончания установленного срока.`,
        `Доступ к геолокации, камере и уведомлениям можно в любой момент отключить в настройках телефона; при этом часть функций приложения может не работать.`,
      ],
    },
    {
      h: '9. Дети',
      p: [
        `Платформа не предназначена для лиц младше 16 лет, и они не могут регистрироваться. Если станет известно, что данные предоставил ребёнок младше 16 лет, аккаунт и данные будут удалены.`,
      ],
    },
    {
      h: '10. Безопасность',
      p: [
        `Данные шифруются при передаче (HTTPS/TLS), доступ к базе ограничен правами на уровне строк — каждый пользователь видит только свои данные. Документы мастеров хранятся в закрытом хранилище.`,
        `Ни одна система не защищена абсолютно. При обнаружении утечки мы примем меры по снижению вреда и уведомим пользователей и уполномоченный орган в порядке, установленном законом.`,
      ],
    },
    {
      h: '11. Изменения и контакты',
      p: [
        `При изменении Политики новая редакция публикуется в приложении; о существенных изменениях мы предупреждаем заранее.`,
        `Вопросы о данных: ${EMAIL}. Оператор: ${COMPANY}, ИНН ${TIN}, ${ADDRESS}.`,
      ],
    },
  ],
};

const privacyEn: LegalText = {
  title: 'Privacy Policy',
  updated: 'Last updated: October 6, 2026',
  sections: [
    {
      h: '1. General',
      p: [
        `This Privacy Policy explains what personal data the UyService app (the "Platform") collects, how it is used and how it is protected. The data controller (operator) is ${COMPANY} (TIN: ${TIN}, address: ${ADDRESS}).`,
        `We comply with the Law of the Republic of Uzbekistan "On Personal Data" No. ZRU-547 of July 2, 2019 and other applicable legislation.`,
      ],
    },
    {
      h: '2. What data we collect',
      p: [
        `All users: phone number, name (if provided), chosen language; device data — model, operating system, app version, notification token, error logs.`,
        `Location: with your permission, GPS location (for clients — to set the address and find the nearest master; for masters — every 5 seconds while online, to show orders and routes).`,
        `Orders: category, problem description, address, photos you upload, time, price, ratings and reviews; chat messages between client and master and conversations with support.`,
        `Additionally for masters: full name, experience, categories, passport photo and optional selfie, photos of past work, chosen plan, balance and payment history, activity score and rating.`,
      ],
    },
    {
      h: '3. Why we use data',
      p: [
        `To sign you in (SMS code), accept orders and find the nearest suitable master, show the master's approach on the map, let client and master communicate, and send notifications.`,
        `To verify masters' identity and prevent fraud, handle disputes and warranty claims, calculate plans, improve the service and fix bugs. We do not sell your data or share it with third parties for advertising.`,
      ],
    },
    {
      h: '4. Legal basis',
      p: [
        `The main basis for processing is your consent: it is given when you confirm your phone number and accept the Terms, and separately when you allow location, camera and notification access on your device.`,
        `Some data is used to perform the Terms of Use and to meet legal obligations (for example, lawful requests from public authorities). You can withdraw consent at any time — see section 8.`,
      ],
    },
    {
      h: '5. Who sees what',
      p: [
        `In a new order offer, a master sees only the category, problem description, photos and approximate distance. The client's exact address, name and phone number are revealed only after the master accepts the order.`,
        `The client sees the assigned master's name, photo, rating, reviews and location during the order. Passport photos and selfies are never shown to other users — only the Operator's verification staff can see them.`,
        `Ratings and reviews (with a shortened name) are visible to other users. Operator staff access data only as their duties require (support, disputes, verification).`,
      ],
    },
    {
      h: '6. Where and how long we store data',
      p: [
        `In accordance with Article 27-1 of the Law, the Operator collects and stores personal data of citizens of Uzbekistan in databases located in the Republic of Uzbekistan and registers the database in the State Register of Personal Databases.`,
        `Some technical services (cloud infrastructure, maps, notifications) may be located abroad. Cross-border transfers take place only as permitted by law, where the data is adequately protected, and only to the extent necessary.`,
        `Retention: account data — while the account is active; orders, chats and reviews — 3 years after the order is completed (for disputes and warranty); master documents — while the master works on the Platform and 30 days after account deletion; location history — 30 days; technical logs — 12 months. After that, data is deleted or anonymised.`,
      ],
    },
    {
      h: '7. Service providers',
      p: [
        `To run the Platform, some data is shared with providers: an SMS delivery service (phone number), map and routing services (coordinates), a notification service (device token), and cloud database and file storage. Providers use the data only on our instructions and under confidentiality obligations.`,
        `Where required by law, data is disclosed to competent public authorities upon their lawful request.`,
      ],
    },
    {
      h: '8. Your rights',
      p: [
        `You have the right to access your data, correct it, restrict processing, withdraw consent and request deletion of your account and data.`,
        `To do so, write to the in-app support chat or to ${EMAIL} from the phone number linked to your account. We will reply within 10 business days. Data that the law requires us to keep (for example, payment records) is kept until the required period ends.`,
        `You can turn off location, camera and notification access at any time in your phone settings; some app features may then stop working.`,
      ],
    },
    {
      h: '9. Children',
      p: [
        `The Platform is not intended for anyone under 16, and they may not register. If we learn that a child under 16 has provided data, the account and data will be deleted.`,
      ],
    },
    {
      h: '10. Security',
      p: [
        `Data is encrypted in transit (HTTPS/TLS), and database access is restricted by row-level permissions — each user sees only their own data. Masters' documents are kept in private storage.`,
        `No system is perfectly secure. If we detect a data breach, we will take steps to limit harm and notify users and the competent authority as required by law.`,
      ],
    },
    {
      h: '11. Changes and contact',
      p: [
        `If this Policy changes, the new version is published in the app; we give advance notice of material changes.`,
        `Questions about your data: ${EMAIL}. Operator: ${COMPANY}, TIN ${TIN}, ${ADDRESS}.`,
      ],
    },
  ],
};

export const legal: Record<LegalDoc, Record<LegalLang, LegalText>> = {
  terms: { uz: termsUz, ru: termsRu, en: termsEn },
  privacy: { uz: privacyUz, ru: privacyRu, en: privacyEn },
};
