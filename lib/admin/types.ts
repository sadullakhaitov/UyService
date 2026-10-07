// Admin panel ma'lumot turlari. Ikki manba bir xil shaklda qaytaradi:
// Supabase (lib/admin/supabase.ts — server ulanganda) va sinov rejimi (lib/admin/demo.ts).
import type { BillingPlan } from '@/constants/billing';
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from '@/lib/geo';

export type VerifyStatus = 'none' | 'pending' | 'approved' | 'rejected';
export type OrderStatus = 'scheduled' | 'searching' | 'assigned' | 'on_the_way' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
export type CancelledBy = 'client' | 'master' | 'system' | 'admin';
export type UserRole = 'client' | 'master' | 'admin';
export type BalanceKind = 'topup' | 'adjust' | 'bonus' | 'refund' | 'fee';
export type LogAction =
  | 'verify'
  | 'balance'
  | 'subscription'
  | 'priority'
  | 'block'
  | 'unblock'
  | 'cancel'
  | 'delete_review'
  | 'category'
  | 'problem'
  | 'grant_admin'
  | 'revoke_admin';
export type LogTarget = 'master' | 'user' | 'order' | 'review' | 'category' | 'problem' | 'support';

export const ACTIVE_STATUSES: OrderStatus[] = ['assigned', 'on_the_way', 'arrived', 'in_progress'];

/** Sahifalangan ro'yxat */
export type Page<T> = { rows: T[]; total: number };

export type AdminMe = { id: string; phone: string; name: string | null };

export type AdminMaster = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  language: string;
  photo: string | null;
  experienceYears: number;
  categories: CategoryId[];
  /** null — hali baho yo'q */
  rating: number | null;
  reviewsCount: number;
  jobsDone: number;
  activity: number;
  priority: number;
  verifyStatus: VerifyStatus;
  verifyNote: string | null;
  balance: number;
  subscriptionUntil: number | null;
  plan: BillingPlan | null;
  feePercent: number;
  /** Buyurtma olishi mumkinmi (balans / obuna) */
  canTake: boolean;
  online: boolean;
  busy: boolean;
  blockedAt: number | null;
  blockedReason: string | null;
  location: LatLng | null;
  seenAt: number | null;
  submittedAt: number | null;
  createdAt: number;
  passport: string | null;
  selfie: string | null;
  works: string[];
};

export type AdminOrder = {
  id: string;
  status: OrderStatus;
  categoryId: CategoryId;
  problemId: string | null;
  description: string | null;
  photos: string[];
  address: string | null;
  location: LatLng;
  scheduledAt: number | null;
  createdAt: number;
  acceptedAt: number | null;
  completedAt: number | null;
  updatedAt: number;
  callFee: number;
  priceWork: number | null;
  priceParts: number | null;
  /** Mijoz to'laydigan summa: ish (chaqiruv ichida) + qism; narx yo'q bo'lsa — chaqiruv */
  total: number;
  platformFee: number | null;
  cancelReason: string | null;
  cancelledBy: CancelledBy | null;
  clientId: string;
  clientName: string | null;
  clientPhone: string | null;
  masterId: string | null;
  masterName: string | null;
  masterPhone: string | null;
};

export type AdminUser = {
  id: string;
  phone: string;
  name: string | null;
  role: UserRole;
  language: string;
  isMaster: boolean;
  ordersCount: number;
  completedCount: number;
  spent: number;
  lastOrderAt: number | null;
  blockedAt: number | null;
  blockedReason: string | null;
  createdAt: number;
};

export type AdminReview = {
  id: string;
  orderId: string;
  stars: number;
  tags: string[];
  comment: string | null;
  createdAt: number;
  clientId: string;
  clientName: string | null;
  clientPhone: string | null;
  masterId: string;
  masterName: string | null;
  categoryId: CategoryId;
  problemId: string | null;
};

export type BalanceOp = {
  id: string;
  masterId: string;
  masterName: string | null;
  amount: number;
  balanceAfter: number;
  kind: BalanceKind;
  orderId: string | null;
  note: string | null;
  adminPhone: string | null;
  createdAt: number;
};

export type Subscription = { id: string; periodStart: number; periodEnd: number; amount: number; status: 'pending' | 'paid' | 'cancelled' };

export type OfferAttempt = {
  id: string;
  masterId: string;
  masterName: string | null;
  sentAt: number;
  respondedAt: number | null;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  etaMin: number | null;
  distanceKm: number | null;
  score: number | null;
};

export type ChatLine = { id: string; senderId: string; mine: boolean; text: string; at: number };

export type LogEntry = {
  id: string;
  adminPhone: string | null;
  adminName: string | null;
  action: LogAction;
  targetType: LogTarget;
  targetId: string | null;
  details: Record<string, unknown>;
  createdAt: number;
};

export type SupportThread = {
  userId: string;
  name: string | null;
  phone: string;
  role: UserRole;
  lastText: string;
  lastAt: number;
  /** Oxirgi xabar foydalanuvchidan — javob kutyapti */
  waiting: boolean;
  messages: number;
};

export type CatalogCategory = { id: CategoryId; callFee: number; active: boolean };
export type CatalogProblem = { id: string; categoryId: CategoryId; priceMin: number | null; priceMax: number | null };

