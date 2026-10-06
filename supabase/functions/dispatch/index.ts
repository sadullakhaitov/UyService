// POST /functions/v1/dispatch  { order_id, restart? }
// Mijoz buyurtma yaratgandan keyin chaqiradi (lib/api.ts → createOrder) — birinchi ustaga taklif yuboriladi.
// restart: true — "Hozir bo'sh usta yo'q" → "Qayta urinish" (qidiruv boshidan).
// Keyingi qadamlarni offer-timeout (har 15 s) va offer-respond (usta javobi) bajaradi.
import { dispatchStep } from '../_shared/engine.ts';
import { adminClient, corsHeaders, isAdmin, json, readJson, requestUserId } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const db = adminClient();
  const userId = await requestUserId(db, req);
  if (!userId) return json({ error: 'unauthorized' }, 401);

  const body = await readJson<{ order_id: string; restart: boolean }>(req);
  if (!body.order_id) return json({ error: 'order_id kerak' }, 400);

  const { data: order } = await db.from('orders').select('client_id, status, dispatch').eq('id', body.order_id).maybeSingle();
  if (!order) return json({ error: 'not_found' }, 404);
  if (order.client_id !== userId && !(await isAdmin(db, userId))) return json({ error: 'forbidden' }, 403);

  // Qayta boshlash faqat qidiruv "topilmadi" bilan tugaganda
  const restart = Boolean(body.restart) && order.status === 'searching' && order.dispatch?.done === 'none';

  try {
    const r = await dispatchStep(db, body.order_id, { restart });
    return r.ok ? json(r) : json(r, r.error === 'not_found' ? 404 : 409);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});
