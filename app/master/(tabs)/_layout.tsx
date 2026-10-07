import { router, Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { MessageCircle, Navigation, Wallet } from 'lucide-react-native';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark, Squish, Text } from '@/components/ui';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { GlassBg } from '@/components/ui/Glass';
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
  const insets = useSafeAreaInsets();
  const wide = useWide();
  return (
    <Tabs
      screenLayout={layout}
      tabBar={wide ? (props) => <SideRail {...props} /> : undefined}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        // Kompyuterda — chap tomonda vertikal menyu (SideRail), telefonda — pastda
        tabBarPosition: wide ? 'left' : 'bottom',
        tabBarStyle: [styles.bar, { height: 72 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }],
        tabBarBadgeStyle: styles.badge,
        // Pastki menyu — Liquid Glass
        tabBarBackground: () => <GlassBg radius={0} strong />,
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

// Kompyuter: chapdagi vertikal menyu — tepada logotip, ostida bo'limlar (ikonka + nom), faol bo'lim yashil fonda
function SideRail({ state, descriptors, navigation }: BottomTabBarProps) {
  useScheme();
  return (
    <View style={styles.rail}>
      <Squish accessibilityRole="link" accessibilityLabel={t('about.title')} scaleTo={0.94} onPress={() => router.push('/about')} style={styles.railLogo}>
        <LogoMark size={40} />
      </Squish>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const focused = state.index === i;
        const color = focused ? colors.primary : colors.ink2;
        const badge = options.tabBarBadge;
        return (
          <Squish
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            scaleTo={0.95}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigation.navigate(route.name, route.params);
            }}
            style={[styles.railItem, focused && styles.railItemOn]}
          >
            <View style={styles.railIcon}>
              {options.tabBarIcon?.({ focused, color, size: 24 })}
              {badge ? (
                <View style={styles.railBadge}>
                  <Text style={styles.railBadgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.railLabel, { color }]} numberOfLines={1}>
              {options.title}
            </Text>
          </Squish>
        );
      })}
    </View>
  );
}

function Label({ text, color }: { text: string; color: ColorValue }) {
  useScheme();
  return (
    <Text style={[styles.label, { color }]} numberOfLines={1}>
      {text}
    </Text>
  );
}

const styles = themed(() => ({
  bar: { backgroundColor: 'transparent', borderTopColor: colors.glassEdge, elevation: 0 },
  rail: { width: 104, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.line, paddingTop: 20, paddingHorizontal: 12, gap: 6, alignItems: 'stretch' },
  railLogo: { alignSelf: 'center', marginBottom: 18 },
  railItem: { height: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
  railItemOn: { backgroundColor: colors.primarySoft },
  railIcon: { position: 'relative' },
  railLabel: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  railBadge: { position: 'absolute', top: -6, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  railBadgeText: { fontFamily: fonts.heavy, fontSize: 10, lineHeight: 13, color: colors.onPrimary },
  label: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15 },
  badge: { backgroundColor: colors.accent, fontFamily: fonts.heavy, fontSize: 11 },
  avatar: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  avatarOn: { backgroundColor: colors.primary },
  avatarText: { fontFamily: fonts.heavy, fontSize: 10, color: colors.primary },
}));
