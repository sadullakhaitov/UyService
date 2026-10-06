import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { colors, fonts } from '@/constants/theme';
import { Text } from './Text';

const ACircle = Animated.createAnimatedComponent(Circle);

// Aylana taymer: 60 → 0 kamayadi, oxirgi soniyalarda telefon tebranadi
export function CountdownRing({ seconds, size = 132, label, onDone }: { seconds: number; size?: number; label: string; onDone: () => void }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    p.value = withTiming(1, { duration: seconds * 1000, easing: Easing.linear });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    const start = Date.now();
    const id = setInterval(() => {
      const l = Math.max(0, seconds - Math.floor((Date.now() - start) / 1000));
      setLeft(l);
      if (l <= 5 && l > 0 && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      if (l === 0) {
        clearInterval(id);
        onDone();
      }
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const props = useAnimatedProps(() => ({ strokeDashoffset: c * p.value }));
  const urgent = left <= 5;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.line} strokeWidth={stroke} fill="none" />
        <ACircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={urgent ? colors.accent : colors.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          animatedProps={props}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.num, urgent && { color: colors.accentInk }]}>{left}</Text>
        <Text variant="caption">{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  num: { fontFamily: fonts.heavy, fontSize: 40, lineHeight: 46, color: colors.ink },
});
