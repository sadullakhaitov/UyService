// Profildagi "ID 10234" belgisi: bosilsa nusxalanadi (yordam chatida aytish uchun)
import { Copy } from 'lucide-react-native';
import { View } from 'react-native';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { copyText } from '@/lib/share';
import { fmtUserId, useMyUserId } from '@/lib/userId';
import { Squish } from './Pressable';
import { Text } from './Text';

export function UserIdTag() {
  useScheme();
  const id = useMyUserId();
  if (!id) return null;
  return (
    <Squish
      accessibilityRole="button"
      accessibilityLabel={t('account.userIdCopy', { id })}
      onPress={() => copyText(String(id))}
      style={styles.tag}
    >
      <View style={styles.row}>
        <Text style={styles.text}>{fmtUserId(id)}</Text>
        <Copy size={14} color={colors.ink2} strokeWidth={2.2} />
      </View>
    </Squish>
  );
}

const styles = themed(() => ({
  tag: { alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: colors.field },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  text: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink2, fontVariant: ['tabular-nums'] },
}));
