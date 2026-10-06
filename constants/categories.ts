import { AirVent, Armchair, Droplets, PaintRoller, WashingMachine, Zap, type LucideIcon } from 'lucide-react-native';

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

// Har bir ishning o'z rangi: santexnik — suv, elektrik — chaqmoq, konditsioner — sovuq ko'k ...
export const categories: Category[] = [
  { id: 'plumber', icon: Droplets, main: '#0B6FB8', onMain: '#FFFFFF', tint: '#E3F1FB', ink: '#0B6FB8', callFee: CALL_FEE },
  { id: 'electric', icon: Zap, main: '#F5B800', onMain: '#2B2100', tint: '#FFF6D6', ink: '#8A6500', callFee: CALL_FEE },
  { id: 'aircon', icon: AirVent, main: '#0E7490', onMain: '#FFFFFF', tint: '#E0F4F8', ink: '#0E7490', callFee: CALL_FEE },
  { id: 'furniture', icon: Armchair, main: '#8B5A2B', onMain: '#FFFFFF', tint: '#F5ECE3', ink: '#7A4B23', callFee: CALL_FEE },
  { id: 'repair', icon: PaintRoller, main: '#6D3FC0', onMain: '#FFFFFF', tint: '#EFE8FA', ink: '#5B3A9B', callFee: CALL_FEE },
  { id: 'appliance', icon: WashingMachine, main: '#3F5A6B', onMain: '#FFFFFF', tint: '#E8EEF2', ink: '#3F5A6B', callFee: CALL_FEE },
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
