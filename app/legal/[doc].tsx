import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Text } from '@/components/ui';
import { DRAFT_NOTE, legal, type LegalDoc, type LegalLang } from '@/constants/legal';
import { colors, fonts, radius } from '@/constants/theme';
import { getLanguage } from '@/lib/i18n';

const isDoc = (v: unknown): v is LegalDoc => v === 'terms' || v === 'privacy';

// Huquqiy hujjat: /legal/terms — Foydalanish shartlari, /legal/privacy — Maxfiylik siyosati
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  if (!isDoc(doc)) return null;
  const lang: LegalLang = getLanguage() ?? 'uz';
  const text = legal[doc][lang] ?? legal[doc].uz;
  const note = DRAFT_NOTE[lang] ?? DRAFT_NOTE.uz;

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={text.title} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="caption">{text.updated}</Text>
        <View style={styles.note}>
          <Text variant="small" style={styles.noteText}>
            {note}
          </Text>
        </View>
        {text.sections.map((s) => (
          <View key={s.h} style={styles.section}>
            <Text style={styles.h}>{s.h}</Text>
            {s.p.map((p, i) => (
              <Text key={i} style={styles.p}>
                {p}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, gap: 16 },
  note: { backgroundColor: colors.accentSoft, borderRadius: radius.card, padding: 14 },
  noteText: { color: colors.accentInk, fontFamily: fonts.medium },
  section: { gap: 8 },
  h: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 23, color: colors.ink },
  p: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.ink },
});
