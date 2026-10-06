// Yandex xaritasi (brauzer / Telegram Mini App): o'sha xarita sahifasi iframe ichida.
// Yandex skripti yuklanmasa (masalan, tashqi skriptlar taqiqlangan demo sahifada) — soxta xarita (FakeMap).
import { createElement, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { colors, themed } from '@/constants/theme';
import { FakeMap } from './FakeMap';
import { DEFAULT_ZOOM, type MapBaseProps, type MapHandle } from './types';
import type { MapCommand, MapEvent } from './yandex/html';
import { useYandexMap } from './yandex/useYandexMap';

export const MapBase = forwardRef<MapHandle, MapBaseProps>(function MapBase(props, handle) {
  const [mode, setMode] = useState<'loading' | 'yandex' | 'fake'>('loading');
  if (mode === 'fake') return <FakeMap ref={handle} {...props} />;
  return <YandexFrame {...props} handle={handle} ready={mode === 'yandex'} onMode={setMode} />;
});

type FrameProps = MapBaseProps & {
  handle: React.ForwardedRef<MapHandle>;
  ready: boolean;
  onMode: (m: 'yandex' | 'fake') => void;
};

function YandexFrame({ handle, ready, onMode, ...props }: FrameProps) {
  const { html, json, onEvent } = useYandexMap(props);
  const { insets = { top: 0, bottom: 0 }, overlay } = props;
  const frame = useRef<HTMLIFrameElement | null>(null);
  const booted = useRef(false);
  const latest = useRef(json);
  latest.current = json;

  const post = (cmd: MapCommand) => {
    if (booted.current) frame.current?.contentWindow?.postMessage({ __ysmapCmd: true, cmd }, '*');
  };
  const sendState = () => post({ type: 'state', state: JSON.parse(latest.current) });

  useImperativeHandle(handle, () => ({
    flyTo: (center, zoom = DEFAULT_ZOOM) => post({ type: 'flyTo', center, zoom }),
    zoomBy: (delta) => post({ type: 'zoomBy', delta }),
  }));

  useEffect(() => {
    sendState();
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps

  const cb = useRef({ onEvent, onMode, ready });
  cb.current = { onEvent, onMode, ready };
  useEffect(() => {
    // 8 s ichida xarita chiqmasa — soxta xaritaga o'tamiz
    const timer = setTimeout(() => !cb.current.ready && cb.current.onMode('fake'), 8000);
    const onMessage = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.__ysmap) return;
      const m = e.data.msg as MapEvent;
      if (m.type === 'boot') {
        booted.current = true;
        sendState();
      } else if (m.type === 'ready') {
        clearTimeout(timer);
        cb.current.onMode('yandex');
      } else if (m.type === 'error') {
        if (!cb.current.ready && (m.message === 'script' || m.message === 'ymaps')) cb.current.onMode('fake');
      } else if (m.type === 'press') Keyboard.dismiss();
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
        <View pointerEvents="none" style={[styles.focal, { top: insets.top, bottom: insets.bottom }]}>
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
