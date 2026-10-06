// Haqiqiy xarita (Android/iOS). Veb uchun: MapBase.web.tsx
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, StyleSheet, View } from 'react-native';
import MapView, { AnimatedRegion, Circle, Marker, MarkerAnimated, PROVIDER_GOOGLE, type Camera } from 'react-native-maps';
import { colors } from '@/constants/theme';
import { withAlpha } from '@/lib/color';
import { bearing, distanceKm, type LatLng } from '@/lib/geo';
import { ClientDot } from './ClientDot';
import { MasterIcon, NearbyIcon } from './MasterIcon';
import mapStyle from './mapStyle.json';
import { RouteLine } from './RouteLine';
import { DEFAULT_ZOOM, MOVE_INTERVAL_MS, type MapBaseProps, type MapHandle } from './types';
import { pulseOpacity, pulseRadius, usePulse } from './usePulse';
import { useBlink } from './useBlink';

// iOS Expo Go'da Google xarita yo'q — u yerda Apple xaritasi ishlatiladi (rang uslubisiz).
const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

const zoomToAltitude = (z: number) => 35_200_000 / 2 ** z;
const cam = (center: LatLng, zoom: number): Partial<Camera> => ({ center, zoom, altitude: zoomToAltitude(zoom), heading: 0, pitch: 0 });

export const MapBase = forwardRef<MapHandle, MapBaseProps>(function MapBase({
  center,
  zoom = DEFAULT_ZOOM,
  flyFrom,
  insets = { top: 0, bottom: 0 },
  nearby,
  blinkNearby,
  clientMarker,
  route,
  master,
  fitTo,
  onMoveStart,
  onMoveEnd,
  overlay,
  pulse,
  userLocation,
  accent = colors.primary,
  moveDuration = MOVE_INTERVAL_MS,
}, handle) {
  const ref = useRef<MapView>(null);
  const rings = usePulse(Boolean(pulse));

  useImperativeHandle(handle, () => ({
    flyTo: (c, z = DEFAULT_ZOOM) => ref.current?.animateCamera(cam(c, z), { duration: 900 }),
    zoomBy: async (d) => {
      const c = await ref.current?.getCamera();
      if (!c) return;
      // Google — zoom, Apple — balandlik (altitude)
      ref.current?.animateCamera(
        Platform.OS === 'android' ? { zoom: (c.zoom ?? DEFAULT_ZOOM) + d } : { altitude: (c.altitude ?? zoomToAltitude(DEFAULT_ZOOM)) / 2 ** d },
        { duration: 300 },
      );
    },
  }));
  const ready = useRef(false);
  const dragging = useRef(false);
  const blink = useBlink(Boolean(blinkNearby), nearby?.length ?? 0);

  const initialCamera = useMemo(
    () => ({ ...cam(flyFrom ?? center, flyFrom ? 12 : zoom), heading: 0, pitch: 0 }) as Camera,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onMapReady = () => {
    ready.current = true;
    if (fitTo?.length) return fit();
    if (flyFrom) setTimeout(() => ref.current?.animateCamera(cam(center, zoom), { duration: 1600 }), 250);
  };

  // Zoom o'zgarsa — kamera asta uzoqlashadi/yaqinlashadi
  useEffect(() => {
    if (ready.current) ref.current?.animateCamera(cam(center, zoom), { duration: 4000 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const fitKey = fitTo?.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join('|');
  const fit = () => {
    if (!fitTo?.length) return;
    ref.current?.fitToCoordinates(fitTo, {
      edgePadding: { top: insets.top + 80, bottom: insets.bottom + 60, left: 60, right: 60 },
      animated: true,
    });
  };
  useEffect(() => {
    if (ready.current) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, insets.top, insets.bottom]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={ref}
        provider={provider}
        style={StyleSheet.absoluteFill}
        customMapStyle={mapStyle}
        initialCamera={initialCamera}
        mapPadding={{ top: insets.top, bottom: insets.bottom, left: 0, right: 0 }}
        onMapReady={onMapReady}
        showsPointsOfInterests={false}
        showsBuildings
        showsCompass={false}
        showsUserLocation={Boolean(userLocation)}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        onPress={() => Keyboard.dismiss()}
        onPanDrag={() => {
          if (!dragging.current) {
            dragging.current = true;
            onMoveStart?.();
          }
        }}
        onRegionChangeComplete={(r) => {
          if (!dragging.current) return;
          dragging.current = false;
          onMoveEnd?.({ latitude: r.latitude, longitude: r.longitude });
        }}
      >
        {nearby?.map((p, i) => (
          <Marker key={`n${i}`} coordinate={p} anchor={{ x: 0.5, y: 0.5 }} opacity={blink[i]} tracksViewChanges={false}>
            <NearbyIcon />
          </Marker>
        ))}
        {pulse
          ? rings.map((p, i) => (
              <Circle
                key={`p${i}`}
                center={pulse.center}
                radius={pulseRadius(p, pulse.maxRadiusM)}
                strokeWidth={2}
                strokeColor={withAlpha(accent, pulseOpacity(p))}
                fillColor={withAlpha(accent, pulseOpacity(p) * 0.22)}
              />
            ))
          : null}
        {route?.length ? <RouteLine path={route} color={accent} /> : null}
        {clientMarker ? (
          <Marker coordinate={clientMarker} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <ClientDot breathing={false} />
          </Marker>
        ) : null}
        {master ? <MovingMaster target={master} color={accent} duration={moveDuration} /> : null}
      </MapView>
      {overlay ? (
        <View pointerEvents="none" style={[styles.focal, { top: insets.top, bottom: insets.bottom }]}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
});

// Har 5 s kelgan nuqta orasida 5 s davomida silliq siljiydi va yo'nalishi bo'yicha buriladi
function MovingMaster({ target, color, duration }: { target: LatLng; color: string; duration: number }) {
  const region = useRef(new AnimatedRegion({ ...target, latitudeDelta: 0, longitudeDelta: 0 })).current;
  const last = useRef(target);
  const [heading, setHeading] = useState(0);
  const [track, setTrack] = useState(true);

  // Android: SVG chizilgach kuzatishni o'chiramiz (aks holda sekinlashadi)
  useEffect(() => {
    const id = setTimeout(() => setTrack(false), 600);
    return () => clearTimeout(id);
  }, []);
  const ios = Platform.OS === 'ios';

  useEffect(() => {
    const from = last.current;
    if (from.latitude === target.latitude && from.longitude === target.longitude) return;
    last.current = target;
    // Uzoq sakrash (masalan, GPS birinchi marta kelganda) — animatsiyasiz
    if (distanceKm(from, target) > 0.5) {
      region.setValue({ ...target, latitudeDelta: 0, longitudeDelta: 0 });
      return;
    }
    setHeading(bearing(from, target));
    region
      .timing({ ...target, latitudeDelta: 0, longitudeDelta: 0, duration, easing: Easing.linear, useNativeDriver: false } as never)
      .start();
  }, [target.latitude, target.longitude]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MarkerAnimated
      coordinate={region as unknown as Animated.WithAnimatedValue<LatLng>}
      anchor={{ x: 0.5, y: 0.5 }}
      flat
      rotation={ios ? undefined : heading}
      tracksViewChanges={ios || track}
    >
      <View style={ios ? { transform: [{ rotate: `${heading}deg` }] } : undefined}>
        <MasterIcon color={color} />
      </View>
    </MarkerAnimated>
  );
}

const styles = StyleSheet.create({
  focal: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
});

export const MAP_BG = colors.map;
