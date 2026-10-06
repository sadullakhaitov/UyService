import type { ErrorBoundaryProps } from 'expo-router';
import { TriangleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, themed } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { Button } from './Button';
import { Text } from './Text';

// Expo Router xato chegarasi: ekran ichida xato bo'lsa — shu ko'rinadi (8-bosqichda Sentry'ga yuboriladi)
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.root}>
      <View style={styles.icon}>
        <TriangleAlert size={32} color={colors.accentInk} strokeWidth={2} />
      </View>
      <Text variant="h2" style={styles.center}>
        {t('errors.title')}
      </Text>
      <Text variant="small" style={styles.center}>
        {t('errors.text')}
      </Text>
      {__DEV__ ? (
        <Text variant="caption" style={styles.dev} numberOfLines={4}>
          {error.message}
        </Text>
      ) : null}
      <Button title={t('errors.retry')} big onPress={retry} style={styles.btn} />
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: colors.bg },
  icon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  center: { textAlign: 'center' },
  dev: { textAlign: 'center', fontFamily: fonts.medium, color: colors.danger },
  btn: { alignSelf: 'stretch', marginTop: 8 },
}));
