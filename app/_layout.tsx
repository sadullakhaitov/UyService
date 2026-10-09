import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, isDark, setScheme, useScheme } from '@/constants/theme';
import { setLanguage } from '@/lib/i18n';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { DemoBadge, DemoBar } from '@/components/ui/DemoBanner';
import { pageLayout } from '@/components/ui/PageFrame';
import { useNotificationTaps } from '@/lib/notify';
import { usePushRegistration } from '@/lib/push';
import { useTelegramApp } from '@/lib/telegram';
import { useSessionSync } from '@/lib/afterSignIn';
import { installErrorLogging } from '@/lib/track';
import { ThemeRevealProvider } from '@/components/ui/ThemeReveal';
import { useMaster, useUser } from '@/store';

// Kutilmagan xato bo'lsa — oq ekran o'rniga tushunarli xabar va "Qayta urinish"
export { ErrorBoundary } from '@/components/ui/ErrorScreen';

// Butun oyna bo'ylab: yo'naltirish va ichki bo'limlar (ular o'z ekranlarini o'zi joylaydi)
const rootLayout = pageLayout(['index', 'client', 'master', 'admin']);

SplashScreen.preventAutoHideAsync().catch(() => {});

// Veb ko'rinishda brauzerning input atrofidagi chizig'ini o'chiramiz (fokus rangini o'zimiz beramiz).
// Brauzer raqam/ismni o'zi to'ldirganda (autofill) maydonni sariq yoki ko'k bo'yaydi — uni maydonning
// o'z foni bilan yopamiz (ichki soya) va matn rangini joriy rejimdagidek qoldiramiz.
// Fon: `dataSet={{ autofill: 'field' }}` berilgan maydon — colors.field, qolganlari — colors.surface
const WEB = Platform.OS === 'web' && typeof document !== 'undefined';
if (WEB) {
  const style = document.createElement('style');
  const fill = (bg: string) =>
    `-webkit-text-fill-color:var(--uys-ink)!important;caret-color:var(--uys-ink);` +
    `-webkit-box-shadow:0 0 0 1000px ${bg} inset!important;box-shadow:0 0 0 1000px ${bg} inset!important;` +
    `transition:background-color 100000s ease-out 0s;`;
  const auto = (sel: string) => ['', ':hover', ':focus', ':active'].map((s) => `${sel}:-webkit-autofill${s}`).join(',');
  style.textContent =
    'input,textarea{outline:none}' +
    `${auto('input')},${auto('textarea')}{${fill('var(--uys-surface)')}}` +
    `${auto('input[data-autofill="field"]')}{${fill('var(--uys-field)')}}` +
    // Aylantirish chizig'i (scroll): brauzernikining o'rniga ingichka, yumaloq, fonsiz — joriy rejim rangida.
    // Bosilganda/ustiga kelganda biroz to'qroq; strelka tugmalari yo'q. Firefox — scrollbar-width/color
    // (faqat ::-webkit-scrollbar bo'lmagan brauzerda: Chrome 121+ da ular webkit uslubini bekor qilib, strelkalarni qaytaradi)
    '@supports not selector(::-webkit-scrollbar){*{scrollbar-width:thin;scrollbar-color:var(--uys-thumb) transparent}}' +
    '::-webkit-scrollbar{width:10px;height:10px;background:transparent}' +
    '::-webkit-scrollbar-track,::-webkit-scrollbar-corner{background:transparent}' +
    '::-webkit-scrollbar-thumb{background:var(--uys-thumb);border-radius:10px;border:3px solid transparent;background-clip:padding-box;min-height:40px}' +
    '::-webkit-scrollbar-thumb:hover{background:var(--uys-thumb-hover);background-clip:padding-box;border-width:2px}' +
    '::-webkit-scrollbar-thumb:active{background:var(--uys-thumb-hover);background-clip:padding-box;border-width:2px}' +
    '::-webkit-scrollbar-button{display:none;width:0;height:0}' +
    // Matn belgilanganda — brend yashilining och tusi (brauzerning ko'k rangi o'rniga)
    '::selection{background:var(--uys-selection);color:inherit}';
  document.head.appendChild(style);
}
// Autofill, aylantirish chizig'i va belgilash ranglari joriy rejimdan (kunduzgi / tungi)
function applyWebColors() {
  if (!WEB) return;
  const root = document.documentElement.style;
  root.setProperty('--uys-ink', colors.ink);
  root.setProperty('--uys-surface', colors.surface);
  root.setProperty('--uys-field', colors.field);
  root.setProperty('--uys-thumb', colors.handle);
  root.setProperty('--uys-thumb-hover', colors.muted);
  root.setProperty('--uys-selection', `${colors.primary}40`);
  // Brauzerning o'z elementlari (aylantirish chizig'i, sana va h.k.) ham shu rejimda
  root.setProperty('color-scheme', isDark() ? 'dark' : 'light');
}

