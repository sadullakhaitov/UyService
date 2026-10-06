import { StyleSheet } from 'react-native';
import { colors, fonts, radius, size } from '@/constants/theme';
import { Squish } from './Pressable';
import { Text } from './Text';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.on : styles.off]}
    >
      <Text style={[styles.label, { color: selected ? colors.onPrimary : colors.ink, fontFamily: selected ? fonts.bold : fonts.medium }]}>
        {label}
      </Text>
    </Squish>
  );
}

const styles = StyleSheet.create({
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
});
