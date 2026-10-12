// Yuklama sinovi: N mijoz + M usta bir vaqtda (brauzer, PWA, Telegram — hammasi bir xil sayt va bir xil Supabase).
// Har foydalanuvchi ilovadagidek ishlaydi (lib/live.ts, lib/masterFeed.ts, lib/around.ts dagi oraliqlar bilan):
//   usta  — onlayn, joylashuv har 5 s, takliflar har 3 s, o'z holati har 60 s; taklif → qabul → yo'l → kod → narx → tugatish
//   mijoz — katalog, atrofdagi ustalar har 20 s, buyurtma → kuzatish har 4 s (faol — 2 s) → narxga rozi → baho; chat
//   server — dispatch / offer-respond (engine.ts), offer-timeout har 15 s (cron)
// Ishga tushirish — supabase/tests/load/run.sh (faqat LOKAL baza; haqiqiy loyihaga tegmaydi).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { dispatchStep, startDueScheduled, stepActiveSearches } from '../../functions/_shared/engine.ts';

const SECRET = Deno.env.get('PGRST_JWT_SECRET') ?? 'super-secret-jwt-token-with-at-least-32-characters-long';
const b64u = (b: Uint8Array | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
async function jwt(payload: Record<string, unknown>) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3 * 3600 }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64u(sig)}`;
}

const PGRST = Deno.env.get('PGRST_URL') ?? 'http://127.0.0.1:54330';
const CLIENTS = Number(Deno.env.get('CLIENTS') ?? 100);
const MASTERS = Number(Deno.env.get('MASTERS') ?? 100);
const DURATION_S = Number(Deno.env.get('DURATION_S') ?? 300);
const RAMP_S = Number(Deno.env.get('RAMP_S') ?? 60);

const T0 = Date.now();
const elapsed = () => (Date.now() - T0) / 1000;
const running = () => elapsed() < DURATION_S;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (ms: number) => ms * (0.8 + Math.random() * 0.4);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const uuid = (kind: 'd' | 'e', n: number) => `00000000-0000-4000-${kind}000-${String(n).padStart(12, '0')}`;
const CATS = ['plumber', 'electric', 'aircon', 'furniture', 'repair', 'appliance'];

// ---------- o'lchovlar ----------
type Stat = { n: number; err: number; ms: number[]; errs: Map<string, number> };
const stats = new Map<string, Stat>();
function record(name: string, ms: number, error?: string) {
  let s = stats.get(name);
  if (!s) stats.set(name, (s = { n: 0, err: 0, ms: [], errs: new Map() }));
  s.n++;
  s.ms.push(ms);
  if (error) {
    s.err++;
    s.errs.set(error, (s.errs.get(error) ?? 0) + 1);
  }
}
const counters: Record<string, number> = {};
let bytesDown = 0;
const count = (k: string, d = 1) => (counters[k] = (counters[k] ?? 0) + d);
const waits = { accept: [] as number[], complete: [] as number[] };
const timeline: { t: number; rps: number; p95: number; errors: number }[] = [];
let windowMs: number[] = [];
let windowErr = 0;

/** PostgREST so'rovi (supabase-js qiladigan HTTP so'rov bilan bir xil) */
async function rest(name: string, token: string, method: string, path: string, body?: unknown, prefer?: string) {
  const t = performance.now();
  let error: string | undefined;
  let data: unknown = null;
  try {
    const res = await fetch(`${PGRST}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    bytesDown += text.length + 350; // + javob sarlavhalari (taxminan)
    data = text ? JSON.parse(text) : null;
    if (!res.ok) error = `${res.status} ${(data as { message?: string })?.message ?? ''}`.slice(0, 90);
  } catch (e) {
    error = `net ${(e as Error).message}`.slice(0, 90);
  }
  const ms = performance.now() - t;
  record(name, ms, error);
  windowMs.push(ms);
  if (error) windowErr++;
  return { data: data as any, error };
}
const rpc = (name: string, token: string, fn: string, args: Record<string, unknown>) => rest(name, token, 'POST', `/rpc/${fn}`, args);

// Edge Function'lar o'rniga — xuddi o'sha kod (engine.ts) service_role bilan, PostgREST orqali
const service = await jwt({ role: 'service_role' });
const db = createClient('http://edge.local', service, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input, init) => fetch(String(input instanceof Request ? input.url : input).replace('http://edge.local/rest/v1', PGRST), init) },
});
async function fn<T>(name: string, f: () => Promise<T>): Promise<T | null> {
  const t = performance.now();
  try {
    const r = await f();
    const bad = r && typeof r === 'object' && 'ok' in r && !(r as { ok: boolean }).ok ? String((r as { error?: string }).error) : undefined;
    record(name, performance.now() - t, bad);
    return r;
  } catch (e) {
    record(name, performance.now() - t, `throw ${(e as Error).message}`.slice(0, 90));
    return null;
  }
}

