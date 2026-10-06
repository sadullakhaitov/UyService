import { router } from 'expo-router';
import { Clock, MapPin, Navigation } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Divider, Row, Text } from '@/components/ui';
import { CountdownRing } from '@/components/ui/CountdownRing';
import { getCategory, problems } from '@/constants/categories';
import { DISPATCH } from '@/constants/dispatch';
import { colors, fonts, radius } from '@/constants/theme';
import { formatRange, formatSum, t } from '@/lib/i18n';
import { mockOffer } from '@/mocks';
import { useMaster } from '@/store';

export default function Offer() {
  const bump = useMaster((s) => s.bumpActivity);
  const cat = getCategory(mockOffer.categoryId);
  const problem = problems.find((p) => p.id === mockOffer.problemId);
  const Icon = cat.icon;

  const accept = () => {
    bump(DISPATCH.activity.accepted);
    router.replace('/master/job');
  };
  const decline = () => {
    bump(DISPATCH.activity.declinedOrExpired);
    router.back();
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
        <CountdownRing seconds={DISPATCH.offerTimeoutSec} label={t('offer.seconds')} onDone={decline} color={cat.main} />

        <View style={styles.what}>
          <View style={[styles.icon, { backgroundColor: cat.tint }]}>
            <Icon size={30} color={cat.ink} strokeWidth={2} />
          </View>
          <Text variant="h1" style={styles.centerText}>
            {t(`problems.${mockOffer.problemId}`)}
          </Text>
          <Text variant="small" style={styles.centerText}>
            {t(`categories.${mockOffer.categoryId}`)} · {mockOffer.description}
          </Text>
        </View>

        <View style={styles.chips}>
          <Meta icon={<Navigation size={16} color={colors.primary} strokeWidth={2.4} />} label={t('common.km', { value: mockOffer.distanceKm })} />
          <Meta icon={<Clock size={16} color={colors.primary} strokeWidth={2.4} />} label={t('common.min', { value: mockOffer.etaMin })} />
        </View>

        <Card style={styles.card}>
          <View style={styles.addr}>
            <MapPin size={18} color={colors.accent} strokeWidth={2.4} />
            <Text variant="bodyBold" style={styles.flex}>
              {mockOffer.address}
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

const styles = StyleSheet.create({
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
});
