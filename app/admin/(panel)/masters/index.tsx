// Ustalar ro'yxati: hujjat holati, tarif va balans, reyting, onlayn holati. Filtr, qidiruv, saralash, CSV
import { router, type Href } from 'expo-router';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Download } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { CategoryIcon } from '@/components/admin/CategoryIcon';
import { csvName, downloadCsv } from '@/components/admin/csv';
import { dec, fmtDateOnly, fmtNum, fmtPhone, fmtSum } from '@/components/admin/format';
import { AButton, ErrorBox, Pager, Panel, Pill, SearchBox, Tabs } from '@/components/admin/kit';
import { MasterName, PresenceBadge } from '@/components/admin/people';
import { AdminPage } from '@/components/admin/Shell';
import { VerifyBadge } from '@/components/admin/status';
import { Cell, DataTable } from '@/components/admin/Table';
import { toInt, useParamState } from '@/components/admin/useParams';
import { Text } from '@/components/ui/Text';
import { categories, type CategoryId } from '@/constants/categories';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminMaster, type MasterFilter, type MasterQuery } from '@/lib/admin';
import { adminErrorText, toast, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const DEFAULTS = { f: 'all', q: '', c: '', s: 'created', d: 'desc', p: '0' };
const FILTERS: MasterFilter[] = ['all', 'pending', 'approved', 'rejected', 'none', 'online', 'lowBalance', 'blocked'];
const SORTS: MasterQuery['sort'][] = ['created', 'rating', 'balance', 'jobs', 'activity'];
const PAGE = 25;

export default function Masters() {
  useScheme();
  const [v, set] = useParamState(DEFAULTS);
  const query: MasterQuery = {
    filter: (FILTERS.includes(v.f as MasterFilter) ? v.f : 'all') as MasterFilter,
    q: v.q,
    category: (categories.some((c) => c.id === v.c) ? v.c : null) as CategoryId | null,
    sort: (SORTS.includes(v.s as MasterQuery['sort']) ? v.s : 'created') as MasterQuery['sort'],
    dir: v.d === 'asc' ? 'asc' : 'desc',
    page: toInt(v.p),
    pageSize: PAGE,
  };
  const list = useAdminQuery(`masters-${JSON.stringify(query)}`, () => adminApi.masters(query));
  const stats = useAdminQuery('stats-1', () => adminApi.stats(1));
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await adminApi.masters({ ...query, page: 0, pageSize: 5000 });
      await downloadCsv(
        csvName('ustalar'),
        [t('admin.col.name'), t('admin.col.phone'), t('admin.col.categories'), t('admin.col.verify'), t('admin.col.plan'), t('admin.col.fee'), t('admin.col.balance'), t('admin.col.rating'), t('admin.col.jobs'), t('admin.col.registered')],
        all.rows.map((m) => [
          `${m.firstName} ${m.lastName}`,
          fmtPhone(m.phone),
          m.categories.map((c) => t(`categories.${c}`)).join(', '),
          t(`admin.verify.${m.verifyStatus}`),
          m.plan ? t(`admin.plan.${m.plan}`) : '—',
          `${m.feePercent}%`,
          m.balance,
          m.rating ?? '',
          m.jobsDone,
          new Date(m.createdAt).toISOString().slice(0, 10),
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
      title={t('admin.nav.masters')}
      subtitle={list.data ? t('admin.masters.subtitle', { n: fmtNum(list.data.total) }) : undefined}
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
          label: t(`admin.masters.f.${f}`),
          count: f === 'pending' ? stats.data?.live.pending : f === 'online' ? stats.data?.live.online : f === 'lowBalance' ? stats.data?.live.blockedByBalance : undefined,
          tone: f === 'pending' ? 'warning' : f === 'lowBalance' ? 'danger' : undefined,
        }))}
      />
      <View style={styles.toolbar}>
        <SearchBox value={v.q} onChange={(q) => set({ q })} placeholder={t('admin.masters.search')} />
        <View style={styles.pills}>
          <Pill label={t('admin.common.allCategories')} active={!query.category} onPress={() => set({ c: '' })} />
          {categories.map((c) => (
            <Pill key={c.id} label={t(`categories.${c.id}`)} icon={c.icon} color={c.ink} active={query.category === c.id} onPress={() => set({ c: c.id })} />
          ))}
        </View>
      </View>
      <View style={styles.sortRow}>
        <Text variant="caption">{t('admin.common.sort')}</Text>
        {SORTS.map((s) => (
          <Pill key={s} label={t(`admin.masters.sort.${s}`)} active={query.sort === s} onPress={() => set({ s })} />
        ))}
        <AButton
          size="sm"
          kind="ghost"
          icon={query.dir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow}
          accessibilityLabel={query.dir === 'asc' ? t('admin.common.asc') : t('admin.common.desc')}
          onPress={() => set({ d: query.dir === 'asc' ? 'desc' : 'asc' })}
        />
      </View>

      {list.error ? <ErrorBox text={list.error} onRetry={list.reload} /> : null}
      <Panel padded={false}>
        <DataTable<AdminMaster>
          rows={list.data?.rows}
          loading={list.loading}
          refreshing={list.refreshing}
          keyOf={(m) => m.id}
          emptyText={t('admin.masters.empty')}
          onRowPress={(m) => router.push(`/admin/masters/${m.id}` as Href)}
          minWidth={1080}
          columns={[
            { key: 'n', title: t('admin.col.master'), flex: 2.2, render: (m) => <MasterName m={m} /> },
            {
              key: 'c',
              title: t('admin.col.categories'),
              width: 120,
              render: (m) => (
                <View style={styles.icons}>
                  {m.categories.slice(0, 3).map((c) => (
                    <CategoryIcon key={c} id={c} size={26} />
                  ))}
                </View>
              ),
            },
            { key: 'v', title: t('admin.col.verify'), width: 140, render: (m) => <VerifyBadge status={m.verifyStatus} /> },
            { key: 'pl', title: t('admin.col.plan'), width: 130, render: (m) => <Cell title={m.plan ? t(`admin.plan.${m.plan}`) : '—'} sub={t('admin.masters.fee', { pct: m.feePercent })} /> },
            {
              key: 'b',
              title: t('admin.col.balance'),
              width: 130,
              align: 'right',
              render: (m) => (
                <Text style={[styles.num, !m.canTake && { color: colors.danger }]}>{m.plan === 'subscription' && m.feePercent === 0 ? '—' : fmtSum(m.balance)}</Text>
              ),
            },
            { key: 'r', title: t('admin.col.rating'), width: 90, align: 'right', render: (m) => <Cell title={m.rating ? `★ ${dec(m.rating, 2)}` : '—'} sub={t('admin.masters.reviews', { n: m.reviewsCount })} /> },
            { key: 'j', title: t('admin.col.jobs'), width: 70, align: 'right', render: (m) => <Text style={styles.num}>{fmtNum(m.jobsDone)}</Text> },
            { key: 'o', title: t('admin.col.state'), width: 150, render: (m) => <PresenceBadge m={m} /> },
            { key: 'd', title: t('admin.col.registered'), width: 110, render: (m) => <Text style={styles.small}>{fmtDateOnly(m.createdAt)}</Text> },
          ]}
          card={(m) => (
            <>
              <View style={styles.cardTop}>
                <View style={styles.flex}>
                  <MasterName m={m} />
                </View>
                <VerifyBadge status={m.verifyStatus} />
              </View>
              <View style={styles.cardMeta}>
                <PresenceBadge m={m} />
                <Text style={[styles.small, !m.canTake && { color: colors.danger }]}>{fmtSum(m.balance)}</Text>
                <Text style={styles.small}>{m.rating ? `★ ${dec(m.rating, 2)}` : '—'}</Text>
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
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  icons: { flexDirection: 'row', gap: 4 },
  num: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink, fontVariant: ['tabular-nums'] },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  pager: { padding: 14, borderTopWidth: 1, borderTopColor: colors.line },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
}));
