// Server rejimi (Supabase kaliti bor — `LIVE`): buyurtmalar, takliflar va ish bosqichlari serverda.
// Ekranlar o'sha store'lar bilan ishlayveradi (useOrders, useMasterWork, useMaster) — bu yerdagi hook'lar
// serverdagi holatni store'ga olib keladi, amallar esa serverga yoziladi.
// Jonli yangilanish: Realtime (o'zgarish kelsa darhol qayta o'qiladi) + har bir necha soniyada so'rov (zaxira —
// Realtime uzilsa ham ilova to'xtab qolmaydi). Sinov rejimida (kalit yo'q) bu fayl ishlatilmaydi.
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { feePercent } from '@/constants/billing';
import type { CategoryId } from '@/constants/categories';
import { DISPATCH } from '@/constants/dispatch';
import type { DispatchState } from '@/lib/dispatch';
import { distanceKm, type LatLng } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { notify } from '@/lib/notify';
import { notice } from '@/lib/dialog';
import { fetchRoute, resample } from '@/lib/routes';
import { useChats, useHistory, useMaster, useMasterWork, useOrders, useUser, type ActiveOrder, type AddressDetails, type ChatMessage, type MasterOrder, type OrderMaster } from '@/store';
import { getSupabase, isSupabaseConfigured } from './supabase';
import type { HistoryItem } from '@/mocks';

export const LIVE = isSupabaseConfigured;

/** Mijoz ekranida yangilanish oralig'i (Realtime bo'lmasa ham) */
const CLIENT_POLL_MS = 4000;
const HOT_POLL_MS = 2000;
const MASTER_POLL_MS = 3000;
/** Usta yo'ldan shuncha uzoqlashsa — yo'l qayta hisoblanadi */
const REROUTE_M = 150;
const STEP_M = 12;

const db = () => getSupabase()!;

async function myId(): Promise<string | null> {
  const { data } = await db().auth.getSession();
  return data.session?.user.id ?? null;
}

const errText = (e: unknown) =>
  e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);

/** Supabase xatosi bo'lsa — Error */
function must<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw new Error(errText(r.error));
  return r.data;
}

// ---------- Fayllar ----------

/** Telefon/brauzerdagi rasmni Storage'ga yuklaydi, "<uid>/<fayl>" yo'lini qaytaradi (xato bo'lsa — null) */
export async function uploadPhoto(bucket: 'documents' | 'works' | 'order-photos', uri: string, name: string): Promise<string | null> {
  try {
    const uid = await myId();
    if (!uid) return null;
    const blob = await (await fetch(uri)).blob();
    const path = `${uid}/${name}-${Date.now()}.jpg`;
    const { error } = await db().storage.from(bucket).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
    return error ? null : path;
  } catch {
    return null;
  }
}

/** Ochiq (works) rasm manzili */
// ---------- Mijoz ----------

type OrderRow = {
  id: string;
  status: ActiveOrder['status'];
  master_id: string | null;
  dispatch: DispatchState | null;
  call_fee: number;
  price_status: ActiveOrder['priceStatus'];
  price_work: number | null;
  price_parts: number | null;
  scheduled_at: string | null;
  lat: number;
  lng: number;
  cancel_reason: string | null;
  cancelled_by: string | null;
};
const ORDER_COLS = 'id, status, master_id, dispatch, call_fee, price_status, price_work, price_parts, scheduled_at, lat, lng, cancel_reason, cancelled_by';

/** Server qatori → mijoz store'idagi buyurtma (yo'l, usta kartasi alohida) */
export function orderPatch(row: OrderRow, cur?: ActiveOrder): Partial<ActiveOrder> {
  const work = row.price_work ?? 0;
  const parts = row.price_parts ?? 0;
  // 'assigned' — usta tayinlandi, hali yo'lga chiqmadi: mijoz uchun "yo'lda" bilan bir xil
  const status = row.status === 'assigned' ? 'on_the_way' : row.status;
  const patch: Partial<ActiveOrder> = {
    status,
    masterId: row.master_id,
    none: row.dispatch?.done === 'none',
    priceStatus: row.price_status,
    work,
    parts,
    finalPrice: row.status === 'completed' ? (row.price_status === 'approved' ? work + parts : row.call_fee) : null,
  };
  if (row.dispatch) patch.dispatch = row.dispatch;
  if (cur && cur.status !== status) patch.phaseAt = Date.now();
  return patch;
}

