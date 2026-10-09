// Soxta ma'lumotlar — faqat sinov rejimi (Supabase kaliti yo'q); server rejimida hammasi bazadan keladi.
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from '@/lib/geo';

export const TASHKENT_CENTER: LatLng = { latitude: 41.3111, longitude: 69.2797 };

const mockClient = {
  name: 'Dilnoza',
  phone: '+998 90 123 45 67',
  location: { latitude: 41.2856, longitude: 69.2036 } as LatLng,
  address: 'Chilonzor 9-kvartal, 14-uy',
};

export type MockMaster = {
  id: string;
  name: string;
  initials: string;
  categories: CategoryId[];
  experienceYears: number;
  rating: number;
  jobsCount: number;
  onTimePercent: number;
  phone: string;
  location: LatLng;
  /** Taqsimlash uchun (TZ, 7-bo'lim) */
  online: boolean;
  verified: boolean;
  activity: number;
  priorityPoints: number;
  /** Soxta: taklifni qabul qilish ehtimoli */
  acceptRate: number;
};

export const mockMasters: MockMaster[] = [
  {
    id: 'm1',
    name: 'Akmal Karimov',
    initials: 'AK',
    categories: ['plumber', 'appliance'],
    experienceYears: 8,
    rating: 4.9,
    jobsCount: 312,
    onTimePercent: 98,
    phone: '+998 93 555 12 12',
    location: { latitude: 41.2961, longitude: 69.2142 },
    online: true,
    verified: true,
    activity: 92,
    priorityPoints: 15,
    acceptRate: 0.8,
  },
  {
    id: 'm2',
    name: 'Sardor Toshmatov',
    initials: 'ST',
    categories: ['electric'],
    experienceYears: 5,
    rating: 4.8,
    jobsCount: 187,
    onTimePercent: 95,
    phone: '+998 97 444 22 33',
    location: { latitude: 41.2898, longitude: 69.1932 },
    online: true,
    verified: true,
    activity: 85,
    priorityPoints: 0,
    acceptRate: 0.75,
  },
  {
    id: 'm3',
    name: 'Bobur Aliyev',
    initials: 'BA',
    categories: ['aircon', 'appliance'],
    experienceYears: 6,
    rating: 4.7,
    jobsCount: 240,
    onTimePercent: 93,
    phone: '+998 99 111 00 77',
    location: { latitude: 41.2789, longitude: 69.2121 },
    online: true,
    verified: true,
    activity: 78,
    priorityPoints: 5,
    acceptRate: 0.7,
  },
  {
    id: 'm4',
    name: 'Jasur Ergashev',
    initials: 'JE',
    categories: ['furniture', 'repair'],
    experienceYears: 10,
    rating: 4.9,
    jobsCount: 401,
    onTimePercent: 97,
    phone: '+998 90 777 66 55',
    location: { latitude: 41.2812, longitude: 69.1951 },
    online: true,
    verified: true,
    activity: 90,
    priorityPoints: 10,
    acceptRate: 0.8,
  },
  {
    id: 'm5',
    name: 'Rustam Qodirov',
    initials: 'RQ',
    categories: ['plumber'],
    experienceYears: 4,
    rating: 4.6,
    jobsCount: 98,
    onTimePercent: 91,
    phone: '+998 91 333 44 55',
    location: { latitude: 41.3005, longitude: 69.1905 },
    online: true,
    verified: true,
    activity: 70,
    priorityPoints: 0,
    acceptRate: 0.85,
  },
  {
    id: 'm6',
    name: 'Shavkat Yusupov',
    initials: 'SY',
    categories: ['electric', 'appliance'],
    experienceYears: 7,
    rating: 4.8,
    jobsCount: 226,
    onTimePercent: 96,
    phone: '+998 94 620 18 40',
    location: { latitude: 41.2779, longitude: 69.2183 },
    online: true,
    verified: true,
    activity: 88,
    priorityPoints: 5,
    acceptRate: 0.85,
  },
  {
    id: 'm7',
    name: 'Ulug\'bek Rahimov',
    initials: 'UR',
    categories: ['aircon', 'electric'],
    experienceYears: 5,
    rating: 4.7,
    jobsCount: 154,
    onTimePercent: 94,
    phone: '+998 95 302 77 61',
    location: { latitude: 41.2941, longitude: 69.1889 },
    online: true,
    verified: true,
    activity: 81,
    priorityPoints: 0,
    acceptRate: 0.8,
  },
  {
    id: 'm8',
    name: 'Anvar Mirzayev',
    initials: 'AM',
    categories: ['repair', 'furniture', 'plumber'],
    experienceYears: 12,
    rating: 4.9,
    jobsCount: 518,
    onTimePercent: 97,
    phone: '+998 90 915 43 09',
    location: { latitude: 41.2748, longitude: 69.2001 },
    online: true,
    verified: true,
    activity: 93,
    priorityPoints: 10,
    acceptRate: 0.85,
  },
];


const daysAgo = (d: number) => Date.now() - d * 86_400_000;

