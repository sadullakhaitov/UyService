// Mijoz buyurtmalari uchun soxta "server" (7-bosqichgacha). Hamma faol buyurtmalar uchun orqa fonda ishlaydi,
// shuning uchun mijoz bir buyurtmadan chiqib, yana boshqa usta chaqirishi mumkin.
// Usta qidirish — haqiqiy algoritm (lib/dispatch.ts); soxta faqat ustalarning javobi va harakati.
// 7-bosqichda: Supabase Edge Function (dispatch, offer-timeout) + Realtime (master_locations).
import { useEffect } from 'react';
import { DISPATCH } from '@/constants/dispatch';
import { advanceDispatch, applyActivity, respondDispatch, startDispatch, type DispatchMaster } from '@/lib/dispatch';
import { distanceKm } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { notify } from '@/lib/notify';
import { estimateEtaMin, fallbackRoute, fetchRoute, resample, ROUTE_WAIT_MS } from '@/lib/routes';
import { mastersAround, mockMasters } from '@/mocks';
import { useOrders, type ActiveOrder } from '@/store';

const TICK_MS = 500;
/** Usta belgisi har qadamda shuncha vaqt silliq siljiydi (tracking ekrani ham shuni ishlatadi) */
export const STEP_MS = 1000;
const STEP_M = 12; // har qadam ≤ 12 m (~43 km/soat), burilishlar saqlanadi
const ARRIVED_TO_WORK_MS = 4000;
/** Rejalashtirilgan buyurtmada qidiruv shuncha oldin boshlanadi */
export const SCHEDULE_LEAD_MS = 30 * 60_000;

// Soxta ustalarning aktivligi (taklifni rad etsa −5, qabul qilsa +2)
const activity = new Map(mockMasters.map((m) => [m.id, m.activity]));
// Har taklifga soxta javob: qachon va qanday
const replies = new Map<string, { at: number; accept: boolean }>();

