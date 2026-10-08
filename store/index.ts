import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { t, type Lang } from '@/lib/i18n';
import type { BillingPlan } from '@/constants/billing';
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from '@/lib/geo';
import { startDispatch, type DispatchState } from '@/lib/dispatch';
import { signOut } from '@/lib/auth';
import { DEMO } from '@/lib/demo';
import { mockChats, TASHKENT_CENTER, type HistoryItem } from '@/mocks';

export type Role = 'client' | 'master';
export type ThemeMode = 'system' | 'light' | 'dark';

// TZ, 6-bo'lim: orders.status
export type OrderStatus =
  | 'draft'
  | 'scheduled'
  | 'searching'
  | 'assigned'
  | 'on_the_way'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type UserState = {
  /** null — ilova birinchi marta ochilgan, til tanlash ekrani ko'rsatiladi */
  language: Lang | null;
  /** Bo'sh — ro'yxatdan o'tmagan (mehmon). Ro'yxatdan faqat usta chaqirganda o'tiladi */
  phone: string;
  /** Mijozning ismi (ixtiyoriy) — usta buyurtmada shu ismni ko'radi */
  name: string;
  role: Role | null;
  /** Ko'rinish: telefon sozlamasi bo'yicha, kunduzgi yoki tungi */
  themeMode: ThemeMode;
  billingPlan: BillingPlan | null;
  favorites: string[];
  /** Oxirgi aniqlangan haqiqiy joy — keyingi ochilishda xarita darhol shu yerdan boshlanadi */
  lastLocation: LatLng | null;
  lastAddress: string;
  /** Do'st taklif kodi (uyservice.uz/usta?ref=KOD havolasidan) — usta anketasida o'zi yoziladi */
  inviteRef: string;
  setInviteRef: (code: string) => void;
  setLastLocation: (p: LatLng, address?: string) => void;
  setLanguage: (lang: Lang) => void;
  setPhone: (phone: string) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setName: (name: string) => void;
  setRole: (role: Role) => void;
  setBillingPlan: (plan: BillingPlan) => void;
  toggleFavorite: (masterId: string, on?: boolean) => void;
  logout: () => void;
};

// Yangi foydalanuvchi bo'sh boshlaydi (soxta sevimli usta va tarix yo'q)
const userDefaults = {
  language: null as Lang | null,
  phone: '',
  name: '',
  role: null as Role | null,
  themeMode: 'system' as ThemeMode,
  billingPlan: null as BillingPlan | null,
  favorites: [] as string[],
  lastLocation: null as LatLng | null,
  lastAddress: '',
  inviteRef: '',
};

