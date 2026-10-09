// Usta kartochkasi: hujjatlar (tasdiqlash / rad etish), tarif va balans, obuna, prioritet, bloklash;
// buyurtmalari, sharhlari, balans tarixi va shu usta bo'yicha admin amallari jurnali.
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Ban, BadgeCheck, CalendarPlus, Gauge, Gift, RotateCcw, ShieldX, Trash2, Unlock, Wallet } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { CategoryIcon } from '@/components/admin/CategoryIcon';
import { ConfirmDialog, ReasonDialog } from '@/components/admin/Dialog';
import { dec, fmtAgo, fmtDateOnly, fmtDateTime, fmtNum, fmtSum, initials } from '@/components/admin/format';
import { AButton, Badge, Empty, ErrorBox, KV, Panel, Skeleton } from '@/components/admin/kit';
import { LogList } from '@/components/admin/LogList';
import { BalanceDialog, FreeDialog, PriorityDialog, SubscriptionDialog } from '@/components/admin/masterDialogs';
import { PhoneActions, PresenceBadge } from '@/components/admin/people';
import { PhotoThumb } from '@/components/admin/Photos';
import { ReviewItem } from '@/components/admin/ReviewItem';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { CategoryLabel, KindBadge, OrderBadge, VerifyBadge } from '@/components/admin/status';
import { Cell, DataTable } from '@/components/admin/Table';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { BALANCE_LIMIT } from '@/constants/billing';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi } from '@/lib/admin';
import { useAdminAction, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

type DialogKey = null | 'approve' | 'reject' | 'recheck' | 'balance' | 'sub' | 'priority' | 'free' | 'block' | 'unblock' | 'delete';

export default function MasterDetail() {
  useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mode } = useAdminLayout();
  const q = useAdminQuery(`master-${id}`, () => adminApi.master(id));
  const orders = useAdminQuery(`master-orders-${id}`, () => adminApi.orders({ filter: 'all', q: '', category: null, days: null, masterId: id, page: 0, pageSize: 10 }));
  const reviews = useAdminQuery(`master-reviews-${id}`, () => adminApi.reviews({ stars: null, q: '', masterId: id, page: 0, pageSize: 6 }));
  const ops = useAdminQuery(`master-ops-${id}`, () => adminApi.balanceOps({ kind: null, masterId: id, page: 0, pageSize: 10 }));
  const [dialog, setDialog] = useState<DialogKey>(null);
  const { run } = useAdminAction();
  const close = () => setDialog(null);

  const m = q.data?.master;
  if (q.error && !q.data) {
    return (
      <AdminPage title={t('admin.nav.masters')} back="/admin/masters">
        <ErrorBox text={q.error} onRetry={q.reload} />
      </AdminPage>
    );
  }
  if (q.data === null) {
    return (
      <AdminPage title={t('admin.nav.masters')} back="/admin/masters">
        <Empty text={t('admin.masters.notFound')} />
      </AdminPage>
    );
  }
  const name = m ? `${m.firstName} ${m.lastName}`.trim() || t('admin.masters.noName') : '';
  const wide = mode !== 'mobile';
  const subActive = !!m?.subscriptionUntil && m.subscriptionUntil > Date.now();

  return (
    <AdminPage title={m ? name : t('admin.nav.masters')} subtitle={m ? t('admin.masters.since', { date: fmtDateOnly(m.createdAt) }) : undefined} back="/admin/masters" onRefresh={q.reload} refreshing={q.refreshing}>
      {!m ? (
        <Skeleton h={160} r={18} />
      ) : (
        <>
          {/* Sarlavha kartochkasi */}
          <Panel>
            <View style={[styles.hero, !wide && styles.heroStack]}>
              <Avatar initials={initials(m.firstName, m.lastName)} size={72} photo={m.photo} />
              <View style={styles.flex}>
                <View style={styles.badges}>
                  <VerifyBadge status={m.verifyStatus} />
                  <PresenceBadge m={m} />
                  {m.plan ? <Badge label={`${t(`admin.plan.${m.plan}`)} · ${m.feePercent}%`} tone="primary" /> : null}
                  {!m.canTake ? <Badge label={t('admin.masters.cantTake')} tone="danger" /> : null}
                </View>
                <PhoneActions phone={m.phone} />
                <View style={styles.cats}>
                  {m.categories.map((c) => (
                    <View key={c} style={styles.cat}>
                      <CategoryIcon id={c} size={22} />
                      <Text style={styles.catText}>{t(`categories.${c}`)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            {m.blockedAt ? (
              <View style={styles.alert}>
                <Ban size={18} color={colors.danger} strokeWidth={2.4} />
                <Text style={[styles.alertText, { color: colors.danger }]}>{t('admin.masters.blockedInfo', { date: fmtDateTime(m.blockedAt), reason: m.blockedReason ?? '—' })}</Text>
              </View>
            ) : null}
            {m.verifyStatus === 'rejected' && m.verifyNote ? (
              <View style={[styles.alert, { backgroundColor: colors.dangerSoft }]}>
                <ShieldX size={18} color={colors.danger} strokeWidth={2.4} />
                <Text style={[styles.alertText, { color: colors.danger }]}>{t('admin.masters.rejectedInfo', { reason: m.verifyNote })}</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              {m.verifyStatus === 'pending' || m.verifyStatus === 'rejected' ? (
                <AButton title={t('admin.verifyAct.approve')} icon={BadgeCheck} kind="success" disabled={!m.passport} onPress={() => setDialog('approve')} />
              ) : null}
              {m.verifyStatus === 'pending' ? <AButton title={t('admin.verifyAct.reject')} icon={ShieldX} kind="danger" onPress={() => setDialog('reject')} /> : null}
              {m.verifyStatus === 'approved' ? <AButton title={t('admin.verifyAct.recheck')} icon={RotateCcw} onPress={() => setDialog('recheck')} /> : null}
              <AButton title={t('admin.balance.button')} icon={Wallet} onPress={() => setDialog('balance')} />
              {m.plan === 'subscription' ? <AButton title={t('admin.sub.button')} icon={CalendarPlus} onPress={() => setDialog('sub')} /> : null}
              <AButton title={t('admin.priority.button')} icon={Gauge} onPress={() => setDialog('priority')} />
              <AButton title={t('admin.free.button')} icon={Gift} onPress={() => setDialog('free')} />
              {m.blockedAt ? (
                <AButton title={t('admin.block.unblock')} icon={Unlock} onPress={() => setDialog('unblock')} />
              ) : (
                <AButton title={t('admin.block.block')} icon={Ban} kind="danger" onPress={() => setDialog('block')} />
              )}
              <AButton title={t('admin.del.button')} icon={Trash2} kind="danger" onPress={() => setDialog('delete')} />
            </View>
            {m.verifyStatus === 'none' ? <Text variant="caption">{t('admin.verifyAct.noDocs')}</Text> : null}
          </Panel>

          <View style={[styles.cols, !wide && styles.stack]}>
            <View style={[styles.col, wide && { flex: 1.5 }]}>
              <Panel title={t('admin.docs.title')} subtitle={m.submittedAt ? t('admin.docs.submitted', { ago: fmtAgo(m.submittedAt) }) : undefined}>
                <View style={styles.photos}>
                  <PhotoThumb uri={q.data!.passportUrl} label={t('admin.docs.passport')} w={wide ? 240 : 150} h={wide ? 160 : 100} />
                  <PhotoThumb uri={q.data!.selfieUrl} label={t('admin.docs.selfie')} w={wide ? 240 : 150} h={wide ? 160 : 100} />
                </View>
                <Text variant="caption" style={{ marginTop: 10 }}>
                  {t('admin.docs.privacy')}
                </Text>
              </Panel>
              <Panel title={t('admin.docs.works')} subtitle={t('admin.docs.worksCount', { n: q.data!.workUrls.length })}>
                {q.data!.workUrls.length ? (
                  <View style={styles.photos}>
                    {q.data!.workUrls.map((u, i) => (
                      <PhotoThumb key={i} uri={u} label={t('admin.docs.work', { n: i + 1 })} w={150} h={100} />
                    ))}
                  </View>
                ) : (
                  <Empty text={t('admin.docs.noWorks')} />
                )}
              </Panel>
              <Panel title={t('admin.masters.orders')} padded={false} actions={<AButton size="sm" kind="ghost" title={t('admin.common.all')} onPress={() => router.push(`/admin/orders?m=${m.id}` as Href)} />}>
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
              <Panel
                title={t('admin.masters.reviewsTitle')}
                subtitle={m.rating ? t('admin.masters.ratingLine', { r: dec(m.rating, 2), n: m.reviewsCount }) : t('admin.masters.noRating')}
                actions={<AButton size="sm" kind="ghost" title={t('admin.common.all')} onPress={() => router.push(`/admin/reviews?m=${m.id}` as Href)} />}
              >
                {reviews.data?.rows.length ? (
                  <View style={styles.list}>
                    {reviews.data.rows.map((r) => (
                      <ReviewItem key={r.id} r={r} hideMaster />
                    ))}
                  </View>
                ) : reviews.loading ? (
                  <Skeleton h={80} />
                ) : (
                  <Empty text={t('admin.reviews.empty')} />
                )}
              </Panel>
            </View>

            <View style={styles.col}>
              <Panel title={t('admin.masters.info')}>
                <KV label={t('admin.masters.experience')} value={t('admin.masters.years', { n: m.experienceYears })} />
                <KV label={t('admin.masters.jobs')} value={fmtNum(m.jobsDone)} />
                <KV label={t('admin.masters.activity')} value={`${m.activity} / 100`} />
                <KV label={t('admin.masters.priority')} value={m.priority > 0 ? `+${m.priority}` : String(m.priority)} />
                <KV label={t('admin.masters.language')} value={t(`admin.lang.${m.language}`)} />
                <KV label={t('admin.masters.lastSeen')} value={m.online ? t('admin.presence.online') : fmtAgo(m.seenAt)} />
                <KV label={t('admin.masters.location')} value={m.location ? `${m.location.latitude.toFixed(4)}, ${m.location.longitude.toFixed(4)}` : '—'} mono />
                <KV label="ID" value={m.id} mono />
              </Panel>
              <Panel title={t('admin.masters.money')}>
                <KV label={t('admin.col.plan')} value={m.plan ? t(`admin.plan.${m.plan}`) : t('admin.masters.noPlan')} />
                <KV label={t('admin.col.fee')} value={`${m.feePercent}%${m.freeUntil && m.freeUntil > Date.now() && m.feePercent === 0 ? ` · ${t('admin.free.period')}` : m.verifyStatus !== 'approved' ? ` · ${t('admin.masters.unverifiedFee')}` : ''}`} />
                <KV label={t('admin.col.balance')}>
                  <Text style={[styles.kvBig, m.balance < BALANCE_LIMIT && m.feePercent > 0 && { color: colors.danger }]}>{fmtSum(m.balance)}</Text>
                  {m.feePercent > 0 ? <Text variant="caption">{t('admin.masters.limit', { sum: fmtSum(BALANCE_LIMIT) })}</Text> : null}
                </KV>
                {m.plan === 'subscription' ? (
                  <KV label={t('admin.sub.until')}>
                    <Text style={[styles.kvBig, !subActive && { color: colors.danger }]}>{m.subscriptionUntil ? fmtDateOnly(m.subscriptionUntil) : '—'}</Text>
                    {!subActive ? <Text variant="caption">{t('admin.sub.expired')}</Text> : null}
                  </KV>
                ) : null}
                <KV label={t('admin.free.period')}>
                  {m.freeUntil && m.freeUntil > Date.now() ? (
                    <>
                      <Badge label={t('admin.free.untilShort', { date: fmtDateOnly(m.freeUntil) })} tone="success" />
                      {m.verifyStatus !== 'pending' && m.verifyStatus !== 'approved' ? <Text variant="caption">{t('admin.free.pausedNoDocs')}</Text> : null}
                    </>
                  ) : (
                    <Text>{m.freeUntil ? t('admin.free.endedOn', { date: fmtDateOnly(m.freeUntil) }) : '—'}</Text>
                  )}
                </KV>
                <KV label={t('admin.masters.canTake')}>
                  {m.canTake ? <Badge label={t('admin.common.yes')} tone="success" /> : <Badge label={m.plan === 'subscription' && !subActive ? t('admin.masters.reasonSub') : t('admin.masters.reasonBalance')} tone="danger" />}
                </KV>
              </Panel>
              <Panel title={t('admin.masters.balanceHistory')} padded={false} actions={<AButton size="sm" kind="ghost" title={t('admin.common.all')} onPress={() => router.push(`/admin/finance?m=${m.id}` as Href)} />}>
                {ops.data?.rows.length ? (
                  ops.data.rows.map((o) => (
                    <View key={o.id} style={styles.op}>
                      <View style={styles.flex}>
                        <KindBadge kind={o.kind} />
                        <Text variant="caption" numberOfLines={1}>
                          {o.note ?? (o.orderId ? t('admin.finance.forOrder') : '')} · {fmtDateTime(o.createdAt)}
                        </Text>
                      </View>
                      <Cell title={<Text style={[styles.num, { color: o.amount > 0 ? colors.success : colors.ink }]}>{`${o.amount > 0 ? '+' : '−'}${fmtSum(Math.abs(o.amount))}`}</Text>} sub={fmtSum(o.balanceAfter)} />
                    </View>
                  ))
                ) : ops.loading ? (
                  <View style={{ padding: 18 }}>
                    <Skeleton h={60} />
                  </View>
                ) : (
                  <Empty text={t('admin.finance.empty')} />
                )}
              </Panel>
              {q.data!.subscriptions.length ? (
                <Panel title={t('admin.sub.history')}>
                  {q.data!.subscriptions.map((s) => (
                    <KV key={s.id} label={`${fmtDateOnly(s.periodStart)} — ${fmtDateOnly(s.periodEnd)}`} value={fmtSum(s.amount)} />
                  ))}
                </Panel>
              ) : null}
              <Panel title={t('admin.log.forTarget')} padded={false}>
                <LogList targetId={m.id} pageSize={8} />
              </Panel>
            </View>
          </View>

          <ConfirmDialog
            visible={dialog === 'approve'}
            onClose={close}
            title={t('admin.verifyAct.approveTitle', { name })}
            text={t('admin.verifyAct.approveText')}
            confirmLabel={t('admin.verifyAct.approve')}
            onConfirm={async () => {
              const r = await run(() => adminApi.setVerify(m.id, 'approved'), t('admin.verifyAct.approved', { name }));
              return r.ok ? null : r.error;
            }}
          />
          <ReasonDialog
            visible={dialog === 'reject'}
            onClose={close}
            title={t('admin.verifyAct.rejectTitle', { name })}
            text={t('admin.verifyAct.rejectText')}
            confirmLabel={t('admin.verifyAct.reject')}
            danger
            presets={[t('admin.verifyAct.p1'), t('admin.verifyAct.p2'), t('admin.verifyAct.p3'), t('admin.verifyAct.p4')]}
            onSubmit={async (reason) => {
              const r = await run(() => adminApi.setVerify(m.id, 'rejected', reason), t('admin.verifyAct.rejected', { name }));
              return r.ok ? null : r.error;
            }}
          />
          <ConfirmDialog
            visible={dialog === 'recheck'}
            onClose={close}
            title={t('admin.verifyAct.recheckTitle')}
            text={t('admin.verifyAct.recheckText')}
            confirmLabel={t('admin.verifyAct.recheck')}
            onConfirm={async () => {
              const r = await run(() => adminApi.setVerify(m.id, 'pending'), t('admin.verifyAct.rechecked'));
              return r.ok ? null : r.error;
            }}
          />
          <ReasonDialog
            visible={dialog === 'block'}
            onClose={close}
            title={t('admin.block.title', { name })}
            text={t('admin.block.textMaster')}
            confirmLabel={t('admin.block.block')}
            danger
            presets={[t('admin.block.p1'), t('admin.block.p2'), t('admin.block.p3')]}
            onSubmit={async (reason) => {
              const r = await run(() => adminApi.setBlocked(m.id, true, reason), t('admin.block.done', { name }));
              return r.ok ? null : r.error;
            }}
          />
          <ReasonDialog
            visible={dialog === 'delete'}
            onClose={close}
            title={t('admin.del.title', { name })}
            text={t('admin.del.textMaster')}
            confirmLabel={t('admin.del.confirm')}
            danger
            presets={[t('admin.del.p1'), t('admin.del.p2'), t('admin.del.p3')]}
            onSubmit={async (reason) => {
              const r = await run(() => adminApi.deleteAccount(m.id, reason), t('admin.del.done', { name }));
              if (r.ok) router.replace('/admin/masters' as Href);
              return r.ok ? null : r.error;
            }}
          />
          <ConfirmDialog
            visible={dialog === 'unblock'}
            onClose={close}
            title={t('admin.block.unblockTitle', { name })}
            confirmLabel={t('admin.block.unblock')}
            onConfirm={async () => {
              const r = await run(() => adminApi.setBlocked(m.id, false), t('admin.block.undone', { name }));
              return r.ok ? null : r.error;
            }}
          />
          <BalanceDialog master={m} visible={dialog === 'balance'} onClose={close} />
          <SubscriptionDialog master={m} visible={dialog === 'sub'} onClose={close} />
          <PriorityDialog master={m} visible={dialog === 'priority'} onClose={close} />
          <FreeDialog master={m} visible={dialog === 'free'} onClose={close} />
        </>
      )}
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  heroStack: { flexDirection: 'column', alignItems: 'flex-start' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 12, backgroundColor: colors.dangerSoft },
  alertText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  cols: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  col: { flex: 1, minWidth: 0, gap: 18 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  list: { gap: 10 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  num: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink, fontVariant: ['tabular-nums'] },
  kvBig: { fontFamily: fonts.heavy, fontSize: 16, lineHeight: 21, color: colors.ink },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  op: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
}));
