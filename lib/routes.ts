// Yo'nalish va vaqt.
// Hozircha bepul OSRM (OpenStreetMap) xizmati: haqiqiy ko'chalar bo'ylab yo'l va vaqt.
// 7-bosqichda Supabase Edge Function orqali Google Routes API'ga almashtiriladi.
// Internet yo'q yoki xizmat javob bermasa — taxminiy (soxta) yo'l qaytariladi.
import { useEffect, useState } from 'react';
import { distanceKm, type LatLng } from './geo';

const OSRM = 'https://router.project-osrm.org/route/v1/driving';
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

export async function fetchRoute(from: LatLng, to: LatLng): Promise<Route | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const url = `${OSRM}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const json = await res.json();
    const r = json?.routes?.[0];
    const coords: [number, number][] | undefined = r?.geometry?.coordinates;
    if (!coords?.length) return null;
    const path = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
    // Yo'l aniq mijoz nuqtasida tugashi uchun
    path.push(to);
    return { path, distanceM: r.distance, durationS: r.duration, real: true };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Taxminiy yo'l: avval shimol–janub, keyin sharq–g'arb
export function fallbackRoute(from: LatLng, to: LatLng): Route {
  const path = [from, { latitude: to.latitude, longitude: from.longitude }, to];
  const distanceM = routeLengthKm(path) * 1000;
  return { path, distanceM, durationS: (distanceM / 1000 / CITY_SPEED_KMH) * 3600, real: false };
}

// Yo'lni teng qadamlarga bo'lish (har qadam — 5 s dagi bitta GPS yangilanishi)
export function resample(path: LatLng[], stepM: number): LatLng[] {
  if (path.length < 2) return path;
  const out: LatLng[] = [path[0]];
  let need = stepM; // keyingi nuqtagacha qolgan masofa
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const seg = distanceKm(a, b) * 1000;
    let pos = 0;
    while (seg - pos >= need) {
      pos += need;
      const k = pos / seg;
      out.push({ latitude: a.latitude + (b.latitude - a.latitude) * k, longitude: a.longitude + (b.longitude - a.longitude) * k });
      need = stepM;
    }
    need -= seg - pos;
  }
  const last = path[path.length - 1];
  const tail = out[out.length - 1];
  if (tail.latitude !== last.latitude || tail.longitude !== last.longitude) out.push(last);
  return out;
}

// Avval taxminiy yo'l, haqiqiysi kelganda almashtiriladi
export function useRoute(from: LatLng | undefined, to: LatLng | undefined) {
  const key = from && to ? `${from.latitude.toFixed(5)},${from.longitude.toFixed(5)}|${to.latitude.toFixed(5)},${to.longitude.toFixed(5)}` : '';
  const [route, setRoute] = useState<Route | null>(from && to ? fallbackRoute(from, to) : null);
  useEffect(() => {
    if (!from || !to) return;
    let alive = true;
    setRoute(fallbackRoute(from, to));
    fetchRoute(from, to).then((r) => {
      if (alive && r) setRoute(r);
    });
    return () => {
      alive = false;
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
