// Zaxira soxta xarita: Yandex skripti yuklanmasa (masalan, demo sahifa ichida) brauzerda shu ko'rinadi.
// Faqat dizaynni ko'rish uchun — haqiqiy xarita MapBase.tsx / MapBase.web.tsx (Yandex).
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors, themed, useScheme } from '@/constants/theme';
import type { LatLng } from '@/lib/geo';
import { ClientDot } from './ClientDot';
import { MasterIcon, NearbyIcon } from './MasterIcon';
import { DEFAULT_ZOOM, type MapBaseProps, type MapHandle } from './types';
import { pulseOpacity, pulseRadius, usePulse } from './usePulse';
import { useBlink } from './useBlink';
import { useMovingPoint } from './useMovingPoint';

type Cam = { lat: number; lng: number; zoom: number };

const pxPerDeg = (zoom: number) => (256 * 2 ** zoom) / 360;
const COS = Math.cos((41.29 * Math.PI) / 180);

// Chilonzor atrofidagi ko'chalar to'ri (soxta)
const range = (from: number, step: number, n: number) => Array.from({ length: n }, (_, i) => +(from + i * step).toFixed(4));
const V = range(69.1426, 0.0034, 40); // ... 69.2038, 69.2072, 69.2106, 69.214 ...
const H = range(41.2462, 0.0023, 44); // ... 41.2853, 41.2876, 41.2899, 41.2922 ...
const MAJOR_V = new Set([69.2072, 69.2208]);
const MAJOR_H = new Set([41.2922, 41.2807]);

