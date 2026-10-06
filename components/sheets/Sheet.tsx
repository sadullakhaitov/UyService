import BottomSheet, { BottomSheetView, useBottomSheetSpringConfigs } from '@gorhom/bottom-sheet';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '@/constants/theme';

// Pastdan chiqadigan panel: yuqori burchaklari yumaloq, tepasida tortish chizig'i.
// Ochilganda prujina (spring) bilan sakrab chiqadi.
export function Sheet({ children, onHeight }: { children: ReactNode; onHeight?: (h: number) => void }) {
  const insets = useSafeAreaInsets();
  const spring = useBottomSheetSpringConfigs({ damping: 16, stiffness: 160, mass: 0.9, overshootClamping: false });
  return (
    <BottomSheet
      enableDynamicSizing
      animateOnMount
      animationConfigs={spring}
      enablePanDownToClose={false}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
      style={shadow.sheet}
    >
      <BottomSheetView
        style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}
        onLayout={(e) => onHeight?.(e.nativeEvent.layout.height + 24)}
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
