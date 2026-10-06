import { router } from 'expo-router';
import { MapPin, Phone } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { MOVE_INTERVAL_MS } from '@/components/map/types';
import { Sheet } from '@/components/sheets/Sheet';
import { Button, Card, Divider, IconButton, Row, Text } from '@/components/ui';
import { BILLING, platformCut } from '@/constants/billing';
import { getCategory } from '@/constants/categories';
import { colors, fonts, shadow } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { routeLengthKm } from '@/lib/routes';
import { mockClient, mockOffer, mockRoute } from '@/mocks';
import { useUser } from '@/store';

type Step = 'on_the_way' | 'arrived' | 'in_progress' | 'finishing' | 'completed';
const STEPS: Step[] = ['on_the_way', 'arrived', 'in_progress', 'completed'];

export default function Job() {
  const insets = useSafeAreaInsets();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const [step, setStep] = useState<Step>('on_the_way');
  const [i, setI] = useState(0);
  const [sheetH, setSheetH] = useState(360);
  const [work, setWork] = useState('70000');
  const [parts, setParts] = useState('45000');
  const fee = getCategory(mockOffer.categoryId).callFee;

  // Soxta GPS: har 5 s da keyingi nuqta (haqiqiyda master_locations jadvaliga yoziladi)
  useEffect(() => {
    if (step !== 'on_the_way') return;
    const id = setInterval(() => setI((x) => Math.min(x + 1, mockRoute.length - 1)), MOVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [step]);

  const total = fee + (Number(work) || 0) + (Number(parts) || 0);
  const cut = platformCut(plan, total);
  const eta = Math.max(1, Math.round((routeLengthKm(mockRoute.slice(i)) / 22) * 60));
  const stepIndex = STEPS.indexOf(step === 'finishing' ? 'in_progress' : step);

  return (
    <View style={styles.root}>
      <MapBase
        center={mockClient.location}
        insets={{ top: insets.top + 80, bottom: sheetH }}
        route={step === 'on_the_way' ? mockRoute.slice(i) : undefined}
        master={step === 'on_the_way' ? mockRoute[i] : mockClient.location}
        clientMarker={mockClient.location}
        fitTo={step === 'on_the_way' ? [mockRoute[0], mockClient.location] : [mockClient.location]}
      />

      <View style={[styles.steps, shadow.float, { top: insets.top + 12 }]}>
        {(['stepOnWay', 'stepArrived', 'stepWork', 'stepDone'] as const).map((k, n) => (
          <View key={k} style={styles.stepItem}>
            <View style={[styles.stepBar, { backgroundColor: n <= stepIndex ? colors.primary : colors.line }]} />
            <Text style={[styles.stepText, n === stepIndex && { color: colors.primary, fontFamily: fonts.heavy }]}>{t(`job.${k}`)}</Text>
          </View>
        ))}
      </View>

      <Sheet onHeight={setSheetH}>
        <View style={styles.client}>
          <View style={styles.flex}>
            <Text variant="caption">{t('job.client')}</Text>
            <Text variant="h3">
              {mockClient.name} · {t(`problems.${mockOffer.problemId}`)}
            </Text>
            <View style={styles.addr}>
              <MapPin size={14} color={colors.accent} strokeWidth={2.4} />
              <Text variant="small" numberOfLines={1}>
                {mockOffer.address}
                {step === 'on_the_way' ? ` · ${t('common.min', { value: eta })}` : ''}
              </Text>
            </View>
          </View>
          <IconButton icon={Phone} label={t('job.callClient')} onPress={() => Linking.openURL(`tel:${mockClient.phone.replace(/\s/g, '')}`)} />
        </View>

        {step === 'finishing' || step === 'completed' ? (
          <Card tone="muted">
            {step === 'finishing' ? (
              <>
                <PriceInput label={t('job.finalPrice')} value={work} onChange={setWork} />
                <PriceInput label={t('job.partsPrice')} value={parts} onChange={setParts} />
                <Divider />
              </>
            ) : null}
            <Row label={t('rate.callFee')} value={formatSum(fee)} />
            <Row label={t('rate.total')} value={formatSum(total)} strong />
            {BILLING[plan].commissionPercent ? (
              <>
                <Row label={`${t('job.platformCut')} (${BILLING[plan].commissionPercent}%)`} value={`− ${formatSum(cut)}`} />
                <Row label={t('job.yourIncome')} value={formatSum(total - cut)} />
              </>
            ) : null}
          </Card>
        ) : null}

        {step === 'on_the_way' ? <Button title={t('job.arrivedBtn')} big onPress={() => setStep('arrived')} /> : null}
        {step === 'arrived' ? <Button title={t('job.startBtn')} big onPress={() => setStep('in_progress')} /> : null}
        {step === 'in_progress' ? <Button title={t('job.finishBtn')} big onPress={() => setStep('finishing')} /> : null}
        {step === 'finishing' ? <Button title={t('job.confirm')} big onPress={() => setStep('completed')} /> : null}
        {step === 'completed' ? <Button title={t('common.continue')} big onPress={() => router.replace('/master')} /> : null}
      </Sheet>
    </View>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.price}>
      <Text variant="small" style={styles.flex}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        style={styles.priceInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  steps: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 6, backgroundColor: colors.surface, borderRadius: 16, padding: 10 },
  stepItem: { flex: 1, gap: 6 },
  stepBar: { height: 4, borderRadius: 2 },
  stepText: { fontFamily: fonts.medium, fontSize: 11, color: colors.ink2 },
  client: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priceInput: {
    width: 130,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    textAlign: 'right',
    fontFamily: fonts.heavy,
    fontSize: 16,
    color: colors.ink,
  },
});

