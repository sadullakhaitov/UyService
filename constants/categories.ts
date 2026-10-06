import { AirVent, Armchair, Droplets, PaintRoller, WashingMachine, Zap, type LucideIcon } from 'lucide-react-native';
import { pick } from './theme';

// Chaqiruv narxi (usta kelib ko'rishi) — hamma kategoriya uchun bir xil.
export const CALL_FEE = 50_000;

// Ishga kafolat muddati (kun)
export const WARRANTY_DAYS = 30;

export type CategoryId = 'plumber' | 'electric' | 'aircon' | 'furniture' | 'repair' | 'appliance';

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
export const categories: Category[] = [
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
export const problems: Problem[] = [
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

export const getCategory = (id: CategoryId) => categories.find((c) => c.id === id)!;
export const problemsOf = (id: CategoryId) => problems.filter((p) => p.categoryId === id);
