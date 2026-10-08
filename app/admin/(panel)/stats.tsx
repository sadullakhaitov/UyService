// Statistika: mijoz va usta voronkasi (har bosqichga nechta qurilma yetib keldi — qayerda tashlab ketishyapti)
// va ilovadagi xatolar (ekran, platforma, necha marta). Ma'lumot — app_events / app_errors (lib/track.ts).
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { HBars } from '@/components/admin/Charts';
import { fmtDateTime, fmtNum } from '@/components/admin/format';
import { Badge, Empty, ErrorBox, Panel, Skeleton, Tabs } from '@/components/admin/kit';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { useParamState } from '@/components/admin/useParams';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AppErrorRow, type FunnelRow } from '@/lib/admin';
import { useAdminQuery } from '@/lib/admin/hooks';
import { DEMO } from '@/lib/demo';
import { t } from '@/lib/i18n';

// Raqam tasdiqlash voronkadan tashqarida: oldin kirgan mijoz bu bosqichdan o'tmaydi
const CLIENT_STEPS = ['app_open', 'order_open', 'order_submit', 'order_created', 'order_completed', 'rated'];
const SIGNIN_STEPS = ['phone_open', 'signed_in'];
const MASTER_STEPS = ['master_register_open', 'master_registered', 'master_online'];
const PROBLEMS = ['no_master', 'order_failed', 'report_sent', 'account_deleted'];
const DAYS = ['7', '30'];

export default function Stats() {
  useScheme();
  const { mode } = useAdminLayout();
  const [v, set] = useParamState({ d: '7' });
  const days = v.d === '30' ? 30 : 7;
  const funnel = useAdminQuery(`funnel-${days}`, () => adminApi.funnel(days));
  const errors = useAdminQuery(`errors-${days}`, () => adminApi.errors(days));

  return (
    <AdminPage
      title={t('admin.nav.stats')}
      subtitle={t('admin.stats.subtitle')}
      onRefresh={() => {
        funnel.reload();
        errors.reload();
      }}
      refreshing={funnel.refreshing || errors.refreshing}
      updatedAt={funnel.updatedAt}
    >
      <Tabs value={DAYS.includes(v.d) ? v.d : '7'} onChange={(d) => set({ d })} items={DAYS.map((d) => ({ key: d, label: t('admin.stats.days', { n: d }) }))} />
      {DEMO ? <Badge label={t('admin.stats.demo')} tone="warning" /> : null}
      {funnel.error ? <ErrorBox text={funnel.error} onRetry={funnel.reload} /> : null}
      <View style={[styles.split, mode === 'mobile' && styles.stack]}>
        <Panel title={t('admin.stats.clientFunnel')} subtitle={t('admin.stats.funnelSub')} style={styles.flex}>
          <Funnel rows={funnel.data} steps={CLIENT_STEPS} />
        </Panel>
        <View style={[styles.flex, styles.col]}>
          <Panel title={t('admin.stats.signin')}>
            <Funnel rows={funnel.data} steps={SIGNIN_STEPS} />
          </Panel>
          <Panel title={t('admin.stats.masterFunnel')}>
            <Funnel rows={funnel.data} steps={MASTER_STEPS} />
          </Panel>
          <Panel title={t('admin.stats.problems')}>
            <Funnel rows={funnel.data} steps={PROBLEMS} plain />
          </Panel>
        </View>
      </View>
      <Panel title={t('admin.stats.errors')} subtitle={t('admin.stats.errorsSub')} padded={false}>
        {errors.error ? <ErrorBox text={errors.error} onRetry={errors.reload} /> : null}
        {!errors.data ? (
          <View style={styles.pad}>
            <Skeleton h={80} />
          </View>
        ) : errors.data.length ? (
          errors.data.map((e, i) => <ErrorItem key={`${e.message}-${i}`} e={e} />)
        ) : (
          <Empty text={t('admin.stats.noErrors')} />
        )}
      </Panel>
    </AdminPage>
  );
}

/** Bosqichlar: qurilmalar soni; voronkada — oldingi bosqichdan necha foizi o'tdi */
function Funnel({ rows, steps, plain }: { rows: FunnelRow[] | undefined; steps: string[]; plain?: boolean }) {
  useScheme();
  if (!rows) return <Skeleton h={160} />;
  const by = new Map(rows.map((r) => [r.name, r]));
  if (!steps.some((s) => by.get(s)?.devices)) return <Empty text={t('admin.common.noData')} />;
  return (
    <HBars
      color={plain ? colors.accent : undefined}
      items={steps.map((s, i) => {
        const n = by.get(s)?.devices ?? 0;
        const prev = i > 0 ? (by.get(steps[i - 1])?.devices ?? 0) : 0;
        return {
          key: s,
          label: t(`admin.stats.ev.${s}`),
          value: n,
          sub: !plain && i > 0 && prev > 0 ? `${Math.round((n / prev) * 100)}%` : undefined,
        };
      })}
      format={(n) => fmtNum(n)}
    />
  );
}

function ErrorItem({ e }: { e: AppErrorRow }) {
  useScheme();
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <Pressable accessibilityRole="button" onPress={() => setOpen(!open)} style={styles.err}>
      <View style={styles.errHead}>
        <Text style={[styles.flex, styles.errMsg]} numberOfLines={open ? undefined : 2}>
          {e.message}
        </Text>
        <Badge label={t('admin.stats.times', { n: fmtNum(e.count) })} tone="danger" />
        <Chevron size={18} color={colors.muted} />
      </View>
      <Text variant="caption">
        {[e.screen, e.platform, t('admin.stats.devices', { n: fmtNum(e.devices) }), fmtDateTime(e.lastAt)].filter(Boolean).join(' · ')}
      </Text>
      {open && e.stack ? (
        <Text selectable style={styles.trace}>
          {e.stack}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  col: { gap: 16 },
  split: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  stack: { flexDirection: 'column', alignItems: 'stretch' },
  pad: { padding: 16 },
  err: { paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderTopWidth: 1, borderTopColor: colors.line },
  errHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errMsg: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  trace: { fontFamily: 'monospace', fontSize: 12, color: colors.ink2, marginTop: 6 },
}));
