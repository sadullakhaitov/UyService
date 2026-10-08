// Admin panel qobig'i: chapda menyu (kompyuterda doim ko'rinadi, o'rta ekranda — faqat ikonkalar,
// telefonda — chapdan chiqadigan menyu), sahifa sarlavhasi, xabarlar (toast).
import { router, usePathname, type Href } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';
import {
  ArrowLeft,
  ChartNoAxesColumn,
  CheckCircle2,
  ClipboardList,
  Flag,
  History,
  Info,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  MessagesSquare,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Tags,
  Users,
  Wallet,
  Wrench,
  XCircle,
} from 'lucide-react-native';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '@/components/ui/Logo';
import { Text } from '@/components/ui/Text';
import { colors, fonts, getScheme, isDark, themed, useScheme } from '@/constants/theme';
import { adminApi } from '@/lib/admin';
import { useAdminQuery, useToasts } from '@/lib/admin/hooks';
import { DEMO } from '@/lib/demo';
import { t } from '@/lib/i18n';
import { useUser } from '@/store';
import { fmtAgo, fmtPhone } from './format';
import { AButton, Badge, Count, useHover, type Tone } from './kit';

type NavItem = { key: string; href: string; icon: LucideIcon; badge?: 'pending' | 'support' | 'searching' };
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'main',
    items: [
      { key: 'dashboard', href: '/admin', icon: LayoutDashboard },
      { key: 'verification', href: '/admin/verification', icon: ShieldCheck, badge: 'pending' },
      { key: 'orders', href: '/admin/orders', icon: ClipboardList, badge: 'searching' },
      { key: 'map', href: '/admin/map', icon: MapIcon },
    ],
  },
  {
    title: 'people',
    items: [
      { key: 'masters', href: '/admin/masters', icon: Wrench },
      { key: 'users', href: '/admin/users', icon: Users },
      { key: 'reviews', href: '/admin/reviews', icon: Star },
      { key: 'reports', href: '/admin/reports', icon: Flag },
      { key: 'support', href: '/admin/support', icon: MessagesSquare, badge: 'support' },
    ],
  },
  {
    title: 'system',
    items: [
      { key: 'finance', href: '/admin/finance', icon: Wallet },
      { key: 'stats', href: '/admin/stats', icon: ChartNoAxesColumn },
      { key: 'catalog', href: '/admin/catalog', icon: Tags },
      { key: 'log', href: '/admin/log', icon: History },
      { key: 'settings', href: '/admin/settings', icon: Settings },
    ],
  },
];
const BADGE_TONE: Record<NonNullable<NavItem['badge']>, Tone> = { pending: 'warning', support: 'danger', searching: 'info' };

/** Kenglik: ≥ 1180 — to'liq menyu, 900–1180 — ikonkalar, < 900 — chiqadigan menyu */
export function useAdminLayout() {
  const { width } = useWindowDimensions();
  return { mode: width >= 1180 ? ('full' as const) : width >= 900 ? ('rail' as const) : ('mobile' as const), width };
}

const DrawerCtx = createContext<() => void>(() => {});

export function AdminShell({ me, onLogout, children }: { me: { phone: string; name: string | null }; onLogout: () => void; children: ReactNode }) {
  useScheme();
  const { mode } = useAdminLayout();
  const [drawer, setDrawer] = useState(false);
  // Menyudagi sonlar (tekshiruv navbati, javob kutayotgan murojaatlar, qidirilayotgan buyurtmalar) — har 30 s
  const live = useAdminQuery('nav-badges', () => adminApi.stats(1), { refreshMs: 30_000 });
  const counts = {
    pending: live.data?.live.pending ?? 0,
    support: live.data?.live.supportWaiting ?? 0,
    searching: live.data?.live.searching ?? 0,
  };
  const nav = (compact: boolean, close?: () => void) => <Nav compact={compact} counts={counts} me={me} onLogout={onLogout} onNavigate={close} />;
  return (
    <DrawerCtx.Provider value={() => setDrawer(true)}>
      <View style={styles.root}>
        {mode !== 'mobile' ? <View style={[styles.side, mode === 'rail' && styles.sideRail]}>{nav(mode === 'rail')}</View> : null}
        <View style={styles.main}>{children}</View>
        {mode === 'mobile' ? (
          <Modal visible={drawer} transparent animationType="fade" onRequestClose={() => setDrawer(false)}>
            <View style={styles.drawerWrap}>
              <Pressable style={styles.drawerBackdrop} onPress={() => setDrawer(false)} accessibilityRole="button" accessibilityLabel={t('common.close')} />
              <View style={styles.drawer}>{nav(false, () => setDrawer(false))}</View>
            </View>
          </Modal>
        ) : null}
        <Toasts />
      </View>
    </DrawerCtx.Provider>
  );
}

