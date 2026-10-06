// Soxta dispatch va usta harakati (5–7-bosqichgacha). Hamma faol buyurtmalar uchun orqa fonda ishlaydi,
// shuning uchun mijoz bir buyurtmadan chiqib, yana boshqa usta chaqirishi mumkin.
// 7-bosqichda: Supabase Edge Function (dispatch) + Realtime (master_locations).
import { useEffect } from 'react';
import { distanceKm } from '@/lib/geo';
import { fallbackRoute, fetchRoute, resample } from '@/lib/routes';
import { mastersAround } from '@/mocks';
import { useOrders } from '@/store';

const TICK_MS = 500;
const FOUND_AFTER_MS = 7000;
const GIVE_UP_AFTER_MS = 9000;
const STEP_MS = 5000; // usta GPS'i har 5 s
const STEP_M = 60; // har 5 s da ~60 m
const ARRIVED_TO_WORK_MS = 4000;

export function useOrderSimulator() {
  useEffect(() => {
    const id = setInterval(() => {
      const { orders, update } = useOrders.getState();
      const now = Date.now();
      // Bir usta bir vaqtda faqat bitta buyurtmada
      const busy = new Set(orders.map((o) => o.masterId).filter(Boolean));

      for (const o of orders) {
        if (o.status === 'searching') {
          if (o.none) continue;
          const elapsed = now - o.createdAt;
          const candidates = mastersAround(o.location)
            .filter((m) => m.categories.includes(o.categoryId) && !busy.has(m.id))
            .sort((a, b) =>
              a.id === o.preferredMasterId ? -1 : b.id === o.preferredMasterId ? 1 : distanceKm(a.location, o.location) - distanceKm(b.location, o.location),
            );
          const searchStep = elapsed > 4400 ? (candidates.length ? 2 : 3) : elapsed > 2200 ? 1 : 0;
          if (searchStep !== o.searchStep) update(o.id, { searchStep });

          if (candidates.length && elapsed > FOUND_AFTER_MS) {
            const m = candidates[0];
            busy.add(m.id);
            const fb = fallbackRoute(m.location, o.location);
            update(o.id, { status: 'on_the_way', masterId: m.id, path: resample(fb.path, STEP_M), step: 0, speed: fb.distanceM / fb.durationS, phaseAt: now });
            // Haqiqiy ko'chalar bo'ylab yo'l kelganda almashtiramiz (usta hali deyarli yurmagan bo'lsa)
            fetchRoute(m.location, o.location).then((r) => {
              const cur = useOrders.getState().orders.find((x) => x.id === o.id);
              if (r && cur && cur.status === 'on_the_way' && cur.step < 2) {
                useOrders.getState().update(o.id, { path: resample(r.path, STEP_M), step: 0, speed: r.distanceM / Math.max(1, r.durationS), phaseAt: Date.now() });
              }
            });
          } else if (!candidates.length && elapsed > GIVE_UP_AFTER_MS) {
            update(o.id, { none: true });
          }
        } else if (o.status === 'on_the_way') {
          if (now - o.phaseAt >= STEP_MS) {
            if (o.step < o.path.length - 1) update(o.id, { step: o.step + 1, phaseAt: now });
            else update(o.id, { status: 'arrived', phaseAt: now });
          }
        } else if (o.status === 'arrived' && now - o.phaseAt >= ARRIVED_TO_WORK_MS) {
          update(o.id, { status: 'in_progress', phaseAt: now });
        }
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);
}

// Qolgan yo'l bo'yicha daqiqa
export function etaMin(o: { path: { latitude: number; longitude: number }[]; step: number; speed: number }) {
  let m = 0;
  for (let i = o.step + 1; i < o.path.length; i++) m += distanceKm(o.path[i - 1], o.path[i]) * 1000;
  return Math.max(1, Math.round(m / Math.max(1, o.speed) / 60));
}
