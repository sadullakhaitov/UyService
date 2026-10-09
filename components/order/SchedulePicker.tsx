// "Vaqtni tanlash": kun — oylik kalendardan (bugundan 30 kungacha, bo'sh vaqti bor kunlar), soat — iPhone'dagidek
// aylanma g'ildirak (o'rtadagi qator tanlangan, chetlari xiralashib egiladi; surilganda eng yaqin soatga "yopishadi").
// Vaqtlar — lib/schedule.ts (08:00–21:00, eng erta — hozirdan 1,5 soat keyin).
import { CalendarClock, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Text } from '@/components/ui';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatDate, formatTime, t } from '@/lib/i18n';
import { DAYS_AHEAD, dayOffsetOf, slotsFor } from '@/lib/schedule';

const DAY = 86_400_000;
const WEB = Platform.OS === 'web';

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function SchedulePicker({ value, onChange, color, onColor }: { value: number; onChange: (v: number) => void; color: string; onColor: string }) {
  useScheme();
  const day = Math.max(0, dayOffsetOf(value));
  const slots = slotsFor(day);
  const pickDay = (d: number) => {
    const s = slotsFor(d);
    if (!s.length) return;
    // Shu soat yangi kunda ham bo'lsa — saqlaymiz
    const same = s.find((x) => new Date(x).getHours() === new Date(value).getHours());
    onChange(same ?? s[0]);
  };
  const date = new Date(value);
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <CalendarClock size={20} color={color} strokeWidth={2.2} />
        <Text variant="h3">{t('schedule.when')}</Text>
      </View>
      <Calendar selected={day} onPick={pickDay} color={color} onColor={onColor} />
      <View style={styles.timeCard}>
        <View style={styles.timeText}>
          <Text variant="caption">{t('schedule.time')}</Text>
          <Text variant="bodyBold" numberOfLines={2}>
            {`${t(`weekdayLong.${date.getDay()}`)}, ${formatDate(date)}`}
          </Text>
        </View>
        <TimeWheel slots={slots} value={value} onChange={onChange} />
      </View>
      <Text variant="caption">{t('schedule.hint')}</Text>
    </View>
  );
}

