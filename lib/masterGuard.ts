import { notice } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useMaster, useMasterWork } from '@/store';

/** Usta rejimidan chiqish (mijoz rejimi, akkauntdan chiqish): faol ish bo'lsa — to'xtatamiz (mijoz kutib qolmasin),
 * aks holda avval oflayn qilamiz */
export function guardActiveJob(then: () => void) {
  if (useMasterWork.getState().job) {
    notice(t('profile.activeJobTitle'), t('profile.activeJobText'));
    return;
  }
  useMaster.getState().setOnline(false);
  then();
}
