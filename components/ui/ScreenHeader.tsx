import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@/lib/i18n';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { themed, useScheme } from '@/constants/theme';

/** back={false} — orqaga tugmasiz (pastki menyu bo'limlari) */
export function ScreenHeader({ kicker, title, right, onBack, back = true }: { kicker?: string; title: string; right?: ReactNode; onBack?: () => void; back?: boolean }) {
  useScheme();
  return (
    <View style={styles.row}>
      {back ? <IconButton icon={ChevronLeft} label={t('common.back')} floating onPress={onBack ?? (() => router.back())} /> : null}
      <View style={styles.titles}>
        {kicker ? <Text variant="caption">{kicker}</Text> : null}
        <Text variant="h2" numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  titles: { flex: 1 },
}));