export function useOrderSimulator() {
  useEffect(() => {
    const id = setInterval(() => tick(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);
}

function tick(now: number) {
  const { orders, update } = useOrders.getState();
  // Bir usta bir vaqtda faqat bitta buyurtmada
  const busy = new Set(orders.filter((o) => o.status !== 'searching' && o.status !== 'scheduled').map((o) => o.masterId).filter(Boolean));

  for (const o of orders) {
    if (o.status === 'scheduled') {
      if (o.scheduledAt && now >= o.scheduledAt - SCHEDULE_LEAD_MS) startSearch(o.id, now);
    } else if (o.status === 'searching') {
      if (!o.none) searchTick(o, now, busy);
    } else if (o.status === 'on_the_way') {
      // Haqiqiy yo'l kelguncha usta joyida turadi; juda uzoq kelmasa — taxminiy yo'l
      if (!o.routeReady) {
        if (now - o.phaseAt >= ROUTE_WAIT_MS) {
          const fb = fallbackRoute(o.path[0], o.location);
          update(o.id, { path: resample(fb.path, STEP_M), step: 0, routeReady: true, phaseAt: now });
        }
      } else if (now - o.phaseAt >= STEP_MS) {
        if (o.step < o.path.length - 1) update(o.id, { step: o.step + 1, phaseAt: now });
        else {
          update(o.id, { status: 'arrived', phaseAt: now });
          notify(t('notify.arrivedTitle'), t('notify.arrivedBody', { category: t(`categories.${o.categoryId}`) }));
        }
      }
    } else if (o.status === 'arrived' && now - o.phaseAt >= ARRIVED_TO_WORK_MS) {
      update(o.id, { status: 'in_progress', phaseAt: now });
    }
  }
}

export function startSearch(id: string, now = Date.now()) {
  useOrders.getState().update(id, { status: 'searching', createdAt: now, none: false, dispatch: startDispatch(now) });
}

function searchTick(o: ActiveOrder, now: number, busy: Set<string | null>) {
  const masters: DispatchMaster[] = mastersAround(o.location).map((m) => ({
    id: m.id,
    location: m.location,
    categories: m.categories,
    online: m.online,
    verified: m.verified,
    busy: busy.has(m.id),
    rating: m.rating,
    activity: activity.get(m.id) ?? m.activity,
    priorityPoints: m.priorityPoints,
  }));
  const order = { categoryId: o.categoryId, location: o.location, preferredMasterId: o.preferredMasterId };
  let d = o.dispatch;

  // Taklif olgan soxta usta 2,5–7 s da javob beradi
  if (d.offer) {
    const key = `${o.id}:${d.offer.masterId}:${d.offer.sentAt}`;
    let r = replies.get(key);
    if (!r) {
      const m = mockMasters.find((x) => x.id === d.offer!.masterId);
      r = { at: d.offer.sentAt + 2500 + Math.random() * 4500, accept: Math.random() < (m?.acceptRate ?? 0.7) };
      replies.set(key, r);
    }
    if (now >= r.at) {
      const mid = d.offer.masterId;
      activity.set(mid, applyActivity(activity.get(mid) ?? 80, r.accept ? 'accepted' : 'declined'));
      d = respondDispatch(d, mid, r.accept, now);
      replies.delete(key);
    }
  }
  if (d.done === 'accepted') return assign(o, d, now);

  d = advanceDispatch(d, order, masters, now);
  // Vaqti o'tgan taklif — usta aktivligi −5
  const last = d.events[d.events.length - 1];
  if (last?.kind === 'expired' && last.at === now) activity.set(last.masterId, applyActivity(activity.get(last.masterId) ?? 80, 'expired'));

  if (d !== o.dispatch) {
    useOrders.getState().update(o.id, { dispatch: d, none: d.done === 'none' });
    if (d.done === 'none') notify(t('notify.noneTitle'), t('searching.noneText'));
  }
}

function assign(o: ActiveOrder, dispatch: ActiveOrder['dispatch'], now: number) {
  const acc = [...dispatch.events].reverse().find((e) => e.kind === 'accepted');
  const masterId = acc && 'masterId' in acc ? acc.masterId : o.dispatch.offer?.masterId ?? '';
  const m = mastersAround(o.location).find((x) => x.id === masterId)!;
  const fb = fallbackRoute(m.location, o.location);
  // Usta joyida turadi, yo'l chizig'i haqiqiy ko'chalar bo'ylab yo'l kelganda paydo bo'ladi
  useOrders.getState().update(o.id, {
    dispatch,
    status: 'on_the_way',
    masterId,
    path: [m.location],
    step: 0,
    routeReady: false,
    speed: fb.distanceM / fb.durationS,
    phaseAt: now,
  });
  notify(t('notify.foundTitle'), t('notify.foundBody', { name: m.name.split(' ')[0], min: estimateEtaMin(m.location, o.location) }));
  fetchRoute(m.location, o.location).then((r) => {
    const cur = useOrders.getState().orders.find((x) => x.id === o.id);
    if (r && cur && cur.status === 'on_the_way' && !cur.routeReady) {
      // Belgi shu tezlikda yuradi: qadam ≤ 12 m har soniyada
      useOrders.getState().update(o.id, { path: resample(r.path, STEP_M), step: 0, routeReady: true, speed: STEP_M / (STEP_MS / 1000), phaseAt: Date.now() });
    }
  });
}

/** Qidiruv holati (mijoz ekrani uchun) */
export function searchInfo(o: ActiveOrder, now = Date.now()) {
  const d = o.dispatch;
  const offered = d.events.filter((e) => e.kind === 'offer').length;
  const declined = d.events.filter((e) => e.kind === 'declined' || e.kind === 'expired').length;
  const radiusKm = DISPATCH.radiiKm[d.radiusIdx];
  const waiting = d.offer ? Math.floor((now - d.offer.sentAt) / 1000) : 0;
  // Holat matni: 0 — tekshirilmoqda, 1 — taklif yuborildi, 2 — javob kutilmoqda, 3 — radius kengaytirildi
  const step = d.offer ? (waiting >= 3 ? 2 : 1) : d.radiusIdx > 0 ? 3 : 0;
  return { offered, declined, radiusKm, step, waiting, lastDeclined: declined > 0 && !d.offer };
}

// Qolgan yo'l bo'yicha daqiqa
export function etaMin(o: Pick<ActiveOrder, 'path' | 'step' | 'speed' | 'location' | 'routeReady'>) {
  if (!o.routeReady && o.path[0]) return estimateEtaMin(o.path[0], o.location);
  let m = 0;
  for (let i = o.step + 1; i < o.path.length; i++) m += distanceKm(o.path[i - 1], o.path[i]) * 1000;
  return Math.max(1, Math.round(m / Math.max(1, o.speed) / 60));
}
