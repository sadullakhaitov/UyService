import { Stack } from 'expo-router';
import { colors, useScheme } from '@/constants/theme';
import { pageLayout } from '@/components/ui/PageFrame';
import { useMasterFeed } from '@/lib/masterFeed';

// Kompyuterda: menyu bo'limlari va ish jarayoni (xarita) butun oyna bo'ylab, qolganlari — o'rtada ustun
const layout = pageLayout(['(tabs)', 'job']);

export default function MasterLayout() {
  useScheme();
  // Takliflar oqimi va joylashuvni har 5 s yuborish — usta ilovasining qaysi bo'limida bo'lmasin ishlaydi
  useMasterFeed();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} screenLayout={layout}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="offer" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="job" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
