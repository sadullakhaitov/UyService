import { router } from 'expo-router';
import { BadgeCheck, Image as ImageIcon, Phone, Share2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { MOVE_INTERVAL_MS } from '@/components/map/types';
import { Sheet } from '@/components/sheets/Sheet';
import { Avatar, Button, RatingBadge, Squish, Text } from '@/components/ui';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { routeLengthKm } from '@/lib/routes';
import { t } from '@/lib/i18n';
import { buildRoute, mastersAround } from '@/mocks';
import { useOrder, type OrderStatus } from '@/store';

export default function Tracking() {
  const insets = useSafeAreaInsets();
  const { masterId, location, categoryId, status, setStatus, reset } = useOrder();
  const masters = useMemo(() => mastersAround(location), [location]);
  const master = masters.find((m) => m.id === masterId) ?? masters[0];
  // Soxta yo'l: tayinlangan ustaning joyidan mijoz manziligacha
  const mockRoute = useMemo(() => buildRoute(master.location, location), [master.id, location]); // eslint-disable-line react-hooks/exhaustive-deps
  const [sheetH, setSheetH] = useState(460);
  const [i, setI] = useState(0);

  // Soxta: usta joylashuvi har 5 s yangilanadi (7-bosqichda Supabase Realtime)
  useEffect(() => {
    if (status !== 'on_the_way') return;
    const id = setInterval(() => setI((x) => Math.min(x + 1, mockRoute.length - 1)), MOVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  useEffect(() => {
    if (i === mockRoute.length - 1 && status === 'on_the_way') {
      const id = setTimeout(() => setStatus('arrived'), MOVE_INTERVAL_MS);
      return () => clearTimeout(id);
    }
  }, [i, status, setStatus]);

  useEffect(() => {
    if (status !== 'arrived') return;
    const id = setTimeout(() => setStatus('in_progress'), 4000);
    return () => clearTimeout(id);
  }, [status, setStatus]);

  const remaining = mockRoute.slice(i);
  const eta = Math.max(1, Math.round((routeLengthKm(remaining) / 22) * 60));
  const fitTo = useMemo(() => [mockRoute[Math.floor(i / 4) * 4], location], [Math.floor(i / 4), mockRoute]); // eslint-disable-line react-hooks/exhaustive-deps

  const label: Record<string, { text: string; color: string }> = {
    on_the_way: { text: t('tracking.found'), color: colors.success },
    arrived: { text: t('tracking.arrived'), color: colors.accentInk },
    in_progress: { text: t('tracking.inProgress'), color: colors.primary },
  };
  const s = label[status] ?? label.on_the_way;
  const onWay = status === 'on_the_way' || status === 'assigned';

  const cancel = () => {
    setStatus('cancelled');
    reset();
    router.replace('/client');
  };

  return (
    <View style={styles.root}>
      <MapBase
        center={location}
        insets={{ top: insets.top + 90, bottom: sheetH }}
        route={onWay ? remaining : undefined}
        master={mockRoute[i]}
        clientMarker={location}
        fitTo={fitTo}
      />

      <View style={[styles.eta, shadow.float, { top: insets.top + 12 }]}>
        {onWay ? (
          <>
            <Text style={styles.etaKicker}>{t('tracking.eta')}</Text>
            <Text style={styles.etaValue}>{t('common.min', { value: eta })}</Text>
          </>
        ) : (
          <Text style={[styles.etaValue, { fontSize: 16 }]}>{s.text}</Text>
        )}
      </View>

      <Sheet onHeight={setSheetH}>
        <View style={styles.status}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={[styles.statusText, { color: s.color }]}>{s.text}</Text>
        </View>

        <View style={styles.master}>
          <Avatar initials={master.initials} size={64} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text variant="h3" numberOfLines={1}>
                {master.name}
              </Text>
              <BadgeCheck size={18} color={colors.onPrimary} fill={colors.primary} accessibilityLabel={t('tracking.verified')} />
            </View>
            <Text variant="small">
              {t(`categories.${categoryId}`)} · {t('tracking.experience', { years: master.experienceYears })}
            </Text>
            <View style={styles.stats}>
              <RatingBadge value={master.rating} />
              <Text variant="small">{t('tracking.jobs', { count: master.jobsCount })}</Text>
              <Text variant="small">{t('tracking.onTime', { percent: master.onTimePercent })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.works}>
          {[0, 1, 2].map((k) => (
            <View key={k} style={styles.work} accessibilityLabel={t('tracking.workPhoto')}>
              <ImageIcon size={22} color={colors.muted} strokeWidth={1.8} />
            </View>
          ))}
          <Squish accessibilityRole="button" style={styles.reviews}>
            <Text style={styles.reviewsText}>{t('tracking.reviews')}</Text>
          </Squish>
        </View>

        <View style={styles.actions}>
          <Action icon={<Phone size={20} color={colors.primary} strokeWidth={2.2} />} label={t('tracking.callBtn')} onPress={() => Linking.openURL(`tel:${master.phone.replace(/\s/g, '')}`)} />
          <Action
            icon={<Share2 size={20} color={colors.primary} strokeWidth={2.2} />}
            label={t('tracking.shareBtn')}
            onPress={() => Share.share({ message: `${master.name} · ${t('tracking.eta')} ${t('common.min', { value: eta })} — UyService` })}
          />
        </View>

        <View style={styles.row}>
          {onWay ? <Button title={t('common.cancel')} kind="secondary" onPress={cancel} style={styles.flex} /> : null}
          {status === 'in_progress' || status === 'arrived' ? (
            <Button
              title={t('common.demoNext')}
              onPress={() => {
                setStatus('completed' as OrderStatus);
                router.replace('/client/rate');
              }}
              style={styles.flex}
            />
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Squish accessibilityRole="button" onPress={onPress} style={styles.action}>
      {icon}
      <Text style={styles.actionText}>{label}</Text>
    </Squish>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  eta: { position: 'absolute', left: 16, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  etaKicker: { fontFamily: fonts.medium, fontSize: 12, color: '#CFE5DD' },
  etaValue: { fontFamily: fonts.heavy, fontSize: 22, color: colors.onPrimary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontFamily: fonts.bold, fontSize: 14 },
  master: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  works: { flexDirection: 'row', gap: 8 },
  work: { width: 72, height: 56, borderRadius: 12, backgroundColor: colors.mapBlock, alignItems: 'center', justifyContent: 'center' },
  reviews: { flex: 1, height: 56, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  reviewsText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, height: 60, borderRadius: radius.button, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  row: { flexDirection: 'row', gap: 10 },
});
