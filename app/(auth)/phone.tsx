import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AuthShell } from '@/components/ui/AuthShell';
import { Button, IconButton, Text } from '@/components/ui';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { sendCode } from '@/lib/auth';
import { t } from '@/lib/i18n';

// 90 123 45 67
const format = (digits: string) =>
  [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ');

export default function PhoneScreen() {
  useScheme();
  const [digits, setDigits] = useState('');
  const [focused, setFocused] = useState(false);
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const ready = digits.length === 9;
  const input = useRef<TextInput>(null);

  // SMS kod yuboriladi (Supabase sozlanmagan bo'lsa — soxta), keyin kod ekrani
  const submit = async () => {
    if (!ready || sending) return;
    setSending(true);
    setFailed(false);
    const phone = `+998 ${format(digits)}`;
    const res = await sendCode(phone);
    setSending(false);
    if (!res.ok) {
      setFailed(true);
      return;
    }
    router.push({ pathname: '/code', params: { phone, next: next ?? '' } });
  };

  return (
    <AuthShell
      compact={Boolean(next)}
      footer={
        <>
          <Button title={t('auth.getCode')} big disabled={!ready} loading={sending} onPress={submit} />
          <Text variant="caption" style={styles.terms}>
            {t('auth.termsBefore')}
            <Text variant="caption" style={styles.link} onPress={() => router.push('/legal/terms')}>
              {t('legal.terms')}
            </Text>
            {t('auth.termsAnd')}
            <Text variant="caption" style={styles.link} onPress={() => router.push('/legal/privacy')}>
              {t('legal.privacy')}
            </Text>
            {t('auth.termsAfter')}
          </Text>
        </>
      }
    >
      {router.canGoBack() ? <IconButton icon={ChevronLeft} label={t('common.back')} onPress={() => router.back()} /> : null}
      <View style={styles.head}>
        <Text variant="h1">{t('auth.phoneTitle')}</Text>
        <Text variant="small">
          {next === 'order' ? t('auth.loginToOrder') : next === 'master' ? t('auth.loginToMaster') : t('auth.phoneHint')}
        </Text>
      </View>
      {/* Maydonning istalgan joyiga bosilsa (+998 ustiga ham) — yozish boshlanadi */}
      <Pressable accessible={false} onPress={() => input.current?.focus()} style={[styles.field, focused && styles.fieldFocus]}>
        <Text style={styles.prefix}>+998</Text>
        <View style={styles.sep} />
        <TextInput
          ref={input}
          accessibilityLabel={t('auth.phoneLabel')}
          autoFocus
          keyboardType="phone-pad"
          placeholder="90 123 45 67"
          placeholderTextColor={colors.muted}
          value={format(digits)}
          onChangeText={(v) => {
            setDigits(v.replace(/\D/g, '').slice(0, 9));
            setFailed(false);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </Pressable>
      {failed ? (
        <Text variant="small" style={styles.error}>
          {t('auth.sendFailed')}
        </Text>
      ) : null}
    </AuthShell>
  );
}

const styles = themed(() => ({
  head: { gap: 6 },
  field: {
    height: 60,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.field,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  fieldFocus: { borderColor: colors.primary, backgroundColor: colors.surface },
  prefix: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink },
  sep: { width: 1.5, height: 24, backgroundColor: colors.line },
  input: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.ink, letterSpacing: 0.5, height: '100%', minWidth: 0 },
  terms: { textAlign: 'center' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  error: { color: colors.danger },
}));
