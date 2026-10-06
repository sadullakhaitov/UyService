// Supabase ulanishi — 5-bosqichda qo'shiladi (npx expo install @supabase/supabase-js).
// Kalitlar .env dan: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isBackendReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
