import { Tabs } from 'expo-router';
import { MessageCircle, Navigation, Wallet } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { SideRail, TabLabel as Label, useTabBarOptions } from '@/components/ui/TabChrome';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useChats, useMaster } from '@/store';
import { pageLayout } from '@/components/ui/PageFrame';
import { useWide } from '@/lib/useLayout';

// Kompyuterda: Buyurtmalar (xarita) — butun joy bo'ylab, qolgan bo'limlar — o'rtada ustun
const layout = pageLayout(['index'], false);

// Usta ilovasi: 4 bo'lim — Buyurtmalar, Pul, Chatlar, Profil (Yandex Pro tuzilmasi)
export default function MasterTabs() {
  useScheme();
  // Mijoz rejimidagi chatlar (kind 'master') usta ilovasida ko'rinmaydi
  const unread = useChats((s) => s.chats.reduce((n, c) => n + (c.kind === 'master' ? 0 : c.unread), 0));
  const profile = useMaster((s) => s.profile);
  const initials = profile.firstName ? `${profile.firstName[0]}${profile.lastName[0] ?? ''}`.toUpperCase() : '?';
  const wide = useWide();
  // Kompyuterda — chap tomonda vertikal menyu (SideRail), telefonda — pastda shisha menyu
  const options = useTabBarOptions(wide);
  return (
    <Tabs screenLayout={layout} tabBar={wide ? (props) => <SideRail {...props} /> : undefined} screenOptions={options}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.orders'),
          tabBarLabel: ({ color }) => <Label text={t('tabs.orders')} color={color} />,
          tabBarIcon: ({ color }) => <Navigation size={24} color={color} fill={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{ title: t('tabs.money'),
          tabBarLabel: ({ color }) => <Label text={t('tabs.money')} color={color} />, tabBarIcon: ({ color }) => <Wallet size={24} color={color} strokeWidth={2.2} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: t('tabs.chats'),
          tabBarLabel: ({ color }) => <Label text={t('tabs.chats')} color={color} />,
          tabBarBadge: unread || undefined,
          tabBarIcon: ({ color }) => <MessageCircle size={24} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarLabel: ({ color }) => <Label text={t('tabs.profile')} color={color} />,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.avatar, focused && styles.avatarOn]}>
              <Text style={[styles.avatarText, focused && { color: colors.onPrimary }]}>{initials}</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = themed(() => ({
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarOn: { backgroundColor: colors.primary },
  avatarText: { fontFamily: fonts.heavy, fontSize: 10, color: colors.primary },
}));
