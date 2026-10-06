import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';
import { useOrderSimulator } from '@/lib/orderSimulator';

export default function ClientLayout() {
  // Hamma faol buyurtmalar orqa fonda yuradi (soxta dispatch va usta harakati)
  useOrderSimulator();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="searching" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="tracking" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="rate" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}
