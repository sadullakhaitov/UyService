import { router, useLocalSearchParams } from 'expo-router';
import { Check, Heart, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Divider, RatingInput, Row, Squish, Text } from '@/components/ui';
import { getCategory, WARRANTY_DAYS } from '@/constants/categories';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { formatDate, formatSum, t } from '@/lib/i18n';
import { mockMasters } from '@/mocks';
import { useActiveOrder, useHistory, useOrders, useUser } from '@/store';

const TAGS = ['onTime', 'clean', 'fair', 'polite', 'fast'] as const;

// Soxta yakuniy narx (usta "Tugatdim"da kiritadi)
const WORK = 70_000;
const PARTS = 45_000;

export default function Rate() {
  useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useActiveOrder(id);
  const remove = useOrders((s) => s.remove);
  const masterId = order?.masterId;
  const categoryId = order?.categoryId ?? 'plumber';
  const problemId = order?.problemId ?? 'tap';
  const cat = getCategory(categoryId);
  const toggleFavorite = useUser((s) => s.toggleFavorite);
  const addHistory = useHistory((s) => s.add);
  const master = mockMasters.find((m) => m.id === masterId) ?? mockMasters[0];
  const fee = getCategory(categoryId).callFee;
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState<string[]>(['onTime', 'clean']);
  const [comment, setComment] = useState('');
  const [fav, setFav] = useState(true);
  const warranty = new Date(Date.now() + WARRANTY_DAYS * 86_400_000);

  const finish = () => {
    toggleFavorite(master.id, fav);
    // Tarixga: narx, baho, teglar, izoh (5-bosqichda reviews jadvaliga ham yoziladi)
    addHistory({
      id: order?.id ?? `o${Date.now()}`,
      categoryId,
      problemId,
      masterId: master.id,
      at: Date.now(),
      price: fee + WORK + PARTS,
      status: 'completed',
      address: order?.address,
      stars,
      tags,
      comment: comment.trim() || undefined,
    });
    if (order) remove(order.id);
    router.replace('/client');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { backgroundColor: cat.main }]}>
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <View style={styles.check}>
            <Check size={28} color={cat.onMain} strokeWidth={2.8} />
          </View>
          <Text style={[styles.heroTitle, { color: cat.onMain }]}>{t('rate.doneTitle')}</Text>
          <Text style={[styles.heroSub, { color: cat.onMain, opacity: 0.85 }]}>{t('rate.duration', { name: master.name, time: t('rate.time') })}</Text>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Card>
          <Row label={t('rate.callFee')} value={formatSum(fee)} />
          <Row label={t('rate.work', { problem: t(`problems.${problemId}`) })} value={formatSum(WORK)} />
          <Row label={t('rate.parts')} value={formatSum(PARTS)} />
          <Divider />
          <Row label={t('rate.total')} value={formatSum(fee + WORK + PARTS)} strong />
          <View style={styles.warranty}>
            <ShieldCheck size={16} color={colors.success} strokeWidth={2.4} />
            <Text style={styles.warrantyText}>{t('rate.warrantyUntil', { date: formatDate(warranty) })}</Text>
          </View>
        </Card>

        <View style={styles.rate}>
          <Text variant="h3">{t('rate.rateTitle')}</Text>
          <RatingInput value={stars} onChange={setStars} />
          <View style={styles.tags}>
            {TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <Squish
                  key={tag}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setTags(on ? tags.filter((x) => x !== tag) : [...tags, tag])}
                  style={[styles.tag, on && styles.tagOn]}
                >
                  {on ? <Check size={14} color={colors.primary} strokeWidth={3} /> : null}
                  <Text style={[styles.tagText, on && { color: colors.primary }]}>{t(`rate.tags.${tag}`)}</Text>
                </Squish>
              );
            })}
          </View>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t('rate.commentPlaceholder')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('rate.commentPlaceholder')}
            style={styles.comment}
          />
        </View>

        <Squish accessibilityRole="checkbox" accessibilityState={{ checked: fav }} onPress={() => setFav(!fav)} style={styles.fav}>
          <View style={[styles.box, fav && styles.boxOn]}>{fav ? <Check size={14} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
          <Text style={styles.favText}>{t('rate.addFavorite')}</Text>
          <Heart size={18} color={colors.accent} fill={fav ? colors.accent : 'transparent'} strokeWidth={2.2} />
        </Squish>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <Button title={t('rate.pay')} big color={{ bg: cat.main, fg: cat.onMain }} onPress={finish} />
        <Text variant="caption" style={styles.center}>
          {t('rate.payNote', { days: WARRANTY_DAYS })}
        </Text>
      </SafeAreaView>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.primary, borderBottomLeftRadius: radius.sheet, borderBottomRightRadius: radius.sheet },
  heroInner: { alignItems: 'center', gap: 8, paddingTop: 20, paddingBottom: 26, paddingHorizontal: 20 },
  check: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: fonts.heavy, fontSize: 22, color: colors.onPrimary },
  heroSub: { fontFamily: fonts.medium, fontSize: 14, color: colors.onPrimaryMuted },
  scroll: { padding: 16, gap: 20 },
  warranty: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  warrantyText: { fontFamily: fonts.bold, fontSize: 12, color: colors.success },
  rate: { alignItems: 'center', gap: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line },
  tagOn: { backgroundColor: colors.primarySoft, borderColor: colors.primaryTint },
  tagText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  comment: { alignSelf: 'stretch', height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 15, color: colors.ink },
  fav: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, backgroundColor: colors.surface, borderRadius: radius.tile, borderWidth: 1.5, borderColor: colors.line },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  favText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  bottom: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 },
  center: { textAlign: 'center' },
}));
