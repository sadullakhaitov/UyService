import { router, useFocusEffect } from 'expo-router';
import { CalendarClock, ChevronRight, LocateFixed, MapPin, ReceiptText, Search, User } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CenterPin, MapBase, type MapHandle } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { Avatar, IconButton, Logo, RatingBadge, Squish, Text } from '@/components/ui';
import { ActiveOrders } from '@/components/ui/ActiveOrders';
import { categories, problems, type CategoryId } from '@/constants/categories';
import { colors, fonts, radius, shadow, themed } from '@/constants/theme';
import { blur, distanceKm, type LatLng } from '@/lib/geo';
import { formatSchedule, t } from '@/lib/i18n';
import { firstSlot } from '@/lib/schedule';
import { getCurrentLocation, reverseGeocode } from '@/lib/location';
import { estimateEtaMin } from '@/lib/routes';
import { useMyLocation } from '@/lib/useMyLocation';
import { mastersAround, mockMasters, TASHKENT_CENTER } from '@/mocks';
import { useOrder, useUser } from '@/store';

export default function ClientHome() {
  const insets = useSafeAreaInsets();
  const [sheetH, setSheetH] = useState(520);
  const [moving, setMoving] = useState(false);
  const [query, setQuery] = useState('');
  const { address, location, setAddress, setDraft, reset, scheduledAt } = useOrder();
  const later = scheduledAt !== null;
  const favorites = useUser((s) => s.favorites);
  const [initial] = useState<LatLng>(location);
  const map = useRef<MapHandle>(null);
  const me = useMyLocation();
  const userMoved = useRef(false);

  const around = useMemo(() => mastersAround(location).filter((m) => distanceKm(m.location, location) < 3), [location]);
  const nearby = useMemo(() => around.map((m) => blur(m.location)), [around]);
  // Pin ustida: eng yaqin ustagacha taxminiy vaqt (Yandex'dagidek)
  const etaLabel = around.length
    ? t('client.etaBubble', { min: Math.min(...around.map((m) => estimateEtaMin(m.location, location))) })
    : undefined;

  // Xarita hozir ko'rsatayotgan joy — manzil qidiruvdan tanlansa, xarita o'sha yerga uchadi
  const shownAt = useRef<LatLng>(location);
  useFocusEffect(
    useCallback(() => {
      const p = useOrder.getState().location;
      if (distanceKm(p, shownAt.current) > 0.02) {
        userMoved.current = true;
        shownAt.current = p;
        map.current?.flyTo(p, 16);
      }
    }, []),
  );

  const goTo = async (p: LatLng) => {
    shownAt.current = p;
    map.current?.flyTo(p, 16);
    const name = await reverseGeocode(p);
    setAddress(name ?? t('client.myLocation'), p);
  };

  // Ilova ochilganda — telefonning haqiqiy joyiga uchib boradi (foydalanuvchi o'zi surmagan bo'lsa)
  useEffect(() => {
    if (me && !userMoved.current) goTo(me);
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        t(`categories.${c.id}`).toLowerCase().includes(q) ||
        problems.some((p) => p.categoryId === c.id && t(`problems.${p.id}`).toLowerCase().includes(q)),
    );
  }, [query]);

  const favorite = mockMasters.find((m) => favorites.includes(m.id));

  const pick = (categoryId: CategoryId, preferredMasterId: string | null = null) => {
    reset();
    const first = problems.find((p) => p.categoryId === categoryId)!;
    setDraft({ categoryId, problemId: first.id, preferredMasterId });
    router.push('/client/order');
  };

  const onMoveEnd = async (c: LatLng) => {
    setMoving(false);
    shownAt.current = c;
    const name = await reverseGeocode(c);
    setAddress(name ?? address, c);
  };

  // "Mening joyim" tugmasi: har bosilganda GPS qayta olinadi va kamera aniq joyga qaytadi
  const locate = async () => {
    const here = (await getCurrentLocation()) ?? me;
    if (here) goTo(here);
  };

  const topH = insets.top + 76;

  return (
    <View style={styles.root}>
      <MapBase
        ref={map}
        center={initial}
        userLocation={me}
        flyFrom={TASHKENT_CENTER}
        insets={{ top: topH, bottom: sheetH }}
        nearby={nearby}
        onMoveStart={() => {
          userMoved.current = true;
          Keyboard.dismiss();
          setMoving(true);
        }}
        onMoveEnd={onMoveEnd}
        overlay={<CenterPin lifted={moving} label={etaLabel} />}
      />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={[styles.logoPill, shadow.float]}>
          <Logo size={15} />
        </View>
        <View style={styles.topRight}>
          <IconButton icon={ReceiptText} label={t('client.history')} floating onPress={() => router.push('/client/history')} />
          <IconButton icon={User} label={t('common.profile')} floating onPress={() => router.push('/client/account')} />
        </View>
      </View>

      <IconButton
        icon={LocateFixed}
        label={t('client.address')}
        floating
        onPress={locate}
        style={[styles.locate, { bottom: sheetH + 12 }]}
      />

      <Sheet onHeight={setSheetH}>
        <ActiveOrders />
        <Squish accessibilityRole="button" scaleTo={0.98} onPress={() => router.push('/client/address')} style={styles.address}>
          <View style={styles.addrIcon}>
            <MapPin size={18} color={colors.accent} strokeWidth={2.4} />
          </View>
          <View style={styles.flex}>
            <Text variant="caption">{t('client.address')}</Text>
            <Text variant="bodyBold" numberOfLines={1}>
              {moving ? t('client.addressMoving') : address}
            </Text>
          </View>
          <View style={styles.online}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>{t('client.nearbyOnline', { count: nearby.length })}</Text>
          </View>
        </Squish>

        <View style={styles.search}>
          <Search size={20} color={colors.ink2} strokeWidth={2.2} />
          <BottomSheetTextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('client.searchPlaceholder')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('client.searchPlaceholder')}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.modes}>
          <Squish
            accessibilityRole="radio"
            accessibilityState={{ selected: !later }}
            onPress={() => setDraft({ scheduledAt: null })}
            style={[styles.mode, !later && styles.modeOn]}
          >
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
          {shown.map((c) => {
            const Icon = c.icon;
            return (
              <Squish key={c.id} accessibilityRole="button" onPress={() => pick(c.id)} style={[styles.tile, { backgroundColor: c.tint }]}>
                <Icon size={28} color={c.ink} strokeWidth={2} />
                <Text style={styles.tileText} numberOfLines={1}>
                  {t(`categories.${c.id}`)}
                </Text>
              </Squish>
            );
          })}
        </View>

        {favorite ? (
          <Squish accessibilityRole="button" onPress={() => pick(favorite.categories[0], favorite.id)} style={styles.fav}>
            <Avatar initials={favorite.initials} size={42} solid />
            <View style={styles.flex}>
              <Text variant="caption">
                {t('client.myMasters')} · {t(`categories.${favorite.categories[0]}`)}
              </Text>
              <View style={styles.favRow}>
                <Text variant="bodyBold" numberOfLines={1}>
                  {favorite.name.split(' ')[0]} aka
                </Text>
                <RatingBadge value={favorite.rating} />
              </View>
            </View>
            <View style={styles.favCall}>
              <Text style={styles.favCallText}>{t('client.call')}</Text>
              <ChevronRight size={16} color={colors.primary} strokeWidth={2.6} />
            </View>
          </Squish>
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topRight: { flexDirection: 'row', gap: 10 },
  logoPill: { backgroundColor: colors.surface, paddingHorizontal: 14, height: 44, borderRadius: 14, justifyContent: 'center' },
  locate: { position: 'absolute', right: 16 },
  address: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addrIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  online: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: colors.primarySoft },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  onlineText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.primary },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.field, borderRadius: radius.field, paddingHorizontal: 14, height: 52 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, height: '100%' },
  modes: { flexDirection: 'row', backgroundColor: colors.field, borderRadius: 14, padding: 4, gap: 4 },
  mode: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  modeOn: { backgroundColor: colors.primary },
  modeText: { fontFamily: fonts.bold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31.4%',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderRadius: radius.tile,
  },
  tileText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  fav: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.tile, borderWidth: 1.5, borderColor: colors.line },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favCall: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 10, paddingLeft: 6 },
  favCallText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.primary },
}));
