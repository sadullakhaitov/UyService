// Saytni telefonga ilova bo'lib o'rnatish (PWA, Profil → «Ilovani o'rnatish").
// Android/kompyuter Chrome: brauzerning o'z oynasi (beforeinstallprompt — public/index.html'da ushlab qo'yiladi).
// iPhone: brauzer buni dasturdan ochishga ruxsat bermaydi — qadamlar ko'rsatiladi (Ulashish → Bosh ekranga qo'shish)
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { inTelegram } from './telegram';

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type InstallWindow = Window & { __uysInstall?: InstallPrompt | null };

/** prompt — brauzer oynasi bor; ios — iPhone qadamlari; telegram — avval brauzerda ochish; manual — brauzer menyusidan */
export type InstallKind = 'prompt' | 'ios' | 'telegram' | 'manual';

function detect(): InstallKind | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as InstallWindow;
  // Allaqachon o'rnatilgan ilova ichida ochilgan — tugma kerak emas
  if (w.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone) return null;
  if (inTelegram()) return 'telegram';
  if (w.__uysInstall) return 'prompt';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  return 'manual';
}

/** Hozirgi brauzerda o'rnatish usuli (null — o'rnatilgan yoki telefon ilovasi) */
export function useInstall(): InstallKind | null {
  const [kind, setKind] = useState(detect);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => setKind(detect());
    window.addEventListener('uys-install', update);
    return () => window.removeEventListener('uys-install', update);
  }, []);
  return kind;
}

/** Brauzerning o'rnatish oynasini ochadi; true — foydalanuvchi o'rnatdi */
export async function promptInstall(): Promise<boolean> {
  const w = window as InstallWindow;
  const p = w.__uysInstall;
  if (!p) return false;
  await p.prompt();
  const { outcome } = await p.userChoice;
  // Oyna bir marta ishlatiladi — keyingisini brauzer yana yuboradi
  w.__uysInstall = null;
  window.dispatchEvent(new Event('uys-install'));
  return outcome === 'accepted';
}
