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

// Ko'plik shakli: o'zbekchada so'z o'zgarmaydi; inglizchada 1 / ko'p; ruschada 1 / 2–4 / 5+ ("работа / работы / работ")
type PluralForm = 'one' | 'few' | 'many' | 'other';
function pluralForm(n: number, lang: Lang): PluralForm {
  if (lang === 'en') return n === 1 ? 'one' : 'other';
  if (lang === 'ru') {
    const d = n % 10;
    const h = n % 100;
    if (d === 1 && h !== 11) return 'one';
    if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'few';
    return 'many';
  }
  return 'other';
}
const isPlural = (v: unknown): v is Partial<Record<PluralForm, string>> & { other: string } =>
  typeof v === 'object' && v !== null && typeof (v as Dict).other === 'string';

// t('order.submit'), t('common.sum', { value: '50 000' })
// Ko'plik: kalit qiymati { one, few, many, other } bo'lsa — shakl params.count (yoki n, days, years) bo'yicha tanlanadi
export function t(key: string, params?: Record<string, string | number>): string {
  const find = (d: Dict) =>
    key.split('.').reduce<string | Dict | undefined>((node, part) => (typeof node === 'object' ? node[part] : undefined), d);
  let value = find(dicts[current]);
  let lang = current;
  if (typeof value !== 'string' && !isPlural(value)) {
    value = find(uz); // tarjima bo'lmasa — o'zbekcha
    lang = 'uz';
  }
  if (isPlural(value)) {
    const n = Number(params?.count ?? params?.n ?? params?.days ?? params?.years ?? 0);
    value = value[pluralForm(n, lang)] ?? value.other;
  }
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

const pad = (n: number) => String(n).padStart(2, '0');
export const formatTime = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** "Bugun, 14:00" / "Ertaga, 09:00" / "12-oktabr, 18:00" */
export function formatDay(ms: number) {
  const d = new Date(ms);
  const today = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
  if (diff === 0) return t('schedule.today');
  if (diff === 1) return t('schedule.tomorrow');
  return formatDate(d);
}
export const formatSchedule = (ms: number) => `${formatDay(ms)}, ${formatTime(ms)}`;
