// Har bir foydalanuvchining qisqa ID raqami (5-noyabr): profilda "ID 10234", admin panelda ham shu raqam bo'yicha topiladi.
// Server — profiles.short_id (…_user_short_id.sql), 10001 dan boshlab ketma-ket, o'zgarmaydi.
// Sinov rejimida server yo'q — raqamdan hisoblangan doimiy son (bir xil raqamga har doim bir xil ID).
import { useEffect, useState } from 'react';
import { DEMO } from './demo';
import { getSupabase } from './supabase';
import { useUser } from '@/store';

/** "ID 10234" */
export const fmtUserId = (n: number | null | undefined) => (n ? `ID ${n}` : '');

/** Sinov rejimi: satrdan 10001…99999 oralig'idagi doimiy son */
export function demoUserId(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return 10001 + (h % 89999);
}

let cache: { uid: string; id: number } | null = null;

/** Kirgan foydalanuvchining ID raqami (mehmonda — null) */
export function useMyUserId(): number | null {
  const phone = useUser((s) => s.phone);
  const [id, setId] = useState<number | null>(() => (DEMO ? (phone ? demoUserId(phone) : null) : cache?.id ?? null));

  useEffect(() => {
    if (!phone) return setId(null);
    if (DEMO) return setId(demoUserId(phone));
    const db = getSupabase();
    if (!db) return;
    let alive = true;
    (async () => {
      const { data: s } = await db.auth.getSession();
      const uid = s.session?.user.id;
      if (!uid) return;
      if (cache?.uid === uid) return alive && setId(cache.id);
      const { data } = await db.from('profiles').select('short_id').eq('id', uid).maybeSingle();
      const n = (data as { short_id?: number } | null)?.short_id;
      if (n) {
        cache = { uid, id: n };
        if (alive) setId(n);
      }
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [phone]);

  return id;
}
