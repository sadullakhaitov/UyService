// Liquid Glass (iOS 26 uslubi): xarita va kontent ustidagi tugmalar, panellar, menyu — shaffof shisha.
// iOS 26+ — tizimning haqiqiy Liquid Glass'i (expo-glass-effect); eski iOS va brauzer — xiralashtirish (expo-blur);
// Android — yarim shaffof shisha tus + yorug' hoshiya (WebView xaritani xiralashtirib bo'lmaydi).
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, isDark, useScheme } from '@/constants/theme';

const LIQUID = Platform.OS === 'ios' && safe(() => isLiquidGlassAvailable() && isGlassEffectAPIAvailable());
const BLUR = Platform.OS === 'ios' || Platform.OS === 'web';

function safe(f: () => boolean) {
  try {
    return f();
  } catch {
    return false;
  }
}

/**
 * Shisha fon qatlami — ota elementning orqasiga (absolute) qo'yiladi.
 * `strong` — o'qiladigan ko'p matnli panellar uchun (pastki panel, oynalar): tus qalinroq.
 */
export function GlassBg({
  radius = 18,
  strong,
  interactive,
  style,
}: {
  radius?: number | { tl: number; tr: number; bl: number; br: number };
  strong?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  useScheme();
  const r =
    typeof radius === 'number'
      ? { borderRadius: radius }
      : { borderTopLeftRadius: radius.tl, borderTopRightRadius: radius.tr, borderBottomLeftRadius: radius.bl, borderBottomRightRadius: radius.br };
  if (LIQUID) {
    return (
      <GlassView
        pointerEvents="none"
        glassEffectStyle="regular"
        isInteractive={interactive}
        colorScheme={isDark() ? 'dark' : 'light'}
        tintColor={strong ? colors.glassFill : undefined}
        style={[StyleSheet.absoluteFill, r, styles.clip, style]}
      />
    );
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, r, styles.clip, { borderColor: colors.glassBorder }, styles.edge, style]}>
      {BLUR ? (
        <BlurView intensity={isDark() ? 45 : 60} tint={isDark() ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} style={StyleSheet.absoluteFill} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: BLUR ? (strong ? colors.glassFillStrong : colors.glassFill) : colors.glassSolid }]} />
    </View>
  );
}

/** Shisha konteyner: GlassBg + ichidagi kontent */
export function Glass({
  children,
  style,
  radius = 18,
  strong,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  strong?: boolean;
}) {
  useScheme();
  return (
    <View style={[{ borderRadius: radius }, style]}>
      <GlassBg radius={radius} strong={strong} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  edge: { borderWidth: StyleSheet.hairlineWidth },
});
