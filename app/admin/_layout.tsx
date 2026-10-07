// Admin panel (uyservice.uz/admin): kirish sahifasi va himoyalangan bo'limlar ((panel) guruhi)
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { colors, useScheme } from '@/constants/theme';

export default function AdminRoot() {
  useScheme();
  // Qidiruv tizimlari admin sahifalarini ko'rsatmasin
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'none' }} />;
}
