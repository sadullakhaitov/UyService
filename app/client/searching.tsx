import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, ChevronLeft, SearchX } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { Button, Card, IconButton, IndeterminateBar, Row, Text } from '@/components/ui';
import { getCategory } from '@/constants/categories';
import { colors, themed, useScheme } from '@/constants/theme';
import { blur } from '@/lib/geo';
import { formatSchedule, formatSum, t } from '@/lib/i18n';
import { SCHEDULE_LEAD_MS, searchInfo, startSearch } from '@/lib/orderSimulator';
import { mastersAround } from '@/mocks';
import { useActiveOrder, useOrders } from '@/store';

export default function Searching() {
  useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useActiveOrder(id);
  const { remove } = useOrders();
  const insets = useSafeAreaInsets();
  const [sheetH, setSheetH] = useState(380);
  const [zoom, setZoom] = useState(16);
  // "Javob kutilmoqda" matni uchun har soniyada yangilanadi
  const [, setNow] = useState(0);
  useEffect(() => {
    const t1 = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t1);
  }, []);

  // Kamera asta uzoqlashadi — qidiruv radiusi kengayayotgani ko'rinadi
  useEffect(() => {
    const t1 = setTimeout(() => setZoom(14.5), 1200);
    return () => clearTimeout(t1);
  }, [order?.createdAt]);

  // Usta topildi — kuzatuv ekraniga
  useEffect(() => {
    if (order && order.status !== 'searching' && order.status !== 'scheduled') router.replace(`/client/tracking?id=${order.id}`);
  }, [order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const location = order?.location;
  const nearby = useMemo(() => (location ? mastersAround(location).map((m) => blur(m.location)) : []), [location]);
  const candidates = useMemo(
    () => (location && order ? mastersAround(location).filter((m) => m.categories.includes(order.categoryId)).length : 0),
    [location, order?.categoryId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!order || !location) return null;
  const cat = getCategory(order.categoryId);
  const none = order.none;
  const scheduled = order.status === 'scheduled';
  const info = searchInfo(order);

  const cancel = () => {
    remove(order.id);
    router.replace('/client');
  };
  const retry = () => {
    setZoom(16);
    startSearch(order.id);
  };

  const status = info.lastDeclined
    ? t('searching.nextMaster')
    : [t('searching.s1'), t('searching.s2'), t('searching.s3'), t('searching.s4')][info.step];

  return (
    <View style={styles.root}>
      <MapBase
        center={location}
        zoom={zoom}
        insets={{ top: insets.top + 60, bottom: sheetH }}
        nearby={nearby}
        blinkNearby={!none && !scheduled}
        clientMarker={location}
        accent={cat.main}
        pulse={none || scheduled ? undefined : { center: location, maxRadiusM: 900 }}
      />

      <IconButton
        icon={ChevronLeft}
        label={t('common.back')}
        floating
        onPress={() => router.replace('/client')}
        style={[styles.back, { top: insets.top + 12 }]}
      />

      <Sheet onHeight={setSheetH}>
        {scheduled ? (
          <View style={styles.head}>
            <View style={[styles.catIcon, { backgroundColor: cat.tint }]}>
              <CalendarClock size={22} color={cat.ink} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Text variant="h2">{formatSchedule(order.scheduledAt ?? Date.now())}</Text>
              <Text variant="small">{t('schedule.searchStarts', { min: SCHEDULE_LEAD_MS / 60_000 })}</Text>
            </View>
          </View>
        ) : none ? (
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
              <View style={[styles.catIcon, { backgroundColor: cat.tint }]}>
                <cat.icon size={22} color={cat.ink} strokeWidth={2.2} />
              </View>
              <View style={styles.flex}>
                <Text variant="h2">{t('searching.title')}</Text>
                <Text variant="small">{status}</Text>
              </View>
            </View>
            <IndeterminateBar color={cat.main} />
          </>
        )}

        <Card tone="muted">
          <Row label={t('searching.service')} value={`${t(`categories.${order.categoryId}`)} · ${t(`problems.${order.problemId}`)}`} />
          <Row label={t('searching.nearby')} value={t('searching.count', { count: candidates })} />
          {!scheduled ? <Row label={t('searching.radius')} value={t('common.km', { value: info.radiusKm })} /> : null}
          {info.offered ? <Row label={t('searching.offered')} value={String(info.offered)} /> : null}
          <Row label={t('searching.fee')} value={formatSum(cat.callFee)} />
        </Card>

        <View style={styles.actions}>
          <Button title={t('common.cancel')} kind="secondary" onPress={cancel} style={styles.flex} />
          {none ? <Button title={t('searching.retry')} color={{ bg: cat.main, fg: cat.onMain }} onPress={retry} style={styles.flex} /> : null}
          {scheduled ? <Button title={t('schedule.searchNow')} color={{ bg: cat.main, fg: cat.onMain }} onPress={retry} style={styles.flex} /> : null}
        </View>
      </Sheet>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  back: { position: 'absolute', left: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  none: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  noneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noneText: { textAlign: 'center' },
}));
