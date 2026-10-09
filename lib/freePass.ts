// Bepul davr kodlari (ishga tushirish aksiyasi; server — migrations/…_free_passes.sql).
// Admin ustaning raqamiga 30 / 60 / 90 kunlik shaxsiy kod yaratadi va Telegram yoki SMS bilan yuboradi;
// usta kodni Profil → Promokod bo'limiga kiritadi → shu muddat platforma hech qanday ulush olmaydi.
// Pasport majburiy: kod kiritishda yuklangan bo'lishi kerak, hujjat rad etilsa — bepul davr amal qilmaydi.
// Sinov rejimida kodlar shu qurilmada saqlanadi (admin panel va usta ilovasi — bitta brauzer).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMaster, type VerifyStatus } from '@/store';

export const FREE_DAYS = [30, 60, 90] as const;
export type FreeDays = (typeof FREE_DAYS)[number];
/** Kodni yaratilganidan shuncha kun ichida kiritish kerak (server: redeem_by) */
export const FREE_REDEEM_DAYS = 30;
const DAY = 86_400_000;

/** Bepul davr hozir amaldami (server: master_free) */
export function freeActive(freeUntil: number | null | undefined, status: VerifyStatus, now = Date.now()) {
  return !!freeUntil && freeUntil > now && (status === 'pending' || status === 'approved');
}

/** Qolgan kunlar (yuqoriga yaxlitlab) */
export const freeDaysLeft = (freeUntil: number, now = Date.now()) => Math.max(0, Math.ceil((freeUntil - now) / DAY));

// ---------- Sinov rejimi ----------
export type DemoPass = {
  code: string;
  phone: string;
  days: FreeDays;
  createdAt: number;
  redeemBy: number;
  sentVia: 'telegram' | 'sms' | null;
  redeemedAt: number | null;
  revokedAt: number | null;
  revokeReason: string | null;
};
const KEY = 'uyservice-free-passes';

export async function loadDemoPasses(): Promise<DemoPass[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoPass[]) : [];
  } catch {
    return [];
  }
}

export async function saveDemoPasses(list: DemoPass[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
}

// O, 0, I, 1 yo'q — og'zaki aytganda adashmasin (server: new_free_pass_code)
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newFreeCode = () => `UY${Array.from({ length: 8 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')}`;

export const passStatus = (p: DemoPass, now = Date.now()): 'pending' | 'redeemed' | 'expired' | 'revoked' =>
  p.revokedAt ? 'revoked' : p.redeemedAt ? 'redeemed' : p.redeemBy < now ? 'expired' : 'pending';

export type RedeemError = 'invalid' | 'used' | 'expired' | 'phone' | 'passport' | 'freeUsed';

/**
 * Sinov rejimi: shu qurilmadagi usta kodni kiritadi. Natija — yangi bepul davr oxiri (ms) yoki xato.
 * Server rejimida — redeem_promo (lib/live.ts → liveRedeemPromo).
 */
export async function demoRedeemFree(
  code: string,
  me: { phone: string; status: VerifyStatus; hasPassport: boolean; freeUntil: number | null; usedFree: boolean },
): Promise<{ days: FreeDays; until: number } | { error: RedeemError } | null> {
  const list = await loadDemoPasses();
  const p = list.find((x) => x.code === code);
  if (!p) return null; // bepul davr kodi emas — oddiy promokod sifatida tekshiriladi
  const now = Date.now();
  const digits = (s: string) => s.replace(/\D/g, '').replace(/^(\d{9})$/, '998$1');
  if (p.revokedAt) return { error: 'invalid' };
  if (p.redeemedAt) return { error: me.usedFree ? 'used' : 'invalid' };
  if (p.redeemBy < now) return { error: 'expired' };
  if (digits(p.phone) !== digits(me.phone)) return { error: 'phone' };
  if (me.usedFree) return { error: 'freeUsed' };
  if (!me.hasPassport || (me.status !== 'pending' && me.status !== 'approved')) return { error: 'passport' };
  const until = Math.max(now, me.freeUntil ?? now) + p.days * DAY;
  p.redeemedAt = now;
  await saveDemoPasses(list);
  return { days: p.days, until };
}

/** Ustaning bepul davri oxiri (ms), agar hozir amalda bo'lsa; aks holda null */
export function useFreeUntil(): number | null {
  const freeUntil = useMaster((s) => s.freeUntil);
  const status = useMaster((s) => s.profile.status);
  return freeActive(freeUntil, status) ? freeUntil : null;
}

/** Hook'siz (qabul qilish paytida ulushni qotirish uchun) */
export const isFreeNow = () => {
  const s = useMaster.getState();
  return freeActive(s.freeUntil, s.profile.status);
};
