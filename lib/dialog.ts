// Xabar va tasdiqlash oynalari: telefonda — tizim oynasi (Alert), brauzerda — window.alert / window.confirm.
// React Native Web'da Alert.alert hech narsa qilmaydi — shuning uchun to'g'ridan-to'g'ri Alert ishlatmang.
import { Alert, Platform } from 'react-native';
import { t } from './i18n';

const join = (title: string, message?: string) => (message ? `${title}\n\n${message}` : title);

/** Ma'lumot oynasi (bitta "OK" tugmasi) */
export function notice(title: string, message?: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(join(title, message));
    return;
  }
  Alert.alert(title, message);
}

/** Tasdiqlash oynasi: true — foydalanuvchi rozi bo'ldi */
export function confirm(title: string, message: string, okText: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' ? window.confirm(join(title, message)) : false);
  return new Promise((resolve) =>
    Alert.alert(
      title,
      message,
      [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    ),
  );
}
