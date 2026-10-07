// Admin bosh sahifasi: davr ko'rsatkichlari (oldingi davrga nisbatan), hozirgi holat, grafiklar,
// kategoriyalar, bekor qilish sabablari, eng faol ustalar, so'nggi buyurtmalar. Har 30 s yangilanadi.
import { router, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Banknote,
  ClipboardList,
  MessagesSquare,
  Radar,
  ShieldCheck,
  Star,
  Table2,
  UserPlus,
  Wallet,
} from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { AreaChart, ColumnChart, HBars, Sparkline, type Point } from '@/components/admin/Charts';
import { CategoryIcon } from '@/components/admin/CategoryIcon';
import { dec, delta, fmtAgo, fmtDayShort, fmtNum, fmtSum, fmtSumShort } from '@/components/admin/format';
import { AButton, Empty, ErrorBox, Panel, Pill, Skeleton, Tabs, useHover } from '@/components/admin/kit';
import { DemoNote } from '@/components/admin/notes';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { CategoryLabel, OrderBadge, cancelReasonText } from '@/components/admin/status';
import { Cell, DataTable } from '@/components/admin/Table';
import { toInt, useParamState } from '@/components/admin/useParams';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminOrder, type Stats } from '@/lib/admin';
import { useAdminQuery } from '@/lib/admin/hooks';
import { formatDate, t } from '@/lib/i18n';

const DEFAULTS = { d: '30' };
const PERIODS = [7, 30, 90];

