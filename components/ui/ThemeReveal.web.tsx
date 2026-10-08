// Brauzerda rejim animatsiyasiz almashadi (ThemeReveal.tsx — telefon uchun). Alohida fayl: ekran suratini oladigan
// kutubxona (react-native-view-shot → html2canvas, ~100 KB) sayt yuklamasiga kirmasin.
import type { ReactNode } from 'react';

type Point = { x: number; y: number };

export const useThemeReveal = () => (_origin: Point | null, apply: () => void) => apply();

export function ThemeRevealProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
