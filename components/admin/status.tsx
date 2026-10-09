// Holatlar: buyurtma, hujjat tekshiruvi, balans amali — nomi va rangi bir joyda
import { CategoryIcon } from './CategoryIcon';
import { Badge, type Tone } from './kit';
import { t } from '@/lib/i18n';
import type { BalanceKind, CancelledBy, OrderStatus, VerifyStatus } from '@/lib/admin/types';
import type { CategoryId } from '@/constants/categories';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';

const ORDER_TONE: Record<OrderStatus, Tone> = {
  scheduled: 'neutral',
  searching: 'info',
  assigned: 'primary',
  on_the_way: 'primary',
  arrived: 'warning',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};
const VERIFY_TONE: Record<VerifyStatus, Tone> = { none: 'neutral', pending: 'warning', approved: 'success', rejected: 'danger' };
export const KIND_TONE: Record<BalanceKind, Tone> = { topup: 'success', bonus: 'primary', refund: 'info', adjust: 'warning', fee: 'neutral' };

export const OrderBadge = ({ status }: { status: OrderStatus }) => <Badge label={t(`admin.status.${status}`)} tone={ORDER_TONE[status]} dot />;
export const VerifyBadge = ({ status }: { status: VerifyStatus }) => <Badge label={t(`admin.verify.${status}`)} tone={VERIFY_TONE[status]} />;
export const KindBadge = ({ kind }: { kind: BalanceKind }) => <Badge label={t(`admin.kind.${kind}`)} tone={KIND_TONE[kind]} />;

/** Bekor qilish sababi: ilovadagi kalit bo'lsa — tarjima, aks holda o'zi */
export function cancelReasonText(reason: string | null, by?: CancelledBy | null) {
  if (!reason) return '—';
  if (reason === 'noMasters') return t('admin.orders.noMasters');
  if (reason === 'client_absent') reason = 'clientAbsent';
  const k = `cancel.reasons.${reason}`;
  const tr = t(k);
  const text = tr === k ? reason : tr;
  return by ? `${text} · ${t(`admin.by.${by}`)}` : text;
}

/** Kategoriya: ikonka + nomi + muammo */
export function CategoryLabel({ id, problem }: { id: CategoryId; problem?: string | null }) {
  useScheme();
  return (
    <View style={styles.row}>
      <CategoryIcon id={id} />
      <View style={styles.min}>
        <Text numberOfLines={1} style={styles.title}>
          {t(`categories.${id}`)}
        </Text>
        {problem ? (
          <Text numberOfLines={1} style={styles.sub}>
            {t(`problems.${problem}`)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  min: { minWidth: 0, flexShrink: 1 },
  title: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  sub: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
}));
