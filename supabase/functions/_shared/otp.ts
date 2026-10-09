// Kirish kodini yetkazish (send-sms hook ishlatadi): avval Telegram (@uyservice_bot, bepul), keyin SMS.
// Telegram faqat raqam egasi ekani tasdiqlangan akkauntga ketadi:
//   - profil Telegram orqali kirgan (profiles.telegram_id — telegram-auth bog'lagan), raqami shu raqam, yoki
//   - odam botga o'z raqamini ulashgan (telegram_contacts — faqat o'zining kontakti, telegram-bot tekshiradi).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const TG_TEXT: Record<string, string> = {
  uz: "🔐 <b>UyService</b> kirish kodi: <code>{code}</code>\n\nKodni hech kimga bermang — UyService xodimlari uni hech qachon so'ramaydi.",
  ru: '🔐 Код входа <b>UyService</b>: <code>{code}</code>\n\nНикому не сообщайте код — сотрудники UyService его никогда не спрашивают.',
  en: '🔐 <b>UyService</b> sign-in code: <code>{code}</code>\n\nDo not share it — UyService staff will never ask for it.',
};

export const otpText = (lang: string, otp: string) => (TG_TEXT[lang] ?? TG_TEXT.uz).replace('{code}', otp);

/** Shu raqam egasining Telegram chati (digits — "998XXXXXXXXX") yoki null */
export async function telegramFor(db: SupabaseClient, userId: string, digits: string): Promise<{ chat: number; lang: string } | null> {
  const { data: p } = await db.from('profiles').select('telegram_id, language, phone').eq('id', userId).maybeSingle();
  // Profil raqami boshqa bo'lsa (raqam almashtirilmoqda) — eski raqamning Telegram'iga yubormaymiz
  const same = !p?.phone || String(p.phone).replace(/\D/g, '') === digits;
  if (p?.telegram_id && same) return { chat: Number(p.telegram_id), lang: p.language ?? 'uz' };
  const { data: c } = await db
    .from('telegram_contacts')
    .select('telegram_id')
    .in('phone', [digits, `+${digits}`])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return c?.telegram_id ? { chat: Number(c.telegram_id), lang: p?.language ?? 'uz' } : null;
}

export type OtpResult = 'telegram' | 'sms' | 'no_channel';

/**
 * Kodni yuboradi. sms — SMS yuboruvchi (Eskiz) yoki null (ulanmagan). Telegram yubora olmasa (bot bloklangan,
 * tarmoq) — SMS'ga o'tadi. SMS xatosi tashqariga chiqadi.
 */
export async function deliverOtp(
  db: SupabaseClient,
  opts: { userId: string; digits: string; otp: string; botToken?: string | null; sms: ((digits: string, otp: string) => Promise<void>) | null },
  f: typeof fetch = fetch,
): Promise<OtpResult> {
  if (opts.botToken) {
    let tg: { chat: number; lang: string } | null = null;
    try {
      tg = await telegramFor(db, opts.userId, opts.digits);
    } catch (e) {
      console.error('telegramFor', (e as Error).message);
    }
    if (tg) {
      try {
        const res = await f(`https://api.telegram.org/bot${opts.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: tg.chat, text: otpText(tg.lang, opts.otp), parse_mode: 'HTML', protect_content: true }),
        });
        if (res.ok) return 'telegram';
        console.error('telegram send', res.status, await res.text().catch(() => ''));
      } catch (e) {
        console.error('telegram send', (e as Error).message);
      }
    }
  }
  if (!opts.sms) return 'no_channel';
  await opts.sms(opts.digits, opts.otp);
  return 'sms';
}
