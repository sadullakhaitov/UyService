// POST /functions/v1/offer-timeout — pg_cron har 15 s chaqiradi (migrations/*_cron.sql → schedule_offer_timeout).
// 1) rejalashtirilgan buyurtmalar: vaqtidan 30 daqiqa oldin qidiruv boshlanadi
// 2) qidiruvdagi har bir buyurtma uchun bitta qadam: 60 s javobsiz taklif yopiladi (aktivlik −5),
//    keyingi usta / radius kengaytirish / 3 daqiqadan keyin "bo'sh usta yo'q"
// 3) yetim qolgan eski takliflar yopiladi
// 4) push-bildirishnomalar navbati (zaxira yo'l — odatda push-send darhol yuboradi)
// Ruxsat: `x-cron-secret: <CRON_SECRET>` yoki `Authorization: Bearer <service_role key>`.
import { activeSearches, dispatchStep, startDueScheduled } from '../_shared/engine.ts';
import { adminClient, corsHeaders, isCronRequest, json } from '../_shared/http.ts';
import { flushPush } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!isCronRequest(req)) return json({ error: 'unauthorized' }, 401);

  const db = adminClient();
  const result = { scheduled: 0, stepped: 0, changed: 0, errors: 0, pushed: 0 };
  try {
    result.scheduled = (await startDueScheduled(db)).length;
    for (const id of await activeSearches(db)) {
      result.stepped++;
      try {
        const r = await dispatchStep(db, id);
        if (r.ok && r.changed) result.changed++;
        if (!r.ok) result.errors++;
      } catch (e) {
        result.errors++;
        console.error(id, e);
      }
    }
    // Buyurtmasi qidiruvda bo'lmagan, muddati o'tgan takliflar
    await db
      .from('offers')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('status', 'sent')
      .lt('expires_at', new Date(Date.now() - 30_000).toISOString());
    try {
      result.pushed = (await flushPush(db)).sent;
    } catch (e) {
      console.error('push', e);
    }
    return json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message ?? e), ...result }, 500);
  }
});
