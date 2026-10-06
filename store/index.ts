import { create } from 'zustand';
import type { BillingPlan } from '@/constants/billing';
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from '@/lib/geo';
import { mockClient, mockFavorites } from '@/mocks';

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
  setOnline: (v: boolean) => void;
  bumpActivity: (delta: number) => void;
};

export const useMaster = create<MasterState>((set) => ({
  online: false,
  verified: true, // soxta: admin tasdiqlagan
  activity: 86,
  setOnline: (online) => set({ online }),
  bumpActivity: (d) => set((s) => ({ activity: Math.max(0, Math.min(100, s.activity + d)) })),
}));
