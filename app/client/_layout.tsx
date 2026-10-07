import { Stack } from 'expo-router';
import { colors, useScheme } from '@/constants/theme';
import { pageLayout } from '@/components/ui/PageFrame';
import { LIVE, useLiveOrders } from '@/lib/live';
import { useOrderSimulator } from '@/lib/orderSimulator';

// Kompyuterda xaritali ekranlar butun oyna bo'ylab, qolganlari — o'rtada ustun
const layout = pageLayout(['index', 'searching', 'tracking']);

export default function ClientLayout() {
  useScheme();
  // Hamma faol buyurtmalar orqa fonda yangilanadi: server bo'lsa — serverdan, aks holda soxta simulyator
  // (LIVE o'zgarmas — hook'lar tartibi har doim bir xil)
  if (LIVE) useLiveOrders();
  else useOrderSimulator();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} screenLayout={layout}>
      <Stack.Screen name="searching" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="tracking" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="rate" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}
