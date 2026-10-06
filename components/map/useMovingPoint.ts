import { useEffect, useRef, useState } from 'react';
import { bearing, distanceKm, lerp, type LatLng } from '@/lib/geo';
import { MOVE_INTERVAL_MS } from './types';

// Har 5 s kelgan koordinata orasida silliq interpolatsiya + yo'nalish (heading).
// Belgi sakramaydi — Yandex effekti shundan.
export function useMovingPoint(target: LatLng | undefined, duration = MOVE_INTERVAL_MS) {
  const [pos, setPos] = useState<LatLng | undefined>(target);
  const [heading, setHeading] = useState(0);
  const posRef = useRef(pos);
  posRef.current = pos;

  useEffect(() => {
    if (!target) return;
    const from = posRef.current;
    if (!from) {
      setPos(target);
      return;
    }
    if (from.latitude === target.latitude && from.longitude === target.longitude) return;
    if (distanceKm(from, target) > 0.5) {
      setPos(target);
      return;
    }
    setHeading(bearing(from, target));
    const start = Date.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(1, (Date.now() - start) / duration);
      setPos(lerp(from, target, k));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target?.latitude, target?.longitude, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  return { pos, heading };
}