export default function Dashboard() {
  useScheme();
  const { mode } = useAdminLayout();
  const [params, setParams] = useParamState(DEFAULTS);
  const days = PERIODS.includes(toInt(params.d)) ? toInt(params.d) : 30;
  const stats = useAdminQuery(`stats-${days}`, () => adminApi.stats(days), { refreshMs: 30_000 });
  const recent = useAdminQuery('recent-orders', () => adminApi.orders({ filter: 'all', q: '', category: null, days: null, page: 0, pageSize: 8 }), { refreshMs: 30_000 });
  const s = stats.data;
  const cols = mode === 'mobile' ? 2 : mode === 'rail' ? 3 : 6;

  return (
    <AdminPage
      title={t('admin.nav.dashboard')}
      subtitle={t('admin.dash.subtitle')}
      onRefresh={() => {
        stats.reload();
        recent.reload();
      }}
      refreshing={stats.refreshing}
      updatedAt={stats.updatedAt}
      actions={
        <View style={styles.row8}>
          {PERIODS.map((p) => (
            <Pill key={p} label={t('admin.dash.lastDays', { n: p })} active={p === days} onPress={() => setParams({ d: String(p) })} />
          ))}
        </View>
      }
    >
      {stats.error && !s ? <ErrorBox text={stats.error} onRetry={stats.reload} /> : null}
      <DemoNote />

      {/* Hozir */}
      <View style={[styles.grid, { gap: 12 }]}>
        <LiveTile icon={Radar} label={t('admin.dash.online')} value={s?.live.online} sub={s ? t('admin.dash.busy', { n: s.live.busy }) : undefined} href="/admin/map" />
        <LiveTile icon={Activity} label={t('admin.dash.activeOrders')} value={s?.live.active} sub={s ? t('admin.dash.searching', { n: s.live.searching }) : undefined} href="/admin/orders?f=active" />
        <LiveTile icon={ShieldCheck} label={t('admin.dash.pending')} value={s?.live.pending} tone={s?.live.pending ? 'warning' : undefined} href="/admin/verification" />
        <LiveTile icon={MessagesSquare} label={t('admin.dash.support')} value={s?.live.supportWaiting} tone={s?.live.supportWaiting ? 'danger' : undefined} href="/admin/support" />
        <LiveTile icon={AlertTriangle} label={t('admin.dash.cantTake')} value={s?.live.blockedByBalance} href="/admin/masters?f=lowBalance" />
      </View>

      {/* Davr ko'rsatkichlari */}
      <View style={styles.grid}>
        {kpis(s).map((k) => (
          <Kpi {...k} key={k.key} width={`${100 / cols}%`} loading={!s} />
        ))}
      </View>

      <View style={[styles.split, mode === 'mobile' && styles.stack]}>
        <ChartPanel
          title={t('admin.dash.ordersChart')}
          subtitle={s ? t('admin.dash.ordersChartSub', { n: fmtNum(s.period.orders) }) : undefined}
          points={s ? s.daily.map((d) => ({ key: d.day, label: dayLabel(d.day), axis: dayAxis(d.day), value: d.orders, sub: t('admin.dash.dayBreakdown', { done: d.completed, cancelled: d.cancelled }) })) : null}
          format={(n) => fmtNum(n)}
          kind="column"
        />
        <MoneyPanel s={s} />
      </View>

      <View style={[styles.split, mode === 'mobile' && styles.stack]}>
        <Panel title={t('admin.dash.byCategory')} subtitle={t('admin.dash.byCategorySub')} style={styles.flex}>
          {!s ? (
            <Skeleton h={180} />
          ) : s.byCategory.length ? (
            <HBars
              items={s.byCategory.map((c) => ({
                key: c.categoryId,
                label: t(`categories.${c.categoryId}`),
                icon: <CategoryIcon id={c.categoryId} size={24} />,
                value: c.orders,
                sub: fmtSumShort(c.gmv),
              }))}
              format={(n) => fmtNum(n)}
            />
          ) : (
            <Empty text={t('admin.common.noData')} />
          )}
        </Panel>
        <Panel title={t('admin.dash.cancelReasons')} subtitle={s ? t('admin.dash.cancelRate', { pct: dec(pct(s.period.cancelled, s.period.orders)) }) : undefined} style={styles.flex}>
          {!s ? (
            <Skeleton h={180} />
          ) : s.cancelReasons.length ? (
            <View style={styles.reasons}>
              {s.cancelReasons.map((r) => (
                <View key={`${r.reason}${r.cancelledBy}`} style={styles.reason}>
                  <Text style={styles.reasonText} numberOfLines={2}>
                    {cancelReasonText(r.reason, r.cancelledBy)}
                  </Text>
                  <Text style={styles.reasonN}>{fmtNum(r.count)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Empty text={t('admin.dash.noCancels')} />
          )}
        </Panel>
      </View>

      <View style={[styles.split, mode !== 'full' && styles.stack]}>
        <Panel title={t('admin.dash.topMasters')} subtitle={t('admin.dash.topMastersSub', { n: days })} padded={false} style={styles.flex}>
          <DataTable
            rows={s?.topMasters}
            loading={!s}
            keyOf={(m) => m.id}
            emptyText={t('admin.common.noData')}
            onRowPress={(m) => router.push(`/admin/masters/${m.id}` as Href)}
            minWidth={520}
            columns={[
              { key: 'n', title: t('admin.col.master'), flex: 2, render: (m) => <Cell title={m.name ?? '—'} sub={m.rating ? `★ ${dec(m.rating, 2)}` : t('admin.masters.noRating')} /> },
              { key: 'j', title: t('admin.col.jobs'), width: 70, align: 'right', render: (m) => <Text style={styles.num}>{fmtNum(m.jobs)}</Text> },
              { key: 'g', title: t('admin.col.gmv'), width: 120, align: 'right', render: (m) => <Text style={styles.num}>{fmtSumShort(m.gmv)}</Text> },
              { key: 'r', title: t('admin.col.revenue'), width: 110, align: 'right', render: (m) => <Text style={styles.num}>{fmtSumShort(m.revenue)}</Text> },
            ]}
            card={(m) => (
              <View style={styles.cardRow}>
                <Cell title={m.name ?? '—'} sub={t('admin.dash.jobsGmv', { n: m.jobs, sum: fmtSumShort(m.gmv) })} />
              </View>
            )}
          />
        </Panel>
        <Panel
          title={t('admin.dash.recent')}
          padded={false}
          style={[styles.flex, mode === 'full' && { flex: 1.4 }]}
          actions={<AButton size="sm" title={t('admin.common.all')} kind="ghost" onPress={() => router.push('/admin/orders' as Href)} />}
        >
          <DataTable<AdminOrder>
            rows={recent.data?.rows}
            loading={recent.loading}
            keyOf={(o) => o.id}
            emptyText={t('admin.orders.empty')}
            onRowPress={(o) => router.push(`/admin/orders/${o.id}` as Href)}
            minWidth={600}
            columns={[
              { key: 'c', title: t('admin.col.order'), flex: 2, render: (o) => <CategoryLabel id={o.categoryId} problem={o.problemId} /> },
              { key: 'cl', title: t('admin.col.client'), flex: 1.4, render: (o) => <Cell title={o.clientName ?? '—'} sub={fmtAgo(o.createdAt)} /> },
              { key: 's', title: t('admin.col.status'), width: 130, render: (o) => <OrderBadge status={o.status} /> },
              { key: 't', title: t('admin.col.sum'), width: 110, align: 'right', render: (o) => <Text style={styles.num}>{o.status === 'completed' ? fmtSumShort(o.total) : '—'}</Text> },
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
      </View>
    </AdminPage>
  );
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const dayLabel = (iso: string) => formatDate(new Date(`${iso}T12:00:00`));
const dayAxis = (iso: string) => fmtDayShort(new Date(`${iso}T12:00:00`).getTime());

/** unit: delta birligi — '%' (nisbiy), 'pp' (foiz punkt), '' (mutlaq, masalan baho) */
type KpiDef = { key: string; icon: LucideIcon; label: string; value: string; delta: number | null; unit: '%' | 'pp' | ''; goodUp: boolean; spark?: number[]; hint?: string };
function kpis(s: Stats | undefined): KpiDef[] {
  const p = s?.period;
  const daily = s?.daily ?? [];
  const rate = p ? pct(p.completed, p.orders) : 0;
  const prevRate = p ? pct(p.prev.completed, p.prev.orders) : 0;
  return [
    { key: 'orders', icon: ClipboardList, label: t('admin.kpi.orders'), value: p ? fmtNum(p.orders) : '', delta: p ? delta(p.orders, p.prev.orders) : null, unit: '%', goodUp: true, spark: daily.map((d) => d.orders) },
    { key: 'done', icon: BadgeCheck, label: t('admin.kpi.completion'), value: p ? `${dec(rate)}%` : '', delta: p && prevRate ? Math.round((rate - prevRate) * 10) / 10 : null, unit: 'pp', goodUp: true },
    { key: 'gmv', icon: Banknote, label: t('admin.kpi.gmv'), value: p ? fmtSumShort(p.gmv) : '', delta: p ? delta(p.gmv, p.prev.gmv) : null, unit: '%', goodUp: true, spark: daily.map((d) => d.gmv) },
    { key: 'rev', icon: Wallet, label: t('admin.kpi.revenue'), value: p ? fmtSumShort(p.revenue) : '', delta: p ? delta(p.revenue, p.prev.revenue) : null, unit: '%', goodUp: true, spark: daily.map((d) => d.revenue) },
    { key: 'clients', icon: UserPlus, label: t('admin.kpi.newClients'), value: p ? fmtNum(p.clients) : '', delta: p ? delta(p.clients, p.prev.clients) : null, unit: '%', goodUp: true, hint: p ? t('admin.kpi.newMasters', { n: p.masters }) : undefined },
    {
      key: 'rating',
      icon: Star,
      label: t('admin.kpi.rating'),
      value: p?.rating ? dec(p.rating, 2) : '—',
      delta: p?.rating && p.prev.rating ? Math.round((p.rating - p.prev.rating) * 100) / 100 : null,
      unit: '',
      goodUp: true,
      hint: p ? t('admin.kpi.reviews', { n: p.reviews }) : undefined,
    },
  ];
}

function Kpi({ icon: Icon, label, value, delta: d, unit, goodUp, spark, hint, width, loading }: KpiDef & { width: `${number}%`; loading: boolean }) {
  useScheme();
  const up = (d ?? 0) > 0;
  const good = d == null || d === 0 ? null : up === goodUp;
  return (
    <View style={{ width, padding: 6 }}>
      <View style={[styles.kpi, { flex: 1 }]} accessible accessibilityLabel={`${label}: ${value}`}>
        <View style={styles.kpiTop}>
          <Icon size={16} color={colors.ink2} strokeWidth={2.2} />
          <Text numberOfLines={1} style={styles.kpiLabel}>
            {label}
          </Text>
        </View>
        {loading ? <Skeleton h={30} w="60%" /> : <Text style={styles.kpiValue}>{value}</Text>}
        <View style={styles.kpiBottom}>
          {d != null ? (
            <Text
              style={[styles.delta, { color: good == null ? colors.ink2 : good ? colors.success : colors.danger }]}
              accessibilityLabel={t('admin.kpi.vsPrev', { value: `${d > 0 ? '+' : ''}${dec(d, unit === '' ? 2 : 1)}${unit === '%' ? '%' : unit === 'pp' ? ` ${t('admin.kpi.pp')}` : ''}` })}
            >
              {`${up ? '▲' : d < 0 ? '▼' : '•'} ${dec(Math.abs(d), unit === '' ? 2 : 1)}${unit === '%' ? '%' : unit === 'pp' ? ` ${t('admin.kpi.pp')}` : ''}`}
            </Text>
          ) : (
            <Text style={styles.deltaMuted} numberOfLines={1}>
              {t('admin.kpi.noPrev')}
            </Text>
          )}
          {spark ? <Sparkline values={spark} width={72} height={24} /> : null}
        </View>
        <Text variant="caption" numberOfLines={1}>
          {hint ?? t('admin.kpi.vsPrevShort')}
        </Text>
      </View>
    </View>
  );
}

function LiveTile({ icon: Icon, label, value, sub, href, tone }: { icon: LucideIcon; label: string; value?: number; sub?: string; href: string; tone?: 'warning' | 'danger' }) {
  useScheme();
  const { hovered, bind } = useHover();
  const accent = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.accent : colors.primary;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}: ${value ?? ''}`}
      onPress={() => router.push(href as Href)}
      {...bind}
      style={[styles.live, hovered && { borderColor: colors.primary }]}
    >
      <View style={[styles.liveIcon, { backgroundColor: tone === 'danger' ? colors.dangerSoft : tone === 'warning' ? colors.accentSoft : colors.primarySoft }]}>
        <Icon size={18} color={accent} strokeWidth={2.3} />
      </View>
      <View style={styles.flex}>
        <Text numberOfLines={2} style={styles.liveLabel}>
          {label}
        </Text>
        {value == null ? <Skeleton h={22} w={40} /> : <Text style={styles.liveValue}>{fmtNum(value)}</Text>}
        {sub ? (
          <Text variant="caption" numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Grafik yoki jadval ko'rinishi (har grafikda) */
function ChartPanel({
  title,
  subtitle,
  points,
  format,
  kind,
  extra,
}: {
  title: string;
  subtitle?: string;
  points: Point[] | null;
  format: (n: number) => string;
  kind: 'column' | 'area';
  extra?: ReactNode;
}) {
  useScheme();
  const [table, setTable] = useState(false);
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      style={styles.flex}
      actions={
        <>
          {extra}
          <AButton size="sm" kind={table ? 'primary' : 'ghost'} icon={table ? BarChart3 : Table2} accessibilityLabel={table ? t('admin.dash.showChart') : t('admin.dash.showTable')} onPress={() => setTable((x) => !x)} />
        </>
      }
    >
      {!points ? (
        <Skeleton h={222} />
      ) : table ? (
        <View style={styles.tableView}>
          {[...points].reverse().map((p) => (
            <View key={p.key} style={styles.tableRow}>
              <Text style={styles.tableLabel}>{p.label}</Text>
              {p.sub ? (
                <Text variant="caption" style={styles.flex} numberOfLines={1}>
                  {p.sub}
                </Text>
              ) : (
                <View style={styles.flex} />
              )}
              <Text style={styles.num}>{format(p.value)}</Text>
            </View>
          ))}
        </View>
      ) : kind === 'column' ? (
        <ColumnChart data={points} format={format} />
      ) : (
        <AreaChart data={points} format={format} />
      )}
    </Panel>
  );
}

function MoneyPanel({ s }: { s: Stats | undefined }) {
  const [metric, setMetric] = useState<'revenue' | 'gmv'>('revenue');
  return (
    <ChartPanel
      title={metric === 'revenue' ? t('admin.dash.revenueChart') : t('admin.dash.gmvChart')}
      subtitle={s ? fmtSum(metric === 'revenue' ? s.period.revenue : s.period.gmv) : undefined}
      points={s ? s.daily.map((d) => ({ key: d.day, label: dayLabel(d.day), axis: dayAxis(d.day), value: d[metric], sub: t('admin.dash.dayJobs', { n: d.completed }) })) : null}
      format={(n) => fmtSum(n)}
      kind="area"
      extra={
        <Tabs
          value={metric}
          onChange={setMetric}
          items={[
            { key: 'revenue', label: t('admin.dash.revenueTab') },
            { key: 'gmv', label: t('admin.dash.gmvTab') },
          ]}
        />
      }
    />
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  row8: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  split: { flexDirection: 'row', gap: 18, alignItems: 'stretch' },
  stack: { flexDirection: 'column' },
  kpi: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8, minHeight: 124 },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kpiLabel: { flex: 1, fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
  kpiValue: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 30, color: colors.ink },
  kpiBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  delta: { fontFamily: fonts.heavy, fontSize: 12, lineHeight: 16 },
  deltaMuted: { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted },
  live: {
    flexGrow: 1,
    flexBasis: 160,
    margin: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    cursor: 'pointer',
  },
  liveIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  liveLabel: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
  liveValue: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 28, color: colors.ink },
  reasons: { gap: 2 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  reasonText: { flex: 1, fontFamily: fonts.medium, fontSize: 13.5, lineHeight: 19, color: colors.ink },
  reasonN: { fontFamily: fonts.heavy, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  num: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink, fontVariant: ['tabular-nums'] },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tableView: { maxHeight: 222, overflow: 'scroll' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.line },
  tableLabel: { width: 90, fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
}));
