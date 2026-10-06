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
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { setLanguage } from '@/lib/i18n';
import { useUser } from '@/store';

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
  const [hydrated, setHydrated] = useState(useUser.persist.hasHydrated());
  useEffect(() => useUser.persist.onFinishHydration(() => setHydrated(true)), []);
  const lang = useUser((s) => s.language) ?? 'uz';
  setLanguage(lang);

  const ready = (loaded || !!error) && hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {/* Til almashtirilganda hamma ekran yangi tilda qayta chiziladi */}
        <Stack key={lang} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
