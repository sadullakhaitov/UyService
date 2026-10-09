import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { CalendarClock, Camera, FlaskConical, Info, MapPin, ShieldCheck, X } from 'lucide-react-native';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Divider, Row, ScreenHeader, Squish, Text } from '@/components/ui';
import { CALL_FEE, getCategory, problems, problemsOf, WARRANTY_DAYS } from '@/constants/categories';
import { colors, fonts, radius, shadow, themed, useScheme } from '@/constants/theme';
import { formatRange, formatSchedule, formatSum, t } from '@/lib/i18n';
import { notice } from '@/lib/dialog';
import { askNotifications } from '@/lib/notify';
import { isOnline } from '@/lib/useOnline';
import { DEMO } from '@/lib/demo';
import { firstSlot, slotStillValid } from '@/lib/schedule';
import { SchedulePicker } from '@/components/order/SchedulePicker';
import { emptyDetails, useOrder, useOrders, useUser, type AddressDetails } from '@/store';
import { GlassBg } from '@/components/ui/Glass';
import { pickImages } from '@/lib/photos';
import { LIVE, liveCreateOrder } from '@/lib/live';
import { track } from '@/lib/track';

const MAX_PHOTOS = 3;

export default function OrderScreen() {
  useScheme();
  const { categoryId, problemId, description, photos, address, setDraft, scheduledAt, details } = useOrder();
  const create = useOrders((s) => s.create);
  const phone = useUser((s) => s.phone);
  const { autoSubmit } = useLocalSearchParams<{ autoSubmit?: string }>();
  const category = getCategory(categoryId);
  const list = [...problemsOf(categoryId).map((p) => p.id), 'other'];
  const problem = problems.find((p) => p.id === problemId);

  useEffect(() => track('order_open', { category: categoryId }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Xuddi shu manzilga oldin buyurtma berilgan bo'lsa — podyezd/qavat/xonadon o'zi to'ldiriladi
  useEffect(() => {
    const saved = useUser.getState().savedDetails;
    const empty = !Object.values(useOrder.getState().details).some(Boolean);
    if (empty && saved && saved.address === address) {
      const { address: _a, ...d } = saved;
      setDraft({ details: d });
    }
  }, [address]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ikki marta tez bosilsa ikkita buyurtma yaratilmasin
  const [submitting, setSubmitting] = useState(false);
  const busy = useRef(false);

  const addPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const uris = await pickImages(MAX_PHOTOS - photos.length);
    if (uris.length) setDraft({ photos: [...photos, ...uris].slice(0, MAX_PHOTOS) });
  };

  const submit = async () => {
    if (busy.current) return;
    // Manzil hali aniqlanmagan (GPS qidirilmoqda yoki ruxsat yo'q) — buyurtma noto'g'ri joyga ketmasin
    if (!useOrder.getState().address) {
      notice(t('order.noAddressTitle'), t('order.noAddressText'));
      router.push('/client/address');
      return;
    }
    // Rejalashtirilgan vaqt eskirgan bo'lsa (sahifa uzoq ochiq turgan) — eng yaqin mumkin bo'lgan vaqtga
    if (scheduledAt !== null && !slotStillValid(scheduledAt)) {
      const next = firstSlot();
      setDraft({ scheduledAt: next });
      notice(t('schedule.staleTitle'), t('schedule.staleText', { time: formatSchedule(next) }));
      return;
    }
    busy.current = true;
    setSubmitting(true);
    // Internet yo'q — buyurtma ustaga yetib bormaydi
    const online = await isOnline();
    busy.current = false;
    setSubmitting(false);
    if (!online) {
      notice(t('offline.title'), t('offline.cantOrder'));
      return;
    }
    // Ro'yxatdan faqat shu yerda o'tiladi: mijoz hamma narsani tanlab bo'lgach
    if (!phone) {
      router.push('/phone?next=order');
      return;
    }
    askNotifications();
    track('order_submit', { category: categoryId });
    busy.current = true;
    let serverId: string | undefined;
    if (LIVE) {
      setSubmitting(true);
      try {
        serverId = await liveCreateOrder(useOrder.getState());
      } catch (e) {
        busy.current = false;
        setSubmitting(false);
        // Sessiya yo'q (muddati o'tgan yoki boshqa joyda chiqilgan) — raqamni qayta tasdiqlaymiz, keyin o'zi yuboriladi
        if (e instanceof Error && e.message === 'not_signed_in') {
          useUser.getState().setPhone('');
          router.push('/phone?next=order');
          return;
        }
        const reason = e instanceof Error ? e.message : String(e);
        // Server chegaralari (suiiste'mollikdan himoya) va bloklangan mijoz — tushunarli matn
        const limit = ['too_many_active', 'too_many_today', 'no_show_limit'].find((k) => reason.includes(k));
        const blocked = reason.includes('row-level security');
        track('order_failed', { reason: limit ?? (blocked ? 'blocked' : 'error') });
        if (limit || blocked) notice(t('order.sendFailedTitle'), t(`order.limits.${limit ?? 'blocked'}`));
        else notice(t('order.sendFailedTitle'), `${t('order.sendFailedText')}\n\n${reason}`);
        return;
      }
      setSubmitting(false);
    }
    track('order_created', { category: categoryId, scheduled: scheduledAt !== null });
    const id = create(serverId);
    if (scheduledAt !== null) setDraft({ scheduledAt: null }); // keyingi buyurtma yana "Hozir kerak"
    useUser.getState().setSavedDetails(Object.values(details).some(Boolean) ? { ...details, address } : null);
    router.replace(`/client/searching?id=${id}`);
  };

  // Raqam tasdiqlanib qaytilganda — buyurtma avtomatik yuboriladi
  useEffect(() => {
    if (autoSubmit && phone) submit();
  }, [autoSubmit, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader
        kicker={t('order.category')}
        title={t(`categories.${categoryId}`)}
        right={
          <View style={[styles.catBadge, { backgroundColor: category.tint }]}>
            <category.icon size={24} color={category.ink} strokeWidth={2.2} />
          </View>
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          {scheduledAt !== null ? <SchedulePicker value={scheduledAt} onChange={(v) => setDraft({ scheduledAt: v })} color={category.main} onColor={category.onMain} /> : null}

          <View style={styles.section}>
            <Text variant="h3">{t('order.problemTitle')}</Text>
            <View style={styles.chips}>
              {list.map((id) => (
                <Chip key={id} label={t(`problems.${id}`)} selected={id === problemId} onPress={() => setDraft({ problemId: id })} color={category.main} onColor={category.onMain} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="h3">{t('order.detailsTitle')}</Text>
            <TextInput
              multiline
              value={description}
              onChangeText={(v) => setDraft({ description: v })}
              placeholder={t('order.detailsPlaceholder')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t('order.detailsTitle')}
              maxLength={500}
              style={styles.textarea}
              textAlignVertical="top"
            />
            <View style={styles.photos}>
              {photos.length < MAX_PHOTOS ? (
                <Squish accessibilityRole="button" accessibilityLabel={t('order.addPhoto')} onPress={addPhoto} style={styles.addPhoto}>
                  <Camera size={24} color={category.ink} strokeWidth={2} />
                </Squish>
              ) : null}
              {photos.map((uri, i) => (
                <View key={`${i}-${uri}`} style={styles.photo}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('order.removePhoto')}
                    hitSlop={12}
                    onPress={() => setDraft({ photos: photos.filter((_, k) => k !== i) })}
                    style={styles.remove}
                  >
                    <X size={12} color={colors.onPrimary} strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Text variant="caption">{t('order.photoHint')}</Text>
          </View>

          <AddressSection address={address} details={details} onChange={(d) => setDraft({ details: d })} />

          <Card>
            <Row label={t('order.callFee')} value={formatSum(category.callFee)} />
            <Row
              label={t('order.estimate')}
              value={formatRange(problem?.priceMin != null ? Math.max(problem.priceMin, CALL_FEE) : null, problem?.priceMax ?? null)}
            />
            <Divider />
            {/* Chaqiruv qoidasi — odamning eng katta savoli "narx ma'qul kelmasa nima bo'ladi?" */}
            <View style={styles.note}>
              <Info size={18} color={category.ink} strokeWidth={2.2} />
              <Text variant="small" style={styles.flex}>
                {t('order.feeRule', { fee: formatSum(CALL_FEE) })}
              </Text>
            </View>
            <View style={styles.note}>
              <ShieldCheck size={18} color={category.ink} strokeWidth={2.2} />
              <Text variant="small" style={styles.flex}>
                {t('order.guarantee', { days: WARRANTY_DAYS })}
              </Text>
            </View>
          </Card>

          {DEMO ? (
            <View style={styles.demo}>
              <FlaskConical size={18} color={colors.accentInk} strokeWidth={2.2} />
              <Text variant="small" style={[styles.flex, { color: colors.accentInk }]}>
                {t('demo.orderNote')}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={[styles.bottom, shadow.sheet]}>
        <GlassBg radius={{ tl: radius.sheet, tr: radius.sheet, bl: 0, br: 0 }} strong />
        <View style={styles.where}>
          <MapPin size={16} color={colors.accent} strokeWidth={2.4} />
          <Text variant="small" numberOfLines={1} style={styles.flex}>
            {address || t('client.mapPoint')} · {scheduledAt !== null ? `${formatSchedule(scheduledAt)} · ` : ''}{t('common.cash')}
          </Text>
        </View>
        <Button title={scheduledAt !== null ? t('schedule.submit') : t('order.submit')} big loading={submitting} color={{ bg: category.main, fg: category.onMain }} onPress={submit} />
      </SafeAreaView>
    </SafeAreaView>
  );
}

// Manzil va uy tafsiloti: podyezd, qavat, xonadon, domofon, mo'ljal (ixtiyoriy; usta qabul qilgach ko'radi)
function AddressSection({ address, details, onChange }: { address: string; details: AddressDetails; onChange: (d: AddressDetails) => void }) {
  useScheme();
  const set = (k: keyof AddressDetails) => (v: string) => onChange({ ...details, [k]: v });
  const field = (k: keyof AddressDetails, numeric?: boolean) => (
    <View style={styles.detailCell}>
      <Text variant="caption" numberOfLines={1} style={styles.detailLabel}>
        {t(`address.${k}`)}
      </Text>
      <TextInput
        value={details[k]}
        onChangeText={set(k)}
        maxLength={12}
        keyboardType={numeric ? 'number-pad' : 'default'}
        accessibilityLabel={t(`address.${k}`)}
        style={styles.detailInput}
      />
    </View>
  );
  return (
    <View style={styles.section}>
      <Text variant="h3">{t('address.detailsTitle')}</Text>
      <Squish accessibilityRole="button" onPress={() => router.push('/client/address')} style={styles.addrRow}>
        <MapPin size={18} color={colors.accent} strokeWidth={2.4} />
        <Text variant="bodyBold" numberOfLines={2} style={styles.flex}>
          {address || t('client.mapPoint')}
        </Text>
        <Text style={styles.addrChange}>{t('address.change')}</Text>
      </Squish>
      <View style={styles.detailGrid}>
        {field('entrance', true)}
        {field('floor', true)}
        {field('apartment')}
        {field('intercom')}
      </View>
      <View style={styles.detailWide}>
        <Text variant="caption" numberOfLines={1} style={styles.detailLabel}>
          {t('address.landmark')}
        </Text>
        <TextInput
          value={details.landmark}
          onChangeText={set('landmark')}
          maxLength={120}
          placeholder={t('address.landmarkPlaceholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('address.landmark')}
          style={styles.detailInput}
        />
      </View>
      <Text variant="caption">{t('address.detailsHint')}</Text>
    </View>
  );
}

const styles = themed(() => ({
  addrRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  addrChange: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  // 2 × 2: har ustun teng, yorliqlar bir qatorda (uzun yorliq — qisqartiriladi), maydonlar bir chiziqda
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 12 },
  detailCell: { width: '47%', flexGrow: 1, gap: 6 },
  detailWide: { gap: 6 },
  detailLabel: { paddingLeft: 2 },
  detailInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  catBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 22 },
  section: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textarea: {
    minHeight: 92,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    paddingTop: 12,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  demo: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.card, backgroundColor: colors.accentSoft },
  photos: { flexDirection: 'row', gap: 8 },
  addPhoto: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.dashed,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: 68, height: 68, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.mapBlock },
  remove: { position: 'absolute', top: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bottom: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 12, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  where: { flexDirection: 'row', alignItems: 'center', gap: 8 },
}));
