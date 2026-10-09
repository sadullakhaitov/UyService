// POST /functions/v1/free-pass-send  { code } — admin yaratgan bepul davr kodini ustaga yuboradi:
// Telegram (@uyservice_bot — raqam egasi botda bo'lsa) yoki Eskiz SMS. Ikkalasi bo'lmasa — { via: 'no_channel' }
// (admin panel kodni nusxalab o'zingiz yuborishni taklif qiladi). Faqat admin chaqira oladi.
// Sirlar: TELEGRAM_BOT_TOKEN, APP_URL (ixtiyoriy), ESKIZ_* (ixtiyoriy), FREE_SMS_TEMPLATE (ixtiyoriy, Eskiz'da tasdiqlangan matn)
import { deliverFreePass } from '../_shared/freepass.ts';
import { adminClient, corsHeaders, isAdmin, json, readJson, requestUserId } from '../_shared/http.ts';
import { eskizSend, smsConfigured } from '../_shared/sms.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const db = adminClient();
  const uid = await requestUserId(db, req);
  if (!uid || !(await isAdmin(db, uid))) return json({ error: 'forbidden' }, 403);

  const { code } = await readJson<{ code: string }>(req);
  const c = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6,20}$/.test(c)) return json({ error: 'bad_code' }, 400);

  try {
    const via = await deliverFreePass(db, {
      code: c,
      botToken: Deno.env.get('TELEGRAM_BOT_TOKEN'),
      appUrl: Deno.env.get('APP_URL'),
      sms: smsConfigured() ? (to, text) => eskizSend(to, text) : null,
      smsTemplate: Deno.env.get('FREE_SMS_TEMPLATE'),
    });
    console.log('free-pass-send', via, c.slice(0, 4));
    if (via === 'not_pending') return json({ error: 'not_pending' }, 409);
    return json({ ok: true, via });
  } catch (e) {
    console.error(e);
    return json({ error: 'send_failed' }, 502);
  }
});
