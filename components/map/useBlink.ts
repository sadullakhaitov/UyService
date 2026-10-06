import { useEffect, useState } from 'react';

// Usta belgilari navbat bilan miltillaydi: shaffoflik 0,35 ↔ 1
export function useBlink(on: boolean, count: number, period = 1600) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    const start = Date.now();
    const id = setInterval(() => setT(Date.now() - start), 120);
    return () => clearInterval(id);
  }, [on]);
  return Array.from({ length: count }, (_, i) => {
    if (!on) return 1;
    const phase = ((t + i * 400) % period) / period; // 0..1
    return 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(phase * 2 * Math.PI));
  });
}
