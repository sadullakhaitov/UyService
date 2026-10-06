import { useEffect } from 'react';
import { create } from 'zustand';
import { useUser } from '@/store';
import type { LatLng } from './geo';
import { getCurrentLocation, getQuickLocation, requestLocationPermission } from './location';

export type LocStatus = 'idle' | 'locating' | 'found' | 'denied' | 'failed';

// Telefonning haqiqiy joyi — butun ilova uchun bitta (ekranlar almashganda qayta so'ralmaydi)
const useGeo = create<{ loc: LatLng | null; status: LocStatus }>(() => ({ loc: null, status: 'idle' }));

let started = false;
const found = (p: LatLng) => {
  useGeo.setState({ loc: p, status: 'found' });
  // Keyingi ochilishda xarita darhol shu joydan boshlanadi
  useUser.getState().setLastLocation(p);
};

/** Joyni aniqlash: avval tez (oxirgi ma'lum joy), keyin aniq GPS. Takror chaqirilsa — qayta oladi */
export async function locateMe(): Promise<LatLng | null> {
  if (useGeo.getState().status !== 'found') useGeo.setState({ status: 'locating' });
  if ((await requestLocationPermission()) !== 'granted') {
    useGeo.setState({ status: 'denied' });
    return null;
  }
  const quick = started && useGeo.getState().loc ? null : await getQuickLocation();
  started = true;
  if (quick) found(quick);
  const exact = await getCurrentLocation();
  if (exact) found(exact);
  else if (!quick && !useGeo.getState().loc) useGeo.setState({ status: 'failed' });
  return exact ?? quick ?? useGeo.getState().loc;
}

// Telefonning haqiqiy joylashuvi (ruxsat bo'lmasa — null, ilova oxirgi ma'lum manzil bilan davom etadi)
export function useMyLocation() {
  const loc = useGeo((s) => s.loc);
  useEffect(() => {
    if (!started) locateMe();
  }, []);
  return loc;
}

/** Joy aniqlanmoqdami, ruxsat berilmadimi — bosh sahifadagi ishora uchun */
export const useLocStatus = () => useGeo((s) => s.status);
