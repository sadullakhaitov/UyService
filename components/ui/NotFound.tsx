import { router } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { Button } from './Button';
import { Text } from './Text';

/** Buyurtma topilmadi (eski havola, yakunlangan yoki bekor qilingan) — bo'sh ekran o'rniga tushuntirish va chiqish yo'li */
export function NotFound({ home = '/client' }: { home?: '/client' | '/master' }) {
  useScheme();
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <View style={styles.icon}>
          <SearchX size={30} color={colors.ink2} strokeWidth={2} />
        </View>
        <Text variant="h2" style={styles.center}>
          {t('notFound.title')}
        </Text>
        <Text variant="small" style={styles.center}>
          {t('notFound.text')}
        </Text>
      </View>
      <View style={styles.bottom}>
        <Button title={t('notFound.home')} big onPress={() => router.replace(home)} />
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  center: { textAlign: 'center' },
  bottom: { padding: 16 },
}));
