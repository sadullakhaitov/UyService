// Google Routes so'rovlari. Hozircha soxta: o'rtacha shahar tezligi bo'yicha hisob.
// 7-bosqichda Supabase Edge Function orqali haqiqiy Routes API'ga ulanadi.
import { distanceKm, type LatLng } from './geo';

const CITY_SPEED_KMH = 22;

export function estimateEtaMin(from: LatLng, to: LatLng) {
  const roadKm = distanceKm(from, to) * 1.35; // to'g'ri chiziq → ko'cha bo'ylab
  return Math.max(3, Math.round((roadKm / CITY_SPEED_KMH) * 60));
}

export function routeLengthKm(path: LatLng[]) {
  let sum = 0;
  for (let i = 1; i < path.length; i++) sum += distanceKm(path[i - 1], path[i]);
  return sum;
}
