import { Image, View } from 'react-native';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { Text } from './Text';

// UyService logotipi: to'rtta yaltiroq rangli kvadrat (assets/logo.png, shaffof fon — kunduzgi va tungi rejimda ham chiroyli).
// Ilova ikonkasi va ochilish ekrani: assets/icon.png, android-icon-*.png, splash-icon.png
const MARK = require('../../assets/logo.png');

export function LogoMark({ size = 28 }: { size?: number; light?: boolean }) {
  return <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
}

export function Logo({ size = 16, light }: { size?: number; light?: boolean }) {
  useScheme();
  return (
    <View style={styles.row}>
      <LogoMark size={size * 1.7} />
      <Text style={[styles.word, { fontSize: size, color: light ? colors.onPrimary : colors.ink }]}>
        Uy<Text style={[styles.word, { fontSize: size, color: light ? colors.logoAccent : colors.primary }]}>Service</Text>
      </Text>
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.logo, letterSpacing: -0.3 },
}));
