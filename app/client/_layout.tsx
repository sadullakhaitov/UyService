import { Stack } from 'expo-router';
import { colors, useScheme } from '@/constants/theme';
import { pageLayout } from '@/components/ui/PageFrame';
import { useOrderSimulator } from '@/lib/orderSimulator';

// Kompyuterda xaritali ekranlar butun oyna bo'ylab, qolganlari — o'rtada ustun
const layout = pageLayout(['index', 'searching', 'tracking']);

export default function ClientLayout() {
  useScheme();
  // Hamma faol buyurtmalar orqa fonda yuradi (soxta dispatch va usta harakati)
  useOrderSimulator();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} screenLayout={layout}>
      <Stack.Screen name="searching" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="tracking" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="rate" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}
