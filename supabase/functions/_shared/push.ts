// Push-bildirishnomalar navbatini (push_outbox) yuborish:
//   - telefon ilovasi bor (Expo push tokeni) → Expo Push API
//   - tokeni yo'q, lekin Telegram bilan kirgan → Telegram bot xabari + "Ochish" tugmasi (Mini App'da shu ekran)
// push-send (darhol, navbatga yozilganda) va offer-timeout (zaxira, har 15 s) chaqiradi.
// Matnlar — ilovadagi locales/{uz,ru,en}.json → notify.* bilan bir xil (ilova yopiq bo'lsa ham to'g'ri tilda).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Lang = 'uz' | 'ru' | 'en';
type Params = Record<string, string | number | boolean | null | undefined>;
type Text = { title: string; body: string };

const CATEGORIES: Record<Lang, Record<string, string>> = {
  uz: { plumber: 'Santexnik', electric: 'Elektrik', aircon: 'Konditsioner', furniture: 'Mebel', repair: "Ta'mirlash", appliance: 'Maishiy texnika' },
  ru: { plumber: 'Сантехник', electric: 'Электрик', aircon: 'Кондиционер', furniture: 'Мебель', repair: 'Ремонт', appliance: 'Бытовая техника' },
  en: { plumber: 'Plumber', electric: 'Electrician', aircon: 'Air conditioning', furniture: 'Furniture', repair: 'Renovation', appliance: 'Appliances' },
};

const sum = (n: unknown, lang: Lang) =>
  `${Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/ |,/g, ' ')} ${lang === 'ru' ? 'сум' : lang === 'en' ? 'UZS' : "so'm"}`;

