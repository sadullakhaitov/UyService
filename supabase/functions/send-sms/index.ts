// Supabase Auth → "Send SMS hook": tasdiqlash kodini yuboradi.
// 1) Raqam egasining Telegram'i ma'lum bo'lsa — @uyservice_bot xabari (bepul, darhol). Telegram ma'lum:
//    - profil Telegram orqali kirgan (profiles.telegram_id — telegram-auth bog'lagan), yoki
//    - odam botga o'z raqamini ulashgan (telegram_contacts — faqat o'zining kontakti, telegram-bot tekshiradi).
// 2) Aks holda (yoki Telegram yubora olmasa) — Eskiz.uz SMS. Ikkalasi ham bo'lmasa — xato "no_channel"
//    (ilova: "Botga kirib raqamingizni ulashing").
// Dashboard → Authentication → Hooks → Send SMS hook → HTTPS → https://<PROJECT_REF>.supabase.co/functions/v1/send-sms
// Sirlar (npx supabase secrets set ...):
//   SEND_SMS_HOOK_SECRET — hook yaratilganda Dashboard beradigan "v1,whsec_..." qiymat
//   TELEGRAM_BOT_TOKEN — bot (Telegram orqali kod uchun; allaqachon sozlangan)
//   ESKIZ_EMAIL, ESKIZ_PASSWORD — my.eskiz.uz kabinetidagi login (ixtiyoriy — bo'lmasa faqat Telegram)
//   ESKIZ_FROM — jo'natuvchi nomi (ixtiyoriy, standart '4546')
//   SMS_TEMPLATE — matn (ixtiyoriy, standart "UyService kodi: {code}"). Eskiz'da oldindan tasdiqlangan bo'lishi shart!
import { Webhook } from 'npm:standardwebhooks@1.0.0';
import { adminClient } from '../_shared/http.ts';
import { deliverOtp } from '../_shared/otp.ts';

const ESKIZ = Deno.env.get('ESKIZ_API') || 'https://notify.eskiz.uz/api'; // ESKIZ_API — faqat sinov uchun
let cachedToken: string | null = null; // Eskiz tokeni 30 kun amal qiladi — funksiya "issiq" turganda qayta ishlatiladi

type HookPayload = { user: { id: string; phone?: string }; sms: { otp: string } };

function hookError(status: number, message: string) {
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

async function eskizSend(phone: string, message: string, retry = true): Promise<void> {
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return hookError(405, 'method_not_allowed');

  const secret = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace('v1,whsec_', '');
  if (!secret) return hookError(500, 'SEND_SMS_HOOK_SECRET o\'rnatilmagan');

  // Imzo tekshiruvi (Standard Webhooks) — so'rov haqiqatan Supabase Auth'dan kelganini bildiradi
  const payload = await req.text();
  let data: HookPayload;
  try {
    data = new Webhook(secret).verify(payload, Object.fromEntries(req.headers)) as HookPayload;
  } catch (e) {
    // Ko'pincha: SEND_SMS_HOOK_SECRET Dashboard'dagi hook siri bilan bir xil emas
    console.error('send-sms: imzo noto\'g\'ri (SEND_SMS_HOOK_SECRET hook siriga mos emas)', (e as Error).message);
    return hookError(401, `invalid signature: ${(e as Error).message}`);
  }

  const phone = (data.user?.phone ?? '').replace(/\D/g, ''); // Eskiz: faqat raqamlar, 998XXXXXXXXX
  const otp = data.sms?.otp;
  if (!/^998\d{9}$/.test(phone) || !otp) {
    console.warn('send-sms: raqam O\'zbekistonniki emas', phone.slice(0, 5));
    return hookError(400, 'Faqat O\'zbekiston raqamlari (+998)');
  }

  const sms = Deno.env.get('ESKIZ_EMAIL')
    ? (to: string, code: string) => eskizSend(to, (Deno.env.get('SMS_TEMPLATE') || 'UyService kodi: {code}').replace('{code}', code))
    : null; // Eskiz hali ulanmagan — faqat Telegram
  try {
    const via = await deliverOtp(adminClient(), { userId: data.user?.id ?? '', digits: phone, otp, botToken: Deno.env.get('TELEGRAM_BOT_TOKEN'), sms });
    console.log(`send-sms: ${via}`, `…${phone.slice(-4)}`);
    if (via === 'no_channel') return hookError(422, 'no_channel'); // ilova: "Botga kirib raqamingizni ulashing"
  } catch (e) {
    console.error(e);
    return hookError(502, 'SMS yuborilmadi');
  }
  return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
});
