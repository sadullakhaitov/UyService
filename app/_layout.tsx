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
import { colors, setScheme, useScheme } from '@/constants/theme';
import { setLanguage } from '@/lib/i18n';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { DemoBadge, DemoBar } from '@/components/ui/DemoBanner';
import { pageLayout } from '@/components/ui/PageFrame';
import { useNotificationTaps } from '@/lib/notify';
import { usePushRegistration } from '@/lib/push';
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
    `${auto('input[data-autofill="field"]')}{${fill('var(--uys-field)')}}`;
  document.head.appendChild(style);
}
// Autofill ranglari joriy rejimdan (kunduzgi / tungi)
function applyWebColors() {
  if (!WEB) return;
  const root = document.documentElement.style;
  root.setProperty('--uys-ink', colors.ink);
  root.setProperty('--uys-surface', colors.surface);
  root.setProperty('--uys-field', colors.field);
}

export default function RootLayout() {
  useScheme();
  // Bildirishnoma bosilsa — tegishli buyurtma yoki taklif ochiladi
  useNotificationTaps();
  usePushRegistration(useUser((s) => s.language), useMaster((s) => s.notifications));
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