const TEXTS: Record<Lang, Record<string, (p: Params, l: Lang) => Text>> = {
  uz: {
    offer: (p, l) => ({ title: 'Yangi buyurtma', body: `${CATEGORIES[l][String(p.category)] ?? ''} · ~${p.min ?? '?'} daq. 60 soniya ichida javob bering` }),
    found: (p) => ({ title: 'Usta topildi', body: `${p.name || 'Usta'} yo'lga chiqdi, ~${p.min} daqiqada yetib keladi` }),
    arrived: (p, l) => ({ title: 'Usta yetib keldi', body: `${CATEGORIES[l][String(p.category)] ?? 'Usta'} eshigingiz oldida` }),
    price: (p, l) => ({ title: 'Usta narx taklif qildi', body: `${sum(p.sum, l)}. Ko'rib chiqing: rozi bo'lsangiz ish boshlanadi` }),
    // Chek: jami summa (naqd), kafolat; sum bo'lmasa (eski navbat) — oddiy matn
    done: (p, l) => ({
      title: 'Ish tugadi',
      body: p.sum == null ? 'Ustani baholang — bu boshqalarga yordam beradi'
        : p.inspection ? `Faqat ko'rik: ${sum(p.sum, l)} naqd. Ustani baholang`
        : `Jami: ${sum(p.sum, l)} naqd. Kafolat 30 kun. Ustani baholang`,
    }),
    absent: () => ({ title: 'Usta sizni topa olmadi', body: "Usta keldi, lekin eshik ochilmadi — buyurtma yopildi. Xato bo'lsa, yordam chatiga yozing" }),
    requeued: () => ({ title: 'Usta bekor qildi', body: 'Qayta chaqirish shart emas — yangi usta qidirilmoqda' }),
    none: () => ({ title: "Hozir bo'sh usta yo'q", body: "Barcha yaqin ustalar band. Bir necha daqiqadan keyin qayta urinib ko'ring." }),
    cancelled: () => ({ title: 'Buyurtma bekor qilindi', body: "Mijoz buyurtmani bekor qildi. Yangi buyurtmalarni kutishingiz mumkin" }),
    priceApproved: () => ({ title: 'Mijoz narxga rozi', body: 'Ishni boshlashingiz mumkin' }),
    inviteBonus: (p, l) => ({ title: "Do'stingiz uchun bonus", body: `${p.name || "Do'stingiz"} 5 ta ishni bajardi — balansingizga ${sum(p.sum, l)}` }),
    freeEnding: (p) => ({ title: 'Bepul davr tugayapti', body: `${p.days} kun qoldi. Keyin tanlagan tarifingiz bo'yicha ishlaysiz — "Pul" bo'limida tekshiring` }),
    freeEnded: () => ({ title: 'Bepul davr tugadi', body: 'Endi tanlagan tarifingiz amal qiladi. "Pul" bo\'limida balans va tarifni tekshiring' }),
    priceDeclined: (p, l) => ({ title: "Mijoz narxga rozi bo'lmadi", body: `Faqat chaqiruv to'lanadi: ${sum(p.fee, l)}` }),
  },
  ru: {
    offer: (p, l) => ({ title: 'Новый заказ', body: `${CATEGORIES[l][String(p.category)] ?? ''} · ~${p.min ?? '?'} мин. Ответьте в течение 60 секунд` }),
    found: (p) => ({ title: 'Мастер найден', body: `${p.name || 'Мастер'} выехал, будет через ~${p.min} мин` }),
    arrived: (p, l) => ({ title: 'Мастер на месте', body: `${CATEGORIES[l][String(p.category)] ?? 'Мастер'} у вашей двери` }),
    price: (p, l) => ({ title: 'Мастер предложил цену', body: `${sum(p.sum, l)}. Посмотрите: если согласны, работа начнётся` }),
    done: (p, l) => ({
      title: 'Работа завершена',
      body: p.sum == null ? 'Оцените мастера — это поможет другим'
        : p.inspection ? `Только осмотр: ${sum(p.sum, l)} наличными. Оцените мастера`
        : `Итого: ${sum(p.sum, l)} наличными. Гарантия 30 дней. Оцените мастера`,
    }),
    absent: () => ({ title: 'Мастер не смог вас найти', body: 'Мастер приехал, но дверь не открыли — заказ закрыт. Если это ошибка, напишите в поддержку' }),
    requeued: () => ({ title: 'Мастер отменил заказ', body: 'Ничего делать не нужно — ищем другого мастера' }),
    none: () => ({ title: 'Сейчас нет свободных мастеров', body: 'Все мастера поблизости заняты. Попробуйте снова через несколько минут.' }),
    cancelled: () => ({ title: 'Заказ отменён', body: 'Клиент отменил заказ. Можно ждать новые заказы' }),
    priceApproved: () => ({ title: 'Клиент согласен с ценой', body: 'Можно начинать работу' }),
    inviteBonus: (p, l) => ({ title: 'Бонус за друга', body: `${p.name || 'Ваш друг'} выполнил 5 заказов — на баланс ${sum(p.sum, l)}` }),
    freeEnding: (p) => ({ title: 'Бесплатный период заканчивается', body: `Осталось дней: ${p.days}. Затем действует выбранный тариф — проверьте раздел «Деньги»` }),
    freeEnded: () => ({ title: 'Бесплатный период закончился', body: 'Теперь действует выбранный тариф. Проверьте баланс и тариф в разделе «Деньги»' }),
    priceDeclined: (p, l) => ({ title: 'Клиент не согласился с ценой', body: `Оплачивается только вызов: ${sum(p.fee, l)}` }),
  },
  en: {
    offer: (p, l) => ({ title: 'New order', body: `${CATEGORIES[l][String(p.category)] ?? ''} · ~${p.min ?? '?'} min. Reply within 60 seconds` }),
    found: (p) => ({ title: 'Handyman found', body: `${p.name || 'Your handyman'} is on the way, ~${p.min} min` }),
    arrived: (p, l) => ({ title: 'Handyman has arrived', body: `${CATEGORIES[l][String(p.category)] ?? 'Handyman'} is at your door` }),
    price: (p, l) => ({ title: 'The master proposed a price', body: `${sum(p.sum, l)}. Take a look: work starts once you agree` }),
    done: (p, l) => ({
      title: 'The job is done',
      body: p.sum == null ? 'Rate the master — it helps others'
        : p.inspection ? `Inspection only: ${sum(p.sum, l)} in cash. Rate the master`
        : `Total: ${sum(p.sum, l)} in cash. 30-day warranty. Rate the master`,
    }),
    absent: () => ({ title: "The handyman couldn't reach you", body: 'The handyman arrived but nobody opened the door — the order is closed. If this is a mistake, write to support' }),
    requeued: () => ({ title: 'The handyman cancelled', body: "No need to call again — we're finding another handyman" }),
    none: () => ({ title: 'No free handymen right now', body: 'Everyone nearby is busy. Please try again in a few minutes.' }),
    cancelled: () => ({ title: 'Order cancelled', body: 'The client cancelled the order. New orders will keep coming' }),
    priceApproved: () => ({ title: 'The client agreed to the price', body: 'You can start the job' }),
    inviteBonus: (p, l) => ({ title: 'Bonus for your friend', body: `${p.name || 'Your friend'} completed 5 jobs — ${sum(p.sum, l)} added to your balance` }),
    freeEnding: (p) => ({ title: 'Your free period is ending', body: `${p.days} day(s) left. Then your chosen plan applies — check the Money tab` }),
    freeEnded: () => ({ title: 'Your free period has ended', body: 'Your chosen plan now applies. Check your balance and plan in the Money tab' }),
    priceDeclined: (p, l) => ({ title: 'The client declined the price', body: `Only the call-out fee is paid: ${sum(p.fee, l)}` }),
  },
};

export function pushText(kind: string, params: Params, language: string | null): Text | null {
  const lang: Lang = language === 'ru' || language === 'en' ? language : 'uz';
  const f = TEXTS[lang][kind];
  return f ? f(params ?? {}, lang) : null;
}

type Row = { id: number; kind: string; params: Params; url: string | null; token: string | null; language: string | null; telegram_id: number | null };
type Ticket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';
const OPEN: Record<Lang, string> = { uz: 'Ochish', ru: 'Открыть', en: 'Open' };

