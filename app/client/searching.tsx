import { router } from 'expo-router';
import { SearchX } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ClientDot, MapBase, PulseRings } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { Button, Card, IndeterminateBar, Row, Text } from '@/components/ui';
import { getCategory } from '@/constants/categories';
import { colors } from '@/constants/theme';
import { blur, distanceKm } from '@/lib/geo';
import { formatSum, t } from '@/lib/i18n';
import { mockMasters } from '@/mocks';
import { useOrder } from '@/store';

// Soxta dispatch: 3 → 6 → 10 km radiusda qidiradi; 7-bosqichda Supabase Edge Function'ga almashadi
const FOUND_AFTER_MS = 7000;
const GIVE_UP_AFTER_MS = 9000;
const RINGS = 420;

export default function Searching() {
  const { categoryId, problemId, location, preferredMasterId, assign, setStatus, reset } = useOrder();
  const [sheetH, setSheetH] = useState(380);
  const [step, setStep] = useState(0);
  const [zoom, setZoom] = useState(16);
  const [none, setNone] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const candidates = useMemo(
    () =>
      mockMasters
        .filter((m) => m.categories.includes(categoryId))
        .sort((a, b) => (a.id === preferredMasterId ? -1 : b.id === preferredMasterId ? 1 : distanceKm(a.location, location) - distanceKm(b.location, location))),
    [categoryId, location, preferredMasterId],
  );
  const nearby = useMemo(() => mockMasters.map((m) => blur(m.location)), []);

  useEffect(() => {
    setNone(false);
    setStep(0);
    setZoom(16);
    const timers = [
      setTimeout(() => setZoom(14), 800), // kamera asta uzoqlashadi — radius kengaygani ko'rinadi
      setTimeout(() => setStep(1), 2200),
      setTimeout(() => setStep(candidates.length ? 2 : 3), 4400),
      candidates.length
        ? setTimeout(() => {
            assign(candidates[0].id);
            setStatus('on_the_way');
            router.replace('/client/tracking');
          }, FOUND_AFTER_MS)
        : setTimeout(() => setNone(true), GIVE_UP_AFTER_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = () => {
    setStatus('cancelled');
    reset();
    router.replace('/client');
  };

  const status = [t('searching.s1'), t('searching.s2'), t('searching.s3'), t('searching.s4')][step];

  return (
    <View style={styles.root}>
      <MapBase
        center={location}
        zoom={zoom}
        insets={{ top: 40, bottom: sheetH }}
        nearby={nearby}
        blinkNearby={!none}
        overlay={
          <View style={styles.focus}>
            {!none ? (
              <View style={StyleSheet.absoluteFill}>
                <PulseRings size={RINGS} />
              </View>
            ) : null}
            <ClientDot />
          </View>
        }
      />

      <Sheet onHeight={setSheetH}>
        {none ? (
          <View style={styles.none}>
            <View style={styles.noneIcon}>
              <SearchX size={28} color={colors.accentInk} strokeWidth={2} />
            </View>
            <Text variant="h2">{t('searching.noneTitle')}</Text>
            <Text variant="small" style={styles.noneText}>
              {t('searching.noneText')}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.head}>
              <Text variant="h2">{t('searching.title')}</Text>
              <Text variant="small">{status}</Text>
            </View>
            <IndeterminateBar />
          </>
        )}

        <Card tone="muted">
          <Row label={t('searching.service')} value={`${t(`categories.${categoryId}`)} · ${t(`problems.${problemId}`)}`} />
          <Row label={t('searching.nearby')} value={t('searching.count', { count: candidates.length })} />
          <Row label={t('searching.fee')} value={formatSum(getCategory(categoryId).callFee)} />
        </Card>

        <View style={styles.actions}>
          <Button title={t('common.cancel')} kind="secondary" onPress={cancel} style={styles.flex} />
          {none ? <Button title={t('searching.retry')} onPress={() => setAttempt((a) => a + 1)} style={styles.flex} /> : null}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  focus: { width: RINGS, height: RINGS, alignItems: 'center', justifyContent: 'center' },
  head: { gap: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  none: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  noneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noneText: { textAlign: 'center' },
});
