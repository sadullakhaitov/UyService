import { router } from 'expo-router';
import { ChevronRight, Gauge, LocateFixed, Minus, Plus, Power, SlidersHorizontal, Wallet } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase, type MapHandle } from '@/components/map';
import { ModalSheet } from '@/components/sheets/ModalSheet';
import { Sheet } from '@/components/sheets/Sheet';
import { Button, Chip, IconButton, Squish, Text } from '@/components/ui';
import { SwipeButton } from '@/components/ui/SwipeButton';
import { BILLING, feePercent } from '@/constants/billing';
import { categories } from '@/constants/categories';
import { DISPATCH } from '@/constants/dispatch';
import { colors, fonts, radius, shadow, themed, useScheme } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { useBlocked } from '@/lib/masterFeed';
import { askNotifications } from '@/lib/notify';
import { locateMe, useMyLocation } from '@/lib/useMyLocation';
import { MAP_ATTRIBUTION_H, useWide } from '@/lib/useLayout';
import { useWatchLocation } from '@/lib/useWatchLocation';
import { mockMasterSelf } from '@/mocks';
import { useLocationLog, useMaster, useUser } from '@/store';
import { GlassBg } from '@/components/ui/Glass';

const DAY = 86_400_000;

export default function MasterOrders() {
  useScheme();
  const insets = useSafeAreaInsets();
  const { online, setOnline, activity, subscriptionUntil, todayIncome, todayJobs, verified } = useMaster();
  const sentAt = useLocationLog((s) => s.lastAt);
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [online]);
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const [sheetH, setSheetH] = useState(330);
  const [filters, setFilters] = useState(false);
  const map = useRef<MapHandle>(null);
  const me = useMyLocation();
  const wide = useWide();
  // Xarita oxirgi ma'lum haqiqiy joydan boshlanadi, GPS kelishi bilan aniqlanadi
  const [initial] = useState(() => useUser.getState().lastLocation ?? mockMasterSelf.location);
  // Belgi faqat usta haqiqatan yurganda siljiydi
  const live = useWatchLocation();
  const pos = live ?? me ?? initial;
  // Kuzatish rejimi (navigatordagidek): usta yurganda kamera ortidan yuradi. Xaritani qo'lda sursa — to'xtaydi,
  // "joylashuv" tugmasi qayta yoqadi
  const follow = useRef(true);
  useEffect(() => {
    if (live && follow.current) map.current?.panTo(live);
  }, [live?.latitude, live?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nega buyurtmalar yopiq (Yandex Pro'dagi qizil banner kabi)
  const blocked = useBlocked();
  const notice = !blocked && !verified;

  useEffect(() => {
    if (blocked && online) setOnline(false);
  }, [blocked, online, setOnline]);

  useEffect(() => {
    if (me) map.current?.flyTo(me, 16);
  }, [me]);

  const locate = async () => {
    follow.current = true;
    const here = live ?? (await locateMe()) ?? me;
    if (here) map.current?.flyTo(here, 16);
  };

  const daysLeft = Math.max(0, Math.ceil((subscriptionUntil - Date.now()) / DAY));
  const topH = insets.top + (blocked || notice ? 56 : 12);

  return (
    <View style={styles.root}>
      <MapBase
        ref={map}
        center={initial}
        zoom={16}
        insets={{ top: topH + 60, bottom: sheetH }}
        master={pos}
        moveDuration={1000}
        onMoveStart={() => {
          follow.current = false;
        }}
        pulse={online ? { center: pos, maxRadiusM: 350 } : undefined}
      />

      {blocked ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/master/money')}
          style={[styles.banner, { paddingTop: insets.top + 8 }]}
        >
          <Text style={styles.bannerText}>{blocked === 'balance' ? t('mOrders.blockedBalance') : t('mOrders.blockedSubscription')}</Text>
          <View style={styles.bannerGo}>
            <ChevronRight size={18} color={colors.danger} strokeWidth={3} />
          </View>
        </Pressable>
      ) : notice ? (
        // Pasportsiz ishlayapti — buyurtmalar ochiq, faqat ulush +5%. Bosilsa — hujjatlar
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/master/documents')}
          style={[styles.banner, styles.notice, { paddingTop: insets.top + 8 }]}
        >
          <Text style={[styles.bannerText, { color: colors.accentInk }]}>
            {t('mOrders.unverified', { pct: feePercent(plan, false), base: feePercent(plan, true) })}
          </Text>
          <View style={styles.bannerGo}>
            <ChevronRight size={18} color={colors.accentInk} strokeWidth={3} />
          </View>
        </Pressable>
      ) : null}

      <View style={[styles.topRow, { top: topH }]} pointerEvents="box-none">
        <View style={[styles.statePill, shadow.float]}>
          <GlassBg radius={22} />
          <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.muted }]} />
          <Text style={styles.stateText}>{online ? t('master.online') : t('master.offline')}</Text>
        </View>
        <IconButton icon={SlidersHorizontal} label={t('mOrders.filters')} floating onPress={() => setFilters(true)} style={styles.round} />
      </View>

      <View style={[styles.rightCol, { bottom: (wide ? MAP_ATTRIBUTION_H : sheetH) + 12 }]} pointerEvents="box-none">
        <View style={[styles.zoom, shadow.float]}>
          <GlassBg radius={26} interactive />
          <Pressable accessibilityRole="button" accessibilityLabel={t('mOrders.zoomIn')} onPress={() => map.current?.zoomBy(1)} style={styles.zoomBtn}>
            <Plus size={24} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.zoomSep} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('mOrders.zoomOut')} onPress={() => map.current?.zoomBy(-1)} style={styles.zoomBtn}>
            <Minus size={24} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
        </View>
        <IconButton icon={LocateFixed} label={t('client.myLocation')} floating onPress={locate} style={styles.round} />
      </View>

      <Sheet onHeight={setSheetH} bottomInset={0} peek={70} top={topH + 60}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: colors.accentSoft }]}>
              <Gauge size={22} color={colors.accent} strokeWidth={2.2} />
            </View>
            <View>
              <Text variant="caption">{t('mOrders.activity')}</Text>
              <Text style={styles.statValue}>{activity}</Text>
            </View>
          </View>
          <View style={styles.statSep} />
          <Squish accessibilityRole="button" onPress={() => router.navigate('/master/money')} style={styles.stat}>
            <View style={[styles.statIcon, { backgroundColor: colors.primarySoft }]}>
              <Wallet size={22} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Text variant="caption">{t('mOrders.todayOrders', { count: todayJobs })}</Text>
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatSum(todayIncome)}
              </Text>
            </View>
          </Squish>
        </View>

        <Squish accessibilityRole="button" onPress={() => router.push('/master/plan')} style={styles.promo}>
          <View style={styles.flex}>
            <Text style={styles.promoTitle}>{plan === 'commission' ? t('mOrders.promoCommission') : t('mOrders.promoSubscription')}</Text>
            <Text variant="caption" style={styles.promoSub}>
              {plan === 'commission'
                ? t('mOrders.promoCommissionSub', { percent: feePercent(plan, verified) })
                : t('mOrders.promoSubscriptionSub', { days: daysLeft })}
            </Text>
          </View>
          <Text style={styles.promoPrice}>{plan === 'commission' ? formatSum(BILLING.subscription.monthlyFee) : t('mOrders.days', { days: daysLeft })}</Text>
        </Squish>

        {online ? (
          <View style={styles.onlineRow}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <View>
              <Text variant="small">{t('mOrders.onlineNow')}</Text>
              {sentAt ? (
                <Text variant="caption">{t('mOrders.gpsSent', { sec: Math.max(0, Math.round((Date.now() - sentAt) / 1000)) })}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {blocked ? (
          <SwipeButton title={t('mOrders.blockedTitle')} hint={t('mOrders.blockedHint')} disabled onComplete={() => {}} />
        ) : online ? (
          <SwipeButton title={t('mOrders.swipeOffline')} tone="muted" icon={Power} onComplete={() => setOnline(false)} />
        ) : (
          <SwipeButton
            title={t('mOrders.swipeOnline')}
            hint={t('mOrders.swipeOnlineHint')}
            onComplete={() => {
              askNotifications();
              setOnline(true);
            }}
          />
        )}
      </Sheet>

      <FilterModal visible={filters} onClose={() => setFilters(false)} />
    </View>
  );
}

function FilterModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useScheme();
  const { categories: mine, radiusKm, setFilter } = useMaster();
  const toggle = (id: (typeof mine)[number]) =>
    setFilter({ categories: mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id] });
  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <Text variant="h2">{t('mOrders.filters')}</Text>
      <Text variant="bodyBold">{t('mOrders.filterCategories')}</Text>
      <View style={styles.chips}>
        {categories.map((c) => (
          <Chip key={c.id} label={t(`categories.${c.id}`)} selected={mine.includes(c.id)} onPress={() => toggle(c.id)} />
        ))}
      </View>
      <Text variant="bodyBold">{t('mOrders.filterRadius')}</Text>
      <View style={styles.chips}>
        {DISPATCH.radiiKm.map((km) => (
          <Chip key={km} label={t('common.km', { value: km })} selected={radiusKm === km} onPress={() => setFilter({ radiusKm: km })} />
        ))}
      </View>
      <Button title={t('mOrders.done')} big onPress={onClose} />
    </ModalSheet>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary, textAlign: 'center' },
  notice: { backgroundColor: colors.accentSoft },
  bannerGo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, paddingHorizontal: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stateText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  round: { width: 52, height: 52, borderRadius: 26 },
  rightCol: { position: 'absolute', right: 16, gap: 12, alignItems: 'flex-end' },
  zoom: { borderRadius: 26, width: 52, overflow: 'hidden' },
  zoomBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  zoomSep: { height: 1, backgroundColor: colors.line, marginHorizontal: 10 },
  stats: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink },
  statSep: { width: 1, height: 40, backgroundColor: colors.line, marginHorizontal: 12 },
  promo: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.card, backgroundColor: colors.accentSoft },
  promoTitle: { fontFamily: fonts.heavy, fontSize: 15, color: colors.accentInk },
  promoSub: { color: colors.accentInk },
  promoPrice: { fontFamily: fonts.heavy, fontSize: 16, color: colors.accent },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
