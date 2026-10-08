// Admin amallari chegaralari — server (supabase/migrations/…_admin.sql) bilan bir xil.
// Ekran tugmani bosishdan oldin tekshiradi, sinov rejimi (demo.ts) ham shularga amal qiladi.
import { AdminError, type BalanceKind, type PromoInput } from './types';

export const RULES = {
  balanceMax: 10_000_000,
  priorityMin: -50,
  priorityMax: 50,
  subDaysMin: 1,
  subDaysMax: 366,
  amountMax: 10_000_000,
  callFeeMax: 1_000_000,
  priceMax: 100_000_000,
  reasonMax: 500,
  messageMax: 4000,
  promoPriorityMax: 50,
  promoBonusMax: 1_000_000,
  promoUsesMax: 100_000,
} as const;

export const clean = (s: string | null | undefined, max: number = RULES.reasonMax) => (s ?? '').trim().slice(0, max);

export function checkBalance(amount: number, kind: Exclude<BalanceKind, 'fee'>, note?: string) {
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > RULES.balanceMax)
    throw new AdminError('errors.amount');
  if (amount < 0 && kind !== 'adjust') throw new AdminError('errors.minusOnlyAdjust');
  if (kind === 'adjust' && !clean(note)) throw new AdminError('errors.reasonRequired');
}

export function checkSubscription(days: number, amount: number) {
  if (!Number.isInteger(days) || days < RULES.subDaysMin || days > RULES.subDaysMax) throw new AdminError('errors.days');
  if (!Number.isInteger(amount) || amount < 0 || amount > RULES.amountMax) throw new AdminError('errors.amount');
}

export function checkPriority(points: number) {
  if (!Number.isInteger(points) || points < RULES.priorityMin || points > RULES.priorityMax) throw new AdminError('errors.priority');
}

export function checkReason(reason: string | undefined) {
  if (!clean(reason)) throw new AdminError('errors.reasonRequired');
}

export function checkCallFee(fee: number) {
  if (!Number.isInteger(fee) || fee < 0 || fee > RULES.callFeeMax) throw new AdminError('errors.callFee');
}

export function checkPriceRange(min: number | null, max: number | null) {
  if ((min == null) !== (max == null)) throw new AdminError('errors.priceRange');
  if (min != null && max != null && (min < 0 || max > RULES.priceMax || min > max)) throw new AdminError('errors.priceRange');
}

/** Promokod: 3–20 ta lotin harfi/raqam; prioritet 0–50 va/yoki bonus 0–1 000 000; chegara 1–100 000 (…_promo_referrals.sql) */
export function checkPromo(p: PromoInput) {
  if (!/^[A-Z0-9]{3,20}$/.test(p.code)) throw new AdminError('errors.promoCode');
  const int = (n: number, max: number) => Number.isInteger(n) && n >= 0 && n <= max;
  if (!int(p.priority, RULES.promoPriorityMax) || !int(p.bonus, RULES.promoBonusMax) || (p.priority === 0 && p.bonus === 0))
    throw new AdminError('errors.promoValue');
  if (p.maxUses != null && (!Number.isInteger(p.maxUses) || p.maxUses < 1 || p.maxUses > RULES.promoUsesMax)) throw new AdminError('errors.promoValue');
}

/** "+998 90 123 45 67" / "901234567" → "+998901234567"; noto'g'ri bo'lsa — null */
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.length === 9) d = `998${d}`;
  return /^998\d{9}$/.test(d) ? `+${d}` : null;
}
