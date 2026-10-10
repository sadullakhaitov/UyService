// UyService — reklama to'plami: bosma (PDF, bosmaxonaga) + PNG (ko'rish, ijtimoiy tarmoqlar) + logotiplar.
// Matn, rang yoki o'lchamni o'zgartirish — shu faylda, keyin qayta yig'ing:
//   QR_MOD=<yo'l>/node_modules/qrcode PW=<yo'l>/node_modules/playwright node design/marketing/build.js
// (qrcode va playwright — loyiha paketi emas, alohida o'rnatiladi: `npm i qrcode playwright` boshqa papkada)
// Ilova ekranlari — screens/*.png (haqiqiy ilovadan olingan suratlar).
const fs = require('fs');
const path = require('path');
const QR = require(process.env.QR_MOD || 'qrcode');
const { chromium } = require(process.env.PW || 'playwright');

const ROOT = path.resolve(__dirname, '../..');
const OUT = __dirname;
const nm = (p) => path.join(ROOT, 'node_modules', p);

// ---------- Brend ----------
const C = {
  green: '#0E5A4B',
  green2: '#0B4A3E',
  mint: '#E3EFEB',
  orange: '#E8772E',
  peach: '#FDEBDD',
  ink: '#0B2A24',
  ink2: '#4E625C',
  muted: '#7A8C86',
  page: '#F6F8F7',
  line: '#CFD9D5',
};
const CO = {
  site: 'uyservice.uz',
  bot: '@uyservice_bot',
  phone: '+998 90 121 88 87',
  hours: '08:00–22:00',
  email: 'support@uyservice.uz',
};
const URL_CLIENT = 'https://uyservice.uz';
const URL_MASTER = 'https://uyservice.uz/usta';
const URL_BOT = 'https://t.me/uyservice_bot';

const b64 = (f) => fs.readFileSync(f).toString('base64');
const FONTS = `
@font-face{font-family:Manrope;font-weight:500;src:url(data:font/ttf;base64,${b64(nm('@expo-google-fonts/manrope/500Medium/Manrope_500Medium.ttf'))})}
@font-face{font-family:Manrope;font-weight:600;src:url(data:font/ttf;base64,${b64(nm('@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf'))})}
@font-face{font-family:Manrope;font-weight:700;src:url(data:font/ttf;base64,${b64(nm('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'))})}
@font-face{font-family:Manrope;font-weight:800;src:url(data:font/ttf;base64,${b64(nm('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'))})}
@font-face{font-family:Unbounded;font-weight:700;src:url(data:font/ttf;base64,${b64(nm('@expo-google-fonts/unbounded/700Bold/Unbounded_700Bold.ttf'))})}`;

// lucide ikonkasi → SVG (ilovadagi bilan bir xil)
function icon(name, color, size = 28, stroke = 2) {
  const src = fs.readFileSync(nm(`lucide-react-native/dist/esm/icons/${name}.mjs`), 'utf8');
  const at = src.indexOf('const __iconData = ') + 'const __iconData = '.length;
  const obj = src.slice(at, src.indexOf('};', at) + 1);
  // eslint-disable-next-line no-new-func
  const parts = new Function(`return (${obj}).node`)();
  const inner = parts
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// Belgi: pin ichida uy (design/logo/uyservice-mark.svg)
const MARK_PATHS = (pin, house) =>
  `<path d="M50 6 C29 6 14 21.5 14 41 C14 65 50 94 50 94 C50 94 86 65 86 41 C86 21.5 71 6 50 6 Z" fill="${pin}"/><path d="M32 45 L50 29 L68 45" fill="none" stroke="${house}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M37 42 V58 a3 3 0 0 0 3 3 H60 a3 3 0 0 0 3 -3 V42" fill="none" stroke="${house}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="45.5" y="47" width="9" height="14" rx="2.5" fill="${C.orange}"/>`;
const mark = (pin = C.green, house = '#FFFFFF', size = 44) => `<svg width="${size}" height="${size}" viewBox="0 0 100 100" style="display:block;flex:none">${MARK_PATHS(pin, house)}</svg>`;
// Yozuv: "Uy" yashil (rangli fonda — to'q sariq) + "Service"
const word = (size, dark = false) =>
  `<span class="word" style="font-size:${size}px;color:${dark ? '#FFFFFF' : C.ink}"><b style="color:${dark ? C.orange : C.green}">Uy</b>Service</span>`;
const logo = (size, dark = false) => `<div class="brand" style="gap:${Math.round(size * 0.35)}px">${mark(dark ? '#FFFFFF' : C.green, dark ? C.green : '#FFFFFF', Math.round(size * 1.75))}${word(size, dark)}</div>`;

const CATS = [
  ['droplets', '#0B6FB8', '#E3F1FB', 'Santexnik', 'Сантехник'],
  ['zap', '#8A6500', '#FFF6D6', 'Elektrik', 'Электрик'],
  ['air-vent', '#0E7490', '#E0F4F8', 'Konditsioner', 'Кондиционер'],
  ['armchair', '#7A4B23', '#F5ECE3', 'Mebel', 'Мебель'],
  ['paint-roller', '#5B3A9B', '#EFE8FA', "Ta'mirlash", 'Ремонт'],
  ['washing-machine', '#3F5A6B', '#E8EEF2', 'Maishiy texnika', 'Бытовая техника'],
];
const FACTS = [
  ['map-pin', 'Eng yaqin usta', "xaritada kelayotganini ko'rib turasiz", 'Ближайший мастер — видно на карте'],
  ['wallet', "Chaqiruv — 50 000 so'm", 'ish qilinsa — narx ichida', 'Вызов 50 000 сум — входит в цену работы'],
  ['handshake', 'Narx oldindan', 'ish boshlanishidan oldin tasdiqlaysiz', 'Цена согласуется до начала работы'],
  ['shield-check', '30 kun kafolat', 'bajarilgan ish uchun', 'Гарантия 30 дней на работу'],
];

const BASE = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:transparent}
body{font-family:Manrope,system-ui,sans-serif;color:${C.ink};-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-font-smoothing:antialiased}
.page{position:relative;overflow:hidden}
.brand{display:flex;align-items:center}
.word{font-family:Unbounded,sans-serif;font-weight:700;letter-spacing:-.02em;line-height:1;white-space:nowrap}
.word b{font-weight:700}
.qr svg{width:100%;height:100%;display:block}
em{font-style:normal;color:${C.orange}}
`;

const qrSvg = (url, dark = C.ink) => QR.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'Q', color: { dark, light: '#FFFFFF' } });

// Telefon ramkasi + ilova ekrani (screens/*.png)
function phone(shot, w) {
  const f = path.join(OUT, 'screens', `${shot}.png`);
  const img = fs.existsSync(f) ? `<img src="data:image/png;base64,${b64(f)}" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block">` : `<div style="width:100%;height:100%;background:${C.page}"></div>`;
  const h = Math.round(w * 2.05);
  const r = Math.round(w * 0.16);
  const pad = Math.round(w * 0.035);
  return `<div style="flex:none;width:${w}px;height:${h}px;border-radius:${r}px;background:#0B1512;padding:${pad}px;box-shadow:0 ${w * 0.08}px ${w * 0.2}px rgba(11,42,36,.28), inset 0 0 0 ${Math.max(1, w * 0.006)}px #2A3A35">
    <div style="position:relative;width:100%;height:100%;border-radius:${r - pad}px;overflow:hidden;background:#fff">${img}
      <div style="position:absolute;top:${w * 0.03}px;left:50%;transform:translateX(-50%);width:${w * 0.3}px;height:${w * 0.085}px;border-radius:${w}px;background:#0B1512"></div>
    </div></div>`;
}

