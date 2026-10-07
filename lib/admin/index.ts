// Admin panel ma'lumot manbai: server ulangan bo'lsa — Supabase, aks holda — sinov rejimi (shu brauzerda saqlanadi)
import { isSupabaseConfigured } from '@/lib/supabase';
import { demoAdmin } from './demo';
import { supabaseAdmin } from './supabase';
import type { AdminApi } from './types';

export const adminApi: AdminApi = isSupabaseConfigured ? supabaseAdmin : demoAdmin;
export * from './types';
