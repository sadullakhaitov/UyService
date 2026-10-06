import { router } from 'expo-router';
import { Clock, MapPin, Navigation } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Divider, Row, Text } from '@/components/ui';
import { CountdownRing } from '@/components/ui/CountdownRing';
import { getCategory, problems } from '@/constants/categories';
import { DISPATCH } from '@/constants/dispatch';
import { colors, fonts, radius, themed } from '@/constants/theme';
import { formatRange, formatSum, t } from '@/lib/i18n';
import { useMaster, useMasterWork } from '@/store';

export default function Offer() {
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
  if (!offer) return null;

  const cat = getCategory(offer.categoryId);
  const problem = problems.find((p) => p.id === offer.problemId);
  const Icon = cat.icon;

  const accept = () => {
    accepted.current = true;
    bump(DISPATCH.activity.accepted);
    acceptOffer();
    router.replace('/master/job');
  };
  // Rad etish yoki 60 s o'tib ketishi — aktivlik −5, taklif keyingi ustaga o'tadi
  const decline = () => {
    bump(DISPATCH.activity.declinedOrExpired);
    setOffer(null);
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.head}>
        <View style={styles.newBadge}>
          <View style={styles.newDot} />
          <Text style={styles.newText}>{t('offer.title')}</Text>
        </View>
      </View>

      <View style={styles.body}>
        <CountdownRing seconds={left} label={t('offer.seconds')} onDone={decline} color={cat.main} />

        <View style={styles.what}>
          <View style={[styles.icon, { backgroundColor: cat.tint }]}>
            <Icon size={30} color={cat.ink} strokeWidth={2} />
          </View>
          <Text variant="h1" style={styles.centerText}>
            {t(`problems.${offer.problemId}`)}
          </Text>
          <Text variant="small" style={styles.centerText}>
            {t(`categories.${offer.categoryId}`)} · {offer.description}
          </Text>
        </View>

        <View style={styles.chips}>
          <Meta icon={<Navigation size={16} color={colors.primary} strokeWidth={2.4} />} label={t('common.km', { value: offer.distanceKm })} />
          <Meta icon={<Clock size={16} color={colors.primary} strokeWidth={2.4} />} label={t('common.min', { value: offer.etaMin })} />
        </View>

        <Card style={styles.card}>
          <Row label={t('job.client')} value={offer.clientName} />
          <View style={styles.addr}>
            <MapPin size={18} color={colors.accent} strokeWidth={2.4} />
            <Text variant="bodyBold" style={styles.flex}>
              {offer.address}
            </Text>
          </View>
          <Divider />
          <Row label={t('offer.callFee')} value={formatSum(cat.callFee)} />
          <Row label={t('offer.estimate')} value={formatRange(problem?.priceMin ?? null, problem?.priceMax ?? null)} />
        </Card>
      </View>

      <View style={styles.bottom}>
        <Button title={t('offer.accept')} big color={{ bg: cat.main, fg: cat.onMain }} onPress={accept} />
        <Button title={t('offer.decline')} kind="secondary" onPress={decline} />
        <Text variant="caption" style={styles.centerText}>
          {t('offer.declineNote')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function Meta({ icon, label }: { icon: React.ReactNode; label: string }) {
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
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, gap: 18 },
  what: { alignItems: 'center', gap: 8 },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  centerText: { textAlign: 'center' },
  chips: { flexDirection: 'row', gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.primarySoft },
  metaText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  card: { alignSelf: 'stretch', borderRadius: radius.card },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottom: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
}));
