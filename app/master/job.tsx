import { router } from 'expo-router';
import { MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { Sheet, SheetInput } from '@/components/sheets/Sheet';
import { Button, Card, Divider, IconButton, Row, Text } from '@/components/ui';
import { feePercent, platformCut } from '@/constants/billing';
import { getCategory } from '@/constants/categories';
import { colors, fonts, shadow, themed, useScheme } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { bboxCorners, distanceKm, type LatLng } from '@/lib/geo';
import { estimateEtaMin, remainingEtaMin, useRoute } from '@/lib/routes';
import { useWatchLocation } from '@/lib/useWatchLocation';
import { mockMasterSelf } from '@/mocks';
import { CancelSheet, MASTER_REASONS } from '@/components/sheets/CancelSheet';
import { DISPATCH } from '@/constants/dispatch';
import { useChats, useMaster, useMasterWork, useUser, type MasterOrder } from '@/store';
import { GlassBg } from '@/components/ui/Glass';

type Step = 'on_the_way' | 'arrived' | 'in_progress' | 'finishing' | 'completed';
const STEPS: Step[] = ['on_the_way', 'arrived', 'in_progress', 'completed'];

export default function Job() {
  useScheme();
  const job = useMasterWork((s) => s.job);
  useEffect(() => {
    if (!job) router.replace('/master');
  }, [job]);
  return job ? <JobView job={job} /> : null;
}

function JobView({ job }: { job: MasterOrder }) {
  useScheme();
  const insets = useSafeAreaInsets();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const { charge, addIncome, bumpActivity } = useMaster();
  const [cancelling, setCancelling] = useState(false);
  const finishJob = useMasterWork((s) => s.finishJob);
  const ensureChat = useChats((s) => s.ensure);
  const chatId = `job-${job.id}`;
  const [step, setStep] = useState<Step>('on_the_way');
  const [sheetH, setSheetH] = useState(360);
  const [work, setWork] = useState('70000');
  const [parts, setParts] = useState('45000');
  const cat = getCategory(job.categoryId);
  const fee = cat.callFee;

  // Usta belgisi — telefonning JONLI joylashuvi: usta yursa yuradi, tursa turadi (soxta harakat yo'q)
  const live = useWatchLocation();
  const [start, setStart] = useState<LatLng | null>(null);
  useEffect(() => {
    if (live && !start) setStart(live);
  }, [live, start]);
  const origin0 = start ?? mockMasterSelf.location;
  const here = live ?? origin0;
  const client = job.location;

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
  // Yo'l kelguncha chiziq chizilmaydi (to'g'ri chiziq ko'chadan chiqib ketgandek ko'rinadi)
  const remaining = useMemo(() => (route ? [here, ...route.path.slice(nearest + 1)] : null), [route, nearest, here]);
  const eta = route && remaining ? remainingEtaMin(route, remaining) : estimateEtaMin(here, client);
  const fitKey = Math.floor(nearest / 6);
  const fitTo = useMemo(() => bboxCorners([...(remaining ?? [here]), client]), [fitKey, route]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = fee + (Number(work) || 0) + (Number(parts) || 0);
  const verified = useMaster((s) => s.verified);
  const pct = feePercent(plan, verified);
  const cut = platformCut(plan, total, verified);
  const stepIndex = STEPS.indexOf(step === 'finishing' ? 'in_progress' : step);

  return (
    <View style={styles.root}>
      <MapBase
        center={client}
        insets={{ top: insets.top + 80, bottom: sheetH }}
        route={step === 'on_the_way' && remaining ? remaining : undefined}
        master={here}
        moveDuration={1000}
        accent={cat.main}
        clientMarker={client}
        fitTo={step === 'on_the_way' ? fitTo : [client]}
      />

      <View style={[styles.steps, shadow.float, { top: insets.top + 12 }]}>
        <GlassBg radius={16} />
        {(['stepOnWay', 'stepArrived', 'stepWork', 'stepDone'] as const).map((k, n) => (
          <View key={k} style={styles.stepItem}>
            <View style={[styles.stepBar, { backgroundColor: n <= stepIndex ? colors.primary : colors.line }]} />
            <Text style={[styles.stepText, n === stepIndex && { color: colors.primary, fontFamily: fonts.heavy }]}>{t(`job.${k}`)}</Text>
          </View>
        ))}
      </View>

      <Sheet onHeight={setSheetH} top={insets.top + 80}>
        <View style={styles.client}>
          <View style={styles.flex}>
            <Text variant="caption">{t('job.client')}</Text>
            <Text variant="h3">
              {job.clientName} · {t(`problems.${job.problemId}`)}
            </Text>
            <View style={styles.addr}>
              <MapPin size={14} color={colors.accent} strokeWidth={2.4} />
              <Text variant="small" numberOfLines={1}>
                {job.address}
                {step === 'on_the_way' ? ` · ${t('common.min', { value: eta })}` : ''}
              </Text>
            </View>
          </View>
          <IconButton
            icon={MessageCircle}
            label={t('job.chatClient')}
            onPress={() => {
              ensureChat({ id: chatId, title: `${job.clientName} · ${t(`problems.${job.problemId}`)}`, subtitle: job.address, kind: 'client' });
              router.push(`/master/chat/${chatId}`);
            }}
          />
          <IconButton icon={Phone} label={t('job.callClient')} onPress={() => Linking.openURL(`tel:${job.clientPhone.replace(/\s/g, '')}`)} />
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
            {pct ? (
              <>
                <Row label={`${t('job.platformCut')} (${pct}%)`} value={`− ${formatSum(cut)}`} />
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
              addIncome(total - cut);
              setStep('completed');
            }} /> : null}
        {step === 'completed' ? <Button title={t('common.continue')} big onPress={finishJob} /> : null}
        {step === 'on_the_way' || step === 'arrived' ? (
          <Button title={t('cancel.masterBtn')} kind="secondary" onPress={() => setCancelling(true)} />
        ) : null}
      </Sheet>

      {/* Usta bekor qilsa — aktivlik −10 (TZ, 7-bo'lim); 5-bosqichda buyurtma keyingi ustaga qaytadi */}
      <CancelSheet
        visible={cancelling}
        reasons={MASTER_REASONS}
        warning={t('cancel.masterWarning', { n: Math.abs(DISPATCH.activity.cancelled) })}
        onClose={() => setCancelling(false)}
        onConfirm={() => {
          setCancelling(false);
          bumpActivity(DISPATCH.activity.cancelled);
          finishJob();
        }}
      />
    </View>
  );
}

function PriceInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  useScheme();
  return (
    <View style={styles.price}>
      <Text variant="small" style={styles.flex}>
        {label}
      </Text>
      <SheetInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, ''))}
        keyboardType="number-pad"
        style={styles.priceInput}
      />
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  steps: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 6, borderRadius: 16, padding: 10 },
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
}));

