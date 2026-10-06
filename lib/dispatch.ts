// Usta qidirish algoritmi (TZ, 7-bo'lim). Toza funksiyalar — tashqi holatga bog'liq emas,
// shuning uchun 7-bosqichda shu fayl o'zgarishsiz Supabase Edge Function'ga (supabase/functions/dispatch) ko'chiriladi.
//
// Filtr (kategoriya, onlayn, tasdiqlangan, band emas, rad etmagan) → radius 3/6/10 km →
// eng yaqin 10 ta uchun yetib kelish vaqti → ball → eng yuqori ballga taklif (60 s).
// Rad / vaqt o'tdi → keyingi usta. Hamma radiusdan keyin ham topilmasa — "Hozir bo'sh usta yo'q".
import type { CategoryId } from '@/constants/categories';
import { DISPATCH, dispatchScore } from '@/constants/dispatch';
import { distanceKm, type LatLng } from './geo';
import { estimateEtaMin } from './routes';

export type DispatchMaster = {
  id: string;
  location: LatLng;
  categories: CategoryId[];
  online: boolean;
  verified: boolean;
  busy: boolean;
  rating: number;
  activity: number;
  priorityPoints: number;
};

export type DispatchOrder = {
  categoryId: CategoryId;
  location: LatLng;
  preferredMasterId: string | null;
};

export type Candidate = { id: string; distanceKm: number; etaMin: number; score: number };

export type DispatchEvent =
  | { kind: 'radius'; at: number; radiusKm: number; candidates: number }
  | { kind: 'offer'; at: number; masterId: string; score: number }
  | { kind: 'declined' | 'expired' | 'accepted'; at: number; masterId: string }
  | { kind: 'none'; at: number };

export type DispatchState = {
  startedAt: number;
  radiusIdx: number;
  /** Shu radiusga o'tilgan vaqt */
  radiusAt: number;
  /** Rad etgan yoki javob bermagan ustalar — ularga qayta taklif yuborilmaydi */
  declined: string[];
  offer: { masterId: string; sentAt: number } | null;
  done: 'accepted' | 'none' | null;
  events: DispatchEvent[];
};

/** Yetib kelish vaqti. Hozir taxminiy; 7-bosqichda Google Routes (eng yaqin `routesTopN` ta uchun) */
export type EtaFn = (from: LatLng, to: LatLng) => number;

export function startDispatch(now: number): DispatchState {
  return { startedAt: now, radiusIdx: 0, radiusAt: now, declined: [], offer: null, done: null, events: [] };
}

export const radiusKmOf = (s: DispatchState) => DISPATCH.radiiKm[s.radiusIdx];

/** Radius ichidagi mos ustalar, balli bo'yicha kamayish tartibida */
export function rankCandidates(order: DispatchOrder, masters: DispatchMaster[], radiusKm: number, declined: string[], eta: EtaFn = estimateEtaMin): Candidate[] {
  const pool = masters
    .filter((m) => m.categories.includes(order.categoryId) && m.online && m.verified && !m.busy && !declined.includes(m.id))
    .map((m) => ({ m, d: distanceKm(m.location, order.location) }))
    .filter((x) => x.d <= radiusKm)
    .sort((a, b) => a.d - b.d)
    .slice(0, DISPATCH.routesTopN);

  return pool
    .map(({ m, d }) => {
      const etaMin = eta(m.location, order.location);
      const score =
        dispatchScore({ etaMin, rating: m.rating, activity: m.activity, priorityPoints: m.priorityPoints }) +
        (m.id === order.preferredMasterId ? DISPATCH.preferredBonus : 0);
      return { id: m.id, distanceKm: d, etaMin, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Bir qadam: vaqti o'tgan taklifni yopadi, kerak bo'lsa radiusni kengaytiradi yoki yangi taklif yuboradi.
 * Har necha soniyada (yoki har hodisada) chaqiriladi. Yangi holat qaytaradi (eskisi o'zgarmaydi).
 */
export function advanceDispatch(s: DispatchState, order: DispatchOrder, masters: DispatchMaster[], now: number, eta?: EtaFn): DispatchState {
  if (s.done) return s;
  let st: DispatchState = { ...s, declined: [...s.declined], events: [...s.events] };

  // 60 s ichida javob bo'lmadi — rad etilgan deb hisoblanadi, keyingi ustaga
  if (st.offer) {
    if (now - st.offer.sentAt < DISPATCH.offerTimeoutSec * 1000) return s;
    st.events.push({ kind: 'expired', at: now, masterId: st.offer.masterId });
    st.declined.push(st.offer.masterId);
    st.offer = null;
  }

  if (now - st.startedAt > DISPATCH.giveUpAfterSec * 1000) return finishNone(st, now);

  // "Mening ustalarim"dan tanlangan usta — radiusdan qat'i nazar (eng katta radius ichida) taklif birinchi unga
  const pref = order.preferredMasterId;
  if (pref && !st.declined.includes(pref) && !st.events.some((e) => e.kind === 'offer' && e.masterId === pref)) {
    const maxKm = DISPATCH.radiiKm[DISPATCH.radiiKm.length - 1];
    const fav = rankCandidates(order, masters, maxKm, st.declined, eta).find((c) => c.id === pref);
    if (fav) {
      st.offer = { masterId: fav.id, sentAt: now };
      st.events.push({ kind: 'offer', at: now, masterId: fav.id, score: Math.round(fav.score) });
      return st;
    }
  }

  for (;;) {
    const list = rankCandidates(order, masters, radiusKmOf(st), st.declined, eta);
    if (list.length) {
      const best = list[0];
      st.offer = { masterId: best.id, sentAt: now };
      st.events.push({ kind: 'offer', at: now, masterId: best.id, score: Math.round(best.score) });
      return st;
    }
    // Bu radiusda hech kim yo'q: biroz kutamiz (yangi usta chiqib qolishi mumkin), keyin kengaytiramiz
    if (now - st.radiusAt < DISPATCH.radiusWaitSec * 1000) return st;
    if (st.radiusIdx >= DISPATCH.radiiKm.length - 1) return finishNone(st, now);
    st.radiusIdx += 1;
    st.radiusAt = now;
    st.events.push({ kind: 'radius', at: now, radiusKm: radiusKmOf(st), candidates: 0 });
    // Yangi radiusda darhol qidiramiz (kutish yangi radius uchun qaytadan boshlanadi)
    const wider = rankCandidates(order, masters, radiusKmOf(st), st.declined, eta);
    if (!wider.length) return st;
  }
}

/** Usta javobi: qabul qildi / rad etdi */
export function respondDispatch(s: DispatchState, masterId: string, accepted: boolean, now: number): DispatchState {
  if (!s.offer || s.offer.masterId !== masterId || s.done) return s;
  const events = [...s.events, { kind: accepted ? 'accepted' : 'declined', at: now, masterId } as DispatchEvent];
  if (accepted) return { ...s, offer: null, done: 'accepted', events };
  return { ...s, offer: null, declined: [...s.declined, masterId], events };
}

function finishNone(s: DispatchState, now: number): DispatchState {
  return { ...s, offer: null, done: 'none', events: [...s.events, { kind: 'none', at: now }] };
}

/** Aktivlik: qabul +2, rad yoki vaqt o'tdi −5, bekor −10; 0..100 */
export function applyActivity(activity: number, kind: 'accepted' | 'declined' | 'expired' | 'cancelled') {
  const a = DISPATCH.activity;
  const d = kind === 'accepted' ? a.accepted : kind === 'cancelled' ? a.cancelled : a.declinedOrExpired;
  return Math.max(a.min, Math.min(a.max, activity + d));
}
