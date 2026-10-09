// Manzilni matn bo'yicha qidirish — butun O'zbekiston bo'ylab, foydalanuvchiga yaqinlari birinchi. Hammasi OpenStreetMap, bepul, kalitsiz:
// Photon (komoot) — yozish davomida qidirishga mo'ljallangan; javob bo'lmasa — Nominatim (sekundiga 1 so'rovgacha).
import { distanceKm, type LatLng } from './geo';
import { getLanguage } from './i18n';

export type Place = { id: string; title: string; subtitle: string; location: LatLng; distanceKm?: number };

// Qidiruv avval foydalanuvchi atrofida (~30 km) olib boriladi, lekin butun O'zbekistondan ham topadi
const NEAR_DEG = 0.3;
const box = (p: LatLng) => [p.longitude - NEAR_DEG, p.latitude + NEAR_DEG, p.longitude + NEAR_DEG, p.latitude - NEAR_DEG].map((x) => x.toFixed(4)).join(',');
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const PHOTON = 'https://photon.komoot.io/api/';
// O'zbekiston chegarasi (uzunlik, kenglik): min, min, max, max
const UZ_BBOX = '55.99,37.17,73.14,45.59';

export async function searchAddress(query: string, near?: LatLng, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const ph = await photon(q, near, signal);
  if (ph?.length) return ph.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  if (signal?.aborted) return [];
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

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: Record<string, string | number | undefined>;
};

async function photon(q: string, near: LatLng | undefined, signal?: AbortSignal): Promise<Place[] | null> {
  const params = new URLSearchParams({ q, limit: '8', bbox: UZ_BBOX });
  if (near) {
    params.set('lat', String(near.latitude));
    params.set('lon', String(near.longitude));
  }
  // Photon tillari: default (mahalliy nom), en, de, fr
  if (getLanguage() === 'en') params.set('lang', 'en');
  try {
    const res = await fetch(`${PHOTON}?${params}`, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json: { features?: PhotonFeature[] } = await res.json();
    return (json.features ?? [])
      .filter((f) => !f.properties.countrycode || f.properties.countrycode === 'UZ')
      .map((f, i) => {
        const a = f.properties;
        const street = [a.street, a.housenumber].filter(Boolean).join(', ');
        const title = String(a.name || street || a.city || '');
        const subtitle = [street && street !== title ? street : null, a.district ?? a.locality, a.city ?? a.county ?? a.state].filter(Boolean).join(', ');
        const location = { latitude: f.geometry.coordinates[1], longitude: f.geometry.coordinates[0] };
        return { id: `${a.osm_type ?? ''}${a.osm_id ?? i}`, title, subtitle, location, distanceKm: near ? distanceKm(near, location) : undefined };
      })
      .filter((p) => p.title);
  } catch {
    return null;
  }
}
