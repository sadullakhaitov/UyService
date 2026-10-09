// Admin kirishi: telefon raqami → SMS kod → admin huquqi tekshiriladi.
// Server ulangan bo'lsa — Supabase Auth (profiles.role = 'admin'); sinov rejimida — kompaniya raqami, istalgan 6 xonali kod.
// 5 marta noto'g'ri kod — 60 soniya kutish.
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { ArrowLeft, KeyRound, LockKeyhole, Phone, ShieldCheck } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AButton } from '@/components/admin/kit';
import { fmtPhone } from '@/components/admin/format';
import { ErrorText } from '@/components/admin/Dialog';
import { Logo } from '@/components/ui/Logo';
import { Text } from '@/components/ui/Text';
import { colors, fonts, isDark, themed, useScheme } from '@/constants/theme';
import { adminApi } from '@/lib/admin';
import { DEMO_ADMIN_PHONE } from '@/lib/admin/demo';
import { normalizePhone } from '@/lib/admin/rules';
import { useAdminSession } from '@/lib/admin/session';
import { adminErrorText } from '@/lib/admin/hooks';
import { noChannel, sendCode, signOut, verifyCode } from '@/lib/auth';
import { DEMO } from '@/lib/demo';
import { t } from '@/lib/i18n';

const MAX_TRIES = 5;
const LOCK_MS = 60_000;

export default function AdminLogin() {
  useScheme();
  const insets = useSafeAreaInsets();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tries = useRef(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const codeRef = useRef<TextInput>(null);

  useEffect(() => {
    if (lockedUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);
  const lockLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));

  const e164 = normalizePhone(phone);
  const submitPhone = async () => {
    if (!e164 || busy) return setError(e164 ? null : t('admin.errors.phone'));
    setBusy(true);
    setError(null);
    const r = await sendCode(fmtPhone(e164));
    setBusy(false);
    if (!r.ok) return setError(t(noChannel(r) ? 'auth.noChannel' : 'auth.sendFailed'));
    setStep('code');
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const submitCode = async () => {
    if (code.length !== 6 || busy || lockLeft || !e164) return;
    setBusy(true);
    setError(null);
    const r = await verifyCode(fmtPhone(e164), code);
    if (!r.ok) {
      setBusy(false);
      tries.current += 1;
      if (tries.current >= MAX_TRIES) {
        tries.current = 0;
        setLockedUntil(Date.now() + LOCK_MS);
        setNow(Date.now());
      }
      setCode('');
      return setError(t('admin.login.wrongCode'));
    }
    // Admin huquqi bormi — server (yoki sinov rejimi) tekshiradi
    useAdminSession.getState().signIn(e164);
    try {
      const me = await adminApi.me();
      if (!me) throw new Error('not_admin');
      router.replace((typeof next === 'string' && next.startsWith('/admin') && !next.startsWith('/admin/login') ? next : '/admin') as Href);
    } catch (e) {
      useAdminSession.getState().clear();
      await signOut().catch(() => {});
      setBusy(false);
      setStep('phone');
      setCode('');
      setError(e instanceof Error && e.message === 'not_admin' ? t('admin.login.notAdmin') : adminErrorText(e));
    }
  };

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.blob, styles.blobA]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobB]} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.head}>
              <Logo size={20} />
              <View style={styles.lock}>
                <ShieldCheck size={22} color={colors.primary} strokeWidth={2.2} />
              </View>
              <Text style={styles.title} accessibilityRole="header">
                {t('admin.login.title')}
              </Text>
              <Text variant="small" style={styles.centerText}>
                {step === 'phone' ? t('admin.login.phoneHint') : t('admin.login.codeHint', { phone: fmtPhone(e164) })}
              </Text>
            </View>

            {step === 'phone' ? (
              <View style={styles.form}>
                <View style={styles.inputRow}>
                  <Phone size={18} color={colors.muted} strokeWidth={2.2} />
                  <TextInput
                    value={phone}
                    onChangeText={(v) => {
                      setPhone(v);
                      setError(null);
                    }}
                    placeholder="+998 90 123 45 67"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    accessibilityLabel={t('admin.login.phone')}
                    autoFocus={Platform.OS === 'web'}
                    onSubmitEditing={submitPhone}
                    style={styles.input}
                  />
                </View>
                <AButton title={t('auth.getCode')} kind="primary" icon={KeyRound} loading={busy} disabled={!e164} onPress={submitPhone} style={styles.big} />
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.inputRow}>
                  <LockKeyhole size={18} color={colors.muted} strokeWidth={2.2} />
                  <TextInput
                    ref={codeRef}
                    value={code}
                    onChangeText={(v) => {
                      setCode(v.replace(/\D/g, '').slice(0, 6));
                      setError(null);
                    }}
                    placeholder="••••••"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    accessibilityLabel={t('admin.login.code')}
                    onSubmitEditing={submitCode}
                    editable={!lockLeft}
                    style={[styles.input, styles.code]}
                  />
                </View>
                <AButton
                  title={lockLeft ? t('admin.login.locked', { s: lockLeft }) : t('admin.login.enter')}
                  kind="primary"
                  loading={busy}
                  disabled={code.length !== 6 || !!lockLeft}
                  onPress={submitCode}
                  style={styles.big}
                />
                <AButton
                  title={t('admin.login.changePhone')}
                  kind="ghost"
                  icon={ArrowLeft}
                  onPress={() => {
                    setStep('phone');
                    setCode('');
                    setError(null);
                  }}
                />
              </View>
            )}
            {error ? <ErrorText text={error} /> : null}
            {DEMO ? (
              <View style={styles.demo}>
                <Text style={styles.demoTitle}>{t('admin.login.demoTitle')}</Text>
                <Text variant="small">{t('admin.login.demoText', { phone: fmtPhone(DEMO_ADMIN_PHONE) })}</Text>
                {step === 'phone' ? <AButton size="sm" title={t('admin.login.demoFill')} kind="secondary" onPress={() => setPhone(fmtPhone(DEMO_ADMIN_PHONE))} style={styles.self} /> : null}
              </View>
            ) : null}
          </View>
          <AButton title={t('admin.login.toApp')} kind="ghost" size="sm" onPress={() => router.replace('/')} style={styles.self} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.webBackdrop, overflow: 'hidden' },
  flex: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobA: { width: 560, height: 560, left: -200, top: -220, backgroundColor: colors.primary, opacity: isDark() ? 0.2 : 0.08 },
  blobB: { width: 460, height: 460, right: -160, bottom: -200, backgroundColor: colors.accent, opacity: isDark() ? 0.14 : 0.08 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, gap: 14 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    gap: 18,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: isDark() ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(11,42,36,0.12)',
  },
  head: { alignItems: 'center', gap: 10 },
  lock: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  title: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 28, color: colors.ink },
  centerText: { textAlign: 'center' },
  form: { gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.field, paddingHorizontal: 14 },
  input: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  code: { letterSpacing: 6 },
  big: { height: 48 },
  demo: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: colors.accentSoft },
  demoTitle: { fontFamily: fonts.heavy, fontSize: 13, lineHeight: 18, color: colors.accentInk },
  self: { alignSelf: 'center' },
}));
