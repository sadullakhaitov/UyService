// Soxta ma'lumotlar (3–4-bosqich). 5-bosqichda Supabase'ga almashtiriladi.
import type { CategoryId } from '@/constants/categories';
import type { LatLng } from '@/lib/geo';

export const TASHKENT_CENTER: LatLng = { latitude: 41.3111, longitude: 69.2797 };

export const mockClient = {
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
];


export const mockFavorites = ['m1'];

export type MockHistoryItem = {
  id: string;
  categoryId: CategoryId;
  problemId: string;
  masterId: string;
  date: string;
  price: number;
  status: 'completed' | 'cancelled';
  stars?: number;
};

export const mockHistory: MockHistoryItem[] = [
  { id: 'o3', categoryId: 'plumber', problemId: 'tap', masterId: 'm1', date: '28-sentyabr', price: 145_000, status: 'completed', stars: 5 },
  { id: 'o2', categoryId: 'electric', problemId: 'socket', masterId: 'm2', date: '12-sentyabr', price: 90_000, status: 'completed', stars: 5 },
  { id: 'o1', categoryId: 'aircon', problemId: 'acCleaning', masterId: 'm3', date: '20-avgust', price: 0, status: 'cancelled' },
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
    title: "UyService qo'llab-quvvatlash",
    subtitle: 'Savolingiz bormi? Yozing',
    kind: 'support' as const,
    unread: 1,
    messages: [{ id: 's1', mine: false, text: "Assalomu alaykum! UyService'ga xush kelibsiz. Savollaringiz bo'lsa, shu yerga yozing.", at: minAgo(180) }],
  },
  {
    id: 'news',
    title: 'Yangiliklar',
    subtitle: "Konditsioner mavsumi: buyurtmalar ko'paydi",
    kind: 'news' as const,
    unread: 2,
    messages: [
      { id: 'n1', mine: false, text: "Yangi: endi taklifni ko'rib chiqish uchun 60 soniya beriladi.", at: minAgo(600) },
      { id: 'n2', mine: false, text: "Konditsioner mavsumi: Chilonzor va Yunusobodda buyurtmalar ko'paydi.", at: minAgo(90) },
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

export const mockOffer = {
  id: 'of1',
  categoryId: 'plumber' as CategoryId,
  problemId: 'tap',
  description: "Oshxonadagi kran ostidan suv tomchilayapti, shkaf ichi ho'l bo'lib qoldi.",
  address: mockClient.address,
  distanceKm: 1.8,
  etaMin: 12,
};

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
