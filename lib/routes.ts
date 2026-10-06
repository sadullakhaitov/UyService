// Yo'nalish va vaqt.
// Hozircha bepul OSRM (OpenStreetMap) xizmati: haqiqiy ko'chalar bo'ylab yo'l va vaqt.
// 7-bosqichda Supabase Edge Function orqali Google Routes API'ga almashtiriladi.
// Internet yo'q yoki xizmat javob bermasa — taxminiy (soxta) yo'l qaytariladi.
import { useEffect, useState } from 'react';
import { distanceKm, type LatLng } from './geo';

// Ikki bepul OSRM serveri: biri javob bermasa — ikkinchisi
const OSRM = ['https://routing.openstreetmap.de/routed-car/route/v1/driving', 'https://router.project-osrm.org/route/v1/driving'];
/** Haqiqiy yo'l shuncha vaqtda kelmasa — taxminiy yo'l ko'rsatiladi */
export const ROUTE_WAIT_MS = 15_000;
const CITY_SPEED_KMH = 22;

export type Route = {
  path: LatLng[];
  distanceM: number;
  durationS: number;
  /** true — haqiqiy ko'chalar bo'ylab; false — taxminiy chiziq */
  real: boolean;
};

export function estimateEtaMin(from: LatLng, to: LatLng) {
  const roadKm = distanceKm(from, to) * 1.35; // to'g'ri chiziq → ko'cha bo'ylab
  return Math.max(1, Math.round((roadKm / CITY_SPEED_KMH) * 60));
}

export function routeLengthKm(path: LatLng[]) {
  let sum = 0;
  for (let i = 1; i < path.length; i++) sum += distanceKm(path[i - 1], path[i]);
  return sum;
}

async function osrm(base: string, from: LatLng, to: LatLng): Promise<Route | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const url = `${base}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.routes?.[0];
    const coords: [number, number][] | undefined = r?.geometry?.coordinates;
    if (!coords?.length) return null;
    const path = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    // Yo'l aniq mijoz nuqtasida tugashi uchun (ko'chadan eshikkacha)
    path.push(to);
    return { path, distanceM: r.distance, durationS: r.duration, real: true };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Haqiqiy ko'chalar bo'ylab yo'l: serverlar navbat bilan, hammasi javob bermasa bir marta qayta urinadi */
export async function fetchRoute(from: LatLng, to: LatLng): Promise<Route | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const base of OSRM) {
      const r = await osrm(base, from, to);
      if (r) return r;
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  return null;
}

// Taxminiy yo'l: avval shimol–janub, keyin sharq–g'arb
export function fallbackRoute(from: LatLng, to: LatLng): Route {
  const path = [from, { latitude: to.latitude, longitude: from.longitude }, to];
  const distanceM = routeLengthKm(path) * 1000;
  return { path, distanceM, durationS: (distanceM / 1000 / CITY_SPEED_KMH) * 3600, real: false };
}

// Yo'lni qadamlarga bo'lish (har qadam — bitta GPS yangilanishi). Yo'lning hamma burilish nuqtalari saqlanadi —
// usta belgisi va chiziq hech qachon burchakni kesib o'tmaydi; uzun to'g'ri qismlar `stepM` dan oshmaydigan bo'laklarga bo'linadi,
// juda yaqin (≤ 2 m) nuqtalar birlashtiriladi.
export function resample(path: LatLng[], stepM: number): LatLng[] {
  if (path.length < 2) return path;
  const out: LatLng[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const a = out[out.length - 1];
    const b = path[i];
    const seg = distanceKm(a, b) * 1000;
    if (seg <= 2 && i < path.length - 1) continue;
    const n = Math.ceil(seg / stepM);
    for (let k = 1; k <= n; k++) {
      out.push({ latitude: a.latitude + ((b.latitude - a.latitude) * k) / n, longitude: a.longitude + ((b.longitude - a.longitude) * k) / n });
    }
  }
  return out;
}

// Haqiqiy yo'l kelguncha — null (chiziq chizilmaydi, ko'chadan chiqib ketgan chiziq ko'rinmaydi);
// `ROUTE_WAIT_MS` ichida kelmasa — taxminiy yo'l
export function useRoute(from: LatLng | undefined, to: LatLng | undefined) {
  const key = from && to ? `${from.latitude.toFixed(5)},${from.longitude.toFixed(5)}|${to.latitude.toFixed(5)},${to.longitude.toFixed(5)}` : '';
  const [route, setRoute] = useState<Route | null>(null);
  useEffect(() => {
    if (!from || !to) return;
    let alive = true;
    // Yangi joydan qayta hisoblashda eski haqiqiy yo'l yangisi kelguncha qoladi
    const wait = setTimeout(() => alive && setRoute((r) => (r?.real ? r : fallbackRoute(from, to))), ROUTE_WAIT_MS);
    fetchRoute(from, to).then((r) => {
      if (alive && r) setRoute(r);
    });
    return () => {
      alive = false;
      clearTimeout(wait);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return route;
}

// Qolgan yo'l bo'yicha daqiqa (yo'lning o'rtacha tezligi bilan)
export function remainingEtaMin(route: Route, remaining: LatLng[]) {
  const speed = route.durationS > 0 ? route.distanceM / route.durationS : CITY_SPEED_KMH / 3.6; // m/s
  const leftM = routeLengthKm(remaining) * 1000;
  return Math.max(1, Math.round(leftM / speed / 60));
}
