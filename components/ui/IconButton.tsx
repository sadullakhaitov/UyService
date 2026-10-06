import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { colors, shadow, size } from '@/constants/theme';
import { Squish } from './Pressable';

export function IconButton({
  icon: Icon,
  label,
  onPress,
  floating,
  style,
}: {
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
  floating?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={[styles.btn, floating ? shadow.float : styles.flat, style]}
    >
      <Icon size={20} color={colors.ink} strokeWidth={2.2} />
    </Squish>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: size.touch,
    height: size.touch,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flat: { borderWidth: 1.5, borderColor: colors.line },
});
