// Kompyuter brauzeri uchun sahifa ramkasi: oddiy sahifalar o'rtada telefon kengligidagi ustun bo'lib turadi,
// atrofida — yumshoq brend foni va logotip. Xaritali ekranlar (full) — butun oyna bo'ylab.
// Telefonda (va tor brauzer oynasida) hech narsa o'zgarmaydi.
import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { colors, fonts, isDark, themed, useScheme } from '@/constants/theme';
import { PAGE_MAX, useWide } from '@/lib/useLayout';
import { t } from '@/lib/i18n';
import { Logo } from './Logo';
import { Squish } from './Pressable';
import { Text } from './Text';

export function PageFrame({ full, brand = true, children }: { full?: boolean; brand?: boolean; children: ReactNode }) {
  useScheme();
  const wide = useWide();
  const { width } = useWindowDimensions();
  if (!wide || full) return <>{children}</>;
  // Ustun yonida logotip uchun joy bo'lsa
  const roomy = brand && width >= PAGE_MAX + 2 * 300;
  return (
    <View style={styles.backdrop}>
      <View pointerEvents="none" style={[styles.blob, styles.blobA]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobB]} />
      {roomy ? (
        <View style={styles.brand}>
          <Squish accessibilityRole="link" accessibilityLabel={t('about.title')} scaleTo={0.96} onPress={() => router.push('/about')}>
            <Logo size={20} />
          </Squish>
          <Text style={styles.tagline}>{t('app.tagline')}</Text>
        </View>
      ) : null}
      <View style={styles.column}>{children}</View>
    </View>
  );
}

/** Navigator `screenLayout` uchun: `full` ro'yxatidagi ekranlar butun oyna bo'ylab */
export const pageLayout =
  (full: readonly string[], brand = true) =>
  ({ route, children }: { route: { name: string }; children: ReactElement }) => (
    <PageFrame full={full.includes(route.name)} brand={brand}>
      {children}
    </PageFrame>
  );

const styles = themed(() => ({
  backdrop: { flex: 1, flexDirection: 'row', justifyContent: 'center', backgroundColor: colors.webBackdrop, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 9999 },
  blobA: { width: 560, height: 560, left: -180, top: -200, backgroundColor: colors.primary, opacity: isDark() ? 0.18 : 0.07 },
  blobB: { width: 460, height: 460, right: -140, bottom: -180, backgroundColor: colors.accent, opacity: isDark() ? 0.12 : 0.08 },
  brand: { position: 'absolute', left: 32, top: 28, gap: 10, maxWidth: 240 },
  tagline: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  column: {
    flex: 1,
    maxWidth: PAGE_MAX,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
    boxShadow: isDark() ? '0 0 60px rgba(0,0,0,0.5)' : '0 0 60px rgba(11,42,36,0.10)',
  },
}));
