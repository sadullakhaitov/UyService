import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function ClientLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="searching" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="tracking" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="rate" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
    </Stack>
  );
}
