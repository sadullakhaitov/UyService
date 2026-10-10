// UyService — Reels videolari (1080×1920, 30 fps, MP4) — ssenariy: instagram/PROFIL.md, 6-bo'lim.
// Har kadr brauzerda chiziladi (render(t)), keyin ffmpeg bilan videoga yig'iladi. Ovoz yo'q — musiqani Instagram'ning o'zida qo'shing.
//   QR_MOD=<yo'l>/node_modules/qrcode PW=<yo'l>/node_modules/playwright node design/marketing/reels.js [reel-1|reel-2]
// Matn faqat xavfsiz oraliqda: y 250–1450, x 90–900 (pastda va o'ngda Instagram tugmalari turadi).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require(process.env.PW || 'playwright');
const { C, CO, CATS, icon, mark, logo, phone, doc } = require('./build.js');

const FPS = 30;
const W = 1080;
const H = 1920;

// ---------- Kadrlar dvigateli (sahifa ichida ishlaydi) ----------
// <section data-s="3" data-e="6"> — sahna vaqti (s); ichida [data-a="up 0.3"] — animatsiya turi va kechikish.
const ENGINE = `
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const outCubic = (x) => 1 - Math.pow(1 - x, 3);
const outBack = (x) => { const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const inOut = (x) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
window.hooks = [];
window.timeline = () => {
  const ev = [];
  document.querySelectorAll('section').forEach((s) => {
    const a = +s.dataset.s; if (a > 0) ev.push({ t: a - 0.15, k: 'whoosh' });
    s.querySelectorAll('[data-a]').forEach((el) => {
      const [kind, d = '0'] = el.dataset.a.split(' ');
      if (kind === 'pop') ev.push({ t: a + +d, k: 'pop' });
      if (kind === 'rise') ev.push({ t: a + +d, k: 'rise' });
    });
  });
  return ev;
};
window.render = (t) => {
  document.querySelectorAll('section').forEach((s) => {
    const a = +s.dataset.s, b = +s.dataset.e, last = s.hasAttribute('data-last');
    const vin = clamp((t - a) / 0.28), vout = last ? 1 : clamp((b - t) / 0.28);
    const on = t >= a - 0.01 && (last || t <= b + 0.01);
    s.style.display = on ? 'flex' : 'none';
    if (!on) return;
    s.style.opacity = Math.min(vin, vout);
    s.style.transform = 'translateY(' + ((1 - vout) * -40) + 'px)';
    s.querySelectorAll('[data-a]').forEach((el) => {
      const [kind, d = '0', dur = '0.55'] = el.dataset.a.split(' ');
      const p = clamp((t - a - +d) / +dur);
      const e = outCubic(p);
      if (kind === 'up') { el.style.opacity = e; el.style.transform = 'translateY(' + (1 - e) * 70 + 'px)'; }
      else if (kind === 'down') { el.style.opacity = e; el.style.transform = 'translateY(' + (e - 1) * 70 + 'px)'; }
      else if (kind === 'left') { el.style.opacity = e; el.style.transform = 'translateX(' + (1 - e) * 120 + 'px)'; }
      else if (kind === 'pop') { el.style.opacity = clamp(p * 2); el.style.transform = 'scale(' + (0.4 + 0.6 * outBack(p)) + ')'; }
      else if (kind === 'fade') { el.style.opacity = e; }
      else if (kind === 'rise') { el.style.opacity = e; el.style.transform = 'translateY(' + (1 - e) * 900 + 'px)'; }
    });
  });
  window.hooks.forEach((h) => h(t));
};
`;

const CSS = `
body{margin:0;width:${W}px;height:${H}px;overflow:hidden}
.page{position:relative;width:${W}px;height:${H}px;overflow:hidden}
section{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;padding:260px 90px 0;text-align:center}
.h{font-weight:800;letter-spacing:-4px;line-height:1.02}
.sub{font-weight:700;line-height:1.3}
.em{color:${C.orange}}
.tag{display:inline-flex;align-items:center;gap:18px;border-radius:70px;padding:24px 44px;font-size:48px;font-weight:800}
.tile{width:400px;border-radius:44px;padding:34px 30px;display:flex;flex-direction:column;align-items:center;gap:16px;font-size:44px;font-weight:800}
`;

