// Serverga yoziladigan hamma narsa shu yerdan o'tadi. Hozir — telefonning o'zida (soxta);
// 5-bosqichda shu funksiyalar ichi Supabase chaqiruvlariga almashtiriladi, ekranlar o'zgarmaydi.
import type { LatLng } from '@/lib/geo';
import { useLocationLog } from '@/store';

/**
 * Ustaning joylashuvi (har 5 s). 5-bosqichda:
 * supabase.from('master_locations').upsert({ master_id, location: `POINT(${lng} ${lat})`, updated_at: now() })
 */
export function publishMasterLocation(p: LatLng) {
  useLocationLog.getState().record(p);
}
