// Qidiruv paneli (app/client/searching → components/order/LiveOrder)
import { router } from 'expo-router';
import { CalendarClock, ChevronLeft, SearchX } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { track } from '@/lib/track';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapBaseProps } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { CancelSheet, CLIENT_REASONS } from '@/components/sheets/CancelSheet';
import { Button, Card, IconButton, IndeterminateBar, Row, Text } from '@/components/ui';
import { getCategory } from '@/constants/categories';
import { colors, themed, useScheme } from '@/constants/theme';
import { blur } from '@/lib/geo';
import { formatSchedule, formatSum, t } from '@/lib/i18n';
import { SCHEDULE_LEAD_MS, searchInfo, startSearch } from '@/lib/orderSimulator';
import { TASHKENT_CENTER } from '@/mocks';
import { useMastersAround } from '@/lib/around';
import { LIVE, liveCancelOrder } from '@/lib/live';
import { useHistory, useOrders, type ActiveOrder } from '@/store';

/** Qidiruv paytidagi xarita: atrofdagi ustalar miltillaydi, to'lqinlar, kamera asta uzoqlashadi */
export function useSearchingMap(order: ActiveOrder | undefined) {
  const [zoom, setZoom] = useState(16);
  // Kamera asta uzoqlashadi — qidiruv radiusi kengayayotgani ko'rinadi
  useEffect(() => {
    const t1 = setTimeout(() => setZoom(14.5), 1200);
    return () => clearTimeout(t1);
  }, [order?.createdAt]);
  const location = order?.location;
  const aroundAll = useMastersAround(location ?? TASHKENT_CENTER, 10);
  const nearby = useMemo(() => (location ? aroundAll.map((m) => blur(m.location)) : []), [location, aroundAll]);
  const quiet = !order || order.none || order.status === 'scheduled';
  const props: Partial<MapBaseProps> | null = location
    ? {
        zoom,
        nearby,
        blinkNearby: !quiet,
        clientMarker: location,
        pulse: quiet ? undefined : { center: location, maxRadiusM: 900 },
      }
    : null;
  return { props, resetZoom: () => setZoom(16) };
}

/** Qidirilmoqda yoki rejalashtirilgan buyurtma — xarita ustidagi qism (xaritaning o'zi LiveOrder'da) */
export function SearchingPanel({ order, onHeight, onRetry }: { order: ActiveOrder; onHeight: (h: number) => void; onRetry: () => void }) {
  useScheme();
  const { remove } = useOrders();
  const insets = useSafeAreaInsets();
  const [cancelling, setCancelling] = useState(false);
  const addHistory = useHistory((s) => s.add);
  // "Javob kutilmoqda" matni uchun har soniyada yangilanadi
  const [, setNow] = useState(0);
  useEffect(() => {
    const t1 = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t1);
  }, []);

  const location = order.location;
  const aroundHere = useMastersAround(location, 10);
  const candidates = useMemo(() => aroundHere.filter((m) => m.categories.includes(order.categoryId)).length, [aroundHere, order.categoryId]);

  const cat = getCategory(order.categoryId);
  const none = order.none;
  useEffect(() => {
    if (none) track('no_master', { category: order.categoryId });
  }, [none]); // eslint-disable-line react-hooks/exhaustive-deps
  const scheduled = order.status === 'scheduled';
  const info = searchInfo(order);

  // Bekor qilish ham sabab bilan va tarixga yoziladi (rejalashtirilgan buyurtma bir bosishda yo'qolib ketmasin)
  const cancel = (reason: string) => {
    setCancelling(false);
    if (LIVE) void liveCancelOrder(order.id, reason).catch(() => {});
    addHistory({
      id: order.id,
      categoryId: order.categoryId,
      problemId: order.problemId,
      masterId: null,
      at: Date.now(),
      price: 0,
      status: 'cancelled',
      address: order.address,
      cancelReason: reason,
    });
    remove(order.id);
    router.replace('/client');
  };
  const retry = () => {
    onRetry();
    startSearch(order.id);
  };

  const status = order.requeued && !info.offered
    ? t('searching.requeued')
    : info.lastDeclined
    ? t('searching.nextMaster')
    : [t('searching.s1'), t('searching.s2'), t('searching.s3'), t('searching.s4')][info.step];

  return (
    <>
      <IconButton
        icon={ChevronLeft}
        label={t('common.back')}
        floating
        onPress={() => router.replace('/client')}
        style={[styles.back, { top: insets.top + 12 }]}
      />

      <Sheet onHeight={onHeight} top={insets.top + 72}>
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
          <Button title={t('common.cancel')} kind="secondary" onPress={() => setCancelling(true)} style={styles.flex} />
          {none ? <Button title={t('searching.retry')} color={{ bg: cat.main, fg: cat.onMain }} onPress={retry} style={styles.flex} /> : null}
          {scheduled ? <Button title={t('schedule.searchNow')} color={{ bg: cat.main, fg: cat.onMain }} onPress={retry} style={styles.flex} /> : null}
        </View>
      </Sheet>

      <CancelSheet visible={cancelling} reasons={CLIENT_REASONS} onClose={() => setCancelling(false)} onConfirm={cancel} />
    </>
  );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  back: { position: 'absolute', left: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  none: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  noneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noneText: { textAlign: 'center' },
}));
