import { Copy, Gift, Share2 } from 'lucide-react-native';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ScreenHeader, Text } from '@/components/ui';
import { INVITE_BONUS } from '@/constants/billing';
import { colors, fonts, radius } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { useUser } from '@/store';

// Do'st taklif qilish: kod va havola (5-bosqichda referrals jadvali)
export default function Invite() {
  const phone = useUser((s) => s.phone);
  const code = `US${(phone.replace(/\D/g, '').slice(-4) || '0000')}`;
  const link = `https://uyservice.uz/usta?ref=${code}`;
  const share = () => Share.share({ message: t('invite.message', { code, link }) });

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('profile.invite')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Gift size={40} color={colors.onPrimary} strokeWidth={2} />
          <Text style={styles.heroTitle}>{t('invite.title', { sum: formatSum(INVITE_BONUS) })}</Text>
          <Text style={styles.heroText}>{t('invite.hint')}</Text>
        </View>
        <View style={styles.codeBox}>
          <Text variant="caption">{t('invite.yourCode')}</Text>
          <Text style={styles.code} selectable>
            {code}
          </Text>
        </View>
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{n}</Text>
            </View>
            <Text variant="small" style={styles.flex}>
              {t(`invite.step${n}`, { sum: formatSum(INVITE_BONUS) })}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottom}>
        <Button title={t('invite.share')} icon={Share2} big onPress={share} />
        <Button title={t('invite.copyLink')} icon={Copy} kind="secondary" onPress={() => Share.share({ message: link })} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 14 },
  hero: { alignItems: 'center', gap: 8, padding: 22, borderRadius: radius.card, backgroundColor: colors.primary },
  heroTitle: { fontFamily: fonts.heavy, fontSize: 22, color: colors.onPrimary, textAlign: 'center' },
  heroText: { fontFamily: fonts.medium, fontSize: 14, color: '#CFE5DD', textAlign: 'center' },
  codeBox: { alignItems: 'center', gap: 4, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary },
  code: { fontFamily: fonts.heavy, fontSize: 30, letterSpacing: 4, color: colors.primary },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.heavy, fontSize: 15, color: colors.accentInk },
  bottom: { padding: 16, gap: 10 },
});
