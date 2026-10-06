// UyService ranglari (TZ, 8-bo'lim). To'q yashil — ishonch, to'q sariq — mehnat/asbob rangi.
// Ikki rejim: kunduzgi (light) va tungi (dark). Rejim ildiz _layout'da tanlanadi (setScheme),
// `colors.x` har o'qilganda joriy rejim rangini qaytaradi; ekran uslublari `themed()` orqali yaratiladi.
import { StyleSheet } from 'react-native';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

const light = {
  primary: '#0E5A4B',
  primaryPressed: '#0A4639',
  primarySoft: '#E6F2EE',
  primaryTint: '#CFE5DD',
  /** Tanlangan karta foni (juda och yashil) */
  primaryWash: '#F7FBF9',

  accent: '#E8772E',
  accentSoft: '#FDF0E6',
  accentInk: '#9A4A12',

  ink: '#0B2A24',
  ink2: '#4E625C',
  muted: '#7A8B85',
  onPrimary: '#FFFFFF',
  /** Rangli fon ustidagi ikkinchi darajali matn */
  onPrimaryMuted: '#CFE5DD',

  bg: '#F6F8F7',
  surface: '#FFFFFF',
  field: '#F1F4F2',
  line: '#E1E7E4',
  handle: '#D3DBD7',
  /** Uzuq chiziqli "qo'shish" kataklari */
  dashed: '#9FB1AA',
  track: '#E7EEEA',
  starEmpty: '#B8C6C0',

  map: '#E9EEEB',
  mapBlock: '#DDE5E0',
  mapPark: '#D3E3D6',
  mapRoad: '#FFFFFF',
  /** Xaritadagi belgilar atrofidagi oq hoshiya (ikkala rejimda ham oq) */
  markerRing: '#FFFFFF',
  /** Markaziy pin va uning ustidagi pufakcha */
  pin: '#0B2A24',
  onPin: '#FFFFFF',

  success: '#1B7A4E',
  successSoft: '#E3F3EA',
  successStrong: '#CDEBD9',
  danger: '#B83A26',
  dangerSoft: '#FBE9E5',
  dangerStrong: '#F6CFC7',
  shadow: '#0B2A24',

  /** Panel ostidagi qoraytirish, rasm ustidagi tugmalar */
  backdrop: 'rgba(11,42,36,0.35)',
  scrim: 'rgba(11,42,36,0.7)',
  /** Tepadagi xabar (internet yo'q) */
  toast: '#0B2A24',
  onToast: '#FFFFFF',
  onToastMuted: '#C9D6D1',
  logoAccent: '#FFD7B8',

  /** Liquid Glass: xiralashtirilgan fon ustidagi tus, xira bo'lmaganda (Android) qalinroq tus, yorug' hoshiya */
  glassFill: 'rgba(255,255,255,0.42)',
  glassFillStrong: 'rgba(255,255,255,0.72)',
  glassSolid: 'rgba(255,255,255,0.88)',
  glassBorder: 'rgba(255,255,255,0.85)',
  glassEdge: 'rgba(11,42,36,0.08)',
};

export type Palette = typeof light;

