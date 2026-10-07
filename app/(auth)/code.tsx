import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AuthShell } from '@/components/ui/AuthShell';
import { Button, IconButton, Text } from '@/components/ui';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { sendCode, verifyCode } from '@/lib/auth';
import { afterSignIn } from '@/lib/afterSignIn';
import { t } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase';

const LEN = 6;

export default function CodeScreen() {
  useScheme();
  const { phone = '', next } = useLocalSearchParams<{ phone?: string; next?: string }>();
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(59);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<'auth.codeWrong' | 'auth.sendFailed' | null>(null);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  // Kod tekshiriladi: Supabase Auth (SMS — Eskiz.uz); sozlanmagan bo'lsa soxta — istalgan 6 xonali kod
  const verify = async (c = code) => {
    if (c.length !== LEN || checking) return;
    setChecking(true);
    setError(null);
    const res = await verifyCode(phone, c);
    setChecking(false);
    if (!res.ok) {
      setError('auth.codeWrong');
      setCode('');
      input.current?.focus();
      return;
    }
    afterSignIn(phone, next);
  };

  const resend = async () => {
    setLeft(59);
    setError(null);
    const res = await sendCode(phone);
    if (!res.ok) setError('auth.sendFailed');
  };

  return (
    <AuthShell compact footer={<Button title={t('common.continue')} big disabled={code.length < LEN} loading={checking} onPress={() => verify()} />}>
      <IconButton icon={ChevronLeft} label={t('common.back')} onPress={() => router.back()} />
      <View style={styles.head}>
        <Text variant="h1">{t('auth.codeTitle')}</Text>
        <Text variant="small">{t('auth.codeHint', { phone: phone || '+998' })}</Text>
      </View>

      <View style={styles.codeWrap}>
        <Pressable accessibilityLabel={t('auth.codeLabel')} onPress={() => input.current?.focus()} style={styles.boxes}>
          {Array.from({ length: LEN }, (_, i) => {
            const active = i === code.length;
            return (
              <View key={i} style={[styles.box, code[i] ? styles.boxFilled : null, active ? styles.boxActive : null]}>
                <Text style={styles.digit}>{code[i] ?? ''}</Text>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={input}
          autoFocus
          value={code}
          onChangeText={(v) => {
            const c = v.replace(/\D/g, '').slice(0, LEN);
            setCode(c);
            if (c) setError(null);
            if (c.length === LEN) verify(c);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={LEN}
          // Brauzerda ko'rinmas maydon kataklar ustida turadi — sichqoncha bilan bosish to'g'ridan-to'g'ri unga tushadi
          style={Platform.OS === 'web' ? styles.overlay : styles.hidden}
        />
      </View>

      {error ? (
        <Text variant="small" style={styles.error}>
          {t(error)}
        </Text>
      ) : null}

      <View style={styles.meta}>
        {left > 0 ? (
          <Text variant="small">{t('auth.resendIn', { sec: left })}</Text>
        ) : (
          <Pressable accessibilityRole="button" onPress={resend} hitSlop={10}>
            <Text style={styles.link}>{t('auth.resend')}</Text>
          </Pressable>
        )}
        {!isSupabaseConfigured ? (
          <Text variant="caption" style={styles.demo}>
            {t('auth.codeDemo')}
          </Text>
        ) : null}
      </View>
    </AuthShell>
  );
}

const styles = themed(() => ({
  head: { gap: 6 },
  boxes: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: { backgroundColor: colors.surface, borderColor: colors.primaryTint },
  boxActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  digit: { fontFamily: fonts.heavy, fontSize: 22, color: colors.ink },
  codeWrap: { position: 'relative' },
  hidden: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0, fontSize: 16 },
  meta: { gap: 8 },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  demo: { color: colors.accentInk },
  error: { color: colors.danger },
}));
