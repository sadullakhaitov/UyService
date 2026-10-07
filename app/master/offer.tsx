import { router } from 'expo-router';
import { Clock, Lock, Navigation } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Divider, Row, Text } from '@/components/ui';
import { CountdownRing } from '@/components/ui/CountdownRing';
import { getCategory, problems } from '@/constants/categories';
import { feePercent } from '@/constants/billing';
import { DISPATCH } from '@/constants/dispatch';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatRange, formatSum, t } from '@/lib/i18n';
import { useMaster, useMasterWork, useUser } from '@/store';
import { LIVE, liveRespondOffer } from '@/lib/live';
import { notice } from '@/lib/dialog';

export default function Offer() {
  useScheme();
  const bump = useMaster((s) => s.bumpActivity);
  const offer = useMasterWork((s) => s.offer);
  const { setOffer, acceptOffer } = useMasterWork();
  // Taymer taklif yuborilgan paytdan hisoblanadi (bildirishnoma orqali kech ochilsa ham)
  const [left] = useState(() => (offer ? Math.max(1, DISPATCH.offerTimeoutSec - Math.floor((Date.now() - offer.sentAt) / 1000)) : 0));

  // Taklif yopildi (rad etildi / vaqt o'tdi) — ekran yopiladi. Qabul qilinganda esa ish ekraniga o'tamiz
  const accepted = useRef(false);
  useEffect(() => {
    if (!offer && !accepted.current) router.canGoBack() ? router.back() : router.replace('/master');
  }, [offer]);
  // Past ekranlarda (telefon brauzeri — manzil satri va pastki panel joy egallaydi) — ixchamroq
  const { height } = useWindowDimensions();
  const compact = height < 760;
  // Juda past (telefon brauzeri / Telegram ichida ~500 px): belgi va sarlavha kichikroq, tugmalar yonma-yon —
  // hammasi aylantirmasdan sig'adi, karta tugmalar ostida qolib ketmaydi
  const tiny = height < 640;
  if (!offer) return null;

  const cat = getCategory(offer.categoryId);
  const problem = problems.find((p) => p.id === offer.problemId);
  const Icon = cat.icon;

  const accept = async () => {
    accepted.current = true;
    if (LIVE) {
      // Server tasdiqlaydi (taklif hali ochiqmi); mijoz ismi, manzili va ulush foizi shundan keyin keladi
      if (await liveRespondOffer(true)) router.replace('/master/job');
      else notice(t('offer.goneTitle'), t('offer.goneText'));
      return;
    }
    bump(DISPATCH.activity.accepted);
    // Ulush qabul paytidagi tarif bo'yicha qotiriladi (keyin tarif almashtirilsa ham shu ish uchun o'zgarmaydi)
    const { verified } = useMaster.getState();
    acceptOffer(feePercent(useUser.getState().billingPlan ?? 'commission', verified));
    router.replace('/master/job');
  };
  // Rad etish yoki 60 s o'tib ketishi — aktivlik −5, taklif keyingi ustaga o'tadi
  const decline = () => {
    if (LIVE) return void liveRespondOffer(false);
    bump(DISPATCH.activity.declinedOrExpired);
    setOffer(null);
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Juda past ekranda yorliq yashiriladi — halqa va sarlavha yetarli, joy kartaga qoladi */}
      {tiny ? null : (
        <View style={styles.head}>
          <View style={styles.newBadge}>
            <View style={styles.newDot} />
            <Text style={styles.newText}>{t('offer.title')}</Text>
          </View>
        </View>
      )}

      {/* Kontent sig'masa — aylantiriladi (taymer belgini, tugmalar kartani to'smaydi) */}
      <ScrollView style={styles.flex} contentContainerStyle={[styles.body, compact && styles.bodyCompact, tiny && styles.bodyTiny]} showsVerticalScrollIndicator={false}>
        <CountdownRing seconds={left} size={tiny ? 96 : compact ? 104 : 132} label={t('offer.seconds')} onDone={decline} color={cat.main} />

        <View style={styles.what}>
          {tiny ? null : (
            <View style={[styles.icon, compact && styles.iconCompact, { backgroundColor: cat.tint }]}>
              <Icon size={30} color={cat.ink} strokeWidth={2} />
            </View>
          )}
          <Text variant={tiny ? 'h2' : 'h1'} style={styles.centerText}>
            {t(`problems.${offer.problemId}`)}
          </Text>
          <Text variant="small" style={styles.centerText} numberOfLines={tiny ? 2 : undefined}>
            {offer.description ? `${t(`categories.${offer.categoryId}`)} · ${offer.description}` : t(`categories.${offer.categoryId}`)}
          </Text>
        </View>

        <View style={styles.chips}>
          <Meta icon={<Navigation size={16} color={colors.primary} strokeWidth={2.4} />} label={t('common.km', { value: offer.distanceKm })} />
          <Meta icon={<Clock size={16} color={colors.primary} strokeWidth={2.4} />} label={t('common.min', { value: offer.etaMin })} />
        </View>

        <Card style={styles.card}>
          {/* Maxfiylik: mijozning ismi va aniq manzili faqat qabul qilingandan keyin ko'rinadi */}
          <View style={styles.addr}>
            <Lock size={16} color={colors.ink2} strokeWidth={2.4} />
            <Text variant="small" style={styles.flex}>
              {t('offer.addressHidden')}
            </Text>
          </View>
          <Divider />
          <Row label={t('offer.callFee')} value={formatSum(cat.callFee)} />
          <Row label={t('offer.estimate')} value={formatRange(problem?.priceMin ?? null, problem?.priceMax ?? null)} />
        </Card>
      </ScrollView>

      {tiny ? (
        <View style={[styles.bottom, styles.bottomTiny]}>
          <Button title={t('offer.decline')} kind="secondary" onPress={decline} style={styles.declineTiny} />
          <Button title={t('offer.accept')} big color={{ bg: cat.main, fg: cat.onMain }} onPress={accept} style={styles.flex} />
        </View>
      ) : (
        <View style={[styles.bottom, compact && styles.bottomLine]}>
          <Button title={t('offer.accept')} big color={{ bg: cat.main, fg: cat.onMain }} onPress={accept} />
          <Button title={t('offer.decline')} kind="secondary" onPress={decline} />
          <Text variant="caption" style={styles.centerText}>
            {t('offer.declineNote')}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

function Meta({ icon, label }: { icon: React.ReactNode; label: string }) {
  useScheme();
  return (
    <View style={styles.meta}>
      {icon}
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  head: { alignItems: 'center', paddingTop: 12 },
  newBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accentSoft, paddingHorizontal: 14, height: 34, borderRadius: 17 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  newText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.accentInk },
  body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 18 },
  bodyCompact: { gap: 12, paddingVertical: 10 },
  bodyTiny: { gap: 10, paddingVertical: 6 },
  what: { alignItems: 'center', gap: 8 },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  iconCompact: { width: 52, height: 52, borderRadius: 16 },
  centerText: { textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.primarySoft },
  metaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  card: { alignSelf: 'stretch', borderRadius: radius.card },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10, backgroundColor: colors.surface },
  // Kontent aylantirilsa — tugmalar paneli chiziq bilan ajraladi (karta tugmalar ostiga "kirib ketgandek" ko'rinmasin)
  bottomLine: { borderTopWidth: 1, borderTopColor: colors.line },
  bottomTiny: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.line },
  declineTiny: { width: 116, height: 56 },
}));
