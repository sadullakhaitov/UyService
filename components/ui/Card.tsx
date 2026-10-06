import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { Text } from './Text';

export function Card({ style, tone = 'surface', ...rest }: ViewProps & { tone?: 'surface' | 'muted' }) {
  return <View {...rest} style={[styles.card, tone === 'muted' && styles.muted, style]} />;
}

export function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant="body" style={styles.label}>
        {label}
      </Text>
      <Text variant="bodyBold" style={strong ? styles.strong : undefined}>
        {value}
      </Text>
    </View>
  );
}

export const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    padding: 16,
    gap: 10,
  },
  muted: { backgroundColor: colors.bg, borderColor: colors.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  label: { color: colors.ink2, flexShrink: 1, fontSize: 14 },
  strong: { fontSize: 22, lineHeight: 28 },
  divider: { height: 1, backgroundColor: colors.line },
});
