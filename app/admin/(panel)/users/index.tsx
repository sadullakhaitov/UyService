// Foydalanuvchilar (mijozlar, ustalar, adminlar): buyurtmalar soni, sarflagani, oxirgi faollik, blok holati; CSV
import { router, type Href } from 'expo-router';
import { Download } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { csvName, downloadCsv } from '@/components/admin/csv';
import { fmtAgo, fmtDateOnly, fmtNum, fmtPhone, fmtSum, initials } from '@/components/admin/format';
import { AButton, ErrorBox, Pager, Panel, SearchBox, Tabs } from '@/components/admin/kit';
import { RoleBadge } from '@/components/admin/people';
import { AdminPage } from '@/components/admin/Shell';
import { Cell, DataTable } from '@/components/admin/Table';
import { toInt, useParamState } from '@/components/admin/useParams';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminUser, type UserFilter } from '@/lib/admin';
import { adminErrorText, toast, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const DEFAULTS = { f: 'all', q: '', p: '0' };
const FILTERS: UserFilter[] = ['all', 'clients', 'masters', 'admins', 'blocked'];
const PAGE = 25;

export default function Users() {
  useScheme();
  const [v, set] = useParamState(DEFAULTS);
  const filter = (FILTERS.includes(v.f as UserFilter) ? v.f : 'all') as UserFilter;
  const query = { filter, q: v.q, page: toInt(v.p), pageSize: PAGE };
  const list = useAdminQuery(`users-${JSON.stringify(query)}`, () => adminApi.users(query));
  const [exporting, setExporting] = useState(false);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await adminApi.users({ ...query, page: 0, pageSize: 10_000 });
      await downloadCsv(
        csvName('foydalanuvchilar'),
        [t('admin.col.name'), t('admin.col.phone'), t('admin.col.role'), t('admin.col.language'), t('admin.col.orders'), t('admin.col.spent'), t('admin.col.lastOrder'), t('admin.col.registered'), t('admin.col.blocked')],
        all.rows.map((u) => [
          u.name ?? '',
          fmtPhone(u.phone),
          t(`admin.role.${u.role === 'admin' ? 'admin' : u.isMaster ? 'master' : 'client'}`),
          u.language,
          u.ordersCount,
          u.spent,
          u.lastOrderAt ? new Date(u.lastOrderAt).toISOString().slice(0, 10) : '',
          new Date(u.createdAt).toISOString().slice(0, 10),
          u.blockedReason ?? '',
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
      title={t('admin.nav.users')}
      subtitle={list.data ? t('admin.users.subtitle', { n: fmtNum(list.data.total) }) : undefined}
      onRefresh={list.reload}
      refreshing={list.refreshing}
      updatedAt={list.updatedAt}
      actions={<AButton title={t('admin.common.export')} icon={Download} loading={exporting} onPress={exportCsv} />}
    >
      <Tabs value={filter} onChange={(f) => set({ f })} items={FILTERS.map((f) => ({ key: f, label: t(`admin.users.f.${f}`) }))} />
      <View style={styles.toolbar}>
        <SearchBox value={v.q} onChange={(q) => set({ q })} placeholder={t('admin.users.search')} />
      </View>
      {list.error ? <ErrorBox text={list.error} onRetry={list.reload} /> : null}
      <Panel padded={false}>
        <DataTable<AdminUser>
          rows={list.data?.rows}
          loading={list.loading}
          refreshing={list.refreshing}
          keyOf={(u) => u.id}
          emptyText={t('admin.users.empty')}
          onRowPress={(u) => router.push(`/admin/users/${u.id}` as Href)}
          minWidth={980}
          columns={[
            {
              key: 'n',
              title: t('admin.col.user'),
              flex: 2,
              render: (u) => (
                <View style={styles.row}>
                  <Avatar initials={initials(u.name)} size={34} />
                  <Cell title={u.name || t('admin.users.noName')} sub={fmtPhone(u.phone)} />
                </View>
              ),
            },
            { key: 'r', title: t('admin.col.role'), width: 120, render: (u) => <RoleBadge u={u} /> },
            { key: 'l', title: t('admin.col.language'), width: 80, render: (u) => <Text style={styles.small}>{u.language.toUpperCase()}</Text> },
            { key: 'o', title: t('admin.col.orders'), width: 110, align: 'right', render: (u) => <Cell title={fmtNum(u.ordersCount)} sub={t('admin.users.done', { n: u.completedCount })} /> },
            { key: 's', title: t('admin.col.spent'), width: 130, align: 'right', render: (u) => <Text style={styles.num}>{u.spent ? fmtSum(u.spent) : '—'}</Text> },
            { key: 'lo', title: t('admin.col.lastOrder'), width: 130, render: (u) => <Text style={styles.small}>{u.lastOrderAt ? fmtAgo(u.lastOrderAt) : '—'}</Text> },
            { key: 'c', title: t('admin.col.registered'), width: 110, render: (u) => <Text style={styles.small}>{fmtDateOnly(u.createdAt)}</Text> },
          ]}
          card={(u) => (
            <View style={styles.row}>
              <Avatar initials={initials(u.name)} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Cell title={u.name || t('admin.users.noName')} sub={`${fmtPhone(u.phone)} · ${t('admin.users.ordersN', { n: u.ordersCount })}`} />
              </View>
              <RoleBadge u={u} />
            </View>
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
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  num: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink, fontVariant: ['tabular-nums'] },
  pager: { padding: 14, borderTopWidth: 1, borderTopColor: colors.line },
}));
