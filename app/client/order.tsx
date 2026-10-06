import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Camera, MapPin, ShieldCheck, X } from 'lucide-react-native';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, Divider, Row, ScreenHeader, Squish, Text } from '@/components/ui';
import { getCategory, problems, problemsOf, WARRANTY_DAYS } from '@/constants/categories';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { formatRange, formatSum, t } from '@/lib/i18n';
import { useOrder, useOrders, useUser } from '@/store';

const MAX_PHOTOS = 3;

export default function OrderScreen() {
  const { categoryId, problemId, description, photos, address, setDraft } = useOrder();
  const create = useOrders((s) => s.create);
  const phone = useUser((s) => s.phone);
  const { autoSubmit } = useLocalSearchParams<{ autoSubmit?: string }>();
  const category = getCategory(categoryId);
  const list = [...problemsOf(categoryId).map((p) => p.id), 'other'];
  const problem = problems.find((p) => p.id === problemId);

  const addPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsMultipleSelection: true, selectionLimit: MAX_PHOTOS - photos.length });
    if (!res.canceled) setDraft({ photos: [...photos, ...res.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS) });
  };

  const submit = () => {
    // Ro'yxatdan faqat shu yerda o'tiladi: mijoz hamma narsani tanlab bo'lgach
    if (!phone) {
      router.push('/phone?next=order');
      return;
    }
    const id = create();
    router.replace(`/client/searching?id=${id}`);
  };

  // Raqam tasdiqlanib qaytilganda — buyurtma avtomatik yuboriladi
  useEffect(() => {
    if (autoSubmit && phone) submit();
  }, [autoSubmit, phone]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <ScreenHeader
        kicker={t('order.category')}
        title={t(`categories.${categoryId}`)}
        right={
          <View style={[styles.catBadge, { backgroundColor: category.tint }]}>
            <category.icon size={24} color={category.ink} strokeWidth={2.2} />
          </View>
        }
      />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.section}>
            <Text variant="h3">{t('order.problemTitle')}</Text>
            <View style={styles.chips}>
              {list.map((id) => (
                <Chip key={id} label={t(`problems.${id}`)} selected={id === problemId} onPress={() => setDraft({ problemId: id })} color={category.main} onColor={category.onMain} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="h3">{t('order.detailsTitle')}</Text>
            <TextInput
              multiline
              value={description}
              onChangeText={(v) => setDraft({ description: v })}
              placeholder={t('order.detailsPlaceholder')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t('order.detailsTitle')}
              style={styles.textarea}
              textAlignVertical="top"
            />
            <View style={styles.photos}>
              {photos.length < MAX_PHOTOS ? (
                <Squish accessibilityRole="button" accessibilityLabel={t('order.addPhoto')} onPress={addPhoto} style={styles.addPhoto}>
                  <Camera size={24} color={category.ink} strokeWidth={2} />
                </Squish>
              ) : null}
              {photos.map((uri) => (
                <View key={uri} style={styles.photo}>
                  <Image source={{ uri }} style={StyleSheet.absoluteFill} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    hitSlop={8}
                    onPress={() => setDraft({ photos: photos.filter((p) => p !== uri) })}
                    style={styles.remove}
                  >
                    <X size={12} color={colors.onPrimary} strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Text variant="caption">{t('order.photoHint')}</Text>
          </View>

          <Card>
            <Row label={t('order.callFee')} value={formatSum(category.callFee)} />
            <Row label={t('order.estimate')} value={formatRange(problem?.priceMin ?? null, problem?.priceMax ?? null)} />
            <Divider />
            <View style={styles.note}>
              <ShieldCheck size={18} color={category.ink} strokeWidth={2.2} />
              <Text variant="small" style={styles.flex}>
                {t('order.guarantee', { days: WARRANTY_DAYS })}
              </Text>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={[styles.bottom, shadow.sheet]}>
        <View style={styles.where}>
          <MapPin size={16} color={colors.accent} strokeWidth={2.4} />
          <Text variant="small" numberOfLines={1} style={styles.flex}>
            {address} · {t('common.cash')}
          </Text>
        </View>
        <Button title={t('order.submit')} big color={{ bg: category.main, fg: category.onMain }} onPress={submit} />
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  catBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 22 },
  section: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  textarea: {
    minHeight: 92,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 12,
    paddingTop: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  photos: { flexDirection: 'row', gap: 8 },
  addPhoto: {
    width: 68,
    height: 68,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9FB1AA',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: 68, height: 68, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.mapBlock },
  remove: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(11,42,36,0.7)', alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bottom: { backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, gap: 12, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  where: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
