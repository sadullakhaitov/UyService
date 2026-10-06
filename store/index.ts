import { create } from 'zustand';
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
  phone: string;
  role: Role | null;
  billingPlan: BillingPlan | null;
  favorites: string[];
  setPhone: (phone: string) => void;
  setRole: (role: Role) => void;
  setBillingPlan: (plan: BillingPlan) => void;
  toggleFavorite: (masterId: string, on?: boolean) => void;
  logout: () => void;
};

export const useUser = create<UserState>((set) => ({
  phone: '',
  role: null,
  billingPlan: null,
  favorites: mockFavorites,
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
}));

type OrderState = {
  status: OrderStatus;
  categoryId: CategoryId;
  problemId: string;
  description: string;
  photos: string[];
  address: string;
  location: LatLng;
  masterId: string | null;
  preferredMasterId: string | null; // "Mening ustalarim"dan tanlansa, taklif birinchi unga boradi
  setDraft: (p: Partial<Pick<OrderState, 'categoryId' | 'problemId' | 'description' | 'photos' | 'preferredMasterId'>>) => void;
  setAddress: (address: string, location?: LatLng) => void;
  setStatus: (status: OrderStatus) => void;
  assign: (masterId: string) => void;
  reset: () => void;
};

export const useOrder = create<OrderState>((set) => ({
  status: 'draft',
  categoryId: 'plumber',
  problemId: 'tap',
  description: '',
  photos: [],
  address: mockClient.address,
  location: mockClient.location,
  masterId: null,
  preferredMasterId: null,
  setDraft: (p) => set(p),
  setAddress: (address, location) => set((s) => ({ address, location: location ?? s.location })),
  setStatus: (status) => set({ status }),
  assign: (masterId) => set({ masterId, status: 'assigned' }),
  reset: () => set({ status: 'draft', description: '', photos: [], masterId: null, preferredMasterId: null }),
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