export type PushOptions = { telegramToken?: string; appUrl?: string };
/** Sirlar: TELEGRAM_BOT_TOKEN (bot orqali yuborish uchun), APP_URL (ixtiyoriy, "Ochish" tugmasi manzili) */
export const pushOptionsFromEnv = (): PushOptions => ({
  telegramToken: Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '',
  appUrl: Deno.env.get('APP_URL') ?? 'https://uyservice.uz',
});

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

type Result = { ok: number[]; bad: number[]; dead: string[]; lastError: string | null };

/** Telegram bot orqali: har biriga alohida xabar (sarlavha qalin) va "Ochish" — Mini App kerakli ekranda ochiladi */
async function sendTelegram(rows: Row[], opts: PushOptions, fetchImpl: typeof fetch, out: Result) {
  const appUrl = (opts.appUrl || 'https://uyservice.uz').replace(/\/$/, '');
  for (const r of rows) {
    const lang: Lang = r.language === 'ru' || r.language === 'en' ? r.language : 'uz';
    const text = pushText(r.kind, r.params, lang) ?? { title: 'UyService', body: '' };
    const body = {
      chat_id: r.telegram_id,
      text: `<b>${esc(text.title)}</b>\n${esc(text.body)}`,
      parse_mode: 'HTML',
      ...(r.url ? { reply_markup: { inline_keyboard: [[{ text: OPEN[lang], web_app: { url: appUrl + r.url } }]] } } : {}),
    };
    try {
      const res = await fetchImpl(`https://api.telegram.org/bot${opts.telegramToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) out.ok.push(r.id);
      else if (res.status === 400 || res.status === 403) {
        // botni bloklagan / botni hech ochmagan — qayta urinishdan foyda yo'q
        out.ok.push(r.id);
        console.warn('telegram', res.status, (await res.text().catch(() => '')).slice(0, 200));
      } else {
        out.bad.push(r.id); // 429 (juda tez) yoki Telegram ishlamayapti — keyinroq qayta
        out.lastError = `Telegram HTTP ${res.status}`;
      }
    } catch (e) {
      out.bad.push(r.id);
      out.lastError = String((e as Error).message ?? e);
    }
  }
}

/** Navbatdagi hamma xabarni yuboradi; nechtasi ketganini qaytaradi */
export async function flushPush(
  db: SupabaseClient,
  fetchImpl: typeof fetch = fetch,
  opts: PushOptions = pushOptionsFromEnv(),
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let round = 0; round < 5; round++) {
    const { data, error } = await db.rpc('claim_push', { p_limit: 100 });
    if (error) throw new Error(`claim_push: ${error.message}`);
    const all = (data ?? []) as Row[];
    if (!all.length) break;

    const out: Result = { ok: [], bad: [], dead: [], lastError: null };
    const rows = all.filter((r) => r.token);
    const tg = all.filter((r) => !r.token && r.telegram_id);
    if (opts.telegramToken) await sendTelegram(tg, opts, fetchImpl, out);
    else out.ok.push(...tg.map((r) => r.id)); // bot sozlanmagan — yuboradigan yo'l yo'q
    const { ok, bad, dead } = out;
    let lastError = out.lastError;
    const messages = rows.map((r) => {
      const text = pushText(r.kind, r.params, r.language) ?? { title: 'UyService', body: '' };
      return {
        to: r.token as string,
        title: text.title,
        body: text.body,
        sound: 'default',
        priority: 'high',
        // Android: ilovadagi kanal (lib/notify.ts → 'orders'); bosilganda shu ekran ochiladi (useNotificationTaps)
        channelId: 'orders',
        data: r.url ? { url: r.url } : {},
        ttl: r.kind === 'offer' ? 60 : 3600,
      };
    });
    if (rows.length) try {
      const res = await fetchImpl(EXPO_PUSH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
      const body = (await res.json().catch(() => ({}))) as { data?: Ticket[]; errors?: { message: string }[] };
      if (!res.ok || !Array.isArray(body.data)) {
        lastError = body.errors?.[0]?.message ?? `HTTP ${res.status}`;
        bad.push(...rows.map((r) => r.id));
      } else {
        body.data.forEach((ticket, i) => {
          const row = rows[i];
          if (!row) return;
          if (ticket.status === 'ok') ok.push(row.id);
          else if (ticket.details?.error === 'DeviceNotRegistered') {
            // ilova o'chirilgan — qayta urinmaymiz, token tozalanadi
            ok.push(row.id);
            dead.push(row.token as string);
          } else {
            lastError = ticket.message ?? ticket.details?.error ?? 'error';
            bad.push(row.id);
          }
        });
      }
    } catch (e) {
      lastError = String((e as Error).message ?? e);
      bad.push(...rows.map((r) => r.id));
    }
    const { error: finErr } = await db.rpc('finish_push', { p_sent: ok, p_failed: bad, p_error: lastError, p_dead: dead });
    if (finErr) console.error('finish_push', finErr.message);
    sent += ok.length;
    failed += bad.length;
    if (bad.length) break; // Expo javob bermayapti — keyingi chaqiruvda qayta urinamiz
  }
  return { sent, failed };
}
