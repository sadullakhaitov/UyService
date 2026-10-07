// E2E sinovlar uchun umumiy: PostgREST'ni Supabase'dagidek /rest/v1 ostida ochadi va service_role bilan ulanadi.
// Ishga tushirish — supabase/tests/run.sh (PostgREST kerak: https://github.com/PostgREST/postgrest/releases).
import { createClient } from 'npm:@supabase/supabase-js@2';

const PGRST = Deno.env.get('PGRST_URL') ?? 'http://127.0.0.1:54330';
const PORT = Number(Deno.env.get('E2E_PORT') ?? 54331);

const SECRET = Deno.env.get('PGRST_JWT_SECRET') ?? 'super-secret-jwt-token-with-at-least-32-characters-long';
const b64u = (b: Uint8Array | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export async function jwt(payload: Record<string, unknown>) {
  const head = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 3600 }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${head}.${body}`)));
  return `${head}.${body}.${b64u(sig)}`;
}

// /rest/v1/* → PostgREST
export const proxy = Deno.serve({ port: PORT, onListen() {} }, async (req) => {
  const u = new URL(req.url);
  const target = `${PGRST}${u.pathname.replace(/^\/rest\/v1/, '')}${u.search}`;
  const headers = new Headers(req.headers);
  headers.delete('host');
  const res = await fetch(target, { method: req.method, headers, body: req.body ? await req.arrayBuffer() : undefined });
  const buf = await res.arrayBuffer();
  return new Response(res.status === 204 || res.status === 304 ? null : buf, { status: res.status, headers: res.headers });
});

const service = await jwt({ role: 'service_role' });
export const db = createClient(`http://127.0.0.1:${PORT}`, service, { auth: { persistSession: false, autoRefreshToken: false } });

export function check(cond: unknown, msg: string, extra?: unknown) {
  if (!cond) {
    console.error('FAIL:', msg, extra ?? '');
    Deno.exit(1);
  }
  console.log('PASS:', msg);
}
