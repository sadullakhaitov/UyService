// Admin panel — haqiqiy server (Supabase). Ro'yxatlar admin_* ko'rinishlaridan, amallar admin_* RPC'lardan
// (supabase/migrations/…_admin.sql): huquq, chegaralar va jurnal serverda tekshiriladi.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CategoryId } from '@/constants/categories';
import { getSupabase } from '@/lib/supabase';
import {
  ACTIVE_STATUSES,
  AdminError,
  type AdminApi,
  type AdminMaster,
  type AdminOrder,
  type AdminReview,
  type AdminUser,
  type BalanceOp,
  type LivePoint,
  type LogEntry,
  type Stats,
} from './types';
import { checkBalance, checkCallFee, checkPriceRange, checkPriority, checkReason, checkSubscription, clean, normalizePhone, RULES } from './rules';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ms = (v: unknown) => (v ? new Date(v as string).getTime() : null);
const num = (v: unknown) => (v == null ? null : Number(v));
const DOCS = 'documents';
const WORKS = 'works';
const ORDER_PHOTOS = 'order-photos';
const SIGNED_SEC = 3600;

function fail(e: { code?: string; message?: string } | null | undefined): never {
  const code = e?.code;
  const key = code === '42501' ? 'errors.forbidden' : code === '22023' ? 'errors.invalid' : code === 'P0002' ? 'errors.notFound' : 'errors.server';
  throw new AdminError(key, e?.message);
}

function db(): SupabaseClient {
  const c = getSupabase();
  if (!c) throw new AdminError('errors.server', 'not_configured');
  return c;
}

/** PostgREST ilike uchun: maxsus belgilar olib tashlanadi */
const like = (q: string) => `%${q.trim().toLowerCase().replace(/[%_,()*\\]/g, ' ')}%`;
const range = (page: number, size: number) => [page * size, page * size + size - 1] as const;

const publicUrl = (bucket: string, path: string | null) => (path ? db().storage.from(bucket).getPublicUrl(path).data.publicUrl : null);

async function signed(bucket: string, paths: (string | null)[]): Promise<(string | null)[]> {
  const real = paths.filter((p): p is string => !!p);
  if (!real.length) return paths.map(() => null);
  const { data } = await db().storage.from(bucket).createSignedUrls(real, SIGNED_SEC);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return paths.map((p) => (p ? (map.get(p) ?? null) : null));
}

function toMaster(r: Row): AdminMaster {
  return {
    id: r.id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    phone: r.phone ?? '',
    language: r.language ?? 'uz',
    photo: publicUrl(WORKS, r.photo_path),
    experienceYears: r.experience_years ?? 0,
    categories: r.categories ?? [],
    rating: r.reviews_count ? Number(r.rating) : null,
    reviewsCount: r.reviews_count ?? 0,
    jobsDone: r.jobs_count ?? 0,
    activity: r.activity ?? 0,
    priority: r.priority_points ?? 0,
    verifyStatus: r.verify_status,
    verifyNote: r.verify_note,
    balance: r.balance ?? 0,
    subscriptionUntil: ms(r.subscription_until),
    plan: r.billing_plan,
    feePercent: r.fee_percent ?? 0,
    canTake: Boolean(r.can_take),
    online: Boolean(r.online),
    busy: Boolean(r.busy),
    blockedAt: ms(r.blocked_at),
    blockedReason: r.blocked_reason,
    location: r.lat != null && r.lng != null ? { latitude: r.lat, longitude: r.lng } : null,
    seenAt: ms(r.seen_at),
    submittedAt: ms(r.submitted_at),
    createdAt: ms(r.created_at) ?? 0,
    passport: r.passport_path,
    selfie: r.selfie_path,
    works: r.works ?? [],
  };
}

