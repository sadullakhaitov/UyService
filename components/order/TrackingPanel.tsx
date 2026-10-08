// Kuzatuv paneli (app/client/tracking → components/order/LiveOrder)
import { router } from 'expo-router';
import { BadgeCheck, ChevronLeft, KeyRound, MessageCircle, Phone, Plus, Share2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MapBaseProps } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { Avatar, Button, Card, Divider, IconButton, RatingBadge, Row, Squish, Text } from '@/components/ui';
import { CALL_FEE, getCategory } from '@/constants/categories';
import { colors, fonts, radius, shadow, themed, useScheme } from '@/constants/theme';
import { bboxCorners } from '@/lib/geo';
import { DEMO } from '@/lib/demo';
import { formatSum, t } from '@/lib/i18n';
import { approvePrice, completeOrder, declinePrice, etaMin, STEP_MS } from '@/lib/orderSimulator';

// Kamera har shuncha qadamda (≈ soniyada) qayta moslanadi — tez-tez sakramasligi uchun
const FIT_EVERY = 20;
import { mastersAround } from '@/mocks';
import { LIVE, liveCancelOrder } from '@/lib/live';
import { CancelSheet, CLIENT_REASONS } from '@/components/sheets/CancelSheet';
import { useChats, useHistory, useOrders, type ActiveOrder, type OrderMaster } from '@/store';

/** Usta yo'lda: harakatlanuvchi belgi, qolgan yo'l; kamera har ~20 soniyada usta va mijozni sig'diradi */
export function useTrackingMap(order: ActiveOrder | undefined) {
  const location = order?.location;
  const i = order?.step ?? 0;
  const path = order?.path ?? [];
  const fitStep = Math.floor(i / FIT_EVERY) * FIT_EVERY;
  const fitTo = useMemo(
    () => (location && path.length ? bboxCorners([...path.slice(fitStep), location]) : undefined),
    [fitStep, path, location],
  );
  if (!order || !location) return null;
  const onWay = order.status === 'on_the_way' || order.status === 'assigned';
  // Chiziq usta belgisining orqasidan boshlanadi (belgi oraliqda silliq siljiydi)
  const remaining = path.slice(Math.max(0, i - 1));
  const props: Partial<MapBaseProps> = {
    route: onWay && order.routeReady ? remaining : undefined,
    master: path[i],
    moveDuration: STEP_MS,
    clientMarker: location,
    fitTo,
  };
  return props;
}

