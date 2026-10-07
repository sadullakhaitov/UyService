// POST /functions/v1/push-send — push_outbox navbatini Expo Push API orqali yuboradi.
// Navbatga yozilganda baza o'zi chaqiradi (migrations/*_push.sql → configure_push, pg_net); zaxira — offer-timeout.
// Ruxsat: `x-cron-secret: <CRON_SECRET>` yoki `Authorization: Bearer <service_role key>`.
import { adminClient, corsHeaders, isCronRequest, json } from '../_shared/http.ts';
import { flushPush } from '../_shared/push.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!isCronRequest(req)) return json({ error: 'unauthorized' }, 401);
  try {
    return json({ ok: true, ...(await flushPush(adminClient())) });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});
