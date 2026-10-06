import uz from '@/locales/uz.json';

type Dict = { [k: string]: string | Dict };
const dict: Dict = uz;

// t('order.submit'), t('common.sum', { value: '50 000' })
export function t(key: string, params?: Record<string, string | number>): string {
  const value = key.split('.').reduce<string | Dict | undefined>(
    (node, part) => (typeof node === 'object' ? node[part] : undefined),
    dict,
  );
  if (typeof value !== 'string') return key;
  if (!params) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name] ?? ''));
}

// 50000 → "50 000"
export function formatNumber(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export const formatSum = (n: number) => t('common.sum', { value: formatNumber(n) });

export function formatRange(min: number | null, max: number | null) {
  if (min == null || max == null) return t('common.negotiable');
  return t('common.thousand', { value: `${min / 1000}–${max / 1000}` });
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
export const formatDate = (d: Date) => `${d.getDate()}-${MONTHS[d.getMonth()]}`;
