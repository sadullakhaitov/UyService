import {
  AirVent, Armchair, Bug, Droplets, Flame, Flower2, Hammer, KeyRound, PaintRoller, ShieldCheck, Sparkles, SprayCan, Trees, Truck, Tv,
  WashingMachine, Wrench, Zap, type LucideIcon,
} from 'lucide-react-native';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { getLanguage, t, type Lang } from '@/lib/i18n';
import { pick } from './theme';

// Chaqiruv narxi (usta kelib ko'rishi) — hamma kategoriya uchun bir xil.
export const CALL_FEE = 50_000;

// Ishga kafolat muddati (kun)
export const WARRANTY_DAYS = 30;

/** Asl 6 yo'nalish (nomi locales/*.json → categories.<id>) */
export type BuiltinCategoryId = 'plumber' | 'electric' | 'aircon' | 'furniture' | 'repair' | 'appliance';
/** Admin qo'shganlari — server bergan id (`c` + 8 belgi) */
export type CategoryId = BuiltinCategoryId | (string & {});

export type Category = {
  id: CategoryId;
  icon: LucideIcon;
  /** Kategoriyaning o'z rangi: tugmalar, to'lqinlar, yo'l chizig'i, usta belgisi */
  main: string;
  /** `main` ustidagi matn rangi */
  onMain: string;
  /** Och fon (kartochka, tanlangan chip foni) */
  tint: string;
  /** Och fondagi ikonka/matn rangi */
  ink: string;
  callFee: number;
};

type Tones = { main: string; onMain: string; tint: string; ink: string };

// Rang to'plami: kunduzgi va tungi variant. Maydonlar o'qilganda joriy rejim rangi qaytadi.
function category(id: CategoryId, icon: LucideIcon, day: Tones, night: Tones): Category {
  const c = { id, icon, callFee: CALL_FEE } as Category;
  for (const k of ['main', 'onMain', 'tint', 'ink'] as const) {
    Object.defineProperty(c, k, { enumerable: true, get: () => pick(day[k], night[k]) });
  }
  return c;
}

// Har bir ishning o'z rangi: santexnik — suv, elektrik — chaqmoq, konditsioner — sovuq ko'k ...
// Tungi rejimda asosiy rang biroz yorqinroq, och fon — to'q, ikonka/matn — och.
const BUILTIN: Category[] = [
  category('plumber', Droplets,
    { main: '#0B6FB8', onMain: '#FFFFFF', tint: '#E3F1FB', ink: '#0B6FB8' },
    { main: '#2A8BD6', onMain: '#FFFFFF', tint: '#132A3B', ink: '#7DBDF0' }),
  category('electric', Zap,
    { main: '#F5B800', onMain: '#2B2100', tint: '#FFF6D6', ink: '#8A6500' },
    { main: '#F5B800', onMain: '#2B2100', tint: '#342A0B', ink: '#F5C842' }),
  category('aircon', AirVent,
    { main: '#0E7490', onMain: '#FFFFFF', tint: '#E0F4F8', ink: '#0E7490' },
    { main: '#1A93B5', onMain: '#FFFFFF', tint: '#10303A', ink: '#6CC8E0' }),
  category('furniture', Armchair,
    { main: '#8B5A2B', onMain: '#FFFFFF', tint: '#F5ECE3', ink: '#7A4B23' },
    { main: '#A87240', onMain: '#FFFFFF', tint: '#33251A', ink: '#D9A877' }),
  category('repair', PaintRoller,
    { main: '#6D3FC0', onMain: '#FFFFFF', tint: '#EFE8FA', ink: '#5B3A9B' },
    { main: '#8B5CE0', onMain: '#FFFFFF', tint: '#2A2040', ink: '#BBA0F0' }),
  category('appliance', WashingMachine,
    { main: '#3F5A6B', onMain: '#FFFFFF', tint: '#E8EEF2', ink: '#3F5A6B' },
    { main: '#5F8196', onMain: '#FFFFFF', tint: '#1F2A31', ink: '#9DB8C8' }),
];

export type Problem = {
  id: string;
  categoryId: CategoryId;
  priceMin: number | null; // null — "kelishiladi"
  priceMax: number | null;
};

