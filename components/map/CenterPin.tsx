import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { colors, fonts, themed } from '@/constants/theme';
import { Text } from '@/components/ui/Text';

const LIFT = 16;

// Manzil tanlash pini: xarita surilganda ko'tariladi, to'xtaganda tushadi (Yandex'dagidek).
// Pin uchi aynan fokus nuqtasida turadi. `label` — pin ustidagi pufakcha (masalan, eng yaqin usta: "4 daq")
export function CenterPin({ lifted, label }: { lifted: boolean; label?: string }) {
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
        {label && !lifted ? (
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{label}</Text>
            <View style={styles.bubbleTail} />
          </View>
        ) : null}
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
const BOX_H = (HEAD + STEM) * 2 + 80;

const styles = themed(() => ({
  // Quti markazi = pin uchi
  box: { width: 160, height: BOX_H, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    marginBottom: 6,
    backgroundColor: colors.pin,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.onPin },
  bubbleTail: {
    position: 'absolute',
    bottom: -5,
    width: 10,
    height: 10,
    backgroundColor: colors.pin,
    transform: [{ rotate: '45deg' }],
  },
  pin: { position: 'absolute', bottom: BOX_H / 2, alignItems: 'center' },
  head: {
    width: HEAD,
    height: HEAD,
    borderRadius: HEAD / 2,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.markerRing,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  inner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.markerRing },
  stem: { width: 3, height: STEM, borderRadius: 2, backgroundColor: colors.pin, marginTop: -2 },
  shadow: { position: 'absolute', width: 14, height: 5, borderRadius: 7, backgroundColor: colors.shadow },
}));
