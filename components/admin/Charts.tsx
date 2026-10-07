// Admin grafiklari (dataviz qoidalari): bitta seriya — bitta rang, ingichka belgilar (ustun ≤ 24 px, uchi 4 px yumaloq),
// chiziq 2 px, maydon 10% tus, to'r chiziqlari ingichka va xira, matn — matn ranglarida (seriya rangida emas).
// Sichqoncha yoki klaviatura fokusi — qiymat oynachasi (tooltip). Har grafikda "Jadval" ko'rinishi ham bor (dashboard'da).
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Text } from '@/components/ui/Text';
import { colors, fonts, isDark, themed, useScheme } from '@/constants/theme';
import { fmtAxis } from './format';

/** label — oynachada (to'liq), axis — o'qda (qisqa) */
export type Point = { key: string; label: string; axis?: string; value: number; sub?: string };

/** "Chiroyli" o'q bo'linmalari: 0, 25, 50, 75, 100 ... */
function niceTicks(max: number, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(v);
  return out;
}

const AXIS_W = 44;
/** O'q yozuvi: har `every`-chisi va oxirgisi; oxirgisiga juda yaqin bo'lganlari tashlanadi (ustma-ust tushmasin) */
const showTick = (i: number, n: number, every: number) => i === n - 1 || (i % every === 0 && n - 1 - i >= Math.ceil(every * 0.75));
const X_LABEL_H = 22;

function useWidth() {
  const [w, setW] = useState(0);
  return { w, onLayout: (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width) };
}

