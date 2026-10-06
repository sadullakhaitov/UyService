import { StyleSheet, View } from 'react-native';
import { colors, fonts, themed } from '@/constants/theme';
import { Text } from './Text';

export function Avatar({ initials, size = 48, solid }: { initials: string; size?: number; solid?: boolean }) {
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.31, backgroundColor: solid ? colors.primary : colors.primaryTint },
      ]}
    >
      <Text style={{ fontFamily: fonts.heavy, fontSize: size * 0.34, color: solid ? colors.onPrimary : colors.primary }}>
        {initials}
      </Text>
    </View>
  );
}

const styles = themed(() => ({
  box: { alignItems: 'center', justifyContent: 'center' },
}));
