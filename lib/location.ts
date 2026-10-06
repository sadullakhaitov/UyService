import * as Location from 'expo-location';
import type { LatLng } from './geo';

// Joriy joylashuv; ruxsat bo'lmasa yoki xato bo'lsa — null (ilova soxta manzil bilan davom etadi)
export async function getCurrentLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}

// Koordinatadan manzil matni
export async function reverseGeocode(p: LatLng): Promise<string | null> {
  try {
    const [r] = await Location.reverseGeocodeAsync(p);
    if (!r) return null;
    const street = [r.street, r.streetNumber].filter(Boolean).join(', ');
    return street || r.district || r.city || null;
  } catch {
    return null;
  }
}
