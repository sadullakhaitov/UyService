// Usta qaysi to'lov modelida ishlashini o'zi tanlaydi: oylik obuna yoki komissiya.
// ⚠️ Narx va foiz hali tasdiqlanmagan — shu yerdan o'zgartiriladi.
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

// Ustaning bitta ishdan platformaga beradigan ulushi
export function platformCut(plan: BillingPlan, finalPrice: number) {
  return Math.round((finalPrice * BILLING[plan].commissionPercent) / 100);
}
