import { useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Briefcase, Clock3, Star } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, ScreenHeader, Text } from '@/components/ui';
import { getCategory, type CategoryId } from '@/constants/categories';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatDate, t } from '@/lib/i18n';
import { mockMasters, mockReviews } from '@/mocks';
import { useHistory } from '@/store';

const TAGS = ['onTime', 'clean', 'fair', 'polite', 'fast'] as const;

// Usta haqida: reyting, tajriba, mijozlar ko'p belgilagan sifatlar va sharhlar (5-bosqichda reviews jadvali)
export default function MasterInfo() {
  useScheme();
  const { id, cat } = useLocalSearchParams<{ id: string; cat?: CategoryId }>();
  const master = mockMasters.find((m) => m.id === id);
  const history = useHistory((s) => s.items);
  const c = getCategory(cat ?? master?.categories[0] ?? 'plumber');

  // O'zimiz qo'ygan baholar ham sharhlar qatorida
  const reviews = useMemo(() => {
    const mine = history
      .filter((h) => h.masterId === id && h.stars)
      .map((h) => ({ id: `h${h.id}`, author: t('reviews.you'), stars: h.stars!, text: h.comment ?? '', tags: h.tags ?? [], at: h.at }));
    return [...mine, ...mockReviews.filter((r) => r.masterId === id)].sort((a, b) => b.at - a.at);
  }, [history, id]);

  if (!master) return null;
  const tagCount = TAGS.map((tag) => ({ tag, n: reviews.filter((r) => r.tags.includes(tag)).length })).filter((x) => x.n > 0);
  const maxTag = Math.max(1, ...tagCount.map((x) => x.n));

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('reviews.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.head}>
          <View style={[styles.ring, { borderColor: c.main }]}>
            <Avatar initials={master.initials} size={72} />
          </View>
          <View style={styles.nameRow}>
            <Text variant="h2">{master.name}</Text>
            {master.verified ? <BadgeCheck size={20} color={colors.onPrimary} fill={c.main} accessibilityLabel={t('tracking.verified')} /> : null}
          </View>
          <Text variant="small">{master.categories.map((x) => t(`categories.${x}`)).join(' · ')}</Text>
        </View>

        <View style={styles.stats}>
          <Stat icon={<Star size={20} color={colors.accent} fill={colors.accent} />} value={master.rating.toFixed(1)} label={t('reviews.count', { n: reviews.length })} />
          <Stat icon={<Briefcase size={20} color={c.ink} strokeWidth={2.2} />} value={String(master.jobsCount)} label={t('reviews.jobs')} />
          <Stat icon={<Clock3 size={20} color={c.ink} strokeWidth={2.2} />} value={`${master.onTimePercent}%`} label={t('reviews.onTime')} />
        </View>

        {tagCount.length ? (
          <View style={styles.card}>
            <Text variant="bodyBold">{t('reviews.praised')}</Text>
            {tagCount.map(({ tag, n }) => (
              <View key={tag} style={styles.tagRow}>
                <Text variant="small" style={styles.tagLabel}>
                  {t(`rate.tags.${tag}`)}
                </Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(n / maxTag) * 100}%`, backgroundColor: c.main }]} />
                </View>
                <Text style={styles.tagN}>{n}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.section}>{t('tracking.reviews')}</Text>
        {reviews.length ? (
          reviews.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.revHead}>
                <Avatar initials={r.author.slice(0, 1).toUpperCase()} size={36} />
                <View style={styles.flex}>
                  <Text variant="bodyBold">{r.author}</Text>
                  <Text variant="caption">{formatDate(new Date(r.at))}</Text>
                </View>
                <View style={styles.stars}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={14} color={colors.accent} fill={i < r.stars ? colors.accent : 'transparent'} strokeWidth={2} />
                  ))}
                </View>
              </View>
              {r.text ? <Text variant="small" style={styles.revText}>{r.text}</Text> : null}
              {r.tags.length ? (
                <View style={styles.chips}>
                  {r.tags.map((tag) => (
                    <View key={tag} style={[styles.chip, { backgroundColor: c.tint }]}>
                      <Text style={[styles.chipText, { color: c.ink }]}>{t(`rate.tags.${tag}`)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Text variant="small">{t('reviews.empty')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  useScheme();
  return (
    <View style={styles.stat}>
      {icon}
      <Text style={styles.statValue}>{value}</Text>
      <Text variant="caption" style={styles.center}>
        {label}
      </Text>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  head: { alignItems: 'center', gap: 6 },
  ring: { borderWidth: 3, borderRadius: 26, padding: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 4, padding: 12, borderRadius: radius.card, backgroundColor: colors.surface },
  statValue: { fontFamily: fonts.heavy, fontSize: 20, color: colors.ink },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: 14, gap: 10 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tagLabel: { width: 110, color: colors.ink },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.field, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  tagN: { width: 22, textAlign: 'right', fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  section: { fontFamily: fonts.heavy, fontSize: 18, color: colors.ink, marginTop: 4 },
  revHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stars: { flexDirection: 'row', gap: 2 },
  revText: { color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
  chipText: { fontFamily: fonts.bold, fontSize: 12 },
}));
