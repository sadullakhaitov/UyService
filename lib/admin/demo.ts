// Admin panel — sinov rejimi (Supabase ulanmagan). Butun O'zbekiston bo'ylab namunaviy ma'lumotlar bir marta
// yasaladi (har safar bir xil — seed), shu brauzerda saqlanadi va admin amallari ularni o'zgartiradi.
// Qoidalar server bilan bir xil (rules.ts), har bir amal jurnalga yoziladi.
// Shu qurilmada ro'yxatdan o'tgan usta (ilovadagi useMaster) ham ro'yxatda — uni tasdiqlasangiz, ilovada ham tasdiqlanadi.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feePercent, BALANCE_LIMIT, BILLING } from '@/constants/billing';
import { CALL_FEE, categories as CATEGORIES, problems as PROBLEMS, type CategoryId } from '@/constants/categories';
import { COMPANY } from '@/constants/company';
import { freeActive, loadDemoPasses, newFreeCode, passStatus, saveDemoPasses, FREE_REDEEM_DAYS } from '@/lib/freePass';
import type { LatLng } from '@/lib/geo';
import { useMaster, useUser } from '@/store';
import {
  ACTIVE_STATUSES,
  AdminError,
  type AdminApi,
  type AdminMaster,
  type AdminOrder,
  type AdminReport,
  type AdminReview,
  type ReportKind,
  type AdminUser,
  type BalanceKind,
  type BalanceOp,
  type CancelledBy,
  type CatalogCategory,
  type CatalogProblem,
  type ChatLine,
  type LivePoint,
  type LogAction,
  type LogEntry,
  type LogTarget,
  type OfferAttempt,
  type OrderStatus,
  type Page,
  type PromoCode,
  type Stats,
  type Subscription,
  type UserRole,
  type VerifyStatus,
} from './types';
import { useAdminSession } from './session';
import { checkBalance, checkCallFee, checkPriceRange, checkPriority, checkPromo, checkReason, checkSubscription, clean, normalizePhone, RULES } from './rules';

/** Sinov rejimida admin bo'lib kira oladigan raqam (kompaniya raqami) */
export const DEMO_ADMIN_PHONE = normalizePhone(COMPANY.phone) ?? '+998901218887';
/** Shu qurilmada ro'yxatdan o'tgan usta */
export const LOCAL_MASTER_ID = 'local-device';

const KEY = 'uyservice-admin-demo';
const VERSION = 1;
const DAY = 86_400_000;

// ---------- Saqlanadigan tuzilma ----------
type DUser = { id: string; phone: string; name: string | null; role: UserRole; language: string; createdAt: number; blockedAt: number | null; blockedReason: string | null; deletedAt?: number | null };
type DMaster = {
  id: string;
  firstName: string;
  lastName: string;
  experienceYears: number;
  categories: CategoryId[];
  activity: number;
  priority: number;
  verifyStatus: VerifyStatus;
  verifyNote: string | null;
  balance: number;
  subscriptionUntil: number | null;
  plan: 'subscription' | 'commission' | null;
  online: boolean;
  busy: boolean;
  location: LatLng;
  seenAt: number | null;
  submittedAt: number | null;
  createdAt: number;
  hasDocs: boolean;
  hasSelfie: boolean;
  works: number;
  freeUntil?: number | null;
};
type DReport = { id: string; orderId: string; kind: ReportKind; text: string | null; status: 'open' | 'resolved'; resolution: string | null; resolvedAt: number | null; createdAt: number; byMaster: boolean };
type DOrder = {
  id: string;
  status: OrderStatus;
  categoryId: CategoryId;
  problemId: string;
  description: string | null;
  address: string;
  location: LatLng;
  scheduledAt: number | null;
  createdAt: number;
  acceptedAt: number | null;
  completedAt: number | null;
  updatedAt: number;
  callFee: number;
  priceWork: number | null;
  priceParts: number | null;
  platformFee: number | null;
  cancelReason: string | null;
  cancelledBy: CancelledBy | null;
  clientId: string;
  masterId: string | null;
};
type DOffer = OfferAttempt & { orderId: string };
type DReview = { id: string; orderId: string; stars: number; tags: string[]; comment: string | null; createdAt: number; clientId: string; masterId: string };
type DSupport = { id: string; userId: string; senderId: string; text: string; at: number };
type DChat = { id: string; orderId: string; senderId: string; text: string; at: number };
type DSub = Subscription & { masterId: string };
type DLog = LogEntry & { adminId: string };

type DB = {
  v: number;
  generatedAt: number;
  users: DUser[];
  masters: DMaster[];
  orders: DOrder[];
  offers: DOffer[];
  reviews: DReview[];
  ops: BalanceOp[];
  subs: DSub[];
  support: DSupport[];
  chats: DChat[];
  log: DLog[];
  categories: CatalogCategory[];
  problems: CatalogProblem[];
  promos: PromoCode[];
  /** Murojaatlar (muammo, kafolat, eshik ochilmadi) — namunaviy */
  reports?: DReport[];
  /** Shu qurilmadagi usta uchun admin qarorlari (blok, rad sababi) — qolgani ilova store'idan */
  local: { blockedAt: number | null; blockedReason: string | null; verifyNote: string | null; createdAt: number };
  seq: number;
};

// ---------- Tasodifiy, lekin har safar bir xil ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MALE = ['Jasur', 'Bobur', 'Sardor', 'Akmal', 'Dilshod', 'Sherzod', 'Otabek', 'Rustam', 'Javohir', "Ulug'bek", 'Farrux', 'Aziz', 'Shoxrux', 'Bekzod', 'Sanjar', 'Islom', 'Doniyor', 'Jamshid', 'Murod', 'Anvar', 'Nodir', 'Elyor', 'Sarvar', 'Temur', 'Abdulla', 'Ibrohim', 'Mansur', 'Komil', 'Behruz', 'Asror'];
const FEMALE = ['Dilnoza', 'Malika', 'Madina', 'Nilufar', 'Gulnora', 'Shahnoza', 'Zarina', 'Kamola', 'Feruza', 'Nigora', 'Sevara', 'Mohira', 'Laylo', 'Munisa', 'Dildora'];
const LAST = ['Karimov', 'Aliyev', 'Tursunov', 'Rahimov', 'Yusupov', 'Nazarov', 'Ergashev', 'Xolmatov', 'Qodirov', 'Mirzayev', 'Abdullayev', 'Sobirov', 'Tojiyev', 'Hamidov', 'Usmonov', 'Saidov', "Jo'rayev", 'Ismoilov', 'Normatov', 'Valiyev'];
const CITIES = [
  { name: 'Toshkent', c: { latitude: 41.3111, longitude: 69.2797 }, r: 0.08, w: 52 },
  { name: 'Samarqand', c: { latitude: 39.6542, longitude: 66.9597 }, r: 0.035, w: 10 },
  { name: 'Buxoro', c: { latitude: 39.7747, longitude: 64.4286 }, r: 0.03, w: 6 },
  { name: 'Namangan', c: { latitude: 40.9983, longitude: 71.6726 }, r: 0.03, w: 7 },
  { name: 'Andijon', c: { latitude: 40.7821, longitude: 72.3442 }, r: 0.03, w: 7 },
  { name: "Farg'ona", c: { latitude: 40.3842, longitude: 71.7843 }, r: 0.03, w: 7 },
  { name: 'Qarshi', c: { latitude: 38.8606, longitude: 65.7891 }, r: 0.025, w: 5 },
  { name: 'Nukus', c: { latitude: 42.46, longitude: 59.61 }, r: 0.025, w: 6 },
];
const TASHKENT_DISTRICTS = ['Chilonzor', 'Yunusobod', "Mirzo Ulug'bek", 'Sergeli', 'Yakkasaroy', 'Shayxontohur', 'Olmazor', 'Mirobod', 'Uchtepa', 'Yashnobod'];
const STREETS = ['Amir Temur ko\'chasi', 'Navoiy ko\'chasi', 'Mustaqillik ko\'chasi', 'Bobur ko\'chasi', 'Istiqlol ko\'chasi', "Bunyodkor ko'chasi", "Qatortol ko'chasi", "Muqimiy ko'chasi", "Lutfiy ko'chasi", "Beruniy ko'chasi"];
const DESCRIPTIONS = [
  'Oshxonadagi kran tomchilayapti, tezroq kelsangiz yaxshi bo\'lardi.',
  'Ikkinchi qavat, podyezd kodi bor — kelganda qo\'ng\'iroq qiling.',
  'Kecha paydo bo\'ldi, ertalab 10 dan keyin uydaman.',
  'Rasm ilova qildim, kerakli qismni olib keling.',
  'Yangi uy, kalitlar menda. Iloji bo\'lsa bugun.',
  null,
  null,
  'Bolalar xonasida, ehtiyot bo\'ling.',
  'Avval ham shu muammo bo\'lgan, kafolat bo\'yicha.',
];
const COMMENTS = [
  'Juda tez keldi, hammasini toza qilib ketdi. Rahmat!',
  'Usta o\'z ishining ustasi, tavsiya qilaman.',
  'Narx kelishilganidek, ortiqcha pul so\'ramadi.',
  'Biroz kechikdi, lekin ish sifatli.',
  'Xushmuomala, tushuntirib berdi.',
  'Yaxshi, lekin keyingi safar qismlarni o\'zi olib kelsa yaxshi bo\'lardi.',
  'Ish yarim qoldi, qayta chaqirishga to\'g\'ri keldi.',
  'Kech qoldi va qo\'pol gapirdi.',
  null,
  null,
];
const TAGS = ['onTime', 'clean', 'fair', 'polite', 'fast'];
const CLIENT_CANCEL = ['changedMind', 'tooLong', 'foundOther', 'wrongAddress', 'other'];
const MASTER_CANCEL = ['clientNoAnswer', 'tooFar', 'emergency', 'wrongProblem'];
const SUPPORT_THREADS = [
  ['Assalomu alaykum, usta 40 daqiqa kechikdi, nima qilsam bo\'ladi?', 'Vaalaykum assalom! Uzr so\'raymiz, ustaga ogohlantirish berdik.', 'Rahmat, keyingi safar vaqtida kelsin.'],
  ['Balansimni to\'ldirmoqchiman, qanday qilaman?'],
  ['Pasportimni yukladim, qachon tekshiriladi?', 'Odatda 24 soat ichida tekshiriladi.', 'Hali ham kutyapman, iltimos tezlashtiring.'],
  ['Ilovada manzilni topa olmadim, xaritadan qanday tanlayman?', 'Xaritani surib, pinni uyingizga qo\'ying — manzil o\'zi chiqadi.'],
  ['Usta ortiqcha pul so\'radi, kelishilgan narx 150 000 edi.'],
  ['Obunani uzaytirdim, lekin buyurtmalar kelmayapti.'],
  ['Rahmat, juda qulay ilova ekan!', 'Fikringiz uchun rahmat! 😊'],
];

