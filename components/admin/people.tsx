// Odamlar bilan bog'liq kichik bo'laklar: usta qatori, onlayn holati, telefon (qo'ng'iroq / nusxa)
import { Copy, Phone } from 'lucide-react-native';
import { Linking, Platform, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import type { AdminMaster, AdminUser } from '@/lib/admin/types';
import { toast } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';
import { fmtAgo, fmtPhone, initials } from './format';
import { AButton, Badge } from './kit';

export function MasterName({ m, size = 36 }: { m: Pick<AdminMaster, 'firstName' | 'lastName' | 'phone' | 'photo'>; size?: number }) {
  useScheme();
  return (
    <View style={styles.row}>
      <Avatar initials={initials(m.firstName, m.lastName)} size={size} photo={m.photo} />
      <View style={styles.min}>
        <Text numberOfLines={1} style={styles.name}>
          {`${m.firstName} ${m.lastName}`.trim() || t('admin.masters.noName')}
        </Text>
        <Text numberOfLines={1} style={styles.sub}>
          {fmtPhone(m.phone)}
        </Text>
      </View>
    </View>
  );
}

export function PresenceBadge({ m }: { m: Pick<AdminMaster, 'online' | 'busy' | 'blockedAt' | 'seenAt'> }) {
  if (m.blockedAt) return <Badge label={t('admin.presence.blocked')} tone="danger" />;
  if (m.online && m.busy) return <Badge label={t('admin.presence.busy')} tone="warning" dot />;
  if (m.online) return <Badge label={t('admin.presence.online')} tone="success" dot />;
  return <Badge label={m.seenAt ? t('admin.presence.seen', { ago: fmtAgo(m.seenAt) }) : t('admin.presence.offline')} tone="neutral" />;
}

/** Telefon: qo'ng'iroq qilish va nusxa olish */
export function PhoneActions({ phone }: { phone: string | null | undefined }) {
  if (!phone) return <Text style={styles.name}>—</Text>;
  return (
    <View style={styles.row}>
      <Text selectable style={styles.name}>
        {fmtPhone(phone)}
      </Text>
      <AButton size="sm" kind="ghost" icon={Phone} accessibilityLabel={t('admin.common.call')} onPress={() => Linking.openURL(`tel:${phone}`)} />
      {Platform.OS === 'web' ? (
        <AButton
          size="sm"
          kind="ghost"
          icon={Copy}
          accessibilityLabel={t('admin.common.copy')}
          onPress={() => {
            navigator.clipboard?.writeText(phone).then(() => toast(t('admin.common.copied'), 'info'), () => {});
          }}
        />
      ) : null}
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  min: { minWidth: 0, flexShrink: 1 },
  name: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
}));

export function RoleBadge({ u }: { u: Pick<AdminUser, 'role' | 'isMaster' | 'blockedAt'> }) {
  if (u.blockedAt) return <Badge label={t('admin.presence.blocked')} tone="danger" />;
  if (u.role === 'admin') return <Badge label={t('admin.role.admin')} tone="info" />;
  if (u.isMaster) return <Badge label={t('admin.role.master')} tone="primary" />;
  return <Badge label={t('admin.role.client')} tone="neutral" />;
}