function toOrder(r: Row): AdminOrder {
  return {
    id: r.id,
    status: r.status,
    categoryId: r.category_id,
    problemId: r.problem_id,
    description: r.description,
    photos: r.photos ?? [],
    address: r.address,
    location: { latitude: r.lat, longitude: r.lng },
    scheduledAt: ms(r.scheduled_at),
    createdAt: ms(r.created_at) ?? 0,
    acceptedAt: ms(r.accepted_at),
    completedAt: ms(r.completed_at),
    updatedAt: ms(r.updated_at) ?? 0,
    callFee: r.call_fee,
    priceWork: num(r.price_work),
    priceParts: num(r.price_parts),
    total: Number(r.total ?? 0),
    platformFee: num(r.platform_fee),
    cancelReason: r.cancel_reason,
    cancelledBy: r.cancelled_by,
    clientId: r.client_id,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    masterId: r.master_id,
    masterName: r.master_name,
    masterPhone: r.master_phone,
  };
}

function toUser(r: Row): AdminUser {
  return {
    id: r.id,
    phone: r.phone ?? '',
    name: r.name,
    role: r.role,
    language: r.language ?? 'uz',
    isMaster: Boolean(r.is_master),
    ordersCount: r.orders_count ?? 0,
    completedCount: r.completed_count ?? 0,
    spent: Number(r.spent ?? 0),
    lastOrderAt: ms(r.last_order_at),
    blockedAt: ms(r.blocked_at),
    blockedReason: r.blocked_reason,
    createdAt: ms(r.created_at) ?? 0,
  };
}

function toReview(r: Row): AdminReview {
  return {
    id: r.id,
    orderId: r.order_id,
    stars: r.stars,
    tags: r.tags ?? [],
    comment: r.comment,
    createdAt: ms(r.created_at) ?? 0,
    clientId: r.client_id,
    clientName: r.client_name,
    clientPhone: r.client_phone,
    masterId: r.master_id,
    masterName: r.master_name,
    categoryId: r.category_id,
    problemId: r.problem_id,
  };
}

function toOp(r: Row): BalanceOp {
  return {
    id: String(r.id),
    masterId: r.master_id,
    masterName: r.master_name,
    amount: r.amount,
    balanceAfter: r.balance_after,
    kind: r.kind,
    orderId: r.order_id,
    note: r.note,
    adminPhone: r.admin_phone,
    createdAt: ms(r.created_at) ?? 0,
  };
}

function toLog(r: Row): LogEntry {
  return {
    id: String(r.id),
    adminPhone: r.admin_phone,
    adminName: r.admin_name,
    action: r.action,
    targetType: r.target_type,
    targetId: r.target_id,
    details: r.details ?? {},
    createdAt: ms(r.created_at) ?? 0,
  };
}

async function rpc<T = unknown>(fn: string, args: Row): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) fail(error);
  return data as T;
}

