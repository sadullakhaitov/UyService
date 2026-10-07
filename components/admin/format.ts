// Admin panel: sana, summa, telefon formatlari (joriy tilda)
import { formatDate, formatNumber, formatSum, formatTime, getLanguage, t } from '@/lib/i18n';

export const fmtSum = formatSum;
export const fmtNum = formatNumber;

/** 1 250 000 → "1,25 mln so'm", 450 000 → "450 ming so'm" — kartochka va grafik o'qlari uchun */
export function fmtSumShort(n: number) {
  const a = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (a >= 1_000_000_000) return `${sign}${t('admin.fmt.bln', { value: trim(a / 1_000_000_000) })}`;
  if (a >= 1_000_000) return `${sign}${t('admin.fmt.mln', { value: trim(a / 1_000_000) })}`;
  if (a >= 10_000) return `${sign}${t('admin.fmt.k', { value: trim(a / 1000) })}`;
  return `${sign}${formatSum(a)}`;
}
/** Grafik o'qi uchun qisqa: 1,2M / 450K / 900 */
export function fmtAxis(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${trim(n / 1_000_000)}M`;
  if (a >= 1000) return `${trim(n / 1000)}K`;
  return String(Math.round(n));
}
function trim(v: number) {
  const s = v >= 100 ? String(Math.round(v)) : v >= 10 ? (Math.round(v * 10) / 10).toString() : (Math.round(v * 100) / 100).toString();
  return getLanguage() === 'en' ? s : s.replace('.', ',');
}

/** O'nli kasr joriy tilda: uz/ru — vergul (4,34), en — nuqta (4.34) */
export function dec(n: number, digits = 1) {
  const s = n.toFixed(digits);
  return getLanguage() === 'en' ? s : s.replace('.', ',');
}

/** Qisqa sana grafik o'qi uchun: 07.10 */
export function fmtDayShort(ms: number) {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function fmtDateTime(ms: number | null | undefined) {
  if (!ms) return '—';
  const d = new Date(ms);
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${formatDate(d)}${year}, ${formatTime(ms)}`;
}
export function fmtDateOnly(ms: number | null | undefined) {
  if (!ms) return '—';
  const d = new Date(ms);
  return `${formatDate(d)}${d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : ''}`;
}

/** "hozirgina", "5 daq oldin", "3 soat oldin", "2 kun oldin", keyin — sana */
export function fmtAgo(ms: number | null | undefined) {
  if (!ms) return '—';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 0) return fmtDateTime(ms);
  if (s < 60) return t('admin.fmt.justNow');
  if (s < 3600) return t('admin.fmt.minAgo', { n: Math.floor(s / 60) });
  if (s < 86_400) return t('admin.fmt.hourAgo', { n: Math.floor(s / 3600) });
  if (s < 7 * 86_400) return t('admin.fmt.dayAgo', { n: Math.floor(s / 86_400) });
  return fmtDateOnly(ms);
}

/** Davomiylik: "45 daq", "2 soat 10 daq" */
export function fmtDuration(ms: number) {
  const m = Math.max(1, Math.round(ms / 60_000));
  if (m < 60) return t('admin.fmt.min', { n: m });
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? t('admin.fmt.hourMin', { h, m: r }) : t('admin.fmt.hour', { n: h });
}

/** "+998901234567" → "+998 90 123 45 67" */
export function fmtPhone(p: string | null | undefined) {
  if (!p) return '—';
  const d = p.replace(/\D/g, '');
  if (d.length !== 12 || !d.startsWith('998')) return p;
  return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

/** Buyurtma raqami: uuid'ning boshi */
export const shortId = (id: string) => `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/** O'zgarish foizi: oldingi 0 bo'lsa — null */
export function delta(cur: number, prev: number) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
}

export const initials = (first?: string | null, last?: string | null) =>
  `${(first ?? '').trim()[0] ?? ''}${(last ?? '').trim()[0] ?? ''}`.toUpperCase() || '?';
