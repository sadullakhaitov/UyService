// Ulashish: telefonda — tizim oynasi (Telegram, SMS...), brauzerda "ulashish" bo'lmasa — matn nusxalanadi
import { Platform, Share } from 'react-native';
import { notice } from './dialog';
import { t } from './i18n';

export async function copyText(text: string) {
  if (Platform.OS === 'web' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      notice(t('invite.copied'));
      return;
    } catch {
      // ruxsat yo'q — quyida ulashish oynasi
    }
  }
  try {
    await Share.share({ message: text });
  } catch {
    // bekor qilindi
  }
}

export async function shareText(message: string) {
  if (Platform.OS === 'web' && !(navigator as Navigator & { share?: unknown }).share) return copyText(message);
  try {
    await Share.share({ message });
  } catch {
    // foydalanuvchi bekor qildi
  }
}
