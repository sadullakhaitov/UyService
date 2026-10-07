import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Squish, Text } from '@/components/ui';
import { Flag } from '@/components/ui/Flag';
import { LogoMark } from '@/components/ui/Logo';
import { categories } from '@/constants/categories';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { LANGS, setLanguage, t, type Lang } from '@/lib/i18n';
import { useUser } from '@/store';

// Pufakchalar joyi (illyustratsiya maydoni 320×300 ichida): kategoriya ranglarida suzib turadi
const BUBBLES = [
  { x: 92, y: 20, s: 76 },
  { x: 214, y: 12, s: 88 },
  { x: 8, y: 116, s: 56 },
  { x: 238, y: 128, s: 62 },
  { x: 30, y: 206, s: 72 },
  { x: 196, y: 214, s: 80 },
];

export default function Welcome() {
  useScheme();
  const setLang = useUser((s) => s.setLanguage);
  const current = useUser((s) => s.language) ?? 'uz';

  // Past ekranlarda (telefon brauzeri — manzil satri va pastki panel joy oladi) illyustratsiya va yozuvlar kichrayadi
  const { height } = useWindowDimensions();
  const k = height < 700 ? 0.62 : height < 820 ? 0.78 : 1;
  const compact = k < 1;

  const choose = (lang: Lang) => {
    setLanguage(lang);
    setLang(lang);
    // Ro'yxatdan o'tish shart emas — mijoz darhol xizmatni tanlaydi
    router.replace('/client');
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Hamma narsa sig'masa — aylantiriladi */}
      <ScrollView style={styles.flex} contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]} showsVerticalScrollIndicator={false}>
        <View style={[styles.art, { width: 320 * k, height: 300 * k, marginTop: 24 * k }]}>
          {BUBBLES.map((b, i) => {
            const c = categories[i % categories.length];
            const size = b.s * k;
            return (
              <Bubble key={c.id} index={i} style={{ left: b.x * k, top: b.y * k, width: size, height: size, borderRadius: size / 2, backgroundColor: c.tint }}>
                <c.icon size={size * 0.42} color={c.ink} strokeWidth={2} />
              </Bubble>
            );
          })}
          <Bubble index={6} style={[styles.center, { left: 106 * k, top: 96 * k, width: 108 * k, height: 108 * k, borderRadius: 54 * k }]}>
            <LogoMark size={70 * k} />
          </Bubble>
        </View>

        <View style={[styles.texts, compact && styles.textsCompact]}>
          <Text style={[styles.title, compact && styles.titleCompact]}>{t('welcome.title')}</Text>
          <Text variant="body" style={styles.choose}>
            {t('welcome.choose')}
          </Text>
        </View>

        <View style={[styles.list, compact && styles.listCompact]}>
          {LANGS.map((l) => (
            <Squish key={l} accessibilityRole="button" accessibilityState={{ selected: l === current }} onPress={() => choose(l)} scaleTo={0.97} style={[styles.item, compact && styles.itemCompact]}>
              <Text style={styles.itemText}>{t(`lang.${l}`)}</Text>
              <Flag lang={l} size={compact ? 42 : 52} />
            </Squish>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Sekin "nafas olib" suzib turadi
function Bubble({ index, style, children }: { index: number; style: object | object[]; children: React.ReactNode }) {
  useScheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(index * 220, withRepeat(withTiming(1, { duration: 2600 + index * 300, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [p, index]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * p.value }, { scale: 1 + 0.04 * p.value }] }));
  return <Animated.View style={[styles.bubble, style, anim]}>{children}</Animated.View>;
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 24 },
  scrollCompact: { paddingBottom: 16 },
  art: { alignSelf: 'center' },
  bubble: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  center: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  texts: { alignItems: 'center', gap: 10, marginTop: 20 },
  textsCompact: { gap: 6, marginTop: 12 },
  title: { fontFamily: fonts.heavy, fontSize: 30, color: colors.ink, textAlign: 'center' },
  titleCompact: { fontSize: 24 },
  choose: { color: colors.ink, fontFamily: fonts.medium },
  list: { gap: 12, marginTop: 28 },
  listCompact: { gap: 10, marginTop: 18 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 76, paddingHorizontal: 20, borderRadius: radius.card, backgroundColor: colors.field },
  itemCompact: { height: 60 },
  itemText: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
}));
