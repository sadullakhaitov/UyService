import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import type { LatLng } from './geo';

// Telefonning jonli joylashuvi: faqat haqiqatan siljiganda yangilanadi.
// Usta joyida tursa — belgi ham joyida turadi; yursa — xaritada ham yuradi.
export function useWatchLocation(enabled = true) {
  const [pos, setPos] = useState<LatLng | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let sub: Location.LocationSubscription | null = null;
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !alive) return;
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
          (p) => {
            // GPS shovqini: aniqligi juda past nuqtalarni tashlab yuboramiz
            if (p.coords.accuracy != null && p.coords.accuracy > 50) return;
            setPos({ latitude: p.coords.latitude, longitude: p.coords.longitude });
          },
        );
        if (!alive) sub.remove();
      } catch {
        // ruxsat yo'q yoki brauzer qo'llamaydi — belgi joyida qoladi
      }
    })();
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [enabled]);
  return pos;
}
