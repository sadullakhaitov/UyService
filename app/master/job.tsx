import { router } from 'expo-router';
import { MapPin, MessageCircle, Phone } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { Sheet, SheetInput } from '@/components/sheets/Sheet';
import { Button, Card, Divider, IconButton, Row, Text } from '@/components/ui';
import { CALL_FEE, getCategory } from '@/constants/categories';
import { colors, fonts, shadow, themed, useScheme } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { bboxCorners, distanceKm, type LatLng } from '@/lib/geo';
import { estimateEtaMin, remainingEtaMin, useRoute } from '@/lib/routes';
import { useWatchLocation } from '@/lib/useWatchLocation';
import { DEMO } from '@/lib/demo';
import { confirm, notice } from '@/lib/dialog';
import { mockMasterSelf } from '@/mocks';
import { CancelSheet, MASTER_REASONS } from '@/components/sheets/CancelSheet';
import { DISPATCH } from '@/constants/dispatch';
import { useChats, useMaster, useMasterWork, useUser, type JobStage, type MasterJob } from '@/store';
import { GlassBg } from '@/components/ui/Glass';

/** Bosqichlar yo'lagi: narx kelishish "Yetib keldi" bosqichining bir qismi */
const STEP_INDEX: Record<JobStage, number> = { on_the_way: 0, arrived: 1, pricing: 1, in_progress: 2, completed: 3 };
/** Narx chegaralari: ish narxi (chaqiruv ichida) kamida chaqiruv narxi; juda katta summa — qayta so'raladi */
const MAX_PRICE = 10_000_000;
const CONFIRM_ABOVE = 3_000_000;

export default function Job() {
  useScheme();
  const job = useMasterWork((s) => s.job);
  useEffect(() => {
    if (!job) router.replace('/master');
  }, [job]);
  return job ? <JobView job={job} /> : null;
}