// ---------- usta ----------
async function master(n: number) {
  await sleep(Math.random() * RAMP_S * 500); // ustalar birinchi yarim ramp ichida chiqadi
  const id = uuid('e', n);
  const tok = await jwt({ role: 'authenticated', sub: id });
  let lat = 41.311 + (Math.random() - 0.5) * 0.12;
  let lng = 69.279 + (Math.random() - 0.5) * 0.16;
  const loc = () => rest('usta: joylashuv (5 s)', tok, 'POST', '/master_locations?on_conflict=master_id', { master_id: id, lat, lng }, 'resolution=merge-duplicates,return=minimal');
  const sync = () => rest('usta: o\'z holati (60 s)', tok, 'GET', `/masters?select=verify_status,balance,rating,jobs_count,activity,priority_points,subscription_until,billing_plan,free_until&id=eq.${id}`);
  await sync();
  await rest('usta: onlayn', tok, 'PATCH', `/masters?id=eq.${id}`, { online: true }, 'return=minimal');
  await loc();
  let nextLoc = Date.now() + 5000;
  let nextSync = Date.now() + 60_000;
  const tick = async () => {
    if (Date.now() >= nextLoc) {
      nextLoc = Date.now() + 5000;
      lat += (Math.random() - 0.5) * 0.0004;
      lng += (Math.random() - 0.5) * 0.0004;
      await loc();
    }
    if (Date.now() >= nextSync) {
      nextSync = Date.now() + 60_000;
      await sync();
    }
  };

  while (running()) {
    await tick();
    const { data } = await rest(
      'usta: takliflar (3 s)',
      tok,
      'GET',
      `/offers?select=order_id,sent_at,expires_at,eta_min,distance_km&master_id=eq.${id}&status=eq.sent&expires_at=gt.${new Date().toISOString()}&order=sent_at.desc&limit=1`,
    );
    const f = data?.[0];
    if (!f) {
      await sleep(jitter(3000));
      continue;
    }
    count('usta: taklif oldi');
    await rpc('usta: taklif ko\'rinishi', tok, 'offer_preview', { p_order: f.order_id });
    await sleep(2000 + Math.random() * 8000); // o'qiydi
    const accept = Math.random() < 0.85;
    const ok = await rest('fn offer-respond: tekshiruv', service, 'GET', `/offers?select=id&order_id=eq.${f.order_id}&master_id=eq.${id}&status=eq.sent`);
    if (!ok.data?.length) {
      count('usta: taklif muddati o\'tib ketgan');
      continue;
    }
    const r = await fn('fn offer-respond', () => dispatchStep(db, f.order_id, { response: { masterId: id, accepted: accept } }));
    if (!accept) {
      count('usta: rad etdi');
      continue;
    }
    if (!r || !r.ok || r.status !== 'on_the_way') {
      count('usta: qabul qila olmadi');
      continue;
    }
    count('usta: qabul qildi');
    await job(id, tok, f.order_id, tick);
  }
  await rest('usta: oflayn', tok, 'PATCH', `/masters?id=eq.${id}`, { online: false }, 'return=minimal');
}

async function job(id: string, tok: string, orderId: string, tick: () => Promise<void>) {
  // ish kartasi (lib/live.ts → offerToJob): 3 ta so'rov
  const o = await rest('usta: ish kartasi', tok, 'GET', `/orders?select=client_id,address,lat,lng,fee_percent&id=eq.${orderId}`);
  const clientId = o.data?.[0]?.client_id;
  await rest('usta: ish kartasi', tok, 'GET', `/profiles?select=name,phone&id=eq.${clientId}`);
  await rest('usta: ish kartasi', tok, 'GET', `/orders?select=entrance,floor,apartment,intercom,landmark&id=eq.${orderId}`);
  const poll = () => rest('usta: ish holati (2 s)', tok, 'GET', `/orders?select=status,price_status,price_work,price_parts,call_fee&id=eq.${orderId}`);
  const chat = () => rest('chat: o\'qish (3 s)', tok, 'GET', `/chat_messages?select=id,sender_id,text,created_at&order_id=eq.${orderId}&order=created_at&limit=300`);
  const wait = async (ms: number) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      await tick();
      const s = await poll();
      if (s.data?.[0]?.status === 'cancelled') return false;
      if (Math.random() < 0.6) await chat();
      await sleep(jitter(2000));
    }
    return true;
  };
  if (!(await wait(10_000 + Math.random() * 10_000))) return count('usta: mijoz bekor qildi');
  await rest('chat: yozish', tok, 'POST', '/chat_messages', { order_id: orderId, sender_id: id, text: 'Yo\'ldaman, 10 daqiqada boraman' }, 'return=minimal');
  await rest('usta: yetib keldim', tok, 'PATCH', `/orders?id=eq.${orderId}`, { status: 'arrived' }, 'return=minimal');
  const code = (await rest('test: eshik kodi', service, 'GET', `/order_secrets?select=door_code&order_id=eq.${orderId}`)).data?.[0]?.door_code;
  await rpc('usta: eshik kodi', tok, 'verify_door_code', { p_order: orderId, p_code: code });
  await rpc('usta: narx yuborish', tok, 'propose_price', { p_order: orderId, p_work: 150000, p_parts: 30000 });
  // mijoz javobini kutadi
  for (let i = 0; i < 60 && running(); i++) {
    await tick();
    const s = (await poll()).data?.[0];
    if (s?.price_status === 'approved') break;
    if (s?.price_status === 'declined' || s?.status === 'cancelled' || s?.status === 'completed') return count('usta: ko\'rik bilan tugadi');
    await sleep(jitter(2000));
  }
  if (!(await wait(10_000 + Math.random() * 10_000))) return;
  const done = await rest('usta: tugatdim', tok, 'PATCH', `/orders?id=eq.${orderId}`, { status: 'completed' }, 'return=minimal');
  if (!done.error) count('usta: ish tugadi');
}

