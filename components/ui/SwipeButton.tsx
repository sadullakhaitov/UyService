import { ArrowRight, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { colors, fonts } from '@/constants/theme';
import { Text } from './Text';

const KNOB = 64;
const PAD = 6;

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
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const max = Math.max(0, w - KNOB - PAD * 2);

  const pan = Gesture.Pan()
    .enabled(!disabled && max > 0)
    .onUpdate((e) => {
      x.value = Math.min(max, Math.max(0, e.translationX));
    })
    .onEnd(() => {
      if (x.value > max * 0.75) {
        runOnJS(onComplete)();
        x.value = withSequence(withSpring(max, { damping: 20, stiffness: 300 }), withSpring(0, { damping: 18, stiffness: 160 }));
      } else {
        x.value = withSpring(0, { damping: 16, stiffness: 220 });
      }
    });

  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
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
        {hint ? <Text style={[styles.hint, { color: primary ? '#CFE5DD' : colors.ink2 }]}>{hint}</Text> : null}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.knob, knob]}>
          <Icon size={28} color={disabled ? colors.muted : colors.primary} strokeWidth={2.4} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: KNOB + PAD * 2, borderRadius: (KNOB + PAD * 2) / 2, padding: PAD, justifyContent: 'center' },
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
});
