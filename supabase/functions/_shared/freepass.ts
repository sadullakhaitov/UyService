// Bepul davr kodini ustaga yetkazish (free-pass-send): avval Telegram (@uyservice_bot, bepul), bo'lmasa — Eskiz SMS.
// Telegram faqat raqam egasi ekani tasdiqlangan akkauntga ketadi (otp.ts dagidek):
//   - shu raqamli profil Telegram orqali kirgan (profiles.telegram_id), yoki
//   - odam botga o'z raqamini ulashgan (telegram_contacts).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Lang = 'uz' | 'ru' | 'en';
export type FreePassResult = 'telegram' | 'sms' | 'no_channel' | 'not_pending';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
};

const TG: Record<Lang, (code: string, days: number, until: string) => string> = {
  uz: (c, d, u) =>
    `🎁 <b>UyService</b>: sizga <b>${d} kunlik bepul ishlash</b> kodi\n\n<code>${c}</code>\n\n` +
    `Shu davrda platforma sizdan hech qanday ulush olmaydi — komissiya ham, obuna ham.\n\n` +
    `Qanday ishlatiladi: ilovada usta sifatida kiring, pasportingizni yuklang va <b>Profil → Promokod</b> bo'limiga kodni kiriting. ` +
    `Kod faqat shu raqam uchun, ${u} gacha kiritish kerak.`,
  ru: (c, d, u) =>
    `🎁 <b>UyService</b>: код на <b>${d} дней бесплатной работы</b>\n\n<code>${c}</code>\n\n` +
    `В этот период платформа не берёт с вас ничего — ни комиссии, ни подписки.\n\n` +
    `Как использовать: войдите в приложение как мастер, загрузите паспорт и введите код в разделе <b>Профиль → Промокод</b>. ` +
    `Код только для этого номера, ввести до ${u}.`,
  en: (c, d, u) =>
    `🎁 <b>UyService</b>: your code for <b>${d} days of free work</b>\n\n<code>${c}</code>\n\n` +
    `During this period the platform takes nothing from you — no commission, no subscription.\n\n` +
    `How to use: sign in as a master, upload your passport and enter the code in <b>Profile → Promo code</b>. ` +
    `The code is for this number only; enter it before ${u}.`,
};
const OPEN: Record<Lang, string> = { uz: 'Ochish', ru: 'Открыть', en: 'Open' };

/** SMS matni (Eskiz'da tasdiqlangan shablonga mos bo'lishi kerak): FREE_SMS_TEMPLATE, {code} {days} {date} */
export const freeSmsText = (template: string | undefined, code: string, days: number, until: string) =>
  (template || "UyService: {days} kunlik bepul ishlash kodi: {code}. Ilovada Profil > Promokod bo'limiga kiriting. {date} gacha.")
    .replace('{code}', code)
    .replace('{days}', String(days))
    .replace('{date}', until);

/** Shu raqam egasining Telegram chati (digits — "998XXXXXXXXX") */
export async function telegramByPhone(db: SupabaseClient, digits: string): Promise<{ chat: number; lang: Lang } | null> {
  const { data: p } = await db
    .from('profiles')
    .select('telegram_id, language')
    .eq('phone', `+${digits}`)
    .is('deleted_at', null)
    .maybeSingle();
  const lang = (p?.language === 'ru' || p?.language === 'en' ? p.language : 'uz') as Lang;
  if (p?.telegram_id) return { chat: Number(p.telegram_id), lang };
  const { data: c } = await db
    .from('telegram_contacts')
    .select('telegram_id')
    .in('phone', [digits, `+${digits}`])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return c?.telegram_id ? { chat: Number(c.telegram_id), lang } : null;
}

export async function deliverFreePass(
  db: SupabaseClient,
  opts: { code: string; botToken?: string | null; appUrl?: string; sms: ((digits: string, text: string) => Promise<void>) | null; smsTemplate?: string },
  f: typeof fetch = fetch,
): Promise<FreePassResult> {
  const { data: fp, error } = await db
    .from('free_passes')
    .select('code, phone, days, redeem_by, redeemed_at, revoked_at')
    .eq('code', opts.code)
    .maybeSingle();
  if (error) throw new Error(`free_passes: ${error.message}`);
  if (!fp || fp.redeemed_at || fp.revoked_at || Date.parse(fp.redeem_by) < Date.now()) return 'not_pending';
  const digits = String(fp.phone).replace(/\D/g, '');
  let via: FreePassResult = 'no_channel';

  if (opts.botToken) {
    const tg = await telegramByPhone(db, digits).catch((e) => (console.error('telegramByPhone', e), null));
    if (tg) {
      const appUrl = (opts.appUrl || 'https://uyservice.uz').replace(/\/$/, '');
      try {
        const res = await f(`https://api.telegram.org/bot${opts.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tg.chat,
            text: TG[tg.lang](fp.code, fp.days, fmtDate(fp.redeem_by)),
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: OPEN[tg.lang], web_app: { url: `${appUrl}/master/promo?code=${fp.code}` } }]] },
          }),
        });
        if (res.ok) via = 'telegram';
        else console.error('telegram send', res.status, await res.text().catch(() => ''));
      } catch (e) {
        console.error('telegram send', (e as Error).message);
      }
    }
  }
  if (via === 'no_channel' && opts.sms) {
    await opts.sms(digits, freeSmsText(opts.smsTemplate, fp.code, fp.days, fmtDate(fp.redeem_by)));
    via = 'sms';
  }
  if (via === 'telegram' || via === 'sms') {
    await db.from('free_passes').update({ sent_via: via, sent_at: new Date().toISOString() }).eq('code', fp.code);
  }
  return via;
}
