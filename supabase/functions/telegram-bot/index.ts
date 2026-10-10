// POST /functions/v1/telegram-bot — bot webhook'i (Telegram chaqiradi).
//   /start            → salom va "Ilovani ochish" tugmasi (Mini App: uyservice.uz) + "Raqamni ulashish" (kirish kodi shu yerga keladi)
//   kontakt ulashildi → raqam telegram_contacts'ga yoziladi (faqat o'zining kontakti): telegram-auth shu bilan kiritadi,
//                       send-sms kirish kodini SMS o'rniga shu chatga yuboradi
//   joylashuv (bitta yoki jonli, edited_message — jonli yangilanishi) → ustaning joylashuvi: Telegram yig'ilgan bo'lsa ham
//                       ishda qoladi (fon rejimi, _shared/presence.ts); /start live — qanday ulashish
//   «⏸ Ishni tugatish» → usta ishdan chiqadi
// Sirlar: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (setWebhook'dagi secret_token bilan bir xil), APP_URL (ixtiyoriy).
import { adminClient, json } from '../_shared/http.ts';
import { presenceKeyboard, saveTelegramLocation, stopWorking, STOP_BTN, type TgLocation } from '../_shared/presence.ts';

const TEXT = {
  uz: {
    notMaster: "Joylashuv faqat ustalar uchun kerak. Usta chaqirish uchun ilovani oching.",
    offline: "Joylashuv saqlandi, lekin siz hozir ishda emassiz. Ilovani oching va «ishga chiqish»ni suring.",
    saved: "✅ Joylashuv yangilandi — ishdasiz. Telegram yopiq bo'lsa ham buyurtma shu yerga xabar bo'lib keladi (45 daqiqa).\n\nHar safar yubormaslik uchun: 📎 → Joylashuv → «Jonli joylashuvni ulashish» — joylashuv o'zi yangilanib turadi.",
    liveOn: (time: string) => `✅ Jonli joylashuv ulandi — ${time} gacha Telegram yopiq bo'lsa ham buyurtmalar keladi.`,
    liveHelp: "Telegram'ni yopsangiz ham buyurtma olish uchun joylashuvingizni shu chatga yuboring:\n\n• Eng qulayi — jonli joylashuv: 📎 → Joylashuv → «Jonli joylashuvni ulashish» → 8 soat. Yursangiz ham o'zi yangilanadi.\n• Yoki pastdagi «📍 Joylashuvni yuborish» — 45 daqiqa amal qiladi.",
    stopped: "⏸ Ishdan chiqdingiz — yangi buyurtma kelmaydi. Qayta boshlash uchun ilovani oching.",
    busy: "Sizda faol ish bor — avval uni ilovada tugating.",
    hello: "Assalomu alaykum! UyService — uyga usta chaqirish: santexnik, elektrik, konditsioner va boshqalar.\n\nPastdagi tugma bilan ilovani oching.",
    open: 'Ilovani ochish',
    thanks: "Rahmat! Raqamingiz tasdiqlandi — endi kirish kodi shu yerga keladi. Ilovaga qayting.",
    share: "Kirish kodini SMS o'rniga shu yerda olish uchun raqamingizni ulashing 👇",
    shareBtn: '📱 Raqamni ulashish',
    notOwn: "Iltimos, o'zingizning raqamingizni ulashing.",
  },
  ru: {
    notMaster: 'Геопозиция нужна только мастерам. Чтобы вызвать мастера, откройте приложение.',
    offline: 'Геопозиция сохранена, но вы сейчас не на линии. Откройте приложение и сдвиньте «Выйти на линию».',
    saved: '✅ Геопозиция обновлена — вы на линии. Даже если Telegram свёрнут, заказ придёт сюда сообщением (45 минут).\n\nЧтобы не отправлять каждый раз: 📎 → Геопозиция → «Транслировать геопозицию» — она будет обновляться сама.',
    liveOn: (time: string) => `✅ Трансляция геопозиции включена — до ${time} заказы будут приходить, даже если Telegram свёрнут.`,
    liveHelp: 'Чтобы получать заказы со свёрнутым Telegram, отправьте геопозицию в этот чат:\n\n• Удобнее всего — трансляция: 📎 → Геопозиция → «Транслировать геопозицию» → 8 часов. Обновляется сама, даже в пути.\n• Или кнопка «📍 Отправить геопозицию» ниже — действует 45 минут.',
    stopped: '⏸ Вы ушли с линии — новые заказы не придут. Чтобы начать снова, откройте приложение.',
    busy: 'У вас есть активный заказ — сначала завершите его в приложении.',
    hello: 'Здравствуйте! UyService — вызов мастера на дом: сантехник, электрик, кондиционеры и другое.\n\nОткройте приложение кнопкой ниже.',
    open: 'Открыть приложение',
    thanks: 'Спасибо! Номер подтверждён — теперь код входа будет приходить сюда. Вернитесь в приложение.',
    share: 'Чтобы получать код входа здесь вместо SMS, поделитесь номером 👇',
    shareBtn: '📱 Поделиться номером',
    notOwn: 'Пожалуйста, поделитесь своим номером.',
  },
  en: {
    notMaster: 'Location is only needed for handymen. To call a handyman, open the app.',
    offline: "Location saved, but you're not online right now. Open the app and swipe «Go online».",
    saved: "✅ Location updated — you're online. Even with Telegram minimized, orders will arrive here as messages (45 minutes).\n\nTo avoid sending it every time: 📎 → Location → «Share live location» — it updates by itself.",
    liveOn: (time: string) => `✅ Live location is on — until ${time} orders will arrive even with Telegram minimized.`,
    liveHelp: 'To get orders with Telegram minimized, send your location to this chat:\n\n• Best — live location: 📎 → Location → «Share live location» → 8 hours. Updates by itself, even on the move.\n• Or the «📍 Send my location» button below — valid for 45 minutes.',
    stopped: "⏸ You're offline — no new orders. To start again, open the app.",
    busy: 'You have an active job — finish it in the app first.',
    hello: 'Hello! UyService — call a handyman home: plumber, electrician, air conditioning and more.\n\nOpen the app with the button below.',
    open: 'Open the app',
    thanks: 'Thanks! Your number is confirmed — sign-in codes will now arrive here. Go back to the app.',
    share: 'To get your sign-in code here instead of SMS, share your number 👇',
    shareBtn: '📱 Share my number',
    notOwn: 'Please share your own number.',
  },
};
type Lang = keyof typeof TEXT;

