import { Platform, useWindowDimensions } from 'react-native';

// Keng ekran (kompyuter brauzeri): panel chapda suzuvchi oyna, oddiy sahifalar o'rtada ustun bo'lib turadi.
// Telefon (va telefon brauzeri) — odatdagi mobil ko'rinish.
export const WIDE_MIN = 900;
/** Chapdagi panel kengligi va chetdan masofasi */
export const SIDE_W = 420;
export const SIDE_GAP = 16;
/** Xarita fokus nuqtasi panel o'ng tomonidagi bo'sh joy markazida turishi uchun */
export const SIDE_INSET = SIDE_W + SIDE_GAP * 2;
/** Oddiy sahifalar ustunining eng katta kengligi */
export const PAGE_MAX = 600;

export function useWide() {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= WIDE_MIN;
}
