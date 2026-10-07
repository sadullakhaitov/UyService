// Pastki menyu (telefon) va chap menyu (kompyuter) — usta va mijoz ilovasida bir xil ko'rinish.
// Tabs'ga: tabBar={wide ? (p) => <SideRail {...p} /> : undefined}, tabBarLabel — <TabLabel>, uslub — tabBarStyles()
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { GlassBg } from './Glass';
import { LogoMark } from './Logo';
import { Squish } from './Pressable';
import { Text } from './Text';

/** Tabs screenOptions'ning umumiy qismi: pastda shisha menyu, kompyuterda — chapda */
export function useTabBarOptions(wide: boolean) {
  useScheme();
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.ink,
    tabBarInactiveTintColor: colors.muted,
    tabBarPosition: wide ? ('left' as const) : ('bottom' as const),
    tabBarStyle: [styles.bar, { height: 72 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 8) }],
    tabBarBadgeStyle: styles.badge,
    // Pastki menyu — Liquid Glass
    tabBarBackground: () => <GlassBg radius={0} strong />,
  };
}

// Kompyuter: chapdagi vertikal menyu — tepada logotip, ostida bo'limlar (ikonka + nom), faol bo'lim yashil fonda
export function SideRail({ state, descriptors, navigation }: BottomTabBarProps) {
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

export function TabLabel({ text, color }: { text: string; color: ColorValue }) {
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
}));
