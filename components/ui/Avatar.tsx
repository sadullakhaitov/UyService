import { UserRound } from 'lucide-react-native';
import { Image, View } from 'react-native';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { Text } from './Text';

/** Surat bo'lsa — surat, bosh harflar bo'lsa — harflar, ism yo'q (mehmon) — odamcha belgisi */
export function Avatar({ initials, size = 48, solid, photo }: { initials: string; size?: number; solid?: boolean; photo?: string | null }) {
  useScheme();
  const r = size * 0.31;
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: r, backgroundColor: solid ? colors.primary : colors.primaryTint }]}>
      {photo ? (
        <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: r }} accessibilityIgnoresInvertColors />
      ) : !initials || initials === '?' ? (
        <UserRound size={size * 0.5} color={solid ? colors.onPrimary : colors.primary} strokeWidth={2.2} />
      ) : (
        <Text style={{ fontFamily: fonts.heavy, fontSize: size * 0.34, color: solid ? colors.onPrimary : colors.primary }}>{initials}</Text>
      )}
    </View>
  );
}

const styles = themed(() => ({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
}));
