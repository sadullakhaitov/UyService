import { Image, View } from 'react-native';
import { colors, fonts, isDark, themed, useScheme } from '@/constants/theme';
import { Text } from './Text';

// UyService logotipi: xaritadagi belgi (pin) ichida uy — "yaqiningizdagi ustani xaritada topamiz".
// Kunduzgi rejimda yashil belgi (assets/logo.png), tungi rejimda va rangli fonda — oq (logo-light.png).
// Ilova ikonkasi va ochilish ekrani: assets/icon.png, android-icon-*.png, splash-icon(-dark).png; asl SVG — design/logo/
const MARK = require('../../assets/logo.png');
const MARK_LIGHT = require('../../assets/logo-light.png');

/** light: true — oq (rangli fonda), false — doim yashil (oq kartochka ichida), berilmasa — rejimga qarab */
export function LogoMark({ size = 28, light }: { size?: number; light?: boolean }) {
  useScheme();
  return (
    <Image source={(light ?? isDark()) ? MARK_LIGHT : MARK} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />
  );
}

export function Logo({ size = 16, light }: { size?: number; light?: boolean }) {
  useScheme();
  return (
    <View style={styles.row}>
      <LogoMark size={size * 1.7} light={light} />
      <Text style={[styles.word, { fontSize: size, color: light ? colors.onPrimary : colors.ink }]}>
        <Text style={[styles.word, { fontSize: size, color: light ? colors.logoAccent : isDark() ? colors.success : colors.primary }]}>Uy</Text>Service
      </Text>
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.logo, letterSpacing: -0.3 },
}));
