// "Vaqtni tanlash": usta kelishi mumkin bo'lgan vaqtlar — bugun, ertaga, indinga; 08:00–21:00, har soatda.
// Bugungi kun uchun eng erta vaqt — hozirdan kamida 1,5 soat keyin (usta topishga ulgurish uchun).
export const DAYS_AHEAD = 3;
export const FIRST_HOUR = 8;
export const LAST_HOUR = 21;
export const MIN_LEAD_MS = 90 * 60_000;

/** Tanlangan vaqt hali ham mumkinmi (vaqt o'tib, eng erta muddatdan o'tib ketmaganmi) */
export const slotStillValid = (at: number, now = Date.now()) => at - now >= MIN_LEAD_MS;

const startOfDay = (offset: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d.getTime();
};

/** Kun (0 — bugun) bo'yicha mavjud vaqtlar (ms) */
export function slotsFor(dayOffset: number, now = Date.now()): number[] {
  const base = startOfDay(dayOffset);
  const out: number[] = [];
  for (let h = FIRST_HOUR; h <= LAST_HOUR; h++) {
    const at = base + h * 3_600_000;
    if (at - now >= MIN_LEAD_MS) out.push(at);
  }
  return out;
}

export function firstSlot(now = Date.now()) {
  for (let d = 0; d < DAYS_AHEAD; d++) {
    const s = slotsFor(d, now);
    if (s.length) return s[0];
  }
  return startOfDay(1) + FIRST_HOUR * 3_600_000;
}

export const dayOffsetOf = (ms: number) => Math.round((new Date(ms).setHours(0, 0, 0, 0) - startOfDay(0)) / 86_400_000);
