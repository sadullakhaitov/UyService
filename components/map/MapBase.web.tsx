// Yandex xaritasi (brauzer / Telegram Mini App): o'sha xarita sahifasi iframe ichida.
// Yandex skripti yuklanmasa (masalan, tashqi skriptlar taqiqlangan demo sahifada) — soxta xarita (FakeMap).
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { colors, themed, useScheme } from '@/constants/theme';
import { FakeMap } from './FakeMap';
import { DEFAULT_ZOOM, type MapBaseProps, type MapHandle } from './types';
import type { MapCommand, MapEvent } from './yandex/html';
import { useYandexMap } from './yandex/useYandexMap';
import { SIDE_INSET, useWide } from '@/lib/useLayout';

export const MapBase = forwardRef<MapHandle, MapBaseProps>(function MapBase(raw, handle) {
  useScheme();
  // Kompyuterda panel chapda turadi — fokus nuqtasi (pin, kamera) o'ng tomondagi bo'sh joy markazida
  const wide = useWide();
  const props = wide && !raw.fullBleed ? { ...raw, insets: { top: raw.insets?.top ?? 0, bottom: 0, left: SIDE_INSET } } : raw;
  // loading → yandex; 8 s ichida chiqmasa — slow: soxta xarita ko'rinadi, Yandex esa orqada yuklanishda davom etadi
  // va tayyor bo'lishi bilan almashadi (sekin mobil internet). fake — skript umuman yuklanmadi.
  const [mode, setMode] = useState<'loading' | 'yandex' | 'slow' | 'fake'>('loading');
  // Kamera buyruqlari ikkalasiga ham boradi — almashganda Yandex xaritasi ham to'g'ri joyda turadi
  const fake = useRef<MapHandle>(null);
  const real = useRef<MapHandle>(null);
  useImperativeHandle(handle, () => ({
    flyTo: (c, z) => (fake.current?.flyTo(c, z), real.current?.flyTo(c, z)),
    panTo: (c) => (fake.current?.panTo?.(c), real.current?.panTo?.(c)),
    zoomBy: (d) => (fake.current?.zoomBy?.(d), real.current?.zoomBy?.(d)),
  }));
  const showFake = mode === 'slow' || mode === 'fake';
  return (
    <View style={styles.fill}>
      {mode === 'fake' ? null : (
        <YandexFrame
          {...props}
          handle={real}
          ready={mode === 'yandex'}
          hidden={showFake}
          onMode={(m) => setMode((cur) => (m === 'slow' && cur !== 'loading' ? cur : m))}
        />
      )}
      {showFake ? <FakeMap ref={fake} {...props} /> : null}
    </View>
  );
});

type FrameProps = MapBaseProps & {
  handle: React.ForwardedRef<MapHandle>;
  ready: boolean;
  /** Soxta xarita ustida turibdi: Yandex yuklanishda davom etadi, lekin hodisalari (surish, bosish) ishlatilmaydi */
  hidden: boolean;
  onMode: (m: 'yandex' | 'slow' | 'fake') => void;
};

function YandexFrame({ handle, ready, hidden, onMode, ...props }: FrameProps) {
  useScheme();
  const { html, json, onEvent } = useYandexMap(props);
  const { insets = { top: 0, bottom: 0 }, overlay } = props;
  const frame = useRef<HTMLIFrameElement | null>(null);
  const booted = useRef(false);
  const latest = useRef(json);
  latest.current = json;

  // Sahifa yuklanmasdan oldingi kamera buyrug'i (masalan, GPS juda tez keldi) — yuklangach yuboriladi
  const early = useRef<MapCommand | null>(null);
  const post = (cmd: MapCommand) => {
    if (booted.current) frame.current?.contentWindow?.postMessage({ __ysmapCmd: true, cmd }, '*');
    else if (cmd.type === 'flyTo') early.current = cmd;
  };
  const sendState = () => post({ type: 'state', state: JSON.parse(latest.current) });

  useImperativeHandle(handle, () => ({
    flyTo: (center, zoom = DEFAULT_ZOOM) => post({ type: 'flyTo', center, zoom }),
    panTo: (center) => post({ type: 'panTo', center }),
    zoomBy: (delta) => post({ type: 'zoomBy', delta }),
  }));

  useEffect(() => {
    sendState();
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps

  const cb = useRef({ onEvent, onMode, ready, hidden });
  cb.current = { onEvent, onMode, ready, hidden };
  useEffect(() => {
    // 8 s ichida xarita chiqmasa — vaqtincha soxta xarita (Yandex tayyor bo'lsa, o'zi almashadi)
    const timer = setTimeout(() => !cb.current.ready && cb.current.onMode('slow'), 8000);
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.__ysmap) return;
      const m = e.data.msg as MapEvent;
      if (m.type === 'boot') {
        booted.current = true;
        sendState();
        if (early.current) post(early.current);
        early.current = null;
      } else if (m.type === 'ready') {
        clearTimeout(timer);
        cb.current.onMode('yandex');
      } else if (m.type === 'error') {
        if (!cb.current.ready && (m.message === 'script' || m.message === 'ymaps')) cb.current.onMode('fake');
      } else if (cb.current.hidden) return;
      else if (m.type === 'press') Keyboard.dismiss();
      else cb.current.onEvent(m);
    };
    window.addEventListener('message', onMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.fill}>
      {createElement('iframe', {
        ref: frame,
        srcDoc: html,
        title: 'map',
        allow: 'geolocation',
        style: { border: 0, width: '100%', height: '100%', display: 'block', background: colors.map },
      })}
      {ready ? null : <View pointerEvents="none" style={styles.fill} />}
      {overlay ? (
        <View pointerEvents="none" style={[styles.focal, { top: insets.top, bottom: insets.bottom, left: insets.left ?? 0 }]}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
}

const styles = themed(() => ({
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.map },
  focal: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
}));
