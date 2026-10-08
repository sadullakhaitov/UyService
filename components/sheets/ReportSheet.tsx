import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Squish } from '@/components/ui/Pressable';
import { Text } from '@/components/ui/Text';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { notice } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { LIVE, liveReportOrder, type ReportKind } from '@/lib/live';
import { track } from '@/lib/track';
import { useChats } from '@/store';
import { ModalSheet } from './ModalSheet';

const PROBLEM_KINDS: ReportKind[] = ['overcharge', 'quality', 'no_show_master', 'other'];
/** Matn majburiy turlar (server ham tekshiradi) */
const NEEDS_TEXT: ReportKind[] = ['overcharge', 'quality', 'other'];

/**
 * Buyurtma bo'yicha murojaat: "Muammo bor" (narx, sifat, usta kelmadi, boshqa) yoki "Kafolat bo'yicha".
 * Server rejimida — report_order (admin "Murojaatlar"da ko'radi, javob qo'llab-quvvatlash chatiga keladi); sinovda — mahalliy chat.
 */
export function ReportSheet({ orderId, warranty, visible, onClose }: { orderId: string; warranty?: boolean; visible: boolean; onClose: () => void }) {
  useScheme();
  const [kind, setKind] = useState<ReportKind | null>(warranty ? 'warranty' : null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (visible) {
      setKind(warranty ? 'warranty' : null);
      setText('');
    }
  }, [visible, warranty]);

  const needText = kind != null && NEEDS_TEXT.includes(kind);
  const ready = kind != null && (!needText || text.trim().length >= 3);

  const submit = async () => {
    if (!kind || !ready || busy) return;
    setBusy(true);
    try {
      if (LIVE) await liveReportOrder(orderId, kind, text.trim());
      else {
        const chats = useChats.getState();
        chats.send('support', `${t(`report.kinds.${kind}`)} · #${orderId.slice(0, 8)}${text.trim() ? `\n${text.trim()}` : ''}`);
        setTimeout(() => chats.receive('support', t('chats.autoReply')), 1500);
      }
      track('report_sent', { kind });
      onClose();
      notice(t('report.sentTitle'), t(kind === 'warranty' ? 'report.sentWarranty' : 'report.sentText'));
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      const known = ['warranty_expired', 'text_required', 'too_many_open', 'already_open'].includes(code);
      notice(t('report.failedTitle'), known ? t(`report.errors.${code}`) : t('job.serverErrorText'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <Text variant="h2">{t(warranty ? 'report.warrantyTitle' : 'report.title')}</Text>
      <Text variant="small">{t(warranty ? 'report.warrantyHint' : 'report.hint')}</Text>
      {!warranty ? (
        <View style={styles.list}>
          {PROBLEM_KINDS.map((k) => {
            const on = k === kind;
            return (
              <Squish key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} scaleTo={0.98} onPress={() => setKind(k)} style={[styles.row, on && styles.rowOn]}>
                <Text style={styles.rowText}>{t(`report.kinds.${k}`)}</Text>
                <View style={[styles.radio, on && styles.radioOn]}>{on ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
              </Squish>
            );
          })}
        </View>
      ) : null}
      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        maxLength={1000}
        placeholder={t(warranty ? 'report.warrantyPlaceholder' : needText ? 'report.placeholderRequired' : 'report.placeholder')}
        placeholderTextColor={colors.muted}
        accessibilityLabel={t('report.title')}
        style={styles.input}
        textAlignVertical="top"
      />
      <Button title={t('report.send')} big disabled={!ready} loading={busy} onPress={submit} />
      <Button title={t('common.close')} kind="secondary" onPress={onClose} />
    </ModalSheet>
  );
}

const styles = themed(() => ({
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: colors.field, borderWidth: 1.5, borderColor: 'transparent' },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  input: {
    minHeight: 88,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.field,
    padding: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
}));
