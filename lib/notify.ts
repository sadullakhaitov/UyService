// Bildirishnomalar: "Usta topildi", "Usta yetib keldi", ustaga "Yangi buyurtma".
// Mahalliy (telefonning o'zida, ilova orqa fonda bo'lsa chiqadi) — sinov rejimida.
// Server ulanganda: serverdan push (lib/push.ts → profiles.push_token → supabase/functions/push-send).
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { t } from './i18n';
import { registerPush } from './push';

let ready: Promise<boolean> | null = null;

function setup() {
  if (Platform.OS === 'web') return Promise.resolve(false);
  ready ??= (async () => {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
      });
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
          name: t('notify.channel'),
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 150, 250],
          lightColor: '#0E5A4B',
        });
      }
      const cur = await Notifications.getPermissionsAsync();
      if (cur.granted) return true;
      if (!cur.canAskAgain) return false;
      const granted = (await Notifications.requestPermissionsAsync()).granted;
      // Ruxsat endi berildi — server ham shu telefonga yubora olsin
      if (granted) void registerPush(true);
      return granted;
    } catch {
      return false;
    }
  })();
  // Ruxsat berilmagan bo'lsa — keyingi safar yana tekshiramiz (sozlamalardan yoqilgan bo'lishi mumkin)
  const p = ready;
  p.then((ok) => {
    if (!ok && ready === p) ready = null;
  });
  return p;
}

/** Ruxsatni oldindan so'rash (birinchi buyurtma yoki onlayn chiqishda) */
export const askNotifications = () => void setup();

/** Ilova ekranda ochiq bo'lsa ko'rsatilmaydi — ekranning o'zi holatni ko'rsatib turadi */
export async function notify(title: string, body: string, { always = false, url }: { always?: boolean; url?: string } = {}) {
  if (Platform.OS === 'web') return;
  if (!always && AppState.currentState === 'active') return;
  if (!(await setup())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true, data: url ? { url } : {} },
      trigger: Platform.OS === 'android' ? { channelId: 'orders' } : null,
    });
  } catch {
    // bildirishnoma chiqmasa ham ilova ishlashda davom etadi
  }
}

/** Bildirishnoma bosilganda — tegishli ekran (buyurtma, taklif) ochiladi. Ildiz _layout'da bir marta ulanadi */
export function useNotificationTaps() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      const url = r.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as Href);
    });
    return () => sub.remove();
  }, []);
}
