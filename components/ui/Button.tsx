import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts, radius, size } from '@/constants/theme';
import { Squish } from './Pressable';
import { Text } from './Text';

type Kind = 'primary' | 'secondary' | 'soft' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  kind?: Kind;
  icon?: LucideIcon;
  big?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Kategoriya rangi bilan bo'yash */
  color?: { bg: string; fg: string };
};

const palette: Record<Kind, { bg: string; fg: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.field, fg: colors.ink },
  soft: { bg: colors.primarySoft, fg: colors.primary },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
};

// Har bir ekranda bitta asosiy (yashil) tugma, qolganlari och kulrang.
export function Button({ title, onPress, kind = 'primary', icon: Icon, big, disabled, loading, style, color }: Props) {
  const p = color ?? palette[kind];
  return (
    <Squish
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        styles.base,
        { backgroundColor: p.bg, height: big ? size.button : 52, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={20} color={p.fg} strokeWidth={2.2} /> : null}
          <Text style={[styles.label, { color: p.fg, fontSize: big ? 16 : 15 }]}>{title}</Text>
        </View>
      )}
    </Squish>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.heavy },
});