/** "Usta chaqirish": buyurtma serverda yaratiladi (rasmlar Storage'ga), qidiruv boshlanadi. Server id'sini qaytaradi */
/** Uy tafsiloti ustunlari — faqat to'ldirilganlari (bo'sh bo'lsa ustun yuborilmaydi: server hali yangilanmagan bo'lsa ham buyurtma ketadi) */
function detailCols(d: AddressDetails | undefined) {
  const out: Record<string, string> = {};
  if (!d) return out;
  for (const k of ['entrance', 'floor', 'apartment', 'intercom', 'landmark'] as const) {
    const v = d[k].trim();
    if (v) out[k] = v;
  }
  return out;
}

export async function liveCreateOrder(d: {
  categoryId: CategoryId;
  problemId: string;
  description: string;
  photos: string[];
  address: string;
  location: LatLng;
  preferredMasterId: string | null;
  scheduledAt: number | null;
  details?: AddressDetails;
}): Promise<string> {
  const uid = await myId();
  if (!uid) throw new Error('not_signed_in');
  const photos = (await Promise.all(d.photos.map((p, i) => uploadPhoto('order-photos', p, `order-${i}`)))).filter(Boolean) as string[];
  const row = must(
    await db()
      .from('orders')
      .insert({
        client_id: uid,
        category_id: d.categoryId,
        // "Boshqa" — serverdagi katalogda yo'q, null bo'lib saqlanadi (o'qishda yana 'other')
        problem_id: d.problemId && d.problemId !== 'other' ? d.problemId : null,
        description: d.description || null,
        photos,
        address: d.address,
        lat: d.location.latitude,
        lng: d.location.longitude,
        preferred_master_id: d.preferredMasterId,
        scheduled_at: d.scheduledAt ? new Date(d.scheduledAt).toISOString() : null,
        ...detailCols(d.details),
      })
      .select('id')
      .single(),
  ) as { id: string };
  if (!d.scheduledAt) await db().functions.invoke('dispatch', { body: { order_id: row.id } });
  return row.id;
}

type HistoryRow = {
  id: string; category_id: CategoryId; problem_id: string | null; master_id: string | null; address: string | null;
  status: 'completed' | 'cancelled'; price_status: string; price_work: number | null; price_parts: number | null; call_fee: number;
  cancel_reason: string | null; cancelled_by: string | null; completed_at: string | null; updated_at: string;
};

/**
 * Buyurtmalar tarixi serverdan (oxirgi 50 ta): telefon almashsa yoki Telegram'dan saytga o'tilsa ham yo'qolmaydi.
 * Shu telefonda yozilgani bilan birlashadi (server ustun; mahalliy izoh/baho saqlanadi).
 */
export async function liveSyncHistory() {
  const uid = await myId();
  if (!uid) return;
  const { data } = await db()
    .from('orders')
    .select('id, category_id, problem_id, master_id, address, status, price_status, price_work, price_parts, call_fee, cancel_reason, cancelled_by, completed_at, updated_at')
    .eq('client_id', uid)
    .in('status', ['completed', 'cancelled'])
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = (data ?? []) as HistoryRow[];
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);
  const masterIds = [...new Set(rows.map((r) => r.master_id).filter(Boolean))] as string[];
  const [rev, cards] = await Promise.all([
    db().from('reviews').select('order_id, stars, tags, comment').in('order_id', ids),
    masterIds.length ? db().from('master_cards').select('id, first_name, last_name').in('id', masterIds) : Promise.resolve({ data: [] }),
  ]);
  const reviews = new Map(((rev.data ?? []) as { order_id: string; stars: number; tags: string[]; comment: string | null }[]).map((r) => [r.order_id, r]));
  const names = new Map(((cards.data ?? []) as { id: string; first_name: string; last_name: string }[]).map((c) => [c.id, `${c.first_name} ${c.last_name}`.trim()]));
  const local = new Map(useHistory.getState().items.map((i) => [i.id, i]));
  const server: HistoryItem[] = rows.map((r) => {
    const l = local.get(r.id);
    const rv = reviews.get(r.id);
    const approved = r.price_status === 'approved';
    return {
      id: r.id,
      categoryId: r.category_id,
      problemId: r.problem_id ?? 'other',
      masterId: r.master_id,
      masterName: (r.master_id && names.get(r.master_id)) || l?.masterName,
      at: Date.parse(r.completed_at ?? r.updated_at),
      price: approved ? (r.price_work ?? 0) + (r.price_parts ?? 0) : r.status === 'completed' ? r.call_fee : 0,
      status: r.status,
      inspectionOnly: r.status === 'completed' && !approved ? true : undefined,
      address: r.address ?? undefined,
      stars: rv?.stars ?? l?.stars,
      tags: rv?.tags ?? l?.tags,
      comment: rv?.comment ?? l?.comment,
      cancelReason:
        r.status !== 'cancelled' ? undefined : r.cancel_reason === 'client_absent' ? 'clientAbsent' : r.cancelled_by === 'admin' ? 'byAdmin' : (r.cancel_reason ?? l?.cancelReason),
    };
  });
  const serverIds = new Set(ids);
  const rest = useHistory.getState().items.filter((i) => !serverIds.has(i.id));
  useHistory.setState({ items: [...server, ...rest].sort((a, b) => b.at - a.at) });
}

