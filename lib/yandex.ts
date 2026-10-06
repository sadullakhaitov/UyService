// Yandex kaliti (.env → EXPO_PUBLIC_YANDEX_MAPS_KEY, git'ga yuklanmaydi). Bitta kalit: xarita (JS API) va HTTP Geocoder.
import type { LatLng } from './geo';
import { getLanguage } from './i18n';

export const YANDEX_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? '';
/** Kalitda HTTP Referer cheklovi bo'lsa — so'rovlar shu manzil nomidan yuboriladi */
const REFERER = 'https://uyservice.uz/';
const GEOCODER = 'https://geocode-maps.yandex.ru/1.x/';
// Toshkent atrofi: markaz va o'lcham (uzunlik, kenglik)
const TASHKENT = { ll: '69.2797,41.3111', spn: '0.45,0.3' };

export type YandexPlace = { id: string; title: string; subtitle: string; location: LatLng };

const lang = () => (getLanguage() === 'en' ? 'en_US' : getLanguage() === 'uz' ? 'uz_UZ' : 'ru_RU');

async function geocoder(params: Record<string, string>, signal?: AbortSignal): Promise<YandexPlace[] | null> {
  if (!YANDEX_KEY) return null;
  const q = new URLSearchParams({ apikey: YANDEX_KEY, format: 'json', lang: lang(), ...params });
  try {
    const res = await fetch(`${GEOCODER}?${q}`, { signal, headers: { Referer: REFERER } });
    if (!res.ok) return null;
    const json = await res.json();
    const members: { GeoObject: GeoObject }[] = json?.response?.GeoObjectCollection?.featureMember ?? [];
    return members.map(({ GeoObject: g }, i) => {
      const [lng, lat] = g.Point.pos.split(' ').map(Number);
      return { id: `${g.Point.pos}-${i}`, title: g.name, subtitle: g.description ?? '', location: { latitude: lat, longitude: lng } };
    });
  } catch {
    return null;
  }
}

type GeoObject = { name: string; description?: string; Point: { pos: string } };

/** Matn bo'yicha qidirish (Toshkent ichida). Kalit yo'q yoki xato bo'lsa — null (zaxira xizmat ishlatiladi) */
export const yandexSearch = (text: string, signal?: AbortSignal) =>
  geocoder({ geocode: text, ll: TASHKENT.ll, spn: TASHKENT.spn, rspn: '1', results: '8' }, signal);

/** Koordinatadan manzil (uy raqami bilan) */
export async function yandexReverse(p: LatLng): Promise<string | null> {
  const r = await geocoder({ geocode: `${p.longitude},${p.latitude}`, kind: 'house', results: '1' });
  return r?.[0]?.title ?? null;
}
