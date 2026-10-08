// Buyurtmalar tarixi ro'yxati: "Buyurtmalar" bo'limi (pastki menyu) va /client/history ekrani
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { CircleAlert, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';
import { Avatar, RatingBadge, Squish, Text } from '@/components/ui';
import { getCategory, WARRANTY_DAYS } from '@/constants/categories';
import { ReportSheet } from '@/components/sheets/ReportSheet';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import type { CategoryId } from '@/constants/categories';
import { formatDate, formatSum, t } from '@/lib/i18n';
import { mockMasters } from '@/mocks';
import type { HistoryItem } from '@/mocks';
import { useHistory, useOrder, useUser } from '@/store';
import { LIVE, liveSyncHistory } from '@/lib/live';

export function HistoryList() {
  useScheme();
  const items = useHistory((s) => s.items);
  // Server rejimida tarix serverdan ham olinadi (boshqa telefon / Telegram'dan berilgan buyurtmalar)
  const phone = useUser((s) => s.phone);
  useEffect(() => {
    if (LIVE && phone) void liveSyncHistory().catch(() => {});
  }, [phone]);
  if (!items.length) return <Text variant="small">{t('history.empty')}</Text>;
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <HistoryCard key={item.id} item={item} />
      ))}
    </View>
  );
}

const initialsOf = (name: string) =>
  name.split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase() || '—';

const DAY = 86_400_000;

function HistoryCard({ item }: { item: HistoryItem }) {
  useScheme();
  const [report, setReport] = useState<'problem' | 'warranty' | null>(null);
  // Kafolat: ish bajarilgan (narxga rozi bo'lingan) va 30 kun o'tmagan
  const warrantyLeft = item.status === 'completed' && !item.inspectionOnly ? Math.ceil((item.at + WARRANTY_DAYS * DAY - Date.now()) / DAY) : 0;
  const { reset, setDraft } = useOrder();
  const again = (categoryId: CategoryId, problemId: string, masterId: string | null) => {
    reset();
    setDraft({ categoryId, problemId, preferredMasterId: masterId, scheduledAt: null });
    router.push('/client/order');
  };

      const m = mockMasters.find((x) => x.id === item.masterId);
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
              <Text variant="caption" numberOfLines={1}>
                {formatDate(new Date(item.at))}
                {item.address ? ` · ${item.address}` : ''}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: done ? colors.successSoft : colors.field }]}>
              <Text style={[styles.badgeText, { color: done ? colors.success : colors.ink2 }]}>
                {item.inspectionOnly ? t('history.statusInspection') : done ? t('history.statusCompleted') : t('history.statusCancelled')}
              </Text>
            </View>
          </View>
          {item.comment || item.cancelReason ? (
            <Text variant="small" style={styles.note} numberOfLines={2}>
              {item.cancelReason ? `${t('cancel.reasonLabel')}: ${t(`cancel.reasons.${item.cancelReason}`)}` : `“${item.comment}”`}
            </Text>
          ) : null}
          <View style={styles.bottom}>
            {m || item.masterName ? <Avatar initials={m?.initials ?? initialsOf(item.masterName ?? '')} size={34} /> : null}
            <View style={styles.flex}>
              <Text style={styles.name}>{m?.name ?? item.masterName ?? t('history.noMaster')}</Text>
              {done ? <Text variant="caption">{formatSum(item.price)}</Text> : null}
            </View>
            {item.stars ? <RatingBadge value={item.stars} /> : null}
            <Squish accessibilityRole="button" onPress={() => again(item.categoryId, item.problemId, item.status === 'completed' ? (m?.id ?? item.masterId ?? null) : null)} style={styles.again}>
              <RotateCcw size={16} color={colors.primary} strokeWidth={2.4} />
              <Text style={styles.againText}>{t('history.again')}</Text>
            </Squish>
          </View>
          {/* Murojaat: kafolat (30 kun ichida) yoki muammo — admin ko'radi, javob "Yordam" chatiga keladi */}
          <View style={styles.actions}>
            {warrantyLeft > 0 ? (
              <Squish accessibilityRole="button" onPress={() => setReport('warranty')} style={styles.action}>
                <ShieldCheck size={16} color={colors.success} strokeWidth={2.4} />
                <Text style={[styles.actionText, { color: colors.success }]}>{t('history.warranty', { days: warrantyLeft })}</Text>
              </Squish>
            ) : null}
            <Squish accessibilityRole="button" onPress={() => setReport('problem')} style={styles.action}>
              <CircleAlert size={16} color={colors.ink2} strokeWidth={2.4} />
              <Text style={styles.actionText}>{t('history.problem')}</Text>
            </Squish>
          </View>
          <ReportSheet orderId={item.id} warranty={report === 'warranty'} visible={report !== null} onClose={() => setReport(null)} />
        </View>
      );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  list: { gap: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.line, padding: 14, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bold, fontSize: 12 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  name: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  note: { color: colors.ink, fontStyle: 'italic' },
  again: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.primarySoft },
  againText: { fontFamily: fonts.bold, fontSize: 13, color: colors.primary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.field },
  actionText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink2 },
}));
