// Manzilni matn bo'yicha qidirish — butun O'zbekiston bo'ylab, foydalanuvchiga yaqinlari birinchi.
// Yandex kaliti bo'lsa — Yandex Geocoder (O'zbekiston ko'chalari to'liqroq), bo'lmasa yoki xato bo'lsa —
// bepul OpenStreetMap Nominatim (kalit shart emas, sekundiga 1 so'rovgacha).
import { distanceKm, type LatLng } from './geo';
import { getLanguage } from './i18n';
import { yandexSearch } from './yandex';

export type Place = { id: string; title: string; subtitle: string; location: LatLng; distanceKm?: number };

// Qidiruv avval foydalanuvchi atrofida (~30 km) olib boriladi, lekin butun O'zbekistondan ham topadi
const NEAR_DEG = 0.3;
const box = (p: LatLng) => [p.longitude - NEAR_DEG, p.latitude + NEAR_DEG, p.longitude + NEAR_DEG, p.latitude - NEAR_DEG].map((x) => x.toFixed(4)).join(',');
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

export async function searchAddress(query: string, near?: LatLng, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const ya = await yandexSearch(q, near, signal);
  if (ya?.length) {
    return ya
      .map((p) => ({ ...p, distanceKm: near ? distanceKm(near, p.location) : undefined }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }
  const lang = getLanguage();
  const url =
    `${NOMINATIM}?format=jsonv2&addressdetails=1&limit=8&countrycodes=uz${near ? `&viewbox=${box(near)}` : ''}` +
    `&accept-language=${lang === 'en' ? 'en' : lang === 'ru' ? 'ru' : 'uz,ru'}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { signal, headers: { 'User-Agent': 'UyService/0.1 (uyservice.uz)', Accept: 'application/json' } });
    if (!res.ok) return [];
    const rows: NominatimRow[] = await res.json();
    return rows.map((r) => toPlace(r, near)).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  } catch {
    return [];
  }
}

type NominatimRow = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: Record<string, string | undefined>;
};

function toPlace(r: NominatimRow, near?: LatLng): Place {
  const a = r.address ?? {};
  const street = [a.road ?? a.pedestrian ?? a.neighbourhood, a.house_number].filter(Boolean).join(', ');
  const title = r.name || street || r.display_name.split(',')[0];
  const subtitle = [street && street !== title ? street : null, a.suburb ?? a.city_district ?? a.quarter, a.city ?? a.town ?? a.village ?? a.state]
    .filter(Boolean)
    .join(', ');
  const location = { latitude: Number(r.lat), longitude: Number(r.lon) };
  return { id: String(r.place_id), title, subtitle, location, distanceKm: near ? distanceKm(near, location) : undefined };
}
