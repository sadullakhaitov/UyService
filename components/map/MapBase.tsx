// Xarita (Android/iOS): OpenStreetMap sahifasi (osm/html.ts, MapLibre) WebView ichida. Expo Go'da ham ishlaydi.
// Brauzer uchun: MapBase.web.tsx
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { colors, themed, useScheme } from '@/constants/theme';
import { DEFAULT_ZOOM, type MapBaseProps, type MapHandle } from './types';
import { MAP_BASE_URL, type MapCommand, type MapEvent } from './page';
import { useMapPage } from './useMapPage';

export const MapBase = forwardRef<MapHandle, MapBaseProps>(function MapBase(props, handle) {
  useScheme();
  const { html, json, onEvent } = useMapPage(props);
  const { insets = { top: 0, bottom: 0 }, overlay } = props;
  const web = useRef<WebView>(null);
  const booted = useRef(false);
  const [ready, setReady] = useState(false);

  // Sahifa yuklanmasdan oldingi kamera buyrug'i (masalan, GPS juda tez keldi) — yuklangach yuboriladi
  const early = useRef<MapCommand | null>(null);
  const post = (cmd: MapCommand) => {
    if (!booted.current) {
      if (cmd.type === 'flyTo') early.current = cmd;
      return;
    }
    web.current?.injectJavaScript(`window.__rn(${JSON.stringify(cmd)});true;`);
  };
  const latest = useRef(json);
  latest.current = json;
  const sendState = () => booted.current && web.current?.injectJavaScript(`window.__rn({type:'state',state:${latest.current}});true;`);

  useImperativeHandle(handle, () => ({
    flyTo: (center, zoom = DEFAULT_ZOOM) => post({ type: 'flyTo', center, zoom }),
    panTo: (center) => post({ type: 'panTo', center }),
    zoomBy: (delta) => post({ type: 'zoomBy', delta }),
  }));

  // Holat o'zgarsa — sahifaga yuboramiz (animatsiyalarni sahifaning o'zi chizadi)
  useEffect(() => {
    sendState();
  }, [json]); // eslint-disable-line react-hooks/exhaustive-deps

  // Internet bo'lmasa yoki skript yuklanmasa — biroz kutib qayta urinamiz
  const retry = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reload = () => {
    clearTimeout(retry.current);
    retry.current = setTimeout(() => {
      booted.current = false;
      web.current?.reload();
    }, 4000);
  };
  useEffect(() => () => clearTimeout(retry.current), []);

  const onMessage = (e: WebViewMessageEvent) => {
    let m: MapEvent;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (m.type === 'boot') {
      booted.current = true;
      sendState();
      if (early.current) post(early.current);
      early.current = null;
      clearTimeout(retry.current);
      // 20 s ichida xarita chiqmasa — qayta yuklaymiz
      retry.current = setTimeout(reload, 20_000);
    } else if (m.type === 'ready') {
      clearTimeout(retry.current);
      setReady(true);
    } else if (m.type === 'error') {
      if (!ready && (m.message === 'script' || m.message === 'lib')) reload();
    } else if (m.type === 'press') Keyboard.dismiss();
    else onEvent(m);
  };

  return (
    <View style={styles.fill}>
      <WebView
        ref={web}
        source={{ html, baseUrl: MAP_BASE_URL }}
        originWhitelist={['*']}
        onMessage={onMessage}
        onError={reload}
        style={styles.fill}
        containerStyle={styles.fill}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        textInteractionEnabled={false}
        androidLayerType="hardware"
        cacheEnabled
        // "© OpenStreetMap" havolalari bosilsa — ilova ichida emas, tashqarida ochiladi
        onShouldStartLoadWithRequest={(r) => {
          if (r.isTopFrame === false || /^(about:|data:|blob:)/.test(r.url) || r.url.startsWith(MAP_BASE_URL)) return true;
          Linking.openURL(r.url).catch(() => {});
          return false;
        }}
      />
      {/* Xarita yuklanguncha — tekis fon (oq ekran ko'rinmaydi) */}
      {ready ? null : <View pointerEvents="none" style={styles.fill} />}
      {overlay ? (
        <View pointerEvents="none" style={[styles.focal, { top: insets.top, bottom: insets.bottom }]}>
          {overlay}
        </View>
      ) : null}
    </View>
  );
});

const styles = themed(() => ({
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.map },
  focal: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
}));