// Tungi rejim: yashil tusli to'q fon, ko'zni charchatmaydigan yumshoq matn
const dark: Palette = {
  primary: '#1E8C70',
  primaryPressed: '#17735C',
  primarySoft: '#16352D',
  primaryTint: '#24493F',
  primaryWash: '#13261F',

  accent: '#F08A45',
  accentSoft: '#3A2617',
  accentInk: '#F4AE7C',

  ink: '#E6EFEB',
  ink2: '#A3B5AE',
  muted: '#74867F',
  onPrimary: '#FFFFFF',
  onPrimaryMuted: '#BFE0D4',

  bg: '#0E1513',
  surface: '#17211E',
  field: '#202C28',
  line: '#2B3934',
  handle: '#3B4A44',
  dashed: '#4F625B',
  track: '#26332F',
  starEmpty: '#4A5A54',

  map: '#1A2320',
  mapBlock: '#232E2A',
  mapPark: '#1F3027',
  mapRoad: '#2F3B37',
  markerRing: '#FFFFFF',
  pin: '#F2F6F4',
  onPin: '#0B2A24',

  success: '#45C08A',
  successSoft: '#163327',
  successStrong: '#1E4A36',
  danger: '#F07560',
  dangerSoft: '#3A1D19',
  dangerStrong: '#5A2A23',
  shadow: '#000000',

  backdrop: 'rgba(0,0,0,0.55)',
  scrim: 'rgba(0,0,0,0.7)',
  toast: '#E6EFEB',
  onToast: '#0B2A24',
  onToastMuted: '#4E625C',
  logoAccent: '#F4AE7C',

  glassFill: 'rgba(23,33,30,0.38)',
  glassFillStrong: 'rgba(23,33,30,0.7)',
  glassSolid: 'rgba(25,36,32,0.9)',
  glassBorder: 'rgba(255,255,255,0.12)',
  glassEdge: 'rgba(0,0,0,0.35)',
};

export type Scheme = 'light' | 'dark';
const palettes: Record<Scheme, Palette> = { light, dark };

// Joriy rejim — kichik store: o'zgarsa, `useScheme()` chaqirgan hamma komponent qayta chiziladi
// (ekranlar yopilmaydi, navigatsiya joyida qoladi — Telegram'dagidek)
const schemeStore = createStore<{ scheme: Scheme }>(() => ({ scheme: 'light' }));
let current: Scheme = 'light';

export const setScheme = (s: Scheme) => {
  if (s === current) return;
  current = s;
  schemeStore.setState({ scheme: s });
};
export const getScheme = () => current;
export const isDark = () => current === 'dark';
/** Komponent ranglari rejim bilan birga yangilanishi uchun (har bir rangli komponent boshida chaqiriladi) */
export const useScheme = () => useStore(schemeStore, (st) => st.scheme);

/** Har o'qilganda joriy rejim rangi (spread `{ ...colors }` ham joriy qiymatlarni beradi) */
export const colors = {} as Readonly<Palette>;
for (const key of Object.keys(light) as (keyof Palette)[]) {
  Object.defineProperty(colors, key, { enumerable: true, get: () => palettes[current][key] });
}

/** Rejim bo'yicha qiymat tanlash (kategoriya ranglari va boshqalar uchun) */
export const pick = <T,>(lightValue: T, darkValue: T) => (current === 'dark' ? darkValue : lightValue);

/**
 * Ekran uslublari: `StyleSheet.create` o'rniga. Ichidagi `colors.x` joriy rejim bilan hisoblanadi,
 * har rejim uchun bir marta yaratilib, keshda saqlanadi.
 */
export function themed<T extends StyleSheet.NamedStyles<T>>(make: () => T): T {
  const cache: Partial<Record<Scheme, T>> = {};
  const get = () => (cache[current] ??= StyleSheet.create(make() as StyleSheet.NamedStyles<T>) as T);
  return new Proxy({} as T, {
    get: (_, k) => get()[k as keyof T],
    has: (_, k) => k in get(),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_, k) => ({ enumerable: true, configurable: true, value: get()[k as keyof T] }),
  });
}

export const fonts = {
  regular: 'Manrope_500Medium',
  medium: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
  logo: 'Unbounded_700Bold',
} as const;

export const radius = {
  button: 16,
  card: 18,
  sheet: 28,
  chip: 22,
  tile: 16,
  field: 16,
} as const;

export const size = {
  touch: 44,
  button: 56,
  gutter: 16,
} as const;

export const shadow = themed(() => ({
  float: {
    shadowColor: colors.shadow,
    shadowOpacity: isDark() ? 0.45 : 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sheet: {
    shadowColor: colors.shadow,
    shadowOpacity: isDark() ? 0.5 : 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
  },
}));

export const type = themed(() => ({
  h1: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 28, color: colors.ink },
  h3: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  bodyBold: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: colors.ink },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.ink2 },
}));
