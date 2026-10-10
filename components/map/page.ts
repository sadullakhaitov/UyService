// Xarita sahifasi bilan React o'rtasidagi xabarlar (sahifaning o'zi — osm/html.ts).
// Bitta HTML: telefonda WebView ichida (MapBase.tsx), brauzerda iframe ichida (MapBase.web.tsx).
// Animatsiyalar (to'lqinlar, miltillash, usta belgisining silliq siljishi) sahifaning o'zida 60 fps'da chiziladi —
// React tomondan faqat holat (props) yuboriladi, har kadrda xabar almashilmaydi.
import type { LatLng } from '@/lib/geo';
import type { MapInsets, MapPoint } from './types';

export type { MapInsets };

/** Panel balandligi o'zgarganda kamera va markazdagi pin shuncha ms da silliq siljiydi */
export const INSET_MS = 380;

/** React → xarita: to'liq holat (har o'zgarishda qayta yuboriladi) */
export type MapState = {
  center: LatLng;
  zoom: number;
  insets: MapInsets;
  nearby: LatLng[];
  blinkNearby: boolean;
  clientMarker: LatLng | null;
  route: LatLng[];
  master: LatLng | null;
  fitTo: LatLng[];
  points: MapPoint[];
  pulse: { center: LatLng; maxRadiusM: number } | null;
  userLocation: LatLng | null;
  accent: string;
  moveDuration: number;
  /** Tungi rejim va unga mos ranglar — rejim almashganda xarita qayta yuklanmaydi, joyida yangilanadi */
  dark: boolean;
  mapBg: string;
  primary: string;
};

export type MapCommand =
  | { type: 'state'; state: MapState }
  | { type: 'flyTo'; center: LatLng; zoom: number }
  | { type: 'panTo'; center: LatLng }
  | { type: 'zoomBy'; delta: number };

/** Xarita → React */
export type MapEvent =
  | { type: 'boot' }
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'moveStart' }
  | { type: 'moveEnd'; center: LatLng }
  | { type: 'press' }
  | { type: 'point'; id: string };

/** dark — tungi rejim: xarita qatlami filtr bilan qorong'ilashtiriladi, belgilar o'z rangida */
export type MapInit = { center: LatLng; zoom: number; flyFrom?: LatLng; insets: MapInsets; dark?: boolean; minZoom?: number };

/** Telefonda xarita sahifasi shu manzil nomidan ochiladi (WebView baseUrl) */
export const MAP_BASE_URL = 'https://uyservice.uz/';
