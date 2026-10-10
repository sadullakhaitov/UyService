// Xarita sahifasi: OpenStreetMap ma'lumotlari, ko'chalar — OpenFreeMap (bepul, kalitsiz, cheklovsiz; tijoratda ham mumkin),
// chizuvchi — MapLibre GL JS (ochiq kodli). Xabarlar — page.ts: React → sahifa: state / flyTo / panTo / zoomBy;
// sahifa → React: boot / ready / error / moveStart / moveEnd / press / point.
// Belgilar — DOM (Marker), yo'l — GeoJSON chizig'i, to'lqinlar va fokus nuqtasi (panel orasidagi joy) — o'zimiz hisoblaymiz.
// Pastki burchakdagi "© OpenStreetMap" yozuvi litsenziya talabi — yashirilmaydi.
import { INSET_MS, type MapInit } from '../page';

const MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';
const STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export function buildMapHtml({ lang, init, colors }: { lang: string; init: MapInit; colors: Record<string, string> }) {
  const boot = JSON.stringify({ init, colors, lang, style: STYLE }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="${MAPLIBRE}.css">
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:${colors.map}}
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
.ys-dot{position:absolute;border-radius:50%;box-sizing:border-box;border-style:solid;border-color:#fff;box-shadow:0 2px 6px rgba(11,42,36,.28)}
.ys-pt{cursor:pointer}
.ys-master{position:absolute;left:-19px;top:-19px;width:38px;height:38px;border-radius:50%;box-sizing:border-box;border:3px solid #fff;
  display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(11,42,36,.32);will-change:transform}
.ys-user{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:#2F80ED;border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 5px rgba(0,0,0,.3)}
.ys-user:before{content:"";position:absolute;left:-12px;top:-12px;width:36px;height:36px;border-radius:50%;background:rgba(47,128,237,.18)}
.ys-pulse{position:absolute;border-radius:50%;box-sizing:border-box;border:2px solid;pointer-events:none;will-change:width,height,opacity}
.ys-mk{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none}
.ys-mk.ys-click{pointer-events:auto}
.maplibregl-ctrl-attrib{font:11px/1.4 system-ui,sans-serif}
</style>
<script>
(function(){
  var BOOT = ${boot};
  function send(m){
    try{
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
      else if (window.parent !== window) window.parent.postMessage({__ysmap:true, msg:m}, '*');
    }catch(e){}
  }
  window.__ys = { send: send, BOOT: BOOT, pending: [] };
  window.__rn = function(cmd){ window.__ys.pending.push(cmd); };
  window.addEventListener('message', function(e){ if (e.data && e.data.__ysmapCmd) window.__rn(e.data.cmd); });
  window.onerror = function(msg){ send({type:'error', message:String(msg)}); };
  send({type:'boot'});
})();
</script>
<script src="${MAPLIBRE}.js" onerror="window.__ys.send({type:'error',message:'script'})"></script>
</head><body><div id="map"></div>
<script>
(function(){
  var ys = window.__ys, send = ys.send, init = ys.BOOT.init, C = ys.BOOT.colors;
  // Kutubxona yuklanmadi — MapBase zaxira xaritaga o'tadi / qayta yuklaydi
  if (typeof maplibregl === 'undefined') { send({type:'error', message:'lib'}); return; }

  var S = null, map = null;
  var insets = init.insets;
  var MIN_Z = init.minZoom || 9, MAX_Z = 19;
  var gl = function(p){ return [p.longitude, p.latitude]; };

  // --- Merkator: kenglik/uzunlik ↔ 0..1. Ilovadagi zoom raqamlari 256 px plitka masshtabida (16 — ko'cha, 14 — tuman),
  // MapLibre 512 px plitka bilan ishlaydi — farqi bitta zoom (OFF), chegarada almashtiriladi.
  function mx(lng){ return (lng + 180) / 360; }
  function my(lat){ var s = Math.sin(lat * Math.PI / 180); return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); }
  function lngOf(x){ return x * 360 - 180; }
  function latOf(y){ var n = Math.PI - 2 * Math.PI * y; return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); }
  var W = 256, OFF = 1;
  function getZ(){ return map.getZoom() + OFF; }
  function center(){ var c = map.getCenter(); return [c.lng, c.lat]; }

  // --- Fokus nuqtasi: panellar orasidagi bo'sh joy markazi (pin shu yerda turadi) ---
  function shiftY(){ return (insets.top - insets.bottom) / 2; }
  function shiftX(){ return (insets.left || 0) / 2; }
  function viewCenterFor(p, z){
    var s = W * Math.pow(2, z);
    return [lngOf(mx(p.longitude) - shiftX() / s), latOf(my(p.latitude) - shiftY() / s)];
  }
  function focalCenter(){
    var c = center(), s = W * Math.pow(2, getZ());
    return { latitude: latOf(my(c[1]) + shiftY() / s), longitude: lngOf(mx(c[0]) + shiftX() / s) };
  }
  var target = null;
  function moveTo(p, z, duration){
    target = { p: p, z: z, end: Date.now() + (duration || 0) };
    var d = duration || 0;
    var cam = { center: viewCenterFor(p, z), zoom: z - OFF };
    if (d) { cam.duration = d; map.easeTo(cam); } else map.jumpTo(cam);
  }

  // "© OpenStreetMap" yozuvi (chap pastda; o'ngda tugmalar) pastki panel ostida qolmasin — panel ustida turadi
  var attribCss = document.createElement('style');
  document.head.appendChild(attribCss);
  function placeAttribution(){ attribCss.textContent = '.maplibregl-ctrl-bottom-left{bottom:' + (insets.bottom || 0) + 'px;left:' + (insets.left || 0) + 'px}'; }
  placeAttribution();

  // Tungi rejim: faqat xarita qatlami (canvas) qorong'ilashadi, belgilar (DOM) o'z rangida
  var DARK = 'invert(92%) hue-rotate(180deg) saturate(0.55) brightness(0.92) contrast(0.92)';
  var darkCss = document.createElement('style');
  document.head.appendChild(darkCss);
  function applyDark(){ darkCss.textContent = init.dark ? '.maplibregl-canvas{filter:' + DARK + '}' : ''; }

  try {
    var start = init.flyFrom || init.center, startZoom = init.flyFrom ? 12 : init.zoom;
    map = new maplibregl.Map({
      container: 'map', style: ys.BOOT.style, center: gl(start), zoom: startZoom - OFF,
      minZoom: MIN_Z - OFF, maxZoom: MAX_Z - OFF, attributionControl: false,
      dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: false
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  } catch (e) { send({type:'error', message:'lib'}); return; }

  var readySent = false;
  function onReady(){
    if (readySent) return;
    readySent = true;
    localize();
    moveTo(start, startZoom, 0);
    setup();
    applyDark();
    send({type:'ready'});
    var queued = ys.pending; ys.pending = [];
    window.__rn = apply;
    queued.forEach(apply);
    if (init.flyFrom && !(S && S.fitTo.length)) setTimeout(function(){ moveTo(init.center, init.zoom, 1600); }, 250);
  }
  map.on('load', onReady);

  // Ko'cha va joy nomlari ilova tilida (OSM'da bo'lsa), bo'lmasa — mahalliy nomi
  function localize(){
    try {
      var L = ys.BOOT.lang;
      map.getStyle().layers.forEach(function(l){
        if (l.type !== 'symbol') return;
        var tf = map.getLayoutProperty(l.id, 'text-field');
        if (!tf || JSON.stringify(tf).indexOf('name') < 0) return;
        map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:' + L], ['get', 'name']]);
      });
    } catch (e) {}
  }

  // --- Belgilar: DOM (Marker) — o'lchami va miltillashi o'zimizda; bosilmaydiganlari surishga xalaqit bermaydi ---
  function marker(p, html, z, click){
    var box = document.createElement('div');
    box.className = 'ys-mk' + (click ? ' ys-click' : '');
    box.innerHTML = html;
    var m = new maplibregl.Marker({ element: box, anchor: 'center' }).setLngLat(gl(p)).addTo(map);
    box.style.zIndex = z || 100;
    box.style.pointerEvents = click ? 'auto' : 'none';
    return { __box: box, setCoordinates: function(c){ m.setLngLat(c); }, destroy: function(){ m.remove(); } };
  }
  function el(m, sel){ return m && m.__box ? m.__box.querySelector(sel) : null; }
  function drop(m){ try { if (m) m.destroy(); } catch (e) {} }
  function dot(size, bg, border){
    var h = size / 2;
    return '<div class="ys-dot" style="left:-' + h + 'px;top:-' + h + 'px;width:' + size + 'px;height:' + size + 'px;background:' + bg + ';border-width:' + border + 'px"></div>';
  }
  var ARROW = '<svg width="19" height="19" viewBox="0 0 24 24"><path d="M12 2.5 19.5 20 12 16.2 4.5 20z" fill="#fff"/></svg>';
  function rgba(hex, a){
    var h = String(hex || '#0E5A4B').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h.slice(0, 6), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  var nearbyMarks = [], pulseMarks = [], pointMarks = [];
  var client = null, user = null, master = null;
  var masterPos = null, anim = null, heading = 0;

  function setup(){
    // Bosiladigan nuqtalar (admin xaritasi) — belgining o'zida
    document.addEventListener('click', function(e){
      var t = e.target && e.target.closest ? e.target.closest('[data-pt]') : null;
      if (t) { e.stopPropagation(); send({type:'point', id: t.getAttribute('data-pt')}); }
    }, true);
    map.on('click', function(){ send({type:'press'}); });

    // Foydalanuvchi surishi: barmoq tegdi + xarita harakatlandi → moveStart; ikkalasi tugadi → moveEnd
    var touching = false, acting = false, moving = false, opt = {passive:true, capture:true};
    function down(){ touching = true; }
    function up(e){ if (e.touches && e.touches.length) return; touching = false; settle(); }
    ['touchstart', 'mousedown', 'pointerdown'].forEach(function(n){ window.addEventListener(n, down, opt); });
    ['touchend', 'touchcancel', 'mouseup', 'pointerup', 'pointercancel'].forEach(function(n){ window.addEventListener(n, up, opt); });
    function begin(){ acting = true; if (touching && !moving) { moving = true; send({type:'moveStart'}); } }
    map.on('movestart', begin); map.on('move', begin);
    map.on('moveend', function(){ acting = false; settle(); });
    function settle(){
      if (!moving || touching || acting) return;
      moving = false;
      send({type:'moveEnd', center: focalCenter()});
    }
    requestAnimationFrame(frame);
  }

  // --- Har kadr: to'lqinlar (metrda), miltillash, usta belgisining silliq siljishi ---
  var DURATION = 4000, GAP = DURATION / 3, t0 = Date.now();
  function metersToPx(lat, m){ return m / (Math.cos(lat * Math.PI / 180) * 40075016.686 / (W * Math.pow(2, getZ()))); }
  function frame(){
    var now = Date.now();
    try {
      if (S && S.pulse && pulseMarks.length) {
        var t = now - t0;
        for (var i = 0; i < pulseMarks.length; i++) {
          var d = el(pulseMarks[i], '.ys-pulse');
          if (!d) continue;
          var local = t - i * GAP;
          if (local < 0) { d.style.opacity = 0; continue; }
          var p = Math.sin(((local % DURATION) / DURATION) * Math.PI / 2);
          var op = 0.45 * Math.min(1, p * 6) * Math.pow(1 - p, 1.5);
          var r = metersToPx(S.pulse.center.latitude, S.pulse.maxRadiusM * (0.08 + 0.92 * p));
          d.style.width = d.style.height = (2 * r) + 'px';
          d.style.left = d.style.top = (-r) + 'px';
          d.style.borderColor = rgba(S.accent, op);
          d.style.background = rgba(S.accent, op * 0.22);
          d.style.opacity = 1;
        }
      }
      if (S && S.blinkNearby) {
        for (var j = 0; j < nearbyMarks.length; j++) {
          var n = el(nearbyMarks[j], '.ys-dot');
          if (!n) continue;
          var ph = ((now - t0 + j * 700) % 3200) / 3200;
          n.style.opacity = 0.45 + 0.55 * (0.5 - 0.5 * Math.cos(ph * 2 * Math.PI));
        }
      }
      if (anim && master) {
        var k = Math.min(1, (now - anim.start) / anim.duration);
        masterPos = [anim.from[0] + (anim.to[0] - anim.from[0]) * k, anim.from[1] + (anim.to[1] - anim.from[1]) * k];
        master.setCoordinates(masterPos);
        if (k >= 1) anim = null;
      }
    } catch (e) {}
    requestAnimationFrame(frame);
  }

  function rad(x){ return x * Math.PI / 180; }
  // [lng, lat] juftliklari
  function bearing(a, b){
    var y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
    var x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function distM(a, b){
    var dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
    var h = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng/2) * Math.sin(dLng/2);
    return 12742000 * Math.asin(Math.sqrt(h));
  }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function paintMaster(){
    var m = el(master, '.ys-master');
    if (!m || !S) return;
    m.style.background = S.accent;
    m.style.transform = 'rotate(' + heading + 'deg)';
  }

  // Yo'l: bitta GeoJSON manba, ikki chiziq (yumshoq halo + asosiy). Yangilanganda ma'lumot joyida almashadi — miltillamaydi
  function line(pts){ return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts } }; }
  function drawRoute(s){
    var data = line(s.route.length > 1 ? s.route.map(gl) : []);
    var src = map.getSource('ys-route');
    if (!src) {
      map.addSource('ys-route', { type: 'geojson', data: data });
      var lay = { 'line-join': 'round', 'line-cap': 'round' };
      map.addLayer({ id: 'ys-route-halo', type: 'line', source: 'ys-route', layout: lay, paint: { 'line-color': s.accent, 'line-opacity': 0.25, 'line-width': 10 } });
      map.addLayer({ id: 'ys-route-line', type: 'line', source: 'ys-route', layout: lay, paint: { 'line-color': s.accent, 'line-width': 6 } });
    } else {
      src.setData(data);
      map.setPaintProperty('ys-route-halo', 'line-color', s.accent);
      map.setPaintProperty('ys-route-line', 'line-color', s.accent);
    }
  }

  function apply(cmd){
    try {
      if (cmd.type === 'flyTo') return moveTo(cmd.center, cmd.zoom, 900);
      if (cmd.type === 'panTo') return moveTo(cmd.center, getZ(), 800);
      if (cmd.type === 'zoomBy') {
        var z = Math.max(MIN_Z, Math.min(MAX_Z, getZ() + cmd.delta));
        return moveTo(focalCenter(), z, 300);
      }
      if (cmd.type !== 'state') return;
      var prev = S, s = cmd.state;
      S = s;
      if (prev && (prev.dark !== s.dark || prev.primary !== s.primary)) {
        init.dark = s.dark; C.primary = s.primary; applyDark();
        document.documentElement.style.background = document.body.style.background = document.getElementById('map').style.background = s.mapBg;
        prev = Object.assign({}, prev, { nearby: null });
      }
      var keep = null;
      if (prev && !same(prev.insets, s.insets) && !s.fitTo.length) {
        var left = target ? target.end - Date.now() : 0;
        // Panel ochilib-yopilganda xarita sakramaydi — pin (Focal.tsx) bilan bir xil vaqtda silliq siljiydi
        keep = left > 0 ? { p: target.p, z: target.z, d: Math.max(left, ${INSET_MS}) } : { p: focalCenter(), z: getZ(), d: ${INSET_MS} };
      }
      insets = s.insets;
      placeAttribution();
      if (keep) moveTo(keep.p, keep.z, keep.d);

      if (!prev || !same(prev.nearby, s.nearby)) {
        nearbyMarks.forEach(drop); nearbyMarks = [];
        s.nearby.forEach(function(p){ nearbyMarks.push(marker(p, dot(16, C.primary, 2.5), 120)); });
      }
      if (!prev || !same(prev.points, s.points)) {
        pointMarks.forEach(drop); pointMarks = [];
        (s.points || []).forEach(function(p){
          var size = p.size || 16, h = size / 2;
          var html = '<div class="ys-dot ys-pt" data-pt="' + String(p.id).replace(/"/g, '') + '" style="left:-' + h + 'px;top:-' + h + 'px;width:' + size + 'px;height:' + size + 'px;background:' + p.color + ';border-width:2.5px"></div>';
          pointMarks.push(marker(p.location, html, 130, true));
        });
      }
      if (prev && prev.blinkNearby && !s.blinkNearby) nearbyMarks.forEach(function(m){ var n = el(m, '.ys-dot'); if (n) n.style.opacity = 1; });

      if (!s.pulse) {
        pulseMarks.forEach(drop); pulseMarks = [];
      } else {
        if (!pulseMarks.length) {
          if (!prev || !prev.pulse) t0 = Date.now();
          for (var i = 0; i < 3; i++) pulseMarks.push(marker(s.pulse.center, '<div class="ys-pulse" style="opacity:0"></div>', 50));
        } else if (!same(prev && prev.pulse && prev.pulse.center, s.pulse.center)) {
          pulseMarks.forEach(function(m){ m.setCoordinates(gl(s.pulse.center)); });
        }
      }

      if (!prev || !same(prev.route, s.route) || prev.accent !== s.accent) {
        drawRoute(s);
      }

      if (!prev || !same(prev.clientMarker, s.clientMarker)) {
        drop(client); client = null;
        if (s.clientMarker) client = marker(s.clientMarker, dot(22, C.accent, 4), 150);
      }

      if (!s.userLocation) { drop(user); user = null; }
      else if (!user) user = marker(s.userLocation, '<div class="ys-user"></div>', 140);
      else user.setCoordinates(gl(s.userLocation));

      if (!s.master) {
        drop(master); master = null; masterPos = null; anim = null;
      } else {
        var to = gl(s.master);
        if (!master) {
          masterPos = to;
          master = marker(s.master, '<div class="ys-master">' + ARROW + '</div>', 200);
        } else if (!same(prev && prev.master, s.master)) {
          var from = masterPos || to;
          if (distM(from, to) > 500) { anim = null; masterPos = to; master.setCoordinates(to); }
          else if (distM(from, to) > 0.5) { heading = bearing(from, to); anim = { from: from, to: to, start: Date.now(), duration: s.moveDuration }; }
        }
        setTimeout(paintMaster, 0);
      }

      var fitChanged = !prev || !same(prev.fitTo, s.fitTo) || !same(prev.insets, s.insets);
      if (s.fitTo.length && fitChanged) fit(s);
      else if (prev && prev.zoom !== s.zoom) moveTo(s.center, s.zoom, 4000);
    } catch (e) { send({type:'error', message:String(e && e.message || e)}); }
  }

  // Bir nechta nuqtani sig'dirish (usta + mijoz): panellar orasidagi bo'sh joyga, zoom ≤ 17
  function fit(s){
    if (s.fitTo.length === 1) return moveTo(s.fitTo[0], 16, 800);
    var box = document.getElementById('map');
    var availW = Math.max(80, box.clientWidth - (s.insets.left || 0) - 120);
    var availH = Math.max(80, box.clientHeight - s.insets.top - s.insets.bottom - 140);
    var xs = s.fitTo.map(function(p){ return mx(p.longitude); }), yss = s.fitTo.map(function(p){ return my(p.latitude); });
    var dx = Math.max(1e-9, Math.max.apply(null, xs) - Math.min.apply(null, xs));
    var dy = Math.max(1e-9, Math.max.apply(null, yss) - Math.min.apply(null, yss));
    var z = Math.log(Math.min(availW / (dx * W), availH / (dy * W))) / Math.LN2;
    z = Math.max(MIN_Z, Math.min(17, z));
    var cx = (Math.max.apply(null, xs) + Math.min.apply(null, xs)) / 2, cy = (Math.max.apply(null, yss) + Math.min.apply(null, yss)) / 2;
    moveTo({ latitude: latOf(cy), longitude: lngOf(cx) }, z, 800);
  }
})();
</script>
</body></html>`;
}
