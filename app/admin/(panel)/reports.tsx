// Murojaatlar: mijozning muammo va kafolat murojaatlari, ustaning "mijoz eshikni ochmadi" xabarlari.
// Har bir murojaat qo'llab-quvvatlash chatiga ham tushadi (javob o'sha yerda yoziladi); bu yerda — yechim bilan yopish.
import { router, type Href } from 'expo-router';
import { CircleCheck, MessagesSquare } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { ReasonDialog } from '@/components/admin/Dialog';
import { fmtDateTime, fmtNum, fmtPhone, shortId } from '@/components/admin/format';
import { AButton, Badge, Empty, ErrorBox, Pager, Panel, SkeletonRows, Tabs, type Tone } from '@/components/admin/kit';
import { AdminPage } from '@/components/admin/Shell';
import { CategoryLabel } from '@/components/admin/status';
import { toInt, useParamState } from '@/components/admin/useParams';
import { Text } from '@/components/ui/Text';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminReport, type ReportKind, type ReportQuery } from '@/lib/admin';
import { useAdminAction, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const DEFAULTS = { s: 'open', p: '0' };
const TABS: ReportQuery['status'][] = ['open', 'resolved', 'all'];
const PAGE = 20;
const KIND_TONE: Record<ReportKind, Tone> = {
  warranty: 'info',
  overcharge: 'danger',
  quality: 'warning',
  no_show_master: 'danger',
  client_absent: 'neutral',
  other: 'neutral',
};

export default function Reports() {
  useScheme();
  const [v, set] = useParamState(DEFAULTS);
  const status = (TABS.includes(v.s as ReportQuery['status']) ? v.s : 'open') as ReportQuery['status'];
  const query = { status, page: toInt(v.p), pageSize: PAGE };
  const list = useAdminQuery(`reports-${JSON.stringify(query)}`, () => adminApi.reports(query));
  const [resolve, setResolve] = useState<AdminReport | null>(null);
  const { run } = useAdminAction();

  return (
    <AdminPage
      title={t('admin.nav.reports')}
      subtitle={list.data ? t('admin.reports.subtitle', { n: fmtNum(list.data.total) }) : undefined}
      onRefresh={list.reload}
      refreshing={list.refreshing}
      updatedAt={list.updatedAt}
    >
      <Tabs value={status} onChange={(s) => set({ s, p: '0' })} items={TABS.map((s) => ({ key: s, label: t(`admin.reports.tab.${s}`), tone: s === 'open' ? 'warning' : undefined }))} />
      <Text variant="small">{t('admin.reports.hint')}</Text>
      {list.error ? <ErrorBox text={list.error} onRetry={list.reload} /> : null}
      {!list.data ? (
        <Panel>
          <SkeletonRows />
        </Panel>
      ) : !list.data.rows.length ? (
        <Panel>
          <Empty text={t(status === 'open' ? 'admin.reports.emptyOpen' : 'admin.reports.empty')} />
        </Panel>
      ) : (
        <View style={[styles.list, list.refreshing && { opacity: 0.6 }]}>
          {list.data.rows.map((r) => (
            <Panel key={r.id}>
              <View style={styles.head}>
                <Badge label={t(`report.kinds.${r.kind}`)} tone={KIND_TONE[r.kind]} />
                <Badge label={t(`admin.reports.status.${r.status}`)} tone={r.status === 'open' ? 'warning' : 'success'} dot />
                <View style={styles.flex} />
                <Text variant="caption">{fmtDateTime(r.createdAt)}</Text>
              </View>
              {r.text ? <Text style={styles.text}>«{r.text}»</Text> : null}
              <View style={styles.meta}>
                <CategoryLabel id={r.categoryId} problem={r.problemId} />
                <Text style={styles.link} onPress={() => router.push(`/admin/orders/${r.orderId}` as Href)}>
                  {t('admin.log.order', { id: shortId(r.orderId) })}
                </Text>
              </View>
              <Text variant="small">
                {r.byMaster ? t('admin.reports.fromMaster') : t('admin.reports.fromClient')}: {r.reporterName || t('admin.users.noName')}
                {r.reporterPhone ? ` · ${fmtPhone(r.reporterPhone)}` : ''}
                {!r.byMaster && r.masterName ? ` · ${t('admin.orders.master')}: ${r.masterName}` : ''}
              </Text>
              {r.resolution ? (
                <View style={styles.resolution}>
                  <Text variant="small" style={styles.resolutionText}>
                    {t('admin.reports.resolution')}: {r.resolution}
                  </Text>
                </View>
              ) : null}
              <View style={styles.actions}>
                <AButton size="sm" kind="secondary" icon={MessagesSquare} title={t('admin.reports.reply')} onPress={() => router.push(`/admin/support?u=${r.reporterId}` as Href)} />
                {r.status === 'open' ? <AButton size="sm" kind="success" icon={CircleCheck} title={t('admin.reports.resolve')} onPress={() => setResolve(r)} /> : null}
              </View>
            </Panel>
          ))}
          <Pager page={query.page} pageSize={PAGE} total={list.data.total} onPage={(p) => set({ p: String(p) })} />
        </View>
      )}
      <ReasonDialog
        visible={!!resolve}
        onClose={() => setResolve(null)}
        title={t('admin.reports.resolveTitle')}
        text={resolve ? t(`report.kinds.${resolve.kind}`) + (resolve.text ? ` — «${resolve.text}»` : '') : ''}
        confirmLabel={t('admin.reports.resolve')}
        presets={[t('admin.reports.p1'), t('admin.reports.p2'), t('admin.reports.p3')]}
        onSubmit={async (note) => {
          const r = await run(() => adminApi.resolveReport(resolve!.id, note), t('admin.reports.resolved'));
          return r.ok ? null : r.error;
        }}
      />
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  list: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  text: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink, marginTop: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  resolution: { marginTop: 8, padding: 10, borderRadius: radius.field, backgroundColor: colors.successSoft },
  resolutionText: { color: colors.success },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
}));
