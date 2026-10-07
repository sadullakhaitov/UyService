// Admin panel oynalari: tasdiqlash, sabab bilan amal (rad etish, bloklash, bekor qilish).
// Xato bo'lsa oyna yopilmaydi — xato matni ichida ko'rinadi. Esc / fon bosilsa — yopiladi.
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, isDark, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { RULES } from '@/lib/admin/rules';
import { AButton, Field, Pill } from './kit';

export function Dialog({
  visible,
  onClose,
  title,
  text,
  children,
  footer,
  width = 480,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  useScheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('common.close')} accessibilityRole="button" />
        <View style={[styles.card, { maxWidth: width }]} accessibilityViewIsModal accessibilityRole="alert">
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>{title}</Text>
            {text ? <Text variant="small">{text}</Text> : null}
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Oddiy tasdiqlash */
export function ConfirmDialog({
  visible,
  onClose,
  title,
  text,
  confirmLabel,
  danger,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  confirmLabel: string;
  danger?: boolean;
  /** Xato bo'lsa — matni qaytadi va oyna ochiq qoladi */
  onConfirm: () => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) setError(null);
  }, [visible]);
  const go = async () => {
    setBusy(true);
    const err = await onConfirm();
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      text={text}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton title={confirmLabel} kind={danger ? 'dangerSolid' : 'primary'} loading={busy} onPress={go} />
        </>
      }
    >
      {error ? <ErrorText text={error} /> : null}
    </Dialog>
  );
}

/** Sabab yozib bajariladigan amal (tayyor sabablar + o'z matni) */
export function ReasonDialog({
  visible,
  onClose,
  title,
  text,
  confirmLabel,
  danger,
  presets = [],
  required = true,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  confirmLabel: string;
  danger?: boolean;
  presets?: string[];
  required?: boolean;
  onSubmit: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setReason('');
      setError(null);
    }
  }, [visible]);
  const ok = !required || reason.trim().length >= 3;
  const go = async () => {
    if (!ok) return setError(t('admin.errors.reasonRequired'));
    setBusy(true);
    const err = await onSubmit(reason.trim());
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={title}
      text={text}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton title={confirmLabel} kind={danger ? 'dangerSolid' : 'primary'} loading={busy} disabled={!ok} onPress={go} />
        </>
      }
    >
      {presets.length ? (
        <View style={styles.presets}>
          {presets.map((p) => (
            <Pill key={p} label={p} active={reason === p} onPress={() => setReason(p)} />
          ))}
        </View>
      ) : null}
      <Field
        label={t('admin.common.reason')}
        value={reason}
        onChangeText={(v) => {
          setReason(v);
          setError(null);
        }}
        placeholder={t('admin.common.reasonPlaceholder')}
        multiline
        maxLength={RULES.reasonMax}
        autoFocus={Platform.OS === 'web'}
      />
      {error ? <ErrorText text={error} /> : null}
    </Dialog>
  );
}

export function ErrorText({ text }: { text: string }) {
  useScheme();
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text variant="small" style={{ color: colors.danger }}>
        {text}
      </Text>
    </View>
  );
}

const styles = themed(() => ({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.backdrop, cursor: 'auto' },
  card: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 22,
    overflow: 'hidden',
    boxShadow: isDark() ? '0 20px 60px rgba(0,0,0,0.6)' : '0 20px 60px rgba(11,42,36,0.22)',
  },
  body: { padding: 22, gap: 14 },
  title: { fontFamily: fonts.heavy, fontSize: 19, lineHeight: 25, color: colors.ink },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, paddingHorizontal: 22, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.line, flexWrap: 'wrap' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { padding: 12, borderRadius: 12, backgroundColor: colors.dangerSoft },
}));
