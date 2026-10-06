// Supabase ulanishi. Kalitlar .env dan: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY.
// Kalit yo'q bo'lsa `supabase` = null va ilova hozirgidek soxta (mahalliy) rejimda ishlaydi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
/** Eski nom (moslik uchun) */
export const isBackendReady = isSupabaseConfigured;

let client: SupabaseClient | null = null;

/** Mijoz faqat birinchi chaqirilganda yaratiladi; sozlanmagan bo'lsa — null */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        // Brauzerda localStorage (standart), telefonda AsyncStorage — kirish saqlanib qoladi
        storage: Platform.OS === 'web' ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    // Ilova ekranda bo'lganda tokenni yangilab turadi (Supabase'ning React Native tavsiyasi)
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', (state) => {
        if (state === 'active') client?.auth.startAutoRefresh();
        else client?.auth.stopAutoRefresh();
      });
    }
  }
  return client;
}

/** Qulaylik uchun: `supabase?.from(...)`. Modul yuklanganda emas, birinchi murojaatda yaratiladi */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? new Proxy({} as SupabaseClient, {
      get: (_t, prop) => {
        const c = getSupabase() as SupabaseClient;
        const v = Reflect.get(c, prop, c);
        return typeof v === 'function' ? v.bind(c) : v;
      },
    })
  : null;
