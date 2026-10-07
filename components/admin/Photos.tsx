// Hujjat va ish rasmlari: kichik ko'rinish, bosilsa — to'liq ekranda (yaqinlashtirib ko'rish uchun)
import { FileImage, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Modal, Platform, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';

// Telefonda <Image> SVG (sinov rejimidagi namunaviy hujjat) ko'rsata olmaydi — o'rniga belgi
const unsupported = (uri: string) => Platform.OS !== 'web' && uri.startsWith('data:image/svg');

export function PhotoThumb({ uri, label, w = 180, h = 120 }: { uri: string | null; label: string; w?: number; h?: number }) {
  useScheme();
  const [open, setOpen] = useState(false);
  if (!uri) {
    return (
      <View style={[styles.thumb, styles.missing, { width: w, height: h }]}>
        <FileImage size={22} color={colors.muted} strokeWidth={2} />
        <Text variant="caption" style={styles.center}>
          {t('admin.docs.missing', { what: label })}
        </Text>
      </View>
    );
  }
  return (
    <>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel={t('admin.docs.open', { what: label })} onPress={() => setOpen(true)} style={[styles.thumb, { width: w, height: h }]}>
        {unsupported(uri) ? (
          <View style={[styles.missing, { flex: 1 }]}>
            <FileImage size={22} color={colors.muted} strokeWidth={2} />
          </View>
        ) : (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        )}
        <View style={styles.cap}>
          <Text style={styles.capText} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.full} onPress={() => setOpen(false)} accessibilityLabel={t('common.close')}>
          {unsupported(uri) ? null : <Image source={{ uri }} style={{ width: '100%', height: '100%', maxWidth: 1100 }} resizeMode="contain" accessibilityIgnoresInvertColors />}
          <View style={styles.close}>
            <X size={22} color={colors.onPrimary} strokeWidth={2.4} />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = themed(() => ({
  thumb: { borderRadius: 14, overflow: 'hidden', backgroundColor: colors.field, borderWidth: 1, borderColor: colors.line, cursor: 'pointer' },
  missing: { alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderStyle: 'dashed', borderColor: colors.dashed },
  center: { textAlign: 'center' },
  cap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(11,42,36,0.6)' },
  capText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.onPrimary },
  full: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  close: { position: 'absolute', top: 24, right: 24, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
}));
