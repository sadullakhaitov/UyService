// Edge Function'lar uchun umumiy yordamchilar (Deno).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** service_role bilan ulanish — RLS'dan tashqarida, faqat server ichida */
export function adminClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY topilmadi');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** So'rov yuborgan foydalanuvchi (Authorization: Bearer <access token>) yoki null */
export async function requestUserId(db: SupabaseClient, req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}

/** pg_cron / pg_net chaqiruvi: `x-cron-secret: <CRON_SECRET>` yoki `Authorization: Bearer <service_role key>` */
export function isCronRequest(req: Request) {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean((cronSecret && req.headers.get('x-cron-secret') === cronSecret) || (serviceKey && bearer === serviceKey));
}

export async function isAdmin(db: SupabaseClient, userId: string) {
  const { data } = await db.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role === 'admin';
}

export async function readJson<T>(req: Request): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}