export const useUser = create<UserState>()(
  persist(
    (set) => ({
  ...userDefaults,
  setLastLocation: (lastLocation, address) => set((s) => ({ lastLocation, lastAddress: address ?? s.lastAddress })),
  setLanguage: (language) => set({ language }),
  setInviteRef: (inviteRef) => set({ inviteRef }),
  setPhone: (phone) => set({ phone }),
  setName: (name) => set({ name }),
  setThemeMode: (themeMode) => set({ themeMode }),
  setRole: (role) => set({ role }),
  setBillingPlan: (billingPlan) => set({ billingPlan }),
  toggleFavorite: (id, on) =>
    set((s) => {
      const has = s.favorites.includes(id);
      const want = on ?? !has;
      if (want === has) return s;
      return { favorites: want ? [...s.favorites, id] : s.favorites.filter((x) => x !== id) };
    }),
  // Hamma narsa tozalanadi (ism, sevimlilar, tarix, usta profili, faol buyurtmalar) — telefon boshqa odamga o'tsa ham
  logout: () => logoutAll(),
    }),
    // Telefonda saqlanadi: til, raqam, rol, tarif, sevimli ustalar
    { name: 'uyservice-user', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

// Buyurtma qoralamasi (yangi buyurtma yaratilayotganda) va mijoz manzili
type OrderState = {
  categoryId: CategoryId;
  problemId: string;
  description: string;
  photos: string[];
  address: string;
  location: LatLng;
  preferredMasterId: string | null; // "Mening ustalarim"dan tanlansa, taklif birinchi unga boradi
  /** "Vaqtni tanlash": usta kelishi kerak bo'lgan vaqt (ms); null — "Hozir kerak" */
  scheduledAt: number | null;
  setDraft: (p: Partial<Pick<OrderState, 'categoryId' | 'problemId' | 'description' | 'photos' | 'preferredMasterId' | 'scheduledAt'>>) => void;
  setAddress: (address: string, location?: LatLng) => void;
  reset: () => void;
};

export const useOrder = create<OrderState>((set) => ({
  categoryId: 'plumber',
  problemId: 'tap',
  description: '',
  photos: [],
  // Haqiqiy joy aniqlanguncha (yoki oxirgi ma'lum joy o'qilguncha) — Toshkent markazi, manzil bo'sh
  address: '',
  location: TASHKENT_CENTER,
  preferredMasterId: null,
  scheduledAt: null,
  setDraft: (p) => set(p),
  setAddress: (address, location) => set((s) => ({ address, location: location ?? s.location })),
  reset: () => set({ description: '', photos: [], preferredMasterId: null }),
}));

export type VerifyStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Usta ro'yxatdan o'tganda yuklagan ma'lumotlar (server rejimida — masters + Storage ham) */
export type MasterProfile = {
  firstName: string;
  lastName: string;
  categories: CategoryId[];
  experienceYears: number;
  /** Profil surati (majburiy) — mijoz eshik ochishdan oldin ustaning yuzini ko'radi */
  photo: string | null;
  passportPhoto: string | null;
  selfie: string | null;
  works: string[];
  status: VerifyStatus;
  submittedAt: number | null;
};

const emptyProfile: MasterProfile = {
  firstName: '',
  lastName: '',
  categories: [],
  experienceYears: 1,
  photo: null,
  passportPhoto: null,
  selfie: null,
  works: [],
  status: 'none',
  submittedAt: null,
};

type MasterState = {
  online: boolean;
  /** Admin tasdiqlaganmi (profile.status === 'approved') */
  verified: boolean;
  profile: MasterProfile;
  activity: number;
  /** Promokod va boshqa bonuslardan prioritet ballari (taqsimlash balliga qo'shiladi) */
  priorityPoints: number;
  usedPromos: string[];
  /** Komissiya tarifida: platforma ulushi shu balansdan yechiladi (so'm) */
  balance: number;
  /** Obuna tarifida: obuna tugash sanasi (ms) */
  subscriptionUntil: number;
  /** Buyurtma filtri: qaysi kategoriyalar va qancha uzoqlikdan */
  categories: CategoryId[];
  radiusKm: number;
  /** Kunlik daromad (oxirgi 31 kun): kalit — mahalliy sana YYYY-MM-DD; "Bugun" yarim tunda o'zi nolga tushadi */
  earnings: DayEarning[];
  /** Mijozlar bahosi (o'rtacha) va soni; yangi ustada — null */
  rating: number | null;
  ratingCount: number;
  jobsDone: number;
  notifications: boolean;
  setOnline: (v: boolean) => void;
  bumpActivity: (delta: number) => void;
  setFilter: (p: { categories?: CategoryId[]; radiusKm?: number }) => void;
  /** Komissiya: ish yakunlanganda platforma ulushi balansdan yechiladi */
  charge: (amount: number) => void;
  setProfile: (p: Partial<MasterProfile>) => void;
  /** Ro'yxatdan o'tish arizasi yuborildi — admin tekshiradi, shu paytgacha buyurtma yo'q */
  submitProfile: () => void;
  /** Admin qarori (server rejimida — Supabase'dan; sinovda — demo tugma) */
  setVerifyStatus: (status: VerifyStatus) => void;
  addPriority: (points: number, promo?: string) => void;
  addIncome: (amount: number) => void;
  /** Balansni to'ldirish (hozircha faqat sinov rejimida; keyin Click/Payme) */
  topUp: (amount: number) => void;
  /** Obuna to'lovi (hozircha faqat sinov rejimida) — 30 kun */
  paySubscription: () => void;
  setNotifications: (on: boolean) => void;
};

export type DayEarning = { day: string; income: number; jobs: number };
/** Mahalliy sana kaliti YYYY-MM-DD */
export const dayKey = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const earningOn = (earnings: DayEarning[], d: Date = new Date()) => earnings.find((e) => e.day === dayKey(d)) ?? { day: dayKey(d), income: 0, jobs: 0 };

// Yangi usta noldan boshlaydi: daromad, reyting, ishlar yo'q. Sinov rejimida — sinab ko'rish uchun 50 000 balans
const masterDefaults = () => ({
  online: false,
  verified: false,
  profile: emptyProfile,
  activity: 80,
  priorityPoints: 0,
  usedPromos: [] as string[],
  balance: DEMO ? 50_000 : 0,
  subscriptionUntil: 0,
  categories: [] as CategoryId[],
  radiusKm: 6,
  earnings: [] as DayEarning[],
  rating: null as number | null,
  ratingCount: 0,
  jobsDone: 0,
  notifications: true,
});

export const useMaster = create<MasterState>()(
  persist(
    (set) => ({
      ...masterDefaults(),
      setOnline: (online) => set({ online }),
      bumpActivity: (d) => set((s) => ({ activity: Math.max(0, Math.min(100, s.activity + d)) })),
      setFilter: (p) => set(p),
      charge: (amount) => set((s) => ({ balance: s.balance - amount })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      submitProfile: () =>
        set((s) => ({
          // Pasport yuklangan bo'lsa — admin tekshiradi; bo'lmasa usta baribir ishlaydi (ulushi +5%)
          profile: { ...s.profile, status: s.profile.passportPhoto ? 'pending' : 'none', submittedAt: Date.now() },
          categories: s.profile.categories.length ? s.profile.categories : s.categories,
          verified: false,
          online: false,
        })),
      setVerifyStatus: (status) => set((s) => ({ profile: { ...s.profile, status }, verified: status === 'approved' })),
      topUp: (amount) => set((s) => ({ balance: s.balance + amount })),
      paySubscription: () => set((s) => ({ subscriptionUntil: Math.max(s.subscriptionUntil, Date.now()) + 30 * 86_400_000 })),
      addPriority: (points, promo) =>
        set((s) => ({ priorityPoints: s.priorityPoints + points, usedPromos: promo ? [...s.usedPromos, promo] : s.usedPromos })),
      addIncome: (amount) =>
        set((s) => {
          const key = dayKey();
          const today = earningOn(s.earnings);
          const rest = s.earnings.filter((e) => e.day !== key);
          return {
            earnings: [...rest, { day: key, income: today.income + amount, jobs: today.jobs + 1 }].slice(-31),
            jobsDone: s.jobsDone + 1,
          };
        }),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'uyservice-master',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Eski (soxta statistikali) saqlangan ma'lumot — yangi tuzilishga: daromad va reyting noldan
      migrate: (old) => {
        const o = (old ?? {}) as Record<string, unknown>;
        const { todayIncome: _i, todayJobs: _j, ...rest } = o;
        return { ...masterDefaults(), ...rest, profile: { ...emptyProfile, ...((o.profile as object) ?? {}) } } as unknown as MasterState;
      },
      // "Onlayn" holati saqlanmaydi: ilova qayta ochilganda usta o'zi ishga chiqadi
      partialize: ({ online: _online, ...rest }) => rest,
    },
  ),
);

/** Ustaga kelgan taklif / bajarilayotgan ish (server rejimida — offers + orders jadvallari, Realtime) */
export type MasterOrder = {
  id: string;
  categoryId: CategoryId;
  problemId: string;
  description: string;
  address: string;
  location: LatLng;
  clientName: string;
  clientPhone: string;
  distanceKm: number;
  etaMin: number;
  sentAt: number;
  /** Eshikdagi tasdiq kodi: mijoz ilovasida ko'rinadi, usta yetib kelganda kiritadi */
  doorCode: string;
};

/** Ish bosqichlari: yo'lda → yetib keldi (kod) → narx kelishilmoqda → ish → yakunlandi */
export type JobStage = 'on_the_way' | 'arrived' | 'pricing' | 'in_progress' | 'completed';
export type PriceStatus = 'none' | 'sent' | 'approved' | 'declined';

export type MasterJob = MasterOrder & {
  acceptedAt: number;
  /** Platforma ulushi qabul qilingan paytdagi tarif bo'yicha (keyin tarif almashtirilsa ham o'zgarmaydi) */
  feePercent: number;
  stage: JobStage;
  /** Usta taklif qilgan narx: ish (chaqiruv ichida) va ehtiyot qismlar */
  work: number;
  parts: number;
  priceStatus: PriceStatus;
  /** Yakuniy summa (rad etilsa — faqat chaqiruv) */
  total: number;
};

type MasterWorkState = {
  offer: MasterOrder | null;
  job: MasterJob | null;
  setOffer: (o: MasterOrder | null) => void;
  acceptOffer: (feePercent: number) => void;
  updateJob: (patch: Partial<MasterJob>) => void;
  finishJob: () => void;
};

// Taklif va faol ish telefonda saqlanadi: ilova yopilib ochilsa ham yo'qolmaydi
export const useMasterWork = create<MasterWorkState>()(
  persist(
    (set) => ({
      offer: null,
      job: null,
      setOffer: (offer) => set({ offer }),
      acceptOffer: (feePercent) =>
        set((s) =>
          s.offer
            ? { job: { ...s.offer, acceptedAt: Date.now(), feePercent, stage: 'on_the_way', work: 0, parts: 0, priceStatus: 'none', total: 0 }, offer: null }
            : s,
        ),
      updateJob: (patch) => set((s) => (s.job ? { job: { ...s.job, ...patch } } : s)),
      finishJob: () => set({ job: null }),
    }),
    { name: 'uyservice-master-work', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Ustaning joylashuvi serverga (master_locations) har 5 s yuboriladi — oxirgi yuborilgan */
type LocationLogState = { last: LatLng | null; lastAt: number; sent: number; record: (p: LatLng) => void };
export const useLocationLog = create<LocationLogState>((set) => ({
  last: null,
  lastAt: 0,
  sent: 0,
  record: (p) => set((s) => ({ last: p, lastAt: Date.now(), sent: s.sent + 1 })),
}));

// Chatlar: sinov rejimida mahalliy; serverda — chat_messages (lib/live.ts → useLiveChat)
/** i18n: true — matn tarjima kaliti (tizim xabarlari: qo'llab-quvvatlash, yangiliklar) */
export type ChatMessage = { id: string; mine: boolean; text: string; at: number; i18n?: boolean };
export type Chat = { id: string; title: string; subtitle: string; kind: 'support' | 'news' | 'client' | 'master'; unread: number; messages: ChatMessage[]; i18n?: boolean };

export const chatTitle = (c: Chat) => (c.i18n ? t(c.title) : c.title);
export const chatSubtitle = (c: Chat) => (c.i18n ? t(c.subtitle) : c.subtitle);
export const msgText = (m: ChatMessage) => (m.i18n ? t(m.text) : m.text);

type ChatState = {
  chats: Chat[];
  send: (chatId: string, text: string) => void;
  /** Suhbatdoshdan xabar (sinovda — soxta javob; serverda — Realtime) */
  receive: (chatId: string, text: string) => void;
  /** Buyurtma bo'yicha chat bo'lmasa — yaratadi */
  ensure: (chat: Omit<Chat, 'messages' | 'unread'>) => void;
  markRead: (chatId: string) => void;
  /** Server rejimi: suhbat serverdagi xabarlar bilan almashtiriladi (tizim xabarlari — i18n — qoladi) */
  setServerMessages: (chatId: string, messages: ChatMessage[]) => void;
};

const msg = (mine: boolean, text: string): ChatMessage => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, mine, text, at: Date.now() });

// Boshlanishda faqat qo'llab-quvvatlash va yangiliklar (soxta mijoz yozishmalari yo'q)
const defaultChats = (): Chat[] => mockChats.filter((c) => c.kind === 'support' || c.kind === 'news').map((c) => ({ ...c, messages: [...c.messages] }));

export const useChats = create<ChatState>((set) => ({
  chats: defaultChats(),
  send: (chatId, text) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, msg(true, text)] } : c)) })),
  receive: (chatId, text) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1, messages: [...c.messages, msg(false, text)] } : c)) })),
  ensure: (chat) =>
    set((s) => (s.chats.some((c) => c.id === chat.id) ? s : { chats: [{ ...chat, unread: 0, messages: [] }, ...s.chats] })),
  markRead: (chatId) => set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) })),
  setServerMessages: (chatId, messages) =>
    set((s) => ({
      chats: s.chats.map((c) => {
        if (c.id !== chatId) return c;
        const system = c.messages.filter((m) => m.i18n);
        const old = c.messages.filter((m) => !m.i18n);
        // O'zgarmagan bo'lsa — qayta chizilmaydi
        if (old.length === messages.length && old[old.length - 1]?.id === messages[messages.length - 1]?.id) return c;
        return { ...c, messages: [...system, ...messages] };
      }),
    })),
}));

