// Ma'lumotlar jadvali: kompyuterda — ustunlar, tor ekranda (telefon) — kartochkalar.
// Qator bosilsa — tafsilotlar. Qayta yuklanganda eski qatorlar xiralashib turadi (sahifa sakramaydi).
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { Empty, SkeletonRows, useHover } from './kit';

export type Column<T> = {
  key: string;
  title: string;
  /** Moslashuvchan kenglik (flex) yoki qat'iy kenglik (px) */
  flex?: number;
  width?: number;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => ReactNode;
};

/** Shundan tor bo'lsa — kartochkalar */
const CARD_BELOW = 720;

export function DataTable<T>({
  columns,
  rows,
  keyOf,
  onRowPress,
  loading,
  refreshing,
  emptyText,
  card,
  minWidth = 760,
}: {
  columns: Column<T>[];
  rows: T[] | undefined;
  keyOf: (row: T) => string;
  onRowPress?: (row: T) => void;
  loading?: boolean;
  refreshing?: boolean;
  emptyText: string;
  /** Tor ekrandagi ko'rinish */
  card: (row: T) => ReactNode;
  minWidth?: number;
}) {
  useScheme();
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const narrow = width > 0 && width < CARD_BELOW;
  // Ustunlar sig'masa — gorizontal aylantirish (moslashuvchan ustunga kamida ~110 px)
  const need = Math.max(minWidth, columns.reduce((sum, c) => sum + (c.width ?? (c.flex ?? 1) * 110), 0) + 12 * (columns.length - 1) + 36);

  let body: ReactNode;
  if (loading && !rows) body = <SkeletonRows />;
  else if (!rows?.length) body = <Empty text={emptyText} />;
  else if (narrow)
    body = (
      <View style={styles.cards}>
        {rows.map((r) => (
          <Row key={keyOf(r)} onPress={onRowPress ? () => onRowPress(r) : undefined} style={styles.card}>
            {card(r)}
          </Row>
        ))}
      </View>
    );
  else
    body = (
      <ScrollView horizontal contentContainerStyle={{ minWidth: Math.max(need, width) }} showsHorizontalScrollIndicator={width < need}>
        <View style={styles.flex}>
          <View style={styles.head} accessibilityRole="header">
            {columns.map((c) => (
              <View key={c.key} style={[cell(c), styles.headCell]}>
                <Text numberOfLines={1} style={[styles.headText, { textAlign: c.align ?? 'left' }]}>
                  {c.title}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <Row key={keyOf(r)} onPress={onRowPress ? () => onRowPress(r) : undefined} style={styles.row}>
              {columns.map((c) => (
                <View key={c.key} style={[cell(c), { alignItems: c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start' }]}>
                  {c.render(r)}
                </View>
              ))}
            </Row>
          ))}
        </View>
      </ScrollView>
    );

  return (
    <View onLayout={onLayout} style={[styles.flexAuto, refreshing && rows ? styles.dim : null]}>
      {body}
    </View>
  );
}

const cell = (c: { flex?: number; width?: number }) => (c.width ? { width: c.width, flexShrink: 0 } : { flex: c.flex ?? 1, minWidth: 0 });

function Row({ onPress, style, children }: { onPress?: () => void; style: object; children: ReactNode }) {
  const { hovered, bind } = useHover();
  if (!onPress) return <View style={style}>{children}</View>;
  return (
    <Pressable onPress={onPress} {...bind} accessibilityRole="button" style={[style, { cursor: 'pointer' }, hovered && { backgroundColor: colors.primaryWash }]}>
      {children}
    </Pressable>
  );
}

/** Jadval katagidagi ikki qatorli matn: asosiy + izoh */
export function Cell({ title, sub, strong }: { title: ReactNode; sub?: ReactNode; strong?: boolean }) {
  useScheme();
  return (
    <View style={styles.flexMin}>
      <Text numberOfLines={1} style={[styles.cellTitle, strong && { fontFamily: fonts.heavy }]}>
        {title}
      </Text>
      {sub ? (
        <Text numberOfLines={1} style={styles.cellSub}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1 },
  flexAuto: { alignSelf: 'stretch' },
  flexMin: { minWidth: 0, maxWidth: '100%' },
  dim: { opacity: 0.55 },
  head: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.bg },
  headCell: { justifyContent: 'center' },
  headText: { fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 16, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line, minHeight: 58 },
  cards: { padding: 12, gap: 10 },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, gap: 8 },
  cellTitle: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  cellSub: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
}));