export default function RootLayout() {
  useScheme();
  // Bildirishnoma bosilsa — tegishli buyurtma yoki taklif ochiladi
  useNotificationTaps();
  usePushRegistration(useUser((s) => s.language), useMaster((s) => s.notifications));
  // Telegram ichida ochilgan bo'lsa: oyna sozlamalari va avtomatik kirish
  useTelegramApp();
  // Statistika: ilova ochildi + ushlanmagan xatolar jurnalga (server rejimida)
  useEffect(() => installErrorLogging(), []);
  const [loaded, error] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Unbounded_700Bold,
  });

  // Saqlangan sozlamalar (til, raqam, rol) telefondan o'qilguncha kutamiz
  const [userReady, setUserReady] = useState(useUser.persist.hasHydrated());
  const [masterReady, setMasterReady] = useState(useMaster.persist.hasHydrated());
  useEffect(() => {
    const a = useUser.persist.onFinishHydration(() => setUserReady(true));
    const b = useMaster.persist.onFinishHydration(() => setMasterReady(true));
    // Kuzatuv ulanguncha o'qib bo'lingan bo'lishi mumkin
    if (useUser.persist.hasHydrated()) setUserReady(true);
    if (useMaster.persist.hasHydrated()) setMasterReady(true);
    return () => {
      a();
      b();
    };
  }, []);
  const hydrated = userReady && masterReady;
  // Server rejimida: telefondagi raqam sessiyaga mos bo'lsin (Telegram ichida — avtomatik kirish)
  useSessionSync(hydrated);
  const lang = useUser((s) => s.language) ?? 'uz';
  setLanguage(lang);
  // Kunduzgi / tungi rejim: "Avtomatik" — telefon sozlamasiga qarab o'zi almashadi
  const system = useColorScheme();
  const mode = useUser((s) => s.themeMode) ?? 'system';
  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  // Birinchi chizishdan oldin — darhol; keyin — effekt orqali (ekranlar joyida qoladi, faqat ranglar almashadi)
  const mounted = useRef(false);
  if (!mounted.current) {
    setScheme(scheme);
    applyWebColors();
  }
  useLayoutEffect(() => {
    mounted.current = true;
    setScheme(scheme);
    applyWebColors();
  }, [scheme]);

  const ready = (loaded || !!error) && hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {/* Til almashtirilganda hamma ekran yangi tilda qayta chiziladi. Rejim almashganda esa ekranlar joyida qoladi */}
        {/* Sinov rejimi (server ulanmagan): brauzerda — tepada chiziq, telefonda — kichik yorliq */}
        <DemoBar />
        <ThemeRevealProvider>
          <Stack
            key={lang}
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}
            // Kompyuterda: oddiy sahifalar o'rtada ustun, ichki bo'limlar (client, master) o'zi hal qiladi
            screenLayout={rootLayout}
          />
          <OfflineBanner />
          <DemoBadge />
        </ThemeRevealProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