export type ReportKind = 'warranty' | 'overcharge' | 'quality' | 'no_show_master' | 'other';

/** Mijoz murojaati (muammo yoki kafolat): order_reports + qo'llab-quvvatlash chatiga yoziladi. Xato kodi Error.message'da */
export async function liveReportOrder(orderId: string, kind: ReportKind, text: string) {
  const { error } = await db().rpc('report_order', { p_order: orderId, p_kind: kind, p_text: text });
  if (error) {
    const m = errText(error);
    throw new Error(['warranty_expired', 'text_required', 'too_many_open', 'already_open'].find((k) => m.includes(k)) ?? m);
  }
}

/** "Qayta urinish" yoki rejalashtirilganni "Hozir qidirish" */
export async function liveRestartSearch(id: string) {
  await db().functions.invoke('dispatch', { body: { order_id: id, restart: true } });
}

export async function liveCancelOrder(id: string, reason: string) {
  must(await db().from('orders').update({ status: 'cancelled', cancel_reason: reason }).eq('id', id));
}

export async function liveRespondPrice(id: string, approve: boolean) {
  must(await db().rpc('respond_price', { p_order: id, p_approve: approve }));
}

export async function liveRate(orderId: string, masterId: string, stars: number, tags: string[], comment?: string) {
  const uid = await myId();
  if (!uid) return;
  await db().from('reviews').insert({ order_id: orderId, client_id: uid, master_id: masterId, stars, tags, comment: comment || null });
}

/** Usta kartasi: ism, reyting, ishlar (master_cards) + telefon (faol buyurtmada profiles ochiq) */
export async function fetchMasterCard(masterId: string): Promise<OrderMaster | null> {
  const [card, prof] = await Promise.all([
    db().from('master_cards').select('id, first_name, last_name, experience_years, rating, jobs_count, verified').eq('id', masterId).maybeSingle(),
    db().from('profiles').select('phone').eq('id', masterId).maybeSingle(),
  ]);
  const c = card.data as { first_name: string; last_name: string; experience_years: number; rating: number | string; jobs_count: number; verified: boolean } | null;
  if (!c) return null;
  const name = `${c.first_name} ${c.last_name}`.trim();
  return {
    id: masterId,
    name,
    initials: name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '—',
    // Hali ish bajarmagan usta — baho yo'q ("—"), serverdagi boshlang'ich 5.00 emas
    rating: c.jobs_count > 0 ? Number(c.rating) : 0,
    jobsCount: c.jobs_count,
    onTimePercent: -1,
    experienceYears: c.experience_years,
    phone: (prof.data as { phone?: string } | null)?.phone ?? '',
    verified: c.verified,
  };
}

export type MasterInfo = Omit<OrderMaster, 'phone'> & { categories: CategoryId[] };
export type MasterReview = { id: string; author: string; stars: number; text: string; tags: string[]; at: number };