// Matnlari locales/uz.json → problems.<id>
const BUILTIN_PROBLEMS: Problem[] = [
  { id: 'tap', categoryId: 'plumber', priceMin: 50_000, priceMax: 120_000 },
  { id: 'toilet', categoryId: 'plumber', priceMin: 80_000, priceMax: 200_000 },
  { id: 'pipe', categoryId: 'plumber', priceMin: 100_000, priceMax: 300_000 },
  { id: 'clog', categoryId: 'plumber', priceMin: 60_000, priceMax: 150_000 },
  { id: 'boiler', categoryId: 'plumber', priceMin: 150_000, priceMax: 250_000 },

  { id: 'noPower', categoryId: 'electric', priceMin: 60_000, priceMax: 200_000 },
  { id: 'socket', categoryId: 'electric', priceMin: 40_000, priceMax: 100_000 },
  { id: 'chandelier', categoryId: 'electric', priceMin: 80_000, priceMax: 200_000 },
  { id: 'wiring', categoryId: 'electric', priceMin: 200_000, priceMax: 800_000 },

  { id: 'acNotCooling', categoryId: 'aircon', priceMin: 100_000, priceMax: 300_000 },
  { id: 'acCleaning', categoryId: 'aircon', priceMin: 120_000, priceMax: 200_000 },
  { id: 'acInstall', categoryId: 'aircon', priceMin: 300_000, priceMax: 600_000 },
  { id: 'acLeak', categoryId: 'aircon', priceMin: 80_000, priceMax: 200_000 },

  { id: 'assembly', categoryId: 'furniture', priceMin: 100_000, priceMax: 400_000 },
  { id: 'hinge', categoryId: 'furniture', priceMin: 40_000, priceMax: 120_000 },
  { id: 'furnitureFix', categoryId: 'furniture', priceMin: 80_000, priceMax: 250_000 },

  { id: 'paint', categoryId: 'repair', priceMin: null, priceMax: null },
  { id: 'tile', categoryId: 'repair', priceMin: null, priceMax: null },
  { id: 'door', categoryId: 'repair', priceMin: 80_000, priceMax: 250_000 },

  { id: 'washer', categoryId: 'appliance', priceMin: 100_000, priceMax: 350_000 },
  { id: 'fridge', categoryId: 'appliance', priceMin: 120_000, priceMax: 400_000 },
  { id: 'stove', categoryId: 'appliance', priceMin: 80_000, priceMax: 250_000 },
];

// ---------- Katalog serverdan (admin → Narxlar va katalog) ----------
// `categories` va `problems` — ilovada ko'rinadiganlari (o'chirilgan/yashirilganlarsiz), joyida yangilanadi.
// Ro'yxat chizadigan komponent `useCatalog()` chaqiradi — katalog kelganda qayta chiziladi.

/** Admin qo'shgan yo'nalish uchun tanlanadigan ikonkalar (server: catalog_icons()) */
export const CUSTOM_ICONS: Record<string, LucideIcon> = {
  wrench: Wrench, hammer: Hammer, trees: Trees, flower: Flower2, sparkles: Sparkles, spray: SprayCan,
  truck: Truck, key: KeyRound, flame: Flame, tv: Tv, bug: Bug, shield: ShieldCheck,
};

/** Admin qo'shgan yo'nalish ranglari (server: catalog_tones()): kunduzgi va tungi */
export const TONES: Record<string, { day: Tones; night: Tones }> = {
  green: { day: { main: '#2E7D32', onMain: '#FFFFFF', tint: '#E6F4E7', ink: '#2E7D32' }, night: { main: '#43A047', onMain: '#FFFFFF', tint: '#16301A', ink: '#8FD493' } },
  teal: { day: { main: '#00796B', onMain: '#FFFFFF', tint: '#E0F2EF', ink: '#00796B' }, night: { main: '#14998A', onMain: '#FFFFFF', tint: '#0F2E2B', ink: '#6CD3C5' } },
  blue: { day: { main: '#1565C0', onMain: '#FFFFFF', tint: '#E3EEFA', ink: '#1565C0' }, night: { main: '#2F80D9', onMain: '#FFFFFF', tint: '#14263D', ink: '#86B8F0' } },
  indigo: { day: { main: '#3949AB', onMain: '#FFFFFF', tint: '#E8EAF7', ink: '#3949AB' }, night: { main: '#5C6BD0', onMain: '#FFFFFF', tint: '#1C2040', ink: '#A5AEEC' } },
  purple: { day: { main: '#8E24AA', onMain: '#FFFFFF', tint: '#F4E6F8', ink: '#7B1FA2' }, night: { main: '#AB47BC', onMain: '#FFFFFF', tint: '#2E1A35', ink: '#D59BE0' } },
  pink: { day: { main: '#C2185B', onMain: '#FFFFFF', tint: '#FBE4EE', ink: '#C2185B' }, night: { main: '#E0457F', onMain: '#FFFFFF', tint: '#3A1726', ink: '#F29BBC' } },
  red: { day: { main: '#C62828', onMain: '#FFFFFF', tint: '#FBE7E7', ink: '#C62828' }, night: { main: '#E04848', onMain: '#FFFFFF', tint: '#3A1818', ink: '#F29B9B' } },
  orange: { day: { main: '#E8772E', onMain: '#FFFFFF', tint: '#FDEFE5', ink: '#B65A1C' }, night: { main: '#F08A45', onMain: '#2B1500', tint: '#3A2414', ink: '#F5B485' } },
  amber: { day: { main: '#F59E0B', onMain: '#2B1D00', tint: '#FEF3DC', ink: '#92600A' }, night: { main: '#F5A524', onMain: '#2B1D00', tint: '#36280D', ink: '#F7C870' } },
  brown: { day: { main: '#6D4C41', onMain: '#FFFFFF', tint: '#F1EAE7', ink: '#6D4C41' }, night: { main: '#8D6E63', onMain: '#FFFFFF', tint: '#2E2420', ink: '#C9ABA0' } },
  slate: { day: { main: '#455A64', onMain: '#FFFFFF', tint: '#E9EEF1', ink: '#455A64' }, night: { main: '#62808E', onMain: '#FFFFFF', tint: '#1F2A30', ink: '#A3BAC5' } },
};

