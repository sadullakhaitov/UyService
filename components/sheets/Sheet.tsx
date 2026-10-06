import BottomSheet, { BottomSheetView, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import { useRef, type ReactNode } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '@/constants/theme';

const HANDLE = 24;

// Pastdan chiqadigan panel: yuqori burchaklari yumaloq, tepasida tortish chizig'i.
// Ochilganda prujina bilan sakrab chiqadi; tortib pastga kichraytirish mumkin (peek — faqat yuqori qismi ko'rinadi).
export function Sheet({
  children,
  onHeight,
  peek = 84,
  bottomInset,
}: {
  children: ReactNode;
  /** Panelning hozir ko'rinib turgan balandligi (xarita fokus nuqtasi uchun) */
  onHeight?: (h: number) => void;
  /** Kichraytirilgan holatdagi balandlik (tortish chizig'isiz) */
  peek?: number;
  /** Pastki tab menyu ustida bo'lsa — 0 (xavfsiz zona tab menyuda) */
  bottomInset?: number;
}) {
  const safe = useSafeAreaInsets();
  const insets = { bottom: bottomInset ?? safe.bottom };
  const spring = useBottomSheetSpringConfigs({ damping: 16, stiffness: 160, mass: 0.9, overshootClamping: false });
  const peekH = peek + HANDLE + insets.bottom;
  const fullH = useRef(0);
  const index = useRef(1);

  const report = () => {
    const h = index.current === 0 ? peekH : fullH.current;
    if (h > 0) onHeight?.(h);
  };

  return (
    <BottomSheet
      index={1}
      snapPoints={[peekH]}
      enableDynamicSizing
      animateOnMount
      animationConfigs={spring}
      enablePanDownToClose={false}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={(i) => {
        if (i < 0) return;
        if (i === 0) Keyboard.dismiss();
        index.current = i;
        report();
      }}
      backgroundStyle={styles.bg}
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

const styles = StyleSheet.create({
  bg: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.handle },
  content: { paddingHorizontal: 16, paddingTop: 4, gap: 16 },
});
