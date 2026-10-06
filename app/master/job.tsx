import { router } from 'expo-router';
import { MapPin, Phone } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { Button, Card, Divider, IconButton, Row, Text } from '@/components/ui';
import { BILLING, platformCut } from '@/constants/billing';
import { getCategory } from '@/constants/categories';
import { colors, fonts, shadow } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { bboxCorners, distanceKm, type LatLng } from '@/lib/geo';
import { remainingEtaMin, useRoute } from '@/lib/routes';
import { useWatchLocation } from '@/lib/useWatchLocation';
import { mockClient, mockMasters, mockOffer } from '@/mocks';
import { useMaster, useUser } from '@/store';

type Step = 'on_the_way' | 'arrived' | 'in_progress' | 'finishing' | 'completed';
const STEPS: Step[] = ['on_the_way', 'arrived', 'in_progress', 'completed'];

export default function Job() {
  const insets = useSafeAreaInsets();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const charge = useMaster((s) => s.charge);
  const [step, setStep] = useState<Step>('on_the_way');
  const [sheetH, setSheetH] = useState(360);
  const [work, setWork] = useState('70000');
  const [parts, setParts] = useState('45000');
  const fee = getCategory(mockOffer.categoryId).callFee;
  const cat = getCategory(mockOffer.categoryId);

  // Usta belgisi — telefonning JONLI joylashuvi: usta yursa yuradi, tursa turadi (soxta harakat yo'q)
  const live = useWatchLocation();
  const [start, setStart] = useState<LatLng | null>(null);
  useEffect(() => {
    if (live && !start) setStart(live);
  }, [live, start]);
  const origin0 = start ?? mockMasters[0].location;
  const here = live ?? origin0;
  // Soxta mijoz — ustaning birinchi joyidan ~1,5 km narida (5-bosqichda haqiqiy buyurtma manzili)
  const client = useMemo(
    () => ({
      latitude: origin0.latitude + (mockClient.location.latitude - mockMasters[0].location.latitude),
      longitude: origin0.longitude + (mockClient.location.longitude - mockMasters[0].location.longitude),
    }),
    [origin0.latitude, origin0.longitude], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Yo'l: usta 150 m dan ko'p siljisa yoki yo'ldan chiqsa — yangi joydan qayta hisoblanadi
  const [routeFrom, setRouteFrom] = useState<LatLng>(origin0);
  useEffect(() => {
    if (distanceKm(routeFrom, here) > 0.15) setRouteFrom(here);
  }, [here.latitude, here.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setRouteFrom(origin0), [origin0.latitude, origin0.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  const route = useRoute(routeFrom, client);

  // Qolgan yo'l: ustaga eng yaqin nuqtadan mijozgacha
  const nearest = useMemo(() => {
    if (!route) return 0;
    let best = 0;
    let bestD = Infinity;
    route.path.forEach((p, k) => {
      const d = distanceKm(p, here);
      if (d < bestD) {
        bestD = d;
        best = k;
      }
    });
    return best;
  }, [route, here.latitude, here.longitude]); // eslint-disable-line react-hooks/exhaustive-deps
  const remaining = useMemo(() => (route ? [here, ...route.path.slice(nearest + 1)] : [here, client]), [route, nearest, here, client]);
  const eta = route ? remainingEtaMin(route, remaining) : 1;
  const fitKey = Math.floor(nearest / 6);
  const fitTo = useMemo(() => bboxCorners([...remaining, client]), [fitKey, route]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = fee + (Number(work) || 0) + (Number(parts) || 0);
  const cut = platformCut(plan, total);
  const stepIndex = STEPS.indexOf(step === 'finishing' ? 'in_progress' : step);

  return (
    <View style={styles.root}>
      <MapBase
        center={client}
        insets={{ top: insets.top + 80, bottom: sheetH }}
        route={step === 'on_the_way' ? remaining : undefined}
        master={here}
        moveDuration={1000}
        accent={cat.main}
        clientMarker={client}
        fitTo={step === 'on_the_way' ? fitTo : [client]}
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
        {step === 'finishing' ? <Button title={t('job.confirm')} big onPress={() => {
              if (cut) charge(cut); // komissiya balansdan yechiladi
              setStep('completed');
            }} /> : null}
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
      <BottomSheetTextInput
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

