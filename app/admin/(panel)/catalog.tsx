// Narxlar va katalog: har kategoriyaning chaqiruv narxi va yoqilganligi, muammolarning taxminiy narx oralig'i,
// yangi yo'nalish / muammo turini qo'shish va o'chirish (sabab bilan), ustalar uchun promokodlar (prioritet / balansga bonus).
// O'zgarish saqlashdan oldin tekshiriladi va jurnalga yoziladi.
import { Check, Plus, Save, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { CategoryIcon } from '@/components/admin/CategoryIcon';
import { Dialog, ErrorText, ReasonDialog } from '@/components/admin/Dialog';
import { AButton, Badge, Empty, ErrorBox, Field, Panel, SkeletonRows } from '@/components/admin/kit';
import { fmtDateOnly, fmtSum } from '@/components/admin/format';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { Text } from '@/components/ui/Text';
import { colors, fonts, pick, themed, useScheme } from '@/constants/theme';
import { adminApi, type CatalogCategory, type CatalogProblem, type PromoCode } from '@/lib/admin';
import { adminErrorText, invalidateAdmin, toast, useAdminQuery } from '@/lib/admin/hooks';
import { checkCallFee, checkNames, checkPriceRange, checkPromo, RULES } from '@/lib/admin/rules';
import { formatRange, t } from '@/lib/i18n';
import { CALL_FEE, catName, CUSTOM_ICONS, problemName, TONES } from '@/constants/categories';

const digits = (s: string) => s.replace(/\D/g, '');
const fmtIn = (s: string) => digits(s).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function Catalog() {
  useScheme();
  const q = useAdminQuery('catalog', () => adminApi.catalog());
  const [adding, setAdding] = useState(false);
  return (
    <AdminPage
      title={t('admin.nav.catalog')}
      subtitle={t('admin.catalog.subtitle')}
      onRefresh={q.reload}
      refreshing={q.refreshing}
      actions={<AButton title={t('admin.catalog.add')} icon={Plus} kind="primary" onPress={() => setAdding(true)} />}
    >
      <NewCategoryDialog visible={adding} onClose={() => setAdding(false)} />
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
  const [removing, setRemoving] = useState(false);
  const [addingProblem, setAddingProblem] = useState(false);
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
      toast(t('admin.catalog.saved', { name: catName(c.id) }));
      invalidateAdmin();
    } catch (e) {
      toast(adminErrorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel
      title={catName(c.id)}
      subtitle={active ? t('admin.catalog.on') : t('admin.catalog.offHint')}
      actions={
        <>
          <AButton size="sm" icon={Trash2} kind="danger" accessibilityLabel={t('admin.catalog.delete')} onPress={() => setRemoving(true)} />
          <CategoryIcon id={c.id} size={32} />
        </>
      }
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
        <AButton title={t('admin.catalog.addProblem')} icon={Plus} kind="ghost" size="sm" style={styles.addProblem} onPress={() => setAddingProblem(true)} />
      </View>
      <NewProblemDialog categoryId={c.id} visible={addingProblem} onClose={() => setAddingProblem(false)} />
      <ReasonDialog
        visible={removing}
        onClose={() => setRemoving(false)}
        title={t('admin.catalog.deleteTitle', { name: catName(c.id) })}
        text={t('admin.catalog.deleteText')}
        confirmLabel={t('admin.catalog.delete')}
        danger
        presets={[t('admin.catalog.preset.notNeeded'), t('admin.catalog.preset.duplicate'), t('admin.catalog.preset.mistake')]}
        onSubmit={async (reason) => {
          try {
            const name = catName(c.id);
            await adminApi.deleteCategory(c.id, reason);
            toast(t('admin.catalog.deleted', { name }));
            invalidateAdmin();
            return null;
          } catch (e) {
            return adminErrorText(e);
          }
        }}
      />
    </Panel>
  );
}

function ProblemRow({ p }: { p: CatalogProblem }) {
  useScheme();
  const { mode } = useAdminLayout();
  const [min, setMin] = useState(p.priceMin == null ? '' : String(p.priceMin));
  const [max, setMax] = useState(p.priceMax == null ? '' : String(p.priceMax));
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
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
      toast(t('admin.catalog.problemSaved', { name: problemName(p.id) }));
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
        <Text style={styles.pName}>{problemName(p.id)}</Text>
        <Text variant="caption">{dirty && error ? error : formatRange(a, b)}</Text>
      </View>
      <TextInput value={fmtIn(min)} onChangeText={(v) => setMin(digits(v).slice(0, 9))} placeholder={t('admin.catalog.min')} placeholderTextColor={colors.muted} keyboardType="number-pad" accessibilityLabel={`${problemName(p.id)} — ${t('admin.catalog.min')}`} style={[styles.input, styles.small, dirty && error ? { borderColor: colors.danger } : null]} />
      <Text variant="caption">—</Text>
      <TextInput value={fmtIn(max)} onChangeText={(v) => setMax(digits(v).slice(0, 9))} placeholder={t('admin.catalog.max')} placeholderTextColor={colors.muted} keyboardType="number-pad" accessibilityLabel={`${problemName(p.id)} — ${t('admin.catalog.max')}`} style={[styles.input, styles.small, dirty && error ? { borderColor: colors.danger } : null]} />
      <AButton size="sm" icon={Save} accessibilityLabel={t('admin.common.save')} kind={dirty ? 'primary' : 'ghost'} disabled={!dirty || !!error} loading={busy} onPress={save} />
      <AButton size="sm" icon={Trash2} accessibilityLabel={t('admin.catalog.deleteProblem')} kind="ghost" onPress={() => setRemoving(true)} />
      <ReasonDialog
        visible={removing}
        onClose={() => setRemoving(false)}
        title={t('admin.catalog.deleteProblemTitle', { name: problemName(p.id) })}
        text={t('admin.catalog.deleteProblemText')}
        confirmLabel={t('admin.catalog.delete')}
        danger
        presets={[t('admin.catalog.preset.notNeeded'), t('admin.catalog.preset.duplicate'), t('admin.catalog.preset.mistake')]}
        onSubmit={async (reason) => {
          try {
            const name = problemName(p.id);
            await adminApi.deleteProblem(p.id, reason);
            toast(t('admin.catalog.problemDeleted', { name }));
            invalidateAdmin();
            return null;
          } catch (e) {
            return adminErrorText(e);
          }
        }}
      />
    </View>
  );
}

/** Nom 3 tilda: o'zbekchasi majburiy, qolganlari bo'sh bo'lsa — o'zbekchasi ko'rinadi */
function NamesFields({ value, onChange, placeholder }: { value: Names; onChange: (v: Names) => void; placeholder: string }) {
  return (
    <>
      <Field label={t('admin.catalog.nameUz')} value={value.uz} onChangeText={(v) => onChange({ ...value, uz: v })} placeholder={placeholder} maxLength={RULES.nameMax} autoFocus />
      <View style={styles.twoCols}>
        <Field style={styles.flex} label={t('admin.catalog.nameRu')} value={value.ru} onChangeText={(v) => onChange({ ...value, ru: v })} placeholder={value.uz} maxLength={RULES.nameMax} />
        <Field style={styles.flex} label={t('admin.catalog.nameEn')} value={value.en} onChangeText={(v) => onChange({ ...value, en: v })} placeholder={value.uz} maxLength={RULES.nameMax} />
      </View>
    </>
  );
}

type Names = { uz: string; ru: string; en: string };
const NO_NAMES: Names = { uz: '', ru: '', en: '' };
const ICON_KEYS = Object.keys(CUSTOM_ICONS);
const TONE_KEYS = Object.keys(TONES);

/** Yangi yo'nalish: nomi, ikonka, rang, chaqiruv narxi — pastda mijoz ilovasidagidek ko'rinishi */
function NewCategoryDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useScheme();
  const [names, setNames] = useState<Names>(NO_NAMES);
  const [icon, setIcon] = useState(ICON_KEYS[0]);
  const [tone, setTone] = useState(TONE_KEYS[0]);
  const [fee, setFee] = useState(String(CALL_FEE));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    setNames(NO_NAMES);
    setIcon(ICON_KEYS[0]);
    setTone(TONE_KEYS[0]);
    setFee(String(CALL_FEE));
    setError(null);
  }, [visible]);
  const tones = (k: string) => pick(TONES[k].day, TONES[k].night);
  const c = tones(tone);
  const Icon = CUSTOM_ICONS[icon];
  const go = async () => {
    const callFee = Number(digits(fee));
    try {
      checkNames(names);
      checkCallFee(callFee);
      setBusy(true);
      await adminApi.createCategory({ names, icon, tone, callFee });
      toast(t('admin.catalog.created', { name: names.uz.trim() }));
      invalidateAdmin();
      onClose();
    } catch (e) {
      setError(adminErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('admin.catalog.addTitle')}
      text={t('admin.catalog.addText')}
      width={560}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton title={t('admin.catalog.add')} icon={Plus} kind="primary" loading={busy} disabled={!names.uz.trim()} onPress={go} />
        </>
      }
    >
      <NamesFields value={names} onChange={(v) => { setNames(v); setError(null); }} placeholder={t('admin.catalog.namePlaceholder')} />
      <Text style={styles.label}>{t('admin.catalog.icon')}</Text>
      <View style={styles.swatches}>
        {ICON_KEYS.map((k) => {
          const I = CUSTOM_ICONS[k];
          const on = k === icon;
          return (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={k} onPress={() => setIcon(k)} style={[styles.iconBtn, { backgroundColor: on ? c.main : c.tint }]}>
              <I size={20} color={on ? c.onMain : c.ink} strokeWidth={2} />
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>{t('admin.catalog.color')}</Text>
      <View style={styles.swatches}>
        {TONE_KEYS.map((k) => {
          const on = k === tone;
          return (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={k} onPress={() => setTone(k)} style={[styles.dot, { backgroundColor: tones(k).main }]}>
              {on ? <Check size={16} color={tones(k).onMain} strokeWidth={3} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.twoCols}>
        <Field style={styles.flex} label={t('admin.catalog.callFee')} value={fmtIn(fee)} onChangeText={(v) => setFee(digits(v).slice(0, 7))} keyboardType="number-pad" />
        <View style={[styles.flex, styles.feeBox]}>
          <Text style={styles.label}>{t('admin.catalog.preview')}</Text>
          <View style={[styles.preview, { backgroundColor: c.tint, borderColor: c.main }]}>
            <Icon size={24} color={c.ink} strokeWidth={2} />
            <Text style={[styles.pName, { color: c.ink }]} numberOfLines={1}>
              {names.uz.trim() || t('admin.catalog.namePlaceholder')}
            </Text>
          </View>
        </View>
      </View>
      {error ? <ErrorText text={error} /> : null}
    </Dialog>
  );
}

/** Yangi muammo turi (narx oralig'i ixtiyoriy — bo'sh bo'lsa "kelishiladi") */
function NewProblemDialog({ categoryId, visible, onClose }: { categoryId: string; visible: boolean; onClose: () => void }) {
  useScheme();
  const [names, setNames] = useState<Names>(NO_NAMES);
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) return;
    setNames(NO_NAMES);
    setMin('');
    setMax('');
    setError(null);
  }, [visible]);
  const toN = (s: string) => (digits(s) ? Number(digits(s)) : null);
  const go = async () => {
    const a = toN(min);
    const b = toN(max);
    try {
      checkNames(names);
      checkPriceRange(a, b);
      setBusy(true);
      await adminApi.createProblem({ categoryId, names, priceMin: a, priceMax: b });
      toast(t('admin.catalog.problemCreated', { name: names.uz.trim() }));
      invalidateAdmin();
      onClose();
    } catch (e) {
      setError(adminErrorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('admin.catalog.addProblemTitle', { name: catName(categoryId) })}
      text={t('admin.catalog.addProblemText')}
      footer={
        <>
          <AButton title={t('common.cancel')} kind="ghost" onPress={onClose} />
          <AButton title={t('admin.catalog.addProblem')} icon={Plus} kind="primary" loading={busy} disabled={!names.uz.trim()} onPress={go} />
        </>
      }
    >
      <NamesFields value={names} onChange={(v) => { setNames(v); setError(null); }} placeholder={t('admin.catalog.problemPlaceholder')} />
      <View style={styles.twoCols}>
        <Field style={styles.flex} label={t('admin.catalog.min')} value={fmtIn(min)} onChangeText={(v) => setMin(digits(v).slice(0, 9))} keyboardType="number-pad" />
        <Field style={styles.flex} label={t('admin.catalog.max')} value={fmtIn(max)} onChangeText={(v) => setMax(digits(v).slice(0, 9))} keyboardType="number-pad" />
      </View>
      <Text variant="caption">{t('admin.catalog.priceHint')}</Text>
      {error ? <ErrorText text={error} /> : null}
    </Dialog>
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
  addProblem: { alignSelf: 'flex-start', marginTop: 4 },
  twoCols: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  preview: { height: 44, borderRadius: 12, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 },
}));

