import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/track';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AuthShell } from '@/components/ui/AuthShell';
import { Button, IconButton, Text } from '@/components/ui';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { sendCode } from '@/lib/auth';
import { afterSignIn } from '@/lib/afterSignIn';
import { inTelegram, requestTelegramContact, telegramSignIn } from '@/lib/telegram';
import { t } from '@/lib/i18n';

// Brauzer: avtomatik to'ldirilganda maydon foni (colors.field) saqlanadi — app/_layout.tsx'dagi CSS
const WEB_FIELD = { dataSet: { autofill: 'field' } } as object;

// 90 123 45 67
const format = (digits: string) =>
  [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ');

// O'zbekiston mobil operatorlari kodlari (Beeline, Ucell, Uzmobile, Mobiuz, Humans, Perfectum, OQ)
const OPERATORS = ['20', '33', '50', '55', '77', '88', '90', '91', '93', '94', '95', '97', '98', '99'];

export default function PhoneScreen() {
  useScheme();
  const [digits, setDigits] = useState('');
  const [focused, setFocused] = useState(false);
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => track('phone_open', { next: next ?? '' }), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Ikki raqam yozilgach operator kodi tekshiriladi — noto'g'ri raqamga SMS yuborilmaydi
  const badCode = digits.length >= 2 && !OPERATORS.includes(digits.slice(0, 2));
  const ready = digits.length === 9 && !badCode;
  const input = useRef<TextInput>(null);

  // Telegram ichida: bir bosishda kirish — raqamni Telegram tasdiqlaydi (SMS kerak emas)
  const tgMode = inTelegram();
  const [tgBusy, setTgBusy] = useState(false);
  const [tgError, setTgError] = useState<'auth.tgDenied' | 'auth.tgNotUz' | 'auth.tgFailed' | null>(null);
  const telegramLogin = async () => {
    if (tgBusy) return;
    setTgBusy(true);
    setTgError(null);
    // Avval Telegram allaqachon bog'langanmi (raqam qayta so'ralmaydi), bo'lmasa — raqamni ulashish
    let r = await telegramSignIn();
    if (!r.ok && r.need === 'contact') {
      const contact = await requestTelegramContact();
      if (!contact) {
        setTgBusy(false);
        setTgError('auth.tgDenied');
        return;
      }
      r = await telegramSignIn(contact, 12_000);
    }
    setTgBusy(false);
    if (r.ok) afterSignIn(r.phone, next, r.name);
    else setTgError(r.error === 'phone_not_uz' ? 'auth.tgNotUz' : 'auth.tgFailed');
  };

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
      compact={Boolean(next) || tgMode}
      footer={
        <>
          {tgMode ? <Button title={t('auth.tgLogin')} big loading={tgBusy} onPress={telegramLogin} /> : null}
          <Button title={t('auth.getCode')} big={!tgMode} kind={tgMode ? 'secondary' : undefined} disabled={!ready} loading={sending} onPress={submit} />
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
          {next === 'order' ? t('auth.loginToOrder') : next === 'master' ? t('auth.loginToMaster') : next === 'support' ? t('auth.loginToSupport') : t('auth.phoneHint')}
        </Text>
      </View>
      {/* Maydonning istalgan joyiga bosilsa (+998 ustiga ham) — yozish boshlanadi */}
      <Pressable accessible={false} onPress={() => input.current?.focus()} style={[styles.field, focused && styles.fieldFocus, badCode && styles.fieldError]}>
        <Text style={styles.prefix}>+998</Text>
        <View style={styles.sep} />
        <TextInput
          ref={input}
          accessibilityLabel={t('auth.phoneLabel')}
          autoFocus={!tgMode}
          keyboardType="phone-pad"
          placeholder="90 123 45 67"
          placeholderTextColor={colors.muted}
          value={format(digits)}
          // Telefon/brauzer raqamni o'zi taklif qiladi; "+998 90 ..." ko'rinishida kelsa, 998 olib tashlanadi
          autoComplete="tel"
          textContentType="telephoneNumber"
          {...WEB_FIELD}
          onChangeText={(v) => {
            let d = v.replace(/\D/g, '');
            if (d.length > 9 && d.startsWith('998')) d = d.slice(3);
            setDigits(d.slice(0, 9));
            setFailed(false);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </Pressable>
      {badCode ? (
        <Text variant="small" style={styles.error}>
          {t('auth.badOperator')}
        </Text>
      ) : null}
      {tgMode ? (
        <Text variant="small" style={tgError ? styles.error : undefined}>
          {t(tgError ?? 'auth.tgHint')}
        </Text>
      ) : null}
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
  // Fokusda faqat hoshiya rangi o'zgaradi (fon bir xil — brauzer avtomatik to'ldirganda ham maydon toza ko'rinadi)
  fieldFocus: { borderColor: colors.primary },
  fieldError: { borderColor: colors.danger },
  prefix: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink },
  sep: { width: 1.5, height: 24, backgroundColor: colors.line },
  input: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.ink, letterSpacing: 0.5, height: '100%', minWidth: 0 },
  terms: { textAlign: 'center' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  error: { color: colors.danger },
}));
