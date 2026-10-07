// Mijoz: "Buyurtmalar" bo'limi — hozirgi (faol) buyurtmalar va tarix (qayta chaqirish)
import { router } from 'expo-router';
import { ClipboardList } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryList } from '@/components/order/HistoryList';
import { ActiveOrders } from '@/components/ui/ActiveOrders';
import { Button, ScreenHeader, Text } from '@/components/ui';
import { colors, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useOrders } from '@/store';

export default function Orders() {
  useScheme();
  const active = useOrders((s) => s.orders.filter((o) => o.status !== 'completed').length);
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader title={t('tabs.myOrders')} back={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="h3">{t('orders.active')}</Text>
        {active ? (
          <ActiveOrders />
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <ClipboardList size={26} color={colors.primary} strokeWidth={2} />
            </View>
            <Text variant="small" style={styles.center}>
              {t('orders.noActive')}
            </Text>
            <Button title={t('orders.callMaster')} onPress={() => router.navigate('/client')} />
          </View>
        )}
        <Text variant="h3" style={styles.section}>
          {t('history.title')}
        </Text>
        <HistoryList />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
  section: { marginTop: 10 },
  empty: { alignItems: 'center', gap: 10, padding: 20, borderRadius: 18, backgroundColor: colors.surface },
  emptyIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
}));
