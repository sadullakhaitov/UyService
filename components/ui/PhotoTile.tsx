import type { LucideIcon } from 'lucide-react-native';
import { X } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { Squish } from './Pressable';
import { Text } from './Text';

/** Rasm katagi: bo'sh bo'lsa — "qo'shish" tugmasi, bo'lmasa — rasm va o'chirish belgisi */
export function PhotoTile({
  uri,
  onAdd,
  onRemove,
  icon: Icon,
  label,
  size = 96,
  style,
}: {
  uri?: string | null;
  onAdd?: () => void;
  onRemove?: () => void;
  icon?: LucideIcon;
  label?: string;
  size?: number | `${number}%`;
  style?: StyleProp<ViewStyle>;
}) {
  if (uri) {
    return (
      <View style={[styles.tile, { width: size, height: typeof size === 'number' ? size : undefined, aspectRatio: 1 }, style]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} />
        {onRemove ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.remove')} hitSlop={8} onPress={onRemove} style={styles.remove}>
            <X size={14} color={colors.onPrimary} strokeWidth={3} />
          </Pressable>
        ) : null}
      </View>
    );
  }
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onAdd}
      style={[styles.tile, styles.add, { width: size, height: typeof size === 'number' ? size : undefined, aspectRatio: 1 }, style]}
    >
      {Icon ? <Icon size={26} color={colors.primary} strokeWidth={2} /> : null}
      {label ? (
        <Text style={styles.label} numberOfLines={2}>
          {label}
        </Text>
      ) : null}
    </Squish>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 16, overflow: 'hidden', backgroundColor: colors.mapBlock },
  add: { backgroundColor: colors.surface, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9FB1AA', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  label: { fontFamily: fonts.bold, fontSize: 12, color: colors.primary, textAlign: 'center' },
  remove: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(11,42,36,0.7)', alignItems: 'center', justifyContent: 'center' },
});