/** "Usta haqida": karta va ochiq sharhlar (master_cards, master_reviews) */
export async function fetchMasterInfo(masterId: string): Promise<{ master: MasterInfo | null; reviews: MasterReview[] }> {
  const [card, revs] = await Promise.all([
    db().from('master_cards').select('first_name, last_name, experience_years, categories, rating, jobs_count, verified').eq('id', masterId).maybeSingle(),
    db().from('master_reviews').select('id, stars, tags, comment, created_at, author').eq('master_id', masterId).order('created_at', { ascending: false }).limit(50),
  ]);
  const c = card.data as { first_name: string; last_name: string; experience_years: number; categories: CategoryId[]; rating: number | string; jobs_count: number; verified: boolean } | null;
  const name = c ? `${c.first_name} ${c.last_name}`.trim() : '';
  return {
    master: c
      ? {
          id: masterId,
          name,
          initials: name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '—',
          rating: c.jobs_count > 0 ? Number(c.rating) : 0,
          jobsCount: c.jobs_count,
          onTimePercent: -1,
          experienceYears: c.experience_years,
          verified: c.verified,
          categories: c.categories,
        }
      : null,
    reviews: ((revs.data ?? []) as { id: string; stars: number; tags: string[]; comment: string | null; created_at: string; author: string | null }[]).map((r) => ({
      id: r.id,
      author: r.author ?? '—',
      stars: r.stars,
      text: r.comment ?? '',
      tags: r.tags,
      at: Date.parse(r.created_at),
    })),
  };
}

/** Ustaning jonli joyi → mijoz xaritasidagi belgi va yo'l (yo'l 150 m chetlashganda qayta olinadi) */
async function followMaster(o: ActiveOrder, here: LatLng) {
  const update = useOrders.getState().update;
  const start = o.path[0];
  const offRoute = !o.routeReady || !start || nearestIndex(o.path, here).dist > REROUTE_M;
  if (!offRoute) {
    const { index } = nearestIndex(o.path, here);
    if (index !== o.step) update(o.id, { step: index, phaseAt: Date.now() });
    return;
  }
  // Yo'l kelguncha usta belgisi joyida turadi
  if (!o.path.length || distanceKm(o.path[o.step] ?? here, here) * 1000 > 30) update(o.id, { path: [here], step: 0, routeReady: false });
  const r = await fetchRoute(here, o.location);
  if (!r) return;
  update(o.id, { path: resample(r.path, STEP_M), step: 0, routeReady: true, speed: r.distanceM / Math.max(60, r.durationS), phaseAt: Date.now() });
}

function nearestIndex(path: LatLng[], p: LatLng) {
  let index = 0;
  let dist = Infinity;
  path.forEach((q, i) => {
    const d = distanceKm(q, p) * 1000;
    if (d < dist) {
      dist = d;
      index = i;
    }
  });
  return { index, dist };
}

// Mijoz o'zi biror amal qilganda (narxga javob, bekor qilish) — keyingi so'rovni kutmasdan darhol yangilash
const refreshers = new Set<() => void>();
export function refreshOrdersNow() {
  refreshers.forEach((f) => f());
}
// Mijoz amali serverga ketayotganda shu buyurtmaning eski server holati ekranga qaytib "sakramasin"
const held = new Set<string>();
export function holdOrder(id: string, on: boolean) {
  if (on) held.add(id);
  else held.delete(id);
}

