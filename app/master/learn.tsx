import { ChevronDown, Gauge, HandCoins, MapPinned, ShieldCheck, Star, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Squish, Text } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';

const TOPICS: { key: string; icon: LucideIcon }[] = [
  { key: 'dispatch', icon: MapPinned },
  { key: 'activity', icon: Gauge },
  { key: 'rating', icon: Star },
  { key: 'money', icon: HandCoins },
  { key: 'safety', icon: ShieldCheck },
];

// O'qish: ustalar uchun qisqa qo'llanma (buyurtma qanday keladi, aktivlik, reyting, pul, xavfsizlik)
export default function Learn() {
  const [open, setOpen] = useState<string | null>('dispatch');
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('profile.learn')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {TOPICS.map(({ key, icon: Icon }) => {
          const on = open === key;
          return (
            <Squish key={key} accessibilityRole="button" accessibilityState={{ expanded: on }} scaleTo={0.99} onPress={() => setOpen(on ? null : key)} style={styles.card}>
              <View style={styles.head}>
                <View style={styles.icon}>
                  <Icon size={22} color={colors.primary} strokeWidth={2.2} />
                </View>
                <Text style={styles.title}>{t(`learn.${key}Title`)}</Text>
                <ChevronDown size={20} color={colors.ink} style={on ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </View>
              {on ? (
                <View style={styles.body}>
                  {t(`learn.${key}Body`)
                    .split('|')
                    .map((line) => (
                      <View key={line} style={styles.line}>
                        <View style={styles.bullet} />
                        <Text variant="small" style={styles.lineText}>
                          {line}
                        </Text>
                      </View>
                    ))}
                </View>
              ) : null}
            </Squish>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 10 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  body: { gap: 8, paddingLeft: 4 },
  line: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 8 },
  lineText: { flex: 1, color: colors.ink },
});
