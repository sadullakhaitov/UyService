import { router } from 'expo-router';
import {
  ChevronRight,
  FileText,
  GraduationCap,
  ImagePlus,
  LogOut,
  ScanFace,
  Settings,
  Star,
  Ticket,
  UserPlus,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Squish, Text } from '@/components/ui';
import { BILLING } from '@/constants/billing';
import { colors, fonts, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { mockMasterSelf } from '@/mocks';
import { useMaster, useUser } from '@/store';

const soon = () => Alert.alert(t('profile.soon'), t('profile.soonText'));

export default function Profile() {
  const m = mockMasterSelf;
  const { activity, categories, verified } = useMaster();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const logout = useUser((s) => s.logout);
  const setRole = useUser((s) => s.setRole);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Squish accessibilityRole="button" scaleTo={0.98} onPress={soon} style={styles.head}>
          <Avatar initials={m.initials} size={64} solid />
          <Text style={styles.name} numberOfLines={1}>
            {m.name.split(' ')[0]}
          </Text>
          <ChevronRight size={26} color={colors.ink} strokeWidth={2.6} />
        </Squish>

        <View style={styles.block}>
          <View style={styles.roleRow}>
            <View style={styles.roleIcon}>
              <Wrench size={24} color={colors.onPrimary} strokeWidth={2.2} />
            </View>
            <Text style={styles.role}>{t('profile.role')}</Text>
            <Squish accessibilityRole="button" onPress={() => {
                setRole('client');
                router.replace('/client');
              }} style={styles.switch}>
              <Text style={styles.switchText}>{t('profile.switchRole')}</Text>
            </Squish>
          </View>

          <View style={styles.tiles}>
            <Tile value={m.rating.toFixed(2)} label={t('profile.rating')} icon={<Star size={40} color={colors.accent} fill={colors.accent} />} />
            <Tile value={String(activity)} label={t('profile.points')} />
            <Tile value="+15" label={t('profile.priority')} />
          </View>

          <View style={styles.group}>
            <Item
              label={t('profile.categories')}
              value={categories.map((c) => t(`categories.${c}`)).join(', ')}
              onPress={soon}
            />
            <Item
              label={t('profile.plan')}
              value={plan === 'subscription' ? t('plan.subscription') : `${t('plan.commission')} ${BILLING.commission.commissionPercent}%`}
              onPress={() => router.push('/master/plan')}
            />
            <Item label={t('profile.payment')} value={t('profile.cash')} onPress={soon} last />
          </View>

          <Text style={styles.section}>{t('profile.works')}</Text>
          <Squish accessibilityRole="button" scaleTo={0.98} onPress={soon} style={styles.works}>
            <ImagePlus size={24} color={colors.primary} strokeWidth={2.2} />
            <View style={styles.flex}>
              <Text variant="bodyBold">{t('profile.addWorks')}</Text>
              <Text variant="small">{t('profile.worksHint')}</Text>
            </View>
          </Squish>
        </View>

        <View style={styles.block}>
          <Row icon={FileText} label={t('profile.documents')} badge={verified ? undefined : 1} onPress={soon} />
          <Row icon={ScanFace} label={t('profile.verifyPhoto')} onPress={soon} last />
        </View>

        <View style={styles.block}>
          <Row icon={Ticket} label={t('profile.promo')} onPress={soon} />
          <Row icon={UserPlus} label={t('profile.invite')} onPress={soon} last />
        </View>

        <View style={styles.block}>
          <Row icon={GraduationCap} label={t('profile.learn')} onPress={soon} />
          <Row icon={Settings} label={t('profile.settings')} onPress={soon} />
          <Row
            icon={LogOut}
            label={t('profile.logout')}
            onPress={() => {
              logout();
              router.replace('/client');
            }}
            last
          />
        </View>

        <View style={styles.version}>
          <Text variant="bodyBold">{t('profile.version')}</Text>
          <Text variant="small">{Constants.expoConfig?.version ?? '0.1.0'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ value, label, icon }: { value: string; label: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text variant="small" style={{ color: colors.ink }}>
        {label}
      </Text>
      {icon ? <View style={styles.tileIcon}>{icon}</View> : null}
    </View>
  );
}

function Item({ label, value, onPress, last }: { label: string; value: string; onPress: () => void; last?: boolean }) {
  return (
    <Squish accessibilityRole="button" scaleTo={0.99} onPress={onPress} style={[styles.item, !last && styles.itemLine]}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text variant="bodyBold" numberOfLines={1} style={styles.itemValue}>
        {value}
      </Text>
      <ChevronRight size={20} color={colors.ink} />
    </Squish>
  );
}

function Row({ icon: Icon, label, onPress, badge, last }: { icon: LucideIcon; label: string; onPress: () => void; badge?: number; last?: boolean }) {
  return (
    <Squish accessibilityRole="button" scaleTo={0.99} onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon size={22} color={colors.ink} strokeWidth={2} />
      </View>
      <View style={[styles.rowBody, !last && styles.itemLine]}>
        <Text style={styles.rowLabel}>{label}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <ChevronRight size={20} color={colors.ink} />
      </View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { paddingBottom: 32, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  name: { fontFamily: fonts.heavy, fontSize: 30, color: colors.ink, flexShrink: 1 },
  block: { backgroundColor: colors.surface, borderRadius: radius.sheet, padding: 16, gap: 14 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  role: { flex: 1, fontFamily: fonts.heavy, fontSize: 22, color: colors.ink },
  switch: { height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center' },
  switchText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  tiles: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, height: 116, borderRadius: radius.card, backgroundColor: colors.field, padding: 12, overflow: 'hidden' },
  tileValue: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink },
  tileIcon: { position: 'absolute', right: -4, bottom: -4 },
  group: { backgroundColor: colors.field, borderRadius: radius.card, paddingHorizontal: 16 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60 },
  itemLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  itemLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.ink, flex: 1 },
  itemValue: { maxWidth: '55%', textAlign: 'right' },
  section: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink, marginTop: 4 },
  works: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.card, backgroundColor: colors.field, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#9FB1AA' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rowIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 60 },
  rowLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.onPrimary },
  version: { paddingHorizontal: 16, gap: 2 },
});
