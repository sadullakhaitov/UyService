import { Copy, Gift, Share2 } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ScreenHeader, Text } from '@/components/ui';
import { useEffect, useState } from 'react';
import { INVITE_BONUS, INVITE_JOBS } from '@/constants/billing';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { LIVE, liveMyInvites } from '@/lib/live';
import { copyText, shareText } from '@/lib/share';
import { useUser } from '@/store';

/** Sinov rejimi: raqamdan yasalgan, lekin raqamni oshkor qilmaydigan kod. Server rejimida kodni server beradi (masters.invite_code) */
function inviteCode(phone: string) {
  let h = 5381;
  for (const ch of phone.replace(/\D/g, '') || '0') h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return `US${h.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`;
}

// Do'st taklif qilish: kod va havola. Do'st anketada kodni kiritadi (yoki havoladan o'zi yoziladi, app/usta.tsx),
// u INVITE_JOBS ta ishni bajargach bonus balansga tushadi (server: …_promo_referrals.sql)
export default function Invite() {
  useScheme();
  const phone = useUser((s) => s.phone);
  const [server, setServer] = useState<{ code: string; invited: number; paid: number } | null>(null);
  useEffect(() => {
    if (LIVE) void liveMyInvites().then(setServer);
  }, []);
  const code = LIVE ? (server?.code ?? '······') : inviteCode(phone);
  const link = `https://uyservice.uz/usta?ref=${code}`;
  const share = () => shareText(t('invite.message', { code, link }));

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
          {server?.invited ? <Text variant="caption">{t('invite.stats', { n: server.invited, paid: server.paid })}</Text> : null}
        </View>
        {[1, 2, 3].map((n) => (
          <View key={n} style={styles.step}>
            <View style={styles.num}>
              <Text style={styles.numText}>{n}</Text>
            </View>
            <Text variant="small" style={styles.flex}>
              {t(`invite.step${n}`, { sum: formatSum(INVITE_BONUS), jobs: INVITE_JOBS })}
            </Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottom}>
        <Button title={t('invite.share')} icon={Share2} big disabled={LIVE && !server} onPress={share} />
        <Button title={t('invite.copyLink')} icon={Copy} kind="secondary" disabled={LIVE && !server} onPress={() => copyText(link)} />
      </View>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 14 },
  hero: { alignItems: 'center', gap: 8, padding: 22, borderRadius: radius.card, backgroundColor: colors.primary },
  heroTitle: { fontFamily: fonts.heavy, fontSize: 22, color: colors.onPrimary, textAlign: 'center' },
  heroText: { fontFamily: fonts.medium, fontSize: 14, color: colors.onPrimaryMuted, textAlign: 'center' },
  codeBox: { alignItems: 'center', gap: 4, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary },
  code: { fontFamily: fonts.heavy, fontSize: 30, letterSpacing: 4, color: colors.primary },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.heavy, fontSize: 15, color: colors.accentInk },
  bottom: { padding: 16, gap: 10 },
}));
