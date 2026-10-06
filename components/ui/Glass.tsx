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
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, r, styles.clip, styles.isolate, { borderColor: colors.glassBorder }, styles.edge, style]}>
      {BLUR ? (
        // Burchak radiusi xiralashtirish qatlamining o'ziga ham beriladi: brauzerda (Chrome) backdrop-filter
        // ota elementning yumaloq burchagi bilan kesilmaydi va to'rtburchak bo'lib ko'rinadi
        <BlurView intensity={isDark() ? 45 : 60} tint={isDark() ? 'systemThinMaterialDark' : 'systemThinMaterialLight'} style={[StyleSheet.absoluteFill, r, styles.clip]} />
      ) : null}
      <View style={[StyleSheet.absoluteFill, r, { backgroundColor: BLUR ? (strong ? colors.glassFillStrong : colors.glassFill) : colors.glassSolid }]} />
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
  // Yorug' hoshiya faqat telefonda: brauzerda 0,5 px chiziq yumaloq burchakda xira va notekis chiziladi —
  // u yerda shisha soyasi va tusi bilan ajralib turadi (minimalizm)
  edge: { borderWidth: Platform.OS === 'web' ? 0 : StyleSheet.hairlineWidth },
  // Brauzer: ichidagi xiralashtirish ham yumaloq burchak bilan kesilishi uchun alohida qatlam
  isolate: Platform.OS === 'web' ? { isolation: 'isolate' } : {},
});
