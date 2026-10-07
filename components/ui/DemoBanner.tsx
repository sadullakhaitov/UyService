// "Sinov rejimi" yozuvi: server ulanmaguncha ilova tepasida doim turadi — odam namunaviy usta
// haqiqatan kelyapti deb o'ylamasin. Bosilsa — tushuntirish. Brauzerda — sahifani pastga suradigan chiziq,
// telefonda (Expo Go) — holat qatori ostidagi kichik yorliq.
import { Info } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { DEMO } from '@/lib/demo';
import { notice } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { Text } from './Text';

const explain = () => notice(t('demo.title'), t('demo.text'));

/** Brauzer: sahifa tepasidagi chiziq (kontent uning ostidan boshlanadi) */
export function DemoBar() {
  useScheme();
  if (!DEMO || Platform.OS !== 'web') return null;
  return (
    <Pressable accessibilityRole="button" onPress={explain} style={styles.bar}>
      <Info size={14} color={colors.accentInk} strokeWidth={2.6} />
      <Text style={styles.barText} numberOfLines={1}>
        {t('demo.banner')}
      </Text>
    </Pressable>
  );
}

/** Telefon: holat qatori ostida, ekran ustida suzib turadigan yorliq */
export function DemoBadge() {
  useScheme();
  const insets = useSafeAreaInsets();
  if (!DEMO || Platform.OS === 'web') return null;
  return (
    <View pointerEvents="box-none" style={[styles.badgeWrap, { top: Math.max(insets.top - 4, 0) }]}>
      <Pressable accessibilityRole="button" onPress={explain} hitSlop={8} style={styles.badge}>
        <Text style={styles.badgeText}>{t('demo.short')}</Text>
      </Pressable>
    </View>
  );
}

const styles = themed(() => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 12,
    backgroundColor: colors.accentSoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  barText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.accentInk, flexShrink: 1 },
  badgeWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 50 },
  badge: { paddingHorizontal: 8, height: 18, borderRadius: 9, justifyContent: 'center', backgroundColor: colors.accent },
  badgeText: { fontFamily: fonts.heavy, fontSize: 10, lineHeight: 13, color: colors.onPrimary, letterSpacing: 0.4 },
}));
