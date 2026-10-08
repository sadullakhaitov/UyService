// Yo'l bo'yicha yetib kelish vaqti (functions/_shared/eta.ts): OSRM "table" javobi, xato va o'chirilgan holat
import { estimateEtaMin } from '../../functions/_shared/dispatch.ts';
import { roadEta } from '../../functions/_shared/eta.ts';

const client = { latitude: 41.311, longitude: 69.279 };
const near = { latitude: 41.315, longitude: 69.285 };
const far = { latitude: 41.35, longitude: 69.33 };
function assertEquals(a: unknown, b: unknown) {
  if (a !== b) throw new Error(`${String(a)} !== ${String(b)}`);
}
const env = (vals: Record<string, string> = {}) => (k: string) => vals[k];

Deno.test('OSRM javobi — daqiqaga aylantiriladi, eng yaqinlar birinchi so\'raladi', async () => {
  let url = '';
  const fake = (async (u: string | URL | Request) => {
    url = String(u);
    // tartib: near (0), far (1) → manzil
    return new Response(JSON.stringify({ code: 'Ok', durations: [[420], [1500]] }));
  }) as typeof fetch;
  const eta = await roadEta(client, [far, near], fake, env());
  assertEquals(eta(near, client), 7);
  assertEquals(eta(far, client), 25);
  assertEquals(url.includes(`${near.longitude},${near.latitude};${far.longitude},${far.latitude};${client.longitude},${client.latitude}`), true);
  assertEquals(url.includes('sources=0;1&destinations=2'), true);
});

Deno.test('xizmat ishlamasa yoki o\'chirilgan bo\'lsa — taxminiy vaqt', async () => {
  const down = (async () => new Response('err', { status: 502 })) as typeof fetch;
  const eta = await roadEta(client, [near], down, env());
  assertEquals(eta(near, client), estimateEtaMin(near, client));
  let called = false;
  const spy = (async () => {
    called = true;
    return new Response('{}');
  }) as typeof fetch;
  const off = await roadEta(client, [near], spy, env({ DISPATCH_ROUTING: 'off' }));
  assertEquals(called, false);
  assertEquals(off(near, client), estimateEtaMin(near, client));
});
