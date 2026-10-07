// POST /functions/v1/telegram-bot — bot webhook'i (Telegram chaqiradi).
//   /start            → salom va "Ilovani ochish" tugmasi (Mini App: uyservice.uz)
//   kontakt ulashildi → raqam telegram_contacts'ga yoziladi (faqat o'zining kontakti), telegram-auth shu bilan kiritadi
// Sirlar: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET (setWebhook'dagi secret_token bilan bir xil), APP_URL (ixtiyoriy).
import { adminClient, json } from '../_shared/http.ts';

const TEXT = {
  uz: {
    hello: "Assalomu alaykum! UyService — uyga usta chaqirish: santexnik, elektrik, konditsioner va boshqalar.\n\nPastdagi tugma bilan ilovani oching.",
    open: 'Ilovani ochish',
    thanks: "Rahmat! Raqamingiz tasdiqlandi — ilovaga qayting.",
    notOwn: "Iltimos, o'zingizning raqamingizni ulashing.",
  },
  ru: {
    hello: 'Здравствуйте! UyService — вызов мастера на дом: сантехник, электрик, кондиционеры и другое.\n\nОткройте приложение кнопкой ниже.',
    open: 'Открыть приложение',
    thanks: 'Спасибо! Номер подтверждён — вернитесь в приложение.',
    notOwn: 'Пожалуйста, поделитесь своим номером.',
  },
  en: {
    hello: 'Hello! UyService — call a handyman home: plumber, electrician, air conditioning and more.\n\nOpen the app with the button below.',
    open: 'Open the app',
    thanks: 'Thanks! Your number is confirmed — go back to the app.',
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
  const update = (await req.json().catch(() => ({}))) as {
    message?: { chat: { id: number }; from?: { id: number; language_code?: string }; text?: string; contact?: { phone_number: string; user_id?: number } };
  };
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
    await send(bot, msg.chat.id, T.thanks, { reply_markup: { inline_keyboard: [[{ text: T.open, web_app: { url: appUrl } }]] } });
    return json({ ok: true });
  }
  if (msg.text?.startsWith('/start')) {
    await send(bot, msg.chat.id, T.hello, { reply_markup: { inline_keyboard: [[{ text: T.open, web_app: { url: appUrl } }]] } });
  }
  return json({ ok: true });
});
