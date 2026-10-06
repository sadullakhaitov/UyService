import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const DURATION = 2400;
const GAP = 800;

// Mijoz nuqtasidan 3 ta to'lqin ketma-ket tarqaladi va so'nadi (2,4 s, 0,8 s farq, cheksiz)
export function PulseRings({ size = 400 }: { size?: number }) {
  return (
    <View pointerEvents="none" style={[styles.box, { width: size, height: size }]}>
      {[0, 1, 2].map((i) => (
        <Ring key={i} size={size} delay={i * GAP} />
      ))}
    </View>
  );
}

function Ring({ size, delay }: { size: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p, delay]);
  const anim = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.value),
    transform: [{ scale: 0.15 + p.value * 0.85 }],
  }));
  return <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, anim]} />;
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(14,90,75,0.10)',
  },
});
