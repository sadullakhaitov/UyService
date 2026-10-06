import { router } from 'expo-router';
import { LocateFixed, MapPin, Search, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Squish, Text } from '@/components/ui';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { searchAddress, type Place } from '@/lib/geocode';
import { t } from '@/lib/i18n';
import { getCurrentLocation, reverseGeocode } from '@/lib/location';
import { useOrder } from '@/store';

// Manzilni yozib qidirish (xaritani surishga qo'shimcha). Tanlangach bosh sahifa xaritasi shu joyga uchadi.
export default function AddressSearch() {
  useScheme();
  const { location, setAddress } = useOrder();
  const [q, setQ] = useState('');
  const [items, setItems] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const input = useRef<TextInput>(null);

  // Yozish to'xtagach 450 ms kutib qidiramiz (xizmat sekundiga 1 so'rovni qabul qiladi)
  useEffect(() => {
    const query = q.trim();
    if (query.length < 3) {
      setItems([]);
      setSearched(false);
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setLoading(true);
      const res = await searchAddress(query, location, ctrl.signal);
      if (!ctrl.signal.aborted) {
        setItems(res);
        setSearched(true);
        setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (p: Place) => {
    setAddress(p.title, p.location);
    router.back();
  };
  const here = async () => {
    const p = await getCurrentLocation();
    if (!p) return;
    setAddress((await reverseGeocode(p)) ?? t('client.myLocation'), p);
    router.back();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('address.title')} />
      <View style={styles.search}>
        <Search size={20} color={colors.ink2} strokeWidth={2.2} />
        <TextInput
          ref={input}
          autoFocus
          value={q}
          onChangeText={setQ}
          placeholder={t('address.placeholder')}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t('address.placeholder')}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading ? <ActivityIndicator color={colors.primary} /> : null}
        {q && !loading ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} onPress={() => setQ('')}>
            <X size={18} color={colors.ink2} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Squish accessibilityRole="button" scaleTo={0.98} onPress={here} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
              <LocateFixed size={20} color={colors.primary} strokeWidth={2.2} />
            </View>
            <Text style={[styles.title, { color: colors.primary }]}>{t('address.myLocation')}</Text>
          </Squish>
        }
        ListEmptyComponent={
          searched && !loading ? (
            <Text variant="small" style={styles.empty}>
              {t('address.empty')}
            </Text>
          ) : (
            <Text variant="caption" style={styles.empty}>
              {t('address.hint')}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Squish accessibilityRole="button" scaleTo={0.98} onPress={() => choose(item)} style={styles.row}>
            <View style={styles.icon}>
              <MapPin size={20} color={colors.accent} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              {item.subtitle ? (
                <Text variant="caption" numberOfLines={1}>
                  {item.subtitle}
                </Text>
              ) : null}
            </View>
            {item.distanceKm !== undefined ? <Text variant="caption">{t('common.km', { value: item.distanceKm.toFixed(1) })}</Text> : null}
          </Squish>
        )}
      />
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: radius.field, paddingHorizontal: 14, height: 54, borderWidth: 1.5, borderColor: colors.line },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, height: '100%' },
  list: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.card, backgroundColor: colors.surface },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  empty: { textAlign: 'center', marginTop: 16 },
}));
