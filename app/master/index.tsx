import { router, useFocusEffect } from 'expo-router';
import { ChevronRight, Clock, LocateFixed, Power, User, Wallet } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase, type MapHandle } from '@/components/map';
import { Sheet } from '@/components/sheets/Sheet';
import { IconButton, Logo, Squish, Text } from '@/components/ui';
import { BILLING } from '@/constants/billing';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { getCurrentLocation } from '@/lib/location';
import { useMyLocation } from '@/lib/useMyLocation';
import { mockMasterSelf } from '@/mocks';
import { useMaster, useUser } from '@/store';

// Soxta: onlayn bo'lgach 6 s da yangi buyurtma keladi
const OFFER_AFTER_MS = 6000;

export default function MasterHome() {
  const insets = useSafeAreaInsets();
  const { online, setOnline, verified, activity } = useMaster();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const [sheetH, setSheetH] = useState(380);
  const map = useRef<MapHandle>(null);
  const me = useMyLocation();
  const [initial] = useState(mockMasterSelf.location);
  const pos = me ?? initial;

  // Ustaning haqiqiy joyi kelganda kamera o'sha yerga uchadi
  useEffect(() => {
    if (me) map.current?.flyTo(me, 15);
  }, [me]);

  const locate = async () => {
    const here = (await getCurrentLocation()) ?? me;
    if (here) map.current?.flyTo(here, 15);
  };

  useFocusEffect(
    useCallback(() => {
      if (!online || !verified) return;
      const id = setTimeout(() => router.push('/master/offer'), OFFER_AFTER_MS);
      return () => clearTimeout(id);
    }, [online, verified]),
  );

  const planLabel =
    plan === 'subscription'
      ? `${t('plan.subscription')} · ${formatSum(BILLING.subscription.monthlyFee)}`
      : `${t('plan.commission')} · ${BILLING.commission.commissionPercent}%`;

  return (
    <View style={styles.root}>
      <MapBase
        ref={map}
        center={initial}
        zoom={15}
        insets={{ top: insets.top + 70, bottom: sheetH }}
        master={pos}
        pulse={online ? { center: pos, maxRadiusM: 350 } : undefined}
      />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]} pointerEvents="box-none">
        <View style={[styles.pill, shadow.float]}>
          <Logo size={15} />
        </View>
        <View style={[styles.pill, shadow.float, styles.state]}>
          <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.muted }]} />
          <Text style={styles.stateText}>{online ? t('master.online') : t('master.offline')}</Text>
        </View>
        <IconButton icon={User} label={t('common.profile')} floating onPress={() => router.push('/role')} />
      </View>

      <IconButton icon={LocateFixed} label={t('client.myLocation')} floating onPress={locate} style={[styles.locate, { bottom: sheetH + 12 }]} />

      <Sheet onHeight={setSheetH}>
        {!verified ? (
          <View style={styles.pending}>
            <Clock size={18} color={colors.accentInk} strokeWidth={2.4} />
            <View style={styles.flex}>
              <Text style={styles.pendingTitle}>{t('master.pendingTitle')}</Text>
              <Text variant="caption">{t('master.pendingText')}</Text>
            </View>
          </View>
        ) : null}

        <Squish
          accessibilityRole="switch"
          accessibilityState={{ checked: online }}
          onPress={() => setOnline(!online)}
          scaleTo={0.97}
          style={[styles.toggle, { backgroundColor: online ? colors.field : colors.primary }]}
        >
          <View style={[styles.power, { backgroundColor: online ? colors.dangerSoft : 'rgba(255,255,255,0.16)' }]}>
            <Power size={26} color={online ? colors.danger : colors.onPrimary} strokeWidth={2.6} />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.toggleTitle, { color: online ? colors.ink : colors.onPrimary }]}>
              {online ? t('master.goOffline') : t('master.goOnline')}
            </Text>
            <Text style={[styles.toggleHint, { color: online ? colors.ink2 : '#CFE5DD' }]}>
              {online ? t('master.onlineHint') : t('master.offlineHint')}
            </Text>
          </View>
        </Squish>

        <View style={styles.stats}>
          <View style={[styles.stat, styles.statWide]}>
            <Text variant="caption">{t('master.today')}</Text>
            <Text style={styles.big}>{formatSum(mockMasterSelf.todayIncome)}</Text>
            <Text variant="caption">{t('master.jobsToday', { count: mockMasterSelf.todayJobs })}</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="caption">{t('master.activity')}</Text>
            <Text style={styles.big}>{activity}</Text>
            <View style={styles.meter}>
              <View style={[styles.meterFill, { width: `${activity}%` }]} />
            </View>
          </View>
        </View>

        <Squish accessibilityRole="button" onPress={() => router.push('/master/earnings')} style={styles.link}>
          <Wallet size={20} color={colors.primary} strokeWidth={2.2} />
          <View style={styles.flex}>
            <Text style={styles.linkTitle}>{t('master.earnings')}</Text>
            <Text variant="caption">
              {t('master.plan')}: {planLabel}
            </Text>
          </View>
          <ChevronRight size={20} color={colors.ink2} />
        </Squish>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.map },
  flex: { flex: 1 },
  locate: { position: 'absolute', right: 16 },
  top: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { backgroundColor: colors.surface, height: 44, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center' },
  state: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stateText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  pending: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'flex-start' },
  pendingTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.accentInk },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, minHeight: 84 },
  power: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontFamily: fonts.heavy, fontSize: 19 },
  toggleHint: { fontFamily: fonts.medium, fontSize: 13, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.bg, borderRadius: 16, padding: 14, gap: 4 },
  statWide: { flex: 1.5 },
  big: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink },
  meter: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginTop: 4 },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.tile, borderWidth: 1.5, borderColor: colors.line },
  linkTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
});
