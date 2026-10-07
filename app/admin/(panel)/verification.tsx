// Hujjat tekshiruvi navbati: eng eski ariza birinchi. Pasport va selfi yonma-yon, bir bosishda tasdiqlash yoki
// sabab bilan rad etish. Rad etilgan usta sababini ilovada ko'radi va qayta yuklaydi.
import { router, type Href } from 'expo-router';
import { BadgeCheck, ExternalLink, PartyPopper, ShieldX } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { CategoryIcon } from '@/components/admin/CategoryIcon';
import { ConfirmDialog, ReasonDialog } from '@/components/admin/Dialog';
import { fmtAgo, fmtNum } from '@/components/admin/format';
import { AButton, Badge, Empty, ErrorBox, Pager, Panel, SkeletonRows } from '@/components/admin/kit';
import { MasterName } from '@/components/admin/people';
import { PhotoThumb } from '@/components/admin/Photos';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminMaster } from '@/lib/admin';
import { useAdminAction, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const PAGE = 10;

export default function Verification() {
  useScheme();
  const { mode } = useAdminLayout();
  const [page, setPage] = useState(0);
  const q = useAdminQuery(`verify-${page}`, () =>
    adminApi.masters({ filter: 'pending', q: '', category: null, sort: 'created', dir: 'asc', page, pageSize: PAGE }),
  );
  const [approve, setApprove] = useState<AdminMaster | null>(null);
  const [reject, setReject] = useState<AdminMaster | null>(null);
  const { run } = useAdminAction();
  const name = (m: AdminMaster | null) => (m ? `${m.firstName} ${m.lastName}`.trim() : '');

  return (
    <AdminPage
      title={t('admin.nav.verification')}
      subtitle={q.data ? t('admin.verification.subtitle', { n: fmtNum(q.data.total) }) : t('admin.verification.hint')}
      onRefresh={q.reload}
      refreshing={q.refreshing}
      updatedAt={q.updatedAt}
    >
      {q.error && !q.data ? <ErrorBox text={q.error} onRetry={q.reload} /> : null}
      {!q.data ? (
        <Panel>
          <SkeletonRows n={4} />
        </Panel>
      ) : !q.data.rows.length ? (
        <Panel>
          <Empty icon={PartyPopper} text={t('admin.verification.empty')} />
        </Panel>
      ) : (
        <View style={[styles.list, q.refreshing && { opacity: 0.6 }]}>
          {q.data.rows.map((m) => (
            <Panel key={m.id}>
              <View style={[styles.item, mode === 'mobile' && styles.itemStack]}>
                <View style={styles.info}>
                  <MasterName m={m} size={44} />
                  <View style={styles.badges}>
                    <Badge label={t('admin.verification.waiting', { ago: fmtAgo(m.submittedAt) })} tone={m.submittedAt && Date.now() - m.submittedAt > 86_400_000 ? 'danger' : 'warning'} />
                    {m.selfie ? <Badge label={t('admin.verification.withSelfie')} tone="success" /> : <Badge label={t('admin.verification.noSelfie')} tone="neutral" />}
                  </View>
                  <View style={styles.cats}>
                    {m.categories.map((c) => (
                      <View key={c} style={styles.cat}>
                        <CategoryIcon id={c} size={22} />
                        <Text style={styles.catText}>{t(`categories.${c}`)}</Text>
                      </View>
                    ))}
                  </View>
                  <Text variant="caption">{t('admin.verification.checklist')}</Text>
                </View>
                <View style={styles.photos}>
                  <PhotoThumb uri={m.passport} label={t('admin.docs.passport')} w={mode === 'mobile' ? 150 : 220} h={mode === 'mobile' ? 100 : 146} />
                  <PhotoThumb uri={m.selfie} label={t('admin.docs.selfie')} w={mode === 'mobile' ? 150 : 220} h={mode === 'mobile' ? 100 : 146} />
                  {m.photo ? <PhotoThumb uri={m.photo} label={t('admin.docs.profilePhoto')} w={mode === 'mobile' ? 100 : 146} h={mode === 'mobile' ? 100 : 146} /> : null}
                </View>
              </View>
              <View style={styles.actions}>
                <AButton title={t('admin.verifyAct.approve')} icon={BadgeCheck} kind="success" disabled={!m.passport} onPress={() => setApprove(m)} />
                <AButton title={t('admin.verifyAct.reject')} icon={ShieldX} kind="danger" onPress={() => setReject(m)} />
                <View style={styles.flex} />
                <AButton title={t('admin.verification.profile')} icon={ExternalLink} kind="ghost" onPress={() => router.push(`/admin/masters/${m.id}` as Href)} />
              </View>
            </Panel>
          ))}
          <Pager page={page} pageSize={PAGE} total={q.data.total} onPage={setPage} />
        </View>
      )}

      <ConfirmDialog
        visible={!!approve}
        onClose={() => setApprove(null)}
        title={t('admin.verifyAct.approveTitle', { name: name(approve) })}
        text={t('admin.verifyAct.approveText')}
        confirmLabel={t('admin.verifyAct.approve')}
        onConfirm={async () => {
          const r = await run(() => adminApi.setVerify(approve!.id, 'approved'), t('admin.verifyAct.approved', { name: name(approve) }));
          return r.ok ? null : r.error;
        }}
      />
      <ReasonDialog
        visible={!!reject}
        onClose={() => setReject(null)}
        title={t('admin.verifyAct.rejectTitle', { name: name(reject) })}
        text={t('admin.verifyAct.rejectText')}
        confirmLabel={t('admin.verifyAct.reject')}
        danger
        presets={[t('admin.verifyAct.p1'), t('admin.verifyAct.p2'), t('admin.verifyAct.p3'), t('admin.verifyAct.p4')]}
        onSubmit={async (reason) => {
          const r = await run(() => adminApi.setVerify(reject!.id, 'rejected', reason), t('admin.verifyAct.rejected', { name: name(reject) }));
          return r.ok ? null : r.error;
        }}
      />
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  list: { gap: 14 },
  item: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  itemStack: { flexDirection: 'column' },
  info: { flex: 1, minWidth: 0, gap: 10 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.line, flexWrap: 'wrap' },
}));