/** Usta topildi → yo'lda → yetib keldi → ish — xarita ustidagi qism (xaritaning o'zi LiveOrder'da) */
export function TrackingPanel({ order, onHeight }: { order: ActiveOrder; onHeight: (h: number) => void }) {
  useScheme();
  const insets = useSafeAreaInsets();
  const id = order.id;
  const remove = useOrders((s) => s.remove);
  const ensureChat = useChats((s) => s.ensure);
  const unread = useChats((s) => s.chats.find((c) => c.id === `order-${id}`)?.unread ?? 0);
  const [cancelling, setCancelling] = useState(false);
  const addHistory = useHistory((s) => s.add);

  const location = order.location;
  const masters = useMemo(() => mastersAround(location), [location]);
  // Server rejimida — haqiqiy usta kartasi (yuklanguncha bo'sh joy), sinovda — namunaviy usta
  const master = order.master ?? (LIVE ? pendingMaster(order.masterId) : (masters.find((m) => m.id === order.masterId) ?? masters[0]));
  const cat = getCategory(order.categoryId);
  const status = order.status;

  const eta = etaMin(order);

  const label: Record<string, { text: string; color: string }> = {
    on_the_way: { text: t('tracking.found'), color: colors.success },
    arrived: { text: order.priceStatus === 'proposed' ? t('tracking.priceProposed') : t('tracking.arrived'), color: colors.accentInk },
    in_progress: { text: t('tracking.inProgress'), color: cat.ink },
  };
  const s = label[status] ?? label.on_the_way;
  const onWay = status === 'on_the_way' || status === 'assigned';

  // Usta yo'lga chiqqan — sabab so'raladi va tarixga yoziladi (server rejimida ustaga push ham boradi)
  const cancel = (reason: string) => {
    setCancelling(false);
    if (LIVE) void liveCancelOrder(order.id, reason).catch(() => {});
    addHistory({
      id: order.id,
      categoryId: order.categoryId,
      problemId: order.problemId,
      masterId: order.masterId,
      at: Date.now(),
      price: 0,
      status: 'cancelled',
      address: order.address,
      cancelReason: reason,
    });
    remove(order.id);
    router.replace('/client');
  };
  const openMaster = () => router.push(`/client/master?id=${master.id}&cat=${order.categoryId}`);

  return (
    <>
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

      <Sheet onHeight={onHeight} top={insets.top + 90}>
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
              {/* Belgi faqat hujjati haqiqatan tasdiqlangan ustada */}
              {master.verified ? <BadgeCheck size={18} color={colors.onPrimary} fill={cat.main} accessibilityLabel={t('tracking.verified')} /> : null}
            </View>
            <Text variant="small">
              {t(`categories.${order.categoryId}`)} · {t('tracking.experience', { years: master.experienceYears })}
            </Text>
            <View style={styles.stats}>
              <RatingBadge value={master.rating} />
              <Text variant="small">{t('tracking.jobs', { count: master.jobsCount })}</Text>
              {master.onTimePercent >= 0 ? <Text variant="small">{t('tracking.onTime', { percent: master.onTimePercent })}</Text> : null}
            </View>
          </View>
        </View>

        {/* Usta narx taklif qildi — mijoz rozi bo'lmaguncha ish boshlanmaydi */}
        {status === 'arrived' && order.priceStatus === 'proposed' ? (
          <Card style={[styles.price, { borderColor: cat.main }]}>
            <Text variant="h3">{t('tracking.priceTitle')}</Text>
            <Row label={t('tracking.priceWork')} value={formatSum(order.work)} />
            {order.parts ? <Row label={t('rate.parts')} value={formatSum(order.parts)} /> : null}
            <Divider />
            <Row label={t('rate.total')} value={formatSum(order.work + order.parts)} strong />
            <Text variant="caption">{t('tracking.priceNote', { fee: formatSum(CALL_FEE) })}</Text>
            <Button title={t('tracking.priceApprove')} big color={{ bg: cat.main, fg: cat.onMain }} onPress={() => approvePrice(order.id)} />
            <Button title={t('tracking.priceDecline', { fee: formatSum(CALL_FEE) })} kind="secondary" onPress={() => declinePrice(order.id)} />
          </Card>
        ) : null}

        {/* Eshikdagi kod: usta kelganda unga aytiladi — kelgan odam aynan shu usta ekanini bildiradi */}
        {(onWay || status === 'arrived') && order.priceStatus === 'none' ? (
          <View style={[styles.code, { backgroundColor: cat.tint }]}>
            <KeyRound size={22} color={cat.ink} strokeWidth={2.2} />
            <View style={styles.flex}>
              <Text variant="caption" style={{ color: cat.ink }}>
                {t('tracking.codeTitle')}
              </Text>
              <Text variant="small" style={{ color: cat.ink }}>
                {t('tracking.codeHint')}
              </Text>
            </View>
            <Text style={[styles.codeValue, { color: cat.ink }]}>{order.doorCode}</Text>
          </View>
        ) : null}

        <Squish accessibilityRole="button" onPress={openMaster} style={styles.reviews}>
          <Text style={styles.reviewsText}>{t('tracking.reviews')}</Text>
        </Squish>

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
          {onWay ? <Button title={t('common.cancel')} kind="secondary" onPress={() => setCancelling(true)} style={styles.flex} /> : null}
          {DEMO && status === 'in_progress' ? (
            <Button
              title={t('common.demoNext')}
              color={{ bg: cat.main, fg: cat.onMain }}
              onPress={() => completeOrder(order.id)}
              style={styles.flex}
            />
          ) : null}
        </View>

        <Squish accessibilityRole="button" onPress={() => router.replace('/client')} style={styles.another}>
          <Plus size={18} color={colors.primary} strokeWidth={2.6} />
          <Text style={styles.anotherText}>{t('tracking.another')}</Text>
        </Squish>
      </Sheet>

      <CancelSheet
        visible={cancelling}
        reasons={CLIENT_REASONS}
        warning={t('cancel.clientWarning')}
        onClose={() => setCancelling(false)}
        onConfirm={cancel}
      />
    </>
  );
}

const pendingMaster = (id: string | null): OrderMaster => ({
  id: id ?? '',
  name: '…',
  initials: '…',
  rating: 0,
  jobsCount: 0,
  onTimePercent: -1,
  experienceYears: 0,
  phone: '',
  verified: false,
});

function Action({ icon, label, onPress, tint }: { icon: React.ReactNode; label: string; onPress: () => void; tint: string }) {
  useScheme();
  return (
    <Squish accessibilityRole="button" onPress={onPress} style={[styles.action, { backgroundColor: tint }]}>
      {icon}
      <Text style={styles.actionText}>{label}</Text>
    </Squish>
  );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  back: { position: 'absolute', left: 16 },
  avatarRing: { borderWidth: 2.5, borderRadius: 22, padding: 2 },
  another: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44 },
  anotherText: { fontFamily: fonts.bold, fontSize: 15, color: colors.primary },
  eta: { position: 'absolute', left: 72, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10 },
  etaKicker: { fontFamily: fonts.medium, fontSize: 12, color: colors.onPrimaryMuted },
  etaValue: { fontFamily: fonts.heavy, fontSize: 22, color: colors.onPrimary },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontFamily: fonts.bold, fontSize: 14 },
  master: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  reviews: { height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  price: { gap: 10, borderWidth: 2 },
  code: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card },
  codeValue: { fontFamily: fonts.heavy, fontSize: 26, letterSpacing: 4 },
  reviewsText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, height: 60, borderRadius: radius.button, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  row: { flexDirection: 'row', gap: 10 },
}));
