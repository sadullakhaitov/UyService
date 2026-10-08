import { CircleCheck, Ticket } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ScreenHeader, Text } from '@/components/ui';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { LIVE, liveRedeemPromo } from '@/lib/live';
import { useMaster } from '@/store';

// Sinov rejimidagi promokodlar. Server rejimida kodlarni admin yaratadi (admin → Narxlar va katalog → Promokodlar),
// tekshirish va bonus — serverda (redeem_promo)
const CODES: Record<string, { priority?: number; bonus?: number }> = {
  UYSERVICE: { priority: 10 },
  BIRINCHI: { bonus: 20_000 },
  USTA2026: { priority: 5, bonus: 10_000 },
};

export default function Promo() {
  useScheme();
  const { usedPromos, addPriority, charge } = useMaster();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [busy, setBusy] = useState(false);
  const done = (c: string, p: { priority?: number; bonus?: number }) => {
    const parts = [p.priority ? t('promo.gotPriority', { n: p.priority }) : null, p.bonus ? t('promo.gotBonus', { sum: formatSum(p.bonus) }) : null];
    setResult({ ok: true, text: parts.filter(Boolean).join(' · ') });
    setCode('');
  };
  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (LIVE) {
      if (busy) return;
      setBusy(true);
      try {
        const p = await liveRedeemPromo(c);
        addPriority(0, c); // faqat "Ishlatilgan" ro'yxati uchun; prioritet va balans serverdan (syncMaster)
        done(c, p);
      } catch (e) {
        const k = (e as Error).message;
        setResult({ ok: false, text: t(k === 'used' ? 'promo.used' : k === 'expired' ? 'promo.expired' : 'promo.invalid') });
      } finally {
        setBusy(false);
      }
      return;
    }
    const p = CODES[c];
    if (!p) return setResult({ ok: false, text: t('promo.invalid') });
    if (usedPromos.includes(c)) return setResult({ ok: false, text: t('promo.used') });
    addPriority(p.priority ?? 0, c);
    if (p.bonus) charge(-p.bonus); // balansga bonus
    done(c, p);
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('profile.promo')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Ticket size={36} color={colors.accent} strokeWidth={2} />
            <Text variant="small" style={styles.center}>
              {t('promo.hint')}
            </Text>
          </View>
          <TextInput
            value={code}
            onChangeText={(v) => {
              setCode(v.toUpperCase());
              setResult(null);
            }}
            placeholder={t('promo.placeholder')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('promo.placeholder')}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.input}
            onSubmitEditing={apply}
          />
          {result ? (
            <View style={[styles.result, { backgroundColor: result.ok ? colors.primarySoft : colors.dangerSoft }]}>
              {result.ok ? <CircleCheck size={20} color={colors.primary} strokeWidth={2.4} /> : null}
              <Text style={[styles.resultText, { color: result.ok ? colors.primary : colors.danger }]}>{result.text}</Text>
            </View>
          ) : null}
          {usedPromos.length ? (
            <Text variant="caption">
              {t('promo.history')}: {usedPromos.join(', ')}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bottom}>
        <Button title={t('promo.apply')} big disabled={code.trim().length < 3} loading={busy} onPress={apply} />
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 14 },
  hero: { alignItems: 'center', gap: 10, padding: 20, borderRadius: radius.card, backgroundColor: colors.accentSoft },
  center: { textAlign: 'center', color: colors.accentInk },
  input: {
    height: 58,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontFamily: fonts.heavy,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.ink,
    textAlign: 'center',
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.card },
  resultText: { flex: 1, fontFamily: fonts.bold, fontSize: 15 },
  bottom: { padding: 16 },
}));
