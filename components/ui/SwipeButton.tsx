import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { Text } from './Text';

const KNOB = 64;
const PAD = 6;
const SNAP = { damping: 20, stiffness: 300, overshootClamping: true };
const BACK = { damping: 18, stiffness: 200, overshootClamping: true };

// Yandex Pro'dagidek "surib tasdiqlash" tugmasi: tasodifan bosilib ketmaydi
export function SwipeButton({
  title,
  hint,
  onComplete,
  disabled,
  tone = 'primary',
  icon: Icon = ArrowRight,
}: {
  title: string;
  hint?: string;
  onComplete: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'muted';
  icon?: LucideIcon;
}) {
  useScheme();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const max = Math.max(0, w - KNOB - PAD * 2);

  const pan = Gesture.Pan()
    .enabled(!disabled && max > 0)
    .onUpdate((e) => {
      x.value = Math.min(max, Math.max(0, e.translationX));
    })
    .onEnd(() => {
      // overshootClamping — prujina chegaradan o'tib ketmaydi (aks holda tez surilsa tugma chiziqdan chiqib turardi)
      if (x.value > max * 0.75) {
        runOnJS(onComplete)();
        x.value = withSequence(withSpring(max, SNAP), withSpring(0, BACK));
      } else {
        x.value = withSpring(0, BACK);
      }
    });

  // Har holda ham tugma chiziq ichida: 0 … max
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: Math.min(max, Math.max(0, x.value)) }] }));
  const label = useAnimatedStyle(() => ({ opacity: max ? interpolate(x.value, [0, max * 0.6], [1, 0]) : 1 }));

  const primary = tone === 'primary' && !disabled;
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => !disabled && onComplete()}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: primary ? colors.primary : colors.field }]}
    >
      <Animated.View style={[styles.labels, label]} pointerEvents="none">
        <Text style={[styles.title, { color: primary ? colors.onPrimary : disabled ? colors.muted : colors.ink }]}>{title}</Text>
        {hint ? <Text style={[styles.hint, { color: primary ? colors.onPrimaryMuted : colors.ink2 }]}>{hint}</Text> : null}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, knob]}>
          <Icon size={28} color={disabled ? colors.muted : colors.primary} strokeWidth={2.4} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = themed(() => ({
  track: { height: KNOB + PAD * 2, borderRadius: (KNOB + PAD * 2) / 2, padding: PAD, justifyContent: 'center', overflow: 'hidden' },
  labels: { position: 'absolute', left: KNOB + PAD * 2, right: 16, alignItems: 'center' },
  title: { fontFamily: fonts.heavy, fontSize: 18, textAlign: 'center' },
  hint: { fontFamily: fonts.medium, fontSize: 13, marginTop: 2, textAlign: 'center' },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
}));
