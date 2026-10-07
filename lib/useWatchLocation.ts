import * as Location from 'expo-location';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import type { LatLng } from './geo';

// Telefonning jonli joylashuvi (usta yurganda xaritada ham yuradi). Butun ilova uchun bitta kuzatuv:
// bir nechta ekran (Buyurtmalar, ish jarayoni, joylashuvni yuborish) bir xil nuqtani oladi.
// Brauzerda — navigator.geolocation.watchPosition, telefonda — expo-location.

/** Aniqligi shundan yomon nuqtalar odatda tashlab yuboriladi (GPS shovqini) */
const MAX_ACCURACY_M = 100;
/** ...lekin shuncha vaqt yaxshi nuqta kelmasa, borini olamiz — belgi hech qachon qotib qolmasin */
const STALE_MS = 8000;

const useLive = create<{ pos: LatLng | null; at: number }>(() => ({ pos: null, at: 0 }));
let users = 0;
let stop: (() => void) | null = null;

function onFix(lat: number, lng: number, accuracy: number | null | undefined) {
  const { at } = useLive.getState();
  const now = Date.now();
  if (accuracy != null && accuracy > MAX_ACCURACY_M && now - at < STALE_MS) return;
  useLive.setState({ pos: { latitude: lat, longitude: lng }, at: now });
}

function start() {
  if (Platform.OS === 'web') {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) return;
    const id = geo.watchPosition(
      (p) => onFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20_000 },
    );
    stop = () => geo.clearWatch(id);
    return;
  }
  let sub: Location.LocationSubscription | null = null;
  let alive = true;
  stop = () => {
    alive = false;
    sub?.remove();
  };
  (async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !alive) return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
        (p) => onFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      );
      if (!alive) sub.remove();
    } catch {
      // ruxsat yo'q — belgi oxirgi ma'lum joyda qoladi
    }
  })();
}

/** Jonli joylashuv; `enabled=false` — kuzatmaydi. Oxirgi ekran yopilganda kuzatuv to'xtaydi */
export function useWatchLocation(enabled = true) {
  const pos = useLive((s) => s.pos);
  useEffect(() => {
    if (!enabled) return;
    if (users++ === 0) start();
    return () => {
      if (--users === 0) {
        stop?.();
        stop = null;
      }
    };
  }, [enabled]);
  return enabled ? pos : null;
}
