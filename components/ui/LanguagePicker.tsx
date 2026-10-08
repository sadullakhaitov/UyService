import { View } from 'react-native';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { LANGS, t } from '@/lib/i18n';
import { useUser } from '@/store';
import { Flag } from './Flag';
import { Squish } from './Pressable';
import { Text } from './Text';

// Til tanlash — 3 ta yonma-yon kartochka, "Ko'rinish" (ThemePicker) bilan bir xil uslubda (mijoz profili, usta sozlamalari)
export function LanguagePicker() {
  useScheme();
  const { language, setLanguage } = useUser();
  return (
    <View style={styles.langs}>
      {LANGS.map((l) => (
        <Squish
          key={l}
          accessibilityRole="radio"
          accessibilityState={{ selected: l === language }}
          onPress={() => setLanguage(l)}
          style={[styles.lang, l === language && styles.langOn]}
        >
          <Flag lang={l} size={32} />
          <Text style={[styles.langText, l === language && { color: colors.primary }]} numberOfLines={1}>
            {t(`lang.${l}`)}
          </Text>
        </Squish>
      ))}
    </View>
  );
}

const styles = themed(() => ({
  langs: { flexDirection: 'row', gap: 8 },
  lang: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 4, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 2, borderColor: 'transparent' },
  langOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  langText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
}));