// ---------- mijoz ----------
async function client(n: number) {
  await sleep(RAMP_S * 400 + Math.random() * RAMP_S * 600); // ustalar chiqqandan keyin
  const id = uuid('d', n);
  const tok = await jwt({ role: 'authenticated', sub: id });
  const anon = await jwt({ role: 'anon' });
  const lat = 41.311 + (Math.random() - 0.5) * 0.1;
  const lng = 69.279 + (Math.random() - 0.5) * 0.14;
  // ilova ochildi: katalog (lib/catalog.ts) + atrofdagi ustalar (lib/around.ts)
  await rest('mijoz: katalog', anon, 'GET', '/categories?select=*&order=sort');
  await rest('mijoz: katalog', anon, 'GET', '/problems?select=*&order=sort');
  const around = () => rpc('mijoz: atrofdagi ustalar (20 s)', tok, 'masters_around', { p_lat: lat, p_lng: lng, p_radius_km: 3 });
  await around();
  let nextAround = Date.now() + 20_000;
  // tarix (Buyurtmalar bo'limi) — liveSyncHistory
  await rest('mijoz: tarix', tok, 'GET', `/orders?select=id,category_id,problem_id,master_id,address,status,price_status,price_work,price_parts,call_fee,cancel_reason,cancelled_by,completed_at,updated_at&client_id=eq.${id}&status=in.(completed,cancelled)&order=created_at.desc&limit=50`);

  while (running()) {
    await sleep(jitter(8000)); // muammoni tanlaydi, yozadi
    const cat = pick(CATS);
    const t0 = Date.now();
    const ins = await rest('mijoz: buyurtma yaratish', tok, 'POST', '/orders?select=id', {
      client_id: id, category_id: cat, description: 'LOAD sinov', address: 'LOAD sinov manzili', lat, lng, entrance: '2', floor: '5',
    }, 'return=representation');
    const orderId = ins.data?.[0]?.id as string | undefined;
    if (!orderId) {
      count('mijoz: buyurtma yaratilmadi');
      await sleep(10_000);
      continue;
    }
    count('mijoz: buyurtma');
    await fn('fn dispatch', () => dispatchStep(db, orderId));

    let masterId: string | null = null;
    let accepted = false;
    let codeShown = false;
    let finished = false;
    while (running() && !finished) {
      if (Date.now() >= nextAround && !masterId) {
        nextAround = Date.now() + 20_000;
        await around();
      }
      const { data } = await rest('mijoz: buyurtma holati (4 s / 2 s)', tok, 'GET', `/orders?select=id,status,master_id,dispatch,call_fee,price_status,price_work,price_parts,scheduled_at,lat,lng,cancel_reason,cancelled_by&id=in.(${orderId})`);
      const row = data?.[0];
      if (!row) {
        await sleep(4000);
        continue;
      }
      if (!codeShown) {
        codeShown = true;
        await rpc('mijoz: eshik kodi', tok, 'order_door_code', { p_order: orderId });
      }
      if (row.status === 'searching' && row.dispatch?.done === 'none') {
        count('mijoz: "bo\'sh usta yo\'q"');
        await rest('mijoz: bekor qilish', tok, 'PATCH', `/orders?id=eq.${orderId}`, { status: 'cancelled', cancel_reason: 'LOAD: usta topilmadi' }, 'return=minimal');
        break;
      }
      if (row.master_id && !accepted) {
        accepted = true;
        waits.accept.push((Date.now() - t0) / 1000);
        masterId = row.master_id;
        await rest('mijoz: usta kartasi', tok, 'GET', `/master_cards?select=id,first_name,last_name,experience_years,rating,jobs_count,verified&id=eq.${masterId}`);
        await rest('mijoz: usta kartasi', tok, 'GET', `/profiles?select=phone&id=eq.${masterId}`);
      }
      if (masterId && ['on_the_way', 'assigned', 'arrived'].includes(row.status)) {
        await rest('mijoz: usta joyi', tok, 'GET', `/master_locations?select=lat,lng&master_id=eq.${masterId}`);
        if (Math.random() < 0.3) await rest('chat: o\'qish (3 s)', tok, 'GET', `/chat_messages?select=id,sender_id,text,created_at&order_id=eq.${orderId}&order=created_at&limit=300`);
        if (Math.random() < 0.05) await rest('chat: yozish', tok, 'POST', '/chat_messages', { order_id: orderId, sender_id: id, text: 'Podyezd kodi 1234' }, 'return=minimal');
      }
      if (row.price_status === 'proposed') {
        await sleep(1000 + Math.random() * 3000);
        await rpc('mijoz: narxga javob', tok, 'respond_price', { p_order: orderId, p_approve: Math.random() < 0.9 });
      }
      if (row.status === 'completed') {
        waits.complete.push((Date.now() - t0) / 1000);
        count('mijoz: ish tugadi');
        await rest('mijoz: baho', tok, 'POST', '/reviews', { order_id: orderId, client_id: id, master_id: masterId, stars: 5, tags: ['tez'], comment: 'LOAD' }, 'return=minimal');
        finished = true;
        break;
      }
      if (row.status === 'cancelled') break;
      const hot = ['on_the_way', 'arrived', 'in_progress'].includes(row.status);
      await sleep(jitter(hot ? 2000 : 4000));
    }
    await sleep(jitter(15_000)); // keyingi buyurtmagacha
  }
}

