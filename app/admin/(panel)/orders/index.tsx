// Buyurtmalar: holat, davr, kategoriya bo'yicha filtr; raqam, manzil, ism yoki telefon bo'yicha qidiruv; CSV
import { router, type Href } from 'expo-router';
import { Download, X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { csvName, downloadCsv } from '@/components/admin/csv';
import { fmtAgo, fmtDateTime, fmtNum, fmtPhone, fmtSum, shortId } from '@/components/admin/format';
import { AButton, Badge, ErrorBox, Pager, Panel, Pill, SearchBox, Tabs } from '@/components/admin/kit';
import { AdminPage } from '@/components/admin/Shell';
import { CategoryLabel, OrderBadge } from '@/components/admin/status';
import { Cell, DataTable } from '@/components/admin/Table';
import { toInt, useParamState } from '@/components/admin/useParams';
import { Text } from '@/components/ui/Text';
import { categories, type CategoryId } from '@/constants/categories';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminOrder, type OrderFilter, type OrderQuery } from '@/lib/admin';
import { adminErrorText, toast, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const DEFAULTS = { f: 'all', q: '', c: '', d: '30', m: '', u: '', p: '0' };
const FILTERS: OrderFilter[] = ['all', 'active', 'searching', 'scheduled', 'completed', 'cancelled'];
const DAYS = ['1', '7', '30', '90', 'all'];
const PAGE = 25;

export default function Orders() {
  useScheme();
  const [v, set] = useParamState(DEFAULTS);
  const query: OrderQuery = {
    filter: (FILTERS.includes(v.f as OrderFilter) ? v.f : 'all') as OrderFilter,
    q: v.q,
    category: (categories.some((c) => c.id === v.c) ? v.c : null) as CategoryId | null,
    days: v.d === 'all' ? null : toInt(v.d, 30) || 30,
    masterId: v.m || undefined,
    clientId: v.u || undefined,
    page: toInt(v.p),
    pageSize: PAGE,
  };
  const list = useAdminQuery(`orders-${JSON.stringify(query)}`, () => adminApi.orders(query), { refreshMs: query.filter === 'active' || query.filter === 'searching' ? 15_000 : undefined });
  const stats = useAdminQuery('stats-1', () => adminApi.stats(1));
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await adminApi.orders({ ...query, page: 0, pageSize: 10_000 });
      await downloadCsv(
        csvName('buyurtmalar'),
        [t('admin.col.id'), t('admin.col.date'), t('admin.col.category'), t('admin.col.problem'), t('admin.col.status'), t('admin.col.client'), t('admin.col.phone'), t('admin.col.master'), t('admin.col.address'), t('admin.col.sum'), t('admin.col.revenue'), t('admin.col.reason')],
        all.rows.map((o) => [
          o.id,
          new Date(o.createdAt).toISOString(),
          t(`categories.${o.categoryId}`),
          o.problemId ? t(`problems.${o.problemId}`) : '',
          t(`admin.status.${o.status}`),
          o.clientName ?? '',
          fmtPhone(o.clientPhone),
          o.masterName ?? '',
          o.address ?? '',
          o.status === 'completed' ? o.total : '',
          o.platformFee ?? '',
          o.cancelReason ?? '',
        ]),
      );
    } catch (e) {
      toast(adminErrorText(e), 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminPage
      title={t('admin.nav.orders')}
      subtitle={list.data ? t('admin.orders.subtitle', { n: fmtNum(list.data.total) }) : undefined}
      onRefresh={list.reload}
      refreshing={list.refreshing}
      updatedAt={list.updatedAt}
      actions={<AButton title={t('admin.common.export')} icon={Download} loading={exporting} onPress={exportCsv} />}
    >
      <Tabs
        value={query.filter}
        onChange={(f) => set({ f })}
        items={FILTERS.map((f) => ({
          key: f,
          label: t(`admin.orders.f.${f}`),
          count: f === 'active' ? stats.data?.live.active : f === 'searching' ? stats.data?.live.searching : f === 'scheduled' ? stats.data?.live.scheduled : undefined,
          tone: f === 'searching' ? 'info' : undefined,
        }))}
      />
      <View style={styles.toolbar}>
        <SearchBox value={v.q} onChange={(q) => set({ q })} placeholder={t('admin.orders.search')} />
        <View style={styles.pills}>
          {DAYS.map((d) => (
            <Pill key={d} label={d === 'all' ? t('admin.common.allTime') : d === '1' ? t('admin.common.today') : t('admin.dash.lastDays', { n: d })} active={v.d === d} onPress={() => set({ d })} />
          ))}
        </View>
      </View>
      <View style={styles.pills}>
        <Pill label={t('admin.common.allCategories')} active={!query.category} onPress={() => set({ c: '' })} />
        {categories.map((c) => (
          <Pill key={c.id} label={t(`categories.${c.id}`)} icon={c.icon} color={c.ink} active={query.category === c.id} onPress={() => set({ c: c.id })} />
        ))}
      </View>
      {query.masterId || query.clientId ? (
        <View style={styles.pills}>
          <Badge label={query.masterId ? t('admin.orders.byMaster') : t('admin.orders.byClient')} tone="primary" />
          <AButton size="sm" kind="ghost" icon={X} title={t('admin.common.resetFilter')} onPress={() => set({ m: '', u: '' })} />
        </View>
      ) : null}

      {list.error ? <ErrorBox text={list.error} onRetry={list.reload} /> : null}
      <Panel padded={false}>
        <DataTable<AdminOrder>
          rows={list.data?.rows}
          loading={list.loading}
          refreshing={list.refreshing}
          keyOf={(o) => o.id}
          emptyText={t('admin.orders.empty')}
          onRowPress={(o) => router.push(`/admin/orders/${o.id}` as Href)}
          minWidth={1100}
          columns={[
            { key: 'id', title: t('admin.col.id'), width: 96, render: (o) => <Cell title={shortId(o.id)} sub={fmtAgo(o.createdAt)} /> },
            { key: 'c', title: t('admin.col.order'), flex: 1.6, render: (o) => <CategoryLabel id={o.categoryId} problem={o.problemId} /> },
            { key: 'cl', title: t('admin.col.client'), flex: 1.3, render: (o) => <Cell title={o.clientName || t('admin.users.noName')} sub={fmtPhone(o.clientPhone)} /> },
            { key: 'm', title: t('admin.col.master'), flex: 1.3, render: (o) => <Cell title={o.masterName ?? '—'} sub={o.masterPhone ? fmtPhone(o.masterPhone) : undefined} /> },
            { key: 'a', title: t('admin.col.address'), flex: 1.8, render: (o) => <Cell title={o.address ?? '—'} sub={o.scheduledAt ? t('admin.orders.scheduledFor', { at: fmtDateTime(o.scheduledAt) }) : undefined} /> },
            { key: 's', title: t('admin.col.status'), width: 140, render: (o) => <OrderBadge status={o.status} /> },
            {
              key: 't',
              title: t('admin.col.sum'),
              width: 120,
              align: 'right',
              render: (o) => <Cell title={o.status === 'completed' ? fmtSum(o.total) : '—'} sub={o.platformFee ? t('admin.orders.fee', { sum: fmtSum(o.platformFee) }) : undefined} />,
            },
          ]}
          card={(o) => (
            <>
              <View style={styles.cardTop}>
                <View style={styles.flex}>
                  <CategoryLabel id={o.categoryId} problem={o.problemId} />
                </View>
                <OrderBadge status={o.status} />
              </View>
              <Text style={styles.small} numberOfLines={1}>
                {o.address ?? '—'}
              </Text>
              <View style={styles.cardTop}>
                <Text style={styles.small}>
                  {shortId(o.id)} · {fmtAgo(o.createdAt)}
                </Text>
                <View style={styles.flex} />
                <Text style={styles.num}>{o.status === 'completed' ? fmtSum(o.total) : ''}</Text>
              </View>
            </>
          )}
        />
        {list.data ? (
          <View style={styles.pager}>
            <Pager page={query.page} pageSize={PAGE} total={list.data.total} onPage={(p) => set({ p: String(p) })} />
          </View>
        ) : null}
      </Panel>
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  num: { fontFamily: fonts.heavy, fontSize: 14, lineHeight: 19, color: colors.ink },
  pager: { padding: 14, borderTopWidth: 1, borderTopColor: colors.line },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
}));
