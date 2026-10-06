import { router } from 'expo-router';
import { RotateCcw } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, RatingBadge, ScreenHeader, Squish, Text } from '@/components/ui';
import { getCategory } from '@/constants/categories';
import { colors, fonts, radius } from '@/constants/theme';
import { formatSum, t } from '@/lib/i18n';
import { mockHistory, mockMasters } from '@/mocks';
import { useOrder } from '@/store';

export default function History() {
  const { reset, setDraft } = useOrder();

  const again = (categoryId: (typeof mockHistory)[number]['categoryId'], problemId: string, masterId: string) => {
    reset();
    setDraft({ categoryId, problemId, preferredMasterId: masterId });
    router.push('/client/order');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader title={t('history.title')} />
      <FlatList
        data={mockHistory}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text variant="small">{t('history.empty')}</Text>}
        renderItem={({ item }) => {
          const m = mockMasters.find((x) => x.id === item.masterId)!;
          const c = getCategory(item.categoryId);
          const Icon = c.icon;
          const done = item.status === 'completed';
          return (
            <View style={styles.card}>
              <View style={styles.top}>
                <View style={[styles.icon, { backgroundColor: c.tint }]}>
                  <Icon size={22} color={c.ink} strokeWidth={2} />
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyBold">
                    {t(`categories.${item.categoryId}`)} · {t(`problems.${item.problemId}`)}
                  </Text>
                  <Text variant="caption">{item.date}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: done ? colors.successSoft : colors.field }]}>
                  <Text style={[styles.badgeText, { color: done ? colors.success : colors.ink2 }]}>
                    {done ? t('history.statusCompleted') : t('history.statusCancelled')}
                  </Text>
                </View>
              </View>
              <View style={styles.bottom}>
                <Avatar initials={m.initials} size={34} />
                <View style={styles.flex}>
                  <Text style={styles.name}>{m.name}</Text>
                  {done ? <Text variant="caption">{formatSum(item.price)}</Text> : null}
                </View>
                {item.stars ? <RatingBadge value={item.stars} /> : null}
                <Squish accessibilityRole="button" onPress={() => again(item.categoryId, item.problemId, m.id)} style={styles.again}>
                  <RotateCcw size={16} color={colors.primary} strokeWidth={2.4} />
                  <Text style={styles.againText}>{t('history.again')}</Text>
                </Squish>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  again: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primarySoft },
  againText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
});
