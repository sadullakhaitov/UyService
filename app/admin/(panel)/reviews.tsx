// Sharhlar va moderatsiya: baho bo'yicha filtr (shikoyatlar — 1–2 yulduz birinchi o'rinda), matn bo'yicha qidiruv,
// haqoratli yoki soxta sharhni sabab bilan o'chirish (usta reytingi qayta hisoblanadi)
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { ReasonDialog } from '@/components/admin/Dialog';
import { fmtNum } from '@/components/admin/format';
import { AButton, Badge, Empty, ErrorBox, Pager, Panel, SearchBox, SkeletonRows, Tabs } from '@/components/admin/kit';
import { ReviewItem } from '@/components/admin/ReviewItem';
import { AdminPage } from '@/components/admin/Shell';
import { toInt, useParamState } from '@/components/admin/useParams';
import { themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminReview, type ReviewQuery } from '@/lib/admin';
import { useAdminAction, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const DEFAULTS = { s: 'all', q: '', m: '', p: '0' };
const STARS = ['all', 'low', '5', '4', '3', '2', '1'];
const PAGE = 20;

export default function Reviews() {
  useScheme();
  const [v, set] = useParamState(DEFAULTS);
  const stars: ReviewQuery['stars'] = v.s === 'low' ? 'low' : STARS.includes(v.s) && v.s !== 'all' ? Number(v.s) : null;
  const query = { stars, q: v.q, masterId: v.m || undefined, page: toInt(v.p), pageSize: PAGE };
  const list = useAdminQuery(`reviews-${JSON.stringify(query)}`, () => adminApi.reviews(query));
  const [del, setDel] = useState<AdminReview | null>(null);
  const { run } = useAdminAction();

  return (
    <AdminPage
      title={t('admin.nav.reviews')}
      subtitle={list.data ? t('admin.reviews.subtitle', { n: fmtNum(list.data.total) }) : undefined}
      onRefresh={list.reload}
      refreshing={list.refreshing}
      updatedAt={list.updatedAt}
    >
      <Tabs
        value={STARS.includes(v.s) ? v.s : 'all'}
        onChange={(s) => set({ s })}
        items={STARS.map((s) => ({ key: s, label: s === 'all' ? t('admin.common.all') : s === 'low' ? t('admin.reviews.complaints') : `${s} ★`, tone: s === 'low' ? 'danger' : undefined }))}
      />
      <View style={styles.toolbar}>
        <SearchBox value={v.q} onChange={(q) => set({ q })} placeholder={t('admin.reviews.search')} />
        {query.masterId ? (
          <>
            <Badge label={t('admin.reviews.byMaster')} tone="primary" />
            <AButton size="sm" kind="ghost" icon={X} title={t('admin.common.resetFilter')} onPress={() => set({ m: '' })} />
          </>
        ) : null}
      </View>
      {list.error ? <ErrorBox text={list.error} onRetry={list.reload} /> : null}
      {!list.data ? (
        <Panel>
          <SkeletonRows />
        </Panel>
      ) : !list.data.rows.length ? (
        <Panel>
          <Empty text={t('admin.reviews.empty')} />
        </Panel>
      ) : (
        <View style={[styles.list, list.refreshing && { opacity: 0.6 }]}>
          {list.data.rows.map((r) => (
            <ReviewItem key={r.id} r={r} onDelete={() => setDel(r)} />
          ))}
          <Pager page={query.page} pageSize={PAGE} total={list.data.total} onPage={(p) => set({ p: String(p) })} />
        </View>
      )}
      <ReasonDialog
        visible={!!del}
        onClose={() => setDel(null)}
        title={t('admin.reviews.deleteTitle')}
        text={del?.comment ? `«${del.comment}»` : t('admin.reviews.deleteText')}
        confirmLabel={t('admin.reviews.delete')}
        danger
        presets={[t('admin.reviews.p1'), t('admin.reviews.p2'), t('admin.reviews.p3')]}
        onSubmit={async (reason) => {
          const r = await run(() => adminApi.deleteReview(del!.id, reason), t('admin.reviews.deleted'));
          return r.ok ? null : r.error;
        }}
      />
    </AdminPage>
  );
}

const styles = themed(() => ({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  list: { gap: 10 },
}));
