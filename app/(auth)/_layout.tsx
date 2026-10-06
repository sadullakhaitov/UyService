import { Stack } from 'expo-router';
import { colors, useScheme } from '@/constants/theme';

export default function AuthLayout() {
  useScheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
