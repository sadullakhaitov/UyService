// Sinov rejimi: server (Supabase) ulanmagan — ustalar, takliflar va buyurtmalar namunaviy (simulyator).
// Bu rejimda ilova tepasida doim "Sinov rejimi" yozuvi turadi va demo tugmalar ko'rinadi;
// server ulanishi bilan (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY) hammasi o'zi yo'qoladi.
import { isSupabaseConfigured } from './supabase';

export const DEMO = !isSupabaseConfigured;
