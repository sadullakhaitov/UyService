// Bepul davr kodlari (ishga tushirish aksiyasi): admin ustaning raqamiga 30 / 60 / 90 kunlik shaxsiy kod yaratadi,
// kod darhol Telegram (@uyservice_bot) yoki SMS bilan yuboriladi; kanal bo'lmasa — nusxalab o'zingiz yuborasiz.
// Usta kodni Profil → Promokod'ga kiritadi (pasport yuklangan bo'lishi shart) → shu muddat hech qanday ulush olinmaydi.
// Bu yerda: yaratish, ro'yxat (holati, kim ishlatgan), qayta yuborish, bekor qilish; tepada — aksiya statistikasi.
import { router, type Href } from 'expo-router';
import { Copy, Gift, Send, TicketX } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { ReasonDialog } from '@/components/admin/Dialog';
import { fmtDateOnly, fmtDateTime, fmtNum, fmtPhone, fmtSum, fmtSumShort } from '@/components/admin/format';
import { AButton, Badge, Empty, ErrorBox, Field, Panel, Pill, Skeleton, SkeletonRows, Tabs, type Tone } from '@/components/admin/kit';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type FreePass, type FreePassStatus, type FreeSendResult } from '@/lib/admin';
import { adminErrorText, invalidateAdmin, toast, useAdminQuery } from '@/lib/admin/hooks';
import { normalizePhone } from '@/lib/admin/rules';
import { FREE_DAYS, FREE_REDEEM_DAYS, type FreeDays } from '@/lib/freePass';
import { t } from '@/lib/i18n';
import { copyText } from '@/lib/share';

const TONE: Record<FreePassStatus, Tone> = { pending: 'warning', redeemed: 'success', expired: 'neutral', revoked: 'danger' };
type Filter = 'all' | FreePassStatus;

/** Usta oladigan xabar (kanal bo'lmasa — admin nusxalab yuboradi) */
const messageFor = (code: string, days: number) => t('admin.free.message', { code, days, redeem: FREE_REDEEM_DAYS });

