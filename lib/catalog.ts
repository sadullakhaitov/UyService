// Katalog (yo'nalishlar va muammolar) serverdan: admin qo'shgan/o'chirgani ilovada ham shunday ko'rinadi.
// Oxirgi nusxa telefonda saqlanadi — keyingi ochilishda internetni kutmasdan darhol qo'llanadi.
// Sinov rejimida (Supabase kaliti yo'q) — shu brauzerdagi sinov admin panelida qo'shilgani (lib/admin/demo.ts saqlaydi).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { applyCatalog, type CatalogCategoryRow, type CatalogNames, type CatalogProblemRow } from '@/constants/categories';
import { getSupabase } from './supabase';

const KEY = 'uyservice-catalog';
type Saved = { categories: CatalogCategoryRow[]; problems: CatalogProblemRow[] };
type Row = Record<string, unknown>;

const names = (r: Row): CatalogNames | null =>
  r.name_uz ? { uz: String(r.name_uz), ru: String(r.name_ru ?? r.name_uz), en: String(r.name_en ?? r.name_uz) } : null;

export const categoryRow = (r: Row): CatalogCategoryRow => ({
  id: String(r.id),
  active: r.active !== false,
  deleted: r.deleted_at != null,
  sort: Number(r.sort ?? 0),
  callFee: Number(r.call_fee ?? 0),
  names: names(r),
  icon: (r.icon as string | null) ?? null,
  tone: (r.tone as string | null) ?? null,
});

export const problemRow = (r: Row): CatalogProblemRow => ({
  id: String(r.id),
  categoryId: String(r.category_id),
  priceMin: r.price_min == null ? null : Number(r.price_min),
  priceMax: r.price_max == null ? null : Number(r.price_max),
  sort: Number(r.sort ?? 0),
  deleted: r.deleted_at != null,
  names: names(r),
});

export const CATEGORY_COLS = 'id, call_fee, active, sort, name_uz, name_ru, name_en, icon, tone, deleted_at';
export const PROBLEM_COLS = 'id, category_id, price_min, price_max, sort, name_uz, name_ru, name_en, deleted_at';

/** Qo'llaydi va telefonda saqlaydi (sinov admin paneli ham shu orqali) */
export function saveCatalog(saved: Saved) {
  applyCatalog(saved.categories, saved.problems);
  AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => {});
}

/** Serverdan o'qiydi va qo'llaydi; muvaffaqiyatli bo'lsa telefonda saqlaydi */
export async function refreshCatalog(): Promise<Saved | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const [c, p] = await Promise.all([
    sb.from('categories').select(CATEGORY_COLS).order('sort'),
    sb.from('problems').select(PROBLEM_COLS).order('sort'),
  ]);
  if (c.error || p.error || !c.data?.length) return null;
  const saved: Saved = { categories: (c.data as Row[]).map(categoryRow), problems: ((p.data ?? []) as Row[]).map(problemRow) };
  saveCatalog(saved);
  return saved;
}

let started = false;
/** Ilova ochilganda bir marta: avval saqlangani, keyin serverdan; ilova qayta ochilganda (fondan) yana yangilanadi */
export function startCatalog() {
  if (started) return;
  started = true;
  const live = !!getSupabase();
  AsyncStorage.getItem(KEY)
    .then((raw) => {
      if (!raw) return;
      const s = JSON.parse(raw) as Saved;
      if (Array.isArray(s.categories) && Array.isArray(s.problems)) applyCatalog(s.categories, s.problems);
    })
    .catch(() => {})
    .finally(() => live && void refreshCatalog().catch(() => {}));
  if (!live) return;
  let last = Date.now();
  AppState.addEventListener('change', (st) => {
    if (st !== 'active' || Date.now() - last < 5 * 60_000) return;
    last = Date.now();
    void refreshCatalog().catch(() => {});
  });
}
