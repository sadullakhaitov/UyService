// Supabase'ga yozish/chaqirish — keyinroq ekranlarga ulanadi (hozir lib/backend.ts va soxta simulyator ishlaydi).
// Supabase sozlanmagan bo'lsa hamma funksiya { ok: false, error: 'not_configured' } qaytaradi.
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from './geo';
import { getSupabase } from './supabase';

export type ApiResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const notConfigured = { ok: false, error: 'not_configured' } as const;
const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String(e.message) : String(e),
});

async function uid() {
  const { data } = await getSupabase()!.auth.getSession();
  return data.session?.user.id ?? null;
}

export type NewOrder = {
  categoryId: CategoryId;
  problemId: string | null;
  description: string;
  /** Storage yo'llari: order-photos/<client_id>/<fayl> ichidagi "<client_id>/<fayl>" */
  photos: string[];
  address: string;
  location: LatLng;
  preferredMasterId: string | null;
  /** ms; null — "Hozir kerak" */
  scheduledAt: number | null;
};

/** Buyurtma yaratadi va (hozir kerak bo'lsa) usta qidirishni boshlaydi */
export async function createOrder(o: NewOrder): Promise<ApiResult<{ id: string }>> {
  const db = getSupabase();
  if (!db) return notConfigured;
  try {
    const clientId = await uid();
    if (!clientId) return { ok: false, error: 'not_signed_in' };
    const { data, error } = await db
      .from('orders')
      .insert({
        client_id: clientId,
        category_id: o.categoryId,
        problem_id: o.problemId,
        description: o.description || null,
        photos: o.photos,
        address: o.address,
        lat: o.location.latitude,
        lng: o.location.longitude,
        preferred_master_id: o.preferredMasterId,
        scheduled_at: o.scheduledAt ? new Date(o.scheduledAt).toISOString() : null,
      })
      .select('id')
      .single();
    if (error) return fail(error);
    if (!o.scheduledAt) await db.functions.invoke('dispatch', { body: { order_id: data.id } });
    return { ok: true, data: { id: data.id as string } };
  } catch (e) {
    return fail(e);
  }
}

/** "Hozir bo'sh usta yo'q" → "Qayta urinish" */
export async function retryDispatch(orderId: string): Promise<ApiResult> {
  const db = getSupabase();
  if (!db) return notConfigured;
  const { error } = await db.functions.invoke('dispatch', { body: { order_id: orderId, restart: true } });
  return error ? fail(error) : { ok: true, data: undefined };
}

/** Usta taklifga javob beradi; qabul qilinsa `accepted: true` */
export async function respondOffer(orderId: string, accept: boolean): Promise<ApiResult<{ accepted: boolean }>> {
  const db = getSupabase();
  if (!db) return notConfigured;
  const { data, error } = await db.functions.invoke('offer-respond', { body: { order_id: orderId, accept } });
  if (error) return fail(error);
  return { ok: true, data: { accepted: Boolean(data?.accepted) } };
}

/** Ustaning joylashuvi (har 5 s, lib/backend.ts → publishMasterLocation) */
export async function publishLocation(p: LatLng, heading?: number): Promise<ApiResult> {
  const db = getSupabase();
  if (!db) return notConfigured;
  const masterId = await uid();
  if (!masterId) return { ok: false, error: 'not_signed_in' };
  const { error } = await db
    .from('master_locations')
    .upsert({ master_id: masterId, lat: p.latitude, lng: p.longitude, heading: heading ?? null });
  return error ? fail(error) : { ok: true, data: undefined };
}

/** Buyurtma chatiga xabar */
export async function sendMessage(orderId: string, text: string): Promise<ApiResult> {
  const db = getSupabase();
  if (!db) return notConfigured;
  const senderId = await uid();
  if (!senderId) return { ok: false, error: 'not_signed_in' };
  const { error } = await db.from('chat_messages').insert({ order_id: orderId, sender_id: senderId, text });
  return error ? fail(error) : { ok: true, data: undefined };
}
