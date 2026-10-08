import * as Location from 'expo-location';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import type { LatLng } from './geo';

// Telefonning jonli joylashuvi (usta yurganda xaritada ham yuradi). Butun ilova uchun bitta kuzatuv:
// bir nechta ekran (Buyurtmalar, ish jarayoni, joylashuvni yuborish) bir xil nuqtani oladi.
// Brauzerda — navigator.geolocation.watchPosition, telefonda — expo-location.
//
// Ikki rejim (batareya va qizish uchun):
//   'precise'  — eng aniq GPS, har ~1 s: faqat usta mijozga borayotganda (yo'l, "N daqiqa", mijoz xaritasi)
//   'balanced' — o'rtacha aniqlik, har ~5 s / 10 m: buyurtma kutayotganda (serverga baribir har 5 s yuboriladi)
// Kamida bitta ekran 'precise' so'rasa — kuzatuv aniq rejimga o'tadi, oxirgisi yopilsa — yana yengil rejimga.

/** Aniqligi shundan yomon nuqtalar odatda tashlab yuboriladi (GPS shovqini) */
const MAX_ACCURACY_M = 100;
/** ...lekin shuncha vaqt yaxshi nuqta kelmasa, borini olamiz — belgi hech qachon qotib qolmasin */
const STALE_MS = 8000;

export type WatchMode = 'precise' | 'balanced';

const useLive = create<{ pos: LatLng | null; at: number }>(() => ({ pos: null, at: 0 }));
let users = 0;
let preciseUsers = 0;
let running: WatchMode | null = null;
let stop: (() => void) | null = null;

function onFix(lat: number, lng: number, accuracy: number | null | undefined) {
  const { at } = useLive.getState();
  const now = Date.now();
  if (accuracy != null && accuracy > MAX_ACCURACY_M && now - at < STALE_MS) return;
  useLive.setState({ pos: { latitude: lat, longitude: lng }, at: now });
}

function start(mode: WatchMode) {
  running = mode;
  const precise = mode === 'precise';
  if (Platform.OS === 'web') {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) return;
    const id = geo.watchPosition(
      (p) => onFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      () => {},
      // Yengil rejimda telefon GPS'ni doim yoqib turmaydi (Wi-Fi / tarmoq + eski nuqta 5 s gacha)
      { enableHighAccuracy: precise, maximumAge: precise ? 1000 : 5000, timeout: 20_000 },
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
        precise
          ? { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 }
          : { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (p) => onFix(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      );
      if (!alive) sub.remove();
    } catch {
      // ruxsat yo'q — belgi oxirgi ma'lum joyda qoladi
    }
  })();
}

function halt() {
  stop?.();
  stop = null;
  running = null;
}

/** Kerakli rejim o'zgargan bo'lsa — kuzatuvni qayta boshlaydi (oxirgi nuqta saqlanadi, belgi sakramaydi) */
function sync() {
  const want: WatchMode | null = users === 0 ? null : preciseUsers > 0 ? 'precise' : 'balanced';
  if (want === running) return;
  halt();
  if (want) start(want);
}

/** Jonli joylashuv; `enabled=false` — kuzatmaydi. Oxirgi ekran yopilganda kuzatuv to'xtaydi */
export function useWatchLocation(enabled = true, mode: WatchMode = 'precise') {
  const pos = useLive((s) => s.pos);
  useEffect(() => {
    if (!enabled) return;
    const precise = mode === 'precise';
    users++;
    if (precise) preciseUsers++;
    sync();
    return () => {
      users--;
      if (precise) preciseUsers--;
      sync();
    };
  }, [enabled, mode]);
  return enabled ? pos : null;
}
