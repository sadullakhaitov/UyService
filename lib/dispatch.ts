// Usta qidirish algoritmi (TZ, 7-bo'lim). Kod — supabase/functions/_shared/dispatch.ts da:
// ilova (lib/orderSimulator.ts) va Supabase Edge Function'lar (dispatch, offer-respond, offer-timeout) bir xil faylni ishlatadi.
// Bu yerda faqat ilovaning kategoriya turi (CategoryId) bilan qayta eksport qilinadi.
import type { CategoryId } from '@/constants/categories';
import type * as core from '../supabase/functions/_shared/dispatch';

export type DispatchMaster = core.DispatchMaster<CategoryId>;
export type DispatchOrder = core.DispatchOrder<CategoryId>;
export type { Candidate, DispatchEvent, DispatchState, EtaFn } from '../supabase/functions/_shared/dispatch';
export {
  advanceDispatch,
  applyActivity,
  radiusKmOf,
  rankCandidates,
  respondDispatch,
  startDispatch,
} from '../supabase/functions/_shared/dispatch';