export const FakeMap = forwardRef<MapHandle, MapBaseProps>(function FakeMap({
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
  moveDuration,
}, handle) {
  useScheme();
  const rings = usePulse(Boolean(pulse));
  const [size, setSize] = useState({ w: 390, h: 844 });
  const [cam, setCam] = useState<Cam>(() =>
    flyFrom ? { lat: flyFrom.latitude, lng: flyFrom.longitude, zoom: 13 } : { lat: center.latitude, lng: center.longitude, zoom },
  );
  const camRef = useRef(cam);
  camRef.current = cam;

  const animateTo = (to: Cam, duration: number) => {
    const from = camRef.current;
    const start = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - start) / duration);
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      setCam({ lat: from.lat + (to.lat - from.lat) * e, lng: from.lng + (to.lng - from.lng) * e, zoom: from.zoom + (to.zoom - from.zoom) * e });
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  };

  useImperativeHandle(handle, () => ({
    flyTo: (c, z = DEFAULT_ZOOM) => {
      animateTo({ lat: c.latitude, lng: c.longitude, zoom: z }, 900);
    },
    zoomBy: (d) => {
      const c = camRef.current;
      animateTo({ ...c, zoom: Math.max(11, Math.min(18, c.zoom + d)) }, 300);
    },
  }));

  useEffect(() => {
    if (flyFrom) {
      const id = setTimeout(() => animateTo({ lat: center.latitude, lng: center.longitude, zoom }, 1600), 250);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (fitTo?.length) return;
    return animateTo({ lat: center.latitude, lng: center.longitude, zoom }, 4000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const fitKey = fitTo?.map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`).join('|');
  useEffect(() => {
    if (!fitTo?.length) return;
    const lats = fitTo.map((p) => p.latitude);
    const lngs = fitTo.map((p) => p.longitude);
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];
    const availW = size.w - 120;
    const availH = size.h - insets.top - insets.bottom - 140;
    const zx = Math.log2((availW / Math.max(maxLng - minLng, 1e-4)) * (360 / 256));
    const zy = Math.log2(((availH * COS) / Math.max(maxLat - minLat, 1e-4)) * (360 / 256));
    return animateTo({ lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2, zoom: Math.min(17, zx, zy) }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, size.w, size.h, insets.top, insets.bottom]);

  // Fokus nuqtasi (panellar orasidagi bo'shliq markazi)
  const fx = size.w / 2;
  const fy = insets.top + (size.h - insets.top - insets.bottom) / 2;
  const k = pxPerDeg(cam.zoom);
  const project = (p: LatLng) => ({ x: fx + (p.longitude - cam.lng) * k, y: fy - ((p.latitude - cam.lat) * k) / COS });

  // Surish (pan)
  const drag = useRef<{ cam: Cam } | null>(null);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => Boolean(onMoveEnd),
        onMoveShouldSetPanResponder: () => Boolean(onMoveEnd),
        onPanResponderGrant: () => {
          drag.current = { cam: camRef.current };
          onMoveStart?.();
        },
        onPanResponderMove: (_, g) => {
          if (!drag.current) return;
          const c = drag.current.cam;
          const kk = pxPerDeg(c.zoom);
          setCam({ ...c, lng: c.lng - g.dx / kk, lat: c.lat + (g.dy * COS) / kk });
        },
        onPanResponderRelease: () => {
          drag.current = null;
          const c = camRef.current;
          onMoveEnd?.({ latitude: c.lat, longitude: c.lng });
        },
      }),
    [onMoveEnd, onMoveStart],
  );

  const blink = useBlink(Boolean(blinkNearby), nearby?.length ?? 0);
  const moving = useMovingPoint(master, moveDuration);


  const toPath = (pts: LatLng[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${project(p).x.toFixed(1)} ${project(p).y.toFixed(1)}`).join(' ');
  const scale = Math.max(0.35, Math.min(1.4, 2 ** (cam.zoom - 16)));

  // Bloklar (ko'chalar orasidagi binolar)
  const blocks: { x: number; y: number; w: number; h: number; park: boolean }[] = [];
  for (let i = 0; i < V.length - 1; i++) {
    for (let j = 0; j < H.length - 1; j++) {
      const a = project({ latitude: H[j + 1], longitude: V[i] });
      const b = project({ latitude: H[j], longitude: V[i + 1] });
      const pad = 9 * scale;
      const park = (i * 7 + j * 3) % 11 === 4;
      // Har bir kvartalni 2 ta binoga bo'lamiz
      const w = b.x - a.x - pad * 2;
      const h = b.y - a.y - pad * 2;
      if (park || (i + j) % 3 === 0) blocks.push({ x: a.x + pad, y: a.y + pad, w, h, park });
      else {
        blocks.push({ x: a.x + pad, y: a.y + pad, w: w * 0.55, h, park: false });
        blocks.push({ x: a.x + pad + w * 0.6, y: a.y + pad, w: w * 0.4, h: h * 0.6, park: false });
      }
    }
  }
  const canal = toPath([
    { latitude: 41.312, longitude: 69.1965 },
    { latitude: 41.3, longitude: 69.1972 },
    { latitude: 41.289, longitude: 69.1965 },
    { latitude: 41.279, longitude: 69.1975 },
    { latitude: 41.268, longitude: 69.1968 },
  ]);
  const avenue = toPath([
    { latitude: 41.268, longitude: 69.178 },
    { latitude: 41.284, longitude: 69.2 },
    { latitude: 41.296, longitude: 69.222 },
    { latitude: 41.312, longitude: 69.235 },
  ]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.map, overflow: 'hidden' }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      {...pan.panHandlers}
    >
      <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={size.w} height={size.h} fill={colors.map} />
        {blocks.map((b, i) => (
          <Rect key={i} x={b.x} y={b.y} width={Math.max(0, b.w)} height={Math.max(0, b.h)} rx={6 * scale} fill={b.park ? colors.mapPark : colors.mapBlock} />
        ))}
        <Path d={canal} stroke="#CFE3E6" strokeWidth={10 * scale} fill="none" strokeLinecap="round" />
        {V.map((lng) => (
          <Path key={`v${lng}`} d={toPath([{ latitude: 41.24, longitude: lng }, { latitude: 41.35, longitude: lng }])} stroke={colors.mapRoad} strokeWidth={(MAJOR_V.has(lng) ? 13 : 8) * scale} />
        ))}
        {H.map((lat) => (
          <Path key={`h${lat}`} d={toPath([{ latitude: lat, longitude: 69.14 }, { latitude: lat, longitude: 69.28 }])} stroke={colors.mapRoad} strokeWidth={(MAJOR_H.has(lat) ? 13 : 8) * scale} />
        ))}
        <Path d={avenue} stroke={colors.mapRoad} strokeWidth={16 * scale} fill="none" strokeLinecap="round" />
        {route?.length ? (
          <>
            <Path d={toPath(route)} stroke={accent} strokeOpacity={0.25} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Path d={toPath(route)} stroke={accent} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}
        {pulse
          ? rings.map((p, i) => {
              const c = project(pulse.center);
              const r = (pulseRadius(p, pulse.maxRadiusM) / (111_320 * COS)) * k;
              return (
                <Circle
                  key={`p${i}`}
                  cx={c.x}
                  cy={c.y}
                  r={r}
                  stroke={accent}
                  strokeOpacity={pulseOpacity(p)}
                  strokeWidth={2}
                  fill={accent}
                  fillOpacity={pulseOpacity(p) * 0.22}
                />
              );
            })
          : null}
        {userLocation ? (
          <>
            <Circle cx={project(userLocation).x} cy={project(userLocation).y} r={14} fill="#2F80ED" fillOpacity={0.18} />
            <Circle cx={project(userLocation).x} cy={project(userLocation).y} r={7} fill="#2F80ED" stroke="#FFFFFF" strokeWidth={2.5} />
          </>
        ) : null}
      </Svg>

      {nearby?.map((p, i) => {
        const s = project(p);
        return (
          <View key={`n${i}`} pointerEvents="none" style={[styles.marker, { left: s.x - 8, top: s.y - 8, opacity: blink[i] }]}>
            <NearbyIcon />
          </View>
        );
      })}
      {clientMarker ? (
        <View pointerEvents="none" style={[styles.marker, { left: project(clientMarker).x - 33, top: project(clientMarker).y - 33 }]}>
          <ClientDot breathing={false} />
        </View>
      ) : null}
      {moving.pos ? (
        <View
          pointerEvents="none"
          style={[styles.marker, { left: project(moving.pos).x - 19, top: project(moving.pos).y - 19, transform: [{ rotate: `${moving.heading}deg` }] }]}
        >
          <MasterIcon color={accent} />
        </View>
      ) : null}

      {overlay ? (
        <View pointerEvents="none" style={[styles.focal, { top: insets.top, bottom: insets.bottom }]}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
});

const styles = themed(() => ({
  marker: { position: 'absolute' },
  focal: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
}));

