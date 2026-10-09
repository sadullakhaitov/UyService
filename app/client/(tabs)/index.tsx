// Mijoz: Asosiy sahifa (pastki menyuning birinchi bo'limi). Xarita yo'q — tez ochiladi:
// salom va profil, manzil, aylanuvchi banner, qidiruv (muammo bo'yicha), faol buyurtmalar, ko'p so'raladigan
// muammolar, 6 xizmat, "Hozir kerak / Vaqtni tanlash", "Mening ustalarim". Xarita — "Xarita" bo'limida, o'zgarishsiz.
import { router } from 'expo-router';
import { ArrowRight, CalendarClock, ChevronDown, ChevronRight, MapPin, Search, ShieldCheck, Sparkles, Wrench, type LucideIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, TextInput, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, LogoMark, RatingBadge, Squish, Text } from '@/components/ui';
import { ActiveOrders } from '@/components/ui/ActiveOrders';
import { CALL_FEE, categories, getCategory, problems, WARRANTY_DAYS, type CategoryId } from '@/constants/categories';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatSchedule, formatSum, t } from '@/lib/i18n';
import { reverseGeocode } from '@/lib/location';
import { firstSlot } from '@/lib/schedule';
import { useMyLocation } from '@/lib/useMyLocation';
import { useFavoriteMaster } from '@/lib/around';
import { useOrder, useUser } from '@/store';

/** Ko'p so'raladigan muammolar (bir bosishda shu muammo tanlangan buyurtma ochiladi) */
const POPULAR = ['tap', 'socket', 'acCleaning', 'noPower', 'toilet', 'washer', 'assembly', 'clog'];
/** Bu muammolar nomi kategoriyasiz tushunarsiz ("Tozalash", "Yig'ish") — oldiga kategoriya qo'shiladi */
const GENERIC = new Set(['acCleaning', 'acInstall', 'assembly', 'furnitureFix', 'paint', 'tile', 'door', 'other']);
const BANNER_EVERY_MS = 5000;

const problemLabel = (id: string) => {
  const p = problems.find((x) => x.id === id);
  return p && GENERIC.has(id) ? `${t(`categories.${p.categoryId}`)}: ${t(`problems.${id}`)}` : t(`problems.${id}`);
};

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? t('home.helloNight') : h < 12 ? t('home.helloMorning') : h < 18 ? t('home.helloDay') : t('home.helloEvening');
}

