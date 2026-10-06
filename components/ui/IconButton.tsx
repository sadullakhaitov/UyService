import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassBg } from './Glass';
import { colors, shadow, size, themed, useScheme } from '@/constants/theme';
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
  useScheme();
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={[styles.btn, floating ? [styles.glass, shadow.float] : styles.flat, style]}
    >
      {/* Xarita ustidagi tugmalar — Liquid Glass */}
      {floating ? <GlassBg radius={(StyleSheet.flatten(style)?.borderRadius as number | undefined) ?? 14} interactive /> : null}
      {/* Ikonka shisha qatlam ustida turishi uchun (brauzerda absolute qatlam oddiy elementdan ustun chiziladi) */}
      <View style={styles.icon}>
        <Icon size={20} color={colors.ink} strokeWidth={2.2} />
      </View>
    </Squish>
  );
}

const styles = themed(() => ({
  btn: {
    width: size.touch,
    height: size.touch,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flat: { borderWidth: 1.5, borderColor: colors.line },
  glass: { backgroundColor: 'transparent' },
  icon: { position: 'relative', zIndex: 1 },
}));
