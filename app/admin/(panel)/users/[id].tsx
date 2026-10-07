// Foydalanuvchi kartochkasi: buyurtmalari, yozgan sharhlari, bloklash, qo'llab-quvvatlash chati, usta profili
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ban, MessagesSquare, Unlock, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { ConfirmDialog, ReasonDialog } from '@/components/admin/Dialog';
import { fmtAgo, fmtDateOnly, fmtDateTime, fmtNum, fmtSum, initials } from '@/components/admin/format';
import { AButton, Empty, ErrorBox, KV, Panel, Skeleton } from '@/components/admin/kit';
import { LogList } from '@/components/admin/LogList';
import { PhoneActions, RoleBadge } from '@/components/admin/people';
import { ReviewItem } from '@/components/admin/ReviewItem';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { CategoryLabel, OrderBadge } from '@/components/admin/status';
import { DataTable } from '@/components/admin/Table';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi } from '@/lib/admin';
import { useAdminAction, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

export default function UserPage() {
  useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mode } = useAdminLayout();
  const q = useAdminQuery(`user-${id}`, () => adminApi.user(id));
  const orders = useAdminQuery(`user-orders-${id}`, () => adminApi.orders({ filter: 'all', q: '', category: null, days: null, clientId: id, page: 0, pageSize: 10 }));
  const reviews = useAdminQuery(`user-reviews-${id}`, () => adminApi.reviews({ stars: null, q: '', clientId: id, page: 0, pageSize: 5 }));
  const [dialog, setDialog] = useState<null | 'block' | 'unblock'>(null);
  const { run } = useAdminAction();
  const u = q.data;
  const wide = mode !== 'mobile';

  if (q.error && !u) {
    return (
      <AdminPage title={t('admin.nav.users')} back="/admin/users">
        <ErrorBox text={q.error} onRetry={q.reload} />
      </AdminPage>
    );
  }
  if (u === null) {
    return (
      <AdminPage title={t('admin.nav.users')} back="/admin/users">
        <Empty text={t('admin.users.notFound')} />
      </AdminPage>
    );
  }
  const name = u ? u.name || t('admin.users.noName') : '';

  return (
    <AdminPage title={u ? name : t('admin.nav.users')} subtitle={u ? t('admin.users.since', { date: fmtDateOnly(u.createdAt) }) : undefined} back="/admin/users" onRefresh={q.reload} refreshing={q.refreshing}>
      {!u ? (
        <Skeleton h={140} r={18} />
      ) : (
        <>
          <Panel>
            <View style={styles.hero}>
              <Avatar initials={initials(u.name)} size={64} />
              <View style={styles.flex}>
                <RoleBadge u={u} />
                <PhoneActions phone={u.phone} />
              </View>
            </View>
            {u.blockedAt ? (
              <View style={styles.alert}>
                <Ban size={18} color={colors.danger} strokeWidth={2.4} />
                <Text style={styles.alertText}>{t('admin.masters.blockedInfo', { date: fmtDateTime(u.blockedAt), reason: u.blockedReason ?? '—' })}</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <AButton title={t('admin.users.supportChat')} icon={MessagesSquare} onPress={() => router.push(`/admin/support?u=${u.id}` as Href)} />
              {u.isMaster ? <AButton title={t('admin.users.masterProfile')} icon={Wrench} onPress={() => router.push(`/admin/masters/${u.id}` as Href)} /> : null}
              {u.role !== 'admin' ? (
                u.blockedAt ? (
                  <AButton title={t('admin.block.unblock')} icon={Unlock} onPress={() => setDialog('unblock')} />
                ) : (
                  <AButton title={t('admin.block.block')} icon={Ban} kind="danger" onPress={() => setDialog('block')} />
                )
              ) : null}
            </View>
          </Panel>

          <View style={[styles.cols, !wide && styles.stack]}>
            <View style={[styles.col, wide && { flex: 1.5 }]}>
              <Panel title={t('admin.users.orders')} padded={false} actions={<AButton size="sm" kind="ghost" title={t('admin.common.all')} onPress={() => router.push(`/admin/orders?u=${u.id}&d=all` as Href)} />}>
                <DataTable
                  rows={orders.data?.rows}
                  loading={orders.loading}
                  keyOf={(o) => o.id}
                  emptyText={t('admin.orders.empty')}
                  onRowPress={(o) => router.push(`/admin/orders/${o.id}` as Href)}
                  minWidth={560}
                  columns={[
                    { key: 'c', title: t('admin.col.order'), flex: 2, render: (o) => <CategoryLabel id={o.categoryId} problem={o.problemId} /> },
                    { key: 'd', title: t('admin.col.date'), width: 120, render: (o) => <Text style={styles.small}>{fmtDateTime(o.createdAt)}</Text> },
                    { key: 's', title: t('admin.col.status'), width: 130, render: (o) => <OrderBadge status={o.status} /> },
                    { key: 't', title: t('admin.col.sum'), width: 110, align: 'right', render: (o) => <Text style={styles.num}>{o.status === 'completed' ? fmtSum(o.total) : '—'}</Text> },
                  ]}
                  card={(o) => (
                    <View style={styles.cardRow}>
                      <View style={styles.flex}>
                        <CategoryLabel id={o.categoryId} problem={o.problemId} />
                      </View>
                      <OrderBadge status={o.status} />
                    </View>
                  )}
                />
              </Panel>
              <Panel title={t('admin.users.reviews')}>
                {reviews.data?.rows.length ? (
                  <View style={styles.list}>
                    {reviews.data.rows.map((r) => (
                      <ReviewItem key={r.id} r={r} />
                    ))}
                  </View>
                ) : reviews.loading ? (
                  <Skeleton h={60} />
                ) : (
                  <Empty text={t('admin.reviews.empty')} />
                )}
              </Panel>
            </View>
            <View style={styles.col}>
              <Panel title={t('admin.masters.info')}>
                <KV label={t('admin.col.orders')} value={t('admin.users.ordersLine', { n: fmtNum(u.ordersCount), done: fmtNum(u.completedCount) })} />
                <KV label={t('admin.col.spent')} value={fmtSum(u.spent)} />
                <KV label={t('admin.col.lastOrder')} value={u.lastOrderAt ? fmtAgo(u.lastOrderAt) : '—'} />
                <KV label={t('admin.masters.language')} value={t(`admin.lang.${u.language}`)} />
                <KV label={t('admin.col.registered')} value={fmtDateTime(u.createdAt)} />
                <KV label="ID" value={u.id} mono />
              </Panel>
              <Panel title={t('admin.log.forTarget')} padded={false}>
                <LogList targetId={u.id} pageSize={5} />
              </Panel>
            </View>
          </View>

          <ReasonDialog
            visible={dialog === 'block'}
            onClose={() => setDialog(null)}
            title={t('admin.block.title', { name })}
            text={u.isMaster ? t('admin.block.textMaster') : t('admin.block.textClient')}
            confirmLabel={t('admin.block.block')}
            danger
            presets={[t('admin.block.p1'), t('admin.block.p2'), t('admin.block.p3')]}
            onSubmit={async (reason) => {
              const r = await run(() => adminApi.setBlocked(u.id, true, reason), t('admin.block.done', { name }));
              return r.ok ? null : r.error;
            }}
          />
          <ConfirmDialog
            visible={dialog === 'unblock'}
            onClose={() => setDialog(null)}
            title={t('admin.block.unblockTitle', { name })}
            confirmLabel={t('admin.block.unblock')}
            onConfirm={async () => {
              const r = await run(() => adminApi.setBlocked(u.id, false), t('admin.block.undone', { name }));
              return r.ok ? null : r.error;
            }}
          />
        </>
      )}
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0, gap: 6 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.dangerSoft },
  alertText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.danger },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  cols: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  col: { flex: 1, minWidth: 0, gap: 18 },
  list: { gap: 10 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  num: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink, fontVariant: ['tabular-nums'] },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));