// ---------- server: offer-timeout har 15 s (pg_cron) ----------
const cronRuns: { ms: number; stepped: number }[] = [];
async function cron() {
  while (running()) {
    await sleep(15_000);
    const t = performance.now();
    let stepped = 0;
    try {
      await startDueScheduled(db);
      stepped = (await stepActiveSearches(db, Number(Deno.env.get('CRON_CONCURRENCY') ?? 8))).stepped;
      await db.from('offers').update({ status: 'expired', responded_at: new Date().toISOString() }).eq('status', 'sent').lt('expires_at', new Date(Date.now() - 30_000).toISOString());
      await db.rpc('free_pass_reminders');
      await db.rpc('presence_reminders');
    } catch (e) {
      count(`cron xato: ${(e as Error).message}`.slice(0, 60));
    }
    const ms = performance.now() - t;
    cronRuns.push({ ms, stepped });
    record('cron offer-timeout (15 s)', ms);
  }
}

// ---------- har 10 s: tezlik ----------
const q = (a: number[], p: number) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const ticker = setInterval(() => {
  timeline.push({ t: Math.round(elapsed()), rps: Math.round(windowMs.length / 10), p95: Math.round(q(windowMs, 95)), errors: windowErr });
  console.error(`[${Math.round(elapsed())} s] ${Math.round(windowMs.length / 10)} so'rov/s, p95 ${Math.round(q(windowMs, 95))} ms, xato ${windowErr}`);
  windowMs = [];
  windowErr = 0;
}, 10_000);

await Promise.all([
  ...Array.from({ length: MASTERS }, (_, i) => master(i + 1)),
  ...Array.from({ length: CLIENTS }, (_, i) => client(i + 1)),
  cron(),
]);
clearInterval(ticker);

const report = {
  config: { clients: CLIENTS, masters: MASTERS, durationS: DURATION_S },
  egressMB: Math.round(bytesDown / 1e5) / 10,
  endpoints: [...stats.entries()]
    .map(([name, s]) => ({ name, n: s.n, err: s.err, p50: Math.round(q(s.ms, 50)), p95: Math.round(q(s.ms, 95)), p99: Math.round(q(s.ms, 99)), max: Math.round(Math.max(...s.ms)), errs: Object.fromEntries(s.errs) }))
    .sort((a, b) => b.p95 - a.p95),
  counters,
  acceptS: { n: waits.accept.length, p50: q(waits.accept, 50), p95: q(waits.accept, 95) },
  completeS: { n: waits.complete.length, p50: q(waits.complete, 50), p95: q(waits.complete, 95) },
  cron: { runs: cronRuns.length, maxMs: Math.round(Math.max(0, ...cronRuns.map((c) => c.ms))), maxStepped: Math.max(0, ...cronRuns.map((c) => c.stepped)) },
  timeline,
};
console.log(JSON.stringify(report, null, 1));
Deno.exit(0);
