import { Tabs } from 'expo-router';
import { MessageCircle, Navigation, Wallet } from 'lucide-react-native';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { mockMasterSelf } from '@/mocks';
import { useChats, useMaster } from '@/store';

// Usta ilovasi: 4 bo'lim — Buyurtmalar, Pul, Chatlar, Profil (Yandex Pro tuzilmasi)
export default function MasterTabs() {
  // Mijoz rejimidagi chatlar (kind 'master') usta ilovasida ko'rinmaydi
  const unread = useChats((s) => s.chats.reduce((n, c) => n + (c.kind === 'master' ? 0 : c.unread), 0));
  const profile = useMaster((s) => s.profile);
  const initials = profile.firstName ? `${profile.firstName[0]}${profile.lastName[0] ?? ''}`.toUpperCase() : mockMasterSelf.initials;
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: [styles.bar, { height: 72 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarBadgeStyle: styles.badge,
      }}
    >
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

function Label({ text, color }: { text: string; color: ColorValue }) {
  return (
    <Text style={[styles.label, { color }]} numberOfLines={1}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.surface, borderTopColor: colors.line },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15 },
  badge: { backgroundColor: colors.accent, fontFamily: fonts.heavy, fontSize: 11 },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarOn: { backgroundColor: colors.primary },
  avatarText: { fontFamily: fonts.heavy, fontSize: 10, color: colors.primary },
});
