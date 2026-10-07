// E2E: push navbati (triggerlar) → push-send (flushPush) → soxta Expo Push API
import { dispatchStep } from '../../functions/_shared/engine.ts';
import { flushPush, pushText } from '../../functions/_shared/push.ts';
import { check, db, proxy } from './harness.ts';

const O1 = '00000000-0000-4000-c000-000000000001';
const O2 = '00000000-0000-4000-c000-000000000002';
const M1 = '00000000-0000-4000-b000-000000000001';
const M2 = '00000000-0000-4000-b000-000000000002';


await db.from('profiles').update({ push_token: 'ExponentPushToken[client]', language: 'ru' }).eq('id', '00000000-0000-4000-b000-00000000000a');
await db.from('profiles').update({ push_token: 'ExponentPushToken[m1]' }).eq('id', M1);
await db.from('profiles').update({ push_token: 'ExponentPushToken[m2-dead]' }).eq('id', M2);

// Qidiruv → eng yaxshi ustaga taklif → navbatda "Yangi buyurtma"
const r = await dispatchStep(db, O1);
check(r.ok, 'dispatchStep', r);

type Msg = { to: string; title: string; body: string; data: { url?: string }; channelId: string };
let sent: Msg[] = [];
const fakeExpo = (fail = false) => (async (_url: string | URL | Request, init?: RequestInit) => {
  const msgs = JSON.parse(String(init?.body)) as Msg[];
  if (fail) return new Response(JSON.stringify({ errors: [{ message: 'Expo down' }] }), { status: 503 });
  sent.push(...msgs);
  return new Response(JSON.stringify({
    data: msgs.map((m) => (m.to.includes('dead') ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } } : { status: 'ok', id: crypto.randomUUID() })),
  }));
}) as typeof fetch;

// Expo javob bermasa — xabar navbatda qoladi
const down = await flushPush(db, fakeExpo(true));
check(down.sent === 0 && down.failed === 1, 'Expo ishlamasa xabar yo‘qolmaydi (qayta urinish)', down);

const res = await flushPush(db, fakeExpo());
const offer = sent.find((m) => m.data.url === '/master/offer');
check(res.sent === 1 && offer && offer.title === 'Yangi buyurtma' && offer.channelId === 'orders', 'ustaga "Yangi buyurtma" ketdi', { res, sent });

// Usta qabul qiladi → mijozga ruscha "Мастер найден"
sent = [];
const acc = await dispatchStep(db, O1, { response: { masterId: offer!.to.includes('m1') ? M1 : M2, accepted: true } });
check(acc.ok, 'qabul', acc);
await flushPush(db, fakeExpo());
const found = sent.find((m) => m.to === 'ExponentPushToken[client]');
check(found && found.title === 'Мастер найден' && found.data.url === '/client/tracking?id=' + O1, 'mijozga o‘z tilida "Мастер найден" + bosilganda kuzatuv ekrani', sent);

// Ikkinchi flush — hech narsa qayta ketmaydi
sent = [];
const again = await flushPush(db, fakeExpo());
check(again.sent === 0 && sent.length === 0, 'bir xabar ikki marta yuborilmaydi', again);

// O‘lik token: M2 ga to'g'ridan-to'g'ri xabar (bekor qilingan buyurtma)
await db.from('orders').update({ master_id: M2, status: 'on_the_way' }).eq('id', O2);
await db.from('orders').update({ status: 'cancelled', cancelled_by: 'client' }).eq('id', O2);
await flushPush(db, fakeExpo());
const { data: m2 } = await db.from('profiles').select('push_token').eq('id', M2).single();
check(m2?.push_token === null, 'DeviceNotRegistered — token tozalanadi', m2);

check(pushText('price', { sum: 250000 }, 'uz')?.body.startsWith("250 000 so'm"), 'narx matni: 250 000 so‘m', pushText('price', { sum: 250000 }, 'uz'));
check(pushText('arrived', { category: 'electric' }, 'en')?.body === 'Electrician is at your door', 'inglizcha kategoriya nomi');

await proxy.shutdown();
console.log('ALL_OK');
