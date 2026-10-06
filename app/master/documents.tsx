import { Camera, CircleCheck, Clock3, IdCard, XCircle } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ScreenHeader, Text } from '@/components/ui';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatDate, t } from '@/lib/i18n';
import { takePhoto } from '@/lib/photos';
import { feePercent } from '@/constants/billing';
import { useMaster, useUser, type VerifyStatus } from '@/store';

const STATUS = (): Record<VerifyStatus, { icon: typeof Clock3; bg: string; fg: string }> => ({
  none: { icon: Clock3, bg: colors.field, fg: colors.ink2 },
  pending: { icon: Clock3, bg: colors.accentSoft, fg: colors.accentInk },
  approved: { icon: CircleCheck, bg: colors.primarySoft, fg: colors.primary },
  rejected: { icon: XCircle, bg: colors.dangerSoft, fg: colors.danger },
});

// Hujjatlar va shaxsni tasdiqlash: admin tekshiruvi holati (5-bosqichda admin Supabase panelidan tasdiqlaydi)
export default function Documents() {
  useScheme();
  const { profile, setProfile, setVerifyStatus } = useMaster();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  const s = STATUS()[profile.status];
  const Icon = s.icon;
  // Hujjat almashtirilsa — qayta tekshiruvga
  const replace = (p: Parameters<typeof setProfile>[0]) => {
    setProfile(p);
    if (p.passportPhoto || profile.passportPhoto) useMaster.getState().submitProfile();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('profile.documents')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.status, { backgroundColor: s.bg }]}>
          <Icon size={28} color={s.fg} strokeWidth={2.2} />
          <View style={styles.flex}>
            <Text style={[styles.statusTitle, { color: s.fg }]}>{t(`docs.${profile.status}`)}</Text>
            <Text variant="small" style={{ color: s.fg }}>
              {profile.status === 'pending' && profile.submittedAt
                ? t('docs.pendingHint', { date: formatDate(new Date(profile.submittedAt)) })
                : t(`docs.${profile.status}Hint`)}
              {profile.status !== 'approved' ? ` ${t('docs.feeNote', { pct: feePercent(plan, false), base: feePercent(plan, true) })}` : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>{t('docs.passport')}</Text>
        <View style={styles.docs}>
          <View style={styles.doc}>
            <PhotoTile
              uri={profile.passportPhoto}
              icon={IdCard}
              label={t('register.passport')}
              size="100%"
              onAdd={async () => {
                const uri = await takePhoto();
                if (uri) replace({ passportPhoto: uri });
              }}
              onRemove={() => setProfile({ passportPhoto: null })}
            />
            <Text variant="caption" style={styles.center}>
              {t('register.passport')}
            </Text>
          </View>
          <View style={styles.doc}>
            <PhotoTile
              uri={profile.selfie}
              icon={Camera}
              label={t('register.selfie')}
              size="100%"
              onAdd={async () => {
                const uri = await takePhoto({ front: true });
                if (uri) replace({ selfie: uri });
              }}
              onRemove={() => setProfile({ selfie: null })}
            />
            <Text variant="caption" style={styles.center}>
              {t('profile.verifyPhoto')}
            </Text>
          </View>
        </View>
        <Text variant="small">{t('docs.why')}</Text>

        {profile.status === 'pending' ? (
          <View style={styles.demo}>
            <Text variant="caption" style={styles.center}>
              {t('docs.demoNote')}
            </Text>
            <Button title={t('docs.demoApprove')} kind="soft" onPress={() => setVerifyStatus('approved')} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.card },
  statusTitle: { fontFamily: fonts.heavy, fontSize: 17 },
  section: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink, marginTop: 4 },
  docs: { flexDirection: 'row', gap: 12 },
  doc: { flex: 1, gap: 6 },
  center: { textAlign: 'center' },
  demo: { gap: 8, marginTop: 8, padding: 12, borderRadius: radius.card, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line },
}));
