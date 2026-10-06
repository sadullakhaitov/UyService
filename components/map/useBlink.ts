import { useEffect, useState } from 'react';

// Usta belgilari navbat bilan miltillaydi: shaffoflik 0,35 ↔ 1
export function useBlink(on: boolean, count: number, period = 3200) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    const start = Date.now();
    const id = setInterval(() => setT(Date.now() - start), 50);
    return () => clearInterval(id);
  }, [on]);
  return Array.from({ length: count }, (_, i) => {
    if (!on) return 1;
    const phase = ((t + i * 700) % period) / period; // 0..1
    return 0.45 + 0.55 * (0.5 - 0.5 * Math.cos(phase * 2 * Math.PI));
  });
}
