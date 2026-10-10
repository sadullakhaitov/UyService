// Fon rejimi (migrations/…_background_presence.sql): usta Telegram'ni yig'ib qo'ysa ham ishda qoladi.
// Bot chatiga yuborilgan joylashuv (bitta yoki "jonli") — ustaning joylashuvi bo'ladi (master_locations).
// telegram-bot (qabul qilish) va push.ts ("Hali ishdamisiz?" tugmalari) shu fayldan foydalanadi.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

export type Lang = 'uz' | 'ru' | 'en';

export const LOC_BTN: Record<Lang, string> = { uz: '📍 Joylashuvni yuborish', ru: '📍 Отправить геопозицию', en: '📍 Send my location' };
export const STOP_BTN: Record<Lang, string> = { uz: '⏸ Ishni tugatish', ru: '⏸ Закончить работу', en: '⏸ Stop working' };

/** "Joylashuvni yuborish" (bitta bosish) + "Ishni tugatish" — pastdagi tugmalar */
export const presenceKeyboard = (lang: Lang) => ({
  keyboard: [[{ text: LOC_BTN[lang], request_location: true }], [{ text: STOP_BTN[lang] }]],
  resize_keyboard: true,
  one_time_keyboard: true,
});

/** Telegram jonli joylashuvi ko'pi bilan shuncha amal qiladi ("to'xtatguncha" tanlansa ham) */
export const LIVE_MAX_MS = 12 * 3600_000;
const FOREVER = 0x7fffffff;

export type TgLocation = { latitude: number; longitude: number; live_period?: number };
export type LocationResult =
  | { kind: 'not_master' }
  | { kind: 'saved'; online: boolean; liveUntil: number | null };

/**
 * Bot chatidagi joylashuv → ustaning joylashuvi. `edited` — jonli joylashuvning yangilanishi;
 * jonli joylashuv to'xtatilganda Telegram live_period'siz oxirgi yangilanishni yuboradi — fon muddati tugaydi.
 * `sentAt` — xabar yuborilgan vaqt (ms): jonli muddat shundan hisoblanadi.
 */
export async function saveTelegramLocation(
  db: SupabaseClient,
  telegramId: number,
  loc: TgLocation,
  sentAt: number,
  edited: boolean,
  now = Date.now(),
): Promise<LocationResult> {
  if (!Number.isFinite(loc.latitude) || !Number.isFinite(loc.longitude) || Math.abs(loc.latitude) > 90 || Math.abs(loc.longitude) > 180) {
    return { kind: 'not_master' };
  }
  const { data: prof } = await db.from('profiles').select('id').eq('telegram_id', telegramId).is('deleted_at', null).maybeSingle();
  if (!prof) return { kind: 'not_master' };
  const { data: m } = await db.from('masters').select('id, online').eq('id', prof.id).maybeSingle();
  if (!m) return { kind: 'not_master' };

  const { error } = await db.from('master_locations').upsert({ master_id: m.id, lat: loc.latitude, lng: loc.longitude });
  if (error) throw new Error(`master_locations: ${error.message}`);

  let liveUntil: number | null = null;
  if (loc.live_period) {
    const end = loc.live_period >= FOREVER ? now + LIVE_MAX_MS : sentAt + loc.live_period * 1000;
    liveUntil = Math.min(end, now + LIVE_MAX_MS);
    if (liveUntil <= now) liveUntil = null;
  }
  if (liveUntil || edited) {
    await db.from('masters').update({ live_until: liveUntil ? new Date(liveUntil).toISOString() : new Date(now).toISOString() }).eq('id', m.id);
  }
  return { kind: 'saved', online: Boolean(m.online), liveUntil };
}

/** "Ishni tugatish" — usta botdan turib ishdan chiqadi (faol ishi bo'lsa — yo'q) */
export async function stopWorking(db: SupabaseClient, telegramId: number): Promise<'ok' | 'busy' | 'not_master'> {
  const { data: prof } = await db.from('profiles').select('id').eq('telegram_id', telegramId).is('deleted_at', null).maybeSingle();
  if (!prof) return 'not_master';
  const { data: m } = await db.from('masters').select('id, busy').eq('id', prof.id).maybeSingle();
  if (!m) return 'not_master';
  if (m.busy) return 'busy';
  await db.from('masters').update({ online: false, live_until: null }).eq('id', m.id);
  return 'ok';
}
