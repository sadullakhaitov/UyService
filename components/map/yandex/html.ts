// Yandex Maps JS API 2.1 asosidagi xarita sahifasi.
// Bitta HTML: telefonda WebView ichida (MapBase.tsx), brauzerda iframe ichida (MapBase.web.tsx).
// Animatsiyalar (to'lqinlar, miltillash, usta belgisining silliq siljishi) sahifaning o'zida 60 fps'da chiziladi —
// React tomondan faqat holat (props) yuboriladi, har kadrda xabar almashilmaydi.
import type { LatLng } from '@/lib/geo';
import type { MapInsets } from '../types';

/** React → xarita: to'liq holat (har o'zgarishda qayta yuboriladi) */
export type MapState = {
  center: LatLng;
  zoom: number;
  insets: MapInsets;
  nearby: LatLng[];
  blinkNearby: boolean;
  clientMarker: LatLng | null;
  route: LatLng[];
  master: LatLng | null;
  fitTo: LatLng[];
  pulse: { center: LatLng; maxRadiusM: number } | null;
  userLocation: LatLng | null;
  accent: string;
  moveDuration: number;
  /** Tungi rejim va unga mos ranglar — rejim almashganda xarita qayta yuklanmaydi, joyida yangilanadi */
  dark: boolean;
  mapBg: string;
  primary: string;
};

export type MapCommand =
  | { type: 'state'; state: MapState }
  | { type: 'flyTo'; center: LatLng; zoom: number }
  | { type: 'zoomBy'; delta: number };

/** Xarita → React */
export type MapEvent =
  | { type: 'boot' }
  | { type: 'ready' }
  | { type: 'error'; message: string }
  | { type: 'moveStart' }
  | { type: 'moveEnd'; center: LatLng }
  | { type: 'press' };

/** dark — tungi rejim: xarita qatlami filtr bilan qorong'ilashtiriladi (Yandex 2.1 da tungi xarita yo'q) */
export type MapInit = { center: LatLng; zoom: number; flyFrom?: LatLng; insets: MapInsets; dark?: boolean };

// Yandex qo'llaydigan til kodlari (o'zbek tili 2.1 da yo'q — Toshkent ko'chalari rus tilida to'liqroq)
const YANDEX_LANG: Record<string, string> = { uz: 'ru_RU', ru: 'ru_RU', en: 'en_US' };

export const MAP_BASE_URL = 'https://uyservice.uz/';

