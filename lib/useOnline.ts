import { useNetInfo } from '@react-native-community/netinfo';
import NetInfo from '@react-native-community/netinfo';

/** Internet bormi. Hali aniqlanmagan bo'lsa — bor deb hisoblaymiz (bekorga ogohlantirmaslik uchun) */
export function useOnline() {
  const n = useNetInfo();
  return n.isConnected !== false && n.isInternetReachable !== false;
}

/** Bir martalik tekshiruv (buyurtma yuborishdan oldin) */
export async function isOnline() {
  try {
    const n = await NetInfo.fetch();
    return n.isConnected !== false && n.isInternetReachable !== false;
  } catch {
    return true;
  }
}