const doc = (title, css, body) => `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${title}</title><style>${FONTS}${BASE}${css}</style></head><body>${body}</body></html>`;

// ====================================================================================
// BOSMA — o'lchamlar mm; `bleed` — bosmaxona uchun chetdan tashqari 2 mm (kesiladi)
// ====================================================================================
async function printDocs() {
  const qrC = await qrSvg(URL_CLIENT);
  const qrM = await qrSvg(URL_MASTER);
  const qrB = await qrSvg(URL_BOT);
  const docs = [];

  // ---------- 1) A3 afisha (do'kon, podyezd, lift) ----------
  docs.push({
    name: 'print/afisha-a3',
    mm: [297, 420],
    html: doc('UyService — afisha A3', `
@page{size:297mm 420mm;margin:0}
.page{width:297mm;height:420mm;background:#fff;display:flex;flex-direction:column}
.hero{background:${C.green};color:#fff;padding:18mm 20mm 13mm;position:relative}
.hero h1{margin-top:12mm;font-size:100px;line-height:.98;font-weight:800;letter-spacing:-3px}
.hero .ru{margin-top:6mm;font-size:32px;font-weight:700;color:#BFE0D6}
.hero .pin{position:absolute;right:-30mm;top:18mm;opacity:.08}
.cats{padding:10mm 20mm 0;display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}
.cat{display:flex;align-items:center;gap:16px;padding:6mm;border-radius:24px}
.cat b{display:block;font-size:25px;font-weight:800}
.cat span{display:block;font-size:17px;font-weight:600;opacity:.75;margin-top:2px}
.facts{padding:10mm 20mm 0;display:grid;grid-template-columns:1fr 1fr;gap:7mm 12mm}
.fact{display:flex;gap:16px;align-items:flex-start}
.fact .ic{flex:none;width:68px;height:68px;border-radius:20px;background:${C.mint};display:flex;align-items:center;justify-content:center}
.fact b{display:block;font-size:27px;font-weight:800;line-height:1.15}
.fact span{display:block;font-size:19px;color:${C.ink2};font-weight:500;line-height:1.35;margin-top:2px}
.fact i{display:block;font-style:normal;font-size:16px;color:${C.muted};font-weight:600;margin-top:3px}
.cta{margin:auto 20mm 12mm;display:flex;gap:14mm;align-items:center;background:${C.page};border:3px solid ${C.green};border-radius:32px;padding:10mm 12mm}
.qr{flex:none;width:80mm;height:80mm;padding:5mm;background:#fff;border-radius:20px;border:2px solid ${C.line}}
.cta h2{font-size:46px;line-height:1.05;font-weight:800;letter-spacing:-1px}
.cta p{margin-top:5mm;font-size:22px;line-height:1.45;color:${C.ink2};font-weight:600}
.cta p b{color:${C.green};font-weight:800}
.foot{padding:0 20mm 12mm;display:flex;justify-content:space-between;font-size:18px;font-weight:700;color:${C.ink2}}
`, `<div class="page">
<div class="hero">${logo(34, true)}
  <div class="pin">${mark('#FFFFFF', C.green, 520)}</div>
  <h1>Uyda nimadir<br><em>buzildimi?</em></h1>
  <div class="ru">Что-то сломалось дома? Вызовите ближайшего мастера</div>
</div>
<div class="cats">${CATS.map(([ic, ink, tint, uz, ru]) => `<div class="cat" style="background:${tint};color:${ink}">${icon(ic, ink, 44, 2.1)}<div><b>${uz}</b><span>${ru}</span></div></div>`).join('')}</div>
<div class="facts">${FACTS.map(([ic, a, b, ru]) => `<div class="fact"><div class="ic">${icon(ic, C.green, 34, 2.2)}</div><div><b>${a}</b><span>${b}</span><i>${ru}</i></div></div>`).join('')}</div>
<div class="cta"><div class="qr">${qrC}</div>
  <div><h2>Kamerani QR-kodga<br>qarating — usta<br>chaqiring</h2>
  <p>Ilova o'rnatish shart emas: <b>${CO.site}</b><br>Telegram'da: <b>${CO.bot}</b><br>Наведите камеру на QR-код</p></div>
</div>
<div class="foot"><span>${CO.phone} · ${CO.hours}</span><span>${CO.email}</span></div>
</div>`),
  });

  // ---------- 2) A6 tarqatma varaqa, ikki tomonlama ----------
  docs.push({
    name: 'print/varaqa-a6',
    mm: [105, 148],
    html: doc('UyService — tarqatma varaqa A6', `
@page{size:105mm 148mm;margin:0}
.page{width:105mm;height:148mm;page-break-after:always;display:flex;flex-direction:column}
.f{background:${C.green};color:#fff;padding:8mm 7mm 7mm}
.f h1{margin-top:9mm;font-size:34px;line-height:1;font-weight:800;letter-spacing:-1px}
.f .ru{margin-top:3mm;font-size:12.5px;font-weight:700;color:#BFE0D6}
.f .chips{margin-top:6mm;display:flex;flex-wrap:wrap;gap:2mm}
.f .chip{display:flex;align-items:center;gap:5px;background:rgba(255,255,255,.12);border-radius:20px;padding:1.6mm 3mm;font-size:11px;font-weight:700}
.f .facts{margin-top:7mm;display:flex;flex-direction:column;gap:2.6mm}
.f .fi{display:flex;gap:7px;align-items:center;font-size:11.5px;font-weight:700}
.f .fi span{font-weight:500;opacity:.8}
.f .price{margin-top:auto;display:flex;align-items:flex-end;justify-content:space-between}
.f .price b{display:block;font-size:30px;font-weight:800;letter-spacing:-.5px}
.f .price span{display:block;font-size:11px;font-weight:600;color:#BFE0D6}
.b{background:#fff;padding:7mm}
.b h2{font-size:17px;font-weight:800}
.why{margin-top:5mm;background:${C.page};border-radius:10px;padding:3.5mm 4mm;font-size:11px;font-weight:600;color:${C.ink2};line-height:1.5}
.why b{color:${C.ink};font-weight:800}
.steps{margin-top:4mm;display:flex;flex-direction:column;gap:3mm}
.step{display:flex;gap:8px;align-items:flex-start}
.step .n{flex:none;width:22px;height:22px;border-radius:11px;background:${C.peach};color:#B4561A;font-weight:800;font-size:12px;display:flex;align-items:center;justify-content:center}
.step b{display:block;font-size:13.5px;font-weight:800}
.step span:not(.n){display:block;font-size:11px;color:${C.ink2};font-weight:500;line-height:1.4}
.steps{gap:4.2mm !important}
.qrrow{margin-top:auto;display:flex;gap:5mm;align-items:center;padding-top:4mm;border-top:1.5px dashed ${C.line}}
.qr{flex:none;width:30mm;height:30mm;padding:2mm;border:2px solid ${C.green};border-radius:10px}
.qrrow b{display:block;font-size:13px;font-weight:800;color:${C.green}}
.qrrow span{display:block;font-size:10.5px;color:${C.ink2};font-weight:600;line-height:1.45;margin-top:1mm}
.strip{margin:4mm -7mm -7mm;background:${C.peach};padding:3mm 7mm;font-size:10.5px;font-weight:700;color:#8A3F0F}
`, `<div class="page f">${logo(15, true)}
  <h1>Usta —<br>bir bosishda</h1>
  <div class="ru">Мастер на дом в один клик</div>
  <div class="chips">${CATS.map(([ic, , , uz]) => `<span class="chip">${icon(ic, '#FFFFFF', 13, 2.2)}${uz}</span>`).join('')}</div>
  <div class="facts">${FACTS.slice(0, 3).concat([FACTS[3]]).filter((f) => f[0] !== 'wallet').map(([ic, a, b]) => `<div class="fi">${icon(ic, C.orange, 15, 2.4)}<div>${a}<br><span>${b}</span></div></div>`).join('')}</div>
  <div class="price"><div><span>Chaqiruv · Вызов</span><b>50 000 so'm</b><span>ish qilinsa — narx ichida</span></div>${icon('shield-check', C.orange, 46, 1.8)}</div>
</div>
<div class="page b"><h2>Qanday ishlaydi? · Как это работает</h2>
  <div class="steps">
    <div class="step"><span class="n">1</span><div><b>Muammoni tanlang</b><span>kran oqyapti, rozetka ishlamayapti… · Выберите проблему</span></div></div>
    <div class="step"><span class="n">2</span><div><b>Eng yaqin usta keladi</b><span>xaritada kelayotganini ko'rasiz · Мастер едет — видно на карте</span></div></div>
    <div class="step"><span class="n">3</span><div><b>Narxni tasdiqlaysiz</b><span>usta ko'rib narx aytadi, rozi bo'lsangiz — ish · Цена до начала работы</span></div></div>
    <div class="step"><span class="n">4</span><div><b>Naqd to'laysiz, 30 kun kafolat</b><span>ish tugagach baholaysiz · Оплата после работы, гарантия</span></div></div>
  </div>
  <div class="why"><b>Kim uchun?</b> Butun O'zbekiston bo'ylab: qayerda bo'lsangiz, o'sha atrofdagi ustalar. Rozi bo'lmasangiz — faqat chaqiruv (50 000).<br><b>Для кого?</b> По всему Узбекистану — мастера рядом с вами.</div>
  <div class="qrrow"><div class="qr">${qrC}</div><div><b>${CO.site}</b><span>Telegram: ${CO.bot}<br>${CO.phone}<br>${CO.hours}</span></div></div>
  <div class="strip">Ustamisiz? Buyurtmalar oling: ${CO.site}/usta</div>
</div>`),
  });

  // ---------- 3) Vizitkalar 90×50 (+2 mm bleed), ikki tomonlama: mijoz va usta uchun ----------
  const BL = 2;
  const card = (name, title, front, back) => ({
    name,
    mm: [90 + BL * 2, 50 + BL * 2],
    html: doc(title, `
@page{size:${90 + BL * 2}mm ${50 + BL * 2}mm;margin:0}
.page{width:${90 + BL * 2}mm;height:${50 + BL * 2}mm;page-break-after:always;padding:${BL + 4.5}mm}
.g{background:${C.green};color:#fff}
.w{background:#fff}
.row{display:flex;gap:4mm;align-items:center;height:100%}
.qr{flex:none;width:31mm;height:31mm;padding:1.6mm;background:#fff;border-radius:7px;border:1.5px solid ${C.line}}
.t b{display:block;font-size:13px;font-weight:800;line-height:1.2}
.t span{display:block;font-size:9px;font-weight:600;color:${C.ink2};line-height:1.45;margin-top:1.2mm}
.t i{display:flex;align-items:center;gap:4px;font-style:normal;font-size:9px;font-weight:700;color:${C.green};margin-top:1.4mm}
`, front + back),
  });
  docs.push(
    card(
      'print/vizitka-mijoz',
      'UyService — vizitka (mijozlar uchun)',
      `<div class="page g" style="display:flex;flex-direction:column;justify-content:space-between">${logo(15, true)}
        <div><div style="font-size:19px;font-weight:800;line-height:1.1;letter-spacing:-.3px">Uyga usta chaqirish</div>
        <div style="margin-top:1.5mm;font-size:9.5px;font-weight:600;color:#BFE0D6">Santexnik · Elektrik · Konditsioner · Mebel · Ta'mirlash · Maishiy texnika</div></div>
        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:800"><span>${CO.site}</span><span style="color:${C.orange}">${CO.phone}</span></div></div>`,
      `<div class="page w"><div class="row"><div class="qr">${qrC}</div><div class="t">
        <b>Skanerlang —<br>usta keladi</b>
        <span>Chaqiruv 50 000 so'm (ish qilinsa — narx ichida). Narx oldindan, 30 kun kafolat.</span>
        <i>${icon('send', C.green, 11, 2.4)}${CO.bot}</i><i>${icon('clock', C.green, 11, 2.4)}${CO.hours}</i></div></div></div>`,
    ),
    card(
      'print/vizitka-usta',
      'UyService — vizitka (ustalar uchun)',
      `<div class="page w" style="display:flex;flex-direction:column;justify-content:space-between;border-top:${BL + 3}mm solid ${C.orange}">${logo(15)}
        <div><div style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#B4561A">USTALAR UCHUN</div>
        <div style="margin-top:1mm;font-size:19px;font-weight:800;line-height:1.1;letter-spacing:-.3px">Buyurtmalar o'zi keladi</div></div>
        <div style="font-size:10px;font-weight:800;color:${C.green}">${CO.site}/usta</div></div>`,
      `<div class="page g"><div class="row"><div class="qr">${qrM}</div><div class="t">
        <b style="color:#fff">Usta bo'lib<br>ishlang</b>
        <span style="color:#CFE3DD">Ro'yxatdan o'tish — bepul. Narxni o'zingiz aytasiz. Obuna yoki komissiya — o'zingiz tanlaysiz.</span>
        <i style="color:${C.orange}">${icon('send', C.orange, 11, 2.4)}${CO.bot}</i><i style="color:${C.orange}">${icon('phone', C.orange, 11, 2.4)}${CO.phone}</i></div></div></div>`,
    ),
  );

  // ---------- 4) Eshik osmasi 100×210 (teshik — 34 mm) ----------
  docs.push({
    name: 'print/eshik-osmasi',
    mm: [100, 210],
    html: doc('UyService — eshik osmasi', `
@page{size:100mm 210mm;margin:0}
.page{width:100mm;height:210mm;page-break-after:always;display:flex;flex-direction:column;align-items:center;padding:0 7mm 7mm;text-align:center}
.hole{margin-top:9mm;width:34mm;height:34mm;border-radius:50%;border:1.5px dashed ${C.muted};position:relative;flex:none}
.hole:after{content:'';position:absolute;left:50%;top:-9mm;width:10mm;height:9mm;transform:translateX(-50%);border-left:1.5px dashed ${C.muted};border-right:1.5px dashed ${C.muted}}
.g{background:${C.green};color:#fff}
h1{margin-top:8mm;font-size:30px;line-height:1.02;font-weight:800;letter-spacing:-.8px}
.ru{margin-top:2mm;font-size:12px;font-weight:700;opacity:.8}
.qr{margin-top:7mm;width:44mm;height:44mm;padding:2.5mm;background:#fff;border-radius:12px;border:2px solid ${C.line}}
.list{margin-top:6mm;display:flex;flex-direction:column;gap:2.4mm;text-align:left;width:100%}
.li{display:flex;gap:7px;align-items:center;font-size:11.5px;font-weight:700}
.bot{margin-top:auto;font-size:11px;font-weight:800}
`, `<div class="page g"><div class="hole" style="border-color:rgba(255,255,255,.6)"></div>
  <div style="margin-top:6mm">${logo(15, true)}</div>
  <h1>Qo'shni,<br>usta kerakmi?</h1><div class="ru">Соседи, нужен мастер?</div>
  <div class="qr">${qrC}</div>
  <div class="list">${FACTS.map(([ic, a, b]) => `<div class="li">${icon(ic, C.orange, 16, 2.4)}<span>${a} — <span style="font-weight:500;opacity:.85">${b}</span></span></div>`).join('')}</div>
  <div class="bot">${CO.site} · ${CO.bot}</div></div>
<div class="page" style="background:#fff"><div class="hole"></div>
  <div style="margin-top:7mm;font-size:12px;font-weight:800;letter-spacing:1.6px;color:#B4561A">USTALAR UCHUN · ДЛЯ МАСТЕРОВ</div>
  <h1 style="font-size:26px">Qo'lingiz gul bo'lsa —<br>buyurtma biz<br>tomondan</h1>
  <div class="ru" style="color:${C.ink2}">Работайте мастером — заказы рядом с домом</div>
  <div class="qr" style="border-color:${C.green}">${qrM}</div>
  <div class="list">${[['map-pin', 'Yaqin atrofdagi buyurtmalar'], ['badge-check', "Ro'yxatdan o'tish — bepul"], ['hand-coins', "Narxni o'zingiz aytasiz"], ['send', "Telegram'da ham ishlaydi"]].map(([ic, a]) => `<div class="li">${icon(ic, C.green, 16, 2.4)}${a}</div>`).join('')}</div>
  <div class="bot" style="color:${C.green}">${CO.site}/usta · ${CO.phone}</div></div>`),
  });

  // ---------- 5) QR stikerlar 70×70 (+2 mm bleed) — lift, eshik, kassa ----------
  const sticker = (name, title, qr, top, bottom, bg, fg) => ({
    name,
    mm: [70 + BL * 2, 70 + BL * 2],
    html: doc(title, `
@page{size:${70 + BL * 2}mm ${70 + BL * 2}mm;margin:0}
.page{width:${70 + BL * 2}mm;height:${70 + BL * 2}mm;background:${bg};color:${fg};padding:${BL + 4}mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center}
.qr{width:40mm;height:40mm;padding:2mm;background:#fff;border-radius:10px}
.t{font-size:15px;font-weight:800;line-height:1.1}
.s{font-size:9.5px;font-weight:700;opacity:.85}
`, `<div class="page"><div class="t">${top}</div><div class="qr">${qr}</div><div><div class="brand" style="justify-content:center;gap:5px">${mark(fg === '#FFFFFF' ? '#FFFFFF' : C.green, fg === '#FFFFFF' ? C.green : '#FFFFFF', 18)}${word(10, fg === '#FFFFFF')}</div><div class="s" style="margin-top:1mm">${bottom}</div></div></div>`),
  });
  docs.push(
    sticker('print/stiker-mijoz', 'UyService — QR stiker (mijoz)', qrC, 'Usta kerakmi?<br><span style="font-size:11px;font-weight:700;opacity:.8">Нужен мастер?</span>', `${CO.site} · ${CO.bot}`, C.green, '#FFFFFF'),
    sticker('print/stiker-usta', 'UyService — QR stiker (usta)', qrM, "Usta bo'lib ishlang<br><span style=\"font-size:11px;font-weight:700;color:#B4561A\">Работайте мастером</span>", `${CO.site}/usta`, '#FFFFFF', C.ink),
    sticker('print/stiker-telegram', 'UyService — QR stiker (Telegram)', qrB, "Telegram'da usta<br><span style=\"font-size:11px;font-weight:700;opacity:.8\">Мастер в Telegram</span>", CO.bot, '#229ED9', '#FFFFFF'),
  );

  // ---------- 6) Roll-up 85×200 sm ----------
  docs.push({
    name: 'print/rollup-85x200',
    mm: [850, 2000],
    preview: 0.35,
    html: doc('UyService — roll-up 85×200', `
@page{size:850mm 2000mm;margin:0}
.page{width:850mm;height:2000mm;background:${C.green};color:#fff;display:flex;flex-direction:column;padding:100mm 70mm 0}
h1{margin-top:100mm;font-size:380px;line-height:.93;font-weight:800;letter-spacing:-12px}
.ru{margin-top:36mm;font-size:120px;font-weight:700;color:#BFE0D6}
.rf{margin-top:60mm;display:flex;flex-direction:column;gap:26mm}
.rf div{display:flex;gap:60px;align-items:center;font-size:100px;font-weight:800;line-height:1.2}
.rf span{font-weight:500;opacity:.8}
.cats{margin-top:70mm;display:grid;grid-template-columns:1fr 1fr;gap:24mm}
.cat{display:flex;align-items:center;gap:60px;background:rgba(255,255,255,.1);border-radius:100px;padding:28mm 30mm}
.cat b{font-size:104px;font-weight:800;line-height:1.05}
.cta{margin:auto -70mm 0;background:#fff;color:${C.ink};padding:60mm 70mm 80mm;display:flex;gap:60mm;align-items:center;border-radius:120px 120px 0 0}
.qr{flex:none;width:280mm;height:280mm}
.cta h2{font-size:190px;line-height:1;font-weight:800;letter-spacing:-5px}
.cta p{margin-top:30mm;font-size:100px;font-weight:700;color:${C.ink2};line-height:1.35}
.cta p b{color:${C.green};font-weight:800}
`, `<div class="page">${logo(170, true)}
  <h1>Uyga<br>usta —<br><em>tez va<br>ishonchli</em></h1>
  <div class="ru">Мастер на дом — быстро и надёжно</div>
  <div class="cats">${CATS.map(([ic, , , uz]) => `<div class="cat">${icon(ic, C.orange, 160, 2)}<b>${uz}</b></div>`).join('')}</div>
  <div class="rf">${FACTS.filter((f) => f[0] !== 'wallet').map(([ic, a, b]) => `<div>${icon(ic, C.orange, 130, 2.2)}<p>${a}<br><span>${b}</span></p></div>`).join('')}</div>
  <div class="cta"><div class="qr">${qrC}</div><div><h2>Skanerlang —<br>usta chaqiring</h2><p>Chaqiruv <b>50 000 so'm</b><br>30 kun kafolat<br><b>${CO.site}</b></p></div></div>
</div>`),
  });

  // ---------- 7) Ko'cha banneri 300×100 sm ----------
  docs.push({
    name: 'print/banner-300x100',
    mm: [3000, 1000],
    preview: 0.18,
    html: doc('UyService — banner 300×100', `
@page{size:3000mm 1000mm;margin:0}
.page{width:3000mm;height:1000mm;background:${C.green};color:#fff;display:flex;align-items:center;padding:0 130mm;gap:120mm}
.l{flex:1}
h1{margin-top:70mm;font-size:820px;line-height:.9;font-weight:800;letter-spacing:-24px}
.ru{margin-top:50mm;font-size:180px;font-weight:700;color:#BFE0D6}
.r{flex:none;display:flex;gap:90mm;align-items:center;background:#fff;color:${C.ink};border-radius:160px;padding:80mm}
.qr{width:620mm;height:620mm}
.r h2{font-size:300px;line-height:1;font-weight:800;letter-spacing:-6px}
.r p{margin-top:50mm;font-size:190px;font-weight:800;color:${C.green}}
`, `<div class="page"><div class="l">${logo(320, true)}<h1>Uyga usta<br><em>bir bosishda</em></h1><div class="ru">Сантехник · Электрик · Кондиционер · Мебель · Ремонт · Техника</div></div>
<div class="r"><div class="qr">${qrC}</div><div><h2>Skanerlang</h2><p>${CO.site}</p><p style="margin-top:20mm;color:${C.orange}">${CO.phone}</p></div></div></div>`),
  });

  return docs;
}