// ---------- Reel 1: "UyService nima?" ----------
// Sahna uzunliklari (s); ovozli versiyada — har gap uzunligiga qarab (VOICE_JSON)
const R1_DEFAULT = [3.1, 3.1, 3.1, 3.3, 3.4, 3.3, 3.3, 2.4, 4];
const R1_MIN = [2.6, 2.6, 2.6, 3.0, 3.4, 3.0, 2.6, 2.2, 3.6];
function reel1(voice) {
  const G = C.green;
  const len = voice ? voice.durations.map((d, i) => Math.max(R1_MIN[i], +(d + 0.75).toFixed(2))) : R1_DEFAULT;
  if (voice) len[8] = +(voice.durations[8] + 1.8).toFixed(2);
  const st = len.reduce((a, d, i) => (a.push(i ? a[i - 1] + len[i - 1] : 0), a), []).map((x) => +x.toFixed(2));
  const S = (i) => `data-s="${st[i]}" data-e="${i < 8 ? st[i + 1] : st[i] + len[i]}"`;
  const total = +(st[8] + len[8]).toFixed(2);
  const tiles = CATS.map(([ic, ink, tint, uz], i) => `<div class="tile" data-a="pop ${0.35 + i * 0.12}" id="tile${i}" style="background:${tint};color:${ink}">${icon(ic, ink, 90, 2)}${uz}</div>`).join('');
  // Xarita sahnasi: soddalashtirilgan ko'chalar, mijoz nuqtasi, usta yo'l bo'ylab keladi
  const streets = [
    'M-50 520 H1130', 'M-50 900 H1130', 'M-50 1260 H1130', 'M220 300 V1500', 'M560 300 V1500', 'M880 300 V1500',
    'M-50 360 L1130 700', 'M380 1500 L1130 1050',
  ].map((d) => `<path d="${d}" stroke="#FFFFFF" stroke-width="34" stroke-linecap="round" fill="none"/>`).join('');
  const route = 'M880 1380 V900 H560 V520 H300';
  const body = `
  <section ${S(0)} style="background:${G};color:#fff">
    <div data-a="pop 0" style="width:230px;height:230px;border-radius:115px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center">${icon('droplets', C.orange, 130, 2)}</div>
    <div class="h" data-a="up 0.15" style="margin-top:80px;font-size:132px">Uyda kran<br>oqsa,</div>
    <div class="h" data-a="up 0.6" style="margin-top:20px;font-size:112px;color:${C.orange}">kimga qo'ng'iroq qilasiz?</div>
  </section>

  <section ${S(1)} style="background:#fff;color:${C.ink}">
    <div class="h" data-a="up 0" style="font-size:120px">Tanishingizga.</div>
    <div style="margin-top:90px;display:flex;align-items:center;gap:26px">${[0, 1, 2]
      .map((i) => `<div data-a="pop ${0.5 + i * 0.45}" style="width:210px;height:210px;border-radius:105px;background:${C.mint};display:flex;align-items:center;justify-content:center">${icon('phone-call', G, 100, 2)}</div>${i < 2 ? `<div data-a="fade ${0.75 + i * 0.45}">${icon('arrow-right', C.muted, 70, 2.6)}</div>` : ''}`)
      .join('')}</div>
    <div class="h" data-a="up 1.4" style="margin-top:90px;font-size:96px;color:${C.ink2}">U esa boshqa<br>tanishiga…</div>
  </section>

  <section ${S(2)} style="background:${G};color:#fff">
    <div data-a="pop 0">${logo(66, true)}</div>
    <div class="h" data-a="up 0.3" style="margin-top:70px;font-size:104px">Biz buni bitta<br><span class="em">tugmaga</span> aylantirdik</div>
    <div data-a="rise 0.5 0.8" style="margin-top:70px">${phone('home', 420)}</div>
  </section>

  <section ${S(3)} style="background:${C.page};color:${C.ink}">
    <div class="h" data-a="up 0" style="font-size:112px">Muammoni<br>tanlang</div>
    <div style="margin-top:80px;display:grid;grid-template-columns:400px 400px;gap:26px">${tiles}</div>
  </section>

  <section ${S(4)} style="background:${C.page};color:${C.ink};padding:0">
    <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">
      <rect width="${W}" height="${H}" fill="#E9EEEB"/>${streets}
      <path id="r1route" d="${route}" stroke="${C.green}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      <circle id="r1pulse" cx="300" cy="520" r="40" fill="${C.orange}" opacity=".25"/>
      <circle cx="300" cy="520" r="30" fill="${C.orange}" stroke="#fff" stroke-width="10"/>
      <g id="r1master"><circle r="52" fill="${C.green}" stroke="#fff" stroke-width="10"/><g transform="translate(-30 -30)">${icon('wrench', '#FFFFFF', 60, 2.4)}</g></g>
    </svg>
    <div data-a="down 0" style="position:relative;margin-top:240px;background:#fff;border-radius:50px;padding:40px 56px;box-shadow:0 20px 60px rgba(11,42,36,.15)">
      <div class="h" style="font-size:84px;letter-spacing:-2px">Eng yaqin usta keladi</div>
      <div class="sub" id="r1eta" style="margin-top:14px;font-size:46px;color:${C.green}">xaritada kelayotganini ko'rasiz</div>
    </div>
  </section>

  <section ${S(5)} style="background:#fff;color:${C.ink}">
    <div class="h" data-a="up 0" style="font-size:96px">Usta ko'rib<br>narx aytadi</div>
    <div class="sub" data-a="up 0.35" style="margin-top:30px;font-size:52px;color:${C.green}">siz ilovada tasdiqlaysiz</div>
    <div data-a="rise 0.4 0.8" style="margin-top:70px;position:relative">${phone('price', 440)}
      <div id="r1tap" style="position:absolute;left:50%;top:70%;width:140px;height:140px;margin:-70px 0 0 -70px;border-radius:70px;background:rgba(232,119,46,.35);opacity:0"></div></div>
  </section>

  <section ${S(6)} style="background:${G};color:#fff">
    <div class="sub" data-a="up 0" style="font-size:60px;color:#BFE0D6">Chaqiruv</div>
    <div class="h" id="r1count" style="margin-top:10px;font-size:250px;letter-spacing:-10px;color:${C.orange};font-variant-numeric:tabular-nums">0</div>
    <div class="h" data-a="up 0.2" style="font-size:96px">so'm</div>
    <div data-a="up 1.3" class="tag" style="margin-top:80px;background:rgba(255,255,255,.12)">${icon('check', C.orange, 52, 3)}Ish qilinsa — narx ichida</div>
  </section>

  <section ${S(7)} style="background:#fff;color:${C.ink}">
    <div data-a="pop 0" style="width:330px;height:330px;border-radius:90px;background:${C.mint};display:flex;align-items:center;justify-content:center">${icon('shield-check', G, 200, 1.8)}</div>
    <div class="h" data-a="up 0.25" style="margin-top:70px;font-size:190px;letter-spacing:-8px;color:${G}">30 kun</div>
    <div class="h" data-a="up 0.4" style="font-size:96px">kafolat</div>
  </section>

  <section ${S(8)} data-last style="background:${G};color:#fff">
    <div class="h" data-a="up 0" style="font-size:104px">Keyingi safar<br>kran oqsa —</div>
    <div class="h" data-a="up 0.45" style="margin-top:20px;font-size:104px;color:${C.orange}">kimga qo'ng'iroq qilasiz?</div>
    <div data-a="pop 1.2" style="margin-top:110px">${logo(78, true)}</div>
    <div data-a="up 1.5" class="tag" style="margin-top:60px;background:#fff;color:${G}">${icon('link', G, 48, 2.6)}${CO.site}</div>
    <div class="sub" data-a="fade 1.9" style="margin-top:34px;font-size:42px;color:#BFE0D6">Havola — profilda</div>
  </section>`;

  const js = `
  const route = document.getElementById('r1route'), len = route.getTotalLength();
  const m = document.getElementById('r1master'), eta = document.getElementById('r1eta');
  const pulse = document.getElementById('r1pulse'), cnt = document.getElementById('r1count'), tap = document.getElementById('r1tap');
  route.style.strokeDasharray = len;
  hooks.push((t) => {
    // xarita: usta yo'l bo'ylab, yo'l chizig'i orqada qisqaradi
    const p = inOut(clamp((t - (${st[4]} + 0.3)) / (${len[4]} - 0.6)));
    const at = route.getPointAtLength(p * len);
    m.setAttribute('transform', 'translate(' + at.x + ' ' + at.y + ')');
    route.style.strokeDashoffset = -p * len;
    const ph = ((t * 1.2) % 1);
    pulse.setAttribute('r', 40 + ph * 90); pulse.setAttribute('opacity', 0.35 * (1 - ph));
    const min = Math.max(1, Math.ceil(5 * (1 - p)));
    eta.textContent = p >= 1 ? 'Usta yetib keldi' : 'Usta yo\\'lda · ' + min + ' daq';
    // kategoriya: santexnik bosiladi
    const s = clamp((t - (${st[3] + len[3]} - 1.1)) / 0.5), tile = document.getElementById('tile0');
    if (tile) tile.style.boxShadow = s > 0 ? '0 0 0 ' + (10 * s) + 'px ${C.green}' : 'none';
    // narx: "Roziman" bosiladi
    const q = clamp((t - (${st[5] + len[5]} - 1.1)) / 0.6);
    tap.style.opacity = q > 0 && q < 1 ? 1 - q : 0; tap.style.transform = 'scale(' + (0.4 + q * 1.4) + ')';
    // hisoblagich 0 → 50 000
    const c = outCubic(clamp((t - (${st[6]} + 0.2)) / 1.1));
    cnt.textContent = (Math.round(c * 50) * 1000).toLocaleString('ru-RU').replace(/\\u00a0/g, ' ');
  });`;
  // Ovoz effektlari uchun maxsus hodisalar (s)
  const events = [
    { t: st[3] + len[3] - 1.1, k: 'tap' },
    { t: st[4] + 0.3, k: 'go' },
    { t: st[4] + len[4] - 0.3, k: 'arrive' },
    { t: st[5] + len[5] - 1.1, k: 'tap' },
    { t: st[6] + 0.2, k: 'count', d: 1.1 },
    { t: st[6] + 1.3, k: 'ding' },
    { t: st[7] + 0.05, k: 'success' },
    { t: st[8] + 1.2, k: 'brand' },
  ];
  for (let x = 0.15; x < len[0] - 0.3; x += 0.8) events.push({ t: x, k: 'drop' });
  return { name: voice ? 'reel-1-uyservice-nima-ovozli' : 'reel-1-uyservice-nima', duration: total, body, js, events, starts: st };
}

