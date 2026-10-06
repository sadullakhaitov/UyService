import en from '@/locales/en.json';
import ru from '@/locales/ru.json';
import uz from '@/locales/uz.json';

export type Lang = 'uz' | 'ru' | 'en';
export const LANGS: Lang[] = ['uz', 'ru', 'en'];

type Dict = { [k: string]: string | Dict };
const dicts: Record<Lang, Dict> = { uz, ru, en };
let current: Lang = 'uz';

// Til almashtirilganda ilova ildizi qayta chiziladi (app/_layout.tsx → key={lang})
export function setLanguage(lang: Lang) {
  current = lang;
}
export const getLanguage = () => current;

// t('order.submit'), t('common.sum', { value: '50 000' })
export function t(key: string, params?: Record<string, string | number>): string {
  const find = (d: Dict) =>
    key.split('.').reduce<string | Dict | undefined>((node, part) => (typeof node === 'object' ? node[part] : undefined), d);
  let value = find(dicts[current]);
  if (typeof value !== 'string') value = find(uz); // tarjima bo'lmasa — o'zbekcha
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

const MONTHS: Record<Lang, string[]> = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
export const formatDate = (d: Date) =>
  current === 'uz' ? `${d.getDate()}-${MONTHS.uz[d.getMonth()]}` : current === 'ru' ? `${d.getDate()} ${MONTHS.ru[d.getMonth()]}` : `${MONTHS.en[d.getMonth()]} ${d.getDate()}`;