/** Mijozning faol buyurtmalari serverdan (client/_layout'da bir marta) */
export function useLiveOrders() {
  const ids = useOrders((s) => s.orders.map((o) => o.id).join(','));
  const busy = useRef(false);
  useEffect(() => {
    if (!LIVE || !ids) return;
    const list = ids.split(',');
    const refresh = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const { data } = await db().from('orders').select(ORDER_COLS).in('id', list);
        for (const row of (data ?? []) as OrderRow[]) {
          const cur = useOrders.getState().orders.find((o) => o.id === row.id);
          if (!cur || held.has(row.id)) continue;
          // Serverda yopildi (admin bekor qildi yoki usta kelib eshik ochilmadi) — faol buyurtmalardan tarixga
          if (row.status === 'cancelled' && row.cancelled_by !== 'client') {
            const absent = row.cancel_reason === 'client_absent';
            useHistory.getState().add({
              id: row.id,
              categoryId: cur.categoryId,
              problemId: cur.problemId,
              masterId: row.master_id ?? cur.masterId,
              masterName: cur.master?.name,
              at: Date.now(),
              price: 0,
              status: 'cancelled',
              address: cur.address,
              cancelReason: absent ? 'clientAbsent' : 'byAdmin',
            });
            useOrders.getState().remove(row.id);
            const title = t(absent ? 'notify.absentTitle' : 'notify.adminCancelTitle');
            const body = t(absent ? 'notify.absentBody' : 'notify.adminCancelBody');
            notify(title, body, { url: '/client/history' });
            notice(title, body);
            continue;
          }
          // Usta bekor qildi — server buyurtmani qidiruvga qaytardi: usta kartasi va yo'l olib tashlanadi, qidiruv darhol
          if (cur.masterId && !row.master_id && row.status === 'searching') {
            useOrders.getState().update(row.id, { requeued: true, master: undefined, path: [], step: 0, routeReady: false });
            notify(t('notify.requeuedTitle'), t('notify.requeuedBody'), { url: `/client/searching?id=${row.id}` });
            void db().functions.invoke('dispatch', { body: { order_id: row.id } });
          }
          useOrders.getState().update(row.id, orderPatch(row, cur));
          if (!cur.doorCode || cur.doorCode === '----') {
            const code = await db().rpc('order_door_code', { p_order: row.id });
            if (typeof code.data === 'string') useOrders.getState().update(row.id, { doorCode: code.data });
          }
          if (row.master_id && cur.master?.id !== row.master_id) {
            const card = await fetchMasterCard(row.master_id);
            if (card) useOrders.getState().update(row.id, { master: card });
          }
          if (row.master_id && (row.status === 'on_the_way' || row.status === 'assigned' || row.status === 'arrived')) {
            const loc = await db().from('master_locations').select('lat, lng').eq('master_id', row.master_id).maybeSingle();
            const l = loc.data as { lat: number; lng: number } | null;
            const fresh = useOrders.getState().orders.find((o) => o.id === row.id);
            if (l && fresh) await followMaster(fresh, { latitude: l.lat, longitude: l.lng });
          }
        }
      } catch {
        // tarmoq — keyingi safar
      } finally {
        busy.current = false;
      }
    };
    void refresh();
    refreshers.add(refresh);
    // Usta yetib kelgan / narx kutilayotgan paytda tezroq (Realtime ishlamasa ham kechikish sezilmasin)
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const loop = () => {
      if (stopped) return;
      const hot = useOrders.getState().orders.some((o) => o.status === 'arrived' || o.status === 'in_progress' || o.status === 'on_the_way');
      timer = setTimeout(() => void refresh().finally(loop), hot ? HOT_POLL_MS : CLIENT_POLL_MS);
    };
    loop();
    const ch = db()
      .channel(`orders-${ids}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=in.(${list.join(',')})` }, () => void refresh())
      .subscribe();
    return () => {
      stopped = true;
      clearTimeout(timer);
      refreshers.delete(refresh);
      void db().removeChannel(ch);
    };
  }, [ids]);
}

// ---------- Usta ----------

type MasterRow = {
  verify_status: 'none' | 'pending' | 'approved' | 'rejected';
  balance: number;
  rating: number | string;
  jobs_count: number;
  activity: number;
  priority_points: number;
  subscription_until: string | null;
  billing_plan: 'subscription' | 'commission' | null;
};

/** Ustaning serverdagi holati (balans, reyting, hujjat) → useMaster */
export async function syncMaster() {
  const uid = await myId();
  if (!uid) return;
  const { data } = await db()
    .from('masters')
    .select('verify_status, balance, rating, jobs_count, activity, priority_points, subscription_until, billing_plan')
    .eq('id', uid)
    .maybeSingle();
  const m = data as MasterRow | null;
  if (!m) return;
  const st = useMaster.getState();
  const rated = m.jobs_count > 0;
  useMaster.setState({
    balance: m.balance,
    verified: m.verify_status === 'approved',
    profile: { ...st.profile, status: m.verify_status },
    rating: rated ? Number(m.rating) : null,
    jobsDone: m.jobs_count,
    activity: m.activity,
    priorityPoints: m.priority_points,
    subscriptionUntil: m.subscription_until ? Date.parse(m.subscription_until) : 0,
  });
  if (m.billing_plan && useUser.getState().billingPlan !== m.billing_plan) useUser.setState({ billingPlan: m.billing_plan });
}