// ====================================================================================
// INSTAGRAM — post 1080×1350, story 1080×1920, avatar 1080×1080, highlight 1080×1920
// ====================================================================================
async function socialDocs() {
  const qrC = await qrSvg(URL_CLIENT);
  const qrM = await qrSvg(URL_MASTER);
  const docs = [];
  const px = (name, w, h, css, body) => ({ name, px: [w, h], html: doc(name, `.page{width:${w}px;height:${h}px}${css}`, `<div class="page">${body}</div>`) });

  const SOC = `
.g{background:${C.green};color:#fff}
.k{font-size:30px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:${C.orange}}
.h{font-weight:800;letter-spacing:-3px;line-height:.98}
.sub{font-weight:600;line-height:1.4}
.pill{display:inline-flex;align-items:center;gap:14px;background:#fff;color:${C.green};border-radius:60px;padding:22px 36px;font-size:34px;font-weight:800}
.foot{position:absolute;left:80px;right:80px;bottom:64px;display:flex;justify-content:space-between;align-items:center}
`;

  // Post 1: brend — "Uyda nimadir buzildimi?" + kuzatuv ekrani
  docs.push(px('instagram/post-1-buzildimi', 1080, 1350, SOC, `<div class="page g" style="width:1080px;height:1350px;padding:80px">
    ${logo(38, true)}
    <div class="h" style="margin-top:70px;font-size:104px">Uyda nimadir<br><em>buzildimi?</em></div>
    <div class="sub" style="margin-top:28px;font-size:36px;color:#BFE0D6;width:470px">Eng yaqin usta keladi — xaritada kelayotganini ko'rib turasiz</div>
    <div style="position:absolute;right:70px;top:420px">${phone('price', 400)}</div>
    <div class="foot"><span class="pill">${icon('mouse-pointer-click', C.green, 34, 2.4)}${CO.site}</span></div></div>`));

  // Post 2: 3 qadam
  const steps = [
    ['list-checks', 'Muammoni tanlang', "Kran oqyapti, rozetka ishlamayapti… — bir bosishda"],
    ['map-pin', 'Eng yaqin usta keladi', "Xaritada kelayotganini va qancha qolganini ko'rasiz"],
    ['handshake', 'Narxni tasdiqlang', 'Usta ko\'rib narx aytadi — rozi bo\'lsangiz ish boshlanadi'],
  ];
  docs.push(px('instagram/post-2-qanday-ishlaydi', 1080, 1350, SOC, `<div style="width:1080px;height:1350px;padding:80px;background:${C.page}">
    ${logo(34)}
    <div class="k" style="margin-top:70px">Qanday ishlaydi</div>
    <div class="h" style="margin-top:18px;font-size:88px">3 qadamda<br>usta uyingizda</div>
    <div style="margin-top:50px;display:flex;flex-direction:column;gap:28px">${steps
      .map(([ic, a, b], i) => `<div style="display:flex;gap:34px;align-items:center;background:#fff;border-radius:40px;padding:36px 40px;box-shadow:0 10px 30px rgba(11,42,36,.06)">
        <div style="flex:none;width:110px;height:110px;border-radius:32px;background:${i === 1 ? C.peach : C.mint};display:flex;align-items:center;justify-content:center">${icon(ic, i === 1 ? '#B4561A' : C.green, 56, 2.2)}</div>
        <div><div style="font-size:26px;font-weight:800;color:${C.muted}">${i + 1}-qadam</div><div style="font-size:44px;font-weight:800;margin-top:4px">${a}</div><div style="font-size:28px;font-weight:600;color:${C.ink2};margin-top:8px;line-height:1.35">${b}</div></div></div>`)
      .join('')}</div>
    <div class="foot"><span style="font-size:32px;font-weight:800;color:${C.green}">${CO.site}</span><span style="font-size:28px;font-weight:700;color:${C.ink2}">Telegram: ${CO.bot}</span></div></div>`));

  // Post 3: narx shaffof
  docs.push(px('instagram/post-3-narx', 1080, 1350, SOC, `<div class="g" style="width:1080px;height:1350px;padding:80px">
    ${logo(34, true)}
    <div class="k" style="margin-top:80px">Narx — oldindan</div>
    <div class="h" style="margin-top:22px;font-size:84px">Chaqiruv</div>
    <div class="h" style="font-size:190px;letter-spacing:-8px;color:${C.orange}">50 000</div>
    <div class="h" style="font-size:64px;margin-top:-4px">so'm</div>
    <div style="margin-top:60px;display:flex;flex-direction:column;gap:26px">${[
      ['check', "Ish qilinsa — chaqiruv narx ichida"],
      ['check', 'Usta ko\'rib narx aytadi, siz ilovada tasdiqlaysiz'],
      ['check', "Rozi bo'lmasangiz — faqat 50 000 (ko'rik)"],
      ['check', "Yashirin to'lov yo'q, naqd — ish tugagach"],
    ]
      .map(([ic, a]) => `<div style="display:flex;gap:22px;align-items:center;font-size:36px;font-weight:700"><span style="flex:none;width:56px;height:56px;border-radius:28px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center">${icon(ic, C.orange, 32, 3)}</span>${a}</div>`)
      .join('')}</div>
    <div class="foot"><span class="pill">${CO.site}</span></div></div>`));

  // Post 4: kafolat va ishonch
  docs.push(px('instagram/post-4-kafolat', 1080, 1350, SOC, `<div style="width:1080px;height:1350px;padding:80px;background:#fff">
    ${logo(34)}
    <div style="margin-top:80px;display:flex;align-items:center;gap:40px">
      <div style="flex:none;width:250px;height:250px;border-radius:70px;background:${C.mint};display:flex;align-items:center;justify-content:center">${icon('shield-check', C.green, 150, 1.8)}</div>
      <div><div class="h" style="font-size:150px;letter-spacing:-6px;color:${C.green}">30 kun</div><div style="font-size:52px;font-weight:800">kafolat</div></div></div>
    <div class="sub" style="margin-top:40px;font-size:38px;color:${C.ink2}">Ish bo'yicha muammo chiqsa — ilovada "Kafolat" tugmasini bosing, ko'rib chiqamiz.</div>
    <div style="margin-top:56px;display:grid;grid-template-columns:1fr 1fr;gap:24px">${[
      ['star', 'Reyting va sharhlar', 'har ish baholanadi'],
      ['badge-check', 'Tasdiqlangan ustalar', 'hujjati tekshirilgan belgi'],
      ['key-round', 'Eshik kodi', 'kelgan odam — o\'sha usta'],
      ['message-circle', 'Chat va qo\'ng\'iroq', 'usta bilan ilova ichida'],
    ]
      .map(([ic, a, b]) => `<div style="background:${C.page};border-radius:36px;padding:34px">${icon(ic, C.orange, 52, 2.2)}<div style="margin-top:18px;font-size:34px;font-weight:800">${a}</div><div style="margin-top:6px;font-size:27px;font-weight:600;color:${C.ink2}">${b}</div></div>`)
      .join('')}</div>
    <div class="foot"><span style="font-size:32px;font-weight:800;color:${C.green}">${CO.site}</span></div></div>`));

  // Post 5: 6 xizmat
  docs.push(px('instagram/post-5-xizmatlar', 1080, 1350, SOC, `<div style="width:1080px;height:1350px;padding:80px;background:${C.page}">
    ${logo(34)}
    <div class="k" style="margin-top:70px">Xizmatlar</div>
    <div class="h" style="margin-top:18px;font-size:84px">Har qanday<br>uy yumushi</div>
    <div style="margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:22px">${CATS.map(([ic, ink, tint, uz, ru]) => `<div style="background:${tint};border-radius:36px;padding:28px 32px;color:${ink}">${icon(ic, ink, 56, 2)}<div style="margin-top:14px;font-size:40px;font-weight:800">${uz}</div><div style="font-size:28px;font-weight:600;opacity:.75;margin-top:4px">${ru}</div></div>`).join('')}</div>
    <div class="foot"><span style="font-size:32px;font-weight:800;color:${C.green}">${CO.site}</span><span style="font-size:28px;font-weight:700;color:${C.ink2}">butun O'zbekiston bo'ylab</span></div></div>`));

  // Post 6: ustalar uchun
  docs.push(px('instagram/post-6-ustalar', 1080, 1350, SOC, `<div style="width:1080px;height:1350px;padding:80px;background:#fff">
    ${logo(34)}
    <div class="k" style="margin-top:70px;color:#B4561A">Ustalar uchun</div>
    <div class="h" style="margin-top:18px;font-size:88px">Buyurtmalar<br><span style="color:${C.green}">o'zi keladi</span></div>
    <div style="margin-top:50px;display:flex;flex-direction:column;gap:26px;width:520px">${[
      ['map-pin', 'Yaqin atrofdagi mijozlar'],
      ['hand-coins', "Narxni o'zingiz aytasiz"],
      ['badge-check', "Ro'yxatdan o'tish — bepul"],
      ['wallet', 'Obuna yoki komissiya — tanlov sizda'],
      ['send', "Telegram'da ham ishlaydi"],
    ]
      .map(([ic, a]) => `<div style="display:flex;gap:20px;align-items:center;font-size:34px;font-weight:700"><span style="flex:none;width:64px;height:64px;border-radius:20px;background:${C.peach};display:flex;align-items:center;justify-content:center">${icon(ic, '#B4561A', 34, 2.3)}</span>${a}</div>`)
      .join('')}</div>
    <div style="position:absolute;right:70px;top:400px">${phone('offer', 360)}</div>
    <div class="foot"><span class="pill" style="background:${C.green};color:#fff">${CO.site}/usta</span></div></div>`));

  // Story 1: mijoz — QR va havola
  docs.push(px('instagram/story-1-mijoz', 1080, 1920, SOC, `<div class="g" style="width:1080px;height:1920px;padding:150px 80px 0;text-align:center;display:flex;flex-direction:column;align-items:center">
    ${logo(42, true)}
    <div class="h" style="margin-top:90px;font-size:120px">Usta<br><em>bir bosishda</em></div>
    <div class="sub" style="margin-top:34px;font-size:40px;color:#BFE0D6">Santexnik, elektrik, konditsioner,<br>mebel, ta'mirlash, maishiy texnika</div>
    <div style="margin-top:80px">${phone('home', 420)}</div>
    <div style="position:absolute;left:0;right:0;bottom:120px;text-align:center"><span class="pill" style="font-size:40px">${icon('arrow-up', C.green, 40, 2.6)}Havolani bosing · ${CO.site}</span></div></div>`));

  // Story 2: usta
  docs.push(px('instagram/story-2-usta', 1080, 1920, SOC, `<div style="width:1080px;height:1920px;padding:150px 80px 0;background:#fff;text-align:center;display:flex;flex-direction:column;align-items:center">
    ${logo(42)}
    <div class="k" style="margin-top:100px;color:#B4561A;font-size:36px">Ustalar uchun</div>
    <div class="h" style="margin-top:24px;font-size:116px">Qo'lingiz gul<br>bo'lsa — <span style="color:${C.green}">ishga<br>chiqing</span></div>
    <div class="sub" style="margin-top:36px;font-size:40px;color:${C.ink2}">Yaqin atrofdagi buyurtmalar,<br>narxni o'zingiz aytasiz</div>
    <div style="margin-top:80px;width:520px;height:520px;padding:30px;border-radius:60px;border:6px solid ${C.green}" class="qr">${qrM}</div>
    <div style="margin-top:40px;font-size:46px;font-weight:800;color:${C.green}">${CO.site}/usta</div></div>`));

  // Story 3: Telegram
  docs.push(px('instagram/story-3-telegram', 1080, 1920, SOC, `<div style="width:1080px;height:1920px;padding:150px 80px 0;background:#229ED9;color:#fff;text-align:center;display:flex;flex-direction:column;align-items:center">
    ${logo(42, true)}
    <div style="margin-top:130px;width:300px;height:300px;border-radius:150px;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center">${icon('send', '#FFFFFF', 160, 1.8)}</div>
    <div class="h" style="margin-top:80px;font-size:112px">Telegram'da<br>usta chaqiring</div>
    <div class="sub" style="margin-top:36px;font-size:42px;opacity:.9">Ilova o'rnatmasdan, SMS'siz —<br>botni oching va "Ochish"ni bosing</div>
    <div style="position:absolute;left:0;right:0;bottom:150px;text-align:center"><span class="pill" style="color:#229ED9;font-size:48px">${CO.bot}</span></div></div>`));


  // ---------- Profil to'ri uchun qo'shimcha (instagram/PROFIL.md) ----------
  // Reels muqovalari 1080×1920: to'rda o'rtadagi 1080×1440 qismi ko'rinadi — matn shu oraliqda
  docs.push(px('instagram/reel-1-uyservice-nima', 1080, 1920, SOC, `<div class="g" style="width:1080px;height:1920px;padding:300px 90px 0;text-align:center;display:flex;flex-direction:column;align-items:center">
    ${logo(46, true)}
    <div class="h" style="margin-top:80px;font-size:150px;letter-spacing:-5px">UyService<br><em>nima?</em></div>
    <div style="margin-top:46px;display:inline-flex;align-items:center;gap:18px;background:rgba(255,255,255,.12);border-radius:60px;padding:22px 40px;font-size:46px;font-weight:800">${icon('play', C.orange, 44, 2.6)}30 soniyada</div>
    <div style="margin-top:70px">${phone('home', 330)}</div></div>`));
  docs.push(px('instagram/reel-2-kran-oqyapti', 1080, 1920, SOC, `<div style="width:1080px;height:1920px;padding:300px 90px 0;background:#E3F1FB;text-align:center;display:flex;flex-direction:column;align-items:center">
    ${logo(46)}
    <div style="margin-top:90px;width:300px;height:300px;border-radius:150px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 60px rgba(11,111,184,.18)">${icon('droplets', '#0B6FB8', 170, 1.8)}</div>
    <div class="h" style="margin-top:80px;font-size:140px;letter-spacing:-5px;color:#0B3E66">Kran<br>oqyaptimi?</div>
    <div style="margin-top:40px;font-size:58px;font-weight:800;color:#0B6FB8">Avval shuni qiling</div></div>`));

  // Karusel: "Usta chaqirishdan oldin 5 savol" (1080×1350, har slaydda raqam va sayt)
  const KS = [
    ['Chaqiruv qancha?', "Kelib ko'rish ham pul turadi. Buni oldindan biling.", "Chaqiruv 50 000 so'm. Ish qilinsa, narx ichida."],
    ['Narx qachon aytiladi?', "Ish boshlanishidan oldin. Usta ko'rib, aniq summani aytsin.", 'Usta narx yuboradi, siz ilovada tasdiqlaysiz.'],
    ['Ehtiyot qism alohidami?', "Ish haqi va qism narxini alohida so'rang.", 'Ikkalasi alohida yoziladi, hammasi oldindan ko\'rinadi.'],
    ['Kafolat bormi?', "Necha kun va nimaga ekanini so'rang.", '30 kun. Muammo chiqsa, ilovada "Kafolat" tugmasi.'],
    ['Kim keladi?', "Ismi, reytingi, boshqalar nima degani.", "Usta profili va sharhlar. Eshik kodi: kelgan odam aynan o'sha usta."],
  ];
  const NSL = KS.length + 4;
  const slide = (i, bg, body, dark = false) => px(`instagram/karusel-5-savol/${String(i).padStart(2, '0')}`, 1080, 1350, SOC, `<div style="position:relative;width:1080px;height:1350px;padding:120px 120px 180px;background:${bg};color:${dark ? '#fff' : C.ink};display:flex;flex-direction:column;justify-content:center">
    <div>${body}</div>
    <div style="position:absolute;left:120px;right:120px;bottom:80px;display:flex;justify-content:space-between;font-size:28px;font-weight:800;color:${dark ? '#BFE0D6' : C.muted}"><span>@uyservice.uz</span><span>${i}/${NSL}</span></div></div>`);
  docs.push(slide(1, C.green, `${logo(38, true)}
    <div class="h" style="margin-top:90px;font-size:132px;letter-spacing:-5px">Usta<br>chaqirishdan<br>oldin <em>5 savol</em></div>
    <div class="sub" style="margin-top:44px;font-size:44px;color:#BFE0D6">Keyin tortishuv bo'lmaydi</div>
    <div style="margin-top:80px;display:flex;gap:18px">${CATS.map(([ic]) => `<span style="width:110px;height:110px;border-radius:32px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center">${icon(ic, '#FFFFFF', 54, 2)}</span>`).join('')}</div>`, true));
  docs.push(slide(2, '#fff', `<div class="k" style="color:#B4561A">Nega muhim</div>
    <div class="h" style="margin-top:30px;font-size:84px;letter-spacing:-2px">Narxni ish boshlangandan keyin so'rasangiz, <span style="color:${C.green}">kelishish qiyin.</span></div>
    <div class="sub" style="margin-top:44px;font-size:40px;color:${C.ink2}">Kran yechilgan, usta 300 000 deydi, siz 150 000 kutgan edingiz.</div>`));
  KS.forEach(([q, a, u], k) => docs.push(slide(k + 3, k % 2 ? C.page : '#fff', `<div style="width:130px;height:130px;border-radius:40px;background:${C.mint};display:flex;align-items:center;justify-content:center;font-size:72px;font-weight:800;color:${C.green}">${k + 1}</div>
    <div class="h" style="margin-top:56px;font-size:96px;letter-spacing:-3px">${q}</div>
    <div class="sub" style="margin-top:36px;font-size:44px;color:${C.ink2}">${a}</div>
    <div style="margin-top:60px;background:${C.green};color:#fff;border-radius:36px;padding:38px 44px"><div style="font-size:28px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:${C.orange}">UyService'da</div><div style="margin-top:12px;font-size:40px;font-weight:700;line-height:1.35">${u}</div></div>`)));
  docs.push(slide(NSL - 1, '#fff', `<div class="k" style="color:#B4561A">Saqlab qo'ying</div>
    <div class="h" style="margin-top:24px;font-size:80px;letter-spacing:-2px">5 savol</div>
    <div style="margin-top:50px;display:flex;flex-direction:column;gap:30px">${KS.map(([q], k) => `<div style="display:flex;gap:28px;align-items:center;font-size:50px;font-weight:800"><span style="flex:none;width:84px;height:84px;border-radius:26px;background:${C.mint};color:${C.green};display:flex;align-items:center;justify-content:center;font-size:44px">${k + 1}</span>${q}</div>`).join('')}</div>`));
  docs.push(slide(NSL, C.green, `${logo(38, true)}
    <div style="margin-top:150px;width:200px;height:200px;border-radius:60px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center">${icon('bookmark', C.orange, 110, 2)}</div>
    <div class="h" style="margin-top:60px;font-size:112px;letter-spacing:-4px">Saqlab<br>qo'ying</div>
    <div class="sub" style="margin-top:40px;font-size:44px;color:#BFE0D6">Keyingi safar usta chaqirganda kerak bo'ladi. Usta kerak bo'lsa: ${CO.site}</div>`, true));

  // Avatar (profil surati) — doira ichida ham chiroyli
  docs.push(px('instagram/avatar', 1080, 1080, '', `<div style="width:1080px;height:1080px;background:${C.green};display:flex;align-items:center;justify-content:center">${mark('#FFFFFF', C.green, 640)}</div>`));

  // Highlight muqovalari
  const HL = [
    ['xizmatlar', 'wrench'],
    ['qanday', 'list-checks'],
    ['narx', 'wallet'],
    ['kafolat', 'shield-check'],
    ['ustalar', 'hard-hat'],
    ['aloqa', 'message-circle'],
  ];
  for (const [n, ic] of HL) {
    docs.push(px(`instagram/highlight-${n}`, 1080, 1920, '', `<div style="width:1080px;height:1920px;background:${C.green};display:flex;align-items:center;justify-content:center"><div style="width:560px;height:560px;border-radius:280px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center">${icon(ic, '#FFFFFF', 300, 1.6)}</div></div>`));
  }

  // Havola oldindan ko'rinishi (Telegram, Facebook, WhatsApp) 1200×630
  docs.push(px('social/havola-1200x630', 1200, 630, SOC, `<div class="g" style="width:1200px;height:630px;padding:70px 80px;position:relative">
    ${logo(34, true)}
    <div class="h" style="margin-top:56px;font-size:78px;letter-spacing:-2px">Uyga usta —<br><em>bir bosishda</em></div>
    <div class="sub" style="margin-top:22px;font-size:30px;color:#BFE0D6">Eng yaqin usta · narx oldindan · 30 kun kafolat</div>
    <div style="position:absolute;right:70px;top:70px;width:250px;height:250px;padding:16px;background:#fff;border-radius:30px" class="qr">${qrC}</div>
    <div style="position:absolute;right:70px;bottom:70px;font-size:34px;font-weight:800">${CO.site}</div></div>`));

  return docs;
}

