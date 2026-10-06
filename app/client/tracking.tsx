import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, ChevronLeft, Image as ImageIcon, MessageCircle, Phone, Plus, Share2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { Avatar, Button, IconButton, RatingBadge, Squish, Text } from '@/components/ui';
import { getCategory } from '@/constants/categories';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { bboxCorners } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { etaMin } from '@/lib/orderSimulator';
import { mastersAround } from '@/mocks';
import { useActiveOrder, useChats, useOrders } from '@/store';

export default function Tracking() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useActiveOrder(id);
  const remove = useOrders((s) => s.remove);
  const update = useOrders((s) => s.update);
  const ensureChat = useChats((s) => s.ensure);
  const unread = useChats((s) => s.chats.find((c) => c.id === `order-${id}`)?.unread ?? 0);
  const [sheetH, setSheetH] = useState(460);

  const location = order?.location;
  const masters = useMemo(() => (location ? mastersAround(location) : []), [location]);
  const i = order?.step ?? 0;
  const path = order?.path ?? [];
  // Kamera usta, qolgan yo'l va mijozni birga ko'rsatadi (har 4 qadamda qayta moslanadi)
  const fitTo = useMemo(
    () => (location && path.length ? bboxCorners([...path.slice(Math.floor(i / 4) * 4), location]) : undefined),
    [Math.floor(i / 4), path, location], // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!order || !location) return null;
  const master = masters.find((m) => m.id === order.masterId) ?? masters[0];
  const cat = getCategory(order.categoryId);
  const status = order.status;

  // Chiziq usta belgisining orqasidan boshlanadi (belgi oraliqda silliq siljiydi)
  const remaining = path.slice(Math.max(0, i - 1));
  const eta = etaMin(order);

  const label: Record<string, { text: string; color: string }> = {
    on_the_way: { text: t('tracking.found'), color: colors.success },
    arrived: { text: t('tracking.arrived'), color: colors.accentInk },
    in_progress: { text: t('tracking.inProgress'), color: cat.ink },
  };
  const s = label[status] ?? label.on_the_way;
  const onWay = status === 'on_the_way' || status === 'assigned';

  const cancel = () => {
    remove(order.id);
    router.replace('/client');
  };

  return (
    <View style={styles.root}>
      <MapBase
        center={location}
        insets={{ top: insets.top + 90, bottom: sheetH }}
        route={onWay ? remaining : undefined}
        master={path[i]}
        clientMarker={location}
        fitTo={fitTo}
        accent={cat.main}
      />

      <IconButton
        icon={ChevronLeft}
        label={t('common.back')}
        floating
        onPress={() => router.replace('/client')}
        style={[styles.back, { top: insets.top + 12 }]}
      />
      <View style={[styles.eta, shadow.float, { top: insets.top + 12, backgroundColor: cat.main }]}>
        {onWay ? (
          <>
            <Text style={[styles.etaKicker, { color: cat.onMain, opacity: 0.85 }]}>{t('tracking.eta')}</Text>
            <Text style={[styles.etaValue, { color: cat.onMain }]}>{t('common.min', { value: eta })}</Text>
          </>
        ) : (
          <Text style={[styles.etaValue, { fontSize: 16, color: cat.onMain }]}>{s.text}</Text>
        )}
      </View>

      <Sheet onHeight={setSheetH}>
        <View style={styles.status}>
          <View style={[styles.dot, { backgroundColor: s.color }]} />
          <Text style={[styles.statusText, { color: s.color }]}>{s.text}</Text>
        </View>

        <View style={styles.master}>
          <View style={[styles.avatarRing, { borderColor: cat.main }]}>
            <Avatar initials={master.initials} size={60} />
          </View>
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <Text variant="h3" numberOfLines={1}>
                {master.name}
              </Text>
              <BadgeCheck size={18} color={colors.onPrimary} fill={cat.main} accessibilityLabel={t('tracking.verified')} />
            </View>
            <Text variant="small">
              {t(`categories.${order.categoryId}`)} · {t('tracking.experience', { years: master.experienceYears })}
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
          <Action icon={<Phone size={20} color={cat.ink} strokeWidth={2.2} />} tint={cat.tint} label={t('tracking.callBtn')} onPress={() => Linking.openURL(`tel:${master.phone.replace(/\s/g, '')}`)} />
          <Action
            icon={<MessageCircle size={20} color={cat.ink} strokeWidth={2.2} />}
            tint={cat.tint}
            label={unread ? `${t('tracking.chatBtn')} · ${unread}` : t('tracking.chatBtn')}
            onPress={() => {
              ensureChat({ id: `order-${order.id}`, title: master.name, subtitle: t(`categories.${order.categoryId}`), kind: 'master' });
              router.push(`/client/chat?id=order-${order.id}&cat=${order.categoryId}`);
            }}
          />
          <Action
            icon={<Share2 size={20} color={cat.ink} strokeWidth={2.2} />}
            tint={cat.tint}
            label={t('tracking.shareBtn')}
            onPress={() => Share.share({ message: `${master.name} · ${t('tracking.eta')} ${t('common.min', { value: eta })} — UyService` })}
          />
        </View>

        <View style={styles.row}>
          {onWay ? <Button title={t('common.cancel')} kind="secondary" onPress={cancel} style={styles.flex} /> : null}
          {status === 'in_progress' || status === 'arrived' ? (
            <Button
              title={t('common.demoNext')}
              color={{ bg: cat.main, fg: cat.onMain }}
              onPress={() => {
                update(order.id, { status: 'completed' });
                router.replace(`/client/rate?id=${order.id}`);
              }}
              style={styles.flex}
            />
          ) : null}
        </View>

        <Squish accessibilityRole="button" onPress={() => router.replace('/client')} style={styles.another}>
          <Plus size={18} color={colors.primary} strokeWidth={2.6} />
          <Text style={styles.anotherText}>{t('tracking.another')}</Text>
        </Squish>
      </Sheet>
    </View>
  );
}

function Action({ icon, label, onPress, tint }: { icon: React.ReactNode; label: string; onPress: () => void; tint: string }) {
  return (
    <Squish accessibilityRole="button" onPress={onPress} style={[styles.action, { backgroundColor: tint }]}>
      {icon}
      <Text style={styles.actionText}>{label}</Text>
    </Squish>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  back: { position: 'absolute', left: 16 },
  avatarRing: { borderWidth: 2.5, borderRadius: 22, padding: 2 },
  another: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44 },
  anotherText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  eta: { position: 'absolute', left: 72, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
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
