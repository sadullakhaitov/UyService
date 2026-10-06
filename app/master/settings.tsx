import { router } from 'expo-router';
import { Bell, ChevronRight, LogOut } from 'lucide-react-native';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Squish, Text } from '@/components/ui';
import { LanguagePicker } from '@/components/ui/LanguagePicker';
import { ThemePicker } from '@/components/ui/ThemePicker';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { askNotifications } from '@/lib/notify';
import { useMaster, useUser } from '@/store';

export default function Settings() {
  useScheme();
  const { notifications, setNotifications, setOnline } = useMaster();
  const logout = useUser((s) => s.logout);

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('profile.settings')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.row}>
          <View style={styles.icon}>
            <Bell size={22} color={colors.ink} strokeWidth={2} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.label}>{t('settings.notifications')}</Text>
            <Text variant="caption">{t('settings.notificationsHint')}</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={(v) => {
              if (v) askNotifications();
              setNotifications(v);
            }}
            trackColor={{ true: colors.primary, false: colors.line }}
            thumbColor={colors.surface}
            accessibilityLabel={t('settings.notifications')}
          />
        </View>

        <Text style={styles.section}>{t('account.language')}</Text>
        <LanguagePicker />

        <Text style={styles.section}>{t('theme.section')}</Text>
        <ThemePicker />

        <Text style={styles.section}>{t('legal.section')}</Text>
        <Squish accessibilityRole="button" scaleTo={0.98} onPress={() => router.push('/about')} style={styles.row}>
          <Text style={[styles.label, styles.flex]}>{t('about.title')}</Text>
          <ChevronRight size={20} color={colors.ink} />
        </Squish>
        <Squish accessibilityRole="button" scaleTo={0.98} onPress={() => router.push('/legal/terms')} style={styles.row}>
          <Text style={[styles.label, styles.flex]}>{t('legal.terms')}</Text>
          <ChevronRight size={20} color={colors.ink} />
        </Squish>
        <Squish accessibilityRole="button" scaleTo={0.98} onPress={() => router.push('/legal/privacy')} style={styles.row}>
          <Text style={[styles.label, styles.flex]}>{t('legal.privacy')}</Text>
          <ChevronRight size={20} color={colors.ink} />
        </Squish>

        <Squish
          accessibilityRole="button"
          scaleTo={0.98}
          onPress={() => {
            setOnline(false);
            logout();
            router.replace('/client');
          }}
          style={[styles.row, styles.logout]}
        >
          <View style={styles.icon}>
            <LogOut size={22} color={colors.danger} strokeWidth={2} />
          </View>
          <Text style={[styles.label, { color: colors.danger }]}>{t('profile.logout')}</Text>
        </Squish>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.card, backgroundColor: colors.surface },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  section: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink, marginTop: 8 },
  logout: { marginTop: 12 },
}));