// ---------- Reel 2: "Kran oqyaptimi?" ----------
function reel2() {
  const B = '#0B6FB8', BD = '#0B3E66', BT = '#E3F1FB';
  const drops = (id, n, x0, y0) => Array.from({ length: n }, (_, i) => `<path class="${id}" data-i="${i}" d="M0 -26 C0 -26 -16 -4 -16 6 A16 16 0 0 0 16 6 C16 -4 0 -26 0 -26 Z" fill="${B}" transform="translate(${x0} ${y0})"/>`).join('');
  const body = `
  <section data-s="0" data-e="3.3" style="background:${BT};color:${BD}">
    <svg width="300" height="420" viewBox="0 0 300 420" data-a="pop 0">
      <path d="M40 60 H200 a40 40 0 0 1 40 40 V150" stroke="${C.ink2}" stroke-width="44" fill="none" stroke-linecap="round"/>
      <rect x="20" y="30" width="60" height="60" rx="14" fill="${C.ink2}"/>${drops('d1', 4, 240, 210)}
    </svg>
    <div class="h" data-a="up 0.2" style="margin-top:40px;font-size:150px;letter-spacing:-6px">Kran<br>oqyaptimi?</div>
    <div class="sub" data-a="up 0.7" style="margin-top:40px;font-size:58px;color:${B}">Ustani chaqirishdan oldin<br>shuni qiling</div>
  </section>

  <section data-s="3.3" data-e="7.3" style="background:#fff;color:${C.ink}">
    <div data-a="pop 0" style="width:150px;height:150px;border-radius:46px;background:${BT};color:${B};display:flex;align-items:center;justify-content:center;font-size:90px;font-weight:800">1</div>
    <div class="h" data-a="up 0.15" style="margin-top:50px;font-size:104px">Umumiy suv<br>kranini toping</div>
    <div class="sub" data-a="up 0.45" style="margin-top:30px;font-size:52px;color:${C.ink2}">odatda hisoblagich oldida</div>
    <svg width="900" height="420" viewBox="0 0 900 420" data-a="up 0.6" style="margin-top:70px">
      <rect x="0" y="180" width="900" height="70" rx="20" fill="#C9D3D8"/>
      <circle cx="610" cy="215" r="110" fill="#fff" stroke="${C.ink2}" stroke-width="16"/><circle cx="610" cy="215" r="66" fill="${BT}"/>
      <text x="610" y="232" text-anchor="middle" font-size="46" font-weight="800" fill="${BD}" font-family="Manrope">m³</text>
      <rect x="240" y="150" width="130" height="130" rx="24" fill="${C.ink2}"/>
      <g id="r2arrow"><path d="M305 40 V120" stroke="${C.orange}" stroke-width="16" stroke-linecap="round"/><path d="M270 90 L305 125 L340 90" stroke="${C.orange}" stroke-width="16" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>
      <rect x="160" y="196" width="290" height="38" rx="19" fill="${C.orange}"/>
    </svg>
  </section>

  <section data-s="7.3" data-e="10.6" style="background:#fff;color:${C.ink}">
    <div class="h" data-a="up 0" style="font-size:112px">Oxirigacha<br>burang</div>
    <svg width="900" height="620" viewBox="0 0 900 620" style="margin-top:80px">
      <rect x="0" y="260" width="900" height="70" rx="20" fill="#C9D3D8"/>
      <rect x="385" y="230" width="130" height="130" rx="24" fill="${C.ink2}"/>
      <g id="r2lever" transform="rotate(0 450 295)"><rect x="305" y="276" width="290" height="38" rx="19" fill="${C.orange}"/><circle cx="450" cy="295" r="30" fill="#fff"/></g>
      ${drops('d2', 4, 860, 420)}
    </svg>
    <div class="tag" id="r2stop" style="margin-top:20px;background:${C.mint};color:${C.green};opacity:0">${icon('check', C.green, 54, 3)}Suv to'xtadi</div>
  </section>

  <section data-s="10.6" data-e="13.8" style="background:${BT};color:${BD}">
    <div data-a="pop 0" style="width:150px;height:150px;border-radius:46px;background:#fff;color:${B};display:flex;align-items:center;justify-content:center;font-size:90px;font-weight:800">2</div>
    <div class="h" data-a="up 0.15" style="margin-top:50px;font-size:100px">Polni arting,<br>chelak qo'ying</div>
    <svg width="560" height="620" viewBox="0 0 560 620" data-a="up 0.4" style="margin-top:50px">
      <path d="M280 0 V80" stroke="${C.ink2}" stroke-width="40" stroke-linecap="round"/>
      ${drops('d3', 3, 280, 130)}
      <clipPath id="bk"><path d="M90 300 H470 L430 600 H130 Z"/></clipPath>
      <rect id="r2water" x="80" y="560" width="400" height="60" fill="${B}" opacity=".55" clip-path="url(#bk)"/>
      <path d="M90 300 H470 L430 600 H130 Z" fill="none" stroke="${BD}" stroke-width="18" stroke-linejoin="round"/>
      <path d="M120 300 C120 200 440 200 440 300" fill="none" stroke="${BD}" stroke-width="12"/>
    </svg>
    <div class="sub" data-a="fade 1.2" style="margin-top:10px;font-size:46px;color:${B}">pastdagi qo'shni rahmat aytadi</div>
  </section>

  <section data-s="13.8" data-e="16.1" style="background:${C.green};color:#fff">
    <svg width="380" height="380" viewBox="0 0 380 380" data-a="pop 0">
      <circle cx="190" cy="190" r="160" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="30"/>
      <circle id="r2ring" cx="190" cy="190" r="160" fill="none" stroke="${C.orange}" stroke-width="30" stroke-linecap="round" transform="rotate(-90 190 190)"/>
      <text x="190" y="220" text-anchor="middle" font-size="96" font-weight="800" fill="#fff" font-family="Manrope">2</text>
    </svg>
    <div class="h" data-a="up 0.2" style="margin-top:70px;font-size:128px">Hammasi<br><span class="em">2 daqiqa</span></div>
  </section>

  <section data-s="16.1" data-e="19.6" style="background:#fff;color:${C.ink}">
    <div class="h" data-a="up 0" style="font-size:104px">Endi ustani<br>chaqiring</div>
    <div class="sub" data-a="up 0.3" style="margin-top:30px;font-size:50px;color:${C.green}">eng yaqin santexnik keladi,<br>narx ishdan oldin aytiladi</div>
    <div data-a="rise 0.4 0.8" style="margin-top:60px">${phone('home', 400)}</div>
  </section>

  <section data-s="19.6" data-e="23" data-last style="background:${C.green};color:#fff">
    <div class="h" data-a="up 0" style="font-size:112px">Kran oqsa —</div>
    <div class="h" data-a="up 0.4" style="margin-top:16px;font-size:112px;color:${C.orange}">avval kranni<br>yoping</div>
    <div data-a="pop 1.1" style="margin-top:110px">${logo(78, true)}</div>
    <div data-a="up 1.4" class="tag" style="margin-top:60px;background:#fff;color:${C.green}">${icon('link', C.green, 48, 2.6)}${CO.site}</div>
    <div class="sub" data-a="fade 1.8" style="margin-top:34px;font-size:42px;color:#BFE0D6">Saqlab qo'ying · qo'shningizga yuboring</div>
  </section>`;

  const js = `
  const fall = (cls, t, y0, dist, period, stopAt) => document.querySelectorAll('.' + cls).forEach((d) => {
    const i = +d.dataset.i, n = document.querySelectorAll('.' + cls).length;
    const tt = t + (i / n) * period;
    const born = Math.floor(tt / period) * period - (i / n) * period;
    const ph = (tt % period) / period;
    const x = d.getAttribute('transform').match(/translate\\(([\\d.]+)/)[1];
    const show = stopAt == null || born < stopAt;
    d.setAttribute('transform', 'translate(' + x + ' ' + (y0 + ph * dist) + ')');
    d.setAttribute('opacity', show ? (ph < 0.85 ? 1 : (1 - ph) / 0.15) : 0);
  });
  const lever = document.getElementById('r2lever'), stop = document.getElementById('r2stop');
  const arrow = document.getElementById('r2arrow'), water = document.getElementById('r2water'), ring = document.getElementById('r2ring');
  const L = 2 * Math.PI * 160; ring.style.strokeDasharray = L;
  hooks.push((t) => {
    fall('d1', t, 190, 220, 0.9);
    // kran yopiladi: 8.2 → 9.0 s, keyin tomchilar to'xtaydi
    const r = inOut(clamp((t - 8.2) / 0.8));
    lever.setAttribute('transform', 'rotate(' + r * 90 + ' 450 295)');
    fall('d2', t, 400, 200, 0.7, 8.6);
    stop.style.opacity = clamp((t - 9.1) / 0.4);
    arrow.setAttribute('transform', 'translate(0 ' + Math.sin(t * 6) * 12 + ')');
    fall('d3', t, 110, 380, 0.8);
    const lv = clamp((t - 10.8) / 3);
    water.setAttribute('y', 560 - lv * 120); water.setAttribute('height', 60 + lv * 120);
    ring.style.strokeDashoffset = L * (1 - outCubic(clamp((t - 14) / 1.6)));
  });`;
  return { name: 'reel-2-kran-oqyapti', duration: 23, body, js };
}

