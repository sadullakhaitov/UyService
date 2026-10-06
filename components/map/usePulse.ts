import { useEffect, useState } from 'react';

const DURATION = 2400;
const GAP = 800;
const RINGS = 3;

// Qidiruv to'lqinlari: 3 ta halqa ketma-ket tarqaladi va so'nadi (2,4 s, 0,8 s farq, cheksiz).
// Halqalar xaritaning o'zida (metrda) chiziladi — xarita surilsa, ular nuqtadan ajralmaydi.
// Qaytaradi: har bir halqa uchun 0..1 bosqich (0 — markazda, 1 — eng katta va ko'rinmas)
export function usePulse(on: boolean) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    const start = Date.now();
    let raf = 0;
    let last = 0;
    const tick = () => {
      const now = Date.now();
      if (now - last > 33) {
        last = now;
        setT(now - start);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  if (!on) return [];
  return Array.from({ length: RINGS }, (_, i) => {
    const local = t - i * GAP;
    if (local < 0) return null;
    const p = (local % DURATION) / DURATION;
    return 1 - (1 - p) * (1 - p); // ease-out
  }).filter((p): p is number => p !== null);
}

export const pulseRadius = (p: number, maxM: number) => maxM * (0.12 + 0.88 * p);
export const pulseOpacity = (p: number) => 0.55 * (1 - p);