function Tooltip({ x, width, title, value, sub }: { x: number; width: number; title: string; value: string; sub?: string }) {
  useScheme();
  const W = 168;
  const left = Math.max(0, Math.min(width - W, x - W / 2));
  return (
    <View pointerEvents="none" style={[styles.tip, { left, width: W }]}>
      <Text style={styles.tipValue}>{value}</Text>
      <Text style={styles.tipTitle} numberOfLines={1}>
        {title}
      </Text>
      {sub ? (
        <Text style={styles.tipSub} numberOfLines={2}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function Grid({ ticks, max, h, format }: { ticks: number[]; max: number; h: number; format: (n: number) => string }) {
  return (
    <>
      {ticks.map((v) => {
        const y = h - (v / max) * h;
        return (
          <View key={v} pointerEvents="none" style={[styles.gridRow, { top: y }]}>
            <Text style={styles.axisText}>{format(v)}</Text>
            <View style={styles.gridLine} />
          </View>
        );
      })}
    </>
  );
}

/** Kunlar bo'yicha ustunlar (masalan, buyurtmalar soni) */
export function ColumnChart({
  data,
  height = 200,
  color,
  format = (n) => String(n),
  axisFormat = fmtAxis,
}: {
  data: Point[];
  height?: number;
  color?: string;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
}) {
  useScheme();
  const { w, onLayout } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, w - AXIS_W);
  const slot = data.length ? plotW / data.length : 0;
  const barW = Math.max(2, Math.min(24, slot - 2));
  // X o'qi yozuvlari bir-birini bosmasin: ~56 px ga bitta
  const every = Math.max(1, Math.ceil(46 / Math.max(1, slot)));
  const fill = color ?? colors.primary;
  return (
    <View onLayout={onLayout} style={{ height: height + X_LABEL_H }}>
      {w > 0 ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height }}>
            <Grid ticks={ticks} max={top} h={height} format={axisFormat} />
          </View>
          <View style={[styles.plot, { left: AXIS_W, height }]}>
            {data.map((d, i) => {
              const h = (d.value / top) * height;
              const active = hover === i;
              return (
                <Pressable
                  key={d.key}
                  accessibilityLabel={`${d.label}: ${format(d.value)}`}
                  onHoverIn={() => setHover(i)}
                  onHoverOut={() => setHover((x) => (x === i ? null : x))}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover((x) => (x === i ? null : x))}
                  onPress={() => setHover((x) => (x === i ? null : i))}
                  style={[styles.slot, { width: slot }]}
                >
                  {active ? <View style={styles.slotHover} /> : null}
                  <View
                    style={{
                      width: barW,
                      height: d.value > 0 ? Math.max(2, h) : 0,
                      backgroundColor: fill,
                      borderTopLeftRadius: Math.min(4, barW / 2),
                      borderTopRightRadius: Math.min(4, barW / 2),
                      opacity: hover == null || active ? 1 : 0.55,
                    }}
                  />
                </Pressable>
              );
            })}
          </View>
          <View style={[styles.xAxis, { left: AXIS_W, top: height + 4 }]}>
            {data.map((d, i) =>
              showTick(i, data.length, every) ? (
                <Text key={d.key} numberOfLines={1} style={[styles.xLabel, { left: i * slot + slot / 2 - 30 }]}>
                  {d.axis ?? d.label}
                </Text>
              ) : null,
            )}
          </View>
          {hover != null && data[hover] ? (
            <Tooltip x={AXIS_W + hover * slot + slot / 2} width={w} title={data[hover].label} value={format(data[hover].value)} sub={data[hover].sub} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** Vaqt bo'yicha chiziq + yengil maydon (masalan, daromad). Sichqoncha — vertikal chiziq eng yaqin kunga yopishadi */
export function AreaChart({
  data,
  height = 200,
  color,
  format = (n) => String(n),
  axisFormat = fmtAxis,
}: {
  data: Point[];
  height?: number;
  color?: string;
  format?: (n: number) => string;
  axisFormat?: (n: number) => string;
}) {
  useScheme();
  const { w, onLayout } = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const plotW = Math.max(0, w - AXIS_W - 8);
  const stroke = color ?? colors.primary;
  const pts = useMemo(
    () => data.map((d, i) => ({ x: data.length > 1 ? (i / (data.length - 1)) * plotW : plotW / 2, y: height - (d.value / top) * height })),
    [data, plotW, height, top],
  );
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = pts.length ? `${line} L${pts[pts.length - 1].x.toFixed(1)},${height} L${pts[0].x.toFixed(1)},${height} Z` : '';
  const slot = data.length ? plotW / data.length : 0;
  const every = Math.max(1, Math.ceil(46 / Math.max(1, slot)));
  const last = pts[pts.length - 1];
  return (
    <View onLayout={onLayout} style={{ height: height + X_LABEL_H }}>
      {w > 0 ? (
        <>
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height }}>
            <Grid ticks={ticks} max={top} h={height} format={axisFormat} />
          </View>
          <View style={[styles.plot, { left: AXIS_W, height, width: plotW }]} pointerEvents="box-none">
            <Svg width={plotW} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
              {area ? <Path d={area} fill={stroke} fillOpacity={0.1} /> : null}
              {line ? <Path d={line} stroke={stroke} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
              {hover != null && pts[hover] ? (
                <>
                  <Path d={`M${pts[hover].x},0 L${pts[hover].x},${height}`} stroke={colors.ink2} strokeOpacity={0.35} strokeWidth={1} />
                  <Circle cx={pts[hover].x} cy={pts[hover].y} r={5} fill={stroke} stroke={colors.surface} strokeWidth={2} />
                </>
              ) : last ? (
                <Circle cx={last.x} cy={last.y} r={4} fill={stroke} stroke={colors.surface} strokeWidth={2} />
              ) : null}
            </Svg>
            {/* Ko'rinmas ustunlar — sichqoncha / fokus uchun nishon (chiziqdan kattaroq) */}
            <View style={styles.hitRow}>
              {data.map((d, i) => (
                <Pressable
                  key={d.key}
                  accessibilityLabel={`${d.label}: ${format(d.value)}`}
                  onHoverIn={() => setHover(i)}
                  onHoverOut={() => setHover((x) => (x === i ? null : x))}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover((x) => (x === i ? null : x))}
                  onPress={() => setHover((x) => (x === i ? null : i))}
                  style={{ flex: 1, height }}
                />
              ))}
            </View>
          </View>
          <View style={[styles.xAxis, { left: AXIS_W, top: height + 4 }]}>
            {data.map((d, i) =>
              showTick(i, data.length, every) ? (
                <Text key={d.key} numberOfLines={1} style={[styles.xLabel, { left: pts[i].x - 30 }]}>
                  {d.axis ?? d.label}
                </Text>
              ) : null,
            )}
          </View>
          {hover != null && data[hover] ? (
            <Tooltip x={AXIS_W + pts[hover].x} width={w} title={data[hover].label} value={format(data[hover].value)} sub={data[hover].sub} />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

/** Gorizontal ustunlar (kategoriyalar): nomi chapda, qiymati ustun uchida */
export function HBars({ items, format = (n) => String(n), color }: { items: { key: string; label: string; icon?: ReactNode; value: number; sub?: string }[]; format?: (n: number) => string; color?: string }) {
  useScheme();
  const max = Math.max(1, ...items.map((i) => i.value));
  const fill = color ?? colors.primary;
  return (
    <View style={styles.hbars}>
      {items.map((it) => (
        <View key={it.key} style={styles.hbar} accessible accessibilityLabel={`${it.label}: ${format(it.value)}`}>
          <View style={styles.hbarLabel}>
            {it.icon}
            <Text numberOfLines={1} style={styles.hbarText}>
              {it.label}
            </Text>
          </View>
          <View style={styles.hbarTrack}>
            <View style={{ width: `${Math.max(1, (it.value / max) * 100)}%`, height: 14, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: fill }} />
            <Text style={styles.hbarValue} numberOfLines={1}>
              {format(it.value)}
              {it.sub ? <Text style={styles.hbarSub}>{`  ${it.sub}`}</Text> : null}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** KPI kartochkasidagi kichik trend: xira chiziq, oxirgi nuqta — asosiy rangda */
export function Sparkline({ values, width = 96, height = 30 }: { values: number[]; width?: number; height?: number }) {
  useScheme();
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const min = Math.min(...values);
  const span = Math.max(1, max - min);
  const p = values.map((v, i) => ({ x: (i / (values.length - 1)) * (width - 6) + 3, y: height - 3 - ((v - min) / span) * (height - 6) }));
  const d = p.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
  const last = p[p.length - 1];
  return (
    <Svg width={width} height={height} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d={d} stroke={colors.muted} strokeOpacity={0.7} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={last.x} cy={last.y} r={3.5} fill={colors.primary} stroke={colors.surface} strokeWidth={1.5} />
    </Svg>
  );
}

const styles = themed(() => ({
  plot: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'flex-end' },
  slot: { height: '100%', alignItems: 'center', justifyContent: 'flex-end', cursor: 'pointer' },
  slotHover: { position: 'absolute', left: 1, right: 1, top: 0, bottom: 0, borderRadius: 6, backgroundColor: colors.field, opacity: 0.7 },
  hitRow: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row' },
  gridRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', height: 0 },
  gridLine: { flex: 1, height: 1, backgroundColor: colors.line },
  axisText: { width: AXIS_W - 6, marginRight: 6, textAlign: 'right', fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.muted, fontVariant: ['tabular-nums'], marginTop: -1 },
  xAxis: { position: 'absolute', right: 0, height: X_LABEL_H },
  xLabel: { position: 'absolute', width: 60, textAlign: 'center', fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.muted },
  tip: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    boxShadow: isDark() ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(11,42,36,0.14)',
    gap: 1,
  },
  tipValue: { fontFamily: fonts.heavy, fontSize: 15, lineHeight: 20, color: colors.ink },
  tipTitle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.ink2 },
  tipSub: { fontFamily: fonts.medium, fontSize: 11.5, lineHeight: 15, color: colors.muted },
  hbars: { gap: 12 },
  hbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hbarLabel: { width: 150, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hbarText: { flex: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink },
  hbarTrack: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  hbarValue: { flexShrink: 0, fontFamily: fonts.heavy, fontSize: 12.5, lineHeight: 17, color: colors.ink, fontVariant: ['tabular-nums'] },
  hbarSub: { fontFamily: fonts.medium, color: colors.muted },
}));