/** Buyurtmalar tarixi (yangi ilovada namuna sifatida; keyingi buyurtmalar ustiga qo'shiladi) */
export type HistoryItem = {
  id: string;
  categoryId: CategoryId;
  problemId: string;
  masterId: string | null;
  /** Usta ismi (server rejimida — master_cards; sinovda mockMasters'dan olinadi) */
  masterName?: string;
  at: number;
  price: number;
  status: 'completed' | 'cancelled';
  address?: string;
  stars?: number;
  tags?: string[];
  comment?: string;
  cancelReason?: string;
  /** Mijoz narxga rozi bo'lmadi — faqat chaqiruv (ko'rik) to'landi */
  inspectionOnly?: boolean;
};


/** Ustalar haqidagi sharhlar (5-bosqichda reviews jadvali) */
export type MockReview = { id: string; masterId: string; author: string; stars: number; text: string; tags: string[]; at: number };

export const mockReviews: MockReview[] = [
  { id: 'r1', masterId: 'm1', author: 'Nodira', stars: 5, text: "Kranni 20 daqiqada almashtirib berdi, juda toza ishladi.", tags: ['clean', 'fast'], at: daysAgo(3) },
  { id: 'r2', masterId: 'm1', author: 'Javohir', stars: 5, text: 'Vaqtida keldi, narxni oldindan aytdi.', tags: ['onTime', 'fair'], at: daysAgo(11) },
  { id: 'r3', masterId: 'm1', author: 'Gulnora', stars: 4, text: "Yaxshi usta, lekin 10 daqiqa kechikdi.", tags: ['polite'], at: daysAgo(19) },
  { id: 'r4', masterId: 'm2', author: 'Bekzod', stars: 5, text: "Butun xonadonga yangi rozetkalar o'rnatdi.", tags: ['fast', 'fair'], at: daysAgo(5) },
  { id: 'r5', masterId: 'm2', author: 'Sevara', stars: 5, text: 'Muloyim, tushuntirib berdi.', tags: ['polite'], at: daysAgo(30) },
  { id: 'r6', masterId: 'm3', author: 'Otabek', stars: 5, text: 'Konditsionerni tozalab, freon quydi — endi zo\'r sovutyapti.', tags: ['clean'], at: daysAgo(6) },
  { id: 'r7', masterId: 'm4', author: 'Dilshod', stars: 5, text: 'Shkafni bir soatda yig\'ib berdi.', tags: ['fast', 'onTime'], at: daysAgo(9) },
  { id: 'r8', masterId: 'm5', author: 'Madina', stars: 4, text: "Quvurni almashtirdi, hammasi joyida.", tags: ['fair'], at: daysAgo(14) },
];

// Usta rejimi uchun
export const mockMasterSelf = {
  ...mockMasters[0],
  activity: 86,
  todayIncome: 320_000,
  todayJobs: 3,
  week: [180_000, 240_000, 0, 410_000, 275_000, 320_000, 0],
  weekJobs: 14,
  monthIncome: 4_850_000,
};

const minAgo = (m: number) => Date.now() - m * 60_000;

export const mockChats = [
  {
    id: 'support',
    // i18n: sarlavha va matnlar — tarjima kalitlari (til almashsa, chat ham o'sha tilda)
    i18n: true,
    title: 'chatMock.supportTitle',
    subtitle: 'chatMock.supportSub',
    kind: 'support' as const,
    unread: 1,
    messages: [{ id: 's1', mine: false, text: 'chatMock.supportHello', at: minAgo(180), i18n: true }],
  },
  {
    id: 'news',
    i18n: true,
    title: 'chatMock.newsTitle',
    subtitle: 'chatMock.newsSub',
    kind: 'news' as const,
    unread: 2,
    messages: [
      { id: 'n1', mine: false, text: 'chatMock.news1', at: minAgo(600), i18n: true },
      { id: 'n2', mine: false, text: 'chatMock.news2', at: minAgo(90), i18n: true },
    ],
  },
  {
    id: 'o3',
    title: 'Dilnoza · Kran oqyapti',
    subtitle: '28-sentyabr buyurtmasi',
    kind: 'client' as const,
    unread: 0,
    messages: [
      { id: 'c1', mine: false, text: "Assalomu alaykum, podyezd kodi 45#", at: minAgo(8000) },
      { id: 'c2', mine: true, text: 'Vaalaykum assalom, 10 daqiqada yetib boraman', at: minAgo(7990) },
      { id: 'c3', mine: false, text: 'Rahmat, kutaman', at: minAgo(7985) },
    ],
  },
];


// Soxta ustalar har doim mijoz tanlagan manzil atrofida chiqadi
// (asl joylashuvlar — standart manzilga nisbatan siljish sifatida olinadi)
export function mastersAround(center: LatLng): MockMaster[] {
  const dLat = center.latitude - mockClient.location.latitude;
  const dLng = center.longitude - mockClient.location.longitude;
  return mockMasters.map((m) => ({
    ...m,
    location: { latitude: m.location.latitude + dLat, longitude: m.location.longitude + dLng },
  }));
}
