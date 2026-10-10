// Xarita ustidagi fokus qatlami (markazdagi pin): panel balandligi o'zgarganda sakramaydi —
// xarita kamerasi bilan bir xil vaqt va egri chiziqda siljiydi (osm/html.ts → INSET_MS, MapLibre easeTo).
import { useEffect, type ReactNode } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { themed } from '@/constants/theme';
import { INSET_MS, type MapInsets } from './page';

// MapLibre easeTo'ning standart egri chizig'i
const EASE = Easing.bezier(0.25, 0.1, 0.25, 1);

export function Focal({ insets, children }: { insets: MapInsets; children: ReactNode }) {
  const top = useSharedValue(insets.top);
  const bottom = useSharedValue(insets.bottom);
  useEffect(() => {
    top.value = withTiming(insets.top, { duration: INSET_MS, easing: EASE });
    bottom.value = withTiming(insets.bottom, { duration: INSET_MS, easing: EASE });
  }, [insets.top, insets.bottom]); // eslint-disable-line react-hooks/exhaustive-deps
  const style = useAnimatedStyle(() => ({ top: top.value, bottom: bottom.value }));
  return (
    <Animated.View pointerEvents="none" style={[styles.focal, { left: insets.left ?? 0 }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = themed(() => ({
  focal: { position: 'absolute', right: 0, alignItems: 'center', justifyContent: 'center' },
}));