function pick<T>(r: () => number, a: readonly T[]): T {
  return a[Math.floor(r() * a.length)];
}
function weighted<T extends { w: number }>(r: () => number, a: readonly T[]): T {
  const total = a.reduce((s, x) => s + x.w, 0);
  let x = r() * total;
  for (const it of a) {
    x -= it.w;
    if (x <= 0) return it;
  }
  return a[a.length - 1];
}
const round5k = (n: number) => Math.max(5000, Math.round(n / 5000) * 5000);
const phoneOf = (r: () => number) => {
  const ops = ['90', '91', '93', '94', '95', '97', '98', '99', '33', '88', '77'];
  const d = () => Math.floor(r() * 10);
  return `+998${pick(r, ops)}${d()}${d()}${d()}${d()}${d()}${d()}${d()}`;
};
const around = (r: () => number, c: LatLng, rad: number): LatLng => ({
  latitude: c.latitude + (r() - 0.5) * 2 * rad,
  longitude: c.longitude + (r() - 0.5) * 2 * rad * 1.3,
});
const uuid = (r: () => number) => {
  const h = () => Math.floor(r() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-a${h().slice(1)}-${h()}${h()}${h()}`;
};

// ---------- Ma'lumotlarni yasash ----------
function generate(now: number): DB {
  const r = rng(20261007);
  const users: DUser[] = [];
  const masters: DMaster[] = [];

  // Ustalar
  for (let i = 0; i < 48; i++) {
    const city = weighted(r, CITIES);
    const id = uuid(r);
    const firstName = pick(r, MALE);
    const lastName = pick(r, LAST);
    const createdAt = now - Math.floor(10 + r() * 170) * DAY - Math.floor(r() * DAY);
    const roll = r();
    const verifyStatus: VerifyStatus = roll < 0.62 ? 'approved' : roll < 0.78 ? 'pending' : roll < 0.84 ? 'rejected' : 'none';
    const plan = r() < 0.66 ? 'commission' : 'subscription';
    const online = verifyStatus !== 'none' || r() < 0.4 ? r() < 0.42 : false;
    const cats = new Set<CategoryId>([pick(r, CATEGORIES).id]);
    if (r() < 0.45) cats.add(pick(r, CATEGORIES).id);
    if (r() < 0.15) cats.add(pick(r, CATEGORIES).id);
    users.push({ id, phone: phoneOf(r), name: firstName, role: 'master', language: r() < 0.8 ? 'uz' : 'ru', createdAt, blockedAt: null, blockedReason: null });
    masters.push({
      id,
      firstName,
      lastName,
      experienceYears: pick(r, [1, 2, 3, 5, 7, 10, 12, 15]),
      categories: [...cats],
      activity: Math.round(55 + r() * 45),
      priority: r() < 0.12 ? 10 : 0,
      verifyStatus,
      verifyNote: verifyStatus === 'rejected' ? pick(r, ['Pasport rasmi xira, qayta yuklang', "Selfi pasportdagi odamga o'xshamaydi", "Pasport muddati o'tgan"]) : null,
      balance: plan === 'commission' ? round5k(r() < 0.18 ? r() * 18_000 : 20_000 + r() * 280_000) : round5k(r() * 60_000),
      subscriptionUntil: plan === 'subscription' ? now + Math.floor((r() < 0.2 ? -10 : 1) + r() * 28) * DAY : null,
      plan,
      online,
      busy: false,
      location: around(r, city.c, city.r),
      seenAt: online ? now - Math.floor(r() * 50_000) : now - Math.floor(r() * 5 * DAY),
      submittedAt: verifyStatus === 'none' ? null : verifyStatus === 'pending' ? now - Math.floor(r() * 3 * DAY) : createdAt + Math.floor(r() * DAY),
      createdAt,
      hasDocs: verifyStatus !== 'none',
      hasSelfie: verifyStatus !== 'none' && r() < 0.7,
      works: Math.floor(r() * 4),
    });
  }
  // 2 ta bloklangan usta
  for (const m of masters.slice(5, 7)) {
    const u = users.find((x) => x.id === m.id)!;
    u.blockedAt = now - Math.floor(r() * 20) * DAY;
    u.blockedReason = pick(r, ["Mijozlardan ko'p shikoyat", 'Platformadan tashqari pul olgan']);
    m.online = false;
  }

  // Mijozlar
  for (let i = 0; i < 150; i++) {
    const female = r() < 0.45;
    users.push({
      id: uuid(r),
      phone: phoneOf(r),
      name: r() < 0.85 ? (female ? pick(r, FEMALE) : pick(r, MALE)) : null,
      role: 'client',
      language: r() < 0.7 ? 'uz' : r() < 0.85 ? 'ru' : 'en',
      createdAt: now - Math.floor(r() * 90) * DAY - Math.floor(r() * DAY),
      blockedAt: null,
      blockedReason: null,
    });
  }
  const clients = users.filter((u) => u.role === 'client');
  clients[3].blockedAt = now - 4 * DAY;
  clients[3].blockedReason = 'Soxta buyurtmalar';
  // Admin
  const adminId = 'demo-admin';
  users.push({ id: adminId, phone: DEMO_ADMIN_PHONE, name: 'Admin', role: 'admin', language: 'uz', createdAt: now - 200 * DAY, blockedAt: null, blockedReason: null });

  // Buyurtmalar: oxirgi 60 kun, o'sib boruvchi trend
  const orders: DOrder[] = [];
  const offers: DOffer[] = [];
  const reviews: DReview[] = [];
  const ops: BalanceOp[] = [];
  const chats: DChat[] = [];
  const active = masters.filter((m) => m.verifyStatus !== 'none' || m.online);
  for (let day = 60; day >= 0; day--) {
    const n = Math.round(4 + (60 - day) * 0.16 + r() * 4 + (new Date(now - day * DAY).getDay() % 6 === 0 ? 3 : 0));
    for (let k = 0; k < n; k++) {
      const createdAt = day === 0 ? now - Math.floor(r() * 10 * 3600_000) : now - day * DAY + Math.floor((r() - 0.5) * 12 * 3600_000);
      const client = pick(r, clients);
      const city = weighted(r, CITIES);
      const cat = pick(r, CATEGORIES).id;
      const prob = pick(r, PROBLEMS.filter((p) => p.categoryId === cat));
      const candidates = active.filter((m) => m.categories.includes(cat));
      const master = candidates.length ? pick(r, candidates) : pick(r, active);
      const age = now - createdAt;
      let status: OrderStatus;
      const roll = r();
      if (age < 25 * 60_000) status = roll < 0.35 ? 'searching' : roll < 0.6 ? 'on_the_way' : roll < 0.8 ? 'in_progress' : 'arrived';
      else if (age < 2 * 3600_000) status = roll < 0.55 ? 'completed' : roll < 0.75 ? 'in_progress' : roll < 0.9 ? 'cancelled' : 'arrived';
      else status = roll < 0.8 ? 'completed' : 'cancelled';
      const scheduled = day === 0 && r() < 0.12;
      if (scheduled) status = 'scheduled';
      const assigned = status !== 'searching' && status !== 'scheduled' && !(status === 'cancelled' && r() < 0.45);
      const id = uuid(r);
      const o: DOrder = {
        id,
        status,
        categoryId: cat,
        problemId: prob.id,
        description: pick(r, DESCRIPTIONS),
        address: city.name === 'Toshkent'
          ? `${pick(r, TASHKENT_DISTRICTS)} tumani, ${pick(r, STREETS)}, ${1 + Math.floor(r() * 120)}-uy`
          : `${city.name}, ${pick(r, STREETS)}, ${1 + Math.floor(r() * 90)}-uy`,
        location: around(r, city.c, city.r),
        scheduledAt: scheduled ? now + Math.floor(2 + r() * 30) * 3600_000 : null,
        createdAt,
        acceptedAt: assigned ? createdAt + Math.floor(20_000 + r() * 150_000) : null,
        completedAt: null,
        updatedAt: createdAt,
        callFee: CALL_FEE,
        priceWork: null,
        priceParts: null,
        platformFee: null,
        cancelReason: null,
        cancelledBy: null,
        clientId: client.id,
        masterId: assigned ? master.id : null,
      };
      // Taqsimlash urinishlari: 0–2 ta rad/vaqt o'tdi, keyin qabul
      if (status !== 'scheduled') {
        const tries = Math.floor(r() * 3);
        let at = createdAt + 3000;
        for (let i = 0; i < tries; i++) {
          const other = pick(r, active);
          offers.push({ id: uuid(r), orderId: id, masterId: other.id, masterName: `${other.firstName} ${other.lastName}`, sentAt: at, respondedAt: at + 8000 + Math.floor(r() * 50_000), status: r() < 0.6 ? 'declined' : 'expired', etaMin: 4 + Math.floor(r() * 20), distanceKm: Math.round((0.5 + r() * 6) * 10) / 10, score: Math.round(40 + r() * 50) });
          at += 65_000;
        }
        if (o.masterId) {
          offers.push({ id: uuid(r), orderId: id, masterId: master.id, masterName: `${master.firstName} ${master.lastName}`, sentAt: at, respondedAt: at + 5000 + Math.floor(r() * 30_000), status: 'accepted', etaMin: 3 + Math.floor(r() * 18), distanceKm: Math.round((0.4 + r() * 5) * 10) / 10, score: Math.round(55 + r() * 45) });
        }
      }
      if (status === 'completed' && o.masterId) {
        const inspection = r() < 0.06;
        const min = Math.max(CALL_FEE, prob.priceMin ?? 100_000);
        const max = Math.max(min, prob.priceMax ?? 400_000);
        o.priceWork = inspection ? null : round5k(min + r() * (max - min));
        o.priceParts = !inspection && r() < 0.4 ? round5k(15_000 + r() * 120_000) : null;
        o.completedAt = (o.acceptedAt ?? createdAt) + Math.floor(40 * 60_000 + r() * 3 * 3600_000);
        o.updatedAt = o.completedAt;
        const total = (o.priceWork ?? o.callFee) + (o.priceParts ?? 0);
        const pct = feePercent(master.plan ?? 'commission', master.verifyStatus === 'approved');
        o.platformFee = Math.round((total * pct) / 100);
        if (r() < 0.75) {
          const sr = r();
          const stars = sr < 0.62 ? 5 : sr < 0.84 ? 4 : sr < 0.92 ? 3 : sr < 0.97 ? 2 : 1;
          const comment = stars <= 2 ? pick(r, COMMENTS.slice(6, 8)) : pick(r, [...COMMENTS.slice(0, 6), null, null]);
          reviews.push({
            id: uuid(r),
            orderId: id,
            stars,
            tags: stars >= 4 ? TAGS.filter(() => r() < 0.35) : [],
            comment,
            createdAt: o.completedAt + Math.floor(r() * 3600_000),
            clientId: client.id,
            masterId: master.id,
          });
        }
      } else if (status === 'cancelled') {
        const byMaster = o.masterId && r() < 0.3;
        o.cancelledBy = byMaster ? 'master' : r() < 0.1 ? 'system' : 'client';
        o.cancelReason = o.cancelledBy === 'system' ? 'noMasters' : byMaster ? pick(r, MASTER_CANCEL) : pick(r, CLIENT_CANCEL);
        o.updatedAt = createdAt + Math.floor(r() * 30 * 60_000);
      } else if (ACTIVE_STATUSES.includes(status) && o.masterId) {
        master.busy = true;
        master.online = true;
        master.seenAt = now - Math.floor(r() * 20_000);
      }
      if (o.masterId && r() < 0.3) {
        const lines = ['Assalomu alaykum, 10 daqiqada yetib boraman.', 'Vaalaykum assalom, kutaman.', 'Podyezd oldidaman.', 'Hozir tushaman.'];
        const cnt = 2 + Math.floor(r() * 3);
        for (let i = 0; i < cnt; i++) {
          chats.push({ id: uuid(r), orderId: id, senderId: i % 2 === 0 ? o.masterId : client.id, text: lines[i % lines.length], at: (o.acceptedAt ?? createdAt) + i * 90_000 });
        }
      }
      orders.push(o);
    }
  }
  orders.sort((a, b) => b.createdAt - a.createdAt);

  // Balans tarixi: to'ldirishlar va ish yakunidagi ulush (eskisidan yangisiga)
  const subs: DSub[] = [];
  for (const m of masters) {
    const mine = orders.filter((o) => o.masterId === m.id && o.status === 'completed').sort((a, b) => a.createdAt - b.createdAt);
    const events: { at: number; amount: number; kind: BalanceKind; orderId: string | null; note: string | null }[] = [];
    if (m.plan === 'commission' || m.verifyStatus !== 'approved') {
      for (let k = 0; k < 1 + Math.floor(r() * 3); k++) {
        events.push({ at: m.createdAt + Math.floor(r() * (now - m.createdAt)), amount: round5k(50_000 + r() * 150_000), kind: 'topup', orderId: null, note: "Naqd to'lov (ofis)" });
      }
    }
    for (const o of mine) if (o.platformFee) events.push({ at: o.completedAt ?? o.createdAt, amount: -o.platformFee, kind: 'fee', orderId: o.id, note: null });
    events.sort((a, b) => a.at - b.at);
    // Oxirgi balans — yasalgan balans; tarixni orqadan hisoblaymiz
    let bal = m.balance;
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      ops.push({ id: uuid(r), masterId: m.id, masterName: `${m.firstName} ${m.lastName}`, amount: e.amount, balanceAfter: bal, kind: e.kind, orderId: e.orderId, note: e.note, adminPhone: e.kind === 'fee' ? null : DEMO_ADMIN_PHONE, createdAt: e.at });
      bal -= e.amount;
    }
    if (m.plan === 'subscription' && m.subscriptionUntil) {
      let end = m.subscriptionUntil;
      for (let k = 0; k < 1 + Math.floor(r() * 3); k++) {
        subs.push({ id: uuid(r), masterId: m.id, periodStart: end - 30 * DAY, periodEnd: end, amount: BILLING.subscription.monthlyFee, status: 'paid' });
        end -= 30 * DAY;
      }
    }
  }
  ops.sort((a, b) => b.createdAt - a.createdAt);

  // Qo'llab-quvvatlash
  const support: DSupport[] = [];
  SUPPORT_THREADS.forEach((lines, i) => {
    const u = i % 3 === 1 ? masters[10 + i] : clients[20 + i];
    const userId = u.id;
    let at = now - Math.floor((i * 7 + 2) * 3600_000 * (1 + r()));
    lines.forEach((text, j) => {
      support.push({ id: uuid(r), userId, senderId: j % 2 === 0 ? userId : adminId, text, at });
      at += Math.floor(10 * 60_000 + r() * 2 * 3600_000);
    });
  });

  const db: DB = {
    v: VERSION,
    generatedAt: now,
    users,
    masters,
    orders,
    offers,
    reviews,
    ops,
    subs,
    support,
    chats,
    log: [],
    categories: CATEGORIES.map((c) => ({ id: c.id, callFee: c.callFee, active: true })),
    problems: PROBLEMS.map((p) => ({ id: p.id, categoryId: p.categoryId, priceMin: p.priceMin, priceMax: p.priceMax })),
    promos: demoPromos(now),
    local: { blockedAt: null, blockedReason: null, verifyNote: null, createdAt: now },
    seq: 1,
  };
  // Jurnalda bir nechta oldingi amallar
  const approved = masters.filter((m) => m.verifyStatus === 'approved').slice(0, 4);
  approved.forEach((m, i) => db.log.push(entry(db, adminId, 'verify', 'master', m.id, { from: 'pending', to: 'approved' }, now - (i + 1) * 9 * 3600_000)));
  db.log.push(entry(db, adminId, 'block', 'master', masters[5].id, { reason: users.find((u) => u.id === masters[5].id)!.blockedReason }, now - 3 * DAY));
  db.log.push(entry(db, adminId, 'balance', 'master', masters[1].id, { amount: 100_000, kind: 'topup' }, now - 2 * DAY));
  db.log.sort((a, b) => b.createdAt - a.createdAt);
  return db;
}

function entry(db: DB, adminId: string, action: LogAction, targetType: LogTarget, targetId: string | null, details: Record<string, unknown>, at = Date.now()): DLog {
  const admin = db.users.find((u) => u.id === adminId);
  return { id: `l${db.seq++}`, adminId, adminPhone: admin?.phone ?? DEMO_ADMIN_PHONE, adminName: admin?.name ?? null, action, targetType, targetId, details, createdAt: at };
}

// ---------- Saqlash ----------
let cache: DB | null = null;
let loading: Promise<DB> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Ma'lumotlar eskirmasligi uchun: yasalgan vaqtdan beri o'tgan vaqtga hamma sanalar suriladi */
function shift(db: DB, now: number) {
  const d = now - db.generatedAt;
  if (d < 3600_000) return;
  const mv = (v: number | null) => (v == null ? v : v + d);
  for (const u of db.users) {
    u.createdAt += d;
    u.blockedAt = mv(u.blockedAt);
  }
  for (const m of db.masters) {
    m.createdAt += d;
    m.seenAt = mv(m.seenAt);
    m.submittedAt = mv(m.submittedAt);
    m.subscriptionUntil = mv(m.subscriptionUntil);
  }
  for (const o of db.orders) {
    o.createdAt += d;
    o.updatedAt += d;
    o.acceptedAt = mv(o.acceptedAt);
    o.completedAt = mv(o.completedAt);
    o.scheduledAt = mv(o.scheduledAt);
  }
  for (const x of db.offers) {
    x.sentAt += d;
    x.respondedAt = mv(x.respondedAt);
  }
  for (const x of [...db.reviews, ...db.ops, ...db.log]) x.createdAt += d;
  for (const x of [...db.support, ...db.chats]) x.at += d;
  for (const s of db.subs) {
    s.periodStart += d;
    s.periodEnd += d;
  }
  db.local.createdAt += d;
  db.generatedAt = now;
}

/** Namunaviy murojaatlar: kafolat (ochiq), ortiqcha pul (yopilgan), eshik ochilmadi (ochiq) */
function demoReports(db: DB, now: number): DReport[] {
  const done = db.orders.filter((o) => o.status === 'completed');
  const out: DReport[] = [];
  const add = (o: DOrder | undefined, kind: ReportKind, text: string, byMaster = false, resolution: string | null = null) => {
    if (!o) return;
    out.push({ id: `rep${out.length + 1}`, orderId: o.id, kind, text, status: resolution ? 'resolved' : 'open', resolution, resolvedAt: resolution ? now - 2 * 3_600_000 : null, createdAt: now - (out.length + 1) * 5 * 3_600_000, byMaster });
  };
  add(done[0], 'warranty', 'Kran yana tomchilayapti, 5 kun oldin almashtirilgan edi');
  add(done[1], 'overcharge', 'Kelishilgan 120 000 edi, 150 000 oldi', false, "Usta bilan gaplashildi, 30 000 qaytarildi");
  add(db.orders.find((o) => o.status === 'cancelled'), 'client_absent', "20 daqiqa kutdim, qo'ng'iroqqa javob bermadi", true);
  return out;
}

function reportView(db: DB, r: DReport): AdminReport {
  const o = db.orders.find((x) => x.id === r.orderId);
  const reporterId = (r.byMaster ? o?.masterId : o?.clientId) ?? '';
  const u = db.users.find((x) => x.id === reporterId);
  const m = o?.masterId ? db.masters.find((x) => x.id === o.masterId) : undefined;
  return {
    ...r,
    reporterId,
    reporterName: u?.name ?? null,
    reporterPhone: u?.phone ?? null,
    categoryId: o?.categoryId ?? 'plumber',
    problemId: o?.problemId ?? null,
    orderStatus: o?.status ?? 'completed',
    clientId: o?.clientId ?? '',
    masterId: o?.masterId ?? null,
    masterName: m ? `${m.firstName} ${m.lastName}` : null,
  };
}

/** Sinov rejimidagi promokodlar — usta ilovasidagi (app/master/promo.tsx) bilan bir xil */
function demoPromos(now: number): PromoCode[] {
  const p = (code: string, priority: number, bonus: number, uses: number): PromoCode => ({ code, priority, bonus, maxUses: null, uses, expiresAt: null, active: true, createdAt: now - 20 * DAY });
  return [p('UYSERVICE', 10, 0, 14), p('BIRINCHI', 0, 20_000, 9), p('USTA2026', 5, 10_000, 3)];
}

async function load(): Promise<DB> {
  if (cache) return cache;
  loading ??= (async () => {
    let db: DB | null = null;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? (JSON.parse(raw) as DB) : null;
      if (parsed && parsed.v === VERSION) db = parsed;
    } catch {
      // buzilgan bo'lsa — qaytadan yasaymiz
    }
    db ??= generate(Date.now());
    db.promos ??= demoPromos(Date.now()); // oldin saqlangan sinov ma'lumotlarida promokodlar yo'q edi
    db.reports ??= demoReports(db, Date.now());
    shift(db, Date.now());
    cache = db;
    save();
    return db;
  })();
  return loading;
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (cache) AsyncStorage.setItem(KEY, JSON.stringify(cache)).catch(() => {});
  }, 300);
}

/** Sinov ma'lumotlarini boshidan yasash (Sozlamalar → "Sinov ma'lumotlarini tiklash") */
export async function resetDemoData() {
  cache = generate(Date.now());
  loading = Promise.resolve(cache);
  save();
}

// Tarmoq kechikishi — yuklanish holatlari ko'rinsin (juda qisqa)
const wait = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 120));

// ---------- Shu qurilmadagi usta (ilova store'idan) ----------
function localMaster(db: DB): { m: AdminMaster; u: AdminUser } | null {
  const mp = useMaster.getState();
  const user = useUser.getState();
  const p = mp.profile;
  if (!p.firstName && !p.submittedAt) return null;
  const plan = user.billingPlan ?? 'commission';
  const verified = p.status === 'approved';
  const free = freeActive(mp.freeUntil, p.status);
  const pct = feePercent(plan, verified, free);
  const phone = normalizePhone(user.phone ?? '') ?? '';
  const canTake = free || (!(pct > 0 && mp.balance < BALANCE_LIMIT) && !(plan === 'subscription' && mp.subscriptionUntil < Date.now()));
  const loc = user.lastLocation ?? null;
  const m: AdminMaster = {
    id: LOCAL_MASTER_ID,
    firstName: p.firstName,
    lastName: p.lastName,
    phone,
    language: user.language ?? 'uz',
    photo: p.photo,
    experienceYears: p.experienceYears,
    categories: p.categories,
    rating: mp.rating,
    reviewsCount: mp.ratingCount,
    jobsDone: mp.jobsDone,
    activity: mp.activity,
    priority: mp.priorityPoints,
    verifyStatus: p.status,
    verifyNote: p.status === 'rejected' ? db.local.verifyNote : null,
    balance: mp.balance,
    subscriptionUntil: plan === 'subscription' ? mp.subscriptionUntil || null : null,
    plan: user.billingPlan ?? null,
    feePercent: pct,
    canTake,
    online: mp.online && !db.local.blockedAt,
    busy: false,
    blockedAt: db.local.blockedAt,
    blockedReason: db.local.blockedReason,
    location: loc,
    seenAt: mp.online ? Date.now() : null,
    submittedAt: p.submittedAt,
    createdAt: p.submittedAt ?? db.local.createdAt,
    passport: p.passportPhoto,
    selfie: p.selfie,
    works: p.works,
    freeUntil: mp.freeUntil,
  };
  const u: AdminUser = {
    id: LOCAL_MASTER_ID,
    phone,
    name: user.name || p.firstName || null,
    role: 'master',
    language: user.language ?? 'uz',
    isMaster: true,
    ordersCount: 0,
    completedCount: 0,
    spent: 0,
    lastOrderAt: null,
    blockedAt: db.local.blockedAt,
    blockedReason: db.local.blockedReason,
    createdAt: m.createdAt,
  };
  return { m, u };
}

// ---------- Ko'rinishlar (server view'lari kabi) ----------
const total = (o: DOrder) => (o.priceWork ?? o.callFee) + (o.priceParts ?? 0);

function masterView(db: DB, m: DMaster): AdminMaster {
  const u = db.users.find((x) => x.id === m.id)!;
  const rs = db.reviews.filter((r) => r.masterId === m.id);
  const verified = m.verifyStatus === 'approved';
  const plan = m.plan ?? 'commission';
  const free = freeActive(m.freeUntil, m.verifyStatus);
  const pct = feePercent(plan, verified, free);
  return {
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    phone: u.phone,
    language: u.language,
    photo: null,
    experienceYears: m.experienceYears,
    categories: m.categories,
    rating: rs.length ? Math.round((rs.reduce((s, r) => s + r.stars, 0) / rs.length) * 100) / 100 : null,
    reviewsCount: rs.length,
    jobsDone: db.orders.filter((o) => o.masterId === m.id && o.status === 'completed').length,
    activity: m.activity,
    priority: m.priority,
    verifyStatus: m.verifyStatus,
    verifyNote: m.verifyNote,
    balance: m.balance,
    subscriptionUntil: m.subscriptionUntil,
    plan: m.plan,
    feePercent: pct,
    canTake: free || (!(pct > 0 && m.balance < BALANCE_LIMIT) && !(plan === 'subscription' && (m.subscriptionUntil ?? 0) < Date.now())),
    online: m.online,
    busy: m.busy,
    blockedAt: u.blockedAt,
    blockedReason: u.blockedReason,
    location: m.location,
    seenAt: m.seenAt,
    submittedAt: m.submittedAt,
    createdAt: m.createdAt,
    passport: m.hasDocs ? docSvg('passport', `${m.firstName} ${m.lastName}`) : null,
    selfie: m.hasSelfie ? docSvg('selfie', `${m.firstName} ${m.lastName}`) : null,
    works: Array.from({ length: m.works }, (_, i) => docSvg('work', String(i + 1), m.categories[0])),
    freeUntil: m.freeUntil ?? null,
  };
}

function allMasters(db: DB): AdminMaster[] {
  const gone = new Set(db.users.filter((u) => u.deletedAt).map((u) => u.id));
  const list = db.masters.filter((m) => !gone.has(m.id)).map((m) => masterView(db, m));
  const local = localMaster(db);
  return local ? [local.m, ...list] : list;
}

function orderView(db: DB, o: DOrder): AdminOrder {
  const c = db.users.find((u) => u.id === o.clientId);
  const m = o.masterId ? db.masters.find((x) => x.id === o.masterId) : null;
  const mu = m ? db.users.find((u) => u.id === m.id) : null;
  return {
    ...o,
    photos: [],
    total: total(o),
    clientName: c?.name ?? null,
    clientPhone: c?.phone ?? null,
    masterName: m ? `${m.firstName} ${m.lastName}` : null,
    masterPhone: mu?.phone ?? null,
  };
}

function userView(db: DB, u: DUser): AdminUser {
  const mine = db.orders.filter((o) => o.clientId === u.id);
  const done = mine.filter((o) => o.status === 'completed');
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    language: u.language,
    isMaster: u.role === 'master',
    ordersCount: mine.length,
    completedCount: done.length,
    spent: done.reduce((s, o) => s + total(o), 0),
    lastOrderAt: mine.length ? Math.max(...mine.map((o) => o.createdAt)) : null,
    blockedAt: u.blockedAt,
    blockedReason: u.blockedReason,
    createdAt: u.createdAt,
  };
}

function reviewView(db: DB, r: DReview): AdminReview {
  const c = db.users.find((u) => u.id === r.clientId);
  const m = db.masters.find((x) => x.id === r.masterId);
  const o = db.orders.find((x) => x.id === r.orderId);
  return {
    ...r,
    clientName: c?.name ?? null,
    clientPhone: c?.phone ?? null,
    masterName: m ? `${m.firstName} ${m.lastName}` : null,
    categoryId: o?.categoryId ?? 'plumber',
    problemId: o?.problemId ?? null,
  };
}

const paginate = <T,>(rows: T[], page: number, size: number): Page<T> => ({ rows: rows.slice(page * size, page * size + size), total: rows.length });
const matches = (q: string, ...fields: (string | null | undefined)[]) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const digits = s.replace(/\D/g, '');
  return fields.some((f) => {
    if (!f) return false;
    const v = f.toLowerCase();
    return v.includes(s) || (digits.length >= 3 && v.replace(/\D/g, '').includes(digits));
  });
};

function findMaster(db: DB, id: string) {
  const m = db.masters.find((x) => x.id === id);
  if (!m) throw new AdminError('errors.notFound');
  return m;
}
function findUser(db: DB, id: string) {
  const u = db.users.find((x) => x.id === id);
  if (!u) throw new AdminError('errors.notFound');
  return u;
}
const ADMIN_ID = 'demo-admin';
function log(db: DB, action: LogAction, type: LogTarget, target: string | null, details: Record<string, unknown>) {
  db.log.unshift(entry(db, ADMIN_ID, action, type, target, details));
}

// ---------- Statistika ----------
function stats(db: DB, days: number): Stats {
  const now = Date.now();
  const from = now - days * DAY;
  const pFrom = now - 2 * days * DAY;
  const cur = db.orders.filter((o) => o.createdAt >= from);
  const prev = db.orders.filter((o) => o.createdAt >= pFrom && o.createdAt < from);
  const sum = (list: DOrder[]) => {
    const done = list.filter((o) => o.status === 'completed');
    return {
      orders: list.length,
      completed: done.length,
      cancelled: list.filter((o) => o.status === 'cancelled').length,
      gmv: done.reduce((s, o) => s + total(o), 0),
      revenue: done.reduce((s, o) => s + (o.platformFee ?? 0), 0),
    };
  };
  const avg = (rs: DReview[]) => (rs.length ? rs.reduce((s, r) => s + r.stars, 0) / rs.length : null);
  const cr = db.reviews.filter((r) => r.createdAt >= from);
  const pr = db.reviews.filter((r) => r.createdAt >= pFrom && r.createdAt < from);
  const clientsIn = (a: number, b: number) => db.users.filter((u) => u.role === 'client' && u.createdAt >= a && u.createdAt < b).length;
  const mastersIn = (a: number, b: number) => db.masters.filter((m) => m.createdAt >= a && m.createdAt < b).length;

  // Kunlar (Toshkent vaqti, UTC+5)
  const tz = 5 * 3600_000;
  const key = (t: number) => new Date(t + tz).toISOString().slice(0, 10);
  const daily = new Map<string, { orders: number; completed: number; cancelled: number; gmv: number; revenue: number }>();
  for (let t = from; key(t) <= key(now); t += DAY) daily.set(key(t), { orders: 0, completed: 0, cancelled: 0, gmv: 0, revenue: 0 });
  for (const o of cur) {
    const d = daily.get(key(o.createdAt));
    if (!d) continue;
    d.orders++;
    if (o.status === 'completed') {
      d.completed++;
      d.gmv += total(o);
      d.revenue += o.platformFee ?? 0;
    } else if (o.status === 'cancelled') d.cancelled++;
  }

  const byCat = new Map<CategoryId, { orders: number; completed: number; gmv: number }>();
  for (const o of cur) {
    const c = byCat.get(o.categoryId) ?? { orders: 0, completed: 0, gmv: 0 };
    c.orders++;
    if (o.status === 'completed') {
      c.completed++;
      c.gmv += total(o);
    }
    byCat.set(o.categoryId, c);
  }
  const reasons = new Map<string, { reason: string; cancelledBy: CancelledBy | null; count: number }>();
  for (const o of cur.filter((x) => x.status === 'cancelled')) {
    const k = `${o.cancelReason}|${o.cancelledBy}`;
    const r = reasons.get(k) ?? { reason: o.cancelReason ?? '—', cancelledBy: o.cancelledBy, count: 0 };
    r.count++;
    reasons.set(k, r);
  }
  const top = new Map<string, { jobs: number; gmv: number; revenue: number }>();
  for (const o of cur.filter((x) => x.status === 'completed' && x.masterId)) {
    const t = top.get(o.masterId!) ?? { jobs: 0, gmv: 0, revenue: 0 };
    t.jobs++;
    t.gmv += total(o);
    t.revenue += o.platformFee ?? 0;
    top.set(o.masterId!, t);
  }
  const all = allMasters(db);
  const c = sum(cur);
  const p = sum(prev);
  const lastBySupport = new Map<string, DSupport>();
  for (const s of db.support) {
    const l = lastBySupport.get(s.userId);
    if (!l || l.at < s.at) lastBySupport.set(s.userId, s);
  }
  return {
    days,
    period: {
      ...c,
      clients: clientsIn(from, now + 1),
      masters: mastersIn(from, now + 1),
      rating: avg(cr),
      reviews: cr.length,
      prev: { ...p, clients: clientsIn(pFrom, from), masters: mastersIn(pFrom, from), rating: avg(pr) },
    },
    live: {
      online: all.filter((m) => m.online && !m.blockedAt).length,
      busy: all.filter((m) => m.busy).length,
      active: db.orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length,
      searching: db.orders.filter((o) => o.status === 'searching').length,
      scheduled: db.orders.filter((o) => o.status === 'scheduled').length,
      pending: all.filter((m) => m.verifyStatus === 'pending').length,
      blockedByBalance: all.filter((m) => !m.canTake).length,
      supportWaiting: [...lastBySupport.values()].filter((s) => s.senderId === s.userId).length,
    },
    daily: [...daily.entries()].map(([day, v]) => ({ day, ...v })),
    byCategory: [...byCat.entries()].map(([categoryId, v]) => ({ categoryId, ...v })).sort((a, b) => b.orders - a.orders),
    cancelReasons: [...reasons.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    topMasters: [...top.entries()]
      .map(([id, v]) => {
        const m = all.find((x) => x.id === id);
        return { id, name: m ? `${m.firstName} ${m.lastName}` : null, rating: m?.rating ?? null, ...v };
      })
      .sort((a, b) => b.jobs - a.jobs || b.gmv - a.gmv)
      .slice(0, 8),
  };
}

// ---------- Namunaviy hujjat rasmlari (SVG) ----------
function docSvg(kind: 'passport' | 'selfie' | 'work', text: string, cat?: CategoryId) {
  const esc = (s: string) => s.replace(/[<>&"']/g, '');
  const body =
    kind === 'passport'
      ? `<rect width="640" height="420" rx="24" fill="#E9EEF5"/><rect x="0" y="0" width="640" height="70" rx="24" fill="#1F4E79"/><text x="32" y="46" font-family="Arial" font-size="26" fill="#fff" font-weight="700">O'ZBEKISTON RESPUBLIKASI · PASPORT</text><rect x="32" y="100" width="170" height="220" rx="12" fill="#C9D3DF"/><circle cx="117" cy="180" r="44" fill="#9AA9BA"/><rect x="62" y="236" width="110" height="70" rx="35" fill="#9AA9BA"/><text x="232" y="140" font-family="Arial" font-size="22" fill="#45556A">Familiyasi / Ismi</text><text x="232" y="176" font-family="Arial" font-size="30" fill="#0B2A24" font-weight="700">${esc(text)}</text><text x="232" y="230" font-family="Arial" font-size="22" fill="#45556A">Pasport seriyasi</text><text x="232" y="264" font-family="Arial" font-size="28" fill="#0B2A24" font-weight="700">AD 1234567</text><text x="32" y="380" font-family="Arial" font-size="20" fill="#B83A26" font-weight="700">NAMUNA · SINOV REJIMI</text>`
      : kind === 'selfie'
        ? `<rect width="640" height="420" rx="24" fill="#EEF2EF"/><circle cx="320" cy="170" r="80" fill="#B9C7C1"/><rect x="200" y="260" width="240" height="160" rx="110" fill="#B9C7C1"/><rect x="380" y="230" width="190" height="130" rx="10" fill="#1F4E79" opacity="0.85"/><text x="400" y="305" font-family="Arial" font-size="22" fill="#fff" font-weight="700">PASPORT</text><text x="24" y="44" font-family="Arial" font-size="22" fill="#4E625C">Selfi: ${esc(text)}</text><text x="24" y="400" font-family="Arial" font-size="20" fill="#B83A26" font-weight="700">NAMUNA · SINOV REJIMI</text>`
        : `<rect width="640" height="420" rx="24" fill="${cat ? '#E3F1FB' : '#EEF2EF'}"/><path d="M0 330 L160 220 L300 300 L430 190 L640 330 L640 420 L0 420 Z" fill="#9FB1AA"/><circle cx="500" cy="110" r="44" fill="#F5B800"/><text x="24" y="50" font-family="Arial" font-size="26" fill="#0B2A24" font-weight="700">Ish namunasi #${esc(text)}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">${body}</svg>`;
  // base64 — brauzer rasm sifatida ishonchli ochadi (utf8 shaklini RN-web Image ko'rsatmaydi)
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// ---------- API ----------
export const demoAdmin: AdminApi = {
  async me() {
    const s = useAdminSession.getState();
    return s.phone === DEMO_ADMIN_PHONE ? { id: ADMIN_ID, phone: s.phone, name: 'Admin' } : null;
  },

  async stats(days) {
    const db = await load();
    await wait();
    return stats(db, days);
  },

  async masters(q) {
    const db = await load();
    await wait();
    let rows = allMasters(db);
    const f = q.filter;
    if (f === 'pending' || f === 'approved' || f === 'rejected' || f === 'none') rows = rows.filter((m) => m.verifyStatus === f);
    else if (f === 'online') rows = rows.filter((m) => m.online);
    else if (f === 'blocked') rows = rows.filter((m) => m.blockedAt);
    else if (f === 'lowBalance') rows = rows.filter((m) => !m.canTake);
    if (q.category) rows = rows.filter((m) => m.categories.includes(q.category!));
    rows = rows.filter((m) => matches(q.q, `${m.firstName} ${m.lastName}`, m.phone));
    const val = (m: AdminMaster) =>
      ({ created: m.createdAt, rating: m.rating ?? -1, balance: m.balance, jobs: m.jobsDone, activity: m.activity })[q.sort];
    if (f === 'pending' && q.sort === 'created') rows.sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
    else rows.sort((a, b) => (q.dir === 'asc' ? val(a) - val(b) : val(b) - val(a)));
    return paginate(rows, q.page, q.pageSize);
  },

  async master(id) {
    const db = await load();
    await wait();
    const m = allMasters(db).find((x) => x.id === id);
    if (!m) return null;
    return {
      master: m,
      passportUrl: m.passport,
      selfieUrl: m.selfie,
      workUrls: m.works,
      subscriptions: db.subs.filter((s) => s.masterId === id).sort((a, b) => b.periodEnd - a.periodEnd),
    };
  },

  async setVerify(id, status, note) {
    const db = await load();
    if (status === 'rejected') checkReason(note);
    const n = status === 'rejected' ? clean(note) : null;
    if (id === LOCAL_MASTER_ID) {
      const from = useMaster.getState().profile.status;
      useMaster.getState().setVerifyStatus(status);
      db.local.verifyNote = n;
      log(db, 'verify', 'master', id, { from, to: status, note: n });
    } else {
      const m = findMaster(db, id);
      log(db, 'verify', 'master', id, { from: m.verifyStatus, to: status, note: n });
      m.verifyStatus = status;
      m.verifyNote = n;
      if (status === 'pending') m.submittedAt = Date.now();
    }
    save();
    await wait();
  },

  async adjustBalance(id, amount, kind, note) {
    const db = await load();
    checkBalance(amount, kind, note);
    let after: number;
    let name: string;
    if (id === LOCAL_MASTER_ID) {
      useMaster.setState((s) => ({ balance: s.balance + amount }));
      after = useMaster.getState().balance;
      name = `${useMaster.getState().profile.firstName} ${useMaster.getState().profile.lastName}`;
    } else {
      const m = findMaster(db, id);
      m.balance += amount;
      after = m.balance;
      name = `${m.firstName} ${m.lastName}`;
    }
    db.ops.unshift({ id: `op${db.seq++}`, masterId: id, masterName: name, amount, balanceAfter: after, kind, orderId: null, note: clean(note) || null, adminPhone: DEMO_ADMIN_PHONE, createdAt: Date.now() });
    log(db, 'balance', 'master', id, { amount, kind, balance: after, note: clean(note) || null });
    save();
    await wait();
    return after;
  },

  async addSubscription(id, days, amount) {
    const db = await load();
    checkSubscription(days, amount);
    let until: number;
    if (id === LOCAL_MASTER_ID) {
      const start = Math.max(Date.now(), useMaster.getState().subscriptionUntil || 0);
      until = start + days * DAY;
      useMaster.setState({ subscriptionUntil: until });
      db.subs.unshift({ id: `s${db.seq++}`, masterId: id, periodStart: start, periodEnd: until, amount, status: 'paid' });
    } else {
      const m = findMaster(db, id);
      const start = Math.max(Date.now(), m.subscriptionUntil ?? 0);
      until = start + days * DAY;
      m.subscriptionUntil = until;
      db.subs.unshift({ id: `s${db.seq++}`, masterId: id, periodStart: start, periodEnd: until, amount, status: 'paid' });
    }
    log(db, 'subscription', 'master', id, { days, amount, until: new Date(until).toISOString() });
    save();
    await wait();
    return until;
  },

  async setPriority(id, points) {
    const db = await load();
    checkPriority(points);
    if (id === LOCAL_MASTER_ID) {
      log(db, 'priority', 'master', id, { from: useMaster.getState().priorityPoints, to: points });
      useMaster.setState({ priorityPoints: points });
    } else {
      const m = findMaster(db, id);
      log(db, 'priority', 'master', id, { from: m.priority, to: points });
      m.priority = points;
    }
    save();
    await wait();
  },

  async deleteAccount(id, reason) {
    const db = await load();
    checkReason(reason);
    if (id === LOCAL_MASTER_ID) throw new AdminError('errors.deleteLocal');
    const u = findUser(db, id);
    if (u.deletedAt) throw new AdminError('errors.notFound');
    if (u.role === 'admin') throw new AdminError('errors.deleteAdmin');
    if (db.orders.some((o) => (o.clientId === id || o.masterId === id) && o.status !== 'completed' && o.status !== 'cancelled')) {
      throw new AdminError('errors.activeOrders');
    }
    const m = db.masters.find((x) => x.id === id);
    log(db, 'delete_account', m ? 'master' : 'user', id, { reason: clean(reason), name: m ? `${m.firstName} ${m.lastName}` : u.name, phone: `…${u.phone.slice(-4)}` });
    // Buyurtmalar tarixi qoladi (anonim): ism, raqam, hujjatlar va yozishmalar o'chadi, ro'yxatlarda ko'rinmaydi
    Object.assign(u, { deletedAt: Date.now(), name: null, phone: '', blockedAt: Date.now(), blockedReason: 'deleted' });
    if (m) Object.assign(m, { firstName: '', lastName: '', online: false });
    db.support = db.support.filter((x) => x.userId !== id);
    save();
    await wait();
  },

  async setBlocked(id, blocked, reason) {
    const db = await load();
    if (blocked) checkReason(reason);
    const r = blocked ? clean(reason) : null;
    if (id === LOCAL_MASTER_ID) {
      db.local.blockedAt = blocked ? Date.now() : null;
      db.local.blockedReason = r;
      if (blocked) useMaster.setState({ online: false });
      log(db, blocked ? 'block' : 'unblock', 'master', id, { reason: r });
    } else {
      const u = findUser(db, id);
      if (blocked && u.role === 'admin') throw new AdminError('errors.blockAdmin');
      u.blockedAt = blocked ? Date.now() : null;
      u.blockedReason = r;
      const m = db.masters.find((x) => x.id === id);
      if (m && blocked) m.online = false;
      log(db, blocked ? 'block' : 'unblock', m ? 'master' : 'user', id, { reason: r });
    }
    save();
    await wait();
  },

  async orders(q) {
    const db = await load();
    await wait();
    let rows = db.orders;
    if (q.filter === 'active') rows = rows.filter((o) => ACTIVE_STATUSES.includes(o.status));
    else if (q.filter !== 'all') rows = rows.filter((o) => o.status === q.filter);
    if (q.category) rows = rows.filter((o) => o.categoryId === q.category);
    if (q.days) rows = rows.filter((o) => o.createdAt >= Date.now() - q.days! * DAY);
    if (q.masterId) rows = rows.filter((o) => o.masterId === q.masterId);
    if (q.clientId) rows = rows.filter((o) => o.clientId === q.clientId);
    let views = rows.map((o) => orderView(db, o));
    if (q.q.trim()) views = views.filter((o) => matches(q.q, o.id, o.address, o.clientName, o.clientPhone, o.masterName, o.masterPhone));
    return paginate(views, q.page, q.pageSize);
  },

  async order(id) {
    const db = await load();
    await wait();
    const o = db.orders.find((x) => x.id === id);
    if (!o) return null;
    const r = db.reviews.find((x) => x.orderId === id);
    return {
      order: orderView(db, o),
      photoUrls: [],
      offers: db.offers.filter((x) => x.orderId === id).sort((a, b) => a.sentAt - b.sentAt),
      chat: db.chats.filter((c) => c.orderId === id).sort((a, b) => a.at - b.at).map((c) => ({ id: c.id, senderId: c.senderId, mine: c.senderId === o.masterId, text: c.text, at: c.at })),
      review: r ? reviewView(db, r) : null,
      reports: (db.reports ?? []).filter((x) => x.orderId === id).map((x) => reportView(db, x)),
    };
  },

  async cancelOrder(id, reason) {
    const db = await load();
    checkReason(reason);
    const o = db.orders.find((x) => x.id === id);
    if (!o) throw new AdminError('errors.notFound');
    if (o.status === 'completed' || o.status === 'cancelled') throw new AdminError('errors.orderClosed');
    const from = o.status;
    o.status = 'cancelled';
    o.cancelReason = clean(reason);
    o.cancelledBy = 'admin';
    o.updatedAt = Date.now();
    if (o.masterId) {
      const m = db.masters.find((x) => x.id === o.masterId);
      if (m) m.busy = false;
    }
    log(db, 'cancel', 'order', id, { from, reason: o.cancelReason });
    save();
    await wait();
  },

  async users(q) {
    const db = await load();
    await wait();
    let rows = db.users.filter((u) => !u.deletedAt).map((u) => userView(db, u));
    const local = localMaster(db);
    if (local) rows.unshift(local.u);
    if (q.filter === 'clients') rows = rows.filter((u) => !u.isMaster && u.role !== 'admin');
    else if (q.filter === 'masters') rows = rows.filter((u) => u.isMaster);
    else if (q.filter === 'admins') rows = rows.filter((u) => u.role === 'admin');
    else if (q.filter === 'blocked') rows = rows.filter((u) => u.blockedAt);
    rows = rows.filter((u) => matches(q.q, u.name, u.phone));
    rows.sort((a, b) => b.createdAt - a.createdAt);
    return paginate(rows, q.page, q.pageSize);
  },

  async user(id) {
    const db = await load();
    await wait();
    if (id === LOCAL_MASTER_ID) return localMaster(db)?.u ?? null;
    const u = db.users.find((x) => x.id === id && !x.deletedAt);
    return u ? userView(db, u) : null;
  },

  async reviews(q) {
    const db = await load();
    await wait();
    let rows = db.reviews;
    if (q.stars === 'low') rows = rows.filter((r) => r.stars <= 2);
    else if (q.stars) rows = rows.filter((r) => r.stars === q.stars);
    if (q.masterId) rows = rows.filter((r) => r.masterId === q.masterId);
    if (q.clientId) rows = rows.filter((r) => r.clientId === q.clientId);
    if (q.q.trim()) rows = rows.filter((r) => matches(q.q, r.comment));
    return paginate([...rows].sort((a, b) => b.createdAt - a.createdAt).map((r) => reviewView(db, r)), q.page, q.pageSize);
  },

  async deleteReview(id, reason) {
    const db = await load();
    checkReason(reason);
    const i = db.reviews.findIndex((r) => r.id === id);
    if (i < 0) throw new AdminError('errors.notFound');
    const [r] = db.reviews.splice(i, 1);
    log(db, 'delete_review', 'review', id, { reason: clean(reason), stars: r.stars, comment: r.comment, master_id: r.masterId, order_id: r.orderId });
    save();
    await wait();
  },

  async balanceOps(q) {
    const db = await load();
    await wait();
    let rows = db.ops;
    if (q.kind) rows = rows.filter((o) => o.kind === q.kind);
    if (q.masterId) rows = rows.filter((o) => o.masterId === q.masterId);
    return paginate(rows, q.page, q.pageSize);
  },

  async supportThreads() {
    const db = await load();
    await wait();
    const by = new Map<string, DSupport[]>();
    for (const s of db.support) by.set(s.userId, [...(by.get(s.userId) ?? []), s]);
    return [...by.entries()]
      .map(([userId, list]) => {
        const last = list.reduce((a, b) => (a.at > b.at ? a : b));
        const u = db.users.find((x) => x.id === userId);
        return { userId, name: u?.name ?? null, phone: u?.phone ?? '', role: u?.role ?? 'client', lastText: last.text, lastAt: last.at, waiting: last.senderId === userId, messages: list.length };
      })
      .sort((a, b) => Number(b.waiting) - Number(a.waiting) || b.lastAt - a.lastAt);
  },

  async supportMessages(userId) {
    const db = await load();
    await wait();
    return db.support
      .filter((s) => s.userId === userId)
      .sort((a, b) => a.at - b.at)
      .map((s): ChatLine => ({ id: s.id, senderId: s.senderId, mine: s.senderId !== userId, text: s.text, at: s.at }));
  },

  async supportReply(userId, text) {
    const db = await load();
    const body = clean(text, RULES.messageMax);
    if (!body) throw new AdminError('errors.emptyMessage');
    findUser(db, userId);
    db.support.push({ id: `m${db.seq++}`, userId, senderId: ADMIN_ID, text: body, at: Date.now() });
    save();
    await wait();
  },

  async catalog() {
    const db = await load();
    await wait();
    return { categories: db.categories.map((c) => ({ ...c })), problems: db.problems.map((p) => ({ ...p })) };
  },

  async updateCategory(id, callFee, active) {
    const db = await load();
    checkCallFee(callFee);
    const c = db.categories.find((x) => x.id === id);
    if (!c) throw new AdminError('errors.notFound');
    log(db, 'category', 'category', id, { call_fee: [c.callFee, callFee], active: [c.active, active] });
    c.callFee = callFee;
    c.active = active;
    save();
    await wait();
  },

  async updateProblem(id, min, max) {
    const db = await load();
    checkPriceRange(min, max);
    const p = db.problems.find((x) => x.id === id);
    if (!p) throw new AdminError('errors.notFound');
    log(db, 'problem', 'problem', id, { from: [p.priceMin, p.priceMax], to: [min, max] });
    p.priceMin = min;
    p.priceMax = max;
    save();
    await wait();
  },

  async promos() {
    const db = await load();
    await wait();
    return [...db.promos].sort((a, b) => b.createdAt - a.createdAt).map((p) => ({ ...p }));
  },

  async savePromo(input) {
    const db = await load();
    const p = { ...input, code: input.code.trim().toUpperCase() };
    checkPromo(p);
    const old = db.promos.find((x) => x.code === p.code);
    if (old) Object.assign(old, p);
    else db.promos.push({ ...p, uses: 0, createdAt: Date.now() });
    log(db, 'promo', 'promo', p.code, { new: !old, priority: p.priority, bonus: p.bonus, max_uses: p.maxUses, active: p.active });
    save();
    await wait();
  },

  async freePasses() {
    const db = await load();
    const list = await loadDemoPasses();
    const all = allMasters(db);
    await wait();
    return list
      .map((p) => {
        const m = p.redeemedAt ? all.find((x) => x.phone === p.phone) : undefined;
        return {
          ...p,
          sentAt: p.sentVia ? p.createdAt : null,
          masterId: m?.id ?? null,
          masterName: m ? `${m.firstName} ${m.lastName}`.trim() : null,
          freeUntil: m?.freeUntil ?? null,
          status: passStatus(p),
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },

  async createFreePass(phone, days) {
    const db = await load();
    const ph = normalizePhone(phone);
    if (!ph) throw new AdminError('errors.phone');
    if (![30, 60, 90].includes(days)) throw new AdminError('errors.invalid');
    const list = await loadDemoPasses();
    if (list.some((p) => p.phone === ph && p.redeemedAt)) throw new AdminError('errors.freeUsed');
    const now = Date.now();
    for (const p of list) if (p.phone === ph && !p.redeemedAt && !p.revokedAt) Object.assign(p, { revokedAt: now, revokeReason: 'replaced' });
    let code = newFreeCode();
    while (list.some((p) => p.code === code)) code = newFreeCode();
    list.push({ code, phone: ph, days, createdAt: now, redeemBy: now + FREE_REDEEM_DAYS * DAY, sentVia: null, redeemedAt: null, revokedAt: null, revokeReason: null });
    await saveDemoPasses(list);
    log(db, 'free_pass', 'promo', code, { phone: ph.slice(-4), days });
    save();
    await wait();
    return code;
  },

  async sendFreePass() {
    // Sinov rejimida bot ham, SMS ham yo'q — kodni nusxalab o'zingiz yuborasiz
    await wait();
    return 'demo';
  },

  async revokeFreePass(code, reason) {
    const db = await load();
    checkReason(reason);
    const list = await loadDemoPasses();
    const p = list.find((x) => x.code === code);
    if (!p) throw new AdminError('errors.notFound');
    if (p.revokedAt) throw new AdminError('errors.invalid');
    Object.assign(p, { revokedAt: Date.now(), revokeReason: clean(reason) });
    await saveDemoPasses(list);
    if (p.redeemedAt) {
      const local = localMaster(db);
      if (local && local.m.phone === p.phone) useMaster.setState({ freeUntil: null });
      const dm = db.masters.find((m) => db.users.find((u) => u.id === m.id)?.phone === p.phone);
      if (dm) dm.freeUntil = null;
    }
    log(db, 'free_pass_revoke', 'promo', code, { reason: clean(reason), redeemed: !!p.redeemedAt });
    save();
    await wait();
  },

  async setFree(id, days, reason) {
    const db = await load();
    checkReason(reason);
    const now = Date.now();
    const next = (from: number | null | undefined) => (days === 0 ? null : Math.max(now, from ?? now) + days * DAY);
    let until: number | null;
    let from: number | null;
    if (id === LOCAL_MASTER_ID) {
      const mp = useMaster.getState();
      if (days > 0 && (!mp.profile.passportPhoto || !['pending', 'approved'].includes(mp.profile.status))) throw new AdminError('errors.passportRequired');
      from = mp.freeUntil;
      until = next(from);
      useMaster.setState({ freeUntil: until });
    } else {
      const m = findMaster(db, id);
      if (days > 0 && (!m.hasDocs || !['pending', 'approved'].includes(m.verifyStatus))) throw new AdminError('errors.passportRequired');
      from = m.freeUntil ?? null;
      until = next(from);
      m.freeUntil = until;
    }
    log(db, 'free_period', 'master', id, { days, from, to: until, reason: clean(reason) });
    save();
    await wait();
    return until;
  },

  async freeStats() {
    const db = await load();
    const list = await loadDemoPasses();
    const all = allMasters(db);
    await wait();
    return {
      activeMasters: all.filter((m) => freeActive(m.freeUntil, m.verifyStatus)).length,
      waived: 0,
      pending: list.filter((p) => passStatus(p) === 'pending').length,
      redeemed: list.filter((p) => p.redeemedAt).length,
    };
  },

  async log(q) {
    const db = await load();
    await wait();
    let rows: LogEntry[] = db.log;
    if (q.action) rows = rows.filter((l) => l.action === q.action);
    if (q.targetId) rows = rows.filter((l) => l.targetId === q.targetId);
    return paginate(rows, q.page, q.pageSize);
  },

  async admins() {
    const db = await load();
    await wait();
    return db.users.filter((u) => u.role === 'admin').map((u) => userView(db, u));
  },

  async setAdmin(phone, admin) {
    const db = await load();
    const p = normalizePhone(phone);
    if (!p) throw new AdminError('errors.phone');
    const u = db.users.find((x) => x.phone === p);
    if (!u) throw new AdminError('errors.phoneNotRegistered');
    if (!admin && u.id === ADMIN_ID) throw new AdminError('errors.revokeSelf');
    if (admin) {
      u.role = 'admin';
      u.blockedAt = null;
      u.blockedReason = null;
    } else if (u.role === 'admin') {
      u.role = db.masters.some((m) => m.id === u.id) ? 'master' : 'client';
    }
    log(db, admin ? 'grant_admin' : 'revoke_admin', 'user', u.id, { phone: p });
    save();
    await wait();
  },

  async live() {
    const db = await load();
    await wait();
    const pts: LivePoint[] = [];
    for (const m of allMasters(db)) {
      if (!m.online || m.blockedAt || !m.location) continue;
      pts.push({ id: m.id, kind: 'master', location: m.location, label: `${m.firstName} ${m.lastName}`, status: m.busy ? 'busy' : 'free', categoryId: m.categories[0] });
    }
    for (const o of db.orders) {
      if (!(o.status === 'searching' || o.status === 'scheduled' || ACTIVE_STATUSES.includes(o.status))) continue;
      pts.push({ id: o.id, kind: 'order', location: o.location, label: o.address, status: o.status, categoryId: o.categoryId });
    }
    return pts;
  },

  async reports(q) {
    const db = await load();
    await wait();
    const rows = (db.reports ?? []).filter((r) => q.status === 'all' || r.status === q.status).sort((a, b) => b.createdAt - a.createdAt);
    return paginate(rows.map((r) => reportView(db, r)), q.page, q.pageSize);
  },

  async resolveReport(id, note) {
    const db = await load();
    checkReason(note);
    const r = (db.reports ?? []).find((x) => x.id === id);
    if (!r) throw new AdminError('errors.notFound');
    if (r.status === 'resolved') throw new AdminError('errors.reportClosed');
    r.status = 'resolved';
    r.resolution = clean(note);
    r.resolvedAt = Date.now();
    log(db, 'report_resolve', 'report', id, { kind: r.kind, order: r.orderId, note: r.resolution });
    save();
    await wait();
  },

  // Sinov rejimida haqiqiy statistika yo'q — namunaviy voronka (ilova serverga ulanganda haqiqiysi)
  async funnel(days) {
    await wait();
    const k = Math.max(1, days) / 7;
    const n = (x: number) => Math.round(x * k);
    return [
      { name: 'app_open', devices: n(620), events: n(1480) },
      { name: 'order_open', devices: n(240), events: n(410) },
      { name: 'order_submit', devices: n(150), events: n(190) },
      { name: 'phone_open', devices: n(120), events: n(140) },
      { name: 'signed_in', devices: n(96), events: n(101) },
      { name: 'order_created', devices: n(88), events: n(131) },
      { name: 'no_master', devices: n(14), events: n(17) },
      { name: 'order_completed', devices: n(71), events: n(102) },
      { name: 'rated', devices: n(52), events: n(74) },
      { name: 'master_register_open', devices: n(40), events: n(55) },
      { name: 'master_registered', devices: n(18), events: n(18) },
    ];
  },

  async errors() {
    await wait();
    return [];
  },
};
