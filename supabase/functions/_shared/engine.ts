// Taqsimlashning bitta qadami — dispatch, offer-respond, offer-timeout shu funksiyani chaqiradi.
// Algoritmning o'zi _shared/dispatch.ts da (ilova bilan bir xil); bu yerda faqat bazaga o'qish/yozish.
//
// 1) buyurtma va uning DispatchState'i (orders.dispatch) o'qiladi
// 2) usta javobi bo'lsa — respondDispatch; keyin advanceDispatch (10 km ichidagi nomzodlar bilan)
// 3) orders yoziladi (dispatch_rev bo'yicha: bir vaqtda ikki qadam bo'lsa, biri qaytadan boshlanadi)
// 4) yangi hodisalar bo'yicha: offers qatorlari, aktivlik (+2 / −5), qabul qilinganda usta tayinlanadi
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  DISPATCH,
  advanceDispatch,
  distanceKm,
  estimateEtaMin,
  respondDispatch,
  startDispatch,
  type DispatchEvent,
  type DispatchMaster,
  type DispatchOrder,
  type DispatchState,
  type EtaFn,
} from './dispatch.ts';
import { roadEta } from './eta.ts';

/** Rejalashtirilgan buyurtmada qidiruv shuncha oldin boshlanadi (lib/orderSimulator.ts → SCHEDULE_LEAD_MS) */
export const SCHEDULE_LEAD_MS = 30 * 60_000;

type OrderRow = {
  id: string;
  client_id: string;
  category_id: string;
  lat: number;
  lng: number;
  preferred_master_id: string | null;
  status: string;
  dispatch: DispatchState | null;
  dispatch_rev: number;
};

type NearbyRow = {
  id: string;
  lat: number;
  lng: number;
  distance_km: number;
  rating: number | string;
  activity: number;
  priority_points: number;
  categories: string[];
};

export type StepOptions = {
  /** "Qayta urinish": qidiruvni boshidan boshlash */
  restart?: boolean;
  /** Usta javobi */
  response?: { masterId: string; accepted: boolean };
};

export type StepResult =
  | { ok: true; status: string; dispatch: DispatchState | null; changed: boolean }
  | { ok: false; error: 'not_found' | 'offer_not_active' | 'conflict' | string };

const ORDER_COLUMNS = 'id, client_id, category_id, lat, lng, preferred_master_id, status, dispatch, dispatch_rev';

export async function dispatchStep(db: SupabaseClient, orderId: string, opts: StepOptions = {}): Promise<StepResult> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await tryStep(db, orderId, opts);
    if (r !== 'conflict') return r;
  }
  return { ok: false, error: 'conflict' };
}

