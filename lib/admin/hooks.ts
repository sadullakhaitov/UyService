// Admin panel: ma'lumot olish va amallar uchun hook'lar.
// - useAdminQuery: yuklash, xato, qayta yuklash; sahifa almashganda eski ma'lumot ko'rinib turadi (sakramaydi)
// - invalidateAdmin(): amaldan keyin hamma ochiq ro'yxatlar yangilanadi
// - useAdminAction: amal + natija xabari (toast) + xato matni
import { useCallback, useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { t } from '@/lib/i18n';
import { AdminError } from './types';

const useVersion = create<{ v: number }>(() => ({ v: 0 }));
export const invalidateAdmin = () => useVersion.setState((s) => ({ v: s.v + 1 }));

/** Xatoni foydalanuvchiga tushunarli matnga aylantirish */
export function adminErrorText(e: unknown): string {
  if (e instanceof AdminError) {
    const k = `admin.${e.key}`;
    const tr = t(k);
    if (tr !== k) return e.key === 'errors.server' && e.message && e.message !== e.key ? `${tr} (${e.message})` : tr;
    return e.message;
  }
  if (e instanceof Error && /fetch|network/i.test(e.message)) return t('admin.errors.network');
  return e instanceof Error ? e.message : String(e);
}

export type Query<T> = {
  data: T | undefined;
  error: string | null;
  /** Birinchi yuklanish (ma'lumot hali yo'q) */
  loading: boolean;
  /** Qayta yuklanmoqda (ma'lumot ko'rinib turibdi) */
  refreshing: boolean;
  reload: () => void;
  /** Oxirgi muvaffaqiyatli yuklanish vaqti */
  updatedAt: number | null;
};

/**
 * `key` o'zgarsa — qayta yuklanadi. `refreshMs` — avtomatik yangilash (bosh sahifa, xarita).
 * Eskirgan javoblar (foydalanuvchi tez filtr almashtirsa) e'tiborga olinmaydi.
 */
export function useAdminQuery<T>(key: string, fn: () => Promise<T>, { refreshMs, enabled = true }: { refreshMs?: number; enabled?: boolean } = {}): Query<T> {
  const version = useVersion((s) => s.v);
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const req = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!enabled) return;
    const id = ++req.current;
    setBusy(true);
    fnRef
      .current()
      .then((d) => {
        if (id !== req.current) return;
        setData(d);
        setError(null);
        setUpdatedAt(Date.now());
      })
      .catch((e) => {
        if (id !== req.current) return;
        setError(adminErrorText(e));
      })
      .finally(() => {
        if (id === req.current) setBusy(false);
      });
  }, [key, version, tick, enabled]);

  useEffect(() => {
    if (!refreshMs || !enabled) return;
    const h = setInterval(() => setTick((x) => x + 1), refreshMs);
    return () => clearInterval(h);
  }, [refreshMs, enabled]);

  const reload = useCallback(() => setTick((x) => x + 1), []);
  return { data, error, loading: busy && data === undefined, refreshing: busy && data !== undefined, reload, updatedAt };
}

// ---------- Xabarlar (toast) ----------
export type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };
export const useToasts = create<{ list: Toast[] }>(() => ({ list: [] }));
let toastSeq = 0;
export function toast(text: string, kind: Toast['kind'] = 'success') {
  const id = ++toastSeq;
  useToasts.setState((s) => ({ list: [...s.list.slice(-3), { id, kind, text }] }));
  setTimeout(() => useToasts.setState((s) => ({ list: s.list.filter((x) => x.id !== id) })), kind === 'error' ? 6000 : 3500);
}

/** Amal: bajariladi → muvaffaqiyat xabari → hamma ro'yxatlar yangilanadi. Xato bo'lsa — matni qaytadi (oynada ko'rsatish uchun) */
export function useAdminAction() {
  const [running, setRunning] = useState(false);
  const run = useCallback(async <R,>(fn: () => Promise<R>, success?: string): Promise<{ ok: true; value: R } | { ok: false; error: string }> => {
    setRunning(true);
    try {
      const value = await fn();
      if (success) toast(success, 'success');
      invalidateAdmin();
      return { ok: true, value };
    } catch (e) {
      const error = adminErrorText(e);
      return { ok: false, error };
    } finally {
      setRunning(false);
    }
  }, []);
  return { run, running };
}
