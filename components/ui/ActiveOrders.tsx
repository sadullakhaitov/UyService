import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { getCategory } from '@/constants/categories';
import { colors, fonts, radius, themed } from '@/constants/theme';
import { formatSchedule, t } from '@/lib/i18n';
import { etaMin } from '@/lib/orderSimulator';
import { useOrders, type ActiveOrder } from '@/store';
import { Squish } from './Pressable';
import { Text } from './Text';

// Bosh sahifadagi faol buyurtmalar: har biri o'z kategoriya rangida, bosilsa o'sha buyurtma ochiladi
export function ActiveOrders() {
  // Selektor massivni o'zgartirmasdan qaytaradi (zustand: har renderda yangi massiv — cheksiz render)
  const all = useOrders((s) => s.orders);
  const orders = all.filter((o) => o.status !== 'completed');
  if (!orders.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} single={orders.length === 1} />
      ))}
    </ScrollView>
  );
}

function OrderCard({ order, single }: { order: ActiveOrder; single: boolean }) {
  const cat = getCategory(order.categoryId);
  const Icon = cat.icon;
  const status =
    order.status === 'scheduled'
      ? formatSchedule(order.scheduledAt ?? Date.now())
      : order.status === 'searching'
      ? order.none
        ? t('searching.noneTitle')
        : t('active.searching')
      : order.status === 'on_the_way'
        ? t('active.onWay', { min: etaMin(order) })
        : order.status === 'arrived'
          ? t('tracking.arrived')
          : t('tracking.inProgress');
  const go = () =>
    router.push(order.status === 'searching' || order.status === 'scheduled' ? `/client/searching?id=${order.id}` : `/client/tracking?id=${order.id}`);
  return (
    <Squish accessibilityRole="button" onPress={go} style={[styles.card, { backgroundColor: cat.tint, borderColor: cat.main }, single && styles.single]}>
      <View style={[styles.icon, { backgroundColor: cat.main }]}>
        <Icon size={20} color={cat.onMain} strokeWidth={2.2} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.title, { color: cat.ink }]} numberOfLines={1}>
          {t(`categories.${order.categoryId}`)}
        </Text>
        <Text variant="caption" numberOfLines={1} style={{ color: colors.ink }}>
          {status}
        </Text>
      </View>
      <ChevronRight size={18} color={cat.ink} strokeWidth={2.4} />
    </Squish>
  );
}

const styles = themed(() => ({
  row: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingRight: 12, borderRadius: radius.tile, borderWidth: 1.5, width: 240 },
  single: { width: undefined, minWidth: 320 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { fontFamily: fonts.heavy, fontSize: 15 },
}));
