import { useEffect, useState } from 'react';

// Sekin va silliq: har halqa 4 s davomida tarqaladi, 1,33 s farq bilan
const DURATION = 4000;
const GAP = DURATION / 3;
const RINGS = 3;

// Qidiruv to'lqinlari: 3 ta halqa ketma-ket tarqaladi va so'nadi (cheksiz).
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
      if (now - last > 16) {
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
    return Math.sin((p * Math.PI) / 2); // yumshoq ease-out
  }).filter((p): p is number => p !== null);
}

export const pulseRadius = (p: number, maxM: number) => maxM * (0.08 + 0.92 * p);
// Paydo bo'lishi ham, so'nishi ham silliq (keskin chiqmaydi)
export const pulseOpacity = (p: number) => 0.45 * Math.min(1, p * 6) * (1 - p) ** 1.5;
