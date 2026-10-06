// POST /functions/v1/offer-respond  { order_id, accept: boolean }
// Usta yangi buyurtmaga javob beradi (app/master/offer.tsx). Qabul — usta tayinlanadi (on_the_way), aktivlik +2;
// rad — aktivlik −5 va taklif darhol keyingi ustaga ketadi.
import { dispatchStep } from '../_shared/engine.ts';
import { adminClient, corsHeaders, json, readJson, requestUserId } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const db = adminClient();
  const masterId = await requestUserId(db, req);
  if (!masterId) return json({ error: 'unauthorized' }, 401);

  const body = await readJson<{ order_id: string; accept: boolean }>(req);
  if (!body.order_id || typeof body.accept !== 'boolean') return json({ error: 'order_id va accept kerak' }, 400);

  // Shu ustaga ochiq taklif bormi
  const { data: offer } = await db
    .from('offers')
    .select('id')
    .eq('order_id', body.order_id)
    .eq('master_id', masterId)
    .eq('status', 'sent')
    .maybeSingle();
  if (!offer) return json({ ok: false, error: 'offer_not_active' }, 409);

  try {
    const r = await dispatchStep(db, body.order_id, { response: { masterId, accepted: body.accept } });
    if (!r.ok) return json(r, 409);
    return json({ ok: true, status: r.status, accepted: body.accept && r.status === 'on_the_way' });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});
