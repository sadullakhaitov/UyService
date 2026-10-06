import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@/lib/i18n';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { themed } from '@/constants/theme';

export function ScreenHeader({ kicker, title, right, onBack }: { kicker?: string; title: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.row}>
      <IconButton icon={ChevronLeft} label={t('common.back')} floating onPress={onBack ?? (() => router.back())} />
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
