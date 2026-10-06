import { StyleSheet } from 'react-native';
import { colors, fonts, radius, size, themed } from '@/constants/theme';
import { Squish } from './Pressable';
import { Text } from './Text';

export function Chip({ label, selected, onPress, color, onColor }: { label: string; selected?: boolean; onPress?: () => void; color?: string; onColor?: string }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.on : styles.off, selected && color ? { backgroundColor: color, borderColor: color } : null]}
    >
      <Text style={[styles.label, { color: selected ? (onColor ?? colors.onPrimary) : colors.ink, fontFamily: selected ? fonts.bold : fonts.medium }]}>
        {label}
      </Text>
    </Squish>
  );
}

const styles = themed(() => ({
  chip: {
    height: size.touch,
    paddingHorizontal: 16,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  off: { backgroundColor: colors.surface, borderColor: colors.line },
  label: { fontSize: 14 },
}));
