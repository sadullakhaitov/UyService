// Ustaning joylashuvi serverga (har 5 s, lib/masterFeed.ts). Sinov rejimida — faqat telefonda (useLocationLog).
import type { LatLng } from '@/lib/geo';
import { useLocationLog } from '@/store';
import { LIVE } from './live';
import { getSupabase } from './supabase';

/** master_locations.upsert — PostGIS `location` ustuni bazada o'zi hisoblanadi */
async function publishLocation(p: LatLng) {
  const db = getSupabase();
  if (!db) return;
  const { data } = await db.auth.getSession();
  const masterId = data.session?.user.id;
  if (!masterId) return;
  const { error } = await db.from('master_locations').upsert({ master_id: masterId, lat: p.latitude, lng: p.longitude });
  if (error) console.warn('master_locations', error.message);
}

export function publishMasterLocation(p: LatLng) {
  useLocationLog.getState().record(p);
  if (LIVE) void publishLocation(p);
}
