import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

const LIFT = 16;

// Manzil tanlash pini: xarita surilganda ko'tariladi, to'xtaganda tushadi (Yandex'dagidek).
// Pin uchi aynan fokus nuqtasida turadi.
export function CenterPin({ lifted }: { lifted: boolean }) {
  const y = useSharedValue(0);
  useEffect(() => {
    y.value = withSpring(lifted ? -LIFT : 0, { damping: 12, stiffness: 220 });
  }, [lifted, y]);
  const pin = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const shade = useAnimatedStyle(() => ({
    opacity: 0.28 + (y.value / LIFT) * 0.12,
    transform: [{ scaleX: 1 + (y.value / LIFT) * 0.35 }],
  }));
  return (
    <View pointerEvents="none" style={styles.box}>
      <Animated.View style={[styles.shadow, shade]} />
      <Animated.View style={[styles.pin, pin]}>
        <View style={styles.head}>
          <View style={styles.inner} />
        </View>
        <View style={styles.stem} />
      </Animated.View>
    </View>
  );
}

const HEAD = 34;
const STEM = 16;

const styles = StyleSheet.create({
  // Quti markazi = pin uchi
  box: { width: 80, height: (HEAD + STEM) * 2, alignItems: 'center', justifyContent: 'center' },
  pin: { position: 'absolute', bottom: HEAD + STEM, alignItems: 'center' },
  head: {
    width: HEAD,
    height: HEAD,
    borderRadius: HEAD / 2,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.surface },
  stem: { width: 3, height: STEM, borderRadius: 2, backgroundColor: colors.ink, marginTop: -2 },
  shadow: { position: 'absolute', width: 14, height: 5, borderRadius: 7, backgroundColor: colors.ink },
});
