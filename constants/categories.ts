import { AirVent, Armchair, Droplets, PaintRoller, WashingMachine, Zap, type LucideIcon } from 'lucide-react-native';

// Chaqiruv narxi (usta kelib ko'rishi) — hamma kategoriya uchun bir xil.
export const CALL_FEE = 50_000;

// Ishga kafolat muddati (kun)
export const WARRANTY_DAYS = 30;

export type CategoryId = 'plumber' | 'electric' | 'aircon' | 'furniture' | 'repair' | 'appliance';

export type Category = {
  id: CategoryId;
  icon: LucideIcon;
  tint: string; // kartochka foni
  ink: string; // ikonka rangi
  callFee: number;
};

export const categories: Category[] = [
  { id: 'plumber', icon: Droplets, tint: '#E6F2EE', ink: '#0E5A4B', callFee: CALL_FEE },
  { id: 'electric', icon: Zap, tint: '#FDF0E6', ink: '#B45309', callFee: CALL_FEE },
  { id: 'aircon', icon: AirVent, tint: '#E8F0FA', ink: '#1D4E89', callFee: CALL_FEE },
  { id: 'furniture', icon: Armchair, tint: '#F3EDE6', ink: '#7A4B23', callFee: CALL_FEE },
  { id: 'repair', icon: PaintRoller, tint: '#EFEAF7', ink: '#5B3A9B', callFee: CALL_FEE },
  { id: 'appliance', icon: WashingMachine, tint: '#E6F2F2', ink: '#1F6F70', callFee: CALL_FEE },
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
