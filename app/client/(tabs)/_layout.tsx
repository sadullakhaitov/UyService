import { Tabs } from 'expo-router';
import { ClipboardList, House, Map as MapIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { pageLayout } from '@/components/ui/PageFrame';
import { SideRail, TabLabel, useTabBarOptions } from '@/components/ui/TabChrome';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useWide } from '@/lib/useLayout';
import { useOrders, useUser } from '@/store';

// Kompyuterda: Xarita — butun joy bo'ylab, qolgan bo'limlar — o'rtada ustun
const layout = pageLayout(['map'], false);

// Mijoz ilovasi: 4 bo'lim — Asosiy, Xarita, Buyurtmalar, Profil (usta ilovasidagi menyu bilan bir xil ko'rinish)
export default function ClientTabs() {
  useScheme();
  const wide = useWide();
  const options = useTabBarOptions(wide);
  const name = useUser((s) => s.name);
  const active = useOrders((s) => s.orders.filter((o) => o.status !== 'completed').length);
  return (
    <Tabs screenLayout={layout} tabBar={wide ? (props) => <SideRail {...props} /> : undefined} screenOptions={options}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarLabel: ({ color }) => <TabLabel text={t('tabs.home')} color={color} />,
          tabBarIcon: ({ color }) => <House size={24} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: t('tabs.map'),
          tabBarLabel: ({ color }) => <TabLabel text={t('tabs.map')} color={color} />,
          tabBarIcon: ({ color }) => <MapIcon size={24} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('tabs.myOrders'),
          tabBarLabel: ({ color }) => <TabLabel text={t('tabs.myOrders')} color={color} />,
          tabBarBadge: active || undefined,
          tabBarIcon: ({ color }) => <ClipboardList size={24} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.profile'),
          tabBarLabel: ({ color }) => <TabLabel text={t('tabs.profile')} color={color} />,
          tabBarIcon: ({ focused }) => (
            <View style={[styles.avatar, focused && styles.avatarOn]}>
              <Text style={[styles.avatarText, focused && { color: colors.onPrimary }]}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>
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
