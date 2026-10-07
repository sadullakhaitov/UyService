// Moliya: platforma daromadi, aylanma, o'rtacha chek, olinayotgan ulush; balans amallari tarixi (to'ldirish,
// bonus, tuzatish, ish yakunidagi ulush) va buyurtma ololmayotgan ustalar (balans past / obuna tugagan)
import { router, type Href } from 'expo-router';
import { Download, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { csvName, downloadCsv } from '@/components/admin/csv';
import { dec, fmtDateTime, fmtNum, fmtSum, fmtSumShort, shortId } from '@/components/admin/format';
import { AButton, Badge, ErrorBox, Pager, Panel, Pill, Skeleton } from '@/components/admin/kit';
import { MasterName } from '@/components/admin/people';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { KindBadge } from '@/components/admin/status';
import { Cell, DataTable } from '@/components/admin/Table';
import { toInt, useParamState } from '@/components/admin/useParams';
import { Text } from '@/components/ui/Text';
import { BALANCE_LIMIT } from '@/constants/billing';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type BalanceKind, type BalanceOp } from '@/lib/admin';
import { adminErrorText, toast, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const DEFAULTS = { k: '', m: '', p: '0', d: '30' };
const KINDS: BalanceKind[] = ['topup', 'bonus', 'refund', 'adjust', 'fee'];
const PAGE = 25;

export default function Finance() {
  useScheme();
  const { mode } = useAdminLayout();
  const [v, set] = useParamState(DEFAULTS);
  const days = [7, 30, 90].includes(toInt(v.d)) ? toInt(v.d) : 30;
  const kind = (KINDS.includes(v.k as BalanceKind) ? v.k : null) as BalanceKind | null;
  const query = { kind, masterId: v.m || undefined, page: toInt(v.p), pageSize: PAGE };
  const stats = useAdminQuery(`stats-${days}`, () => adminApi.stats(days));
  const ops = useAdminQuery(`ops-${JSON.stringify(query)}`, () => adminApi.balanceOps(query));
  const low = useAdminQuery('masters-low', () => adminApi.masters({ filter: 'lowBalance', q: '', category: null, sort: 'balance', dir: 'asc', page: 0, pageSize: 8 }));
  const [exporting, setExporting] = useState(false);
  const p = stats.data?.period;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await adminApi.balanceOps({ ...query, page: 0, pageSize: 20_000 });
      await downloadCsv(
        csvName('balans-amallari'),
        [t('admin.col.date'), t('admin.col.master'), t('admin.col.kind'), t('admin.col.amount'), t('admin.col.balanceAfter'), t('admin.col.order'), t('admin.col.note'), t('admin.col.admin')],
        all.rows.map((o) => [new Date(o.createdAt).toISOString(), o.masterName ?? '', t(`admin.kind.${o.kind}`), o.amount, o.balanceAfter, o.orderId ?? '', o.note ?? '', o.adminPhone ?? '']),
      );
    } catch (e) {
      toast(adminErrorText(e), 'error');
    } finally {
      setExporting(false);
    }
  };

  const tiles = [
    { k: 'rev', label: t('admin.kpi.revenue'), value: p ? fmtSumShort(p.revenue) : null, sub: p ? fmtSum(p.revenue) : '' },
    { k: 'gmv', label: t('admin.kpi.gmv'), value: p ? fmtSumShort(p.gmv) : null, sub: p ? t('admin.finance.jobs', { n: fmtNum(p.completed) }) : '' },
    { k: 'avg', label: t('admin.finance.avgCheck'), value: p ? fmtSumShort(p.completed ? Math.round(p.gmv / p.completed) : 0) : null, sub: t('admin.finance.avgCheckSub') },
    { k: 'take', label: t('admin.finance.takeRate'), value: p ? `${dec(p.gmv ? (p.revenue / p.gmv) * 100 : 0)}%` : null, sub: t('admin.finance.takeRateSub') },
  ];

  return (
    <AdminPage
      title={t('admin.nav.finance')}
      subtitle={t('admin.finance.subtitle')}
      onRefresh={() => {
        stats.reload();
        ops.reload();
        low.reload();
      }}
      refreshing={ops.refreshing}
      actions={
        <>
          {[7, 30, 90].map((d) => (
            <Pill key={d} label={t('admin.dash.lastDays', { n: d })} active={days === d} onPress={() => set({ d: String(d) })} />
          ))}
        </>
      }
    >
      <View style={styles.tiles}>
        {tiles.map((x) => (
          <View key={x.k} style={[styles.tile, { width: mode === 'mobile' ? '50%' : '25%' }]}>
            <View style={styles.tileInner}>
              <Text style={styles.tileLabel}>{x.label}</Text>
              {x.value == null ? <Skeleton h={28} w="60%" /> : <Text style={styles.tileValue}>{x.value}</Text>}
              <Text variant="caption" numberOfLines={1}>
                {x.sub}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.split, mode !== 'full' && styles.stack]}>
        <Panel
          title={t('admin.finance.ops')}
          subtitle={ops.data ? t('admin.finance.opsSub', { n: fmtNum(ops.data.total) }) : undefined}
          padded={false}
          style={[styles.flex, mode === 'full' && { flex: 1.8 }]}
          actions={<AButton size="sm" title={t('admin.common.export')} icon={Download} loading={exporting} onPress={exportCsv} />}
        >
          <View style={styles.filters}>
            <Pill label={t('admin.common.all')} active={!kind} onPress={() => set({ k: '' })} />
            {KINDS.map((k) => (
              <Pill key={k} label={t(`admin.kind.${k}`)} active={kind === k} onPress={() => set({ k })} />
            ))}
            {query.masterId ? (
              <>
                <Badge label={t('admin.finance.byMaster')} tone="primary" />
                <AButton size="sm" kind="ghost" icon={X} title={t('admin.common.resetFilter')} onPress={() => set({ m: '' })} />
              </>
            ) : null}
          </View>
          {ops.error ? <ErrorBox text={ops.error} onRetry={ops.reload} /> : null}
          <DataTable<BalanceOp>
            rows={ops.data?.rows}
            loading={ops.loading}
            refreshing={ops.refreshing}
            keyOf={(o) => o.id}
            emptyText={t('admin.finance.empty')}
            onRowPress={(o) => router.push((o.orderId ? `/admin/orders/${o.orderId}` : `/admin/masters/${o.masterId}`) as Href)}
            minWidth={820}
            columns={[
              { key: 'd', title: t('admin.col.date'), width: 130, render: (o) => <Text style={styles.small}>{fmtDateTime(o.createdAt)}</Text> },
              { key: 'm', title: t('admin.col.master'), flex: 1.4, render: (o) => <Cell title={o.masterName ?? '—'} sub={o.orderId ? t('admin.log.order', { id: shortId(o.orderId) }) : (o.note ?? undefined)} /> },
              { key: 'k', title: t('admin.col.kind'), width: 120, render: (o) => <KindBadge kind={o.kind} /> },
              {
                key: 'a',
                title: t('admin.col.amount'),
                width: 130,
                align: 'right',
                render: (o) => <Text style={[styles.num, { color: o.amount > 0 ? colors.success : colors.ink }]}>{`${o.amount > 0 ? '+' : '−'}${fmtSum(Math.abs(o.amount))}`}</Text>,
              },
              { key: 'b', title: t('admin.col.balanceAfter'), width: 130, align: 'right', render: (o) => <Text style={styles.num}>{fmtSum(o.balanceAfter)}</Text> },
            ]}
            card={(o) => (
              <View style={styles.cardRow}>
                <View style={styles.flex}>
                  <Cell title={o.masterName ?? '—'} sub={fmtDateTime(o.createdAt)} />
                </View>
                <KindBadge kind={o.kind} />
                <Text style={[styles.num, { color: o.amount > 0 ? colors.success : colors.ink }]}>{`${o.amount > 0 ? '+' : '−'}${fmtSumShort(Math.abs(o.amount))}`}</Text>
              </View>
            )}
          />
          {ops.data ? (
            <View style={styles.pager}>
              <Pager page={query.page} pageSize={PAGE} total={ops.data.total} onPage={(pg) => set({ p: String(pg) })} />
            </View>
          ) : null}
        </Panel>

        <Panel
          title={t('admin.finance.cantTake')}
          subtitle={t('admin.finance.cantTakeSub', { sum: fmtSum(BALANCE_LIMIT) })}
          padded={false}
          style={styles.flex}
          actions={<AButton size="sm" kind="ghost" title={t('admin.common.all')} onPress={() => router.push('/admin/masters?f=lowBalance' as Href)} />}
        >
          <DataTable
            rows={low.data?.rows}
            loading={low.loading}
            keyOf={(m) => m.id}
            emptyText={t('admin.finance.allGood')}
            onRowPress={(m) => router.push(`/admin/masters/${m.id}` as Href)}
            minWidth={360}
            columns={[
              { key: 'n', title: t('admin.col.master'), flex: 2, render: (m) => <MasterName m={m} size={30} /> },
              {
                key: 'b',
                title: t('admin.col.reason'),
                width: 130,
                align: 'right',
                render: (m) =>
                  m.plan === 'subscription' && (m.subscriptionUntil ?? 0) < Date.now() ? (
                    <Badge label={t('admin.masters.reasonSub')} tone="danger" />
                  ) : (
                    <Text style={[styles.num, { color: colors.danger }]}>{fmtSum(m.balance)}</Text>
                  ),
              },
            ]}
            card={(m) => (
              <View style={styles.cardRow}>
                <View style={styles.flex}>
                  <MasterName m={m} size={30} />
                </View>
                <Text style={[styles.num, { color: colors.danger }]}>{fmtSum(m.balance)}</Text>
              </View>
            )}
          />
        </Panel>
      </View>
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  tile: { padding: 6 },
  tileInner: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 6 },
  tileLabel: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
  tileValue: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 30, color: colors.ink },
  split: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  num: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink, fontVariant: ['tabular-nums'] },
  pager: { padding: 14, borderTopWidth: 1, borderTopColor: colors.line },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));