/** Anketa (master/register): masters qatori + rasmlar Storage'ga */
export async function liveSubmitMaster() {
  const uid = await myId();
  if (!uid) throw new Error('not_signed_in');
  const { profile } = useMaster.getState();
  const [photo, passport, selfie, ...works] = await Promise.all([
    profile.photo ? uploadPhoto('works', profile.photo, 'avatar') : null,
    profile.passportPhoto ? uploadPhoto('documents', profile.passportPhoto, 'passport') : null,
    profile.selfie ? uploadPhoto('documents', profile.selfie, 'selfie') : null,
    ...profile.works.map((w, i) => uploadPhoto('works', w, `work-${i}`)),
  ]);
  const row = {
    id: uid,
    first_name: profile.firstName,
    last_name: profile.lastName,
    experience_years: profile.experienceYears,
    categories: profile.categories,
    photo_path: photo,
    passport_path: passport,
    selfie_path: selfie,
    works: works.filter(Boolean),
    billing_plan: useUser.getState().billingPlan,
  };
  const exists = (await db().from('masters').select('verify_status').eq('id', uid).maybeSingle()).data as { verify_status: string } | null;
  // Hujjat holati: yangi anketada pasport bo'lsa — tekshiruvga; mavjud (masalan, tasdiqlangan) holatni o'zgartirmaymiz
  if (!exists) must(await db().from('masters').insert({ ...row, verify_status: passport ? 'pending' : 'none' }));
  else must(await db().from('masters').update(row).eq('id', uid));
  await db().from('profiles').update({ role: 'master', name: `${profile.firstName} ${profile.lastName}`.trim() }).eq('id', uid);
}

/** Promokod (Profil → Promokod). Xato: Error('invalid' | 'used' | 'expired') */
export async function liveRedeemPromo(code: string): Promise<{ priority: number; bonus: number }> {
  const { data, error } = await db().rpc('redeem_promo', { p_code: code });
  if (error) {
    const c = (error as { code?: string }).code;
    throw new Error(c === '23505' ? 'used' : c === '22023' ? 'expired' : 'invalid');
  }
  void syncMaster();
  const r = data as { priority: number; bonus: number };
  return { priority: r.priority ?? 0, bonus: r.bonus ?? 0 };
}

/** Anketada do'stning taklif kodi. Qaytaradi: taklif qilgan ustaning ismi */
export async function liveApplyInvite(code: string): Promise<string> {
  const { data, error } = await db().rpc('apply_invite_code', { p_code: code });
  if (error) throw new Error(errText(error));
  return String(data ?? '');
}

/** "Do'stni taklif qilish": mening kodim va natija */
export async function liveMyInvites(): Promise<{ code: string; invited: number; paid: number } | null> {
  const { data } = await db().rpc('my_invites');
  const r = (data as { code: string; invited: number; paid: number }[] | null)?.[0];
  return r?.code ? r : null;
}

export async function liveSetPlan(plan: 'subscription' | 'commission') {
  const uid = await myId();
  if (uid) await db().from('masters').update({ billing_plan: plan }).eq('id', uid);
}

export async function liveSetOnline(online: boolean) {
  const uid = await myId();
  if (uid) await db().from('masters').update({ online }).eq('id', uid);
}

type OfferRow = { order_id: string; sent_at: string; expires_at: string; eta_min: number | null; distance_km: number | null };
type OfferOrderRow = { id: string; category_id: CategoryId; problem_id: string | null; description: string | null; address: string | null; lat: number; lng: number };

/** Taklif (offers + orders) → useMasterWork.offer. Mijoz ismi va telefoni qabul qilgandan keyin ochiladi */
function offerToMasterOrder(f: OfferRow, o: OfferOrderRow): MasterOrder {
  // 60 s taymer telefon soati bo'yicha; soatlar biroz farq qilsa ham taymer 0…60 s oralig'ida qoladi
  const ttl = DISPATCH.offerTimeoutSec * 1000;
  const age = Math.min(ttl, Math.max(0, Date.now() - Date.parse(f.sent_at)));
  const sentAt = Date.now() - age;
  return {
    id: o.id,
    categoryId: o.category_id,
    problemId: o.problem_id ?? 'other',
    description: o.description ?? '',
    address: o.address ?? '',
    location: { latitude: o.lat, longitude: o.lng },
    clientName: '',
    clientPhone: '',
    distanceKm: f.distance_km ?? 0,
    etaMin: f.eta_min ?? 0,
    sentAt,
    // Kodni usta bilmaydi — mijozdan so'raydi, server tekshiradi (verify_door_code)
    doorCode: '',
  };
}

