// Serverdan push-bildirishnomalar: Expo push tokeni profiles.push_token ga yoziladi (til va "Yangi buyurtma"
// sozlamasi bilan birga). Server shu token orqali yuboradi (supabase/functions/push-send, migrations/*_push.sql).
// Supabase ulanmagan, foydalanuvchi kirmagan, brauzer yoki EAS projectId yo'q bo'lsa — hech narsa qilmaydi
// (bildirishnomalar mahalliy, lib/notify.ts).
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { getSupabase } from './supabase';

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return Constants.easConfig?.projectId ?? extra?.eas?.projectId ?? null;
}

let last = '';
// Til va "Yangi buyurtma" sozlamasi — usePushRegistration beradi (store'ni bu yerda import qilmaymiz: aylana bog'lanish)
let prefs = { language: 'uz', notifyOffers: true };

/** Tokenni serverga yozadi (o'zgarmagan bo'lsa qayta yozmaydi). Ruxsat bo'lmasa — so'ramaydi (lib/notify.ts so'raydi) */
export async function registerPush(force = false) {
  const db = getSupabase();
  const pid = projectId();
  if (!db || !pid || Platform.OS === 'web') return;
  try {
    const { data } = await db.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: pid })).data;
    const row = { push_token: token, language: prefs.language, notify_offers: prefs.notifyOffers };
    const key = `${uid}|${JSON.stringify(row)}`;
    if (!force && key === last) return;
    const { error } = await db.from('profiles').update(row).eq('id', uid);
    if (!error) last = key;
  } catch {
    // push bo'lmasa ham ilova ishlaydi — keyingi ochilishda qayta urinadi
  }
}

/** Chiqishda: bu telefonga boshqa foydalanuvchining xabarlari kelmasin */
export async function unregisterPush() {
  const db = getSupabase();
  if (!db) return;
  try {
    const { data } = await db.auth.getSession();
    const uid = data.session?.user.id;
    if (uid) await db.from('profiles').update({ push_token: null }).eq('id', uid);
  } catch {
    // tarmoq yo'q — server o'lik tokenni keyinroq o'zi tozalaydi
  }
  last = '';
}

/** Ildiz _layout'da: ochilganda, kirganda, til yoki sozlama o'zgarganda, token yangilanganda */
export function usePushRegistration(language: string | null, notifyOffers: boolean) {
  useEffect(() => {
    prefs = { language: language ?? 'uz', notifyOffers };
    void registerPush();
  }, [language, notifyOffers]);
  useEffect(() => {
    const db = getSupabase();
    if (!db || Platform.OS === 'web') return;
    const auth = db.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') void registerPush(true);
    });
    const tokens = Notifications.addPushTokenListener(() => void registerPush(true));
    return () => {
      auth.data.subscription.unsubscribe();
      tokens.remove();
    };
  }, []);
}
