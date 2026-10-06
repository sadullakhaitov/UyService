import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { AuthShell } from '@/components/ui/AuthShell';
import { Button, Text } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useUser } from '@/store';

// 90 123 45 67
const format = (digits: string) =>
  [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 7), digits.slice(7, 9)].filter(Boolean).join(' ');

export default function PhoneScreen() {
  const [digits, setDigits] = useState('');
  const [focused, setFocused] = useState(false);
  const setPhone = useUser((s) => s.setPhone);
  const ready = digits.length === 9;

  const submit = () => {
    if (!ready) return;
    setPhone(`+998 ${format(digits)}`);
    router.push('/code');
  };

  return (
    <AuthShell
      footer={
        <>
          <Button title={t('auth.getCode')} big disabled={!ready} onPress={submit} />
          <Text variant="caption" style={styles.terms}>
            {t('auth.terms')}
          </Text>
        </>
      }
    >
      <View style={styles.head}>
        <Text variant="h1">{t('auth.phoneTitle')}</Text>
        <Text variant="small">{t('auth.phoneHint')}</Text>
      </View>
      <View style={[styles.field, focused && styles.fieldFocus]}>
        <Text style={styles.prefix}>+998</Text>
        <View style={styles.sep} />
        <TextInput
          accessibilityLabel={t('auth.phoneLabel')}
          autoFocus
          keyboardType="phone-pad"
          placeholder="90 123 45 67"
          placeholderTextColor={colors.muted}
          value={format(digits)}
          onChangeText={(v) => setDigits(v.replace(/\D/g, '').slice(0, 9))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
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
  input: { flex: 1, fontFamily: fonts.bold, fontSize: 18, color: colors.ink, letterSpacing: 0.5, height: '100%' },
  terms: { textAlign: 'center' },
});