/** Usta: takliflar, joriy ish va o'z holati serverdan (master/_layout'da bir marta) */
export function useLiveMasterFeed() {
  const online = useMaster((s) => s.online);
  const offerId = useMasterWork((s) => s.offer?.id);
  const jobId = useMasterWork((s) => s.job?.id);

  // O'z holati: ochilganda va har daqiqada (admin tasdiqladi, balans to'ldirildi...)
  useEffect(() => {
    if (!LIVE) return;
    void syncMaster();
    const t = setInterval(() => void syncMaster(), 60_000);
    return () => clearInterval(t);
  }, []);

  // Onlayn holati serverga
  useEffect(() => {
    if (LIVE) void liveSetOnline(online);
  }, [online]);

  // Yangi taklif
  useEffect(() => {
    if (!LIVE || !online || offerId || jobId) return;
    let stop = false;
    const check = async () => {
      const uid = await myId();
      if (!uid || stop) return;
      const { data } = await db()
        .from('offers')
        .select('order_id, sent_at, expires_at, eta_min, distance_km')
        .eq('master_id', uid)
        .eq('status', 'sent')
        .gt('expires_at', new Date().toISOString())
        .order('sent_at', { ascending: false })
        .limit(1);
      const f = (data as OfferRow[] | null)?.[0];
      if (!f || stop) return;
      const o = (await db().from('orders').select('id, category_id, problem_id, description, address, lat, lng').eq('id', f.order_id).maybeSingle()).data as OfferOrderRow | null;
      if (!o || stop || useMasterWork.getState().offer || useMasterWork.getState().job) return;
      useMasterWork.getState().setOffer(offerToMasterOrder(f, o));
      router.push('/master/offer');
    };
    void check();
    const t = setInterval(check, MASTER_POLL_MS);
    const ch = db()
      .channel('my-offers')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'offers' }, () => void check())
      .subscribe();
    return () => {
      stop = true;
      clearInterval(t);
      void db().removeChannel(ch);
    };
  }, [online, offerId, jobId]);

  // Joriy ish: mijoz narxga javob berdi / bekor qildi
  useEffect(() => {
    if (!LIVE || !jobId) return;
    const check = async () => {
      const { data, error } = await db().from('orders').select('status, price_status, price_work, price_parts, call_fee').eq('id', jobId).maybeSingle();
      const o = data as { status: string; price_status: string; price_work: number | null; price_parts: number | null; call_fee: number } | null;
      const job = useMasterWork.getState().job;
      if (error || !job || job.id !== jobId) return;
      // Buyurtma endi bu ustaniki emas (bekor qilingan / boshqa ustaga o'tgan) yoki mijoz bekor qildi
      if ((!o || o.status === 'cancelled') && job.stage !== 'completed') {
        useMasterWork.getState().finishJob();
        router.replace('/master');
        return;
      }
      if (!o) return;
      if (job.priceStatus === 'sent' && o.price_status === 'approved') useMasterWork.getState().updateJob({ priceStatus: 'approved', stage: 'in_progress' });
      if (job.priceStatus === 'sent' && o.price_status === 'declined') {
        // Mijoz rozi bo'lmadi — server buyurtmani faqat chaqiruv bilan yopdi
        const fee = o.call_fee;
        const cut = Math.round((fee * job.feePercent) / 100);
        useMaster.getState().addIncome(fee - cut);
        useMasterWork.getState().updateJob({ priceStatus: 'declined', stage: 'completed', total: fee });
        void syncMaster();
      }
    };
    void check();
    const t = setInterval(check, HOT_POLL_MS); // faol ish — mijoz javobi tez ko'rinsin
    const ch = db()
      .channel(`job-${jobId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${jobId}` }, () => void check())
      .subscribe();
    return () => {
      clearInterval(t);
      void db().removeChannel(ch);
    };
  }, [jobId]);
}

/** Taklifga javob. Qabul qilinsa — mijoz ismi, telefoni va ulush foizi (qabul paytida qotirilgan) bilan ish boshlanadi */
export async function liveRespondOffer(accept: boolean): Promise<boolean> {
  const offer = useMasterWork.getState().offer;
  if (!offer) return false;
  const { data, error } = await db().functions.invoke('offer-respond', { body: { order_id: offer.id, accept } });
  if (!accept || error || !data?.accepted) {
    useMasterWork.getState().setOffer(null);
    void syncMaster();
    return false;
  }
  const o = (await db().from('orders').select('client_id, address, fee_percent').eq('id', offer.id).maybeSingle()).data as {
    client_id: string;
    address: string | null;
    fee_percent: number | null;
  } | null;
  const client = o ? ((await db().from('profiles').select('name, phone').eq('id', o.client_id).maybeSingle()).data as { name: string | null; phone: string | null } | null) : null;
  // Uy tafsiloti alohida so'rov: ustunlar yo'q (server yangilanmagan) bo'lsa ham qabul qilish ishlaydi
  const extra = (await db().from('orders').select('entrance, floor, apartment, intercom, landmark').eq('id', offer.id).maybeSingle()).data as Partial<
    Record<'entrance' | 'floor' | 'apartment' | 'intercom' | 'landmark', string | null>
  > | null;
  const details = extra
    ? { entrance: extra.entrance ?? '', floor: extra.floor ?? '', apartment: extra.apartment ?? '', intercom: extra.intercom ?? '', landmark: extra.landmark ?? '' }
    : undefined;
  useMasterWork.getState().setOffer({ ...offer, address: o?.address ?? offer.address, details, clientName: client?.name ?? '', clientPhone: client?.phone ?? '' });
  const pct = o?.fee_percent ?? feePercent(useUser.getState().billingPlan ?? 'commission', useMaster.getState().verified);
  useMasterWork.getState().acceptOffer(pct);
  return true;
}

