// Jonli xarita: butun O'zbekiston bo'ylab onlayn ustalar (bo'sh / band) va ochiq buyurtmalar
// (qidirilmoqda / jarayonda / rejalashtirilgan). Shahar bo'yicha tez o'tish, nuqta bosilsa — qisqa ma'lumot va havola. Har 15 s yangilanadi.
import { router, type Href } from 'expo-router';
import { ExternalLink, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { CategoryIcon } from '@/components/admin/CategoryIcon';
import { fmtNum } from '@/components/admin/format';
import { AButton, Badge, ErrorBox, Pill } from '@/components/admin/kit';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { MapBase } from '@/components/map/MapBase';
import type { MapPoint } from '@/components/map/types';
import { Text } from '@/components/ui/Text';
import { colors, fonts, isDark, themed, useScheme } from '@/constants/theme';
import { ACTIVE_STATUSES, adminApi, type LivePoint } from '@/lib/admin';
import { useAdminQuery } from '@/lib/admin/hooks';
import type { LatLng } from '@/lib/geo';
import { t } from '@/lib/i18n';

type Layer = 'free' | 'busy' | 'searching' | 'active' | 'scheduled';
const LAYERS: Layer[] = ['free', 'busy', 'searching', 'active', 'scheduled'];

const CITIES: { key: string; c?: LatLng; r?: number }[] = [
  { key: 'all' },
  { key: 'tashkent', c: { latitude: 41.3111, longitude: 69.2797 }, r: 0.14 },
  { key: 'samarkand', c: { latitude: 39.6542, longitude: 66.9597 }, r: 0.08 },
  { key: 'bukhara', c: { latitude: 39.7747, longitude: 64.4286 }, r: 0.07 },
  { key: 'namangan', c: { latitude: 40.9983, longitude: 71.6726 }, r: 0.07 },
  { key: 'andijan', c: { latitude: 40.7821, longitude: 72.3442 }, r: 0.07 },
  { key: 'fergana', c: { latitude: 40.3842, longitude: 71.7843 }, r: 0.07 },
  { key: 'karshi', c: { latitude: 38.8606, longitude: 65.7891 }, r: 0.06 },
  { key: 'nukus', c: { latitude: 42.46, longitude: 59.61 }, r: 0.06 },
];
const UZ_BOUNDS: LatLng[] = [
  { latitude: 37.2, longitude: 56.0 },
  { latitude: 45.6, longitude: 73.2 },
];

const layerOf = (p: LivePoint): Layer =>
  p.kind === 'master' ? (p.status === 'busy' ? 'busy' : 'free') : p.status === 'searching' ? 'searching' : p.status === 'scheduled' ? 'scheduled' : 'active';

export default function LiveMap() {
  useScheme();
  const { mode } = useAdminLayout();
  const q = useAdminQuery('live', () => adminApi.live(), { refreshMs: 15_000 });
  const [on, setOn] = useState<Record<Layer, boolean>>({ free: true, busy: true, searching: true, active: true, scheduled: true });
  const [city, setCity] = useState('all');
  const [sel, setSel] = useState<LivePoint | null>(null);
  const color: Record<Layer, string> = {
    free: colors.success,
    busy: colors.accent,
    searching: colors.info,
    active: colors.primary,
    scheduled: colors.muted,
  };
  const counts = useMemo(() => {
    const c: Record<Layer, number> = { free: 0, busy: 0, searching: 0, active: 0, scheduled: 0 };
    for (const p of q.data ?? []) c[layerOf(p)]++;
    return c;
  }, [q.data]);
  const visible = (q.data ?? []).filter((p) => on[layerOf(p)]);
  const points: MapPoint[] = visible.map((p) => ({ id: p.id, location: p.location, color: color[layerOf(p)], size: p.kind === 'order' ? 18 : 13 }));
  const cur = CITIES.find((c) => c.key === city) ?? CITIES[0];
  const fitTo = cur.c && cur.r ? [{ latitude: cur.c.latitude - cur.r, longitude: cur.c.longitude - cur.r * 1.3 }, { latitude: cur.c.latitude + cur.r, longitude: cur.c.longitude + cur.r * 1.3 }] : UZ_BOUNDS;

  return (
    <AdminPage title={t('admin.nav.map')} subtitle={t('admin.map.subtitle')} onRefresh={q.reload} refreshing={q.refreshing} updatedAt={q.updatedAt} scroll={false}>
      {q.error && !q.data ? <ErrorBox text={q.error} onRetry={q.reload} /> : null}
      <View style={styles.pills}>
        {CITIES.map((c) => (
          <Pill key={c.key} label={t(`admin.map.city.${c.key}`)} active={city === c.key} onPress={() => setCity(c.key)} />
        ))}
      </View>
      <View style={styles.mapBox}>
        <MapBase center={{ latitude: 41.3111, longitude: 69.2797 }} zoom={6} minZoom={5} fitTo={fitTo} points={points} onPointPress={(id) => setSel(visible.find((p) => p.id === id) ?? null)} fullBleed />
        {/* Belgilar izohi + qatlamlarni yoqish/o'chirish */}
        <View style={[styles.legend, mode === 'mobile' && styles.legendMobile]}>
          {LAYERS.map((l) => (
            <Pill
              key={l}
              label={`${t(`admin.map.layer.${l}`)} · ${fmtNum(counts[l])}`}
              active={on[l]}
              onPress={() => setOn((s) => ({ ...s, [l]: !s[l] }))}
              dot={color[l]}
            />
          ))}
        </View>
        {sel ? (
          <View style={[styles.card, mode === 'mobile' && styles.cardMobile]}>
            <View style={styles.cardTop}>
              {sel.categoryId ? <CategoryIcon id={sel.categoryId} size={30} /> : null}
              <View style={styles.flex}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {sel.kind === 'master' ? sel.label : sel.categoryId ? t(`categories.${sel.categoryId}`) : t('admin.map.order')}
                </Text>
                <Text variant="caption" numberOfLines={2}>
                  {sel.kind === 'master' ? t('admin.map.master') : sel.label}
                </Text>
              </View>
              <AButton size="sm" kind="ghost" icon={X} accessibilityLabel={t('common.close')} onPress={() => setSel(null)} />
            </View>
            <Badge
              label={sel.kind === 'master' ? t(`admin.map.layer.${layerOf(sel)}`) : t(`admin.status.${sel.status}`)}
              tone={layerOf(sel) === 'free' ? 'success' : layerOf(sel) === 'busy' ? 'warning' : layerOf(sel) === 'searching' ? 'info' : ACTIVE_STATUSES.includes(sel.status as never) ? 'primary' : 'neutral'}
              dot
            />
            <AButton
              title={t('admin.map.open')}
              icon={ExternalLink}
              kind="primary"
              size="sm"
              onPress={() => router.push((sel.kind === 'master' ? `/admin/masters/${sel.id}` : `/admin/orders/${sel.id}`) as Href)}
            />
          </View>
        ) : null}
      </View>
      <Text variant="caption">{t('admin.map.note')}</Text>
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mapBox: { flex: 1, minHeight: 420, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.map },
  legend: {
    position: 'absolute',
    top: 12,
    left: 12,
    maxWidth: 360,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.glassSolid,
    boxShadow: isDark() ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(11,42,36,0.12)',
  },
  legendMobile: { right: 12, maxWidth: undefined },
  card: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 300,
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: isDark() ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(11,42,36,0.16)',
  },
  cardMobile: { top: undefined, bottom: 12, left: 12, width: undefined },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { fontFamily: fonts.heavy, fontSize: 15, lineHeight: 20, color: colors.ink },
}));
