// Faol buyurtma ekrani: qidiruv (to'lqinlar) va kuzatuv (usta yo'lda) BITTA xaritada.
// Usta topilganda boshqa ekranga o'tilmaydi — faqat panel almashadi, xarita qayta yuklanmaydi
// (xarita qayta yuklanmaydi — tezroq va trafik kam). /client/searching va /client/tracking — ikkalasi shu ekran.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapBase } from '@/components/map';
import { NotFound } from '@/components/ui/NotFound';
import { getCategory } from '@/constants/categories';
import { colors, themed, useScheme } from '@/constants/theme';
import { useActiveOrder } from '@/store';
import { SearchingPanel, useSearchingMap } from './SearchingPanel';
import { TrackingPanel, useTrackingMap } from './TrackingPanel';

export function LiveOrder() {
  useScheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const order = useActiveOrder(id);
  const insets = useSafeAreaInsets();
  const [sheetH, setSheetH] = useState(420);
  const searching = !!order && (order.status === 'searching' || order.status === 'scheduled');
  const search = useSearchingMap(order);
  const track = useTrackingMap(order);

  // Ish yakunlandi (yoki mijoz narxni rad etdi) — hisob-kitob va baho ekraniga
  useEffect(() => {
    if (order?.status === 'completed') router.replace(`/client/rate?id=${order.id}`);
  }, [order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order || !order.location) return <NotFound />;
  const cat = getCategory(order.categoryId);
  const map = searching ? search.props : track;

  return (
    <View style={styles.root}>
      <MapBase
        center={order.location}
        insets={{ top: insets.top + (searching ? 60 : 90), bottom: sheetH }}
        accent={cat.main}
        {...map}
      />
      {searching ? (
        <SearchingPanel key="search" order={order} onHeight={setSheetH} onRetry={search.resetZoom} />
      ) : (
        <TrackingPanel key="track" order={order} onHeight={setSheetH} />
      )}
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.map },
}));