async function send(bot: string, chatId: number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  }).catch((e) => console.error('sendMessage', e));
}

Deno.serve(async (req) => {
  const bot = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? '';
  // Faqat Telegram'dan (setWebhook secret_token sarlavhasi)
  if (!bot || !secret || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== secret) return json({ error: 'unauthorized' }, 401);
  type Msg = {
    chat: { id: number };
    date?: number;
    from?: { id: number; language_code?: string };
    text?: string;
    contact?: { phone_number: string; user_id?: number };
    location?: TgLocation;
  };
  const update = (await req.json().catch(() => ({}))) as { message?: Msg; edited_message?: Msg };
  // Jonli joylashuvning yangilanishi — jim saqlanadi (javob yozilmaydi)
  const ed = update.edited_message;
  if (ed?.location && ed.from && ed.chat.id === ed.from.id) {
    await saveTelegramLocation(adminClient(), ed.from.id, ed.location, (ed.date ?? 0) * 1000, true).catch((e) => console.error('live', e));
    return json({ ok: true });
  }
  const msg = update.message;
  if (!msg) return json({ ok: true });
  const code = msg.from?.language_code ?? '';
  const lang: Lang = code.startsWith('ru') ? 'ru' : code.startsWith('en') ? 'en' : 'uz';
  const T = TEXT[lang];
  const appUrl = Deno.env.get('APP_URL') ?? 'https://uyservice.uz';

  if (msg.contact) {
    if (!msg.from || msg.contact.user_id !== msg.from.id) {
      await send(bot, msg.chat.id, T.notOwn);
      return json({ ok: true });
    }
    const { error } = await adminClient()
      .from('telegram_contacts')
      .upsert({ telegram_id: msg.from.id, phone: msg.contact.phone_number, created_at: new Date().toISOString() });
    if (error) console.error('telegram_contacts', error.message);
    await send(bot, msg.chat.id, T.thanks, { reply_markup: { remove_keyboard: true } });
    await send(bot, msg.chat.id, T.open, { reply_markup: { inline_keyboard: [[{ text: T.open, web_app: { url: appUrl } }]] } });
    return json({ ok: true });
  }
  // Joylashuv (faqat shaxsiy chatda — guruhdan emas)
  if (msg.location && msg.from && msg.chat.id === msg.from.id) {
    const r = await saveTelegramLocation(adminClient(), msg.from.id, msg.location, (msg.date ?? 0) * 1000, false).catch((e) => {
      console.error('location', e);
      return null;
    });
    const open = { inline_keyboard: [[{ text: T.open, web_app: { url: `${appUrl}/master` } }]] };
    if (!r || r.kind === 'not_master') await send(bot, msg.chat.id, T.notMaster, { reply_markup: { remove_keyboard: true } });
    else if (!r.online) await send(bot, msg.chat.id, T.offline, { reply_markup: open });
    else if (r.liveUntil) {
      const time = new Date(r.liveUntil).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });
      await send(bot, msg.chat.id, T.liveOn(time), { reply_markup: { remove_keyboard: true } });
    } else await send(bot, msg.chat.id, T.saved, { reply_markup: { remove_keyboard: true } });
    return json({ ok: true });
  }
  if (msg.from && (msg.text === STOP_BTN.uz || msg.text === STOP_BTN.ru || msg.text === STOP_BTN.en)) {
    const r = await stopWorking(adminClient(), msg.from.id).catch(() => 'not_master' as const);
    await send(bot, msg.chat.id, r === 'busy' ? T.busy : r === 'ok' ? T.stopped : T.notMaster, { reply_markup: { remove_keyboard: true } });
    if (r === 'ok') await send(bot, msg.chat.id, T.open, { reply_markup: { inline_keyboard: [[{ text: T.open, web_app: { url: `${appUrl}/master` } }]] } });
    return json({ ok: true });
  }
  if (msg.text === '/start live') {
    await send(bot, msg.chat.id, T.liveHelp, { reply_markup: presenceKeyboard(lang) });
    return json({ ok: true });
  }
  if (msg.text?.startsWith('/start')) {
    await send(bot, msg.chat.id, T.hello, { reply_markup: { inline_keyboard: [[{ text: T.open, web_app: { url: appUrl } }]] } });
    await send(bot, msg.chat.id, T.share, {
      reply_markup: { keyboard: [[{ text: T.shareBtn, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
    });
  }
  return json({ ok: true });
});