async function tryStep(db: SupabaseClient, orderId: string, opts: StepOptions): Promise<StepResult | 'conflict'> {
  const { data, error } = await db.from('orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'not_found' };
  const order = data as OrderRow;
  if (order.status !== 'searching') {
    return opts.response ? { ok: false, error: 'offer_not_active' } : { ok: true, status: order.status, dispatch: order.dispatch, changed: false };
  }

  const now = Date.now();
  const prev = opts.restart ? null : order.dispatch;
  let st: DispatchState = prev ?? startDispatch(now);

  if (opts.response) {
    const r = respondDispatch(st, opts.response.masterId, opts.response.accepted, now);
    if (r === st) return { ok: false, error: 'offer_not_active' };
    st = r;
  }

  const dOrder: DispatchOrder = {
    categoryId: order.category_id,
    location: { latitude: order.lat, longitude: order.lng },
    preferredMasterId: order.preferred_master_id,
  };
  let masters: DispatchMaster[] = [];
  let eta: EtaFn = estimateEtaMin;
  if (!st.done) {
    masters = await loadCandidates(db, order);
    // Yangi taklif yuboriladigan bo'lsa — yetib kelish vaqti haqiqiy yo'l bo'yicha (eng yaqin 10 ta)
    const offerDue = !st.offer || now - st.offer.sentAt >= DISPATCH.offerTimeoutSec * 1000;
    if (offerDue && masters.length) eta = await roadEta(dOrder.location, masters.map((m) => m.location));
    st = advanceDispatch(st, dOrder, masters, now, eta);
  }
  if (st === prev) return { ok: true, status: order.status, dispatch: prev, changed: false };

  const fresh = st.events.slice(prev?.events.length ?? 0);
  const accepted = fresh.find((e): e is DispatchEvent & { kind: 'accepted'; masterId: string } => e.kind === 'accepted');

  const patch: Record<string, unknown> = { dispatch: st, dispatch_rev: order.dispatch_rev + 1 };
  if (accepted) {
    patch.master_id = accepted.masterId;
    patch.status = 'on_the_way';
  }
  const upd = await db
    .from('orders')
    .update(patch)
    .eq('id', order.id)
    .eq('dispatch_rev', order.dispatch_rev)
    .eq('status', 'searching')
    .select('id');
  if (upd.error) return { ok: false, error: upd.error.message };
  if (!upd.data?.length) return 'conflict';

  await applyEvents(db, order, fresh, masters, eta);
  return { ok: true, status: accepted ? 'on_the_way' : order.status, dispatch: st, changed: true };
}

/** 10 km (eng katta radius) ichidagi mos ustalar; radius bo'yicha saralashni algoritmning o'zi qiladi */
async function loadCandidates(db: SupabaseClient, order: OrderRow): Promise<DispatchMaster[]> {
  const { data, error } = await db.rpc('nearby_masters', {
    p_lat: order.lat,
    p_lng: order.lng,
    p_radius_km: DISPATCH.radiiKm[DISPATCH.radiiKm.length - 1],
    p_category: order.category_id,
    p_order_id: order.id,
  });
  if (error) throw new Error(`nearby_masters: ${error.message}`);
  return ((data ?? []) as NearbyRow[]).map((m) => ({
    id: m.id,
    location: { latitude: m.lat, longitude: m.lng },
    categories: m.categories,
    online: true, // nearby_masters faqat onlayn, tasdiqlangan, band bo'lmaganlarni qaytaradi
    verified: true,
    busy: false,
    rating: Number(m.rating),
    activity: m.activity,
    priorityPoints: m.priority_points,
  }));
}

async function applyEvents(db: SupabaseClient, order: OrderRow, events: DispatchEvent[], masters: DispatchMaster[], eta: EtaFn) {
  const here = { latitude: order.lat, longitude: order.lng };
  for (const e of events) {
    if (e.kind === 'offer') {
      const m = masters.find((x) => x.id === e.masterId);
      const { error } = await db.from('offers').insert({
        order_id: order.id,
        master_id: e.masterId,
        sent_at: new Date(e.at).toISOString(),
        expires_at: new Date(e.at + DISPATCH.offerTimeoutSec * 1000).toISOString(),
        score: e.score,
        eta_min: m ? eta(m.location, here) : null,
        distance_km: m ? Math.round(distanceKm(m.location, here) * 10) / 10 : null,
      });
      if (error) console.error('offers.insert', error.message);
    } else if (e.kind === 'expired' || e.kind === 'declined' || e.kind === 'accepted') {
      await db
        .from('offers')
        .update({ status: e.kind, responded_at: new Date(e.at).toISOString() })
        .eq('order_id', order.id)
        .eq('master_id', e.masterId)
        .eq('status', 'sent');
      const delta = e.kind === 'accepted' ? DISPATCH.activity.accepted : DISPATCH.activity.declinedOrExpired;
      const { error } = await db.rpc('bump_activity', { p_master: e.masterId, p_delta: delta });
      if (error) console.error('bump_activity', error.message);
      if (e.kind === 'accepted') await db.from('masters').update({ busy: true }).eq('id', e.masterId);
    }
  }
}

/** offer-timeout uchun: rejalashtirilgan buyurtmalarni vaqtida qidiruvga chiqaradi */
export async function startDueScheduled(db: SupabaseClient): Promise<string[]> {
  const until = new Date(Date.now() + SCHEDULE_LEAD_MS).toISOString();
  const { data, error } = await db.from('orders').select('id').eq('status', 'scheduled').lte('scheduled_at', until).limit(200);
  if (error) throw new Error(error.message);
  const started: string[] = [];
  for (const { id } of (data ?? []) as { id: string }[]) {
    const upd = await db
      .from('orders')
      .update({ status: 'searching', dispatch: null })
      .eq('id', id)
      .eq('status', 'scheduled')
      .select('id');
    if (upd.data?.length) started.push(id);
  }
  return started;
}

/** offer-timeout uchun: qidiruvi tugamagan buyurtmalar */
export async function activeSearches(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db.from('orders').select('id, dispatch').eq('status', 'searching').limit(500);
  if (error) throw new Error(error.message);
  return ((data ?? []) as { id: string; dispatch: DispatchState | null }[])
    .filter((o) => !o.dispatch || !o.dispatch.done)
    .map((o) => o.id);
}