// Faol buyurtmalar: mijoz bir vaqtda bir nechta usta chaqira oladi (masalan, santexnik va elektrik)
export type ActiveOrder = {
  id: string;
  categoryId: CategoryId;
  problemId: string;
  description: string;
  photos: string[];
  address: string;
  location: LatLng;
  preferredMasterId: string | null;
  status: OrderStatus;
  masterId: string | null;
  createdAt: number;
  /** Rejalashtirilgan buyurtma: usta kelishi kerak bo'lgan vaqt; qidiruv undan oldinroq boshlanadi */
  scheduledAt: number | null;
  /** Usta qidirish holati (lib/dispatch.ts) */
  dispatch: DispatchState;
  /** Bo'sh usta topilmadi */
  none: boolean;
  /** Usta yo'li (teng qadamlarga bo'lingan) va hozirgi qadam */
  path: LatLng[];
  step: number;
  /** Yo'lning o'rtacha tezligi (m/s) — "N daqiqa" uchun */
  speed: number;
  /** Haqiqiy yo'l olindi (false — usta joyida, yo'l kutilmoqda) */
  routeReady?: boolean;
  phaseAt: number;
  /** Eshikdagi tasdiq kodi — mijoz ustaga aytadi (kelgan odam o'sha usta ekanini bildiradi) */
  doorCode: string;
  /** Usta yetib kelib taklif qilgan narx: ish (chaqiruv ichida) + ehtiyot qismlar; mijoz rozi bo'lsa ish boshlanadi */
  priceStatus: 'none' | 'proposed' | 'approved' | 'declined';
  work: number;
  parts: number;
  /** Yakuniy summa: rozi bo'lsa — ish + qismlar, rad etsa — faqat chaqiruv */
  finalPrice: number | null;
  /** Server rejimi: tayinlangan usta haqida (master_cards + profiles) */
  master?: OrderMaster;
  /** Usta bekor qildi — buyurtma o'zi keyingi ustaga o'tdi (server: master_cancel_order) */
  requeued?: boolean;
};

