import { router } from 'expo-router';
import { ChevronRight, Star, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ScreenHeader, Squish, Text } from '@/components/ui';
import { BILLING } from '@/constants/billing';
import { colors, fonts, radius } from '@/constants/theme';
import { formatNumber, formatSum, t } from '@/lib/i18n';
import { mockMasterSelf } from '@/mocks';
import { useMaster, useUser } from '@/store';

const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
type Period = 'day' | 'week' | 'month';

export default function Earnings() {
  const [period, setPeriod] = useState<Period>('week');
  const activity = useMaster((s) => s.activity);
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const m = mockMasterSelf;
  const weekSum = m.week.reduce((a, b) => a + b, 0);
  const amount = period === 'day' ? m.todayIncome : period === 'week' ? weekSum : m.monthIncome;
  const max = Math.max(...m.week);
  const today = 5;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader title={t('earnings.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.tabs}>
          {(['day', 'week', 'month'] as const).map((p) => (
            <Squish
              key={p}
              accessibilityRole="tab"
              accessibilityState={{ selected: period === p }}
              onPress={() => setPeriod(p)}
              style={[styles.tab, period === p && styles.tabOn]}
            >
              <Text style={[styles.tabText, period === p && { color: colors.onPrimary }]}>{t(`earnings.${p}`)}</Text>
            </Squish>
          ))}
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroKicker}>{t(`earnings.${period}`)}</Text>
          <Text style={styles.heroValue}>{formatSum(amount)}</Text>
          <View style={styles.chart}>
            {m.week.map((v, i) => (
              <View key={i} style={styles.col}>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { height: `${Math.max(4, (v / max) * 100)}%`, backgroundColor: i === today ? colors.accent : 'rgba(255,255,255,0.85)' }]} />
                </View>
                <Text style={styles.day}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.stats}>
          <Card style={styles.stat}>
            <TrendingUp size={18} color={colors.primary} strokeWidth={2.4} />
            <Text style={styles.statValue}>{period === 'day' ? m.todayJobs : period === 'week' ? m.weekJobs : 58}</Text>
            <Text variant="caption">{t('earnings.jobs')}</Text>
          </Card>
          <Card style={styles.stat}>
            <Star size={18} color={colors.accent} fill={colors.accent} />
            <Text style={styles.statValue}>{m.rating.toFixed(1)}</Text>
            <Text variant="caption">{t('earnings.rating')}</Text>
          </Card>
        </View>

        <Card>
          <View style={styles.rowBetween}>
            <Text variant="bodyBold">{t('earnings.activity')}</Text>
            <Text style={styles.statValue}>{activity} / 100</Text>
          </View>
          <View style={styles.meter}>
            <View style={[styles.meterFill, { width: `${activity}%` }]} />
          </View>
          <Text variant="caption">{t('earnings.activityHint')}</Text>
        </Card>

        <Squish accessibilityRole="button" onPress={() => router.push('/master/plan')} style={styles.plan}>
          <View style={styles.flex}>
            <Text variant="caption">{t('earnings.currentPlan')}</Text>
            <Text variant="bodyBold">
              {plan === 'subscription'
                ? `${t('plan.subscription')} · ${formatNumber(BILLING.subscription.monthlyFee)} so'm/oy`
                : `${t('plan.commission')} · ${BILLING.commission.commissionPercent}%`}
            </Text>
          </View>
          <Text style={styles.change}>{t('earnings.changePlan')}</Text>
          <ChevronRight size={18} color={colors.primary} />
        </Squish>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 14 },
  tabs: { flexDirection: 'row', backgroundColor: colors.field, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, height: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  hero: { backgroundColor: colors.primary, borderRadius: 22, padding: 18, gap: 4 },
  heroKicker: { fontFamily: fonts.medium, fontSize: 13, color: '#CFE5DD' },
  heroValue: { fontFamily: fonts.heavy, fontSize: 30, color: colors.onPrimary },
  chart: { flexDirection: 'row', gap: 8, height: 120, marginTop: 14 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  day: { fontFamily: fonts.medium, fontSize: 11, color: '#CFE5DD' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4 },
  statValue: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meter: { height: 8, borderRadius: 4, backgroundColor: colors.line, overflow: 'hidden' },
  meterFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  change: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
