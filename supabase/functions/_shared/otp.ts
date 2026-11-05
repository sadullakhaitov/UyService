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

export type OtpResult = 'telegram' | 'sms' | 'screen' | 'no_channel';

/**
 * Kod raqam egasi tasdiqlangan yo'l bilan ketdi (Telegram/SMS). Raqam ilgari ekrandagi kod bilan ochilgan bo'lsa,
 * hisobning boshqa sessiyalari o'chiriladi — raqamni oldindan egallagan begona chiqib ketadi (…_security_audit_3.sql).
 * Xato kirishni to'xtatmaydi.
 */
export async function ownerVerified(db: SupabaseClient, digits: string) {
  try {
    const { error } = await db.rpc('otp_owner_verified', { p_phone: digits });
    if (error) console.error('otp_owner_verified', error.message);
  } catch (e) {
    console.error('otp_owner_verified', (e as Error).message);
  }
}

/**
 * Kodni yuboradi. sms — SMS yuboruvchi (Eskiz) yoki null (ulanmagan). Telegram yubora olmasa (bot bloklangan,
 * tarmoq) — SMS'ga o'tadi. SMS xatosi tashqariga chiqadi.
 * screen — VAQTINCHA (Eskiz paketi olinguncha): SMS ulanmagan bo'lsa kod otp_screen'ga yoziladi, ilova ekranda
 * ko'rsatadi (admin raqamiga — yo'q, no_channel).
 */
export async function deliverOtp(
  db: SupabaseClient,
  opts: {
    userId: string;
    digits: string;
    otp: string;
    botToken?: string | null;
    sms: ((digits: string, otp: string) => Promise<void>) | null;
    screen?: boolean;
  },
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
        if (res.ok) {
          await ownerVerified(db, opts.digits);
          return 'telegram';
        }
        console.error('telegram send', res.status, await res.text().catch(() => ''));
      } catch (e) {
        console.error('telegram send', (e as Error).message);
      }
    }
  }
  if (!opts.sms) {
    if (!opts.screen) return 'no_channel';
    // p_user — kod so'ralgan hisob: boshqa raqamli (raqam almashtirish) yoki avval kirgan bo'lsa — ekranda emas
    const { data, error } = await db.rpc('otp_screen_put', { p_phone: opts.digits, p_code: opts.otp, p_user: opts.userId || null });
    if (error) throw new Error(`otp_screen_put: ${error.message}`);
    return data === true ? 'screen' : 'no_channel';
  }
  await opts.sms(opts.digits, opts.otp);
  await ownerVerified(db, opts.digits);
  return 'sms';
}
