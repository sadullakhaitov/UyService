import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Lang } from '@/lib/i18n';
import type { BillingPlan } from '@/constants/billing';
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from '@/lib/geo';
import { mockChats, mockClient, mockFavorites } from '@/mocks';

export type Role = 'client' | 'master';

// TZ, 6-bo'lim: orders.status
export type OrderStatus =
  | 'draft'
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
  setDraft: (p: Partial<Pick<OrderState, 'categoryId' | 'problemId' | 'description' | 'photos' | 'preferredMasterId'>>) => void;
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
  setDraft: (p) => set(p),
  setAddress: (address, location) => set((s) => ({ address, location: location ?? s.location })),
  reset: () => set({ description: '', photos: [], preferredMasterId: null }),
}));

type MasterState = {
  online: boolean;
  verified: boolean;
  activity: number;
  /** Komissiya tarifida: platforma ulushi shu balansdan yechiladi (so'm) */
  balance: number;
  /** Obuna tarifida: obuna tugash sanasi (ms) */
  subscriptionUntil: number;
  /** Buyurtma filtri: qaysi kategoriyalar va qancha uzoqlikdan */
  categories: CategoryId[];
  radiusKm: number;
  setOnline: (v: boolean) => void;
  bumpActivity: (delta: number) => void;
  setFilter: (p: { categories?: CategoryId[]; radiusKm?: number }) => void;
  /** Komissiya: ish yakunlanganda platforma ulushi balansdan yechiladi */
  charge: (amount: number) => void;
};

export const useMaster = create<MasterState>((set) => ({
  online: false,
  verified: true, // soxta: admin tasdiqlagan
  activity: 86,
  balance: 45_000,
  subscriptionUntil: Date.now() + 18 * 86_400_000,
  categories: ['plumber', 'appliance'],
  radiusKm: 6,
  setOnline: (online) => set({ online }),
  bumpActivity: (d) => set((s) => ({ activity: Math.max(0, Math.min(100, s.activity + d)) })),
  setFilter: (p) => set(p),
  charge: (amount) => set((s) => ({ balance: s.balance - amount })),
}));

// Chatlar (soxta, mahalliy) — 5-bosqichda Supabase Realtime
export type ChatMessage = { id: string; mine: boolean; text: string; at: number };
export type Chat = { id: string; title: string; subtitle: string; kind: 'support' | 'news' | 'client'; unread: number; messages: ChatMessage[] };

type ChatState = {
  chats: Chat[];
  send: (chatId: string, text: string) => void;
  markRead: (chatId: string) => void;
};

export const useChats = create<ChatState>((set) => ({
  chats: mockChats,
  send: (chatId, text) =>
    set((s) => ({
      chats: s.chats.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, { id: String(Date.now()), mine: true, text, at: Date.now() }] } : c,
      ),
    })),
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
  /** Qidiruv holat matni bosqichi (0..3) */
  searchStep: number;
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
      status: 'searching',
      masterId: null,
      createdAt: now,
      searchStep: 0,
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
