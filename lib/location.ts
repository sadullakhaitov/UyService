import * as Location from 'expo-location';
import { Platform } from 'react-native';
import type { LatLng } from './geo';
import { getLanguage } from './i18n';
import { yandexReverse } from './yandex';

export type LocPermission = 'granted' | 'denied';

const toLatLng = (c: { latitude: number; longitude: number }): LatLng => ({ latitude: c.latitude, longitude: c.longitude });

// Brauzer: navigator.geolocation to'g'ridan-to'g'ri (ruxsat oynasi shu chaqiruvda chiqadi)
function webPosition(opts: PositionOptions): Promise<LatLng | null> {
  return new Promise((resolve) => {
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) return resolve(null);
    geo.getCurrentPosition(
      (p) => resolve(toLatLng(p.coords)),
      () => resolve(null),
      opts,
    );
  });
}

/** Ruxsat so'raladi (bir marta oyna chiqadi). Brauzerda ruxsat joylashuvni so'raganda beriladi */
export async function requestLocationPermission(): Promise<LocPermission> {
  if (Platform.OS === 'web') return 'granted';
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

/**
 * Tez birinchi joy: telefon oxirgi bilgan joy (darhol, 10 daqiqagacha eski bo'lishi mumkin).
 * Brauzerda — keshdagi joy (maximumAge), aniq joy keyin `getCurrentLocation` bilan keladi.
 */
export async function getQuickLocation(): Promise<LatLng | null> {
  if (Platform.OS === 'web') return webPosition({ enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 6000 });
  try {
    const p = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000, requiredAccuracy: 300 });
    return p ? toLatLng(p.coords) : null;
  } catch {
    return null;
  }
}

// Joriy (aniq) joylashuv; ruxsat bo'lmasa yoki xato bo'lsa — null
export async function getCurrentLocation(): Promise<LatLng | null> {
  if (Platform.OS === 'web') return webPosition({ enableHighAccuracy: true, maximumAge: 15_000, timeout: 15_000 });
  try {
    if ((await requestLocationPermission()) !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return toLatLng(pos.coords);
  } catch {
    return null;
  }
}

// OpenStreetMap (Nominatim) — kalit kerak emas, brauzerda ham ishlaydi
async function osmReverse(p: LatLng): Promise<string | null> {
  try {
    const q = new URLSearchParams({ format: 'jsonv2', lat: String(p.latitude), lon: String(p.longitude), zoom: '18', addressdetails: '1', 'accept-language': getLanguage() });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q}`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const a = (await res.json())?.address ?? {};
    const street = [a.road ?? a.pedestrian ?? a.neighbourhood, a.house_number].filter(Boolean).join(', ');
    return street || a.suburb || a.city_district || a.city || a.town || a.village || null;
  } catch {
    return null;
  }
}

// Koordinatadan manzil matni: Yandex (kalit bo'lsa) → telefonning o'z xizmati → OpenStreetMap
export async function reverseGeocode(p: LatLng): Promise<string | null> {
  const ya = await yandexReverse(p);
  if (ya) return ya;
  if (Platform.OS !== 'web') {
    try {
      const [r] = await Location.reverseGeocodeAsync(p);
      const street = r ? [r.street, r.streetNumber].filter(Boolean).join(', ') : '';
      const name = street || r?.district || r?.city;
      if (name) return name;
    } catch {
      // zaxira xizmatga o'tamiz
    }
  }
  return osmReverse(p);
}
