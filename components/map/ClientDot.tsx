import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, themed, useScheme } from '@/constants/theme';

// Mijoz belgisi: to'q sariq doira, atrofida sekin "nafas oluvchi" halqa
export function ClientDot({ breathing = true, size = 22 }: { breathing?: boolean; size?: number }) {
  useScheme();
  const p = useSharedValue(0);
  useEffect(() => {
    if (breathing) p.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.sin) }), -1, false);
  }, [p, breathing]);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - p.value),
    transform: [{ scale: 1 + p.value * 1.6 }],
  }));
  return (
    <View pointerEvents="none" style={[styles.box, { width: size * 3, height: size * 3 }]}>
      {breathing ? <Animated.View style={[styles.halo, { width: size * 1.4, height: size * 1.4, borderRadius: size }, halo]} /> : null}
      <View style={[styles.dot, { width: size, height: size, borderRadius: size / 2 }]} />
    </View>
  );
}

const styles = themed(() => ({
  box: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: colors.accent },
  dot: {
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: colors.markerRing,
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
}));
