import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { Manrope_800ExtraBold } from '@expo-google-fonts/manrope/800ExtraBold';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, setScheme } from '@/constants/theme';
import { setLanguage } from '@/lib/i18n';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useMaster, useUser } from '@/store';

// Kutilmagan xato bo'lsa — oq ekran o'rniga tushunarli xabar va "Qayta urinish"
export { ErrorBoundary } from '@/components/ui/ErrorScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Veb ko'rinishda brauzerning input atrofidagi chizig'ini o'chiramiz (fokus rangini o'zimiz beramiz)
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input,textarea{outline:none}';
  document.head.appendChild(style);
}

export default function RootLayout() {
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
  setScheme(scheme);

  const ready = (loaded || !!error) && hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {/* Til yoki rejim almashtirilganda hamma ekran yangi tilda/ranglarda qayta chiziladi */}
        <Stack key={`${lang}-${scheme}`} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />
        <OfflineBanner />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
