import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';
import { useMasterFeed } from '@/lib/masterFeed';

export default function MasterLayout() {
  // Takliflar oqimi va joylashuvni har 5 s yuborish — usta ilovasining qaysi bo'limida bo'lmasin ishlaydi
  useMasterFeed();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="offer" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="job" options={{ gestureEnabled: false }} />
      <Stack.Screen name="register" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
