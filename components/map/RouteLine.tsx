import { Polyline } from 'react-native-maps';
import { colors } from '@/constants/theme';
import { withAlpha } from '@/lib/color';
import type { LatLng } from '@/lib/geo';

// Yo'l chizig'i: och hoshiya + ustida yaxlit yashil chiziq (Yandex'dagidek, miltillamaydi)
export function RouteLine({ path, color = colors.primary }: { path: LatLng[]; color?: string }) {
  return (
    <>
      <Polyline coordinates={path} strokeColor={withAlpha(color, 0.25)} strokeWidth={10} lineCap="round" lineJoin="round" />
      <Polyline coordinates={path} strokeColor={color} strokeWidth={6} lineCap="round" lineJoin="round" />
    </>
  );
}
