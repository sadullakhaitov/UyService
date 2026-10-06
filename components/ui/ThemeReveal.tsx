// Kunduzgi ↔ tungi almashganda Telegram'dagi kabi animatsiya: yangi rejim bosilgan joydan doira bo'lib kengayadi.
// Ishlash tartibi: eski ekran surati → ustiga qo'yiladi → rejim almashadi → yangi ekran surati →
// u doira ichida 0 dan butun ekrangacha kattalashadi → suratlar olib tashlanadi. Ekranlar joyida qoladi.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dimensions, Image, Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';

type Point = { x: number; y: number };
type Reveal = (origin: Point | null, apply: () => void) => void;

const Ctx = createContext<Reveal>((_, apply) => apply());
/** Rejimni animatsiya bilan almashtirish: `reveal({ x, y }, () => setThemeMode('dark'))` */
export const useThemeReveal = () => useContext(Ctx);

const DURATION = 520;
const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export function ThemeRevealProvider({ children }: { children: ReactNode }) {
  const root = useRef<View>(null);
  const busy = useRef(false);
  const [shots, setShots] = useState<{ old: string; next?: string; origin: Point } | null>(null);
  const size = useSharedValue(0);

  const finish = useCallback(() => {
    setShots(null);
    busy.current = false;
  }, []);

  const reveal = useCallback<Reveal>(
    async (origin, apply) => {
      // Brauzerda yoki takroriy bosishda — animatsiyasiz
      if (Platform.OS === 'web' || busy.current || !root.current) return apply();
      busy.current = true;
      const { width, height } = Dimensions.get('window');
      const o = origin ?? { x: width / 2, y: height / 2 };
      try {
        const old = await captureRef(root, { format: 'jpg', quality: 0.92, result: 'tmpfile' });
        setShots({ old, origin: o });
        await nextFrame();
        apply();
        // Yangi ranglar chizilishini kutamiz
        await nextFrame();
        await nextFrame();
        await new Promise((r) => setTimeout(r, 60));
        const next = await captureRef(root, { format: 'jpg', quality: 0.92, result: 'tmpfile' });
        // Eng uzoq burchakkacha masofa — doira butun ekranni qoplashi uchun
        const r = Math.hypot(Math.max(o.x, width - o.x), Math.max(o.y, height - o.y));
        size.value = 0;
        setShots({ old, next, origin: o });
        size.value = withTiming(r * 2, { duration: DURATION, easing: Easing.inOut(Easing.cubic) }, (done) => {
          if (done) runOnJS(finish)();
        });
      } catch {
        // Surat olinmasa — oddiy almashish
        apply();
        finish();
      }
    },
    [finish, size],
  );

  const { width, height } = Dimensions.get('window');
  const ox = shots?.origin.x ?? 0;
  const oy = shots?.origin.y ?? 0;
  const circle = useAnimatedStyle(() => ({
    width: size.value,
    height: size.value,
    borderRadius: size.value / 2,
    left: ox - size.value / 2,
    top: oy - size.value / 2,
  }));
  const inner = useAnimatedStyle(() => ({ left: size.value / 2 - ox, top: size.value / 2 - oy }));

  return (
    <Ctx.Provider value={reveal}>
      <View ref={root} collapsable={false} style={styles.fill}>
        {children}
      </View>
      {shots ? (
        <View pointerEvents="auto" style={StyleSheet.absoluteFill}>
          <Image source={{ uri: shots.old }} style={[StyleSheet.absoluteFill, { width, height }]} fadeDuration={0} />
          {shots.next ? (
            <Animated.View style={[styles.circle, circle]}>
              <Animated.Image source={{ uri: shots.next }} style={[styles.inner, { width, height }, inner]} fadeDuration={0} />
            </Animated.View>
          ) : null}
        </View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  circle: { position: 'absolute', overflow: 'hidden' },
  inner: { position: 'absolute' },
});
