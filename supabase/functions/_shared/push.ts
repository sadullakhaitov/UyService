// Push-bildirishnomalar navbatini (push_outbox) Expo Push API orqali yuborish.
// push-send (darhol, navbatga yozilganda) va offer-timeout (zaxira, har 15 s) chaqiradi.
// Matnlar — ilovadagi locales/{uz,ru,en}.json → notify.* bilan bir xil (ilova yopiq bo'lsa ham to'g'ri tilda).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Lang = 'uz' | 'ru' | 'en';
type Params = Record<string, string | number | null | undefined>;
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
    done: () => ({ title: 'Ish tugadi', body: "Ustani baholang — bu boshqalarga yordam beradi" }),
    none: () => ({ title: "Hozir bo'sh usta yo'q", body: "Barcha yaqin ustalar band. Bir necha daqiqadan keyin qayta urinib ko'ring." }),
    cancelled: () => ({ title: 'Buyurtma bekor qilindi', body: "Mijoz buyurtmani bekor qildi. Yangi buyurtmalarni kutishingiz mumkin" }),
    priceApproved: () => ({ title: 'Mijoz narxga rozi', body: 'Ishni boshlashingiz mumkin' }),
    priceDeclined: (p, l) => ({ title: "Mijoz narxga rozi bo'lmadi", body: `Faqat chaqiruv to'lanadi: ${sum(p.fee, l)}` }),
  },
  ru: {
    offer: (p, l) => ({ title: 'Новый заказ', body: `${CATEGORIES[l][String(p.category)] ?? ''} · ~${p.min ?? '?'} мин. Ответьте в течение 60 секунд` }),
    found: (p) => ({ title: 'Мастер найден', body: `${p.name || 'Мастер'} выехал, будет через ~${p.min} мин` }),
    arrived: (p, l) => ({ title: 'Мастер на месте', body: `${CATEGORIES[l][String(p.category)] ?? 'Мастер'} у вашей двери` }),
    price: (p, l) => ({ title: 'Мастер предложил цену', body: `${sum(p.sum, l)}. Посмотрите: если согласны, работа начнётся` }),
    done: () => ({ title: 'Работа завершена', body: 'Оцените мастера — это поможет другим' }),
    none: () => ({ title: 'Сейчас нет свободных мастеров', body: 'Все мастера поблизости заняты. Попробуйте снова через несколько минут.' }),
    cancelled: () => ({ title: 'Заказ отменён', body: 'Клиент отменил заказ. Можно ждать новые заказы' }),
    priceApproved: () => ({ title: 'Клиент согласен с ценой', body: 'Можно начинать работу' }),
    priceDeclined: (p, l) => ({ title: 'Клиент не согласился с ценой', body: `Оплачивается только вызов: ${sum(p.fee, l)}` }),
  },
  en: {
    offer: (p, l) => ({ title: 'New order', body: `${CATEGORIES[l][String(p.category)] ?? ''} · ~${p.min ?? '?'} min. Reply within 60 seconds` }),
    found: (p) => ({ title: 'Handyman found', body: `${p.name || 'Your handyman'} is on the way, ~${p.min} min` }),
    arrived: (p, l) => ({ title: 'Handyman has arrived', body: `${CATEGORIES[l][String(p.category)] ?? 'Handyman'} is at your door` }),
    price: (p, l) => ({ title: 'The master proposed a price', body: `${sum(p.sum, l)}. Take a look: work starts once you agree` }),
    done: () => ({ title: 'The job is done', body: 'Rate the master — it helps others' }),
    none: () => ({ title: 'No free handymen right now', body: 'Everyone nearby is busy. Please try again in a few minutes.' }),
    cancelled: () => ({ title: 'Order cancelled', body: 'The client cancelled the order. New orders will keep coming' }),
    priceApproved: () => ({ title: 'The client agreed to the price', body: 'You can start the job' }),
    priceDeclined: (p, l) => ({ title: 'The client declined the price', body: `Only the call-out fee is paid: ${sum(p.fee, l)}` }),
  },
};

export function pushText(kind: string, params: Params, language: string | null): Text | null {
  const lang: Lang = language === 'ru' || language === 'en' ? language : 'uz';
  const f = TEXTS[lang][kind];
  return f ? f(params ?? {}, lang) : null;
}

type Row = { id: number; kind: string; params: Params; url: string | null; token: string; language: string | null };
type Ticket = { status: 'ok' | 'error'; message?: string; details?: { error?: string } };

const EXPO_PUSH = 'https://exp.host/--/api/v2/push/send';

/** Navbatdagi hamma xabarni yuboradi; nechtasi ketganini qaytaradi */
export async function flushPush(db: SupabaseClient, fetchImpl: typeof fetch = fetch): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let round = 0; round < 5; round++) {
    const { data, error } = await db.rpc('claim_push', { p_limit: 100 });
    if (error) throw new Error(`claim_push: ${error.message}`);
    const rows = (data ?? []) as Row[];
    if (!rows.length) break;

    const ok: number[] = [];
    const bad: number[] = [];
    const dead: string[] = [];
    let lastError: string | null = null;
    const messages = rows.map((r) => {
      const text = pushText(r.kind, r.params, r.language) ?? { title: 'UyService', body: '' };
      return {
        to: r.token,
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
    try {
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
            dead.push(row.token);
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
