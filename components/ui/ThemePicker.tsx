import { Moon, Smartphone, Sun, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { colors, fonts, radius, themed } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useUser, type ThemeMode } from '@/store';
import { Squish } from './Pressable';
import { Text } from './Text';

const MODES: { mode: ThemeMode; icon: LucideIcon }[] = [
  { mode: 'system', icon: Smartphone },
  { mode: 'light', icon: Sun },
  { mode: 'dark', icon: Moon },
];

// Ko'rinish: avtomatik (telefon sozlamasi), kunduzgi, tungi
export function ThemePicker() {
  const { themeMode, setThemeMode } = useUser();
  const current = themeMode ?? 'system';
  return (
    <View style={styles.row}>
      {MODES.map(({ mode, icon: Icon }) => {
        const on = mode === current;
        return (
          <Squish
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => setThemeMode(mode)}
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
