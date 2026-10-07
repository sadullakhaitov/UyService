// Himoyalangan admin bo'limlari: kirmagan yoki admin bo'lmagan foydalanuvchi — kirish sahifasiga.
// Uzoq harakatsizlik (8 soat) — sessiya tugaydi. Huquq har ochilishda server orqali qayta tekshiriladi.
import { Redirect, Stack, router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AdminShell } from '@/components/admin/Shell';
import { colors, useScheme } from '@/constants/theme';
import { adminApi, type AdminMe } from '@/lib/admin';
import { sessionExpired, useAdminSession } from '@/lib/admin/session';
import { signOut } from '@/lib/auth';

export default function PanelLayout() {
  useScheme();
  const path = usePathname();
  const [state, setState] = useState<'checking' | 'ok' | 'no'>('checking');
  const [me, setMe] = useState<AdminMe | null>(null);
  const [hydrated, setHydrated] = useState(useAdminSession.persist.hasHydrated());

  useEffect(() => {
    const off = useAdminSession.persist.onFinishHydration(() => setHydrated(true));
    if (useAdminSession.persist.hasHydrated()) setHydrated(true);
    return off;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let alive = true;
    (async () => {
      const s = useAdminSession.getState();
      if (sessionExpired(s)) {
        s.clear();
        await signOut().catch(() => {});
        if (alive) setState('no');
        return;
      }
      const who = await adminApi.me().catch(() => null);
      if (!alive) return;
      setMe(who);
      setState(who ? 'ok' : 'no');
    })();
    return () => {
      alive = false;
    };
  }, [hydrated]);

  // Faollik: har sahifa almashganda; har daqiqada muddat tekshiriladi
  useEffect(() => {
    if (state === 'ok') useAdminSession.getState().touch();
  }, [path, state]);
  useEffect(() => {
    if (state !== 'ok') return;
    const id = setInterval(() => {
      if (sessionExpired(useAdminSession.getState())) logout();
    }, 60_000);
    return () => clearInterval(id);
  }, [state]);

  if (state === 'checking') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (state === 'no' || !me) return <Redirect href={{ pathname: '/admin/login', params: path !== '/admin' ? { next: path } : {} }} />;

  return (
    <AdminShell me={me} onLogout={logout}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'none' }} />
    </AdminShell>
  );
}

async function logout() {
  useAdminSession.getState().clear();
  await signOut().catch(() => {});
  router.replace('/admin/login');
}