export type CatalogNames = { uz: string; ru: string; en: string };
/** Server qatori (categories): asl yo'nalishlarda nom/ikonka/rang yo'q */
export type CatalogCategoryRow = {
  id: string; active: boolean; deleted: boolean; sort: number; callFee: number;
  names: CatalogNames | null; icon: string | null; tone: string | null;
};
export type CatalogProblemRow = {
  id: string; categoryId: string; priceMin: number | null; priceMax: number | null; sort: number; deleted: boolean;
  names: CatalogNames | null;
};

const BUILTIN_IDS = new Set<string>(BUILTIN.map((c) => c.id));
const known = new Map<string, Category>(BUILTIN.map((c) => [c.id, c]));
const catNames = new Map<string, CatalogNames>();
const problemNames = new Map<string, CatalogNames>();
const knownProblems = new Map<string, Problem>(BUILTIN_PROBLEMS.map((p) => [p.id, p]));

/** Ilovada ko'rinadigan yo'nalishlar (tartib bo'yicha) */
export const categories: Category[] = [...BUILTIN];
/** Ilovada ko'rinadigan muammolar */
export const problems: Problem[] = [...BUILTIN_PROBLEMS];

const catalogStore = createStore<{ version: number }>(() => ({ version: 0 }));
/** Katalog yangilanganda komponentni qayta chizish uchun (ro'yxat chizadigan komponent boshida) */
export const useCatalog = () => useStore(catalogStore, (s) => s.version);

const customCategory = (r: CatalogCategoryRow) => {
  const tone = TONES[r.tone ?? ''] ?? TONES.slate;
  return category(r.id, CUSTOM_ICONS[r.icon ?? ''] ?? Wrench, tone.day, tone.night);
};

/** Serverdan kelgan katalogni qo'llaydi: yangi/o'chirilgan yo'nalish va muammolar, narx oraliqlari */
export function applyCatalog(cats: CatalogCategoryRow[], probs: CatalogProblemRow[]) {
  const visible: Category[] = [];
  const seen = new Set<string>();
  for (const r of [...cats].sort((a, b) => a.sort - b.sort)) {
    seen.add(r.id);
    let c = known.get(r.id);
    if (!BUILTIN_IDS.has(r.id)) {
      c = customCategory(r);
      known.set(r.id, c);
      if (r.names) catNames.set(r.id, r.names);
    }
    if (c && r.active && !r.deleted) visible.push(c);
  }
  // serverda hali yo'q asl yo'nalish (eski baza) — ko'rinib turadi
  for (const c of BUILTIN) if (!seen.has(c.id)) visible.push(c);
  const shown = new Set(visible.map((c) => c.id));

  const list: Problem[] = [];
  const seenP = new Set<string>();
  for (const r of [...probs].sort((a, b) => a.sort - b.sort)) {
    seenP.add(r.id);
    const p: Problem = { id: r.id, categoryId: r.categoryId, priceMin: r.priceMin, priceMax: r.priceMax };
    knownProblems.set(r.id, p);
    if (r.names) problemNames.set(r.id, r.names);
    if (!r.deleted && shown.has(r.categoryId)) list.push(p);
  }
  for (const p of BUILTIN_PROBLEMS) if (!seenP.has(p.id) && shown.has(p.categoryId)) list.push(p);

  categories.splice(0, categories.length, ...visible);
  problems.splice(0, problems.length, ...list);
  catalogStore.setState((s) => ({ version: s.version + 1 }));
}

const nameIn = (n: CatalogNames, lang: Lang) => n[lang] || n.uz;

/** Yo'nalish nomi joriy tilda (asl — locales, admin qo'shgan — serverdan) */
export function catName(id: string) {
  const n = catNames.get(id);
  if (n) return nameIn(n, getLanguage());
  return BUILTIN_IDS.has(id) ? t(`categories.${id}`) : t('catalog.unknown');
}

/** Muammo nomi joriy tilda ("other" — "Boshqa") */
export function problemName(id: string) {
  const n = problemNames.get(id);
  if (n) return nameIn(n, getLanguage());
  const key = `problems.${id}`;
  const v = t(key);
  return v === key ? t('problems.other') : v;
}

/** Asl yo'nalishmi (admin o'chira oladi, lekin nomi/ikonkasi ilovada) */
export const isBuiltinCategory = (id: string) => BUILTIN_IDS.has(id);

const FALLBACK = category('unknown', Wrench, TONES.slate.day, TONES.slate.night);

/** Yo'nalish (o'chirilgani ham — eski buyurtmalar uchun); noma'lum bo'lsa — kulrang kalit */
export const getCategory = (id: CategoryId) => known.get(id) ?? FALLBACK;
export const problemsOf = (id: CategoryId) => problems.filter((p) => p.categoryId === id);
/** Muammo (o'chirilgani ham) */
export const getProblem = (id: string) => knownProblems.get(id);
