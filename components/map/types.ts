import type { ReactNode } from 'react';
import type { LatLng } from '@/lib/geo';

export type MapInsets = { top: number; bottom: number };

export type MapBaseProps = {
  /** Kamera markazi (odatda mijoz nuqtasi) */
  center: LatLng;
  /** Boshlang'ich zoom. O'zgarsa kamera silliq uchadi (qidiruvda 16 → 14) */
  zoom?: number;
  /** Ochilganda kamera shu nuqtadan `center`ga uchib keladi */
  flyFrom?: LatLng;
  /** Xarita ustidagi panellar — fokus nuqtasi ular orasida turadi */
  insets?: MapInsets;
  /** Atrofdagi ustalar (aniqligi ~100 m) */
  nearby?: LatLng[];
  /** Qidiruv vaqtida usta belgilari navbat bilan miltillaydi */
  blinkNearby?: boolean;
  /** Mijozni xaritada belgi sifatida ko'rsatish (kuzatuv ekrani) */
  clientMarker?: LatLng;
  /** Usta yo'li (chiziq-chiziq, oqib turadi) */
  route?: LatLng[];
  /** Harakatlanuvchi usta belgisi; har yangi koordinata 5 s davomida silliq interpolatsiya qilinadi */
  master?: LatLng;
  /** Kamera shu nuqtalarni birdaniga ko'rsatadi */
  fitTo?: LatLng[];
  /** Xarita surila boshlaganda (pin ko'tariladi) */
  onMoveStart?: () => void;
  /** Surish to'xtaganda yangi markaz (pin tushadi, manzil yangilanadi) */
  onMoveEnd?: (center: LatLng) => void;
  /** Fokus nuqtasi ustidagi ekran qatlamlari (faqat markaziy pin) */
  overlay?: ReactNode;
  /** Xaritaga bog'langan qidiruv to'lqinlari (metrda) */
  pulse?: { center: LatLng; maxRadiusM: number };
  /** Foydalanuvchining haqiqiy joyi — ko'k nuqta */
  userLocation?: LatLng | null;
};

export type MapHandle = {
  /** Kamerani shu nuqtaga silliq uchirish */
  flyTo: (center: LatLng, zoom?: number) => void;
  /** Zoom +1 / −1 */
  zoomBy: (delta: number) => void;
};

export const DEFAULT_ZOOM = 16;
export const MOVE_INTERVAL_MS = 5000;
