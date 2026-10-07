// Admin sessiyasi: kim kirdi va oxirgi faollik. Uzoq vaqt (ADMIN_IDLE_MS) harakatsiz qolsa — qayta kirish so'raladi.
// Server ulangan bo'lsa haqiqiy kirish Supabase Auth orqali (SMS kod), bu yerda faqat qulaylik uchun raqam va vaqt.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const ADMIN_IDLE_MS = 8 * 3600_000;

type Session = {
  phone: string | null;
  since: number;
  lastActive: number;
  signIn: (phone: string) => void;
  touch: () => void;
  clear: () => void;
};

export const useAdminSession = create<Session>()(
  persist(
    (set) => ({
      phone: null,
      since: 0,
      lastActive: 0,
      signIn: (phone) => set({ phone, since: Date.now(), lastActive: Date.now() }),
      touch: () => set({ lastActive: Date.now() }),
      clear: () => set({ phone: null, since: 0, lastActive: 0 }),
    }),
    { name: 'uyservice-admin-session', storage: createJSONStorage(() => AsyncStorage), version: 1 },
  ),
);

/** Sessiya muddati o'tganmi (uzoq harakatsizlik) */
export const sessionExpired = (s: { phone: string | null; lastActive: number }) => !s.phone || Date.now() - s.lastActive > ADMIN_IDLE_MS;
