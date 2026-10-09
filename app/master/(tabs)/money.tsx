import { router } from 'expo-router';
import { ChevronRight, Gift, Headset, Lock, LockOpen, CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Squish, Text } from '@/components/ui';
import { BALANCE_LIMIT, BILLING, feePercent, planLabel } from '@/constants/billing';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { freeDaysLeft, useFreeUntil } from '@/lib/freePass';
import { formatDate, formatSum, t } from '@/lib/i18n';
import { DEMO } from '@/lib/demo';
import { notice } from '@/lib/dialog';
import { earningOn, useMaster, useUser } from '@/store';

const DAY = 86_400_000;
/** Sinov rejimida "To'ldirish" tugmasi balansga shuncha qo'shadi */
const DEMO_TOP_UP = 50_000;

export default function Money() {
  useScheme();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const { balance, subscriptionUntil, verified, earnings, topUp, paySubscription } = useMaster();
  const freeUntil = useFreeUntil();
  const fee = feePercent(plan, verified, !!freeUntil);
  const [sel, setSel] = useState(6);
  // So'nggi 7 kun — haqiqiy yakunlangan ishlardan (yangi ustada hammasi 0)
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(Date.now() - (6 - i) * DAY);
    const e = earningOn(earnings, date);
    return { date, label: String(date.getDate()), income: e.income, jobs: e.jobs };
  });
  const day = days[sel];
  const weekJobs = days.reduce((n, d) => n + d.jobs, 0);
  const ok = balance >= BALANCE_LIMIT;
  const subActive = subscriptionUntil > Date.now();
  // Click/Payme ulanguncha: sinov rejimida — darhol (namunaviy), aks holda "tez kunda"
  const onTopUp = () => (DEMO ? topUp(DEMO_TOP_UP) : notice(t('profile.soon'), t('money.topUpSoon')));
  const onRenew = () => (DEMO ? paySubscription() : notice(t('profile.soon'), t('money.topUpSoon')));

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
              <Text variant="small">{t('money.jobsCardSub', { count: weekJobs })}</Text>
            </View>
            <ChevronRight size={20} color={colors.ink2} />
          </Squish>
        </View>

        <View style={styles.section}>
          {freeUntil ? (
            // Bepul davr: komissiya ham, obuna ham olinmaydi; tugashidan 7 va 1 kun oldin xabar keladi
            <View style={[styles.limit, { backgroundColor: colors.primarySoft }]}>
              <View style={[styles.lockIcon, { backgroundColor: colors.surface }]}>
                <Gift size={20} color={colors.primary} strokeWidth={2.4} />
              </View>
              <View style={styles.flex}>
                <View style={styles.rowBetween}>
                  <Text variant="bodyBold">{t('money.free')}</Text>
                  <Text variant="bodyBold" style={{ color: colors.primary }}>
                    {t('mOrders.days', { days: freeDaysLeft(freeUntil) })}
                  </Text>
                </View>
                <Text variant="small">{t('money.freeSub', { date: formatDate(new Date(freeUntil)) })}</Text>
              </View>
            </View>
          ) : null}
          {fee > 0 ? (
            <>
              <View style={[styles.limit, { backgroundColor: ok ? colors.successSoft : colors.dangerSoft }]}>
                <View style={[styles.lockIcon, { backgroundColor: ok ? colors.successStrong : colors.dangerStrong }]}>
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
                <Text variant="small">{t('money.commissionNote', { percent: fee })}</Text>
                <Button title={DEMO ? t('money.topUpDemo', { sum: formatSum(DEMO_TOP_UP) }) : t('money.topUp')} onPress={onTopUp} />
              </View>
            </>
          ) : null}
          {plan === 'subscription' && !freeUntil ? (
            <View style={styles.balance}>
              <View style={styles.rowBetween}>
                <Text variant="h3">{t('money.subscription')}</Text>
                <Text style={[styles.balanceValue, { fontSize: 18, color: subActive ? colors.success : colors.danger }]}>
                  {subActive ? t('money.subscriptionActive', { date: formatDate(new Date(subscriptionUntil)) }) : t('money.subscriptionExpired')}
                </Text>
              </View>
              <Text variant="small">{t('plan.subscriptionPrice', { price: formatSum(BILLING.subscription.monthlyFee) })}</Text>
              <Button title={DEMO ? t('money.renewDemo') : t('money.renew')} onPress={onRenew} />
            </View>
          ) : null}

          <Squish accessibilityRole="button" onPress={() => router.push('/master/plan')} style={styles.card}>
            <View style={styles.flex}>
              <Text variant="caption">{t('money.plan')}</Text>
              <Text variant="bodyBold">
                {freeUntil ? `${t('money.free')} · 0%` : planLabel(plan, verified)}
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

const styles = themed(() => ({
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
}));
