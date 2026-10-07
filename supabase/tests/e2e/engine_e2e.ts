// E2E: usta qidirish (engine.ts) ↔ PostgREST ↔ Postgres (stub + migratsiyalar + fixture.sql)
import { activeSearches, dispatchStep, startDueScheduled } from '../../functions/_shared/engine.ts';
import { check, db, proxy } from './harness.ts';

const O1 = '00000000-0000-4000-c000-000000000001';
const O2 = '00000000-0000-4000-c000-000000000002';
const M1 = '00000000-0000-4000-b000-000000000001';
const M2 = '00000000-0000-4000-b000-000000000002';

const order = async (id: string) => (await db.from('orders').select('*').eq('id', id).single()).data!;
const master = async (id: string) => (await db.from('masters').select('*').eq('id', id).single()).data!;
const offers = async (id: string) => (await db.from('offers').select('*').eq('order_id', id).order('sent_at')).data!;
/** Vaqtni "orqaga suramiz": dispatch ichidagi vaqtlarni ms ga kamaytiramiz */
async function shift(id: string, ms: number) {
  const o = await order(id);
  const d = o.dispatch;
  d.startedAt -= ms;
  d.radiusAt -= ms;
  if (d.offer) d.offer.sentAt -= ms;
  const r = await db.from('orders').update({ dispatch: d, dispatch_rev: o.dispatch_rev + 1 }).eq('id', id);
  if (r.error) throw r.error;
}

// 1) birinchi qadam — eng yuqori balli usta (M1: yaqinroq, reyting 4.9)
let r = await dispatchStep(db, O1);
let o = await order(O1);
check(r.ok && o.dispatch?.offer?.masterId === M1 && o.status === 'searching', 'birinchi taklif M1 ga', { r, o });
let of = await offers(O1);
check(of.length === 1 && of[0].master_id === M1 && of[0].status === 'sent' && of[0].eta_min >= 1, 'offers qatori yaratildi (eta, masofa bilan)', of);

// takroriy qadam hech narsani o'zgartirmaydi (60 s o'tmagan)
r = await dispatchStep(db, O1);
check(r.ok && !r.changed && (await offers(O1)).length === 1, 'takroriy qadam — o\'zgarish yo\'q');

// 2) M1 rad etadi → M2 ga
r = await dispatchStep(db, O1, { response: { masterId: M1, accepted: false } });
o = await order(O1);
of = await offers(O1);
check(o.dispatch.offer?.masterId === M2 && of.find((x) => x.master_id === M1)?.status === 'declined', 'M1 rad etdi → taklif M2 ga', of);
check((await master(M1)).activity === 75, 'M1 aktivligi 80 → 75');

// begona usta javobi
r = await dispatchStep(db, O1, { response: { masterId: M1, accepted: true } });
check(!r.ok && r.error === 'offer_not_active', 'taklifi yo\'q usta qabul qila olmaydi');

// 3) M2 qabul qiladi
r = await dispatchStep(db, O1, { response: { masterId: M2, accepted: true } });
o = await order(O1);
const m2 = await master(M2);
check(r.ok && o.status === 'on_the_way' && o.master_id === M2 && o.accepted_at && o.dispatch.done === 'accepted', 'M2 qabul qildi → on_the_way, master_id=M2', o);
check(m2.busy && m2.activity === 82, 'M2 band, aktivlik 80 → 82', m2);
check((await offers(O1)).find((x) => x.master_id === M2)?.status === 'accepted', 'M2 taklifi accepted');

// 4) konditsioner ustasi yo'q: kutadi, radiuslarni kengaytiradi, 3 daqiqadan keyin "none"
r = await dispatchStep(db, O2);
o = await order(O2);
check(r.ok && !o.dispatch.offer && o.dispatch.radiusIdx === 0 && !o.dispatch.done, 'usta yo\'q — 3 km da kutmoqda');
await shift(O2, 11_000);
await dispatchStep(db, O2);
check((await order(O2)).dispatch.radiusIdx === 1, '10 s dan keyin radius 6 km');
await shift(O2, 200_000);
await dispatchStep(db, O2);
o = await order(O2);
check(o.dispatch.done === 'none' && o.status === 'searching', '3 daqiqadan keyin done=none (status searching qoladi)');

// 5) vaqt o'tdi: yangi buyurtma — M1 ga taklif (M2 band), 61 s → expired, aktivlik −5
const ins = await db.from('orders').insert({ client_id: '00000000-0000-4000-b000-00000000000a', category_id: 'plumber', lat: 41.275, lng: 69.205 }).select('id').single();
const O3 = ins.data!.id as string;
await dispatchStep(db, O3);
check((await order(O3)).dispatch.offer?.masterId === M1, 'O3: taklif M1 ga (M2 band)');
await shift(O3, 61_000);
const ids = await activeSearches(db);
check(ids.includes(O3) && !ids.includes(O2) && !ids.includes(O1), 'activeSearches — faqat tugamagan qidiruvlar', ids);
await dispatchStep(db, O3);
o = await order(O3);
check(!o.dispatch.offer && o.dispatch.declined.includes(M1) && (await offers(O3))[0].status === 'expired', 'O3: 60 s javobsiz → expired');
check((await master(M1)).activity === 70, 'M1 aktivligi 75 → 70');

// 6) rejalashtirilgan: 30 daqiqa ichidagisi qidiruvga chiqadi, 3 soatlik — yo'q
const started = await startDueScheduled(db);
check(started.length === 1 && started[0] === '00000000-0000-4000-c000-000000000004', 'rejalashtirilgan buyurtma 30 daqiqa oldin boshlandi', started);
check((await order('00000000-0000-4000-c000-000000000005')).status === 'scheduled', '3 soatlik rejalashtirilgan hali kutmoqda');

// 7) restart ("Qayta urinish")
r = await dispatchStep(db, O2, { restart: true });
o = await order(O2);
check(r.ok && !o.dispatch.done && o.dispatch.events.length === 0, 'restart — qidiruv boshidan');

// 8) parallel qadamlar: bir xil buyurtmaga bir vaqtda 5 ta qadam — bitta taklif
const O4 = '00000000-0000-4000-c000-000000000004';
await db.from('masters').update({ busy: false }).eq('id', M2);
await Promise.all([1, 2, 3, 4, 5].map(() => dispatchStep(db, O4)));
of = await offers(O4);
check(of.length === 1 && of[0].status === 'sent', 'parallel qadamlar — faqat bitta taklif', of);

console.log('ALL ENGINE E2E TESTS PASSED');
await proxy.shutdown();
