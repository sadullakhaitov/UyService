// E2E: fon rejimi — bot chatidagi joylashuv (bitta va jonli) ustaning joylashuvi bo'ladi, «Ishni tugatish»,
// "Hali ishdamisiz?" Telegram'da «📍 Joylashuvni yuborish» tugmasi bilan boradi (presence.ts, push.ts)
import { flushPush } from '../../functions/_shared/push.ts';
import { LIVE_MAX_MS, saveTelegramLocation, stopWorking } from '../../functions/_shared/presence.ts';
import { check, db, proxy } from './harness.ts';

const M1 = '00000000-0000-4000-b000-000000000001';
const C = '00000000-0000-4000-b000-00000000000a';
await db.from('profiles').update({ telegram_id: 9001, language: 'uz' }).eq('id', M1);
await db.from('profiles').update({ telegram_id: 9002 }).eq('id', C);

const loc = async () => (await db.from('master_locations').select('lat, lng, updated_at').eq('master_id', M1).single()).data!;
const master = async () => (await db.from('masters').select('online, live_until, busy').eq('id', M1).single()).data!;

// 1) Begona Telegram (mijoz yoki noma'lum) — usta joylashuvi o'zgarmaydi
let r = await saveTelegramLocation(db, 9002, { latitude: 41.3, longitude: 69.3 }, Date.now(), false);
check(r.kind === 'not_master', 'mijozning joylashuvi — usta emas', r);
r = await saveTelegramLocation(db, 12345, { latitude: 41.3, longitude: 69.3 }, Date.now(), false);
check(r.kind === 'not_master', 'noma’lum Telegram — usta emas', r);
r = await saveTelegramLocation(db, 9001, { latitude: 999, longitude: 69.3 }, Date.now(), false);
check(r.kind === 'not_master' && (await loc()).lat === 41.276, 'noto‘g‘ri koordinata — e’tiborsiz', r);

// 2) Bitta joylashuv — usta joyi yangilanadi, jonli emas
r = await saveTelegramLocation(db, 9001, { latitude: 41.281, longitude: 69.211 }, Date.now(), false);
const l1 = await loc();
check(r.kind === 'saved' && r.online && r.liveUntil === null && l1.lat === 41.281 && l1.lng === 69.211, 'joylashuv saqlandi (ishda)', { r, l1 });
check((await master()).live_until === null, 'oddiy joylashuv — jonli muddat yo‘q');

// 3) Jonli joylashuv 1 soat → live_until; yangilanishi (edited) — joy o'zgaradi; "to'xtatguncha" — 12 soat bilan cheklangan
const sent = Date.now() - 60_000;
r = await saveTelegramLocation(db, 9001, { latitude: 41.282, longitude: 69.212, live_period: 3600 }, sent, false);
let until = Date.parse((await master()).live_until!);
check(r.kind === 'saved' && Math.abs(until - (sent + 3600_000)) < 2000, 'jonli joylashuv — 1 soat (yuborilgan paytdan)', { r, until });
await saveTelegramLocation(db, 9001, { latitude: 41.29, longitude: 69.22, live_period: 3600 }, sent, true);
check((await loc()).lat === 41.29, 'jonli yangilanish — usta yurdi, joyi yangilandi');
await saveTelegramLocation(db, 9001, { latitude: 41.29, longitude: 69.22, live_period: 0x7fffffff }, Date.now(), false);
until = Date.parse((await master()).live_until!);
check(until <= Date.now() + LIVE_MAX_MS + 2000 && until > Date.now() + LIVE_MAX_MS - 60_000, '"to‘xtatguncha" — 12 soat bilan cheklangan', until);
// to'xtatildi: oxirgi yangilanish live_period'siz
await saveTelegramLocation(db, 9001, { latitude: 41.29, longitude: 69.22 }, sent, true);
check(Date.parse((await master()).live_until!) <= Date.now() + 1000, 'jonli joylashuv to‘xtatildi — muddat tugadi');

// 4) Taqsimlash: fon rejimida (joylashuv 10 daqiqa oldin) usta nomzod
const { data: near } = await db.rpc('nearby_masters', { p_lat: 41.29, p_lng: 69.22, p_radius_km: 3, p_category: 'plumber' });
check(Array.isArray(near) && near.some((n: { id: string }) => n.id === M1), 'botdan kelgan joylashuv bilan usta taklif oladi', near);

// 5) "Hali ishdamisiz?" — Telegram'da bitta bosishda joylashuv yuboradigan tugma bilan
await db.from('push_outbox').delete().neq('id', 0);
await db.from('push_outbox').insert({ user_id: M1, kind: 'stillWorking', params: {}, url: '/master' });
type Body = { chat_id: number; text: string; reply_markup?: { keyboard?: { text: string; request_location?: boolean }[][]; inline_keyboard?: unknown } };
const calls: Body[] = [];
const fakeTg = (async (_u: string | URL | Request, init?: RequestInit) => {
  calls.push(JSON.parse(String(init?.body)));
  return new Response('{"ok":true}', { status: 200 });
}) as typeof fetch;
const out = await flushPush(db, fakeTg, { telegramToken: 'BOT', appUrl: 'https://uyservice.uz' });
const kb = calls[0]?.reply_markup?.keyboard;
check(
  out.sent === 1 && calls[0].chat_id === 9001 && calls[0].text.includes('Hali ishdamisiz?') && kb?.[0][0].request_location === true &&
    kb?.[1][0].text.includes('Ishni tugatish'),
  '"Hali ishdamisiz?" — «📍 Joylashuvni yuborish» va «⏸ Ishni tugatish» tugmalari bilan',
  calls,
);

// 6) «Ishni tugatish»: faol ishi bo'lsa — yo'q; bo'lmasa — offlayn
await db.from('masters').update({ busy: true }).eq('id', M1);
check((await stopWorking(db, 9001)) === 'busy' && (await master()).online, 'faol ishda — ishdan chiqmaydi');
await db.from('masters').update({ busy: false }).eq('id', M1);
check((await stopWorking(db, 9001)) === 'ok' && !(await master()).online, '«Ishni tugatish» — usta offlayn');
check((await stopWorking(db, 9002)) === 'not_master', 'mijoz «Ishni tugatish» — hech narsa');
r = await saveTelegramLocation(db, 9001, { latitude: 41.29, longitude: 69.22 }, Date.now(), false);
check(r.kind === 'saved' && !r.online, 'offlayn ustaning joylashuvi saqlanadi, lekin "ishda emassiz" deyiladi', r);

await proxy.shutdown();
console.log('ALL_OK');
