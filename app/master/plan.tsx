import { router } from 'expo-router';
import { CalendarDays, Check, Percent, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ScreenHeader, Squish, Text } from '@/components/ui';
import { BILLING, type BillingPlan } from '@/constants/billing';
import { colors, fonts, radius, themed } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { useUser } from '@/store';

// Usta to'lov modelini o'zi tanlaydi: oylik obuna yoki komissiya
export default function PlanScreen() {
  const current = useUser((s) => s.billingPlan);
  const save = useUser((s) => s.setBillingPlan);
  const [plan, setPlan] = useState<BillingPlan>(current ?? 'commission');

  const submit = () => {
    save(plan);
    if (current && router.canGoBack()) router.back();
    else router.replace('/master');
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('plan.title')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/client/account'))} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="small">{t('plan.hint')}</Text>
        <PlanCard
          icon={Percent}
          title={t('plan.commission')}
          price={t('plan.commissionPrice', { percent: BILLING.commission.commissionPercent })}
          points={t('plan.commissionPoints').split('|')}
          selected={plan === 'commission'}
          onPress={() => setPlan('commission')}
        />
        <PlanCard
          icon={CalendarDays}
          title={t('plan.subscription')}
          price={t('plan.subscriptionPrice', { price: formatSum(BILLING.subscription.monthlyFee) })}
          points={t('plan.subscriptionPoints').split('|')}
          badge={t('plan.recommended')}
          selected={plan === 'subscription'}
          onPress={() => setPlan('subscription')}
        />
      </ScrollView>
      <View style={styles.bottom}>
        <Button title={t('plan.save')} big onPress={submit} />
      </View>
    </SafeAreaView>
  );
}

function PlanCard(p: { icon: LucideIcon; title: string; price: string; points: string[]; badge?: string; selected: boolean; onPress: () => void }) {
  const Icon = p.icon;
  return (
    <Squish
      accessibilityRole="radio"
      accessibilityState={{ selected: p.selected }}
      onPress={p.onPress}
      scaleTo={0.98}
      style={[styles.card, p.selected && styles.cardOn]}
    >
      <View style={styles.cardTop}>
        <View style={[styles.icon, p.selected && { backgroundColor: colors.primary }]}>
          <Icon size={22} color={p.selected ? colors.onPrimary : colors.primary} strokeWidth={2.2} />
        </View>
        <View style={styles.flex}>
          <Text variant="h3">{p.title}</Text>
          <Text style={styles.price}>{p.price}</Text>
        </View>
        <View style={[styles.radio, p.selected && styles.radioOn]}>{p.selected ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
      </View>
      {p.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{p.badge}</Text>
        </View>
      ) : null}
      <View style={styles.points}>
        {p.points.map((x) => (
          <View key={x} style={styles.point}>
            <Check size={16} color={colors.success} strokeWidth={2.6} />
            <Text variant="small" style={styles.pointText}>
              {x}
            </Text>
          </View>
        ))}
      </View>
    </Squish>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14, paddingBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 2, borderColor: colors.line, padding: 16, gap: 14 },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.primaryWash },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  price: { fontFamily: fonts.heavy, fontSize: 18, color: colors.primary, marginTop: 2 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.accentSoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.accentInk },
  points: { gap: 8 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pointText: { color: colors.ink, flex: 1 },
  bottom: { padding: 16 },
}));
