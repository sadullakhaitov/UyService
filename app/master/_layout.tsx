import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

export default function MasterLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="offer" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', gestureEnabled: false }} />
      <Stack.Screen name="job" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
