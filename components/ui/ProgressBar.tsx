import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

// Cheksiz yuguruvchi chiziq — qidiruv davom etayotganini bildiradi
export function IndeterminateBar() {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }), -1, false);
  }, [x]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: -0.4 * w + x.value * 1.4 * w }] }));
  return (
    <View style={styles.track} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.bar, anim]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, backgroundColor: '#E7EEEA', overflow: 'hidden' },
  bar: { width: '40%', height: 6, borderRadius: 3, backgroundColor: colors.primary },
});