function JobView({ job }: { job: MasterJob }) {
  useScheme();
  const insets = useSafeAreaInsets();
  const { charge, addIncome, bumpActivity } = useMaster();
  const [cancelling, setCancelling] = useState(false);
  const { finishJob, updateJob } = useMasterWork();
  const ensureChat = useChats((s) => s.ensure);
  const chatId = `job-${job.id}`;
  // Bosqich telefonda saqlanadi — ilova yopilib ochilsa ham shu joydan davom etadi
  const step = job.stage;
  const [sheetH, setSheetH] = useState(360);
  // Narx maydonlari bo'sh boshlanadi (oldindan to'ldirilgan narx bitta bosishda tasdiqlanib ketmasin)
  const [work, setWork] = useState(job.work ? String(job.work) : '');
  const [parts, setParts] = useState(job.parts ? String(job.parts) : '');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState(false);
  const cat = getCategory(job.categoryId);

  // Sinov rejimi: "mijoz" narx taklifiga 3 s da javob beradi (ko'pincha rozi). Serverda — haqiqiy mijozdan keladi
  useEffect(() => {
    if (!DEMO || job.priceStatus !== 'sent') return;
    const id = setTimeout(() => {
      if (Math.random() < 0.85) updateJob({ priceStatus: 'approved', stage: 'in_progress' });
      else finish(CALL_FEE, 'declined');
    }, 3000);
    return () => clearTimeout(id);
  }, [job.priceStatus]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const workN = Number(work) || 0;
  const partsN = Number(parts) || 0;
  // Ish narxi chaqiruvni o'z ichiga oladi; mijoz rad etsa — faqat chaqiruv (ko'rik)
  const total = step === 'completed' ? job.total : workN + partsN;
  // Ulush qabul paytidagi tarif bo'yicha (keyin tarif almashtirilsa ham o'zgarmaydi)
  const pct = job.feePercent;
  const cut = Math.round((total * pct) / 100);
  const stepIndex = STEP_INDEX[step];

  // Yakun: ulush balansdan yechiladi, daromad yoziladi
  function finish(sum: number, priceStatus: MasterJob['priceStatus']) {
    const c = Math.round((sum * pct) / 100);
    if (c) charge(c);
    addIncome(sum - c);
    updateJob({ stage: 'completed', total: sum, priceStatus });
  }

  const checkCode = () => {
    if (code === job.doorCode) {
      setCodeError(false);
      updateJob({ stage: 'pricing' });
    } else setCodeError(true);
  };

  const sendPrice = async () => {
    if (workN < CALL_FEE) return notice(t('job.priceTooLow', { fee: formatSum(CALL_FEE) }));
    if (workN > MAX_PRICE || partsN > MAX_PRICE) return notice(t('job.priceTooHigh'));
    if (workN + partsN > CONFIRM_ABOVE && !(await confirm(t('job.priceBigTitle'), t('job.priceBigText', { sum: formatSum(workN + partsN) }), t('common.continue')))) return;
    updateJob({ work: workN, parts: partsN, priceStatus: 'sent' });
  };

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

        {/* Yetib keldi: mijoz aytgan 4 xonali kod — kelgan odam aynan shu usta ekanini tasdiqlaydi */}
        {step === 'arrived' ? (
          <Card tone="muted">
            <Text variant="bodyBold">{t('job.codeTitle')}</Text>
            <Text variant="small">{t('job.codeHint')}</Text>
            <SheetInput
              accessibilityLabel={t('job.codeTitle')}
              value={code}
              onChangeText={(v) => {
                setCode(v.replace(/\D/g, '').slice(0, 4));
                setCodeError(false);
              }}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={colors.muted}
              style={[styles.codeInput, codeError && { borderColor: colors.danger }]}
            />
            {codeError ? (
              <Text variant="small" style={{ color: colors.danger }}>
                {t('job.codeWrong')}
              </Text>
            ) : null}
            {DEMO ? <Text variant="caption">{t('job.codeDemo', { code: job.doorCode })}</Text> : null}
          </Card>
        ) : null}

        {/* Narx: usta muammoni ko'rib taklif qiladi, mijoz telefonida "Roziman" bosmaguncha ish boshlanmaydi */}
        {step === 'pricing' ? (
          <Card tone="muted">
            {job.priceStatus === 'sent' ? (
              <>
                <Text variant="bodyBold">{t('job.priceWaiting')}</Text>
                <Row label={t('job.finalPrice')} value={formatSum(job.work)} />
                {job.parts ? <Row label={t('job.partsPrice')} value={formatSum(job.parts)} /> : null}
                <Row label={t('rate.total')} value={formatSum(job.work + job.parts)} strong />
              </>
            ) : (
              <>
                <PriceInput label={t('job.finalPrice')} value={work} onChange={setWork} placeholder={formatSum(CALL_FEE)} />
                <PriceInput label={t('job.partsPrice')} value={parts} onChange={setParts} placeholder="0" />
                <Text variant="caption">{t('job.feeIncluded', { fee: formatSum(CALL_FEE) })}</Text>
                <Divider />
                <Row label={t('rate.total')} value={formatSum(total)} strong />
              </>
            )}
          </Card>
        ) : null}

        {step === 'completed' ? (
          <Card tone="muted">
            {job.priceStatus === 'declined' ? <Text variant="bodyBold">{t('job.declinedTitle', { fee: formatSum(CALL_FEE) })}</Text> : null}
            <Row label={t('job.takeCash')} value={formatSum(total)} strong />
            {pct ? (
              <>
                <Row label={`${t('job.platformCut')} (${pct}%)`} value={`− ${formatSum(cut)}`} />
                <Row label={t('job.yourIncome')} value={formatSum(total - cut)} />
              </>
            ) : null}
          </Card>
        ) : null}

        {step === 'on_the_way' ? <Button title={t('job.arrivedBtn')} big onPress={() => updateJob({ stage: 'arrived' })} /> : null}
        {step === 'arrived' ? <Button title={t('job.codeBtn')} big disabled={code.length < 4} onPress={checkCode} /> : null}
        {step === 'pricing' && job.priceStatus !== 'sent' ? (
          <>
            <Button title={t('job.sendPrice')} big disabled={!workN} onPress={sendPrice} />
            <Button title={t('job.onlyInspection', { fee: formatSum(CALL_FEE) })} kind="secondary" onPress={() => finish(CALL_FEE, 'declined')} />
          </>
        ) : null}
        {step === 'in_progress' ? <Button title={t('job.finishBtn')} big onPress={() => finish(job.work + job.parts, 'approved')} /> : null}
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

function PriceInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  useScheme();
  return (
    <View style={styles.price}>
      <Text variant="small" style={styles.flex}>
        {label}
      </Text>
      <SheetInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 9))}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
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
  codeInput: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    textAlign: 'center',
    fontFamily: fonts.heavy,
    fontSize: 26,
    letterSpacing: 10,
    color: colors.ink,
  },
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

