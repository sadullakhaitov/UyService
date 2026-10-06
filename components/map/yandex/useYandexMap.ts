import { useMemo, useRef } from 'react';
import { colors, isDark } from '@/constants/theme';
import { getLanguage } from '@/lib/i18n';
import { YANDEX_KEY as API_KEY } from '@/lib/yandex';
import { DEFAULT_ZOOM, MOVE_INTERVAL_MS, type MapBaseProps } from '../types';
import { buildMapHtml, type MapEvent, type MapState } from './html';

/** MapBase props → Yandex sahifasi (bir marta) + joriy holat (har o'zgarishda yuboriladi) */
export function useYandexMap(p: MapBaseProps) {
  const zoom = p.zoom ?? DEFAULT_ZOOM;
  const insets = p.insets ?? { top: 0, bottom: 0 };

  // Sahifa bir marta quriladi — boshlang'ich kamera shu yerda
  const html = useMemo(
    () => buildMapHtml({ apiKey: API_KEY, lang: getLanguage(), init: { center: p.center, zoom, flyFrom: p.flyFrom, insets, dark: isDark() }, colors: { ...colors } }),
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
    dark: isDark(),
    mapBg: colors.map,
    primary: colors.primary,
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
