// Narxlar va katalog: har kategoriyaning chaqiruv narxi va yoqilganligi, muammolarning taxminiy narx oralig'i,
// ustalar uchun promokodlar (prioritet / balansga bonus).
// O'zgarish saqlashdan oldin tekshiriladi va jurnalga yoziladi.
import { Plus, Save } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Switch, TextInput, View } from 'react-native';
import { CategoryIcon } from '@/components/admin/CategoryIcon';
import { AButton, Badge, Empty, ErrorBox, Panel, SkeletonRows } from '@/components/admin/kit';
import { fmtDateOnly, fmtSum } from '@/components/admin/format';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type CatalogCategory, type CatalogProblem, type PromoCode } from '@/lib/admin';
import { adminErrorText, invalidateAdmin, toast, useAdminQuery } from '@/lib/admin/hooks';
import { checkCallFee, checkPriceRange, checkPromo } from '@/lib/admin/rules';
import { formatRange, t } from '@/lib/i18n';

const digits = (s: string) => s.replace(/\D/g, '');
const fmtIn = (s: string) => digits(s).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function Catalog() {
  useScheme();
  const q = useAdminQuery('catalog', () => adminApi.catalog());
  return (
    <AdminPage title={t('admin.nav.catalog')} subtitle={t('admin.catalog.subtitle')} onRefresh={q.reload} refreshing={q.refreshing}>
      {q.error && !q.data ? <ErrorBox text={q.error} onRetry={q.reload} /> : null}
      {!q.data ? (
        <Panel>
          <SkeletonRows />
        </Panel>
      ) : (
        q.data.categories.map((c) => <CategoryBlock key={c.id} c={c} problems={q.data!.problems.filter((p) => p.categoryId === c.id)} />)
      )}
      <Promos />
    </AdminPage>
  );
}

const DAY = 86_400_000;

