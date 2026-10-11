import { EllipsisVertical, ExternalLink, Share, SquarePlus } from 'lucide-react-native';
import { View } from 'react-native';
import { ModalSheet } from '@/components/sheets/ModalSheet';
import { Button, Text } from '@/components/ui';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import type { InstallKind } from '@/lib/install';

const STEPS: Record<Exclude<InstallKind, 'prompt'>, [typeof Share, string][]> = {
  ios: [
    [Share, 'install.ios1'],
    [SquarePlus, 'install.ios2'],
    [SquarePlus, 'install.ios3'],
  ],
  telegram: [
    [ExternalLink, 'install.tg1'],
    [SquarePlus, 'install.tg2'],
  ],
  manual: [
    [EllipsisVertical, 'install.manual1'],
    [SquarePlus, 'install.manual2'],
  ],
};

// iPhone'dagi Chrome'da «Ulashish» manzil satrida, Safari'da — pastda
const chrome = () => typeof navigator !== 'undefined' && /CriOS/.test(navigator.userAgent);

/** «Ilovani o'rnatish»: brauzer o'zi oyna ochmaydigan joyda — qadamma-qadam yo'riqnoma */
export function InstallSheet({ kind, onClose }: { kind: Exclude<InstallKind, 'prompt'> | null; onClose: () => void }) {
  useScheme();
  return (
    <ModalSheet visible={kind !== null} onClose={onClose}>
      <Text variant="h2">{t('install.title')}</Text>
      <Text variant="small">{t('install.why')}</Text>
      {(kind ? STEPS[kind] : []).map(([Icon, key], i) => (
        <View key={key} style={styles.step}>
          <View style={styles.num}>
            <Text style={styles.numText}>{i + 1}</Text>
          </View>
          <Text style={styles.stepText}>{t(key === 'install.ios1' && chrome() ? 'install.ios1Chrome' : key)}</Text>
          <View style={styles.icon}>
            <Icon size={22} color={colors.primary} strokeWidth={2} />
          </View>
        </View>
      ))}
      <Button title={t('install.ok')} big onPress={onClose} />
    </ModalSheet>
  );
}

const styles = themed(() => ({
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, backgroundColor: colors.surface },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.onPrimary },
  stepText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
}));
