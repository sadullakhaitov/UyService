import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, themed } from '@/constants/theme';
import { Text } from './Text';

// Vaqtinchalik belgi: uy tomi + kalit. Haqiqiy logotip tayyor bo'lgach shu fayl almashtiriladi.
export function LogoMark({ size = 28, light }: { size?: number; light?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M4 14.5 16 5l12 9.5V26a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill={light ? colors.onPrimary : colors.primary} />
      <Path
        d="M19.6 13.4a3.6 3.6 0 0 0-4.8 4.5L11 21.7l1.9 1.9 3.8-3.8a3.6 3.6 0 0 0 4.5-4.8l-2 2-1.6-.4-.4-1.6z"
        fill={light ? colors.primary : colors.onPrimary}
      />
      <Circle cx="25.5" cy="7.5" r="3.5" fill={colors.accent} />
    </Svg>
  );
}

export function Logo({ size = 16, light }: { size?: number; light?: boolean }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size * 1.6} light={light} />
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
