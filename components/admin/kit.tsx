// Admin panel UI to'plami: ixcham tugmalar, belgilar (badge), panellar, qidiruv, filtrlar, sahifalash,
// bo'sh / xato / yuklanish holatlari. Ilovaning ranglari va shriftlari, lekin kompyuter uchun zichroq.
import type { LucideIcon } from 'lucide-react-native';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, isDark, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { fmtNum } from './format';

const WEB = Platform.OS === 'web';
/** Brauzerda sichqoncha ustiga kelganini bilish (telefonda — doim false) */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  return { hovered, bind: WEB ? { onHoverIn: () => setHovered(true), onHoverOut: () => setHovered(false) } : {} };
}

// ---------- Tugma ----------
type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'dangerSolid';
export function AButton({
  title,
  icon: Icon,
  onPress,
  kind = 'secondary',
  size = 'md',
  disabled,
  loading,
  style,
  accessibilityLabel,
}: {
  title?: string;
  icon?: LucideIcon;
  onPress?: () => void;
  kind?: BtnKind;
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  useScheme();
  const { hovered, bind } = useHover();
  const p = {
    primary: { bg: colors.primary, hover: colors.primaryPressed, fg: colors.onPrimary },
    secondary: { bg: colors.field, hover: colors.line, fg: colors.ink },
    ghost: { bg: 'transparent', hover: colors.field, fg: colors.ink2 },
    danger: { bg: colors.dangerSoft, hover: colors.dangerStrong, fg: colors.danger },
    dangerSolid: { bg: colors.danger, hover: colors.danger, fg: colors.onPrimary },
    success: { bg: colors.successSoft, hover: colors.successStrong, fg: colors.success },
  }[kind];
  const h = size === 'sm' ? 34 : 40;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      {...bind}
      style={({ pressed }) => [
        styles.btn,
        { height: h, paddingHorizontal: title ? (size === 'sm' ? 12 : 16) : 0, width: title ? undefined : h, backgroundColor: hovered && !off ? p.hover : p.bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={p.fg} /> : Icon ? <Icon size={size === 'sm' ? 16 : 18} color={p.fg} strokeWidth={2.2} /> : null}
      {title ? (
        <Text numberOfLines={1} style={[styles.btnText, { color: p.fg, fontSize: size === 'sm' ? 13 : 14 }]}>
          {title}
        </Text>
      ) : null}
    </Pressable>
  );
}

// ---------- Holat belgisi ----------
export type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
function toneColors(tone: Tone) {
  return {
    neutral: { bg: colors.field, fg: colors.ink2, dot: colors.muted },
    primary: { bg: colors.primarySoft, fg: colors.primary, dot: colors.primary },
    success: { bg: colors.successSoft, fg: colors.success, dot: colors.success },
    warning: { bg: colors.accentSoft, fg: colors.accentInk, dot: colors.accent },
    danger: { bg: colors.dangerSoft, fg: colors.danger, dot: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info, dot: colors.info },
  }[tone];
}
export function Badge({ label, tone = 'neutral', icon: Icon, dot }: { label: string; tone?: Tone; icon?: LucideIcon; dot?: boolean }) {
  useScheme();
  const c = toneColors(tone);
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      {dot ? <View style={[styles.badgeDot, { backgroundColor: c.dot }]} /> : null}
      {Icon ? <Icon size={12} color={c.fg} strokeWidth={2.6} /> : null}
      <Text numberOfLines={1} style={[styles.badgeText, { color: c.fg }]}>
        {label}
      </Text>
    </View>
  );
}

/** Menyu va filtrlardagi son */
export function Count({ n, tone = 'neutral' }: { n: number; tone?: Tone }) {
  useScheme();
  if (!n) return null;
  const solid = tone === 'danger' || tone === 'warning';
  const c = toneColors(tone);
  return (
    <View style={[styles.count, { backgroundColor: solid ? c.dot : c.bg }]}>
      <Text style={[styles.countText, { color: solid ? colors.onPrimary : c.fg }]}>{n > 999 ? '999+' : fmtNum(n)}</Text>
    </View>
  );
}

// ---------- Panel ----------
export function Panel({
  title,
  subtitle,
  actions,
  children,
  style,
  padded = true,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  useScheme();
  return (
    <View style={[styles.panel, style]}>
      {title || actions ? (
        <View style={styles.panelHead}>
          <View style={styles.flex}>
            {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
            {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
          </View>
          {actions ? <View style={styles.row8}>{actions}</View> : null}
        </View>
      ) : null}
      <View style={padded ? styles.panelBody : null}>{children}</View>
    </View>
  );
}

/** Kalit — qiymat qatori (tafsilotlar sahifasida) */
export function KV({ label, value, children, mono }: { label: string; value?: ReactNode; children?: ReactNode; mono?: boolean }) {
  useScheme();
  return (
    <View style={styles.kv}>
      <Text variant="small" style={styles.kvLabel}>
        {label}
      </Text>
      <View style={styles.kvValue}>
        {children ?? (
          <Text selectable style={[styles.kvText, mono && styles.mono]}>
            {value ?? '—'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------- Qidiruv ----------
export function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  useScheme();
  // Har harfda so'rov yubormaslik uchun 300 ms kutamiz
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => setText(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const set = (v: string) => {
    setText(v);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(v), 300);
  };
  return (
    <View style={styles.search}>
      <Search size={17} color={colors.muted} strokeWidth={2.2} />
      <TextInput
        value={text}
        onChangeText={set}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        accessibilityLabel={placeholder}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        onSubmitEditing={() => {
          clearTimeout(timer.current);
          onChange(text);
        }}
        style={styles.searchInput}
      />
      {text ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('admin.common.clear')} hitSlop={8} onPress={() => set('')} style={styles.clear}>
          <X size={15} color={colors.ink2} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Matn maydoni (oynalar va formalar uchun) */
export function Field({
  label,
  hint,
  error,
  style,
  ...rest
}: TextInputProps & { label?: string; hint?: string; error?: string | null; style?: StyleProp<ViewStyle> }) {
  useScheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        {...rest}
        onFocus={(e) => {
          setFocus(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocus(false);
          rest.onBlur?.(e);
        }}
        style={[styles.input, rest.multiline && styles.inputMulti, focus && { borderColor: colors.primary }, error ? { borderColor: colors.danger } : null]}
      />
      {error ? (
        <Text variant="caption" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption">{hint}</Text>
      ) : null}
    </View>
  );
}

// ---------- Filtr yorliqlari ----------
export function Tabs<K extends string>({
  value,
  onChange,
  items,
}: {
  value: K;
  onChange: (k: K) => void;
  items: { key: K; label: string; count?: number; tone?: Tone }[];
}) {
  useScheme();
  return (
    <View style={styles.tabs} accessibilityRole="tablist">
      {items.map((it) => (
        <TabItem key={it.key} active={it.key === value} onPress={() => onChange(it.key)} label={it.label} count={it.count} tone={it.tone} />
      ))}
    </View>
  );
}
function TabItem({ active, onPress, label, count, tone }: { active: boolean; onPress: () => void; label: string; count?: number; tone?: Tone }) {
  const { hovered, bind } = useHover();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...bind}
      style={[styles.tab, active ? styles.tabActive : hovered ? { backgroundColor: colors.field } : null]}
    >
      <Text style={[styles.tabText, active && { color: colors.onPrimary }]}>{label}</Text>
      {count ? (
        <View style={[styles.tabCount, active && { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
          <Text style={[styles.tabCountText, active ? { color: colors.onPrimary } : tone ? { color: toneColors(tone).fg } : null]}>{fmtNum(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** Kichik tanlov (chip) — kategoriya, davr */
export function Pill({ label, active, onPress, icon: Icon, color, dot }: { label: string; active: boolean; onPress: () => void; icon?: LucideIcon; color?: string; dot?: string }) {
  useScheme();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...bind}
      style={[styles.pill, active ? { backgroundColor: colors.primarySoft, borderColor: colors.primary } : hovered ? { backgroundColor: colors.field } : null]}
    >
      {Icon ? <Icon size={14} color={color ?? (active ? colors.primary : colors.ink2)} strokeWidth={2.2} /> : null}
      {dot ? <View style={[styles.pillDot, { backgroundColor: dot, opacity: active ? 1 : 0.35 }]} /> : null}
      <Text style={[styles.pillText, active && { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- Sahifalash ----------
export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  useScheme();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return total ? <Text variant="caption" style={styles.pagerInfo}>{t('admin.common.shown', { from: 1, to: total, total: fmtNum(total) })}</Text> : null;
  const from = page * pageSize + 1;
  const to = Math.min(total, from + pageSize - 1);
  return (
    <View style={styles.pager}>
      <Text variant="caption" style={styles.pagerInfo}>
        {t('admin.common.shown', { from: fmtNum(from), to: fmtNum(to), total: fmtNum(total) })}
      </Text>
      <View style={styles.row8}>
        <AButton size="sm" icon={ChevronLeft} accessibilityLabel={t('admin.common.prev')} disabled={page === 0} onPress={() => onPage(page - 1)} />
        <Text style={styles.pagerNum}>
          {page + 1} / {pages}
        </Text>
        <AButton size="sm" icon={ChevronRight} accessibilityLabel={t('admin.common.next')} disabled={page >= pages - 1} onPress={() => onPage(page + 1)} />
      </View>
    </View>
  );
}

// ---------- Holatlar ----------
export function Empty({ text, icon: Icon = Inbox }: { text: string; icon?: LucideIcon }) {
  useScheme();
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Icon size={22} color={colors.muted} strokeWidth={2} />
      </View>
      <Text variant="small" style={styles.center}>
        {text}
      </Text>
    </View>
  );
}

export function ErrorBox({ text, onRetry }: { text: string; onRetry?: () => void }) {
  useScheme();
  return (
    <View style={[styles.state, styles.errorBox]} accessibilityRole="alert">
      <AlertTriangle size={22} color={colors.danger} strokeWidth={2.2} />
      <Text variant="small" style={[styles.center, { color: colors.danger }]}>
        {text}
      </Text>
      {onRetry ? <AButton size="sm" icon={RefreshCw} title={t('admin.common.retry')} onPress={onRetry} /> : null}
    </View>
  );
}

/** Yuklanayotgan joy (skelet) — o'lchami haqiqiy kontentga yaqin, sahifa sakramaydi */
export function Skeleton({ h = 16, w = '100%', r = 8, style }: { h?: number; w?: number | `${number}%`; r?: number; style?: StyleProp<ViewStyle> }) {
  useScheme();
  return <View style={[{ height: h, width: w, borderRadius: r, backgroundColor: colors.track }, style]} />;
}
export function SkeletonRows({ n = 6 }: { n?: number }) {
  return (
    <View style={styles.skRows}>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={styles.skRow}>
          <Skeleton h={36} w={36} r={10} />
          <View style={[styles.flex, { gap: 6 }]}>
            <Skeleton h={12} w="40%" />
            <Skeleton h={10} w="25%" />
          </View>
          <Skeleton h={12} w={80} />
        </View>
      ))}
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  row8: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { textAlign: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, cursor: 'pointer' },
  btnText: { fontFamily: fonts.bold },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, height: 22, borderRadius: 11 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  count: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  countText: { fontFamily: fonts.heavy, fontSize: 11, lineHeight: 14 },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    boxShadow: isDark() ? 'none' : '0 1px 2px rgba(11,42,36,0.04)',
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, minHeight: 52 },
  panelTitle: { fontFamily: fonts.heavy, fontSize: 15, lineHeight: 20, color: colors.ink },
  panelBody: { padding: 18, paddingTop: 12 },
  kv: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  kvLabel: { width: 150, flexShrink: 0 },
  kvValue: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  kvText: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: colors.ink },
  mono: { fontVariant: ['tabular-nums'] },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, borderRadius: 12, backgroundColor: colors.field, paddingHorizontal: 12, minWidth: 200, flexGrow: 1, flexShrink: 1, maxWidth: 420 },
  searchInput: { flex: 1, minWidth: 0, height: '100%', fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  clear: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  field: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  inputMulti: { minHeight: 96, paddingTop: 10, textAlignVertical: 'top' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 10, cursor: 'pointer' },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  tabCount: { minWidth: 20, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  tabCountText: { fontFamily: fonts.heavy, fontSize: 11, lineHeight: 14, color: colors.ink2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 11, borderRadius: 16, borderWidth: 1, borderColor: colors.line, cursor: 'pointer' },
  pillDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.markerRing },
  pillText: { fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16, color: colors.ink2 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  pagerInfo: { paddingVertical: 4 },
  pagerNum: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, minWidth: 48, textAlign: 'center', fontVariant: ['tabular-nums'] },
  state: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 36, paddingHorizontal: 16 },
  stateIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  errorBox: { backgroundColor: colors.dangerSoft, borderRadius: 14 },
  skRows: { gap: 2 },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
}));
