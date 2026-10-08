// O'z statistikamiz va xatolar jurnali (uchinchi tomon xizmatisiz): Supabase → app_events / app_errors.
// Faqat server rejimida yoziladi; hech qachon ilovani to'xtatmaydi (xato bo'lsa jim). Admin → "Statistika".
// Shaxsiy ma'lumot yozilmaydi: qurilma — tasodifiy id, props — faqat kategoriya, sabab kabi qisqa qiymatlar.
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getSupabase } from './supabase';

export type TrackEvent =
  | 'app_open' | 'order_open' | 'order_submit' | 'phone_open' | 'signed_in' | 'order_created' | 'order_failed'
  | 'no_master' | 'order_completed' | 'rated' | 'master_register_open' | 'master_registered' | 'master_online'
  | 'report_sent' | 'account_deleted';

const KEY = 'uyservice-device';
let device: string | null = null;
async function deviceId() {
  if (device) return device;
  try {
    device = await AsyncStorage.getItem(KEY);
    if (!device) {
      device = `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      await AsyncStorage.setItem(KEY, device);
    }
  } catch {
    device = device ?? `d${Math.random().toString(36).slice(2, 14)}`;
  }
  return device;
}

function platform(): 'web' | 'ios' | 'android' | 'telegram' {
  if (Platform.OS !== 'web') return Platform.OS === 'ios' ? 'ios' : 'android';
  const w = globalThis as { Telegram?: { WebApp?: { initData?: string } } };
  return w.Telegram?.WebApp?.initData ? 'telegram' : 'web';
}

async function uid() {
  const db = getSupabase();
  if (!db) return null;
  const { data } = await db.auth.getSession();
  return data.session?.user.id ?? null;
}

/** Voronka hodisasi (masalan, track('order_created', { category: 'plumber' })) */
export function track(name: TrackEvent, props: Record<string, string | number | boolean> = {}) {
  const db = getSupabase();
  if (!db) return;
  void (async () => {
    try {
      await db.from('app_events').insert({ device: await deviceId(), user_id: await uid(), name, props, platform: platform() });
    } catch {
      // statistika ilovani hech qachon to'xtatmaydi
    }
  })();
}

const sent = new Set<string>();
/** Ekran yoki dastur xatosi; bir xil xato bir ochilishda bir marta yuboriladi */
export function logError(error: unknown, screen?: string) {
  const db = getSupabase();
  if (!db) return;
  const e = error instanceof Error ? error : new Error(String(error));
  const message = (e.message || String(error)).slice(0, 500);
  const key = `${message}|${screen ?? ''}`;
  if (sent.has(key)) return;
  sent.add(key);
  void (async () => {
    try {
      await db.from('app_errors').insert({
        device: await deviceId(),
        user_id: await uid(),
        message,
        stack: e.stack?.slice(0, 4000) ?? null,
        screen: screen?.slice(0, 200) ?? null,
        platform: platform(),
        version: String(Constants.expoConfig?.version ?? '').slice(0, 40) || null,
      });
    } catch {
      // jim
    }
  })();
}

/** Ildiz _layout'da bir marta: ilova ochildi + ushlanmagan xatolar (brauzer va telefon) */
export function installErrorLogging() {
  track('app_open');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (ev) => logError(ev.error ?? ev.message, window.location.pathname));
    window.addEventListener('unhandledrejection', (ev) => logError(ev.reason, window.location.pathname));
    return;
  }
  const g = globalThis as { ErrorUtils?: { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void } };
  const prev = g.ErrorUtils?.getGlobalHandler();
  g.ErrorUtils?.setGlobalHandler((e, fatal) => {
    logError(e, fatal ? 'fatal' : 'global');
    prev?.(e, fatal);
  });
}
