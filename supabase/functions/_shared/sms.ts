// Eskiz.uz SMS (send-sms — kirish kodi, free-pass-send — bepul davr kodi).
// Sirlar: ESKIZ_EMAIL, ESKIZ_PASSWORD, ESKIZ_FROM (ixtiyoriy). Matnlar Eskiz'da oldindan tasdiqlangan bo'lishi shart.
const ESKIZ = Deno.env.get('ESKIZ_API') || 'https://notify.eskiz.uz/api'; // ESKIZ_API — faqat sinov uchun
let cachedToken: string | null = null; // Eskiz tokeni 30 kun amal qiladi — funksiya "issiq" turganda qayta ishlatiladi

async function eskizLogin(): Promise<string> {
  const form = new FormData();
  form.append('email', Deno.env.get('ESKIZ_EMAIL') ?? '');
  form.append('password', Deno.env.get('ESKIZ_PASSWORD') ?? '');
  const res = await fetch(`${ESKIZ}/auth/login`, { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  const token = body?.data?.token as string | undefined;
  if (!res.ok || !token) throw new Error(`Eskiz login: ${res.status} ${body?.message ?? ''}`);
  cachedToken = token;
  return token;
}

export async function eskizSend(phone: string, message: string, retry = true): Promise<void> {
  const token = cachedToken ?? (await eskizLogin());
  const form = new FormData();
  form.append('mobile_phone', phone);
  form.append('message', message);
  form.append('from', Deno.env.get('ESKIZ_FROM') || '4546');
  const res = await fetch(`${ESKIZ}/message/sms/send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (res.status === 401 && retry) {
    cachedToken = null; // token eskirgan — qayta kiramiz
    return eskizSend(phone, message, false);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.status === 'error') throw new Error(`Eskiz send: ${res.status} ${JSON.stringify(body)}`);
}

/** Eskiz ulanganmi (ESKIZ_EMAIL sirida) */
export const smsConfigured = () => Boolean(Deno.env.get('ESKIZ_EMAIL'));
