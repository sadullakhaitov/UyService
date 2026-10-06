import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang } from '@/lib/i18n';
import type { BillingPlan } from '@/constants/billing';
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from '@/lib/geo';
import { startDispatch, type DispatchState } from '@/lib/dispatch';
import { mockChats, mockClient, mockFavorites, mockMasterSelf } from '@/mocks';

export type Role = 'client' | 'master';

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
  role: Role | null;
  billingPlan: BillingPlan | null;
  favorites: string[];
  setLanguage: (lang: Lang) => void;
  setPhone: (phone: string) => void;
  setRole: (role: Role) => void;
  setBillingPlan: (plan: BillingPlan) => void;
  toggleFavorite: (masterId: string, on?: boolean) => void;
  logout: () => void;
};

export const useUser = create<UserState>()(
  persist(
    (set) => ({
  language: null,
  phone: '',
  role: null,
  billingPlan: null,
  favorites: mockFavorites,
  setLanguage: (language) => set({ language }),
  setPhone: (phone) => set({ phone }),
  setRole: (role) => set({ role }),
  setBillingPlan: (billingPlan) => set({ billingPlan }),
  toggleFavorite: (id, on) =>
    set((s) => {
      const has = s.favorites.includes(id);
      const want = on ?? !has;
      if (want === has) return s;
      return { favorites: want ? [...s.favorites, id] : s.favorites.filter((x) => x !== id) };
    }),
  logout: () => set({ phone: '', role: null }),
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
  address: mockClient.address,
  location: mockClient.location,
  preferredMasterId: null,
  scheduledAt: null,
  setDraft: (p) => set(p),
  setAddress: (address, location) => set((s) => ({ address, location: location ?? s.location })),
  reset: () => set({ description: '', photos: [], preferredMasterId: null }),
}));

export type VerifyStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** Usta ro'yxatdan o'tganda yuklagan ma'lumotlar (5-bosqichda: masters + Storage) */
export type MasterProfile = {
  firstName: string;
  lastName: string;
  categories: CategoryId[];
  experienceYears: number;
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
  todayIncome: number;
  todayJobs: number;
  notifications: boolean;
  setOnline: (v: boolean) => void;
  bumpActivity: (delta: number) => void;
  setFilter: (p: { categories?: CategoryId[]; radiusKm?: number }) => void;
  /** Komissiya: ish yakunlanganda platforma ulushi balansdan yechiladi */
  charge: (amount: number) => void;
  setProfile: (p: Partial<MasterProfile>) => void;
  /** Ro'yxatdan o'tish arizasi yuborildi — admin tekshiradi, shu paytgacha buyurtma yo'q */
  submitProfile: () => void;
  /** Admin qarori (5-bosqichda Supabase'dan keladi; hozir demo tugma) */
  setVerifyStatus: (status: VerifyStatus) => void;
  addPriority: (points: number, promo?: string) => void;
  addIncome: (amount: number) => void;
  setNotifications: (on: boolean) => void;
};

export const useMaster = create<MasterState>()(
  persist(
    (set) => ({
      online: false,
      verified: false,
      profile: emptyProfile,
      activity: mockMasterSelf.activity,
      priorityPoints: 15,
      usedPromos: [],
      balance: 45_000,
      subscriptionUntil: Date.now() + 18 * 86_400_000,
      categories: ['plumber', 'appliance'],
      radiusKm: 6,
      todayIncome: mockMasterSelf.todayIncome,
      todayJobs: mockMasterSelf.todayJobs,
      notifications: true,
      setOnline: (online) => set({ online }),
      bumpActivity: (d) => set((s) => ({ activity: Math.max(0, Math.min(100, s.activity + d)) })),
      setFilter: (p) => set(p),
      charge: (amount) => set((s) => ({ balance: s.balance - amount })),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      submitProfile: () =>
        set((s) => ({
          profile: { ...s.profile, status: 'pending', submittedAt: Date.now() },
          categories: s.profile.categories.length ? s.profile.categories : s.categories,
          verified: false,
          online: false,
        })),
      setVerifyStatus: (status) => set((s) => ({ profile: { ...s.profile, status }, verified: status === 'approved' })),
      addPriority: (points, promo) =>
        set((s) => ({ priorityPoints: s.priorityPoints + points, usedPromos: promo ? [...s.usedPromos, promo] : s.usedPromos })),
      addIncome: (amount) => set((s) => ({ todayIncome: s.todayIncome + amount, todayJobs: s.todayJobs + 1 })),
      setNotifications: (notifications) => set({ notifications }),
    }),
    {
      name: 'uyservice-master',
      storage: createJSONStorage(() => AsyncStorage),
      // "Onlayn" holati saqlanmaydi: ilova qayta ochilganda usta o'zi ishga chiqadi
      partialize: ({ online: _online, ...rest }) => rest,
    },
  ),
);

/** Ustaga kelgan taklif / bajarilayotgan ish (5-bosqichda: offers + orders jadvallari, Realtime) */
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
};

