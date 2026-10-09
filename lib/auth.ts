// Telefon raqam + SMS kod bilan kirish.
// Supabase sozlangan bo'lsa — Supabase Auth (SMS'ni Eskiz.uz yuboradi: supabase/functions/send-sms),
// aks holda soxta rejim: istalgan 6 xonali kod qabul qilinadi.
import { unregisterPush } from './push';
import { getSupabase } from './supabase';

export type AuthResult = { ok: boolean; error?: string };
/** Kod yuborilmadi: raqamning Telegram'i noma'lum va SMS hali ulanmagan (send-sms → "no_channel") */
export const noChannel = (r: AuthResult) => !r.ok && Boolean(r.error?.includes('no_channel'));

/** "+998 90 123 45 67" → "+998901234567" (E.164) */
export function toE164(phone: string) {
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
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function signOut() {
  await unregisterPush();
  await getSupabase()?.auth.signOut();
}
