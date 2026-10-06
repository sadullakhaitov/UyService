import { StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { LANGS, t } from '@/lib/i18n';
import { useUser } from '@/store';
import { Flag } from './Flag';
import { Squish } from './Pressable';
import { Text } from './Text';

// Til tanlash ro'yxati (mijoz profili, usta sozlamalari)
export function LanguagePicker() {
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
          <Flag lang={l} size={36} />
          <Text style={styles.langText}>{t(`lang.${l}`)}</Text>
        </Squish>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  langs: { gap: 8 },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 2, borderColor: 'transparent' },
  langOn: { borderColor: colors.primary },
  langText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
});
