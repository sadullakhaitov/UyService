// Xarita ustidagi "+ / −" tugmalari (yaqinlashtirish / uzoqlashtirish) — bitta shisha pastil ichida.
// Mijoz bosh sahifasi va usta xaritasida bir xil.
import { Minus, Plus } from 'lucide-react-native';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassBg } from '@/components/ui/Glass';
import { colors, shadow, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';

export function MapZoom({ onZoom, size = 44, radius = 14, style }: { onZoom: (delta: number) => void; size?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  useScheme();
  return (
    // Soya tashqi qatlamda (overflow: hidden soyani kesib qo'ymasligi uchun), shisha — ichida
    <View style={[{ width: size, borderRadius: radius }, shadow.float, style]}>
      <GlassBg radius={radius} interactive />
      <Pressable accessibilityRole="button" accessibilityLabel={t('mOrders.zoomIn')} hitSlop={4} onPress={() => onZoom(1)} style={[styles.btn, { height: size + 4 }]}>
        <Plus size={22} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
      <View style={styles.sep} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('mOrders.zoomOut')} hitSlop={4} onPress={() => onZoom(-1)} style={[styles.btn, { height: size + 4 }]}>
        <Minus size={22} color={colors.ink} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = themed(() => ({
  // Ikonka shisha qatlam ustida chizilishi uchun position: relative
  btn: { alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' },
  sep: { height: 1, backgroundColor: colors.line, marginHorizontal: 9, position: 'relative' },
}));
