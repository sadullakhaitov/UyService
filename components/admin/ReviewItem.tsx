// Sharh kartochkasi: baho, teglar, izoh, mijoz → usta, buyurtma; moderatsiya (o'chirish)
import { router, type Href } from 'expo-router';
import { Star, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import type { AdminReview } from '@/lib/admin';
import { t } from '@/lib/i18n';
import { CategoryIcon } from './CategoryIcon';
import { fmtDateTime, fmtPhone, shortId } from './format';
import { AButton, Badge } from './kit';

export function Stars({ n }: { n: number }) {
  useScheme();
  return (
    <View style={styles.stars} accessible accessibilityLabel={t('admin.reviews.starsLabel', { n })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} color={i <= n ? colors.accent : colors.starEmpty} fill={i <= n ? colors.accent : 'transparent'} strokeWidth={2} />
      ))}
    </View>
  );
}

export function ReviewItem({ r, hideMaster, onDelete }: { r: AdminReview; hideMaster?: boolean; onDelete?: () => void }) {
  useScheme();
  const low = r.stars <= 2;
  return (
    <View style={[styles.card, low && { borderColor: colors.dangerStrong }]}>
      <View style={styles.top}>
        <Stars n={r.stars} />
        {low ? <Badge label={t('admin.reviews.complaint')} tone="danger" /> : null}
        <View style={styles.flex} />
        <Text variant="caption">{fmtDateTime(r.createdAt)}</Text>
        {onDelete ? <AButton size="sm" kind="ghost" icon={Trash2} accessibilityLabel={t('admin.reviews.delete')} onPress={onDelete} /> : null}
      </View>
      {r.comment ? <Text style={styles.comment}>«{r.comment}»</Text> : <Text variant="caption">{t('admin.reviews.noComment')}</Text>}
      {r.tags.length ? (
        <View style={styles.tags}>
          {r.tags.map((tag) => (
            <Badge key={tag} label={t(`rate.tags.${tag}`)} tone="primary" />
          ))}
        </View>
      ) : null}
      <View style={styles.meta}>
        <CategoryIcon id={r.categoryId} size={22} />
        <Text style={styles.link} onPress={() => router.push(`/admin/users/${r.clientId}` as Href)}>
          {r.clientName || fmtPhone(r.clientPhone)}
        </Text>
        {!hideMaster ? (
          <>
            <Text variant="caption">→</Text>
            <Text style={styles.link} onPress={() => router.push(`/admin/masters/${r.masterId}` as Href)}>
              {r.masterName ?? '—'}
            </Text>
          </>
        ) : null}
        <Text style={styles.link} onPress={() => router.push(`/admin/orders/${r.orderId}` as Href)}>
          {shortId(r.orderId)}
        </Text>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  card: { gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stars: { flexDirection: 'row', gap: 2 },
  comment: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  link: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.primary, cursor: 'pointer' },
}));
