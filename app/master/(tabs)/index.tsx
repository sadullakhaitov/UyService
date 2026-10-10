import { router } from 'expo-router';
import { ChevronRight, Gauge, LocateFixed, MoonStar, Power, SlidersHorizontal, Wallet } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase, type MapHandle } from '@/components/map';
import { MapZoom } from '@/components/map/MapZoom';
import { ModalSheet } from '@/components/sheets/ModalSheet';
import { Sheet, useSheetFollow } from '@/components/sheets/Sheet';
import { Button, Chip, IconButton, Squish, Text } from '@/components/ui';
import { SwipeButton } from '@/components/ui/SwipeButton';
import { BILLING, feePercent } from '@/constants/billing';
import { categories } from '@/constants/categories';
import { DISPATCH } from '@/constants/dispatch';
import { colors, fonts, radius, shadow, themed, useScheme } from '@/constants/theme';
import { freeDaysLeft, useFreeUntil } from '@/lib/freePass';
import { formatSum, t } from '@/lib/i18n';
import { useBlocked } from '@/lib/masterFeed';
import { LIVE, liveMyPresence, type Presence } from '@/lib/live';
import { inTelegram, openBotLive } from '@/lib/telegram';
import { askNotifications } from '@/lib/notify';
import { locateMe, useMyLocation } from '@/lib/useMyLocation';
import { MAP_ATTRIBUTION_H, useWide } from '@/lib/useLayout';
import { useWatchLocation } from '@/lib/useWatchLocation';
import { mockMasterSelf } from '@/mocks';
import { track } from '@/lib/track';
import { earningOn, useLocationLog, useMaster, useMasterWork, useUser } from '@/store';
import { GlassBg } from '@/components/ui/Glass';

const DAY = 86_400_000;

export default function MasterOrders() {
  useScheme();
  const insets = useSafeAreaInsets();
  const { online, setOnline, activity, subscriptionUntil, verified } = useMaster();
  // "Bugun" — haqiqiy yakunlangan ishlardan, yarim tunda o'zi nolga tushadi
  const today = earningOn(useMaster((s) => s.earnings));
  const todayIncome = today.income;
  const todayJobs = today.jobs;
  // Taklif ekranidan chiqib ketilgan bo'lsa yoki faol ish bo'lsa — panelda karta (orqaga qaytish yo'li)
  const pendingOffer = useMasterWork((s) => s.offer);
  const job = useMasterWork((s) => s.job);
  const sentAt = useLocationLog((s) => s.lastAt);
  const [, setNow] = useState(0);
  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [online]);
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const [sheetH, setSheetH] = useState(330);
  const above = useSheetFollow(sheetH);
  const [filters, setFilters] = useState(false);
  const map = useRef<MapHandle>(null);
  const me = useMyLocation();
  const wide = useWide();
  // Xarita oxirgi ma'lum haqiqiy joydan boshlanadi, GPS kelishi bilan aniqlanadi
  const [initial] = useState(() => useUser.getState().lastLocation ?? mockMasterSelf.location);
  // Belgi faqat usta haqiqatan yurganda siljiydi. Buyurtma kutayotganda — yengil GPS (batareya, qizish)
  const live = useWatchLocation(true, 'balanced');
  const pos = live ?? me ?? initial;
  // Kuzatish rejimi (navigatordagidek): usta yurganda kamera ortidan yuradi. Xaritani qo'lda sursa — to'xtaydi,
  // "joylashuv" tugmasi qayta yoqadi
  const follow = useRef(true);
  useEffect(() => {
    if (live && follow.current) map.current?.panTo(live);
  }, [live?.latitude, live?.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nega buyurtmalar yopiq (Yandex Pro'dagi qizil banner kabi)
  const blocked = useBlocked();
  // Bepul davr (admin bergan kod): ulush yo'q — "hujjatsiz +5%" eslatmasi o'rniga yashil banner
  const freeUntil = useFreeUntil();
  const notice = !blocked && !verified && !freeUntil;

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
  const topH = insets.top + (blocked || notice || freeUntil ? 56 : 12);

  return (
    <View style={styles.root} onLayout={above.onLayout}>
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
      ) : freeUntil ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate('/master/money')}
          style={[styles.banner, styles.free, { paddingTop: insets.top + 8 }]}
        >
          <Text style={[styles.bannerText, { color: colors.primary }]}>{t('mOrders.free', { count: freeDaysLeft(freeUntil) })}</Text>
          <View style={styles.bannerGo}>
            <ChevronRight size={18} color={colors.primary} strokeWidth={3} />
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

      <Animated.View style={[styles.rightCol, wide ? { bottom: MAP_ATTRIBUTION_H + 12 } : above.style]} pointerEvents="box-none">
        <MapZoom onZoom={(d) => map.current?.zoomBy(d)} size={52} radius={26} />
        <IconButton icon={LocateFixed} label={t('client.myLocation')} floating onPress={locate} style={styles.round} />
      </Animated.View>

      <Sheet onHeight={setSheetH} bottomInset={0} peek={70} top={topH + 60} position={above.position}>
        {job ? (
          <Squish accessibilityRole="button" onPress={() => router.push('/master/job')} style={[styles.activeCard, { borderColor: colors.primary }]}>
            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
            <View style={styles.flex}>
              <Text variant="caption">{t('mOrders.activeJob')}</Text>
              <Text variant="bodyBold" numberOfLines={1}>
                {job.clientName} · {t(`problems.${job.problemId}`)}
              </Text>
            </View>
            <Text style={styles.activeGo}>{t('mOrders.open')}</Text>
            <ChevronRight size={18} color={colors.primary} strokeWidth={2.6} />
          </Squish>
        ) : pendingOffer ? (
          <Squish accessibilityRole="button" onPress={() => router.push('/master/offer')} style={[styles.activeCard, { borderColor: colors.accent }]}>
            <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            <View style={styles.flex}>
              <Text variant="caption">{t('offer.title')}</Text>
              <Text variant="bodyBold" numberOfLines={1}>
                {t(`problems.${pendingOffer.problemId}`)} · {t('common.km', { value: pendingOffer.distanceKm })}
              </Text>
            </View>
            <Text style={[styles.activeGo, { color: colors.accentInk }]}>{t('mOrders.view')}</Text>
            <ChevronRight size={18} color={colors.accentInk} strokeWidth={2.6} />
          </Squish>
        ) : null}
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
            <Text style={styles.promoTitle}>{freeUntil ? t('mOrders.freeTitle') : plan === 'commission' ? t('mOrders.promoCommission') : t('mOrders.promoSubscription')}</Text>
            <Text variant="caption" style={styles.promoSub}>
              {freeUntil
                ? t('mOrders.freeSub')
                : plan === 'commission'
                  ? t('mOrders.promoCommissionSub', { percent: feePercent(plan, verified) })
                  : t('mOrders.promoSubscriptionSub', { days: daysLeft })}
            </Text>
          </View>
          <Text style={styles.promoPrice}>
            {freeUntil ? t('mOrders.days', { days: freeDaysLeft(freeUntil) }) : plan === 'commission' ? formatSum(BILLING.subscription.monthlyFee) : t('mOrders.days', { days: daysLeft })}
          </Text>
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

        {/* Telegram ichida: yig'ib qo'ysa ham ishda qoladi (fon rejimi) — holati va jonli joylashuv */}
        {online && LIVE && inTelegram() ? <BackgroundCard /> : null}

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
              track('master_online');
            }}
          />
        )}
      </Sheet>

      <FilterModal visible={filters} onClose={() => setFilters(false)} />
    </View>
  );
}

