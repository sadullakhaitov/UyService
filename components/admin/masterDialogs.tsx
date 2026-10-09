// Usta bo'yicha amallar oynalari: balans, obuna, prioritet. Qiymatlar chegarasi — lib/admin/rules.ts (server bilan bir xil)
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { BILLING } from '@/constants/billing';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminMaster, type BalanceKind } from '@/lib/admin';
import { adminErrorText, toast, invalidateAdmin } from '@/lib/admin/hooks';
import { RULES } from '@/lib/admin/rules';
import { FREE_DAYS, type FreeDays } from '@/lib/freePass';
import { t } from '@/lib/i18n';
import { Dialog, ErrorText } from './Dialog';
import { fmtDateOnly, fmtSum } from './format';
import { AButton, Field, Pill, Tabs } from './kit';

const digits = (s: string) => s.replace(/\D/g, '');
const fmtInput = (s: string) => digits(s).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string, close: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      toast(ok);
      invalidateAdmin();
      close();
    } catch (e) {
      setError(adminErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
}

type Kind = Exclude<BalanceKind, 'fee'>;
const BAL_PRESETS = [20_000, 50_000, 100_000, 200_000];

export function BalanceDialog({ master, visible, onClose }: { master: AdminMaster; visible: boolean; onClose: () => void }) {
  useScheme();
  const [kind, setKind] = useState<Kind>('topup');
  const [amount, setAmount] = useState('');
  const [minus, setMinus] = useState(false);
  const [note, setNote] = useState('');
  const a = useAction();
  useEffect(() => {
    if (visible) {
      setKind('topup');
      setAmount('');
      setMinus(false);
      setNote('');
      a.setError(null);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Number(digits(amount)) || 0;
  const signed = kind === 'adjust' && minus ? -n : n;
  const after = master.balance + signed;
  const valid = n > 0 && n <= RULES.balanceMax && (kind !== 'adjust' || note.trim().length >= 3);
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('admin.balance.title')}
      text={t('admin.balance.current', { sum: fmtSum(master.balance) })}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton
            title={t('admin.balance.apply')}
            kind="primary"
            loading={a.busy}
            disabled={!valid}
            onPress={() => a.run(() => adminApi.adjustBalance(master.id, signed, kind, note), t('admin.balance.done', { sum: fmtSum(after) }), onClose)}
          />
        </>
      }
    >
      <Tabs
        value={kind}
        onChange={(k) => {
          setKind(k);
          if (k !== 'adjust') setMinus(false);
        }}
        items={(['topup', 'bonus', 'refund', 'adjust'] as Kind[]).map((k) => ({ key: k, label: t(`admin.kind.${k}`) }))}
      />
      <Text variant="caption">{t(`admin.balance.hint.${kind}`)}</Text>
      {kind === 'adjust' ? (
        <View style={styles.row}>
          <Pill label={t('admin.balance.plus')} active={!minus} onPress={() => setMinus(false)} />
          <Pill label={t('admin.balance.minus')} active={minus} onPress={() => setMinus(true)} />
        </View>
      ) : null}
      <Field label={t('admin.balance.amount')} value={fmtInput(amount)} onChangeText={(v) => setAmount(digits(v).slice(0, 8))} keyboardType="number-pad" placeholder="50 000" />
      <View style={styles.row}>
        {BAL_PRESETS.map((p) => (
          <Pill key={p} label={fmtSum(p)} active={n === p} onPress={() => setAmount(String(p))} />
        ))}
      </View>
      <Field
        label={kind === 'adjust' ? t('admin.balance.noteRequired') : t('admin.balance.note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('admin.balance.notePlaceholder')}
        maxLength={RULES.reasonMax}
      />
      {n > 0 ? (
        <View style={styles.preview}>
          <Text variant="small">{t('admin.balance.after')}</Text>
          <Text style={[styles.previewValue, after < 0 && { color: colors.danger }]}>{fmtSum(after)}</Text>
        </View>
      ) : null}
      {n > RULES.balanceMax ? <ErrorText text={t('admin.errors.amount')} /> : null}
      {a.error ? <ErrorText text={a.error} /> : null}
    </Dialog>
  );
}

const SUB_DAYS = [30, 90, 180, 365];

export function SubscriptionDialog({ master, visible, onClose }: { master: AdminMaster; visible: boolean; onClose: () => void }) {
  useScheme();
  const [days, setDays] = useState(30);
  const [amount, setAmount] = useState(String(BILLING.subscription.monthlyFee));
  const a = useAction();
  useEffect(() => {
    if (visible) {
      setDays(30);
      setAmount(String(BILLING.subscription.monthlyFee));
      a.setError(null);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = Math.max(Date.now(), master.subscriptionUntil ?? 0);
  const until = start + days * 86_400_000;
  const n = Number(digits(amount)) || 0;
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('admin.sub.title')}
      text={master.subscriptionUntil && master.subscriptionUntil > Date.now() ? t('admin.sub.activeUntil', { date: fmtDateOnly(master.subscriptionUntil) }) : t('admin.sub.inactive')}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton
            title={t('admin.sub.apply')}
            kind="primary"
            loading={a.busy}
            disabled={n > RULES.amountMax}
            onPress={() => a.run(() => adminApi.addSubscription(master.id, days, n), t('admin.sub.done', { date: fmtDateOnly(until) }), onClose)}
          />
        </>
      }
    >
      <Text style={styles.label}>{t('admin.sub.period')}</Text>
      <View style={styles.row}>
        {SUB_DAYS.map((d) => (
          <Pill
            key={d}
            label={t('admin.sub.days', { n: d })}
            active={days === d}
            onPress={() => {
              setDays(d);
              setAmount(String(Math.round((BILLING.subscription.monthlyFee * d) / 30)));
            }}
          />
        ))}
      </View>
      <Field label={t('admin.sub.amount')} value={fmtInput(amount)} onChangeText={(v) => setAmount(digits(v).slice(0, 8))} keyboardType="number-pad" hint={t('admin.sub.amountHint')} />
      <View style={styles.preview}>
        <Text variant="small">{t('admin.sub.newUntil')}</Text>
        <Text style={styles.previewValue}>{fmtDateOnly(until)}</Text>
      </View>
      {a.error ? <ErrorText text={a.error} /> : null}
    </Dialog>
  );
}

export function PriorityDialog({ master, visible, onClose }: { master: AdminMaster; visible: boolean; onClose: () => void }) {
  useScheme();
  const [points, setPoints] = useState(master.priority);
  const a = useAction();
  useEffect(() => {
    if (visible) {
      setPoints(master.priority);
      a.setError(null);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const clamp = (x: number) => Math.max(RULES.priorityMin, Math.min(RULES.priorityMax, x));
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('admin.priority.title')}
      text={t('admin.priority.text')}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton
            title={t('admin.common.save')}
            kind="primary"
            loading={a.busy}
            disabled={points === master.priority}
            onPress={() => a.run(() => adminApi.setPriority(master.id, points), t('admin.priority.done', { n: points }), onClose)}
          />
        </>
      }
    >
      <View style={styles.stepper}>
        <AButton title="−10" onPress={() => setPoints((p) => clamp(p - 10))} />
        <AButton title="−1" onPress={() => setPoints((p) => clamp(p - 1))} />
        <Text style={styles.stepValue}>{points > 0 ? `+${points}` : points}</Text>
        <AButton title="+1" onPress={() => setPoints((p) => clamp(p + 1))} />
        <AButton title="+10" onPress={() => setPoints((p) => clamp(p + 10))} />
      </View>
      <View style={styles.row}>
        {[0, 10, 20, -20].map((p) => (
          <Pill key={p} label={p > 0 ? `+${p}` : String(p)} active={points === p} onPress={() => setPoints(p)} />
        ))}
      </View>
      {a.error ? <ErrorText text={a.error} /> : null}
    </Dialog>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  preview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: colors.field },
  previewValue: { fontFamily: fonts.heavy, fontSize: 16, lineHeight: 21, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stepValue: { minWidth: 70, textAlign: 'center', fontFamily: fonts.heavy, fontSize: 28, lineHeight: 34, color: colors.ink, fontVariant: ['tabular-nums'] },
}));

/** Bepul davr: uzaytirish (30 / 60 / 90 kun) yoki to'xtatish — sabab bilan, jurnalga yoziladi */
export function FreeDialog({ master, visible, onClose }: { master: AdminMaster; visible: boolean; onClose: () => void }) {
  useScheme();
  const [days, setDays] = useState<0 | FreeDays>(30);
  const [reason, setReason] = useState('');
  const a = useAction();
  useEffect(() => {
    if (visible) {
      setDays(30);
      setReason('');
      a.setError(null);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = !!master.freeUntil && master.freeUntil > Date.now();
  const until = days === 0 ? null : Math.max(Date.now(), master.freeUntil ?? 0) + days * 86_400_000;
  const noPassport = !master.passport || (master.verifyStatus !== 'pending' && master.verifyStatus !== 'approved');
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('admin.free.dialogTitle')}
      text={active ? t('admin.free.activeUntil', { date: fmtDateOnly(master.freeUntil) }) : t('admin.free.inactive')}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton
            title={days === 0 ? t('admin.free.stop') : t('admin.free.extend')}
            kind={days === 0 ? 'dangerSolid' : 'primary'}
            loading={a.busy}
            disabled={reason.trim().length < 3 || (days > 0 && noPassport) || (days === 0 && !active)}
            onPress={() =>
              a.run(() => adminApi.setFree(master.id, days, reason.trim()), days === 0 ? t('admin.free.stoppedDone') : t('admin.free.extendedDone', { date: fmtDateOnly(until) }), onClose)
            }
          />
        </>
      }
    >
      <View style={styles.row}>
        {FREE_DAYS.map((d) => (
          <Pill key={d} label={`+${t('admin.free.daysN', { n: d })}`} active={days === d} onPress={() => setDays(d)} />
        ))}
        {active ? <Pill label={t('admin.free.stop')} active={days === 0} onPress={() => setDays(0)} /> : null}
      </View>
      {days > 0 && noPassport ? <ErrorText text={t('admin.errors.passportRequired')} /> : null}
      {days > 0 ? (
        <View style={styles.preview}>
          <Text variant="small">{t('admin.free.newUntil')}</Text>
          <Text style={styles.previewValue}>{fmtDateOnly(until)}</Text>
        </View>
      ) : null}
      <Field label={t('admin.common.reason')} value={reason} onChangeText={setReason} placeholder={t('admin.common.reasonPlaceholder')} multiline maxLength={RULES.reasonMax} />
      {a.error ? <ErrorText text={a.error} /> : null}
    </Dialog>
  );
}
