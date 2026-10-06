// POST /functions/v1/offer-timeout — pg_cron har 15 s chaqiradi (migrations/*_cron.sql → schedule_offer_timeout).
// 1) rejalashtirilgan buyurtmalar: vaqtidan 30 daqiqa oldin qidiruv boshlanadi
// 2) qidiruvdagi har bir buyurtma uchun bitta qadam: 60 s javobsiz taklif yopiladi (aktivlik −5),
//    keyingi usta / radius kengaytirish / 3 daqiqadan keyin "bo'sh usta yo'q"
// 3) yetim qolgan eski takliflar yopiladi
// Ruxsat: `x-cron-secret: <CRON_SECRET>` yoki `Authorization: Bearer <service_role key>`.
import { activeSearches, dispatchStep, startDueScheduled } from '../_shared/engine.ts';
import { adminClient, corsHeaders, json } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const allowed = (cronSecret && req.headers.get('x-cron-secret') === cronSecret) || (serviceKey && bearer === serviceKey);
  if (!allowed) return json({ error: 'unauthorized' }, 401);

  const db = adminClient();
  const result = { scheduled: 0, stepped: 0, changed: 0, errors: 0 };
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
    return json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message ?? e), ...result }, 500);
  }
});
