import BottomSheet, { BottomSheetTextInput, BottomSheetView, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import { createContext, forwardRef, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Keyboard, Platform, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type LayoutChangeEvent, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { SIDE_GAP, SIDE_W, useWide } from '@/lib/useLayout';
import { GlassBg } from '@/components/ui/Glass';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, themed, useScheme } from '@/constants/theme';

const HANDLE = 24;

// Panel turi: telefonda pastdan chiqadi, kompyuterda — chapda suzuvchi oyna
const SideCtx = createContext(false);

/** Panel ichidagi matn maydoni: pastki panelda klaviaturaga moslashadi, kompyuterdagi yon panelda — oddiy maydon */
export const SheetInput = forwardRef<TextInput, TextInputProps>(function SheetInput(props, ref) {
  const side = useContext(SideCtx);
  // Brauzerda BottomSheetTextInput fokusda xato beradi (TextInput.State yo'q) — oddiy maydon yetarli
  if (side || Platform.OS === 'web') return <TextInput ref={ref} {...props} />;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <BottomSheetTextInput ref={ref as any} {...props} />;
});

// Pastdan chiqadigan panel: yuqori burchaklari yumaloq, tepasida tortish chizig'i.
// Ochilganda prujina bilan sakrab chiqadi; tortib pastga kichraytirish mumkin (peek — faqat yuqori qismi ko'rinadi).
export function Sheet({
  children,
  onHeight,
  peek = 84,
  bottomInset,
  top,
  position,
}: {
  children: ReactNode;
  /** Panelning hozir ko'rinib turgan balandligi (xarita fokus nuqtasi uchun) */
  onHeight?: (h: number) => void;
  /** Kichraytirilgan holatdagi balandlik (tortish chizig'isiz) */
  peek?: number;
  /** Pastki tab menyu ustida bo'lsa — 0 (xavfsiz zona tab menyuda) */
  bottomInset?: number;
  /** Kompyuterda: yon panel shuncha pastdan boshlanadi (tepadagi tugmalar ostidan) */
  top?: number;
  /** Panel tepasining jonli o'rni (useSheetFollow) — xarita tugmalari panel bilan birga silliq yuradi */
  position?: SharedValue<number>;
}) {
  useScheme();
  if (useWide()) return <SidePanel onHeight={onHeight} top={top}>{children}</SidePanel>;
  return (
    <BottomPanel onHeight={onHeight} peek={peek} bottomInset={bottomInset} position={position}>
      {children}
    </BottomPanel>
  );
}

/**
 * Panel ustida turadigan tugmalar (zoom, joylashuv) uchun: panel tortilganda yoki ochilib-yopilganda
 * ular bir kadr ham kechikmay birga yuradi. `onLayout` — panel joylashgan ota element (ekran) ga.
 * Panel hali o'lchanmagan bo'lsa — `fallback` (oxirgi ma'lum balandlik).
 */
export function useSheetFollow(fallback: number, gap = 12) {
  const position = useSharedValue(0);
  const box = useSharedValue(0);
  const onLayout = (e: LayoutChangeEvent) => {
    box.value = e.nativeEvent.layout.height;
  };
  const style = useAnimatedStyle(() => {
    const p = position.value;
    const live = box.value > 0 && p > 0 && p < box.value;
    return { bottom: (live ? box.value - p : fallback) + gap };
  });
  return { position, onLayout, style };
}

// Kompyuter: chapda, xarita ustida suzuvchi shisha oyna; kontent uzun bo'lsa — ichida aylantiriladi
function SidePanel({ children, onHeight, top = 76 }: { children: ReactNode; onHeight?: (h: number) => void; top?: number }) {
  useScheme();
  const { height } = useWindowDimensions();
  useEffect(() => {
    // Xarita pastdan to'silmaydi
    onHeight?.(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={[styles.side, shadow.float, { top, maxHeight: height - top - SIDE_GAP }]}>
      <GlassBg radius={radius.sheet} strong />
      <ScrollView style={styles.sideScroll} contentContainerStyle={styles.sideContent} showsVerticalScrollIndicator={false}>
        <SideCtx.Provider value>{children}</SideCtx.Provider>
      </ScrollView>
    </View>
  );
}

function BottomPanel({
  children,
  onHeight,
  peek = 84,
  bottomInset,
  position,
}: {
  children: ReactNode;
  onHeight?: (h: number) => void;
  peek?: number;
  bottomInset?: number;
  position?: SharedValue<number>;
}) {
  useScheme();
  const safe = useSafeAreaInsets();
  const insets = { bottom: bottomInset ?? safe.bottom };
  const spring = useBottomSheetSpringConfigs({ damping: 16, stiffness: 160, mass: 0.9, overshootClamping: false });
  const peekH = peek + HANDLE + insets.bottom;
  const fullH = useRef(0);
  const index = useRef(1);

  const report = (i = index.current) => {
    const h = i === 0 ? peekH : fullH.current;
    if (h > 0) onHeight?.(h);
  };

  return (
    <BottomSheet
      index={1}
      snapPoints={[peekH]}
      enableDynamicSizing
      animateOnMount
      animationConfigs={spring}
      animatedPosition={position}
      enablePanDownToClose={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      // Xarita panel bilan bir vaqtda siljiy boshlaydi (animatsiya oxirini kutmaydi)
      onAnimate={(_from, to) => {
        if (to >= 0) report(to);
      }}
      onChange={(i) => {
        if (i < 0) return;
        if (i === 0) Keyboard.dismiss();
        index.current = i;
        report();
      }}
      backgroundComponent={SheetGlass}
      handleIndicatorStyle={styles.handle}
      style={shadow.sheet}
    >
      <BottomSheetView
        style={[styles.content, { paddingBottom: Math.max(insets.bottom, 4) + 12 }]}
        onLayout={(e) => {
          fullH.current = e.nativeEvent.layout.height + HANDLE;
          report();
        }}
      >
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

// Panel foni — Liquid Glass (xarita ostidan xira ko'rinib turadi)
const SHEET_R = { tl: radius.sheet, tr: radius.sheet, bl: 0, br: 0 };
function SheetGlass({ style }: { style?: StyleProp<ViewStyle> }) {
  useScheme();
  return (
    <View pointerEvents="none" style={[style, styles.bg]}>
      <GlassBg radius={SHEET_R} strong />
    </View>
  );
}

const styles = themed(() => ({
  bg: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.handle },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
  side: { position: 'absolute', left: SIDE_GAP, width: SIDE_W, borderRadius: radius.sheet, overflow: 'hidden' },
  sideScroll: { flexGrow: 0, flexShrink: 1, position: 'relative' },
  sideContent: { padding: 20, gap: 16 },
}));
