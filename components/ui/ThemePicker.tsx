import { Moon, Smartphone, Sun, type LucideIcon } from 'lucide-react-native';
import { Appearance, View } from 'react-native';
import { colors, fonts, getScheme, radius, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useUser, type ThemeMode } from '@/store';
import { Squish } from './Pressable';
import { useThemeReveal } from './ThemeReveal';
import { Text } from './Text';

const MODES: { mode: ThemeMode; icon: LucideIcon }[] = [
  { mode: 'system', icon: Smartphone },
  { mode: 'light', icon: Sun },
  { mode: 'dark', icon: Moon },
];

// Ko'rinish: avtomatik (telefon sozlamasi), kunduzgi, tungi
export function ThemePicker() {
  useScheme();
  const { themeMode, setThemeMode } = useUser();
  const current = themeMode ?? 'system';
  const reveal = useThemeReveal();
  // Yangi rejim joriydan farq qilsa — bosilgan joydan doira bo'lib ochiladi (Telegram'dagidek)
  const choose = (mode: ThemeMode, x: number, y: number) => {
    const target = mode === 'system' ? (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light') : mode;
    if (target === getScheme()) return setThemeMode(mode);
    reveal({ x, y }, () => setThemeMode(mode));
  };
  return (
    <View style={styles.row}>
      {MODES.map(({ mode, icon: Icon }) => {
        const on = mode === current;
        return (
          <Squish
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={(e) => choose(mode, e.nativeEvent.pageX, e.nativeEvent.pageY)}
            style={[styles.item, on && styles.itemOn]}
          >
            <Icon size={22} color={on ? colors.primary : colors.ink2} strokeWidth={2.2} />
            <Text style={[styles.text, on && { color: colors.primary }]}>{t(`theme.${mode}`)}</Text>
          </Squish>
        );
      })}
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', gap: 8 },
  item: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 2, borderColor: 'transparent' },
  itemOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
}));
