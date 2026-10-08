// Buyurtma tafsiloti: vaqt chizig'i (yaratildi → takliflar → qabul → yakun), narx, mijoz va usta,
// manzil (Yandex xaritada ochish), taqsimlash urinishlari, chat, sharh; yakunlanmagan bo'lsa — bekor qilish.
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Copy, MapPin, XCircle } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, View } from 'react-native';
import { ReasonDialog } from '@/components/admin/Dialog';
import { fmtDateTime, fmtDuration, fmtPhone, fmtSum, shortId } from '@/components/admin/format';
import { AButton, Badge, Empty, ErrorBox, KV, Panel, Skeleton, type Tone } from '@/components/admin/kit';
import { LogList } from '@/components/admin/LogList';
import { PhoneActions } from '@/components/admin/people';
import { PhotoThumb } from '@/components/admin/Photos';
import { ReviewItem } from '@/components/admin/ReviewItem';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { CategoryLabel, OrderBadge, cancelReasonText } from '@/components/admin/status';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type OrderDetail } from '@/lib/admin';
import { toast, useAdminAction, useAdminQuery } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

export default function OrderPage() {
  useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mode } = useAdminLayout();
  const q = useAdminQuery(`order-${id}`, () => adminApi.order(id));
  const [cancel, setCancel] = useState(false);
  const { run } = useAdminAction();
  const d = q.data;
  const o = d?.order;
  const open = !!o && o.status !== 'completed' && o.status !== 'cancelled';
  const wide = mode !== 'mobile';

  if (q.error && !d) {
    return (
      <AdminPage title={t('admin.nav.orders')} back="/admin/orders">
        <ErrorBox text={q.error} onRetry={q.reload} />
      </AdminPage>
    );
  }
  if (d === null) {
    return (
      <AdminPage title={t('admin.nav.orders')} back="/admin/orders">
        <Empty text={t('admin.orders.notFound')} />
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title={o ? t('admin.orders.title', { id: shortId(o.id) }) : t('admin.nav.orders')}
      subtitle={o ? fmtDateTime(o.createdAt) : undefined}
      back="/admin/orders"
      onRefresh={q.reload}
      refreshing={q.refreshing}
      actions={
        o ? (
          <>
            <AButton
              title={t('admin.orders.openMap')}
              icon={MapPin}
              onPress={() => Linking.openURL(`https://yandex.uz/maps/?pt=${o.location.longitude},${o.location.latitude}&z=17&l=map`)}
            />
            {Platform.OS === 'web' ? (
              <AButton
                icon={Copy}
                accessibilityLabel={t('admin.orders.copyId')}
                onPress={() => navigator.clipboard?.writeText(o.id).then(() => toast(t('admin.common.copied'), 'info'), () => {})}
              />
            ) : null}
            {open ? <AButton title={t('admin.orders.cancel')} icon={XCircle} kind="danger" onPress={() => setCancel(true)} /> : null}
          </>
        ) : null
      }
    >
      {!o || !d ? (
        <Skeleton h={200} r={18} />
      ) : (
        <>
          <Panel>
            <View style={styles.hero}>
              <View style={styles.flex}>
                <CategoryLabel id={o.categoryId} problem={o.problemId} />
              </View>
              <OrderBadge status={o.status} />
            </View>
            {o.status === 'cancelled' ? (
              <View style={styles.alert}>
                <Text style={styles.alertText}>{t('admin.orders.cancelledInfo', { reason: cancelReasonText(o.cancelReason, o.cancelledBy) })}</Text>
              </View>
            ) : null}
            {o.description ? <Text style={styles.desc}>«{o.description}»</Text> : null}
            {d.photoUrls.length ? (
              <View style={styles.photos}>
                {d.photoUrls.map((u, i) => (
                  <PhotoThumb key={i} uri={u} label={t('admin.orders.photo', { n: i + 1 })} w={140} h={100} />
                ))}
              </View>
            ) : null}
          </Panel>

          <View style={[styles.cols, !wide && styles.stack]}>
            <View style={[styles.col, wide && { flex: 1.4 }]}>
              <Panel title={t('admin.orders.timeline')}>
                <Timeline d={d} />
              </Panel>
              <Panel title={t('admin.orders.price')}>
                <KV label={t('admin.orders.callFee')} value={fmtSum(o.callFee)} />
                <KV label={t('admin.orders.work')} value={o.priceWork != null ? fmtSum(o.priceWork) : o.status === 'completed' ? t('admin.orders.inspectionOnly') : '—'} />
                <KV label={t('admin.orders.parts')} value={o.priceParts ? fmtSum(o.priceParts) : '—'} />
                <KV label={t('admin.orders.total')}>
                  <Text style={styles.big}>{o.status === 'completed' ? fmtSum(o.total) : '—'}</Text>
                  <Text variant="caption">{t('admin.orders.totalHint')}</Text>
                </KV>
                <KV label={t('admin.orders.platformFee')} value={o.platformFee != null ? fmtSum(o.platformFee) : '—'} />
              </Panel>
              <Panel title={t('admin.orders.dispatch')} subtitle={t('admin.orders.dispatchSub', { n: d.offers.length })} padded={false}>
                {d.offers.length ? (
                  d.offers.map((f) => (
                    <View key={f.id} style={styles.offer}>
                      <View style={styles.flex}>
                        <Text style={styles.link} onPress={() => router.push(`/admin/masters/${f.masterId}` as Href)}>
                          {f.masterName ?? '—'}
                        </Text>
                        <Text variant="caption">
                          {fmtDateTime(f.sentAt)}
                          {f.etaMin != null ? ` · ${t('common.min', { value: f.etaMin })}` : ''}
                          {f.distanceKm != null ? ` · ${t('common.km', { value: f.distanceKm })}` : ''}
                          {f.score != null ? ` · ${t('admin.orders.score', { n: f.score })}` : ''}
                          {f.cancelReason ? ` · ${cancelReasonText(f.cancelReason)}` : ''}
                        </Text>
                      </View>
                      <Badge label={t(`admin.offer.${f.status}`)} tone={OFFER_TONE[f.status]} />
                    </View>
                  ))
                ) : (
                  <Empty text={t('admin.orders.noOffers')} />
                )}
              </Panel>
              <Panel title={t('admin.orders.chat')} subtitle={t('admin.orders.chatSub')}>
                {d.chat.length ? (
                  <View style={styles.chat}>
                    {d.chat.map((c) => (
                      <View key={c.id} style={[styles.bubble, c.mine ? styles.bubbleMaster : styles.bubbleClient]}>
                        <Text variant="caption">{c.mine ? t('admin.orders.fromMaster') : t('admin.orders.fromClient')}</Text>
                        <Text style={styles.msg}>{c.text}</Text>
                        <Text style={styles.msgTime}>{fmtDateTime(c.at)}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Empty text={t('admin.orders.noChat')} />
                )}
              </Panel>
            </View>
            <View style={styles.col}>
              <Panel title={t('admin.orders.client')}>
                <Text style={styles.link} onPress={() => router.push(`/admin/users/${o.clientId}` as Href)}>
                  {o.clientName || t('admin.users.noName')}
                </Text>
                <PhoneActions phone={o.clientPhone} />
              </Panel>
              <Panel title={t('admin.orders.master')}>
                {o.masterId ? (
                  <>
                    <Text style={styles.link} onPress={() => router.push(`/admin/masters/${o.masterId}` as Href)}>
                      {o.masterName ?? '—'}
                    </Text>
                    <PhoneActions phone={o.masterPhone} />
                  </>
                ) : (
                  <Text variant="small">{t('admin.orders.noMaster')}</Text>
                )}
              </Panel>
              <Panel title={t('admin.orders.address')}>
                <Text style={styles.addr} selectable>
                  {o.address ?? '—'}
                </Text>
                <Text variant="caption" selectable>
                  {o.location.latitude.toFixed(5)}, {o.location.longitude.toFixed(5)}
                </Text>
                {o.scheduledAt ? <KV label={t('admin.orders.scheduled')} value={fmtDateTime(o.scheduledAt)} /> : null}
              </Panel>
              {d.review ? (
                <Panel title={t('admin.orders.review')}>
                  <ReviewItem r={d.review} />
                </Panel>
              ) : null}
              <Panel title={t('admin.log.forTarget')} padded={false}>
                <LogList targetId={o.id} pageSize={5} />
              </Panel>
              <Text variant="caption" selectable style={styles.id}>
                ID: {o.id}
              </Text>
            </View>
          </View>

          <ReasonDialog
            visible={cancel}
            onClose={() => setCancel(false)}
            title={t('admin.orders.cancelTitle', { id: shortId(o.id) })}
            text={t('admin.orders.cancelText')}
            confirmLabel={t('admin.orders.cancel')}
            danger
            presets={[t('admin.orders.cp1'), t('admin.orders.cp2'), t('admin.orders.cp3')]}
            onSubmit={async (reason) => {
              const r = await run(() => adminApi.cancelOrder(o.id, reason), t('admin.orders.cancelled'));
              return r.ok ? null : r.error;
            }}
          />
        </>
      )}
    </AdminPage>
  );
}

const OFFER_TONE: Record<string, Tone> = { sent: 'info', accepted: 'success', declined: 'danger', expired: 'neutral', cancelled: 'warning' };

/** Vaqt chizig'i: buyurtma hayoti bosqichma-bosqich */
function Timeline({ d }: { d: OrderDetail }) {
  useScheme();
  const o = d.order;
  const items: { at: number; text: string; tone: Tone; extra?: ReactNode }[] = [{ at: o.createdAt, text: t('admin.orders.t.created'), tone: 'neutral' }];
  if (o.scheduledAt) items.push({ at: o.createdAt + 1, text: t('admin.orders.t.scheduled', { at: fmtDateTime(o.scheduledAt) }), tone: 'neutral' });
  for (const f of d.offers) {
    items.push({ at: f.sentAt, text: t('admin.orders.t.offer', { name: f.masterName ?? '—' }), tone: 'info' });
    if (f.respondedAt && f.status !== 'accepted') items.push({ at: f.respondedAt, text: t(`admin.orders.t.${f.status}`, { name: f.masterName ?? '—' }), tone: f.status === 'declined' ? 'danger' : 'neutral' });
  }
  if (o.acceptedAt) items.push({ at: o.acceptedAt, text: t('admin.orders.t.accepted', { name: o.masterName ?? '—' }), tone: 'primary' });
  if (o.completedAt) items.push({ at: o.completedAt, text: t('admin.orders.t.completed', { sum: fmtSum(o.total) }), tone: 'success' });
  if (o.status === 'cancelled') items.push({ at: o.updatedAt, text: t('admin.orders.t.cancelled', { reason: cancelReasonText(o.cancelReason, o.cancelledBy) }), tone: 'danger' });
  if (!['completed', 'cancelled'].includes(o.status)) items.push({ at: Date.now(), text: t('admin.orders.t.now', { status: t(`admin.status.${o.status}`) }), tone: 'warning' });
  items.sort((a, b) => a.at - b.at);
  const dur = o.completedAt ? fmtDuration(o.completedAt - o.createdAt) : null;
  return (
    <View>
      {items.map((it, i) => {
        const c = { neutral: colors.muted, primary: colors.primary, success: colors.success, warning: colors.accent, danger: colors.danger, info: colors.info }[it.tone];
        return (
          <View key={i} style={styles.tl}>
            <View style={styles.tlRail}>
              <View style={[styles.tlDot, { backgroundColor: c }]} />
              {i < items.length - 1 ? <View style={styles.tlLine} /> : null}
            </View>
            <View style={styles.tlBody}>
              <Text style={styles.tlText}>{it.text}</Text>
              <Text variant="caption">{fmtDateTime(it.at)}</Text>
            </View>
          </View>
        );
      })}
      {dur ? <Text variant="caption">{t('admin.orders.duration', { d: dur })}</Text> : null}
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alert: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: colors.dangerSoft },
  alertText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.danger },
  desc: { marginTop: 12, fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  cols: { flexDirection: 'row', gap: 18, alignItems: 'flex-start' },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  col: { flex: 1, minWidth: 0, gap: 18 },
  big: { fontFamily: fonts.heavy, fontSize: 18, lineHeight: 24, color: colors.ink },
  offer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  link: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.primary, cursor: 'pointer' },
  addr: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink },
  chat: { gap: 8 },
  bubble: { maxWidth: '85%', padding: 10, borderRadius: 14, gap: 2 },
  bubbleClient: { alignSelf: 'flex-start', backgroundColor: colors.field },
  bubbleMaster: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft },
  msg: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.ink },
  msgTime: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.muted },
  tl: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 14, alignItems: 'center' },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, borderWidth: 2, borderColor: colors.surface },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.line, marginVertical: 2 },
  tlBody: { flex: 1, paddingBottom: 14 },
  tlText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  id: { textAlign: 'center' },
}));
