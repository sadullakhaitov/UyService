export type LatLng = { latitude: number; longitude: number };

const R = 6371; // km

export function distanceKm(a: LatLng, b: LatLng) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Shimoldan soat yo'nalishi bo'yicha gradus
export function bearing(a: LatLng, b: LatLng) {
  const y = Math.sin(toRad(b.longitude - a.longitude)) * Math.cos(toRad(b.latitude));
  const x =
    Math.cos(toRad(a.latitude)) * Math.sin(toRad(b.latitude)) -
    Math.sin(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.cos(toRad(b.longitude - a.longitude));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export const lerp = (a: LatLng, b: LatLng, k: number): LatLng => ({
  latitude: a.latitude + (b.latitude - a.latitude) * k,
  longitude: a.longitude + (b.longitude - a.longitude) * k,
});

// Xavfsizlik: atrofdagi ustalarni ~100 m aniqlikda ko'rsatish
export function blur(p: LatLng, meters = 100): LatLng {
  const step = meters / 111_000;
  return {
    latitude: Math.round(p.latitude / step) * step,
    longitude: Math.round(p.longitude / step) * step,
  };
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;