export default function FreePasses() {
  useScheme();
  const { mode } = useAdminLayout();
  const list = useAdminQuery('free-passes', () => adminApi.freePasses());
  const stats = useAdminQuery('free-stats', () => adminApi.freeStats());
  const [filter, setFilter] = useState<Filter>('all');
  const [revoke, setRevoke] = useState<FreePass | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const send = async (code: string, days: number): Promise<FreeSendResult | null> => {
    setSending(code);
    try {
      const via = await adminApi.sendFreePass(code);
      toast(t(`admin.free.sent.${via}`), via === 'telegram' || via === 'sms' ? 'success' : 'info');
      if (via !== 'telegram' && via !== 'sms') void copyText(messageFor(code, days));
      invalidateAdmin();
      return via;
    } catch (e) {
      toast(adminErrorText(e), 'error');
      return null;
    } finally {
      setSending(null);
    }
  };

  const rows = (list.data ?? []).filter((p) => filter === 'all' || p.status === filter);
  const count = (s: FreePassStatus) => (list.data ?? []).filter((p) => p.status === s).length;
  const s = stats.data;
  const tiles = [
    { k: 'active', label: t('admin.free.statActive'), value: s ? fmtNum(s.activeMasters) : null, sub: t('admin.free.statActiveSub') },
    { k: 'pending', label: t('admin.free.statPending'), value: s ? fmtNum(s.pending) : null, sub: t('admin.free.statPendingSub') },
    { k: 'redeemed', label: t('admin.free.statRedeemed'), value: s ? fmtNum(s.redeemed) : null, sub: t('admin.free.statRedeemedSub') },
    { k: 'waived', label: t('admin.free.statWaived'), value: s ? fmtSumShort(s.waived) : null, sub: s ? fmtSum(s.waived) : '' },
  ];

  return (
    <AdminPage
      title={t('admin.nav.free')}
      subtitle={t('admin.free.subtitle')}
      onRefresh={() => {
        list.reload();
        stats.reload();
      }}
      refreshing={list.refreshing}
    >
      <View style={styles.tiles}>
        {tiles.map((x) => (
          <View key={x.k} style={[styles.tile, { width: mode === 'mobile' ? '50%' : '25%' }]}>
            <View style={styles.tileInner}>
              <Text style={styles.tileLabel}>{x.label}</Text>
              {x.value == null ? <Skeleton h={28} w="50%" /> : <Text style={styles.tileValue}>{x.value}</Text>}
              <Text variant="caption" numberOfLines={1}>
                {x.sub}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <CreatePass onSend={send} />

      <Panel title={t('admin.free.listTitle')} subtitle={t('admin.free.listSub')}>
        <Tabs<Filter>
          value={filter}
          onChange={setFilter}
          items={[
            { key: 'all', label: t('admin.common.all'), count: list.data?.length },
            { key: 'pending', label: t('admin.free.status.pending'), count: count('pending'), tone: 'warning' },
            { key: 'redeemed', label: t('admin.free.status.redeemed'), count: count('redeemed') },
            { key: 'expired', label: t('admin.free.status.expired'), count: count('expired') },
            { key: 'revoked', label: t('admin.free.status.revoked'), count: count('revoked') },
          ]}
        />
        {list.error && !list.data ? <ErrorBox text={list.error} onRetry={list.reload} /> : null}
        <View style={styles.rows}>
          {!list.data ? (
            <SkeletonRows />
          ) : !rows.length ? (
            <Empty text={t('admin.free.empty')} icon={Gift} />
          ) : (
            rows.map((p) => (
              <View key={p.code} style={[styles.row, mode === 'mobile' && styles.rowWrap]}>
                <View style={styles.flex}>
                  <View style={styles.codeLine}>
                    <Text style={styles.code} selectable>
                      {p.code}
                    </Text>
                    <Badge label={t(`admin.free.status.${p.status}`)} tone={TONE[p.status]} dot />
                    <Badge label={t('admin.free.daysN', { n: p.days })} tone="primary" />
                  </View>
                  <Text variant="caption">
                    {[
                      fmtPhone(p.phone),
                      t('admin.free.created', { date: fmtDateTime(p.createdAt) }),
                      p.sentVia ? t(`admin.free.via.${p.sentVia}`) : t('admin.free.notSent'),
                    ].join(' · ')}
                  </Text>
                  <Text variant="caption">
                    {p.status === 'redeemed'
                      ? t('admin.free.redeemedBy', { name: p.masterName ?? '—', date: fmtDateOnly(p.redeemedAt), until: p.freeUntil ? fmtDateOnly(p.freeUntil) : '—' })
                      : p.status === 'revoked'
                        ? t('admin.free.revokedReason', { reason: p.revokeReason === 'replaced' ? t('admin.free.replaced') : (p.revokeReason ?? '—') })
                        : t('admin.free.redeemBy', { date: fmtDateOnly(p.redeemBy) })}
                  </Text>
                </View>
                <View style={styles.actions}>
                  {p.status === 'redeemed' && p.masterId ? (
                    <AButton size="sm" kind="ghost" title={t('admin.free.openMaster')} onPress={() => router.push(`/admin/masters/${p.masterId}` as Href)} />
                  ) : null}
                  {p.status === 'pending' ? (
                    <>
                      <AButton size="sm" icon={Copy} accessibilityLabel={t('admin.free.copy')} onPress={() => void copyText(messageFor(p.code, p.days))} />
                      <AButton size="sm" icon={Send} title={t('admin.free.resend')} loading={sending === p.code} onPress={() => void send(p.code, p.days)} />
                    </>
                  ) : null}
                  {p.status === 'pending' || p.status === 'redeemed' ? (
                    <AButton size="sm" kind="danger" icon={TicketX} accessibilityLabel={t('admin.free.revoke')} onPress={() => setRevoke(p)} />
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </Panel>

      <ReasonDialog
        visible={!!revoke}
        onClose={() => setRevoke(null)}
        title={t('admin.free.revokeTitle', { code: revoke?.code ?? '' })}
        text={revoke?.status === 'redeemed' ? t('admin.free.revokeRedeemedText') : t('admin.free.revokeText')}
        confirmLabel={t('admin.free.revoke')}
        danger
        presets={[t('admin.free.preset.mistake'), t('admin.free.preset.abuse'), t('admin.free.preset.left')]}
        onSubmit={async (reason) => {
          try {
            await adminApi.revokeFreePass(revoke!.code, reason);
            toast(t('admin.free.revoked'));
            invalidateAdmin();
            return null;
          } catch (e) {
            return adminErrorText(e);
          }
        }}
      />
    </AdminPage>
  );
}

/** Yangi kod: raqam + muddat → yaratish va darhol yuborish */
function CreatePass({ onSend }: { onSend: (code: string, days: number) => Promise<FreeSendResult | null> }) {
  useScheme();
  const [phone, setPhone] = useState('');
  const [days, setDays] = useState<FreeDays>(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<{ code: string; days: number; phone: string; via: FreeSendResult | null } | null>(null);
  const valid = !!normalizePhone(phone);

  const create = async () => {
    if (!valid) return setError(t('admin.errors.phone'));
    setBusy(true);
    setError(null);
    try {
      const code = await adminApi.createFreePass(phone, days);
      invalidateAdmin();
      setLast({ code, days, phone: normalizePhone(phone)!, via: null });
      const via = await onSend(code, days);
      setLast({ code, days, phone: normalizePhone(phone)!, via });
      setPhone('');
    } catch (e) {
      setError(adminErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title={t('admin.free.createTitle')} subtitle={t('admin.free.createSub', { redeem: FREE_REDEEM_DAYS })}>
      <View style={styles.form}>
        <Field
          label={t('admin.free.phone')}
          value={phone}
          onChangeText={(v) => {
            setPhone(v.replace(/[^\d+ ]/g, '').slice(0, 17));
            setError(null);
          }}
          placeholder="+998 90 123 45 67"
          keyboardType="phone-pad"
          error={error}
          style={styles.phone}
          onSubmitEditing={create}
        />
        <View style={styles.daysBox}>
          <Text style={styles.label}>{t('admin.free.days')}</Text>
          <View style={styles.pills}>
            {FREE_DAYS.map((d) => (
              <Pill key={d} label={t('admin.free.daysN', { n: d })} active={days === d} onPress={() => setDays(d)} />
            ))}
          </View>
        </View>
        <AButton title={t('admin.free.create')} icon={Gift} kind="primary" disabled={!valid} loading={busy} onPress={create} />
      </View>
      {last ? (
        <View style={styles.result}>
          <View style={styles.flex}>
            <Text variant="caption">{t('admin.free.createdFor', { phone: fmtPhone(last.phone), days: last.days })}</Text>
            <Text style={styles.bigCode} selectable>
              {last.code}
            </Text>
            <Text variant="caption" style={{ color: last.via === 'telegram' || last.via === 'sms' ? colors.success : colors.accentInk }}>
              {last.via ? t(`admin.free.sent.${last.via}`) : t('admin.free.sending')}
            </Text>
          </View>
          <AButton size="sm" icon={Copy} title={t('admin.free.copy')} onPress={() => void copyText(messageFor(last.code, last.days))} />
        </View>
      ) : null}
      <Text variant="caption" style={styles.rules}>
        {t('admin.free.rules')}
      </Text>
    </Panel>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  tile: { padding: 6 },
  tileInner: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 4 },
  tileLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  tileValue: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 32, color: colors.ink, fontVariant: ['tabular-nums'] },
  form: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16 },
  phone: { minWidth: 220, flexGrow: 1, maxWidth: 320 },
  daysBox: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  pills: { flexDirection: 'row', gap: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: 14, backgroundColor: colors.primarySoft },
  bigCode: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 30, letterSpacing: 2, color: colors.primary },
  rules: { marginTop: 12 },
  rows: { gap: 2, paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowWrap: { flexWrap: 'wrap' },
  codeLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 },
  code: { fontFamily: fonts.heavy, fontSize: 16, lineHeight: 22, letterSpacing: 1, color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
}));