/** Mijoz ko'radigan usta kartasi (server rejimida; sinov rejimida mocks/mastersAround) */
export type OrderMaster = {
  id: string;
  name: string;
  initials: string;
  rating: number;
  jobsCount: number;
  onTimePercent: number;
  experienceYears: number;
  phone: string;
  verified: boolean;
};

/** 4 xonali tasodifiy kod */
export const makeDoorCode = () => String(1000 + Math.floor(Math.random() * 9000));

type OrdersState = {
  orders: ActiveOrder[];
  /** Joriy qoralamadan yangi buyurtma yaratadi, id qaytaradi (server rejimida — serverdagi id) */
  create: (serverId?: string) => string;
  update: (id: string, patch: Partial<ActiveOrder>) => void;
  remove: (id: string) => void;
};

// Faol buyurtmalar telefonda saqlanadi: sahifa yangilansa yoki ilova yopilsa ham yo'qolmaydi (simulyator davom etadi)
export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
  orders: [] as ActiveOrder[],
  create: (serverId) => {
    const d = useOrder.getState();
    const id = serverId ?? `o${Date.now()}`;
    const now = Date.now();
    const order: ActiveOrder = {
      id,
      categoryId: d.categoryId,
      problemId: d.problemId,
      description: d.description,
      photos: d.photos,
      address: d.address,
      location: d.location,
      preferredMasterId: d.preferredMasterId,
      status: d.scheduledAt ? 'scheduled' : 'searching',
      masterId: null,
      createdAt: now,
      scheduledAt: d.scheduledAt,
      dispatch: startDispatch(now),
      none: false,
      path: [],
      step: 0,
      speed: 6,
      phaseAt: now,
      // Server rejimida kod serverdan keladi (order_door_code)
      doorCode: serverId ? '----' : makeDoorCode(),
      priceStatus: 'none',
      work: 0,
      parts: 0,
      finalPrice: null,
    };
    set((s) => ({ orders: [...s.orders, order] }));
    return id;
  },
  update: (id, patch) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  remove: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
    }),
    { name: 'uyservice-orders', version: 2, storage: createJSONStorage(() => AsyncStorage), migrate: () => ({ orders: [] }) as unknown as OrdersState },
  ),
);