export default function Home() {
  useScheme();
  const { phone, name } = useUser();
  const setLastLocation = useUser((s) => s.setLastLocation);
  const favorites = useUser((s) => s.favorites);
  const { address, setAddress, setDraft, reset, scheduledAt } = useOrder();
  const later = scheduledAt !== null;
  const [query, setQuery] = useState('');
  const scroll = useRef<ScrollView>(null);
  const servicesY = useRef(0);

  // Xarita ochilmasa ham manzil aniqlanadi (GPS → manzil nomi); xaritada surib aniqlashtirsa bo'ladi
  const me = useMyLocation();
  useEffect(() => {
    if (!me || useOrder.getState().address) return;
    reverseGeocode(me).then((n) => {
      if (!n || useOrder.getState().address) return;
      setAddress(n, me);
      setLastLocation(me, n);
    });
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (categoryId: CategoryId, problemId?: string, preferredMasterId: string | null = null) => {
    reset();
    const first = problems.find((p) => p.categoryId === categoryId)!;
    setDraft({ categoryId, problemId: problemId ?? first.id, preferredMasterId });
    router.push('/client/order');
  };

  // Qidiruv: muammo yoki xizmat nomi bo'yicha
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return problems
      .filter((p) => p.id !== 'other')
      .filter((p) => t(`problems.${p.id}`).toLowerCase().includes(q) || t(`categories.${p.categoryId}`).toLowerCase().includes(q))
      .slice(0, 6);
  }, [query]);

  // Eng oxirgi qo'shilgan sevimli usta (yangi foydalanuvchida — yo'q)
  const favorite = useFavoriteMaster(favorites);
  const displayName = name.trim() || (phone ? t('home.client') : t('home.guest'));

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView ref={scroll} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Profil egasi: bosilsa — Profil bo'limi */}
        <View style={styles.head}>
          <Squish accessibilityRole="button" accessibilityLabel={t('tabs.profile')} scaleTo={0.97} onPress={() => router.push('/client/account')} style={styles.me}>
            <Avatar initials={(name.trim()[0] ?? '?').toUpperCase()} size={48} solid={Boolean(phone)} />
            <View style={styles.flex}>
              <Text variant="small">{greeting()}</Text>
              <Text variant="h3" numberOfLines={1}>
                {displayName}
              </Text>
            </View>
          </Squish>
          {phone ? null : (
            <Squish accessibilityRole="button" onPress={() => router.push('/phone')} style={styles.signIn}>
              <Text style={styles.signInText}>{t('account.login')}</Text>
            </Squish>
          )}
          <Squish accessibilityRole="button" accessibilityLabel={t('about.title')} scaleTo={0.94} onPress={() => router.push('/about')} style={styles.logoBtn}>
            <LogoMark size={26} />
          </Squish>
        </View>

        {/* Manzil: bosilsa — qidiruv; "Xaritada" — xarita bo'limi */}
        <View style={styles.addrRow}>
          <Squish accessibilityRole="button" onPress={() => router.push('/client/address')} style={styles.addr}>
            <MapPin size={16} color={colors.accent} strokeWidth={2.4} />
            <Text style={styles.addrText} numberOfLines={1}>
              {address || t('home.pickAddress')}
            </Text>
            <ChevronDown size={16} color={colors.ink2} strokeWidth={2.4} />
          </Squish>
          <Squish accessibilityRole="button" onPress={() => router.push('/client/map')} style={styles.onMap}>
            <Text style={styles.onMapText}>{t('home.onMap')}</Text>
          </Squish>
        </View>

        <Banners
          onServices={() => scroll.current?.scrollTo({ y: servicesY.current - 12, animated: true })}
        />

        <Text variant="h2" style={styles.title}>
          {t('home.title')}
        </Text>
        <View style={styles.search}>
          <Search size={20} color={colors.ink2} strokeWidth={2.2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('home.searchPlaceholder')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('home.searchPlaceholder')}
            style={styles.searchInput}
          />
        </View>
        {query.trim() ? (
          <View style={styles.results}>
            {results.length ? (
              results.map((p) => {
                const c = getCategory(p.categoryId);
                return (
                  <Squish key={p.id} accessibilityRole="button" onPress={() => pick(p.categoryId, p.id)} style={styles.result}>
                    <View style={[styles.resultIcon, { backgroundColor: c.tint }]}>
                      <c.icon size={18} color={c.ink} strokeWidth={2.2} />
                    </View>
                    <View style={styles.flex}>
                      <Text variant="bodyBold" numberOfLines={1}>
                        {t(`problems.${p.id}`)}
                      </Text>
                      <Text variant="caption">{t(`categories.${p.categoryId}`)}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.ink2} strokeWidth={2.2} />
                  </Squish>
                );
              })
            ) : (
              <Text variant="small">{t('home.noResults')}</Text>
            )}
          </View>
        ) : null}

        <ActiveOrders />

        <Text variant="h3" style={styles.section}>
          {t('home.popular')}
        </Text>
        <View style={styles.chips}>
          {POPULAR.map((id) => {
            const p = problems.find((x) => x.id === id)!;
            const c = getCategory(p.categoryId);
            return (
              <Squish key={id} accessibilityRole="button" onPress={() => pick(p.categoryId, id)} style={[styles.chip, { backgroundColor: c.tint }]}>
                <c.icon size={16} color={c.ink} strokeWidth={2.4} />
                <Text style={[styles.chipText, { color: c.ink }]}>{problemLabel(id)}</Text>
              </Squish>
            );
          })}
        </View>

        <View onLayout={(e: LayoutChangeEvent) => (servicesY.current = e.nativeEvent.layout.y)}>
          <Text variant="h3" style={styles.section}>
            {t('home.services')}
          </Text>
        </View>
        <View style={styles.modes}>
          <Squish accessibilityRole="radio" accessibilityState={{ selected: !later }} onPress={() => setDraft({ scheduledAt: null })} style={[styles.mode, !later && styles.modeOn]}>
            <Text style={[styles.modeText, { color: !later ? colors.onPrimary : colors.ink2 }]}>{t('client.modeNow')}</Text>
          </Squish>
          <Squish
            accessibilityRole="radio"
            accessibilityState={{ selected: later }}
            onPress={() => setDraft({ scheduledAt: scheduledAt ?? firstSlot() })}
            style={[styles.mode, later && styles.modeOn]}
          >
            <CalendarClock size={16} color={later ? colors.onPrimary : colors.ink2} strokeWidth={2.4} />
            <Text style={[styles.modeText, { color: later ? colors.onPrimary : colors.ink2 }]} numberOfLines={1}>
              {later ? formatSchedule(scheduledAt) : t('client.modeLater')}
            </Text>
          </Squish>
        </View>
        <View style={styles.grid}>
          {categories.map((c) => (
            <Squish key={c.id} accessibilityRole="button" onPress={() => pick(c.id)} style={styles.tile}>
              <View style={[styles.tileIcon, { backgroundColor: c.tint }]}>
                <c.icon size={26} color={c.ink} strokeWidth={2} />
              </View>
              <Text style={styles.tileText} numberOfLines={2}>
                {t(`categories.${c.id}`)}
              </Text>
            </Squish>
          ))}
        </View>

        {favorite ? (
          <>
            <Text variant="h3" style={styles.section}>
              {t('client.myMasters')}
            </Text>
            <Squish accessibilityRole="button" onPress={() => pick(favorite.categories[0], undefined, favorite.id)} style={styles.fav}>
              <Avatar initials={favorite.initials} size={42} solid />
              <View style={styles.flex}>
                <Text variant="bodyBold" numberOfLines={1}>
                  {favorite.name}
                </Text>
                <View style={styles.favRow}>
                  <RatingBadge value={favorite.rating} />
                  <Text variant="caption">{t(`categories.${favorite.categories[0]}`)}</Text>
                </View>
              </View>
              <View style={styles.favCall}>
                <Text style={styles.favCallText}>{t('client.call')}</Text>
                <ChevronRight size={16} color={colors.primary} strokeWidth={2.6} />
              </View>
            </Squish>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type Slide = { key: string; bg: () => string; title: string; text: string; cta: string; icon: LucideIcon; onPress: () => void };

/** Aylanuvchi banner (har 5 s, surib ham almashtiriladi): chaqiruv narxi, kafolat, usta bo'lish */
function Banners({ onServices }: { onServices: () => void }) {
  useScheme();
  const [w, setW] = useState(0);
  const [index, setIndex] = useState(0);
  const ref = useRef<ScrollView>(null);
  const touching = useRef(false);
  const slides: Slide[] = [
    { key: 'fee', bg: () => colors.primary, title: t('home.bannerFeeTitle', { fee: formatSum(CALL_FEE).replace(/ /g, '\u00a0') }), text: t('home.bannerFeeText'), cta: t('home.bannerFeeCta'), icon: Sparkles, onPress: onServices },
    { key: 'warranty', bg: () => colors.bannerWarm, title: t('home.bannerWarrantyTitle', { days: WARRANTY_DAYS }), text: t('home.bannerWarrantyText'), cta: t('home.bannerMore'), icon: ShieldCheck, onPress: () => router.push('/about') },
    { key: 'master', bg: () => colors.bannerCool, title: t('home.bannerMasterTitle'), text: t('home.bannerMasterText'), cta: t('home.bannerMasterCta'), icon: Wrench, onPress: () => router.push('/client/account') },
  ];

  useEffect(() => {
    if (!w) return;
    const id = setInterval(() => {
      if (touching.current) return;
      setIndex((i) => {
        const next = (i + 1) % slides.length;
        ref.current?.scrollTo({ x: next * w, animated: true });
        return next;
      });
    }, BANNER_EVERY_MS);
    return () => clearInterval(id);
  }, [w, slides.length]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    touching.current = false;
    if (w) setIndex(Math.round(e.nativeEvent.contentOffset.x / w));
  };

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={styles.banners}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => (touching.current = true)}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        scrollEventThrottle={32}
      >
        {slides.map((s) => {
          const Icon = s.icon;
          return (
            <View key={s.key} style={{ width: w || 1 }}>
              <Squish accessibilityRole="button" scaleTo={0.98} onPress={s.onPress} style={[styles.banner, { backgroundColor: s.bg() }]}>
                {/* Bezak: o'ng tomonda katta ikonka yumshoq doiralar ichida */}
                <View pointerEvents="none" style={styles.decoBig} />
                <View pointerEvents="none" style={styles.decoSmall} />
                <View pointerEvents="none" style={styles.decoIcon}>
                  <Icon size={64} color="rgba(255,255,255,0.9)" strokeWidth={1.6} />
                </View>
                <View style={styles.bannerBody}>
                  <Text style={styles.bannerTitle}>{s.title}</Text>
                  <Text style={styles.bannerText}>{s.text}</Text>
                  <View style={styles.bannerCta}>
                    <Text style={styles.bannerCtaText}>{s.cta}</Text>
                    <ArrowRight size={16} color={colors.onPrimary} strokeWidth={2.6} />
                  </View>
                </View>
              </Squish>
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.dots}>
        {slides.map((s, i) => (
          <View key={s.key} style={[styles.dot, i === index && styles.dotOn]} />
        ))}
      </View>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 14 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  me: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  signIn: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center' },
  signInText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onPrimary },
  logoBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addr: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 19, backgroundColor: colors.surface },
  addrText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  onMap: { height: 38, paddingHorizontal: 12, borderRadius: 19, justifyContent: 'center', backgroundColor: colors.primarySoft },
  onMapText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  banners: { gap: 10 },
  banner: { height: 168, borderRadius: 24, overflow: 'hidden', padding: 18, justifyContent: 'center' },
  decoBig: { position: 'absolute', width: 210, height: 210, borderRadius: 105, right: -60, top: -40, backgroundColor: 'rgba(255,255,255,0.10)' },
  decoSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: 40, bottom: -50, backgroundColor: 'rgba(255,255,255,0.08)' },
  decoIcon: { position: 'absolute', right: 26, top: 0, bottom: 0, justifyContent: 'center' },
  bannerBody: { maxWidth: '68%', gap: 6, position: 'relative' },
  bannerTitle: { fontFamily: fonts.heavy, fontSize: 21, lineHeight: 26, color: colors.onPrimary },
  bannerText: { fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, color: 'rgba(255,255,255,0.88)' },
  bannerCta: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)' },
  bannerCtaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.onPrimary },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotOn: { width: 18, backgroundColor: colors.primary },
  title: { marginTop: 4 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: radius.field, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 14, height: 54 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, height: '100%', minWidth: 0 },
  results: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 8, gap: 2 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: 12 },
  resultIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: 19 },
  chipText: { fontFamily: fonts.bold, fontSize: 13.5 },
  modes: { flexDirection: 'row', backgroundColor: colors.field, borderRadius: 14, padding: 4, gap: 4 },
  mode: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  modeOn: { backgroundColor: colors.primary },
  modeText: { fontFamily: fonts.bold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31.4%', alignItems: 'center', gap: 8, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 6, borderRadius: radius.card, backgroundColor: colors.surface },
  tileIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 17, color: colors.ink, textAlign: 'center' },
  fav: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.card, backgroundColor: colors.surface },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favCall: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 10, paddingLeft: 6 },
  favCallText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.primary },
}));
