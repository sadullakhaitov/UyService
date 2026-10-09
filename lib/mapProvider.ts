// Qaysi xarita: .env → EXPO_PUBLIC_MAP_PROVIDER ('yandex' — standart, '2gis' — 2GIS MapGL, kaliti EXPO_PUBLIC_2GIS_KEY).
// Ikkala sahifa bir xil xabarlar bilan ishlaydi (components/map/yandex/html.ts, components/map/twogis/html.ts),
// shuning uchun xaritani almashtirish uchun faqat shu ikki o'zgaruvchi kerak. 2GIS kaliti bo'lmasa — Yandex.
import { YANDEX_KEY } from './yandex';

export const TWOGIS_KEY = process.env.EXPO_PUBLIC_2GIS_KEY ?? '';
export const MAP_PROVIDER: 'yandex' | '2gis' = process.env.EXPO_PUBLIC_MAP_PROVIDER === '2gis' && TWOGIS_KEY ? '2gis' : 'yandex';
export const MAP_KEY = MAP_PROVIDER === '2gis' ? TWOGIS_KEY : YANDEX_KEY;
