import { router } from 'expo-router';
import { ChevronRight, FileText, Globe, Info, LifeBuoy, LogIn, LogOut, ReceiptText, Shield, Trash2, Wrench } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, ScreenHeader, Squish, Text } from '@/components/ui';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { confirm } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { deleteAccount } from '@/lib/account';
import { DEMO } from '@/lib/demo';
import { useMaster, useOrders, useUser } from '@/store';

// Mijoz profili: ro'yxatdan o'tmagan bo'lsa ham ochiladi (mehmon)
export default function Account() {
  useScheme();
  const { phone, name, setName, logout, setRole, billingPlan } = useUser();
  const [draft, setDraft] = useState(name);
  // Ism tashqaridan o'zgarsa (masalan, Telegram orqali kirilganda) — maydon ham yangilanadi
  useEffect(() => setDraft(name), [name]);
  const registered = useMaster((s) => Boolean(s.profile.submittedAt));
  const guest = !phone;

  const activeOrders = useOrders((s) => s.orders.length);
  // Chiqishda hamma shaxsiy ma'lumot o'chadi; faol buyurtmalar bo'lsa — alohida ogohlantiramiz
  const onLogout = async () => {
    const text = activeOrders ? t('account.logoutActive', { count: activeOrders }) : t('profile.logoutText');
    if (await confirm(t('profile.logoutTitle'), text, t('account.logout'), true)) logout();
  };

  const beMaster = () => {
    if (guest) router.push('/phone?next=master');
    else {
      setRole('master');
      router.replace(!registered ? '/master/register' : billingPlan ? '/master' : '/master/plan');
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader title={t('account.title')} back={false} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Avatar initials={(name.trim()[0] ?? '?').toUpperCase()} size={56} solid={!guest} />
          <View style={styles.flex}>
            {guest ? (
              <>
                <Text variant="h3">{t('account.guest')}</Text>
                <Text variant="small">{t('account.guestHint')}</Text>
              </>
            ) : (
              <>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onBlur={() => setName(draft.trim())}
                  onSubmitEditing={() => setName(draft.trim())}
                  placeholder={t('account.namePlaceholder')}
                  placeholderTextColor={colors.muted}
                  accessibilityLabel={t('account.namePlaceholder')}
                  autoCapitalize="words"
                  returnKeyType="done"
                  style={styles.nameInput}
                />
                <Text variant="small">{phone}</Text>
              </>
            )}
          </View>
        </View>

        {guest ? <Row icon={LogIn} label={t('account.login')} onPress={() => router.push('/phone')} primary /> : null}
        <Row icon={ReceiptText} label={t('client.history')} onPress={() => router.push('/client/history')} />
        <Row icon={Wrench} label={t('account.beMaster')} hint={t('account.beMasterHint')} onPress={beMaster} />
        {/* Qo'llab-quvvatlash: admin javob beradi (server rejimida raqam kerak — yozishma shu raqamga bog'lanadi) */}
        <Row icon={LifeBuoy} label={t('account.support')} hint={t('account.supportHint')} onPress={() => router.push(guest && !DEMO ? '/phone?next=support' : '/client/chat?id=support')} />

        <Text style={styles.section}>{t('account.language')}</Text>
        <LanguagePicker />

        <Text style={styles.section}>{t('theme.section')}</Text>
        <ThemePicker />

        <Text style={styles.section}>{t('legal.section')}</Text>
        <Row icon={Info} label={t('about.title')} onPress={() => router.push('/about')} />
        <Row icon={FileText} label={t('legal.terms')} onPress={() => router.push('/legal/terms')} />
        <Row icon={Shield} label={t('legal.privacy')} onPress={() => router.push('/legal/privacy')} />

        {!guest ? <Row icon={LogOut} label={t('account.logout')} onPress={onLogout} /> : null}
        {!guest ? <Row icon={Trash2} label={t('account.delete')} hint={t('account.deleteHint')} onPress={() => void deleteAccount()} danger /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon: Icon, label, hint, onPress, primary, danger }: { icon: typeof Globe; label: string; hint?: string; onPress: () => void; primary?: boolean; danger?: boolean }) {
  useScheme();
  const ink = primary ? colors.onPrimary : danger ? colors.danger : colors.ink;
  return (
    <Squish accessibilityRole="button" scaleTo={0.98} onPress={onPress} style={[styles.row, primary && { backgroundColor: colors.primary }]}>
      <View style={[styles.rowIcon, primary && { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
        <Icon size={22} color={ink} strokeWidth={2} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.rowLabel, { color: ink }]}>{label}</Text>
        {hint ? <Text variant="caption">{hint}</Text> : null}
      </View>
      <ChevronRight size={20} color={ink} />
    </Squish>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: colors.surface },
  rowIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  nameInput: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink, paddingVertical: 4, borderBottomWidth: 1.5, borderBottomColor: colors.line },
  rowLabel: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  section: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink, marginTop: 8 },
}));