/** Ish bosqichlari (master/job) */
export const liveJob = {
  arrived: async (id: string) => must(await db().from('orders').update({ status: 'arrived' }).eq('id', id)),
  /** true — to'g'ri, false — noto'g'ri; urinishlar ko'p bo'lsa Error('locked') */
  verifyCode: async (id: string, code: string): Promise<boolean> => {
    const { data, error } = await db().rpc('verify_door_code', { p_order: id, p_code: code });
    if (error) throw new Error((error as { code?: string }).code === '54000' ? 'locked' : errText(error));
    return data === true;
  },
  proposePrice: async (id: string, work: number, parts: number) => must(await db().rpc('propose_price', { p_order: id, p_work: work, p_parts: parts })),
  /** Ish tugadi yoki "Faqat ko'rik" */
  complete: async (id: string) => {
    must(await db().from('orders').update({ status: 'completed' }).eq('id', id));
    void syncMaster();
  },
  /** Yetib keldi, mijoz eshikni ochmadi: buyurtma to'lovsiz yopiladi, aktivlik kamaymaydi (master_client_absent) */
  clientAbsent: async (id: string) => {
    must(await db().rpc('master_client_absent', { p_order: id }));
    void syncMaster();
  },
  /** Usta bekor qildi: buyurtma yopilmaydi — server uni keyingi ustaga o'tkazadi (aktivlik −10) */
  cancel: async (id: string, reason: string) => {
    must(await db().rpc('master_cancel_order', { p_order: id, p_reason: reason }));
    void syncMaster();
  },
};

// ---------- Chat ----------

/** Chat id → server manzili: "order-<id>" (mijoz) / "job-<id>" (usta) — buyurtma chati, "support" — qo'llab-quvvatlash */
function chatTarget(chatId: string, uid: string): { order_id: string } | { support_user_id: string } | null {
  if (chatId === 'support') return { support_user_id: uid };
  const m = /^(order|job)-(.+)$/.exec(chatId);
  return m ? { order_id: m[2] } : null;
}

/** Ochiq chat oynasi serverdan (Realtime + har 3 s); yangiliklar kanali mahalliy */
export function useLiveChat(chatId: string | undefined) {
  useEffect(() => {
    if (!LIVE || !chatId) return;
    let stop = false;
    const refresh = async () => {
      const uid = await myId();
      const target = uid ? chatTarget(chatId, uid) : null;
      if (!uid || !target || stop) return;
      let q = db().from('chat_messages').select('id, sender_id, text, created_at').order('created_at').limit(300);
      q = 'order_id' in target ? q.eq('order_id', target.order_id) : q.eq('support_user_id', target.support_user_id);
      const { data } = await q;
      if (stop || !data) return;
      const msgs: ChatMessage[] = (data as { id: string; sender_id: string; text: string; created_at: string }[]).map((m) => ({
        id: m.id,
        mine: m.sender_id === uid,
        text: m.text,
        at: Date.parse(m.created_at),
      }));
      useChats.getState().setServerMessages(chatId, msgs);
    };
    void refresh();
    const t = setInterval(refresh, MASTER_POLL_MS);
    const ch = db()
      .channel(`chat-${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => void refresh())
      .subscribe();
    return () => {
      stop = true;
      clearInterval(t);
      void db().removeChannel(ch);
    };
  }, [chatId]);
}

/** Xabar yuborish (server rejimi). false — yuborilmadi */
export async function liveSendMessage(chatId: string, text: string): Promise<boolean> {
  const uid = await myId();
  const target = uid ? chatTarget(chatId, uid) : null;
  if (!uid || !target) return false;
  const { error } = await db().from('chat_messages').insert({ ...target, sender_id: uid, text });
  return !error;
}