// ---------- Kalendar ----------
function Calendar({ selected, onPick, color, onColor }: { selected: number; onPick: (offset: number) => void; color: string; onColor: string }) {
  useScheme();
  const today = startOfToday();
  // Tanlash mumkin bo'lgan kunlar (bugungi kunda bo'sh vaqt qolmagan bo'lishi mumkin)
  const open = useMemo(() => new Set(Array.from({ length: DAYS_AHEAD }, (_, d) => d).filter((d) => slotsFor(d).length)), [today.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const first = new Date(today);
  const last = new Date(today.getTime() + (DAYS_AHEAD - 1) * DAY);
  const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const selDate = new Date(today.getTime() + selected * DAY);
  const [month, setMonth] = useState(monthKey(selDate));
  useEffect(() => setMonth(monthKey(selDate)), [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const y = Math.floor(month / 12);
  const m = month % 12;
  const canPrev = month > monthKey(first);
  const canNext = month < monthKey(last);

  // Hafta dushanbadan boshlanadi
  const firstOfMonth = new Date(y, m, 1);
  const lead = (firstOfMonth.getDay() + 6) % 7;
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array.from({ length: lead }, () => null), ...Array.from({ length: daysIn }, (_, i) => new Date(y, m, i + 1))];
  while (cells.length % 7) cells.push(null);

  return (
    <View style={styles.card}>
      <View style={styles.calHead}>
        <Text style={styles.month}>{`${t(`month.${m}`)} ${y}`}</Text>
        <View style={styles.arrows}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('schedule.prevMonth')} disabled={!canPrev} onPress={() => setMonth(month - 1)} hitSlop={8} style={[styles.arrow, !canPrev && styles.off]}>
            <ChevronLeft size={20} color={color} strokeWidth={2.4} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t('schedule.nextMonth')} disabled={!canNext} onPress={() => setMonth(month + 1)} hitSlop={8} style={[styles.arrow, !canNext && styles.off]}>
            <ChevronRight size={20} color={color} strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>
      <View style={styles.grid}>
        {[1, 2, 3, 4, 5, 6, 0].map((w) => (
          <View key={w} style={styles.cell}>
            <Text style={styles.weekday}>{t(`weekday.${w}`)}</Text>
          </View>
        ))}
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const offset = Math.round((d.getTime() - today.getTime()) / DAY);
          const enabled = open.has(offset);
          const isSel = offset === selected;
          const isToday = offset === 0;
          return (
            <View key={d.getDate()} style={styles.cell}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSel, disabled: !enabled }}
                accessibilityLabel={formatDate(d)}
                disabled={!enabled}
                onPress={() => onPick(offset)}
                style={[styles.dayBtn, isSel && { backgroundColor: color }]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    !enabled && styles.dayOff,
                    isToday && !isSel && { color, fontFamily: fonts.heavy },
                    isSel && { color: onColor, fontFamily: fonts.heavy },
                  ]}
                >
                  {d.getDate()}
                </Text>
                {isToday && !isSel ? <View style={[styles.todayDot, { backgroundColor: color }]} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Soat g'ildiragi (iPhone uslubi) ----------
const ITEM = 40;
const VISIBLE = 5; // ko'rinadigan qatorlar (o'rtadagisi — tanlangan)
const PAD = ((VISIBLE - 1) / 2) * ITEM;

function TimeWheel({ slots, value, onChange }: { slots: number[]; value: number; onChange: (v: number) => void }) {
  useScheme();
  const ref = useRef<ScrollViewRef>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const settled = useRef(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const index = Math.max(0, slots.indexOf(value));

  // Tashqaridan o'zgarsa (kun almashdi) — g'ildirakni o'sha soatga buramiz
  useEffect(() => {
    if (settled.current === index && slots[index] === value) return;
    settled.current = index;
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM, animated: false }), 0);
    return () => clearTimeout(id);
  }, [index, slots.length, slots[0]]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (y: number) => {
    const i = Math.max(0, Math.min(slots.length - 1, Math.round(y / ITEM)));
    settled.current = i;
    if (Math.abs(y - i * ITEM) > 1) ref.current?.scrollTo({ y: i * ITEM, animated: true });
    if (slots[i] !== value) onChange(slots[i]);
  };
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
    useNativeDriver: !WEB,
    // Brauzerda "inersiya tugadi" hodisasi yo'q — surish to'xtagach eng yaqin soatga yopishadi
    listener: WEB
      ? (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = e.nativeEvent.contentOffset.y;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => select(y), 140);
        }
      : undefined,
  });
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <View style={styles.wheel}>
      {/* Tanlangan qator foni */}
      <View pointerEvents="none" style={styles.band} />
      <Animated.ScrollView
        ref={ref as never}
        style={[styles.wheelScroll, WEB && ({ scrollSnapType: 'y mandatory' } as object)]}
        contentContainerStyle={{ paddingVertical: PAD }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={(e) => select(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          // Barmoq qo'yib yuborildi, inersiyasiz — darhol yopishtiramiz
          if (!WEB && Math.abs(e.nativeEvent.velocity?.y ?? 0) < 0.05) select(e.nativeEvent.contentOffset.y);
        }}
      >
        {slots.map((s, i) => {
          const range = [(i - 2) * ITEM, (i - 1) * ITEM, i * ITEM, (i + 1) * ITEM, (i + 2) * ITEM];
          const opacity = scrollY.interpolate({ inputRange: range, outputRange: [0.18, 0.45, 1, 0.45, 0.18], extrapolate: 'clamp' });
          const scale = scrollY.interpolate({ inputRange: range, outputRange: [0.84, 0.92, 1, 0.92, 0.84], extrapolate: 'clamp' });
          const rotateX = scrollY.interpolate({ inputRange: range, outputRange: ['48deg', '24deg', '0deg', '-24deg', '-48deg'], extrapolate: 'clamp' });
          return (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: s === value }}
              accessibilityLabel={formatTime(s)}
              onPress={() => {
                settled.current = i;
                ref.current?.scrollTo({ y: i * ITEM, animated: true });
                onChange(s);
              }}
              style={[styles.item, WEB && ({ scrollSnapAlign: 'center' } as object)]}
            >
              <Animated.Text style={[styles.itemText, { opacity, transform: [{ perspective: 600 }, { rotateX }, { scale }] }]}>{formatTime(s)}</Animated.Text>
            </Pressable>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}
type ScrollViewRef = { scrollTo: (o: { y: number; animated?: boolean }) => void };

const styles = themed(() => ({
  section: { gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, padding: 12, paddingTop: 10 },
  calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingBottom: 6 },
  month: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 24, color: colors.ink },
  arrows: { flexDirection: 'row', gap: 4 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.25 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.muted, textTransform: 'uppercase' },
  dayBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayNum: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.ink, fontVariant: ['tabular-nums'] },
  dayOff: { color: colors.muted, opacity: 0.4, fontFamily: fonts.regular },
  todayDot: { position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: 2 },
  timeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.line, paddingLeft: 16, paddingRight: 8 },
  timeText: { flex: 1, gap: 2 },
  wheel: { width: 132, height: ITEM * VISIBLE, justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: PAD, height: ITEM, borderRadius: 10, backgroundColor: colors.field },
  wheelScroll: { flexGrow: 0, height: ITEM * VISIBLE },
  item: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontFamily: fonts.bold, fontSize: 21, lineHeight: 26, color: colors.ink, fontVariant: ['tabular-nums'] },
}));
