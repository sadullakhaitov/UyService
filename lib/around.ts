// Atrofdagi ustalar va "Mening ustalarim" — sinov rejimida soxta (mocks), server rejimida haqiqiy:
// masters_around (onlayn ustalar, ~100 m aniqlikda, faqat joy va kategoriya) va master_cards (sevimli usta).
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CategoryId } from '@/constants/categories';
import { distanceKm, type LatLng } from './geo';
import { getSupabase } from './supabase';
import { mastersAround, mockMasters } from '@/mocks';

export type AroundMaster = { location: LatLng; categories: CategoryId[] };
export type FavoriteMaster = { id: string; name: string; initials: string; rating: number; categories: CategoryId[] };

const REFRESH_MS = 20_000;
const MOVE_KM = 0.2;

/** Atrofdagi onlayn ustalar (3 km). Server rejimida har 20 s va joy 200 m dan ko'p o'zgarganda yangilanadi */
export function useMastersAround(location: LatLng, radiusKm = 3): AroundMaster[] {
  const db = getSupabase();
  const demo = useMemo(
    () => (db ? [] : mastersAround(location).filter((m) => distanceKm(m.location, location) < radiusKm)),
    [db, location, radiusKm],
  );
  const [live, setLive] = useState<AroundMaster[]>([]);
  const at = useRef<LatLng | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!db) return;
    const id = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(id);
  }, [db]);
  const moved = !at.current || distanceKm(at.current, location) > MOVE_KM;
  const key = moved ? `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}` : 'same';
  useEffect(() => {
    if (!db) return;
    at.current = location;
    let alive = true;
    void db
      .rpc('masters_around', { p_lat: location.latitude, p_lng: location.longitude, p_radius_km: radiusKm })
      .then(({ data }) => {
        if (!alive || !Array.isArray(data)) return;
        setLive((data as { lat: number; lng: number; categories: CategoryId[] }[]).map((r) => ({ location: { latitude: r.lat, longitude: r.lng }, categories: r.categories })));
      });
    return () => {
      alive = false;
    };
  }, [db, key, tick, radiusKm]); // eslint-disable-line react-hooks/exhaustive-deps
  return db ? live : demo;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '—';

/** "Mening ustalarim"dagi eng oxirgi qo'shilgan usta (server rejimida — master_cards; sinovdagi eski id'lar e'tiborsiz) */
export function useFavoriteMaster(favorites: string[]): FavoriteMaster | undefined {
  const db = getSupabase();
  const lastId = db ? [...favorites].reverse().find((id) => UUID.test(id)) : undefined;
  const [card, setCard] = useState<FavoriteMaster | undefined>();
  useEffect(() => {
    if (!db || !lastId) return setCard(undefined);
    let alive = true;
    void db
      .from('master_cards')
      .select('id, first_name, last_name, rating, jobs_count, categories')
      .eq('id', lastId)
      .maybeSingle()
      .then(({ data }) => {
        const c = data as { id: string; first_name: string; last_name: string; rating: number | string; jobs_count: number; categories: CategoryId[] } | null;
        if (!alive) return;
        if (!c || !c.first_name || !c.categories?.length) return setCard(undefined);
        const name = `${c.first_name} ${c.last_name}`.trim();
        setCard({ id: c.id, name, initials: initialsOf(name), rating: c.jobs_count > 0 ? Number(c.rating) : 0, categories: c.categories });
      });
    return () => {
      alive = false;
    };
  }, [db, lastId]);
  if (!db) return [...favorites].reverse().map((id) => mockMasters.find((m) => m.id === id)).find(Boolean);
  return card;
}