// Fon rejimi (server: …_background_presence.sql): Telegram yig'ilsa ham buyurtma bot xabari bo'lib keladi,
// joylashuv 45 daqiqa amal qiladi; botda jonli joylashuv ulansa — muddati tugaguncha o'zi yangilanadi
function BackgroundCard() {
  useScheme();
  const [p, setP] = useState<Presence | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => liveMyPresence().then((x) => alive && setP(x));
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  if (!p) return null;
  const live = p.liveUntil && p.liveUntil > Date.now();
  const time = live ? new Date(p.liveUntil!).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <Squish accessibilityRole="button" onPress={p.reachable ? openBotLive : () => router.push('/master/settings')} style={[styles.bg, !p.reachable && styles.bgOff]}>
      <View style={[styles.statIcon, { backgroundColor: p.reachable ? colors.primarySoft : colors.accentSoft }]}>
        <MoonStar size={20} color={p.reachable ? colors.primary : colors.accent} strokeWidth={2.2} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.bgTitle, !p.reachable && { color: colors.accentInk }]}>
          {!p.reachable ? t('mOrders.bgOffTitle') : live ? t('mOrders.bgLiveTitle', { time }) : t('mOrders.bgTitle')}
        </Text>
        <Text variant="caption">{!p.reachable ? t('mOrders.bgOffSub') : live ? t('mOrders.bgLiveSub') : t('mOrders.bgSub')}</Text>
      </View>
      {p.reachable && !live ? <Text style={styles.activeGo}>{t('mOrders.bgLiveBtn')}</Text> : null}
      <ChevronRight size={18} color={p.reachable ? colors.primary : colors.accentInk} strokeWidth={2.6} />
    </Squish>
  );
}

function FilterModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useScheme();
  const { categories: mine, radiusKm, setFilter, profile } = useMaster();
  // Filtrda faqat usta ro'yxatdan o'tgan kategoriyalar; kamida bittasi yoqiq qoladi
  const own = profile.categories.length ? profile.categories : categories.map((c) => c.id);
  const toggle = (id: (typeof mine)[number]) => {
    const next = mine.includes(id) ? mine.filter((x) => x !== id) : [...mine, id];
    if (next.some((c) => own.includes(c))) setFilter({ categories: next });
  };
  return (
    <ModalSheet visible={visible} onClose={onClose}>
      <Text variant="h2">{t('mOrders.filters')}</Text>
      <Text variant="bodyBold">{t('mOrders.filterCategories')}</Text>
      <View style={styles.chips}>
        {categories
          .filter((c) => own.includes(c.id))
          .map((c) => (
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
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.card, borderWidth: 1.5, backgroundColor: colors.surface },
  activeGo: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
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
  free: { backgroundColor: colors.primarySoft },
  bannerGo: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  topRow: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, paddingHorizontal: 16 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stateText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  round: { width: 52, height: 52, borderRadius: 26 },
  rightCol: { position: 'absolute', right: 16, gap: 12, alignItems: 'flex-end' },
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
  bg: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.primarySoft },
  bgOff: { borderColor: colors.accentSoft },
  bgTitle: { fontFamily: fonts.heavy, fontSize: 14, color: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
