import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassBg } from '@/components/ui/Glass';
import { colors, radius, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useWide } from '@/lib/useLayout';

const TOP_R = { tl: radius.sheet, tr: radius.sheet, bl: 0, br: 0 };

/** Oyna ustidagi panel: telefonda pastdan chiqadi, kompyuterda — ekran o'rtasidagi oyna */
export function ModalSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  useScheme();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  return (
    <Modal visible={visible} transparent animationType={wide ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={[styles.wrap, wide && styles.wrapWide]}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, wide ? styles.dialog : { paddingBottom: insets.bottom + 16 }]}>
          <GlassBg radius={wide ? radius.sheet : TOP_R} strong />
          {!wide ? <View style={styles.handle} /> : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() => ({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  wrapWide: { justifyContent: 'center', alignItems: 'center', padding: 24 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.backdrop },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 20, gap: 12 },
  dialog: { width: '100%', maxWidth: 480, borderRadius: radius.sheet, padding: 24, overflow: 'hidden' },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.handle, alignSelf: 'center', marginBottom: 4 },
}));
