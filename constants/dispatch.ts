// Usta tanlash algoritmi koeffitsientlari (TZ, 7-bo'lim).
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