type MasterWorkState = {
  offer: MasterOrder | null;
  job: MasterOrder | null;
  setOffer: (o: MasterOrder | null) => void;
  acceptOffer: () => void;
  finishJob: () => void;
};

export const useMasterWork = create<MasterWorkState>((set) => ({
  offer: null,
  job: null,
  setOffer: (offer) => set({ offer }),
  acceptOffer: () => set((s) => ({ job: s.offer, offer: null })),
  finishJob: () => set({ job: null }),
}));

/** Ustaning joylashuvi serverga (master_locations) har 5 s yuboriladi — oxirgi yuborilgan */
type LocationLogState = { last: LatLng | null; lastAt: number; sent: number; record: (p: LatLng) => void };
export const useLocationLog = create<LocationLogState>((set) => ({
  last: null,
  lastAt: 0,
  sent: 0,
  record: (p) => set((s) => ({ last: p, lastAt: Date.now(), sent: s.sent + 1 })),
}));

// Chatlar (soxta, mahalliy) — 5-bosqichda Supabase Realtime
export type ChatMessage = { id: string; mine: boolean; text: string; at: number };
export type Chat = { id: string; title: string; subtitle: string; kind: 'support' | 'news' | 'client' | 'master'; unread: number; messages: ChatMessage[] };

type ChatState = {
  chats: Chat[];
  send: (chatId: string, text: string) => void;
  /** Suhbatdoshdan xabar (soxta javob; 5-bosqichda Realtime) */
  receive: (chatId: string, text: string) => void;
  /** Buyurtma bo'yicha chat bo'lmasa — yaratadi */
  ensure: (chat: Omit<Chat, 'messages' | 'unread'>) => void;
  markRead: (chatId: string) => void;
};

const msg = (mine: boolean, text: string): ChatMessage => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, mine, text, at: Date.now() });

export const useChats = create<ChatState>((set) => ({
  chats: mockChats,
  send: (chatId, text) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, msg(true, text)] } : c)) })),
  receive: (chatId, text) =>
    set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: c.unread + 1, messages: [...c.messages, msg(false, text)] } : c)) })),
  ensure: (chat) =>
    set((s) => (s.chats.some((c) => c.id === chat.id) ? s : { chats: [{ ...chat, unread: 0, messages: [] }, ...s.chats] })),
  markRead: (chatId) => set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)) })),
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
  phaseAt: number;
};

type OrdersState = {
  orders: ActiveOrder[];
  /** Joriy qoralamadan yangi buyurtma yaratadi, id qaytaradi */
  create: () => string;
  update: (id: string, patch: Partial<ActiveOrder>) => void;
  remove: (id: string) => void;
};

export const useOrders = create<OrdersState>((set) => ({
  orders: [],
  create: () => {
    const d = useOrder.getState();
    const id = `o${Date.now()}`;
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
    };
    set((s) => ({ orders: [...s.orders, order] }));
    return id;
  },
  update: (id, patch) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) })),
  remove: (id) => set((s) => ({ orders: s.orders.filter((o) => o.id !== id) })),
}));

export const useActiveOrder = (id: string | undefined) => useOrders((s) => s.orders.find((o) => o.id === id));