/** Promokodlar: usta Profil → Promokod'da kiritadi; har usta bitta kodni bir marta ishlatadi */
function Promos() {
  useScheme();
  const q = useAdminQuery('promos', () => adminApi.promos());
  const [code, setCode] = useState('');
  const [priority, setPriority] = useState('');
  const [bonus, setBonus] = useState('');
  const [limit, setLimit] = useState('');
  const [days, setDays] = useState('');
  const [busy, setBusy] = useState(false);
  const input = {
    code: code.trim().toUpperCase(),
    priority: Number(digits(priority)) || 0,
    bonus: Number(digits(bonus)) || 0,
    maxUses: digits(limit) ? Number(digits(limit)) : null,
    expiresAt: digits(days) ? Date.now() + Number(digits(days)) * DAY : null,
    active: true,
  };
  let error: string | null = null;
  try {
    checkPromo(input);
  } catch (e) {
    error = adminErrorText(e);
  }
  const save = async (p: Parameters<typeof adminApi.savePromo>[0], msg: string) => {
    setBusy(true);
    try {
      await adminApi.savePromo(p);
      toast(msg);
      invalidateAdmin();
      return true;
    } catch (e) {
      toast(adminErrorText(e), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    if (await save(input, t('admin.promo.saved', { code: input.code }))) {
      setCode('');
      setPriority('');
      setBonus('');
      setLimit('');
      setDays('');
    }
  };
  const toggle = (p: PromoCode) =>
    save({ code: p.code, priority: p.priority, bonus: p.bonus, maxUses: p.maxUses, expiresAt: p.expiresAt, active: !p.active }, t('admin.promo.saved', { code: p.code }));

  const field = (label: string, value: string, set: (v: string) => void, max: number, w = 110) => (
    <View style={styles.feeBox}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={fmtIn(value)} onChangeText={(v) => set(digits(v).slice(0, max))} keyboardType="number-pad" accessibilityLabel={label} style={[styles.input, { minWidth: 0, width: w }]} />
    </View>
  );
  return (
    <Panel title={t('admin.promo.title')} subtitle={t('admin.promo.subtitle')}>
      <View style={styles.catRow}>
        <View style={styles.feeBox}>
          <Text style={styles.label}>{t('admin.promo.code')}</Text>
          <TextInput
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="BAHOR2026"
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('admin.promo.code')}
            style={[styles.input, { minWidth: 160 }]}
          />
        </View>
        {field(t('admin.promo.priority'), priority, setPriority, 2, 90)}
        {field(t('admin.promo.bonus'), bonus, setBonus, 7, 130)}
        {field(t('admin.promo.limit'), limit, setLimit, 6, 100)}
        {field(t('admin.promo.days'), days, setDays, 3, 90)}
        <AButton title={t('admin.promo.add')} icon={Plus} kind="primary" size="sm" disabled={!code || !!error} loading={busy} onPress={add} />
      </View>
      {code && error ? <Text style={[styles.label, { color: colors.danger }]}>{error}</Text> : null}
      <View style={styles.problems}>
        {!q.data ? (
          <SkeletonRows />
        ) : !q.data.length ? (
          <Empty text={t('admin.promo.empty')} />
        ) : (
          q.data.map((p) => {
            const expired = p.expiresAt != null && p.expiresAt < Date.now();
            const full = p.maxUses != null && p.uses >= p.maxUses;
            return (
              <View key={p.code} style={styles.problem}>
                <View style={styles.flex}>
                  <Text style={styles.pName}>{p.code}</Text>
                  <Text variant="caption">
                    {[
                      p.priority ? t('promo.gotPriority', { n: p.priority }) : null,
                      p.bonus ? `+${fmtSum(p.bonus)}` : null,
                      t('admin.promo.uses', { n: p.uses, max: p.maxUses ?? '∞' }),
                      p.expiresAt ? t('admin.promo.until', { date: fmtDateOnly(p.expiresAt) }) : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
                {expired || full ? <Badge label={t(expired ? 'admin.promo.expired' : 'admin.promo.full')} tone="neutral" /> : null}
                <Switch
                  value={p.active}
                  onValueChange={() => void toggle(p)}
                  disabled={busy}
                  trackColor={{ true: colors.primary, false: colors.track }}
                  accessibilityLabel={`${p.code} — ${t('admin.catalog.active')}`}
                />
              </View>
            );
          })
        )}
      </View>
    </Panel>
  );
}

function CategoryBlock({ c, problems }: { c: CatalogCategory; problems: CatalogProblem[] }) {
  useScheme();
  const [fee, setFee] = useState(String(c.callFee));
  const [active, setActive] = useState(c.active);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setFee(String(c.callFee));
    setActive(c.active);
  }, [c.callFee, c.active]);
  const dirty = Number(digits(fee)) !== c.callFee || active !== c.active;
  const save = async () => {
    const n = Number(digits(fee));
    try {
      checkCallFee(n);
      setBusy(true);
      await adminApi.updateCategory(c.id, n, active);
      toast(t('admin.catalog.saved', { name: t(`categories.${c.id}`) }));
      invalidateAdmin();
    } catch (e) {
      toast(adminErrorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel
      title={t(`categories.${c.id}`)}
      subtitle={active ? t('admin.catalog.on') : t('admin.catalog.offHint')}
      actions={<CategoryIcon id={c.id} size={32} />}
    >
      <View style={styles.catRow}>
        <View style={styles.feeBox}>
          <Text style={styles.label}>{t('admin.catalog.callFee')}</Text>
          <TextInput value={fmtIn(fee)} onChangeText={(v) => setFee(digits(v).slice(0, 7))} keyboardType="number-pad" accessibilityLabel={t('admin.catalog.callFee')} style={styles.input} />
        </View>
        <View style={styles.switchRow}>
          <Switch value={active} onValueChange={setActive} trackColor={{ true: colors.primary, false: colors.track }} accessibilityLabel={t('admin.catalog.active')} />
          <Text style={styles.label}>{t('admin.catalog.active')}</Text>
        </View>
        <AButton title={t('admin.common.save')} icon={Save} kind="primary" size="sm" disabled={!dirty} loading={busy} onPress={save} />
      </View>
      <View style={styles.problems}>
        {problems.map((p) => (
          <ProblemRow key={p.id} p={p} />
        ))}
      </View>
    </Panel>
  );
}

function ProblemRow({ p }: { p: CatalogProblem }) {
  useScheme();
  const { mode } = useAdminLayout();
  const [min, setMin] = useState(p.priceMin == null ? '' : String(p.priceMin));
  const [max, setMax] = useState(p.priceMax == null ? '' : String(p.priceMax));
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setMin(p.priceMin == null ? '' : String(p.priceMin));
    setMax(p.priceMax == null ? '' : String(p.priceMax));
  }, [p.priceMin, p.priceMax]);
  const toN = (s: string) => (digits(s) ? Number(digits(s)) : null);
  const a = toN(min);
  const b = toN(max);
  const dirty = a !== p.priceMin || b !== p.priceMax;
  let error: string | null = null;
  try {
    checkPriceRange(a, b);
  } catch (e) {
    error = adminErrorText(e);
  }
  const save = async () => {
    setBusy(true);
    try {
      await adminApi.updateProblem(p.id, a, b);
      toast(t('admin.catalog.problemSaved', { name: t(`problems.${p.id}`) }));
      invalidateAdmin();
    } catch (e) {
      toast(adminErrorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={[styles.problem, mode === 'mobile' && { flexWrap: 'wrap' }]}>
      <View style={styles.flex}>
        <Text style={styles.pName}>{t(`problems.${p.id}`)}</Text>
        <Text variant="caption">{dirty && error ? error : formatRange(a, b)}</Text>
      </View>
      <TextInput value={fmtIn(min)} onChangeText={(v) => setMin(digits(v).slice(0, 9))} placeholder={t('admin.catalog.min')} placeholderTextColor={colors.muted} keyboardType="number-pad" accessibilityLabel={`${t(`problems.${p.id}`)} — ${t('admin.catalog.min')}`} style={[styles.input, styles.small, dirty && error ? { borderColor: colors.danger } : null]} />
      <Text variant="caption">—</Text>
      <TextInput value={fmtIn(max)} onChangeText={(v) => setMax(digits(v).slice(0, 9))} placeholder={t('admin.catalog.max')} placeholderTextColor={colors.muted} keyboardType="number-pad" accessibilityLabel={`${t(`problems.${p.id}`)} — ${t('admin.catalog.max')}`} style={[styles.input, styles.small, dirty && error ? { borderColor: colors.danger } : null]} />
      <AButton size="sm" icon={Save} accessibilityLabel={t('admin.common.save')} kind={dirty ? 'primary' : 'ghost'} disabled={!dirty || !!error} loading={busy} onPress={save} />
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 140 },
  catRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  feeBox: { gap: 6 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  input: { height: 40, minWidth: 140, borderRadius: 10, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 10, fontFamily: fonts.bold, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  small: { minWidth: 0, width: 120 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40 },
  problems: { gap: 2, paddingTop: 6 },
  problem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  pName: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
}));