// ====================================================================================
// LOGOTIPLAR — PNG (shaffof fon) va PDF (vektor, bosmaxonaga)
// ====================================================================================
function logoDocs() {
  const docs = [];
  const one = (name, w, h, bg, inner) => ({ name, px: [w, h], transparent: bg === 'transparent', pdf: true, html: doc(name, `.page{width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center}`, `<div class="page">${inner}</div>`) });
  docs.push(
    one('logo/logo-gorizontal', 1800, 600, 'transparent', logo(150)),
    one('logo/logo-gorizontal-oq', 1800, 600, 'transparent', logo(150, true)),
    one('logo/logo-gorizontal-yashil-fon', 1800, 600, C.green, logo(150, true)),
    one('logo/logo-vertikal', 1200, 1200, 'transparent', `<div style="display:flex;flex-direction:column;align-items:center;gap:60px">${mark(C.green, '#FFFFFF', 560)}${word(140)}</div>`),
    one('logo/belgi-yashil', 1024, 1024, 'transparent', mark(C.green, '#FFFFFF', 1000)),
    one('logo/belgi-oq', 1024, 1024, 'transparent', mark('#FFFFFF', C.green, 1000)),
    one('logo/ikonka', 1024, 1024, 'transparent', `<div style="width:1024px;height:1024px;border-radius:225px;background:${C.green};display:flex;align-items:center;justify-content:center">${mark('#FFFFFF', C.green, 740)}</div>`),
  );
  return docs;
}