export const useActiveOrder = (id: string | undefined) => useOrders((s) => s.orders.find((o) => o.id === id));

/** Buyurtmalar tarixi: yakunlangan va bekor qilingan buyurtmalar, qo'yilgan baho (telefonda saqlanadi; serverda — orders + reviews) */
type HistoryState = { items: HistoryItem[]; add: (item: HistoryItem) => void };
export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      items: [] as HistoryItem[],
      add: (item) => set((s) => ({ items: [item, ...s.items.filter((x) => x.id !== item.id)] })),
    }),
    // version 2: eski soxta tarix (boshqa odamnikidek ko'rinardi) tozalanadi
    { name: 'uyservice-history', version: 2, storage: createJSONStorage(() => AsyncStorage), migrate: () => ({ items: [] }) as unknown as HistoryState },
  ),
);

// Ilova ochilganda: mijoz manzili — oxirgi ma'lum haqiqiy joy (xarita darhol shu yerdan boshlanadi, keyin GPS aniqlaydi)
function restoreLastPlace() {
  const { lastLocation, lastAddress } = useUser.getState();
  if (lastLocation && !useOrder.getState().address) useOrder.setState({ location: lastLocation, address: lastAddress });
}
if (useUser.persist.hasHydrated()) restoreLastPlace();
else useUser.persist.onFinishHydration(restoreLastPlace);

/** Akkauntdan chiqish: shu telefondagi hamma shaxsiy ma'lumot tozalanadi (til, ko'rinish va oxirgi joy qoladi) */
export function logoutAll() {
  const { language, themeMode, lastLocation, lastAddress } = useUser.getState();
  useUser.setState({ ...userDefaults, language, themeMode, lastLocation, lastAddress });
  useMaster.setState(masterDefaults());
  useMasterWork.setState({ offer: null, job: null });
  useOrders.setState({ orders: [] });
  useHistory.setState({ items: [] });
  useChats.setState({ chats: defaultChats() });
  signOut().catch(() => {});
}
