import { router } from 'expo-router';
import { ChevronRight, Globe, LogIn, LogOut, ReceiptText, Wrench } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, ScreenHeader, Squish, Text } from '@/components/ui';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { colors, fonts, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useMaster, useUser } from '@/store';

// Mijoz profili: ro'yxatdan o'tmagan bo'lsa ham ochiladi (mehmon)
export default function Account() {
  const { phone, logout, setRole, billingPlan } = useUser();
  const registered = useMaster((s) => Boolean(s.profile.submittedAt));
  const guest = !phone;

  const beMaster = () => {
    if (guest) router.push('/phone?next=master');
    else {
      setRole('master');
      router.replace(!registered ? '/master/register' : billingPlan ? '/master' : '/master/plan');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader title={t('account.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Avatar initials={guest ? '?' : phone.slice(-2)} size={56} solid={!guest} />
          <View style={styles.flex}>
            <Text variant="h3">{guest ? t('account.guest') : phone}</Text>
            {guest ? <Text variant="small">{t('account.guestHint')}</Text> : null}
          </View>
        </View>

        {guest ? <Row icon={LogIn} label={t('account.login')} onPress={() => router.push('/phone')} primary /> : null}
        <Row icon={ReceiptText} label={t('client.history')} onPress={() => router.push('/client/history')} />
        <Row icon={Wrench} label={t('account.beMaster')} hint={t('account.beMasterHint')} onPress={beMaster} />

        <Text style={styles.section}>{t('account.language')}</Text>
        <LanguagePicker />

        {!guest ? <Row icon={LogOut} label={t('account.logout')} onPress={logout} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon: Icon, label, hint, onPress, primary }: { icon: typeof Globe; label: string; hint?: string; onPress: () => void; primary?: boolean }) {
  return (
    <Squish accessibilityRole="button" scaleTo={0.98} onPress={onPress} style={[styles.row, primary && { backgroundColor: colors.primary }]}>
      <View style={[styles.rowIcon, primary && { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
        <Icon size={22} color={primary ? colors.onPrimary : colors.ink} strokeWidth={2} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, primary && { color: colors.onPrimary }]}>{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      <ChevronRight size={20} color={primary ? colors.onPrimary : colors.ink} />
    </Squish>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: colors.surface },
  rowIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  section: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink, marginTop: 8 },
});