export const supabaseAdmin: AdminApi = {
  async me() {
    const { data } = await db().auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return null;
    const { data: p, error } = await db().from('profiles').select('id, phone, name, role, blocked_at').eq('id', uid).maybeSingle();
    if (error) fail(error);
    if (!p || p.role !== 'admin' || p.blocked_at) return null;
    return { id: p.id, phone: p.phone ?? '', name: p.name };
  },

  async stats(days) {
    const s = await rpc<Row>('admin_stats', { p_days: days });
    const p = s.period ?? {};
    const l = s.live ?? {};
    const n = (v: unknown) => Number(v ?? 0);
    const out: Stats = {
      days: s.days,
      period: {
        orders: n(p.orders),
        completed: n(p.completed),
        cancelled: n(p.cancelled),
        gmv: n(p.gmv),
        revenue: n(p.revenue),
        clients: n(p.clients),
        masters: n(p.masters),
        rating: p.rating == null ? null : Number(p.rating),
        reviews: n(p.reviews),
        prev: {
          orders: n(p.p_orders),
          completed: n(p.p_completed),
          cancelled: n(p.p_cancelled),
          gmv: n(p.p_gmv),
          revenue: n(p.p_revenue),
          clients: n(p.p_clients),
          masters: n(p.p_masters),
          rating: p.p_rating == null ? null : Number(p.p_rating),
        },
      },
      live: {
        online: n(l.online),
        busy: n(l.busy),
        active: n(l.active),
        searching: n(l.searching),
        scheduled: n(l.scheduled),
        pending: n(l.pending),
        blockedByBalance: n(l.blocked_by_balance),
        supportWaiting: n(l.support_waiting),
      },
      daily: (s.daily ?? []).map((d: Row) => ({
        day: String(d.day).slice(0, 10),
        orders: n(d.orders),
        completed: n(d.completed),
        cancelled: n(d.cancelled),
        gmv: n(d.gmv),
        revenue: n(d.revenue),
      })),
      byCategory: (s.by_category ?? []).map((c: Row) => ({ categoryId: c.category_id, orders: n(c.orders), completed: n(c.completed), gmv: n(c.gmv) })),
      cancelReasons: (s.cancel_reasons ?? []).map((c: Row) => ({ reason: c.reason, cancelledBy: c.cancelled_by, count: n(c.n) })),
      topMasters: (s.top_masters ?? []).map((m: Row) => ({
        id: m.id,
        name: m.name,
        rating: m.rating == null ? null : Number(m.rating),
        jobs: n(m.jobs),
        gmv: n(m.gmv),
        revenue: n(m.revenue),
      })),
    };
    return out;
  },

  async masters(q) {
    let r = db().from('admin_masters').select('*', { count: 'exact' });
    if (q.filter === 'pending' || q.filter === 'approved' || q.filter === 'rejected' || q.filter === 'none') r = r.eq('verify_status', q.filter);
    else if (q.filter === 'online') r = r.eq('online', true);
    else if (q.filter === 'blocked') r = r.not('blocked_at', 'is', null);
    else if (q.filter === 'lowBalance') r = r.eq('can_take', false);
    if (q.q.trim()) r = r.ilike('search', like(q.q));
    if (q.category) r = r.contains('categories', [q.category]);
    const col = { created: 'created_at', rating: 'rating', balance: 'balance', jobs: 'jobs_count', activity: 'activity' }[q.sort];
    // Tekshiruv navbati — eng eski ariza birinchi
    r = q.filter === 'pending' && q.sort === 'created' ? r.order('submitted_at', { ascending: true }) : r.order(col, { ascending: q.dir === 'asc' });
    const { data, count, error } = await r.range(...range(q.page, q.pageSize));
    if (error) fail(error);
    return { rows: (data ?? []).map(toMaster), total: count ?? 0 };
  },

  async master(id) {
    const { data, error } = await db().from('admin_masters').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    if (!data) return null;
    const master = toMaster(data);
    const [docs, subs] = await Promise.all([
      signed(DOCS, [master.passport, master.selfie]),
      db().from('subscriptions').select('*').eq('master_id', id).order('period_end', { ascending: false }).limit(24),
    ]);
    return {
      master,
      passportUrl: docs[0],
      selfieUrl: docs[1],
      workUrls: master.works.map((w) => publicUrl(WORKS, w)).filter((u): u is string => !!u),
      subscriptions: (subs.data ?? []).map((s: Row) => ({
        id: s.id,
        periodStart: ms(s.period_start) ?? 0,
        periodEnd: ms(s.period_end) ?? 0,
        amount: s.amount,
        status: s.status,
      })),
    };
  },

  async setVerify(id, status, note) {
    if (status === 'rejected') checkReason(note);
    await rpc('admin_set_verify', { p_master: id, p_status: status, p_note: clean(note) || null });
  },
  async adjustBalance(id, amount, kind, note) {
    checkBalance(amount, kind, note);
    return rpc<number>('admin_adjust_balance', { p_master: id, p_amount: amount, p_kind: kind, p_note: clean(note) || null });
  },
  async addSubscription(id, days, amount) {
    checkSubscription(days, amount);
    return ms(await rpc<string>('admin_add_subscription', { p_master: id, p_days: days, p_amount: amount })) ?? 0;
  },
  async setPriority(id, points) {
    checkPriority(points);
    await rpc('admin_set_priority', { p_master: id, p_points: points });
  },
  async setBlocked(id, blocked, reason) {
    if (blocked) checkReason(reason);
    await rpc('admin_set_blocked', { p_profile: id, p_blocked: blocked, p_reason: clean(reason) || null });
  },

  async orders(q) {
    let r = db().from('admin_orders').select('*', { count: 'exact' });
    if (q.filter === 'active') r = r.in('status', ACTIVE_STATUSES);
    else if (q.filter !== 'all') r = r.eq('status', q.filter);
    if (q.category) r = r.eq('category_id', q.category);
    if (q.days) r = r.gte('created_at', new Date(Date.now() - q.days * 86_400_000).toISOString());
    if (q.masterId) r = r.eq('master_id', q.masterId);
    if (q.clientId) r = r.eq('client_id', q.clientId);
    if (q.q.trim()) r = r.ilike('search', like(q.q));
    const { data, count, error } = await r.order('created_at', { ascending: false }).range(...range(q.page, q.pageSize));
    if (error) fail(error);
    return { rows: (data ?? []).map(toOrder), total: count ?? 0 };
  },

  async order(id) {
    const { data, error } = await db().from('admin_orders').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    if (!data) return null;
    const order = toOrder(data);
    const [photos, offers, chat, review] = await Promise.all([
      signed(ORDER_PHOTOS, order.photos),
      db().from('offers').select('*, master:masters(first_name, last_name)').eq('order_id', id).order('sent_at'),
      db().from('chat_messages').select('*').eq('order_id', id).order('created_at').limit(500),
      db().from('admin_reviews').select('*').eq('order_id', id).maybeSingle(),
    ]);
    return {
      order,
      photoUrls: photos.filter((u): u is string => !!u),
      offers: (offers.data ?? []).map((o: Row) => ({
        id: o.id,
        masterId: o.master_id,
        masterName: o.master ? `${o.master.first_name} ${o.master.last_name}`.trim() : null,
        sentAt: ms(o.sent_at) ?? 0,
        respondedAt: ms(o.responded_at),
        status: o.status,
        etaMin: o.eta_min,
        distanceKm: o.distance_km,
        score: o.score,
      })),
      chat: (chat.data ?? []).map((m: Row) => ({ id: m.id, senderId: m.sender_id, mine: m.sender_id === order.masterId, text: m.text, at: ms(m.created_at) ?? 0 })),
      review: review.data ? toReview(review.data) : null,
    };
  },

  async cancelOrder(id, reason) {
    checkReason(reason);
    await rpc('admin_cancel_order', { p_order: id, p_reason: clean(reason) });
  },

  async users(q) {
    let r = db().from('admin_users').select('*', { count: 'exact' });
    if (q.filter === 'clients') r = r.eq('is_master', false).neq('role', 'admin');
    else if (q.filter === 'masters') r = r.eq('is_master', true);
    else if (q.filter === 'admins') r = r.eq('role', 'admin');
    else if (q.filter === 'blocked') r = r.not('blocked_at', 'is', null);
    if (q.q.trim()) r = r.ilike('search', like(q.q));
    const { data, count, error } = await r.order('created_at', { ascending: false }).range(...range(q.page, q.pageSize));
    if (error) fail(error);
    return { rows: (data ?? []).map(toUser), total: count ?? 0 };
  },

  async user(id) {
    const { data, error } = await db().from('admin_users').select('*').eq('id', id).maybeSingle();
    if (error) fail(error);
    return data ? toUser(data) : null;
  },

  async reviews(q) {
    let r = db().from('admin_reviews').select('*', { count: 'exact' });
    if (q.stars === 'low') r = r.lte('stars', 2);
    else if (q.stars) r = r.eq('stars', q.stars);
    if (q.masterId) r = r.eq('master_id', q.masterId);
    if (q.clientId) r = r.eq('client_id', q.clientId);
    if (q.q.trim()) r = r.ilike('comment', like(q.q));
    const { data, count, error } = await r.order('created_at', { ascending: false }).range(...range(q.page, q.pageSize));
    if (error) fail(error);
    return { rows: (data ?? []).map(toReview), total: count ?? 0 };
  },

  async deleteReview(id, reason) {
    checkReason(reason);
    await rpc('admin_delete_review', { p_review: id, p_reason: clean(reason) });
  },

  async balanceOps(q) {
    let r = db().from('admin_balance_ops').select('*', { count: 'exact' });
    if (q.kind) r = r.eq('kind', q.kind);
    if (q.masterId) r = r.eq('master_id', q.masterId);
    const { data, count, error } = await r.order('created_at', { ascending: false }).range(...range(q.page, q.pageSize));
    if (error) fail(error);
    return { rows: (data ?? []).map(toOp), total: count ?? 0 };
  },

  async supportThreads() {
    const rows = await rpc<Row[]>('admin_support_threads', {});
    return (rows ?? []).map((r) => ({
      userId: r.user_id,
      name: r.name,
      phone: r.phone ?? '',
      role: r.role,
      lastText: r.last_text,
      lastAt: ms(r.last_at) ?? 0,
      waiting: Boolean(r.waiting),
      messages: r.messages,
    }));
  },

  async supportMessages(userId) {
    const { data, error } = await db().from('chat_messages').select('*').eq('support_user_id', userId).order('created_at').limit(1000);
    if (error) fail(error);
    return (data ?? []).map((m: Row) => ({ id: m.id, senderId: m.sender_id, mine: m.sender_id !== userId, text: m.text, at: ms(m.created_at) ?? 0 }));
  },

  async supportReply(userId, text) {
    const body = clean(text, RULES.messageMax);
    if (!body) throw new AdminError('errors.emptyMessage');
    await rpc('admin_support_reply', { p_user: userId, p_text: body });
  },

  async catalog() {
    const [c, p] = await Promise.all([
      db().from('categories').select('id, call_fee, active, sort').order('sort'),
      db().from('problems').select('id, category_id, price_min, price_max, sort').order('sort'),
    ]);
    if (c.error) fail(c.error);
    if (p.error) fail(p.error);
    return {
      categories: (c.data ?? []).map((r: Row) => ({ id: r.id as CategoryId, callFee: r.call_fee, active: r.active })),
      problems: (p.data ?? []).map((r: Row) => ({ id: r.id, categoryId: r.category_id, priceMin: r.price_min, priceMax: r.price_max })),
    };
  },
  async updateCategory(id, callFee, active) {
    checkCallFee(callFee);
    await rpc('admin_update_category', { p_id: id, p_call_fee: callFee, p_active: active });
  },
  async updateProblem(id, min, max) {
    checkPriceRange(min, max);
    await rpc('admin_update_problem', { p_id: id, p_min: min, p_max: max });
  },

  async log(q) {
    let r = db().from('admin_log_view').select('*', { count: 'exact' });
    if (q.action) r = r.eq('action', q.action);
    if (q.targetId) r = r.eq('target_id', q.targetId);
    const { data, count, error } = await r.order('created_at', { ascending: false }).range(...range(q.page, q.pageSize));
    if (error) fail(error);
    return { rows: (data ?? []).map(toLog), total: count ?? 0 };
  },

  async admins() {
    const { data, error } = await db().from('admin_users').select('*').eq('role', 'admin').order('created_at');
    if (error) fail(error);
    return (data ?? []).map(toUser);
  },
  async setAdmin(phone, admin) {
    const p = normalizePhone(phone);
    if (!p) throw new AdminError('errors.phone');
    await rpc('admin_set_role', { p_phone: p, p_admin: admin });
  },

  async live() {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const [m, o] = await Promise.all([
      db().from('admin_masters').select('id, first_name, last_name, lat, lng, busy, online, seen_at, categories').eq('online', true).gte('seen_at', since).limit(2000),
      db().from('admin_orders').select('id, status, category_id, lat, lng, address').in('status', ['searching', 'scheduled', ...ACTIVE_STATUSES]).limit(2000),
    ]);
    if (m.error) fail(m.error);
    if (o.error) fail(o.error);
    const pts: LivePoint[] = [];
    for (const r of m.data ?? []) {
      if (r.lat == null) continue;
      pts.push({ id: r.id, kind: 'master', location: { latitude: r.lat, longitude: r.lng }, label: `${r.first_name} ${r.last_name}`.trim(), status: r.busy ? 'busy' : 'free', categoryId: r.categories?.[0] });
    }
    for (const r of o.data ?? []) {
      pts.push({ id: r.id, kind: 'order', location: { latitude: r.lat, longitude: r.lng }, label: r.address ?? '', status: r.status, categoryId: r.category_id });
    }
    return pts;
  },
};