// ====================================================================================
// PROFIL MAKETI — akkaunt tayyor bo'lgandagi taxminiy ko'rinish (instagram/PROFIL.md)
// Rasmlar yig'ilgandan keyin o'qiladi (html — funksiya)
// ====================================================================================
function profileMockup() {
  const img = (n) => `data:image/png;base64,${b64(path.join(OUT, 'instagram', `${n}.png`))}`;
  const GRID = [
    ['reel-1-uyservice-nima', 'reel', true],
    ['post-2-qanday-ishlaydi', '', true],
    ['post-4-kafolat', '', true],
    ['karusel-5-savol/01', 'multi'],
    ['reel-2-kran-oqyapti', 'reel'],
    ['post-3-narx', ''],
    ['post-5-xizmatlar', ''],
    ['post-1-buzildimi', ''],
    ['post-6-ustalar', ''],
  ];
  const HL = [['Narx', 'wallet'], ['Qanday?', 'list-checks'], ['Kafolat', 'shield-check'], ['Ustalarga', 'hard-hat'], ['Aloqa', 'message-circle']];
  const I = (n, s = 24, c = '#000', w = 2) => icon(n, c, s, w);
  const css = `
.page{width:390px;background:#fff;font-family:-apple-system,'SF Pro Text',Manrope,system-ui,sans-serif;color:#000}
.sb{height:47px;display:flex;align-items:center;justify-content:space-between;padding:0 30px 0 34px;font-weight:700;font-size:16px}
.hd{height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 16px}
.hd b{font-size:21px;font-weight:800;letter-spacing:-.3px;display:flex;align-items:center;gap:4px}
.top{display:flex;align-items:center;gap:26px;padding:10px 16px 0}
.ring{flex:none;width:92px;height:92px;border-radius:50%;padding:3px;background:conic-gradient(from 210deg,#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5,#FEDA75)}
.ring>div{width:100%;height:100%;border-radius:50%;background:#fff;padding:3px}
.ring img{width:100%;height:100%;border-radius:50%;display:block}
.st{flex:1;display:flex;justify-content:space-between;padding-right:8px}
.st div{display:flex;flex-direction:column;font-size:13px;line-height:1.2}
.st b{font-size:17px;font-weight:700}
.bio{padding:12px 16px 0;font-size:14px;line-height:1.36}
.bio .nm{font-weight:700}
.bio .cat{color:#737373}
.bio .ln{color:#00376B;font-weight:600;display:flex;align-items:center;gap:4px;margin-top:2px}
.btns{display:flex;gap:6px;padding:14px 16px 0}
.btns div{flex:1;height:34px;border-radius:9px;background:#EFEFEF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;white-space:nowrap;padding:0 6px}
.btns .sq{flex:none;width:34px}
.hl{display:flex;gap:16px;padding:18px 16px 0;overflow:hidden}
.hl>div{flex:none;width:64px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px}
.hl .c{width:64px;height:64px;border-radius:50%;border:1px solid #DBDBDB;padding:3px}
.hl .c div{width:100%;height:100%;border-radius:50%;background:${C.green};display:flex;align-items:center;justify-content:center}
.tabs{display:flex;margin-top:18px;border-bottom:1px solid #DBDBDB}
.tabs div{flex:1;height:44px;display:flex;align-items:center;justify-content:center}
.tabs .on{border-bottom:1.5px solid #000}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.cell{position:relative;aspect-ratio:3/4;overflow:hidden;background:#eee}
.cell img{width:100%;height:100%;object-fit:cover;object-position:center;display:block}
.cell .tag{position:absolute;top:7px;right:7px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}
.nav{display:flex;justify-content:space-around;align-items:center;height:56px;border-top:1px solid #EFEFEF;padding-bottom:4px}
.home{height:30px;display:flex;justify-content:center}
.home div{width:134px;height:5px;border-radius:3px;background:#000;margin-top:12px}
`;
  const html = () => doc('profil-maket', css, `<div class="page">
  <div class="sb"><span>19:30</span><span style="display:flex;gap:6px;align-items:center">${I('signal', 17, '#000', 2.6)}${I('wifi', 17, '#000', 2.6)}${I('battery-full', 22, '#000', 2)}</span></div>
  <div class="hd">${I('plus', 26, '#000', 2)}<b>uyservice.uz ${I('chevron-down', 16, '#000', 2.6)}</b><span style="display:flex;gap:20px">${I('at-sign', 24)}${I('menu', 26)}</span></div>
  <div class="top"><div class="ring"><div><img src="${img('avatar')}"></div></div>
    <div class="st"><div><b>9</b>публикаций</div><div><b>0</b>подписчиков</div><div><b>12</b>подписок</div></div></div>
  <div class="bio"><div class="nm">UyService | Usta chaqirish</div><div class="cat">Услуги для дома</div>
    Uyda nimadir buzildimi? Eng yaqin usta keladi.<br>Chaqiruv 50 000 so'm, ish qilinsa narx ichida.<br>30 kun kafolat. Naqd to'lov.
    <div class="ln">${I('link', 14, '#00376B', 2.4)}uyservice.uz</div></div>
  <div class="btns"><div>Редактировать</div><div>Поделиться профилем</div><div>Контакты</div></div>
  <div class="hl">${HL.map(([t, ic]) => `<div><div class="c"><div>${I(ic, 26, '#fff', 2)}</div></div>${t}</div>`).join('')}</div>
  <div class="tabs"><div class="on">${I('grid-3x3', 24, '#000', 2)}</div><div>${I('clapperboard', 24, '#737373', 2)}</div><div>${I('square-user', 24, '#737373', 2)}</div></div>
  <div class="grid">${GRID.map(([n, kind, pin]) => `<div class="cell"><img src="${img(n)}">${pin ? `<span class="tag">${I('pin', 17, '#fff', 2.4)}</span>` : kind === 'reel' ? `<span class="tag">${I('clapperboard', 17, '#fff', 2.4)}</span>` : kind === 'multi' ? `<span class="tag">${I('copy', 17, '#fff', 2.4)}</span>` : ''}</div>`).join('')}</div>
  <div class="nav">${I('house', 26)}${I('clapperboard', 26)}${I('send', 26)}${I('search', 26)}<div style="width:28px;height:28px;border-radius:50%;border:2px solid #000;padding:1px"><img src="${img('avatar')}" style="width:100%;height:100%;border-radius:50%;display:block"></div></div>
  <div class="home"><div></div></div></div>`);
  return [{ name: 'instagram/profil-maket', px: [390, 0], scale: 3, html }];
}

