// Telegram Mini App: uyservice.uz bot tugmasi orqali Telegram ichida ochilganda.
// - Telegram oynasini to'liq ochadi, ranglarni ilovaga moslaydi
// - kirish SMS'siz: Telegram raqamni tasdiqlaydi (requestContact), server (supabase/functions/telegram-auth)
//   foydalanuvchini topadi/yaratadi va sessiya beradi; keyingi ochilishlarda o'zi kiradi
// - sinov rejimida (server yo'q) — raqam Telegram'dan olinadi, kirish soxta (SMS kodi kabi)
// Oddiy brauzer va telefon ilovasida bu fayl hech narsa qilmaydi.
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import { COMPANY } from '@/constants/company';
import { colors, useScheme } from '@/constants/theme';
import { getSupabase, isSupabaseConfigured } from './supabase';

type Contact = { phone_number?: string; first_name?: string; last_name?: string; user_id?: number };
type ContactResult = { status?: string; response?: string; responseUnsafe?: { contact?: Contact | string } };
type TgWebApp = {
  initData: string;
  initDataUnsafe?: { user?: { id: number; first_name?: string; last_name?: string; language_code?: string; allows_write_to_pm?: boolean } };
  ready: () => void;
  expand: () => void;
  disableVerticalSwipes?: () => void;
  setHeaderColor?: (c: string) => void;
  setBackgroundColor?: (c: string) => void;
  setBottomBarColor?: (c: string) => void;
  requestContact?: (cb: (shared: boolean, res?: ContactResult) => void) => void;
  requestWriteAccess?: (cb?: (allowed: boolean) => void) => void;
  isVersionAtLeast?: (v: string) => boolean;
  openTelegramLink?: (url: string) => void;
};

/** Telegram ichida ochilgan bo'lsa — WebApp obyekti, aks holda null */
export function telegram(): TgWebApp | null {
  if (Platform.OS !== 'web') return null;
  const w = (globalThis as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
  return w && w.initData ? w : null;
}
export const inTelegram = () => telegram() !== null;

/** @uyservice_bot ni ochish (kirish kodini Telegram'da olish uchun raqam ulashiladi) */
export function openBot() {
  const url = `https://t.me/${COMPANY.telegram}?start=code`;
  const tg = telegram();
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else Linking.openURL(url).catch(() => {});
}

/** "+998 90 123 45 67" (ilovadagi ko'rinish) yoki null — faqat O'zbekiston raqami */
export function displayPhone(phone: string | null | undefined): string | null {
  const d = String(phone ?? '').replace(/\D/g, '');
  if (!/^998\d{9}$/.test(d)) return null;
  return `+998 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10, 12)}`;
}

/** Telegram raqamni ulashishni so'raydi (bir bosish). raw — Telegram imzolagan javob (server tekshiradi) */
export function requestTelegramContact(): Promise<{ phone: string | null; raw?: string } | null> {
  const tg = telegram();
  if (!tg?.requestContact) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      tg.requestContact!((shared, res) => {
        if (!shared) return resolve(null);
        let c = res?.responseUnsafe?.contact;
        if (typeof c === 'string') {
          try {
            c = JSON.parse(c) as Contact;
          } catch {
            c = undefined;
          }
        }
        resolve({ phone: (c as Contact | undefined)?.phone_number ?? null, raw: res?.response });
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * "Yangi buyurtma", "Usta topildi" va boshqa xabarlar bot orqali keladi (sayt yopiq bo'lsa ham — server:
 * supabase/functions/_shared/push.ts). Bot odamga faqat ruxsat bo'lsa yoza oladi: ruxsat yo'q bo'lsa — bir marta so'raymiz
 */
function allowBotMessages(tg: TgWebApp) {
  if (tg.initDataUnsafe?.user?.allows_write_to_pm !== false || !tg.requestWriteAccess) return;
  try {
    tg.requestWriteAccess();
  } catch {
    // eski Telegram versiyasi
  }
}

export type TelegramSignIn = { ok: true; phone: string; name?: string } | { ok: false; need?: 'contact'; error?: string };

/**
 * Telegram orqali kirish. contact — requestTelegramContact natijasi (birinchi marta).
 * Server rejimida: telegram-auth → bir martalik token → Supabase sessiyasi. Raqam bot orqali kelgan bo'lsa
 * (webhook biroz kechikishi mumkin) — bir necha soniya qayta so'raydi.
 */
export async function telegramSignIn(contact?: { phone: string | null; raw?: string } | null, waitMs = 0): Promise<TelegramSignIn> {
  const tg = telegram();
  if (!tg) return { ok: false, error: 'not_telegram' };
  const tgName = [tg.initDataUnsafe?.user?.first_name, tg.initDataUnsafe?.user?.last_name].filter(Boolean).join(' ');
  if (!isSupabaseConfigured) {
    // Sinov rejimi: server yo'q — raqam Telegram'dan, kirish soxta
    const phone = displayPhone(contact?.phone);
    if (!contact) return { ok: false, need: 'contact' };
    return phone ? { ok: true, phone, name: tgName } : { ok: false, error: 'phone_not_uz' };
  }
  const db = getSupabase()!;
  const until = Date.now() + waitMs;
  for (;;) {
    const { data, error } = await db.functions.invoke('telegram-auth', { body: { init_data: tg.initData, contact: contact?.raw } });
    if (error) return { ok: false, error: error.message };
    if (data?.ok && data.token_hash) {
      const v = await db.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
      if (v.error) return { ok: false, error: v.error.message };
      const phone = displayPhone(data.phone);
      if (phone) allowBotMessages(tg);
      return phone ? { ok: true, phone, name: data.name || tgName } : { ok: false, error: 'phone_not_uz' };
    }
    if (data?.need !== 'contact' || Date.now() > until) return { ok: false, need: data?.need, error: data?.error };
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/** Ildiz _layout'da: Telegram oynasini sozlaydi */
export function useTelegramApp() {
  const scheme = useScheme();
  useEffect(() => {
    const tg = telegram();
    if (!tg) return;
    try {
      tg.ready();
      tg.expand();
      // Pastga surilganda Telegram oynasi yopilib ketmasin (xarita va panellar surib ishlatiladi)
      tg.disableVerticalSwipes?.();
    } catch {
      // eski Telegram versiyasi
    }
    // Server rejimida avtomatik kirish — lib/afterSignIn.ts → useSessionSync (sessiya tekshirilgach)
  }, []);
  // Telegram sarlavhasi va foni — ilova rangida (kunduzgi / tungi)
  useEffect(() => {
    const tg = telegram();
    if (!tg) return;
    try {
      tg.setHeaderColor?.(colors.bg);
      tg.setBackgroundColor?.(colors.bg);
      tg.setBottomBarColor?.(colors.bg);
    } catch {
      // eski Telegram versiyasi
    }
  }, [scheme]);
}
