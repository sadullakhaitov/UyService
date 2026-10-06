// Usta qidirish algoritmi (TZ, 7-bo'lim) — yagona manba.
// Bu fayl hech narsani import qilmaydi: ham ilovada (constants/dispatch.ts, lib/dispatch.ts orqali),
// ham Supabase Edge Function'larda (Deno) bir xil ishlaydi. O'zgartirsangiz — ikkalasiga ham ta'sir qiladi.
//
// Filtr (kategoriya, onlayn, tasdiqlangan, band emas, rad etmagan) → radius 3/6/10 km →
// eng yaqin 10 ta uchun yetib kelish vaqti → ball → eng yuqori ballga taklif (60 s).
// Rad / vaqt o'tdi → keyingi usta. Hamma radiusdan keyin ham topilmasa — "Hozir bo'sh usta yo'q".

// ---------- Koeffitsientlar ----------
// ball = 100 − (yetib kelish daqiqasi × 3) + (reyting − 4) × 20 + aktivlik × 0,2 + prioritet ballari
export const DISPATCH = {
  base: 100,
  etaWeight: 3,
  ratingPivot: 4,
  ratingWeight: 20,
  activityWeight: 0.2,

  radiiKm: [3, 6, 10],
  routesTopN: 10, // Google Routes faqat eng yaqin 10 ta uchun so'raladi
  offerTimeoutSec: 60, // usta buyurtma ma'lumotlarini o'qib ulgurishi uchun
  radiusWaitSec: 10, // radiusda bo'sh usta bo'lmasa, kengaytirishdan oldin shuncha kutiladi (yangi usta onlayn bo'lishi mumkin)
  giveUpAfterSec: 180,
  preferredBonus: 1000, // "Mening ustalarim"dan tanlangan usta — taklif birinchi unga

  activity: {
    min: 0,
    max: 100,
    accepted: +2,
    declinedOrExpired: -5,
    cancelled: -10,
  },
} as const;

export const MASTER_LOCATION_INTERVAL_MS = 5_000;

export function dispatchScore(m: { etaMin: number; rating: number; activity: number; priorityPoints: number }) {
  return (
    DISPATCH.base -
    m.etaMin * DISPATCH.etaWeight +
    (m.rating - DISPATCH.ratingPivot) * DISPATCH.ratingWeight +
    m.activity * DISPATCH.activityWeight +
    m.priorityPoints
  );
}

// ---------- Geometriya (lib/geo.ts, lib/routes.ts bilan bir xil) ----------
export type LatLng = { latitude: number; longitude: number };

const toRad = (d: number) => (d * Math.PI) / 180;

/** Ikki nuqta orasidagi masofa, km (haversine) */
export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Taxminiy yetib kelish vaqti, daqiqa: to'g'ri chiziq × 1,35 (ko'chalar), shahar tezligi 22 km/soat */
export function estimateEtaMin(from: LatLng, to: LatLng) {
  const roadKm = distanceKm(from, to) * 1.35;
  return Math.max(1, Math.round((roadKm / 22) * 60));
}

// ---------- Turlar ----------
export type DispatchMaster<C extends string = string> = {
  id: string;
  location: LatLng;
  categories: C[];
  online: boolean;
  verified: boolean;
  busy: boolean;
  rating: number;
  activity: number;
  priorityPoints: number;
};

export type DispatchOrder<C extends string = string> = {
  categoryId: C;
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

// ---------- Algoritm ----------
export function startDispatch(now: number): DispatchState {
  return { startedAt: now, radiusIdx: 0, radiusAt: now, declined: [], offer: null, done: null, events: [] };
}

export const radiusKmOf = (s: DispatchState) => DISPATCH.radiiKm[s.radiusIdx];

/** Radius ichidagi mos ustalar, balli bo'yicha kamayish tartibida */
export function rankCandidates<C extends string>(
  order: DispatchOrder<C>,
  masters: DispatchMaster<C>[],
  radiusKm: number,
  declined: string[],
  eta: EtaFn = estimateEtaMin,
): Candidate[] {
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
export function advanceDispatch<C extends string>(
  s: DispatchState,
  order: DispatchOrder<C>,
  masters: DispatchMaster<C>[],
  now: number,
  eta?: EtaFn,
): DispatchState {
  if (s.done) return s;
  const st: DispatchState = { ...s, declined: [...s.declined], events: [...s.events] };

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
