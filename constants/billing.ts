// Usta qaysi to'lov modelida ishlashini o'zi tanlaydi: oylik obuna yoki komissiya.
// ⚠️ Narx va foiz hali tasdiqlanmagan — shu yerdan o'zgartiriladi.
import { t } from '@/lib/i18n';

export type BillingPlan = 'subscription' | 'commission';

export const BILLING = {
  subscription: {
    monthlyFee: 149_000, // so'm / oy — TASDIQLANSIN
    commissionPercent: 0,
  },
  commission: {
    monthlyFee: 0,
    commissionPercent: 10, // har bir ish narxidan, chaqiruv narxi ham kiradi — TASDIQLANSIN
  },
} as const;

// Komissiya tarifi: usta naqd pulni o'zi oladi, platforma ulushi balansidan yechiladi.
// Balans shu limitdan past bo'lsa — naqd buyurtmalar yopiladi (Yandex Pro'dagidek). TASDIQLANSIN
export const BALANCE_LIMIT = 20_000;

// Pasport va selfi ixtiyoriy: hujjati tasdiqlanmagan usta ham buyurtma oladi, faqat ulushi shuncha foizga ko'p
export const UNVERIFIED_SURCHARGE_PERCENT = 5;

/** Ustaning bitta ishdan beradigan ulushi, %: komissiya 10 / obuna 0, tasdiqlanmagan bo'lsa +5 (server: master_fee_percent) */
export function feePercent(plan: BillingPlan, verified: boolean) {
  return BILLING[plan].commissionPercent + (verified ? 0 : UNVERIFIED_SURCHARGE_PERCENT);
}

/** Tarif nomi foiz bilan: "Komissiya · 15%", "Oylik obuna · +5%" */
export function planLabel(plan: BillingPlan, verified: boolean) {
  const pct = feePercent(plan, verified);
  return plan === 'subscription' ? `${t('plan.subscription')}${pct ? ` · +${pct}%` : ''}` : `${t('plan.commission')} · ${pct}%`;
}

// Do'st (boshqa usta) taklif qilgani uchun bonus, so'm (⚠️ hali tasdiqlanmagan)
export const INVITE_BONUS = 30_000;
// Bonus do'st shuncha ishni bajargach beriladi (server: invite_jobs())
export const INVITE_JOBS = 5;
