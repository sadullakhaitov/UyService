import { useEffect, useState } from 'react';
import type { LatLng } from './geo';
import { getCurrentLocation } from './location';

// Telefonning haqiqiy joylashuvi (ruxsat bo'lmasa — null, ilova standart manzil bilan davom etadi)
export function useMyLocation() {
  const [loc, setLoc] = useState<LatLng | null>(null);
  useEffect(() => {
    let alive = true;
    getCurrentLocation().then((p) => alive && p && setLoc(p));
    return () => {
      alive = false;
    };
  }, []);
  return loc;
}
