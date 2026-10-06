import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { Squish } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { colors, fonts, radius, themed } from '@/constants/theme';
import { t } from '@/lib/i18n';

export const CLIENT_REASONS = ['changedMind', 'tooLong', 'foundOther', 'wrongAddress', 'other'] as const;
export const MASTER_REASONS = ['clientNoAnswer', 'tooFar', 'emergency', 'wrongProblem', 'other'] as const;

/** Bekor qilish: sababni tanlash (Yandex Go'dagidek). Sabab tarixga va 5-bosqichda orders.cancel_reason'ga yoziladi */
export function CancelSheet({
  visible,
  reasons,
  warning,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  reasons: readonly string[];
  warning?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | null>(null);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text variant="h2">{t('cancel.title')}</Text>
        {warning ? (
          <View style={styles.warn}>
            <Text variant="small" style={styles.warnText}>
              {warning}
            </Text>
          </View>
        ) : null}
        <View style={styles.list}>
          {reasons.map((r) => {
            const on = r === reason;
            return (
              <Squish key={r} accessibilityRole="radio" accessibilityState={{ selected: on }} scaleTo={0.98} onPress={() => setReason(r)} style={[styles.row, on && styles.rowOn]}>
                <Text style={styles.rowText}>{t(`cancel.reasons.${r}`)}</Text>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
              </Squish>
            );
          })}
        </View>
        <Button title={t('cancel.confirm')} kind="danger" big disabled={!reason} onPress={() => reason && onConfirm(reason)} />
        <Button title={t('cancel.keep')} kind="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = themed(() => ({
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, padding: 20, gap: 12 },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.handle, alignSelf: 'center', marginBottom: 4 },
  warn: { padding: 12, borderRadius: radius.card, backgroundColor: colors.accentSoft },
  warnText: { color: colors.accentInk },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.field, borderWidth: 1.5, borderColor: 'transparent' },
  rowOn: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  rowText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.danger, borderColor: colors.danger },
}));