async function build(reel, b) {
  const html = doc(reel.name, CSS, `<div class="page">${reel.body}</div><script>${ENGINE}${reel.js}</script>`);
  const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  if (process.env.EVENTS_OUT) {
    const ev = [...(await page.evaluate(() => window.timeline())), ...(reel.events || [])].sort((x, y) => x.t - y.t);
    fs.writeFileSync(process.env.EVENTS_OUT, JSON.stringify({ duration: reel.duration, starts: reel.starts, events: ev }, null, 1));
  }
  // STILLS=1.5,4 — video o'rniga shu soniyalardagi kadrlar (tekshirish uchun)
  if (process.env.STILLS) {
    for (const t of process.env.STILLS.split(',').map(Number)) {
      await page.evaluate((x) => window.render(x), t);
      await page.screenshot({ path: path.join(process.env.STILLS_DIR || os.tmpdir(), `${reel.name}-${t}.jpg`), type: 'jpeg', quality: 80 });
    }
    await page.close();
    return;
  }
  const tmp = fs.mkdtempSync(path.join(process.env.REEL_TMP || os.tmpdir(), 'reel-'));
  const n = Math.round(reel.duration * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    await page.screenshot({ path: path.join(tmp, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 95 });
  }
  await page.close();
  const out = process.env.VIDEO_OUT || path.join(__dirname, 'instagram', `${reel.name}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, '%05d.jpg'),
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('✓', path.relative(process.cwd(), out), `${reel.duration} s`);
}

(async () => {
  const want = process.argv[2];
  const voice = process.env.VOICE_JSON ? JSON.parse(fs.readFileSync(process.env.VOICE_JSON, 'utf8')) : null;
  const reels = (voice ? [reel1(voice)] : [reel1(), reel2()]).filter((r) => !want || r.name.startsWith(want));
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  for (const r of reels) await build(r, b);
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
