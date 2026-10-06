import { Polyline } from 'react-native-maps';
import { colors } from '@/constants/theme';
import type { LatLng } from '@/lib/geo';

// Yo'l chizig'i: och hoshiya + ustida yaxlit yashil chiziq (Yandex'dagidek, miltillamaydi)
export function RouteLine({ path }: { path: LatLng[] }) {
  return (
    <>
      <Polyline coordinates={path} strokeColor={colors.primaryTint} strokeWidth={10} lineCap="round" lineJoin="round" />
      <Polyline coordinates={path} strokeColor={colors.primary} strokeWidth={6} lineCap="round" lineJoin="round" />
    </>
  );
}
