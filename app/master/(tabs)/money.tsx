import { router } from 'expo-router';
import { ChevronRight, Headset, Lock, LockOpen, CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Squish, Text } from '@/components/ui';
import { BALANCE_LIMIT, BILLING } from '@/constants/billing';
import { colors, fonts, radius } from '@/constants/theme';
import { formatDate, formatSum, t } from '@/lib/i18n';
import { mockMasterSelf } from '@/mocks';
import { useMaster, useUser } from '@/store';

const DAY = 86_400_000;

// So'nggi 7 kun: sana raqami va o'sha kungi daromad (soxta)
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(Date.now() - (6 - i) * DAY);
  return { date: d, label: String(d.getDate()), income: mockMasterSelf.week[i] ?? 0 };
});

export default function Money() {
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const { balance, subscriptionUntil, todayIncome } = useMaster();
  const [sel, setSel] = useState(6);
  // Bugungi kun — haqiqiy (yakunlangan ishlardan), oldingilari soxta
  const day = sel === 6 ? { ...days[6], income: todayIncome } : days[sel];
  const ok = balance >= BALANCE_LIMIT;
  const subActive = subscriptionUntil > Date.now();
  const soon = () => Alert.alert(t('profile.soon'), t('money.topUpSoon'));

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.head}>
            <Text style={styles.title}>{t('money.title')}</Text>
            <Squish accessibilityRole="button" onPress={() => router.push('/master/chat/support')} style={styles.support}>
              <Headset size={18} color={colors.onPrimary} strokeWidth={2.4} />
              <Text style={styles.supportText}>{t('money.support')}</Text>
            </Squish>
          </View>

          <View style={styles.amountBlock}>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
              {formatSum(day.income)}
            </Text>
            <Text variant="bodyBold">{sel === 6 ? t('money.today') : formatDate(day.date)}</Text>
          </View>
          <View style={styles.amountRow}>
            <View style={styles.days}>
              {days.map((d, i) => (
                <Pressable key={d.label} accessibilityRole="button" accessibilityState={{ selected: i === sel }} onPress={() => setSel(i)} hitSlop={6} style={styles.day}>
                  <View style={[styles.dayBar, i === sel && styles.dayBarOn]} />
                  <Text style={[styles.dayText, i === sel && styles.dayTextOn]}>{d.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Squish accessibilityRole="button" onPress={() => router.navigate('/master/profile')} style={styles.card}>
            <CalendarDays size={22} color={colors.primary} strokeWidth={2.2} />
            <View style={styles.flex}>
              <Text variant="bodyBold">{t('money.jobsCard')}</Text>
              <Text variant="small">{t('money.jobsCardSub', { count: mockMasterSelf.weekJobs })}</Text>
            </View>
            <ChevronRight size={20} color={colors.ink2} />
          </Squish>
        </View>

        <View style={styles.section}>
          {plan === 'commission' ? (
            <>
              <View style={[styles.limit, { backgroundColor: ok ? colors.successSoft : colors.dangerSoft }]}>
                <View style={[styles.lockIcon, { backgroundColor: ok ? '#CDEBD9' : '#F6CFC7' }]}>
                  {ok ? <LockOpen size={20} color={colors.success} strokeWidth={2.4} /> : <Lock size={20} color={colors.danger} strokeWidth={2.4} />}
                </View>
                <View style={styles.flex}>
                  <View style={styles.rowBetween}>
                    <Text variant="bodyBold">{t('money.limit')}</Text>
                    <Text variant="bodyBold">{formatSum(BALANCE_LIMIT)}</Text>
                  </View>
                  <Text variant="small" style={{ color: ok ? colors.success : colors.danger }}>
                    {ok ? t('money.limitOk') : t('money.limitLow')}
                  </Text>
                </View>
              </View>

              <View style={styles.balance}>
                <View style={styles.rowBetween}>
                  <Text variant="h3">{t('money.balance')}</Text>
                  <Text style={styles.balanceValue}>{formatSum(balance)}</Text>
                </View>
                <Text variant="small">{t('money.commissionNote', { percent: BILLING.commission.commissionPercent })}</Text>
                <Button title={t('money.topUp')} onPress={soon} />
              </View>
            </>
          ) : (
            <View style={styles.balance}>
              <View style={styles.rowBetween}>
                <Text variant="h3">{t('money.subscription')}</Text>
                <Text style={[styles.balanceValue, { fontSize: 18, color: subActive ? colors.success : colors.danger }]}>
                  {subActive ? t('money.subscriptionActive', { date: formatDate(new Date(subscriptionUntil)) }) : t('money.subscriptionExpired')}
                </Text>
              </View>
              <Text variant="small">{t('plan.subscriptionPrice', { price: formatSum(BILLING.subscription.monthlyFee) })}</Text>
              <Button title={t('money.renew')} onPress={soon} />
            </View>
          )}

          <Squish accessibilityRole="button" onPress={() => router.push('/master/plan')} style={styles.card}>
            <View style={styles.flex}>
              <Text variant="caption">{t('money.plan')}</Text>
              <Text variant="bodyBold">
                {plan === 'subscription' ? t('plan.subscription') : `${t('plan.commission')} · ${BILLING.commission.commissionPercent}%`}
              </Text>
            </View>
            <Text style={styles.change}>{t('earnings.changePlan')}</Text>
            <ChevronRight size={18} color={colors.primary} />
          </Squish>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { paddingBottom: 24, gap: 12 },
  hero: { backgroundColor: colors.surface, borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet, padding: 16, paddingTop: 12, gap: 18 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.heavy, fontSize: 32, color: colors.ink },
  support: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.primary },
  supportText: { fontFamily: fonts.bold, fontSize: 15, color: colors.onPrimary },
  amountBlock: { gap: 2 },
  amountRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  amount: { fontFamily: fonts.heavy, fontSize: 40, lineHeight: 52, color: colors.ink },
  days: { flex: 1, flexDirection: 'row', gap: 6 },
  day: { flex: 1, alignItems: 'center', gap: 6, minHeight: 44, justifyContent: 'center' },
  dayBar: { alignSelf: 'stretch', height: 4, borderRadius: 2, backgroundColor: colors.line },
  dayBarOn: { backgroundColor: colors.primary },
  dayText: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted },
  dayTextOn: { color: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: colors.field },
  section: { paddingHorizontal: 16, gap: 12 },
  limit: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.card },
  lockIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  balance: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 16, gap: 10, borderWidth: 1.5, borderColor: colors.line },
  balanceValue: { fontFamily: fonts.heavy, fontSize: 26, color: colors.ink },
  change: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