export function buildMapHtml({ apiKey, lang, init, colors }: { apiKey: string; lang: string; init: MapInit; colors: Record<string, string> }) {
  const src = `https://api-maps.yandex.ru/2.1/?lang=${YANDEX_LANG[lang] ?? 'ru_RU'}${apiKey ? `&apikey=${encodeURIComponent(apiKey)}` : ''}`;
  const boot = JSON.stringify({ init, colors }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body,#map{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:${colors.map}}
*{-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
.ys-dot{position:absolute;border-radius:50%;box-sizing:border-box;border-style:solid;border-color:#fff;box-shadow:0 2px 6px rgba(11,42,36,.28)}
.ys-master{position:absolute;left:-19px;top:-19px;width:38px;height:38px;border-radius:50%;box-sizing:border-box;border:3px solid #fff;
  display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(11,42,36,.32);will-change:transform}
.ys-user{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:#2F80ED;border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 5px rgba(0,0,0,.3)}
.ys-user:before{content:"";position:absolute;left:-12px;top:-12px;width:36px;height:36px;border-radius:50%;background:rgba(47,128,237,.18)}
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
  // Xarita tayyor bo'lguncha kelgan buyruqlar navbatda turadi
  window.__rn = function(cmd){ window.__ys.pending.push(cmd); };
  window.addEventListener('message', function(e){ if (e.data && e.data.__ysmapCmd) window.__rn(e.data.cmd); });
  window.onerror = function(msg){ send({type:'error', message:String(msg)}); };
  send({type:'boot'});
})();
</script>
<script src="${src}" onerror="window.__ys.send({type:'error',message:'script'})"></script>
</head><body><div id="map"></div>
<script>
(function(){
  var ys = window.__ys, send = ys.send, init = ys.BOOT.init, C = ys.BOOT.colors;
  if (typeof ymaps === 'undefined') { send({type:'error', message:'ymaps'}); return; }

  var S = null;              // oxirgi holat
  var map, proj;
  var ll = function(p){ return [p.latitude, p.longitude]; };
  var insets = init.insets;

  // --- Fokus nuqtasi: panellar orasidagi bo'sh joy markazi (pin shu yerda turadi) ---
  function focalShift(){ return (insets.top - insets.bottom) / 2; }
  function focalShiftX(){ return (insets.left || 0) / 2; }
  function viewCenterFor(p, z){
    var g = proj.toGlobalPixels(ll(p), z);
    return proj.fromGlobalPixels([g[0] - focalShiftX(), g[1] - focalShift()], z);
  }
  function focalCenter(){
    var z = map.getZoom(), g = proj.toGlobalPixels(map.getCenter(), z);
    var c = proj.fromGlobalPixels([g[0] + focalShiftX(), g[1] + focalShift()], z);
    return { latitude: c[0], longitude: c[1] };
  }
  var target = null; // oxirgi kamera manzili (animatsiya davomida panel balandligi o'zgarsa kerak)
  function moveTo(p, z, duration){
    target = { p: p, z: z, end: Date.now() + (duration || 0) };
    map.setCenter(viewCenterFor(p, z), z, { duration: duration || 0, timingFunction: 'ease-in-out' });
  }

  // Tungi rejim: faqat xarita qatlami (ko'chalar, binolar) qorong'ilashadi, belgilar o'z rangida qoladi
  var DARK = 'invert(92%) hue-rotate(180deg) saturate(0.55) brightness(0.92) contrast(0.92)';
  function applyDark(){
    try { map.panes.get('ground').getElement().style.filter = init.dark ? DARK : ''; } catch (e) {}
  }

  ymaps.ready(function(){
    try {
      var start = init.flyFrom || init.center, startZoom = init.flyFrom ? 12 : init.zoom;
      map = new ymaps.Map('map', { center: ll(start), zoom: startZoom, controls: [] }, {
        suppressMapOpenBlock: true,
        yandexMapDisablePoiInteractivity: true,
        suppressObsoleteBrowserNotifier: true,
        minZoom: 9, maxZoom: 19
      });
      proj = map.options.get('projection');
      map.behaviors.disable(['rightMouseButtonMagnifier', 'dblClickZoom']);
      moveTo(start, startZoom, 0);
      setup();
      applyDark();
      send({type:'ready'});
      var queued = ys.pending; ys.pending = [];
      window.__rn = apply;
      queued.forEach(apply);
      if (init.flyFrom && !(S && S.fitTo.length)) setTimeout(function(){ moveTo(init.center, init.zoom, 1600); }, 250);
    } catch (e) { send({type:'error', message:String(e && e.message || e)}); }
  });

  // --- Belgilar ---
  var nearbyMarks = [], nearbyEls = [], pulseCircles = [];
  var client = null, user = null, master = null, masterEl = null, routeHalo = null, routeLine = null;
  var masterPos = null, anim = null, heading = 0;

  function htmlLayout(html, onBuild){
    var L = ymaps.templateLayoutFactory.createClass(html, {
      build: function(){ L.superclass.build.call(this); if (onBuild) onBuild(this.getParentElement().querySelector('.ys-dot,.ys-master,.ys-user')); }
    });
    return L;
  }
  function placemark(p, layout, z){
    return new ymaps.Placemark(ll(p), {}, { iconLayout: layout, iconShape: {type:'Circle', coordinates:[0,0], radius:12}, zIndex: z || 100, interactivityModel: 'default#transparent', cursor: 'default' });
  }
  function dot(size, bg, border){
    var h = size / 2;
    return '<div class="ys-dot" style="left:-' + h + 'px;top:-' + h + 'px;width:' + size + 'px;height:' + size + 'px;background:' + bg + ';border-width:' + border + 'px"></div>';
  }
  var ARROW = '<svg width="19" height="19" viewBox="0 0 24 24"><path d="M12 2.5 19.5 20 12 16.2 4.5 20z" fill="#fff"/></svg>';

  function setup(){
    // Bosish → klaviatura yopiladi
    map.events.add('click', function(){ send({type:'press'}); });

    // Foydalanuvchi surishi: barmoq tegdi + xarita harakatlandi → moveStart; ikkalasi tugadi → moveEnd
    // (capture — Yandex hodisani to'xtatsa ham bizga yetib keladi)
    var touching = false, acting = false, moving = false, opt = {passive:true, capture:true};
    function down(){ touching = true; }
    function up(e){ if (e.touches && e.touches.length) return; touching = false; settle(); }
    ['touchstart', 'mousedown', 'pointerdown'].forEach(function(n){ window.addEventListener(n, down, opt); });
    ['touchend', 'touchcancel', 'mouseup', 'pointerup', 'pointercancel'].forEach(function(n){ window.addEventListener(n, up, opt); });
    function begin(){ acting = true; if (touching && !moving) { moving = true; send({type:'moveStart'}); } }
    map.events.add('actionbegin', begin);
    map.events.add('actiontick', begin);
    map.events.add('actionend', function(){ acting = false; settle(); });
    map.events.add('actionbreak', function(){ acting = false; settle(); });
    function settle(){
      if (!moving || touching || acting) return;
      moving = false;
      send({type:'moveEnd', center: focalCenter()});
    }

    requestAnimationFrame(frame);
  }

  // --- Har kadr: to'lqinlar, miltillash, usta belgisi ---
  var DURATION = 4000, GAP = DURATION / 3, t0 = Date.now();
  function frame(){
    var now = Date.now();
    if (S && S.pulse && pulseCircles.length) {
      var t = now - t0;
      for (var i = 0; i < pulseCircles.length; i++) {
        var local = t - i * GAP, c = pulseCircles[i];
        if (local < 0) { c.options.set('visible', false); continue; }
        var p = Math.sin(((local % DURATION) / DURATION) * Math.PI / 2);
        var op = 0.45 * Math.min(1, p * 6) * Math.pow(1 - p, 1.5);
        c.geometry.setRadius(S.pulse.maxRadiusM * (0.08 + 0.92 * p));
        c.options.set({ visible: true, strokeOpacity: op, fillOpacity: op * 0.22 });
      }
    }
    if (S && S.blinkNearby) {
      for (var j = 0; j < nearbyEls.length; j++) {
        if (!nearbyEls[j]) continue;
        var ph = ((now - t0 + j * 700) % 3200) / 3200;
        nearbyEls[j].style.opacity = 0.45 + 0.55 * (0.5 - 0.5 * Math.cos(ph * 2 * Math.PI));
      }
    }
    if (anim && master) {
      var k = Math.min(1, (now - anim.start) / anim.duration);
      masterPos = [anim.from[0] + (anim.to[0] - anim.from[0]) * k, anim.from[1] + (anim.to[1] - anim.from[1]) * k];
      master.geometry.setCoordinates(masterPos);
      if (k >= 1) anim = null;
    }
    requestAnimationFrame(frame);
  }

  function rad(x){ return x * Math.PI / 180; }
  function bearing(a, b){
    var y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
    var x = Math.cos(rad(a[0])) * Math.sin(rad(b[0])) - Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function distM(a, b){
    var dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
    var h = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng/2) * Math.sin(dLng/2);
    return 12742000 * Math.asin(Math.sqrt(h));
  }
  function same(a, b){ return JSON.stringify(a) === JSON.stringify(b); }
  function paintMaster(){
    if (!masterEl || !S) return;
    masterEl.style.background = S.accent;
    masterEl.style.transform = 'rotate(' + heading + 'deg)';
  }

  // --- Holatni xaritaga qo'llash (faqat o'zgargan qismlar) ---
  function apply(cmd){
    try {
      if (cmd.type === 'flyTo') return moveTo(cmd.center, cmd.zoom, 900);
      if (cmd.type === 'zoomBy') {
        var z = Math.max(9, Math.min(19, map.getZoom() + cmd.delta));
        return moveTo(focalCenter(), z, 300);
      }
      if (cmd.type !== 'state') return;
      var prev = S, s = cmd.state;
      S = s;
      // Kunduzgi ↔ tungi: filtr, fon va belgi ranglari joyida almashadi
      if (prev && (prev.dark !== s.dark || prev.primary !== s.primary)) {
        init.dark = s.dark; C.primary = s.primary; applyDark();
        document.documentElement.style.background = document.body.style.background = document.getElementById('map').style.background = s.mapBg;
        prev = Object.assign({}, prev, { nearby: null });
      }
      // Panel balandligi o'zgardi — pin ostidagi nuqta joyida qoladi (Google'dagi mapPadding kabi)
      var keep = null;
      if (prev && !same(prev.insets, s.insets) && !s.fitTo.length) {
        var left = target ? target.end - Date.now() : 0;
        keep = left > 0 ? { p: target.p, z: target.z, d: left } : { p: focalCenter(), z: map.getZoom(), d: 0 };
      }
      insets = s.insets;
      if (keep) moveTo(keep.p, keep.z, keep.d);

      // Atrofdagi ustalar
      if (!prev || !same(prev.nearby, s.nearby)) {
        nearbyMarks.forEach(function(m){ map.geoObjects.remove(m); });
        nearbyMarks = []; nearbyEls = [];
        s.nearby.forEach(function(p, i){
          var m = placemark(p, htmlLayout(dot(16, C.primary, 2.5), function(el){ nearbyEls[i] = el; }), 120);
          nearbyMarks.push(m); map.geoObjects.add(m);
        });
      }
      if (prev && prev.blinkNearby && !s.blinkNearby) nearbyEls.forEach(function(el){ if (el) el.style.opacity = 1; });

      // Qidiruv to'lqinlari (metrda — xarita surilsa nuqtadan ajralmaydi)
      if (!s.pulse) {
        pulseCircles.forEach(function(c){ map.geoObjects.remove(c); }); pulseCircles = [];
      } else {
        if (!pulseCircles.length) {
          if (!prev || !prev.pulse) t0 = Date.now();
          for (var i = 0; i < 3; i++) {
            var c = new ymaps.Circle([ll(s.pulse.center), 1], {}, { strokeWidth: 2, strokeColor: s.accent, fillColor: s.accent, strokeOpacity: 0, fillOpacity: 0, interactivityModel: 'default#transparent', zIndex: 50 });
            pulseCircles.push(c); map.geoObjects.add(c);
          }
        }
        pulseCircles.forEach(function(c){ c.geometry.setCoordinates(ll(s.pulse.center)); c.options.set({ strokeColor: s.accent, fillColor: s.accent }); });
      }

      // Yo'l chizig'i: och hoshiya + yaxlit chiziq
      if (!prev || !same(prev.route, s.route) || prev.accent !== s.accent) {
        // Usta yurganda faqat koordinatalar yangilanadi (chiziq qayta yaratilmaydi — miltillamaydi)
        if (routeHalo && s.route.length > 1 && prev && prev.accent === s.accent) {
          var upd = s.route.map(ll);
          routeHalo.geometry.setCoordinates(upd); routeLine.geometry.setCoordinates(upd);
        } else {
        if (routeHalo) { map.geoObjects.remove(routeHalo); map.geoObjects.remove(routeLine); routeHalo = routeLine = null; }
        if (s.route.length > 1) {
          var pts = s.route.map(ll);
          routeHalo = new ymaps.Polyline(pts, {}, { strokeColor: s.accent, strokeOpacity: 0.25, strokeWidth: 10, interactivityModel: 'default#transparent', zIndex: 60 });
          routeLine = new ymaps.Polyline(pts, {}, { strokeColor: s.accent, strokeOpacity: 1, strokeWidth: 6, interactivityModel: 'default#transparent', zIndex: 61 });
          map.geoObjects.add(routeHalo); map.geoObjects.add(routeLine);
        }
        }
      }

      // Mijoz nuqtasi (to'q sariq)
      if (!prev || !same(prev.clientMarker, s.clientMarker)) {
        if (client) { map.geoObjects.remove(client); client = null; }
        if (s.clientMarker) { client = placemark(s.clientMarker, htmlLayout(dot(22, C.accent, 4)), 150); map.geoObjects.add(client); }
      }

      // Foydalanuvchining haqiqiy joyi (ko'k nuqta)
      if (!s.userLocation) { if (user) { map.geoObjects.remove(user); user = null; } }
      else if (!user) { user = placemark(s.userLocation, htmlLayout('<div class="ys-user"></div>'), 140); map.geoObjects.add(user); }
      else user.geometry.setCoordinates(ll(s.userLocation));

      // Usta belgisi: yangi nuqtaga moveDuration davomida silliq siljiydi, yo'nalishiga buriladi
      if (!s.master) {
        if (master) { map.geoObjects.remove(master); master = null; masterEl = null; masterPos = null; anim = null; }
      } else {
        var to = ll(s.master);
        if (!master) {
          masterPos = to;
          master = placemark(s.master, htmlLayout('<div class="ys-master">' + ARROW + '</div>', function(el){ masterEl = el; paintMaster(); }), 200);
          map.geoObjects.add(master);
        } else if (!same(prev && prev.master, s.master)) {
          var from = masterPos || to;
          if (distM(from, to) > 500) { anim = null; masterPos = to; master.geometry.setCoordinates(to); }
          else if (distM(from, to) > 0.5) { heading = bearing(from, to); anim = { from: from, to: to, start: Date.now(), duration: s.moveDuration }; }
        }
        paintMaster();
      }

      // Kamera
      var fitChanged = !prev || !same(prev.fitTo, s.fitTo) || !same(prev.insets, s.insets);
      if (s.fitTo.length && fitChanged) fit(s);
      else if (prev && prev.zoom !== s.zoom) moveTo(s.center, s.zoom, 4000);
    } catch (e) { send({type:'error', message:String(e && e.message || e)}); }
  }

  function fit(s){
    var m = [s.insets.top + 80, 60, s.insets.bottom + 60, (s.insets.left || 0) + 60];
    if (s.fitTo.length === 1) return moveTo(s.fitTo[0], 16, 800);
    var lats = s.fitTo.map(function(p){ return p.latitude; }), lngs = s.fitTo.map(function(p){ return p.longitude; });
    var b = [[Math.min.apply(null, lats), Math.min.apply(null, lngs)], [Math.max.apply(null, lats), Math.max.apply(null, lngs)]];
    map.setBounds(b, { checkZoomRange: true, zoomMargin: m, duration: 800 }).then(function(){
      if (map.getZoom() > 17) map.setZoom(17, { duration: 300 });
    }, function(){});
  }
})();
</script>
</body></html>`;
}
