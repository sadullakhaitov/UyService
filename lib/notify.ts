// Bildirishnomalar: "Usta topildi", "Usta yetib keldi", ustaga "Yangi buyurtma".
// Hozir — mahalliy (telefonning o'zida, ilova orqa fonda bo'lsa chiqadi).
// 8-bosqichda: serverdan push (Expo push token → Supabase Edge Function).
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

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
          name: 'Buyurtmalar',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 150, 250],
          lightColor: '#0E5A4B',
        });
      }
      const cur = await Notifications.getPermissionsAsync();
      if (cur.granted) return true;
      if (!cur.canAskAgain) return false;
      return (await Notifications.requestPermissionsAsync()).granted;
    } catch {
      return false;
    }
  })();
  return ready;
}

/** Ruxsatni oldindan so'rash (birinchi buyurtma yoki onlayn chiqishda) */
export const askNotifications = () => void setup();

/** Ilova ekranda ochiq bo'lsa ko'rsatilmaydi — ekranning o'zi holatni ko'rsatib turadi */
export async function notify(title: string, body: string, { always = false }: { always?: boolean } = {}) {
  if (Platform.OS === 'web') return;
  if (!always && AppState.currentState === 'active') return;
  if (!(await setup())) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: Platform.OS === 'android' ? { channelId: 'orders' } : null,
    });
  } catch {
    // bildirishnoma chiqmasa ham ilova ishlashda davom etadi
  }
}
