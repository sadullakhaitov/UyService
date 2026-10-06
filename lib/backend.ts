// Serverga yoziladigan hamma narsa shu yerdan o'tadi. Hozir — telefonning o'zida (soxta);
// 5-bosqichda shu funksiyalar ichi Supabase chaqiruvlariga almashtiriladi, ekranlar o'zgarmaydi.
import type { LatLng } from '@/lib/geo';
import { useLocationLog } from '@/store';

/**
 * Ustaning joylashuvi (har 5 s). 5-bosqichda:
 * lib/api.ts → publishLocation(): master_locations.upsert({ master_id, lat, lng, heading }) — PostGIS `location` ustuni bazada o'zi hisoblanadi
 */
export function publishMasterLocation(p: LatLng) {
  useLocationLog.getState().record(p);
}
