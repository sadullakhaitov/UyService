// Telefon raqam + SMS kod bilan kirish.
// Supabase sozlangan bo'lsa — Supabase Auth (SMS'ni Eskiz.uz yuboradi: supabase/functions/send-sms),
// aks holda soxta rejim: istalgan 6 xonali kod qabul qilinadi.
import { unregisterPush } from './push';
import { getSupabase } from './supabase';

export type AuthResult = { ok: boolean; error?: string };
/** Kod yuborilmadi: raqamning Telegram'i noma'lum va SMS hali ulanmagan (send-sms → "no_channel") */
// Supabase hook xabarini o'zgartirib yuborishi mumkin ("Unexpected status code returned from hook: 422") — 422 ham shu
export const noChannel = (r: AuthResult) => !r.ok && /no_channel|hook: 422/.test(r.error ?? '');

/** "+998 90 123 45 67" → "+998901234567" (E.164) */
function toE164(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `+${digits.startsWith('998') ? digits : `998${digits}`}`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendCode(phone: string): Promise<AuthResult> {
  const db = getSupabase();
  if (!db) {
    await wait(400);
    return { ok: true };
  }
  try {
    const { error } = await db.auth.signInWithOtp({ phone: toE164(phone) });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function verifyCode(phone: string, code: string): Promise<AuthResult> {
  const db = getSupabase();
  if (!db) {
    await wait(300);
    return /^\d{6}$/.test(code) ? { ok: true } : { ok: false, error: 'invalid_code' };
  }
  try {
    const { data, error } = await db.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' });
    if (error || !data.session) return { ok: false, error: error?.message ?? 'invalid_code' };
    void db.rpc('otp_screen_done').then(undefined, () => {}); // ekrandagi kod ishlatildi — o'chiriladi
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * VAQTINCHA (Eskiz SMS paketi olinguncha): Telegram'i noma'lum raqamga kod SMS o'rniga ekranda chiqadi —
 * send-sms uni otp_screen'ga yozadi (…_otp_on_screen.sql). Kod yo'q bo'lsa (bot yoki SMS orqali ketgan) — null.
 */
export async function screenCode(phone: string): Promise<string | null> {
  const db = getSupabase();
  if (!db) return null;
  try {
    const { data } = await db.rpc('otp_screen_code', { p_phone: toE164(phone) });
    return typeof data === 'string' && data ? data : null;
  } catch {
    return null;
  }
}

export async function signOut() {
  await unregisterPush();
  await getSupabase()?.auth.signOut();
}
