import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Polyline } from 'react-native-maps';
import { colors } from '@/constants/theme';
import type { LatLng } from '@/lib/geo';

// Yo'l chizig'i: och tagzamin + ustida chiziq-chiziq yashil chiziq.
// iOS'da chiziqlar oqib turadi (lineDashPhase); Android'da bu xususiyat yo'q — chiziq statik.
export function RouteLine({ path }: { path: LatLng[] }) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const id = setInterval(() => setPhase((p) => (p + 2) % 20), 60);
    return () => clearInterval(id);
  }, []);
  return (
    <>
      <Polyline coordinates={path} strokeColor={colors.primaryTint} strokeWidth={9} lineCap="round" lineJoin="round" />
      <Polyline
        coordinates={path}
        strokeColor={colors.primary}
        strokeWidth={5}
        lineCap="round"
        lineJoin="round"
        lineDashPattern={[14, 6]}
        lineDashPhase={-phase}
      />
    </>
  );
}
