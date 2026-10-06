import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/constants/theme';

// Usta belgisi: yashil doira ichida yo'nalish o'qi (yuqoriga qaragan; burilish tashqaridan beriladi)
export function MasterIcon({ size = 38 }: { size?: number }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
        <Path d="M12 2.5 19.5 20 12 16.2 4.5 20z" fill={colors.onPrimary} />
      </Svg>
    </View>
  );
}

export function NearbyIcon() {
  return <View style={styles.nearby} />;
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  nearby: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 2.5,
    borderColor: colors.surface,
  },
});
