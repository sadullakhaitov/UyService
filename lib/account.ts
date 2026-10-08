// Hisobni o'chirish (App Store talabi va shaxsiy ma'lumotlar qonuni): mijoz Profil'dan, usta Sozlamalar'dan.
// Server rejimida: o'z fayllari (Storage) o'chiriladi → delete_my_account (raqam, ism, hujjatlar, yozishmalar; kirish yopiladi)
// → telefondagi hamma narsa tozalanadi. Buyurtmalar tarixi serverda anonim qoladi (usta va hisob-kitob uchun).
import { router } from 'expo-router';
import { confirm, notice } from './dialog';
import { t } from './i18n';
import { track } from './track';
import { getSupabase } from './supabase';
import { logoutAll } from '@/store';

const BUCKETS = ['documents', 'works', 'order-photos'] as const;

async function removeMyFiles(uid: string) {
  const db = getSupabase();
  if (!db) return;
  for (const b of BUCKETS) {
    try {
      const { data } = await db.storage.from(b).list(uid, { limit: 1000 });
      const paths = (data ?? []).map((f) => `${uid}/${f.name}`);
      if (paths.length) await db.storage.from(b).remove(paths);
    } catch {
      // fayl qolsa ham hisob o'chiriladi — yo'li bazadan o'chadi, admin ko'rmaydi
    }
  }
}

/** Tasdiq so'raydi va o'chiradi. true — o'chirildi */
export async function deleteAccount(): Promise<boolean> {
  if (!(await confirm(t('account.deleteTitle'), t('account.deleteText'), t('account.deleteConfirm'), true))) return false;
  const db = getSupabase();
  if (db) {
    const { data } = await db.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) {
      const { error } = await db.rpc('delete_my_account');
      if (error) {
        const m = error.message ?? '';
        notice(
          t('account.deleteFailedTitle'),
          m.includes('active_orders') ? t('account.deleteActive') : m.includes('admin_self') ? t('account.deleteAdmin') : t('job.serverErrorText'),
        );
        return false;
      }
      track('account_deleted');
      await removeMyFiles(uid);
    }
  }
  logoutAll();
  router.replace('/client');
  notice(t('account.deletedTitle'), t('account.deletedText'));
  return true;
}
