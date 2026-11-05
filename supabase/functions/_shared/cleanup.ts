// Storage'dagi keraksiz fayllarni o'chirish (…_security_audit_3b.sql → storage_trash navbati):
// o'chirilgan hisobning papkalari ("<uid>/") va ustaning almashtirilgan pasport/selfi/surat/ish namunalari.
// offer-timeout (har 15 s) chaqiradi. Storage jadvalidan SQL bilan o'chirib bo'lmaydi — faqat Storage API.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type Row = { id: number; bucket: string; path: string; attempts: number };

export async function cleanupStorage(db: SupabaseClient, limit = 20): Promise<{ removed: number; failed: number }> {
  const { data, error } = await db.from('storage_trash').select('id, bucket, path, attempts').lt('attempts', 5).order('id').limit(limit);
  if (error) throw new Error(`storage_trash: ${error.message}`);
  let removed = 0;
  let failed = 0;
  const done: number[] = [];
  for (const r of (data ?? []) as Row[]) {
    try {
      let paths = [r.path];
      if (r.path.endsWith('/')) {
        const folder = r.path.slice(0, -1);
        const { data: list, error: le } = await db.storage.from(r.bucket).list(folder, { limit: 1000 });
        if (le) throw new Error(le.message);
        paths = (list ?? []).filter((f) => f.name).map((f) => `${folder}/${f.name}`);
      }
      if (paths.length) {
        const { error: re } = await db.storage.from(r.bucket).remove(paths);
        if (re) throw new Error(re.message);
      }
      removed += paths.length;
      done.push(r.id);
    } catch (e) {
      failed++;
      console.error('cleanup', r.bucket, (e as Error).message);
      await db.from('storage_trash').update({ attempts: r.attempts + 1 }).eq('id', r.id);
    }
  }
  if (done.length) await db.from('storage_trash').delete().in('id', done);
  return { removed, failed };
}
