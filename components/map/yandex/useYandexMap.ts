import { useMemo, useRef } from 'react';
import { colors } from '@/constants/theme';
import { getLanguage } from '@/lib/i18n';
import { DEFAULT_ZOOM, MOVE_INTERVAL_MS, type MapBaseProps } from '../types';
import { buildMapHtml, type MapEvent, type MapState } from './html';

// Kalit .env faylida (git'ga yuklanmaydi). Bo'sh bo'lsa ham xarita ko'rinadi, kalit keyin qo'shiladi.
const API_KEY = process.env.EXPO_PUBLIC_YANDEX_MAPS_KEY ?? '';

/** MapBase props → Yandex sahifasi (bir marta) + joriy holat (har o'zgarishda yuboriladi) */
export function useYandexMap(p: MapBaseProps) {
  const zoom = p.zoom ?? DEFAULT_ZOOM;
  const insets = p.insets ?? { top: 0, bottom: 0 };

  // Sahifa bir marta quriladi — boshlang'ich kamera shu yerda
  const html = useMemo(
    () => buildMapHtml({ apiKey: API_KEY, lang: getLanguage(), init: { center: p.center, zoom, flyFrom: p.flyFrom, insets }, colors: { ...colors } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const state: MapState = {
    center: p.center,
    zoom,
    insets,
    nearby: p.nearby ?? [],
    blinkNearby: Boolean(p.blinkNearby),
    clientMarker: p.clientMarker ?? null,
    route: p.route ?? [],
    master: p.master ?? null,
    fitTo: p.fitTo ?? [],
    pulse: p.pulse ?? null,
    userLocation: p.userLocation ?? null,
    accent: p.accent ?? colors.primary,
    moveDuration: p.moveDuration ?? MOVE_INTERVAL_MS,
  };
  const json = JSON.stringify(state);

  // Hodisalar uchun eng so'nggi callback'lar (sahifa qayta qurilmaydi)
  const cb = useRef(p);
  cb.current = p;
  const onEvent = (e: MapEvent) => {
    if (e.type === 'moveStart') cb.current.onMoveStart?.();
    else if (e.type === 'moveEnd') cb.current.onMoveEnd?.(e.center);
  };

  return { html, state, json, onEvent };
}
