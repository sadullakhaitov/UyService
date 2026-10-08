// Admin amallari jurnali: kim, qachon, nima qildi (tushunarli matn bilan), obyektga havola
import { router, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import { Ban, BadgeCheck, CalendarPlus, Gauge, ShieldPlus, Tag, Ticket, Trash2, Unlock, Wallet, XCircle } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type LogAction, type LogEntry } from '@/lib/admin';
import { useAdminQuery } from '@/lib/admin/hooks';
import { formatRange, t } from '@/lib/i18n';
import { fmtDateTime, fmtPhone, fmtSum, shortId } from './format';
import { Empty, ErrorBox, Pager, SkeletonRows, useHover } from './kit';

const ICON: Record<LogAction, LucideIcon> = {
  verify: BadgeCheck,
  balance: Wallet,
  subscription: CalendarPlus,
  priority: Gauge,
  block: Ban,
  unblock: Unlock,
  cancel: XCircle,
  delete_review: Trash2,
  category: Tag,
  problem: Tag,
  grant_admin: ShieldPlus,
  revoke_admin: ShieldPlus,
  promo: Ticket,
};

const str = (v: unknown) => (v == null || v === '' ? null : String(v));
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v));

/** Jurnal yozuvining tafsiloti (tilda) */
export function logDetails(e: LogEntry): string {
  const d = e.details;
  switch (e.action) {
    case 'verify':
      return [`${t(`admin.verify.${str(d.from) ?? 'none'}`)} → ${t(`admin.verify.${str(d.to) ?? 'none'}`)}`, str(d.note)].filter(Boolean).join(' · ');
    case 'balance': {
      const a = num(d.amount);
      return [`${a > 0 ? '+' : '−'}${fmtSum(Math.abs(a))}`, t(`admin.kind.${str(d.kind) ?? 'adjust'}`), str(d.note)].filter(Boolean).join(' · ');
    }
    case 'subscription':
      return `${t('admin.sub.days', { n: num(d.days) })} · ${fmtSum(num(d.amount))}`;
    case 'priority':
      return `${num(d.from)} → ${num(d.to)}`;
    case 'block':
    case 'unblock':
    case 'cancel':
      return str(d.reason) ?? '';
    case 'delete_review':
      return [`★ ${num(d.stars)}`, str(d.comment) ? `«${str(d.comment)}»` : null, str(d.reason)].filter(Boolean).join(' · ');
    case 'category': {
      const fee = d.call_fee as number[] | undefined;
      const act = d.active as boolean[] | undefined;
      return [fee && fee[0] !== fee[1] ? `${fmtSum(fee[0])} → ${fmtSum(fee[1])}` : null, act && act[0] !== act[1] ? (act[1] ? t('admin.catalog.on') : t('admin.catalog.off')) : null]
        .filter(Boolean)
        .join(' · ');
    }
    case 'problem': {
      const from = (d.from as (number | null)[]) ?? [null, null];
      const to = (d.to as (number | null)[]) ?? [null, null];
      return `${formatRange(from[0], from[1])} → ${formatRange(to[0], to[1])}`;
    }
    case 'grant_admin':
    case 'revoke_admin':
      return fmtPhone(str(d.phone));
    case 'promo':
      return [
        num(d.priority) ? t('promo.gotPriority', { n: num(d.priority) }) : null,
        num(d.bonus) ? `+${fmtSum(num(d.bonus))}` : null,
        d.active === false ? t('admin.promo.off') : null,
      ]
        .filter(Boolean)
        .join(' · ');
    default:
      return '';
  }
}

function targetHref(e: LogEntry): string | null {
  if (!e.targetId) return null;
  if (e.targetType === 'master') return `/admin/masters/${e.targetId}`;
  if (e.targetType === 'user') return `/admin/users/${e.targetId}`;
  if (e.targetType === 'order') return `/admin/orders/${e.targetId}`;
  if (e.targetType === 'category' || e.targetType === 'problem' || e.targetType === 'promo') return '/admin/catalog';
  return null;
}
function targetLabel(e: LogEntry) {
  if (e.targetType === 'order' && e.targetId) return t('admin.log.order', { id: shortId(e.targetId) });
  if (e.targetType === 'category' && e.targetId) return t(`categories.${e.targetId}`);
  if (e.targetType === 'problem' && e.targetId) return t(`problems.${e.targetId}`);
  if (e.targetType === 'promo' && e.targetId) return e.targetId;
  return t(`admin.log.t.${e.targetType}`);
}

export function LogRow({ e, showTarget = true }: { e: LogEntry; showTarget?: boolean }) {
  useScheme();
  const { hovered, bind } = useHover();
  const Icon = ICON[e.action] ?? Tag;
  const href = targetHref(e);
  const danger = e.action === 'block' || e.action === 'cancel' || e.action === 'delete_review' || (e.action === 'verify' && e.details.to === 'rejected');
  const body = (
    <>
      <View style={[styles.icon, { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }]}>
        <Icon size={16} color={danger ? colors.danger : colors.primary} strokeWidth={2.3} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.title} numberOfLines={2}>
          {t(`admin.log.a.${e.action}`)}
          {showTarget ? <Text style={styles.target}>{` · ${targetLabel(e)}`}</Text> : null}
        </Text>
        {logDetails(e) ? (
          <Text style={styles.details} numberOfLines={3}>
            {logDetails(e)}
          </Text>
        ) : null}
        <Text variant="caption">
          {fmtDateTime(e.createdAt)} · {e.adminName || fmtPhone(e.adminPhone)}
        </Text>
      </View>
    </>
  );
  if (!href || !showTarget) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(href as Href)} {...bind} style={[styles.row, { cursor: 'pointer' }, hovered && { backgroundColor: colors.primaryWash }]}>
      {body}
    </Pressable>
  );
}

/** Jurnal (sahifalangan). targetId — faqat bitta obyekt bo'yicha */
export function LogList({ targetId, action, pageSize = 25 }: { targetId?: string; action?: LogAction | null; pageSize?: number }) {
  const [page, setPage] = useState(0);
  const q = useAdminQuery(`log-${targetId ?? ''}-${action ?? ''}-${page}-${pageSize}`, () => adminApi.log({ action: action ?? null, targetId, page, pageSize }));
  if (q.error && !q.data) return <ErrorBox text={q.error} onRetry={q.reload} />;
  if (!q.data) return <SkeletonRows n={3} />;
  if (!q.data.rows.length) return <Empty text={t('admin.log.empty')} />;
  return (
    <View>
      {q.data.rows.map((e) => (
        <LogRow key={e.id} e={e} showTarget={!targetId} />
      ))}
      {q.data.total > pageSize ? (
        <View style={{ padding: 14 }}>
          <Pager page={page} pageSize={pageSize} total={q.data.total} onPage={setPage} />
        </View>
      ) : null}
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0, gap: 2 },
  row: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  target: { fontFamily: fonts.medium, color: colors.ink2 },
  details: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink },
}));