// ====================================================================================
async function main() {
  // ONLY=<regex> — faqat nomi mos keladiganlarni qayta yig'ish (masalan ONLY=instagram)
  const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
  const all = [...(await printDocs()), ...(await socialDocs()), ...logoDocs(), ...profileMockup()].filter((d) => !only || only.test(d.name));
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  for (const d of all) {
    const file = path.join(OUT, d.name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (d.mm) {
      // Bosma: PDF (vektor) + PNG ko'rinish (birinchi sahifa yoki hammasi yonma-yon)
      const [wmm, hmm] = d.mm;
      const scale = d.preview ?? 1;
      const vw = Math.round(wmm * 3.78 * scale);
      const vh = Math.round(hmm * 3.78 * scale);
      const page = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: scale < 1 ? 1 : 2 });
      await page.setContent(d.html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({ path: `${file}.pdf`, width: `${wmm}mm`, height: `${hmm}mm`, printBackground: true });
      // Ko'rinish: sahifalar yonma-yon
      await page.addStyleTag({ content: `body{display:flex;gap:${Math.round(8 * scale)}mm;padding:0;background:#fff;zoom:${scale}} .page{page-break-after:auto}` });
      const n = await page.evaluate(() => document.querySelectorAll('.page').length);
      await page.setViewportSize({ width: Math.round(vw * n + 30 * (n - 1) * scale), height: vh });
      await page.screenshot({ path: `${file}.png`, fullPage: false, omitBackground: false });
      await page.close();
    } else {
      // h = 0 — balandlik kontentga qarab (maket)
      const [w, h] = d.px;
      const page = await b.newPage({ viewport: { width: w, height: h || 800 }, deviceScaleFactor: d.scale ?? 1 });
      await page.setContent(typeof d.html === 'function' ? d.html() : d.html, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${file}.png`, omitBackground: Boolean(d.transparent), fullPage: !h });
      if (d.pdf) await page.pdf({ path: `${file}.pdf`, width: `${w}px`, height: `${h}px`, printBackground: true, pageRanges: '1' });
      await page.close();
    }
    console.log('✓', d.name);
  }
  await b.close();
}

// reels.js shu yordamchilarni ishlatadi (require qilinganda yig'ish boshlanmaydi)
module.exports = { C, CO, CATS, FONTS, BASE, icon, mark, word, logo, phone, doc, b64, OUT };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