export type DayPoint = { day: string; orders: number; completed: number; cancelled: number; gmv: number; revenue: number };

export type Stats = {
  days: number;
  period: {
    orders: number;
    completed: number;
    cancelled: number;
    gmv: number;
    revenue: number;
    clients: number;
    masters: number;
    rating: number | null;
    reviews: number;
    prev: { orders: number; completed: number; cancelled: number; gmv: number; revenue: number; clients: number; masters: number; rating: number | null };
  };
  live: {
    online: number;
    busy: number;
    active: number;
    searching: number;
    scheduled: number;
    pending: number;
    blockedByBalance: number;
    supportWaiting: number;
  };
  daily: DayPoint[];
  byCategory: { categoryId: CategoryId; orders: number; completed: number; gmv: number }[];
  cancelReasons: { reason: string; cancelledBy: CancelledBy | null; count: number }[];
  topMasters: { id: string; name: string | null; rating: number | null; jobs: number; gmv: number; revenue: number }[];
};

export type LivePoint = { id: string; kind: 'master' | 'order'; location: LatLng; label: string; status: string; categoryId?: CategoryId };

// ---------- So'rovlar ----------
export type SortDir = 'asc' | 'desc';

export type MasterFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'none' | 'online' | 'blocked' | 'lowBalance';
export type MasterQuery = {
  filter: MasterFilter;
  q: string;
  category: CategoryId | null;
  sort: 'created' | 'rating' | 'balance' | 'jobs' | 'activity';
  dir: SortDir;
  page: number;
  pageSize: number;
};

export type OrderFilter = 'all' | 'active' | 'searching' | 'scheduled' | 'completed' | 'cancelled';
export type OrderQuery = {
  filter: OrderFilter;
  q: string;
  category: CategoryId | null;
  /** Oxirgi N kun; null — hammasi */
  days: number | null;
  masterId?: string;
  clientId?: string;
  page: number;
  pageSize: number;
};

export type UserFilter = 'all' | 'clients' | 'masters' | 'admins' | 'blocked';
export type UserQuery = { filter: UserFilter; q: string; page: number; pageSize: number };

/** stars: aniq baho, 'low' — shikoyatlar (1–2), null — hammasi */
export type ReviewQuery = { stars: number | 'low' | null; q: string; masterId?: string; clientId?: string; page: number; pageSize: number };

export type BalanceQuery = { kind: BalanceKind | null; masterId?: string; page: number; pageSize: number };

export type LogQuery = { action: LogAction | null; targetId?: string; page: number; pageSize: number };

export type MasterDetail = {
  master: AdminMaster;
  /** Ko'rish uchun vaqtinchalik havolalar (Supabase Storage — 1 soat) */
  passportUrl: string | null;
  selfieUrl: string | null;
  workUrls: string[];
  subscriptions: Subscription[];
};

export type OrderDetail = {
  order: AdminOrder;
  photoUrls: string[];
  offers: OfferAttempt[];
  chat: ChatLine[];
  review: AdminReview | null;
};

// ---------- Interfeys ----------
export interface AdminApi {
  /** Joriy foydalanuvchi admin bo'lsa — uning ma'lumoti, aks holda null */
  me(): Promise<AdminMe | null>;
  stats(days: number): Promise<Stats>;

  masters(q: MasterQuery): Promise<Page<AdminMaster>>;
  master(id: string): Promise<MasterDetail | null>;
  setVerify(id: string, status: VerifyStatus, note?: string): Promise<void>;
  adjustBalance(id: string, amount: number, kind: Exclude<BalanceKind, 'fee'>, note?: string): Promise<number>;
  addSubscription(id: string, days: number, amount: number): Promise<number>;
  setPriority(id: string, points: number): Promise<void>;
  setBlocked(profileId: string, blocked: boolean, reason?: string): Promise<void>;

  orders(q: OrderQuery): Promise<Page<AdminOrder>>;
  order(id: string): Promise<OrderDetail | null>;
  cancelOrder(id: string, reason: string): Promise<void>;

  users(q: UserQuery): Promise<Page<AdminUser>>;
  user(id: string): Promise<AdminUser | null>;

  reviews(q: ReviewQuery): Promise<Page<AdminReview>>;
  deleteReview(id: string, reason: string): Promise<void>;

  balanceOps(q: BalanceQuery): Promise<Page<BalanceOp>>;

  supportThreads(): Promise<SupportThread[]>;
  supportMessages(userId: string): Promise<ChatLine[]>;
  supportReply(userId: string, text: string): Promise<void>;

  catalog(): Promise<{ categories: CatalogCategory[]; problems: CatalogProblem[] }>;
  updateCategory(id: CategoryId, callFee: number, active: boolean): Promise<void>;
  updateProblem(id: string, min: number | null, max: number | null): Promise<void>;

  log(q: LogQuery): Promise<Page<LogEntry>>;
  admins(): Promise<AdminUser[]>;
  setAdmin(phone: string, admin: boolean): Promise<void>;

  live(): Promise<LivePoint[]>;
}

/** Foydalanuvchiga ko'rsatiladigan xato (matni tarjima kaliti yoki server xabari) */
export class AdminError extends Error {
  constructor(public key: string, message?: string) {
    super(message ?? key);
  }
}
