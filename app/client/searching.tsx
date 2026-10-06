import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, SearchX } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { Button, Card, IconButton, IndeterminateBar, Row, Text } from '@/components/ui';
import { getCategory } from '@/constants/categories';
import { colors } from '@/constants/theme';
import { blur } from '@/lib/geo';
import { formatSum, t } from '@/lib/i18n';
import { mastersAround } from '@/mocks';
import { useActiveOrder, useOrders } from '@/store';

export default function Searching() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useActiveOrder(id);
  const { update, remove } = useOrders();
  const insets = useSafeAreaInsets();
  const [sheetH, setSheetH] = useState(380);
  const [zoom, setZoom] = useState(16);

  // Kamera asta uzoqlashadi — qidiruv radiusi kengayayotgani ko'rinadi
  useEffect(() => {
    const t1 = setTimeout(() => setZoom(14.5), 1200);
    return () => clearTimeout(t1);
  }, [order?.createdAt]);

  // Usta topildi — kuzatuv ekraniga
  useEffect(() => {
    if (order && order.status !== 'searching') router.replace(`/client/tracking?id=${order.id}`);
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

  const cancel = () => {
    remove(order.id);
    router.replace('/client');
  };
  const retry = () => {
    setZoom(16);
    update(order.id, { none: false, createdAt: Date.now(), searchStep: 0 });
  };

  const status = [t('searching.s1'), t('searching.s2'), t('searching.s3'), t('searching.s4')][order.searchStep];

  return (
    <View style={styles.root}>
      <MapBase
        center={location}
        zoom={zoom}
        insets={{ top: insets.top + 60, bottom: sheetH }}
        nearby={nearby}
        blinkNearby={!none}
        clientMarker={location}
        accent={cat.main}
        pulse={none ? undefined : { center: location, maxRadiusM: 900 }}
      />

      <IconButton
        icon={ChevronLeft}
        label={t('common.back')}
        floating
        onPress={() => router.replace('/client')}
        style={[styles.back, { top: insets.top + 12 }]}
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
          <Row label={t('searching.fee')} value={formatSum(cat.callFee)} />
        </Card>

        <View style={styles.actions}>
          <Button title={t('common.cancel')} kind="secondary" onPress={cancel} style={styles.flex} />
          {none ? <Button title={t('searching.retry')} color={{ bg: cat.main, fg: cat.onMain }} onPress={retry} style={styles.flex} /> : null}
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  back: { position: 'absolute', left: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  none: { alignItems: 'center', gap: 8, paddingVertical: 4 },
  noneIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noneText: { textAlign: 'center' },
});
