// Ro'yxat filtrlari manzil satrida saqlanadi (/admin/orders?f=active&q=...): havolani ulashish,
// sahifani yangilash va "orqaga" bosilganda filtr yo'qolmaydi.
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';

export function useParamState<T extends Record<string, string>>(defaults: T) {
  const raw = useLocalSearchParams<Record<string, string | string[]>>();
  const values = useMemo(() => {
    const out = { ...defaults };
    for (const k of Object.keys(defaults) as (keyof T)[]) {
      const v = raw[k as string];
      if (typeof v === 'string') out[k] = v as T[keyof T];
    }
    return out;
  }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = useCallback(
    (patch: Partial<T>) => {
      // Filtr o'zgarsa — birinchi sahifaga
      const next: Record<string, string | undefined> = { ...('p' in defaults && !('p' in patch) ? { p: undefined } : {}) };
      for (const [k, v] of Object.entries(patch)) next[k] = v === defaults[k] ? undefined : (v as string);
      router.setParams(next);
    },
    [defaults],
  );
  return [values, set] as const;
}

export const toInt = (s: string, d = 0) => {
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : d;
};
