import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryList } from '@/components/order/HistoryList';
import { ScreenHeader } from '@/components/ui';
import { colors, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';

// Buyurtmalar tarixi (alohida ekran; pastki menyuda — "Buyurtmalar" bo'limi ichida)
export default function History() {
  useScheme();
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader title={t('history.title')} />
      <ScrollView contentContainerStyle={styles.list}>
        <HistoryList />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16 },
}));