function Nav({
  compact,
  counts,
  me,
  onLogout,
  onNavigate,
}: {
  compact: boolean;
  counts: Record<'pending' | 'support' | 'searching', number>;
  me: { phone: string; name: string | null };
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  useScheme();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const setTheme = useUser((s) => s.setThemeMode);
  const isActive = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`));
  return (
    <View style={[styles.nav, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 12 }]}>
      <View style={[styles.brand, compact && styles.center]}>
        <LogoMark size={30} />
        {!compact ? (
          <View>
            <Text style={styles.brandName}>UyService</Text>
            <Text style={styles.brandSub}>{t('admin.title')}</Text>
          </View>
        ) : null}
      </View>
      {DEMO && !compact ? (
        <View style={styles.demo}>
          <Badge label={t('admin.demoBadge')} tone="warning" />
        </View>
      ) : null}
      <ScrollView style={styles.flex} contentContainerStyle={styles.navList} showsVerticalScrollIndicator={false}>
        {GROUPS.map((g) => (
          <View key={g.title} style={styles.group}>
            {!compact ? <Text style={styles.groupTitle}>{t(`admin.navGroup.${g.title}`)}</Text> : <View style={styles.groupSep} />}
            {g.items.map((it) => (
              <NavRow
                key={it.key}
                item={it}
                compact={compact}
                active={isActive(it.href)}
                count={it.badge ? counts[it.badge] : 0}
                onPress={() => {
                  onNavigate?.();
                  router.navigate(it.href as Href);
                }}
              />
            ))}
          </View>
        ))}
      </ScrollView>
      <View style={[styles.navFoot, compact && styles.center]}>
        {!compact ? (
          <View style={styles.me}>
            <Text style={styles.meName} numberOfLines={1}>
              {me.name || t('admin.title')}
            </Text>
            <Text style={styles.mePhone} numberOfLines={1}>
              {fmtPhone(me.phone)}
            </Text>
          </View>
        ) : null}
        <View style={[styles.footBtns, compact && { flexDirection: 'column' }]}>
          <AButton
            size="sm"
            kind="ghost"
            icon={getScheme() === 'dark' ? Sun : Moon}
            accessibilityLabel={t('admin.settings.theme')}
            onPress={() => setTheme(isDark() ? 'light' : 'dark')}
          />
          <AButton size="sm" kind="ghost" icon={LogOut} accessibilityLabel={t('admin.logout')} onPress={onLogout} />
        </View>
      </View>
    </View>
  );
}

function NavRow({ item, compact, active, count, onPress }: { item: NavItem; compact: boolean; active: boolean; count: number; onPress: () => void }) {
  useScheme();
  const { hovered, bind } = useHover();
  const Icon = item.icon;
  const label = t(`admin.nav.${item.key}`);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={count ? `${label}, ${count}` : label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...bind}
      style={[styles.navRow, compact && styles.navRowCompact, active ? styles.navActive : hovered ? { backgroundColor: colors.field } : null]}
    >
      <Icon size={19} color={active ? colors.primary : colors.ink2} strokeWidth={active ? 2.4 : 2} />
      {!compact ? (
        <Text numberOfLines={1} style={[styles.navText, active && { color: colors.primary }]}>
          {label}
        </Text>
      ) : null}
      {count ? (
        compact ? (
          <View style={[styles.navDot, { backgroundColor: BADGE_TONE[item.badge!] === 'danger' ? colors.danger : colors.accent }]} />
        ) : (
          <Count n={count} tone={BADGE_TONE[item.badge!]} />
        )
      ) : null}
    </Pressable>
  );
}

/** Sahifa: sarlavha, amallar, yangilash; telefonda — menyu tugmasi */
export function AdminPage({
  title,
  subtitle,
  actions,
  back,
  onRefresh,
  refreshing,
  updatedAt,
  children,
  scroll = true,
  maxWidth = 1320,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Orqaga (tafsilotlar sahifasi): tarix bo'lmasa — shu manzilga */
  back?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  updatedAt?: number | null;
  children: ReactNode;
  scroll?: boolean;
  maxWidth?: number;
}) {
  useScheme();
  const { mode } = useAdminLayout();
  const openDrawer = useContext(DrawerCtx);
  // Brauzer yorlig'i: "Buyurtmalar · UyService Admin"
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.title = `${title} · UyService Admin`;
  }, [title]);
  const insets = useSafeAreaInsets();
  const pad = mode === 'mobile' ? 16 : 28;
  const head = (
    <View style={[styles.head, { paddingHorizontal: pad, paddingTop: (mode === 'mobile' ? insets.top : 0) + (mode === 'mobile' ? 12 : 24) }]}>
      <View style={[styles.headInner, { maxWidth }]}>
        {mode === 'mobile' && !back ? <AButton kind="secondary" icon={Menu} accessibilityLabel={t('admin.menu')} onPress={openDrawer} /> : null}
        {back ? (
          <AButton
            kind="secondary"
            icon={ArrowLeft}
            accessibilityLabel={t('common.back')}
            onPress={() => (router.canGoBack() ? router.back() : router.replace(back as Href))}
          />
        ) : null}
        <View style={styles.flex}>
          <Text style={[styles.title, mode === 'mobile' && { fontSize: 20, lineHeight: 26 }]} numberOfLines={2} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onRefresh ? (
          <View style={styles.refresh}>
            {updatedAt && mode !== 'mobile' ? <Text variant="caption">{t('admin.updated', { ago: fmtAgo(updatedAt) })}</Text> : null}
            <AButton kind="ghost" icon={RefreshCw} loading={refreshing} accessibilityLabel={t('admin.refresh')} onPress={onRefresh} />
          </View>
        ) : null}
        {actions && mode !== 'mobile' ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {actions && mode === 'mobile' ? <View style={[styles.actions, styles.actionsMobile]}>{actions}</View> : null}
    </View>
  );
  const body = <View style={[styles.body, { paddingHorizontal: pad, maxWidth: maxWidth + pad * 2 }, !scroll && { flex: 1 }]}>{children}</View>;
  return (
    <View style={styles.page}>
      {head}
      {scroll ? (
        <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.flex, { paddingBottom: insets.bottom + 12 }]}>{body}</View>
      )}
    </View>
  );
}

function Toasts() {
  useScheme();
  const list = useToasts((s) => s.list);
  const insets = useSafeAreaInsets();
  if (!list.length) return null;
  return (
    <View pointerEvents="box-none" style={[styles.toasts, { bottom: insets.bottom + 20 }]}>
      {list.map((x) => {
        const Icon = x.kind === 'error' ? XCircle : x.kind === 'info' ? Info : CheckCircle2;
        return (
          <View key={x.id} style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icon size={18} color={x.kind === 'error' ? colors.danger : x.kind === 'info' ? colors.info : colors.success} strokeWidth={2.4} />
            <Text style={styles.toastText}>{x.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  side: { width: 252, borderRightWidth: 1, borderRightColor: colors.line, backgroundColor: colors.surface },
  sideRail: { width: 76 },
  main: { flex: 1, minWidth: 0 },
  nav: { flex: 1, paddingHorizontal: 12, gap: 8 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, paddingBottom: 6 },
  brandName: { fontFamily: fonts.logo, fontSize: 16, lineHeight: 21, color: colors.ink },
  brandSub: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 15, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  demo: { paddingHorizontal: 6 },
  navList: { gap: 14, paddingVertical: 6 },
  group: { gap: 2 },
  groupTitle: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 15, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.7, paddingHorizontal: 10, paddingBottom: 4 },
  groupSep: { height: 1, backgroundColor: colors.line, marginHorizontal: 8, marginBottom: 6 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 11, height: 40, paddingHorizontal: 10, borderRadius: 11, cursor: 'pointer' },
  navRowCompact: { justifyContent: 'center', paddingHorizontal: 0 },
  navActive: { backgroundColor: colors.primarySoft },
  navText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  navDot: { position: 'absolute', top: 8, right: 14, width: 8, height: 8, borderRadius: 4 },
  navFoot: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  me: { flex: 1, minWidth: 0, paddingLeft: 6 },
  meName: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink },
  mePhone: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.ink2 },
  footBtns: { flexDirection: 'row', gap: 4 },
  drawerWrap: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.backdrop },
  drawer: { width: 280, maxWidth: '85%', backgroundColor: colors.surface, boxShadow: '0 0 40px rgba(0,0,0,0.25)' },
  page: { flex: 1, minWidth: 0 },
  head: { paddingBottom: 16, alignItems: 'center' },
  headInner: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontFamily: fonts.heavy, fontSize: 26, lineHeight: 32, color: colors.ink },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  actionsMobile: { width: '100%', marginTop: 12 },
  body: { width: '100%', alignSelf: 'center', gap: 18 },
  toasts: { position: 'absolute', right: 20, left: 20, alignItems: 'flex-end', gap: 8 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: isDark() ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(11,42,36,0.16)',
  },
  toastText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
}));
