// Usta tomoni (7-bosqichgacha soxta "server"):
// 1) onlayn bo'lsa — filtrga mos soxta buyurtmalar taklif sifatida keladi (60 s taymer bilan);
// 2) onlayn yoki ishda bo'lsa — joylashuv har 5 s "serverga" yoziladi (master_locations).
import { router, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { BALANCE_LIMIT, feePercent } from '@/constants/billing';
import { problemsOf, type CategoryId } from '@/constants/categories';
import { MASTER_LOCATION_INTERVAL_MS } from '@/constants/dispatch';
import { publishMasterLocation } from '@/lib/backend';
import { distanceKm, type LatLng } from '@/lib/geo';
import { t } from '@/lib/i18n';
import { notify } from '@/lib/notify';
import { estimateEtaMin } from '@/lib/routes';
import { useWatchLocation } from '@/lib/useWatchLocation';
import { DISPATCH } from '@/constants/dispatch';
import { mockMasterSelf } from '@/mocks';
import { makeDoorCode, useMaster, useMasterWork, useUser, type MasterOrder } from '@/store';
import { useFreeUntil } from './freePass';
import { LIVE } from './live';

export type Blocked = null | 'balance' | 'subscription';

/** Nega buyurtmalar yopiq (Yandex Pro'dagi qizil banner kabi) */
export function useBlocked(): Blocked {
  const { verified, balance, subscriptionUntil } = useMaster();
  const plan = useUser((s) => s.billingPlan) ?? 'commission';
  // Bepul davrda — hech narsa talab qilinmaydi (ulush yo'q, obuna shart emas)
  if (useFreeUntil()) return null;
  // Pasportsiz ham ishlaydi (ulushi +5%). Ulush bo'lsa — balans limitdan past bo'lmasin
  if (feePercent(plan, verified) > 0 && balance < BALANCE_LIMIT) return 'balance';
  if (plan === 'subscription' && subscriptionUntil < Date.now()) return 'subscription';
  return null;
}

// Yangi buyurtma onlayn bo'lgandan keyin 8–20 s ichida keladi (demo uchun tez)
const nextDelay = () => 8000 + Math.random() * 12_000;

const CLIENTS = [
  { name: 'Dilnoza', phone: '+998 90 123 45 67' },
  { name: 'Aziz', phone: '+998 93 210 44 18' },
  { name: 'Malika', phone: '+998 97 765 02 91' },
  { name: 'Shoxrux', phone: '+998 99 480 31 55' },
];
const STREETS = ['Chilonzor 9-kvartal, 14-uy', "Bunyodkor ko'chasi, 21", "Qatortol ko'chasi, 7", "Muqimiy ko'chasi, 45", "Lutfiy ko'chasi, 12"];
const NOTES = ['offer.note1', 'offer.note2', 'offer.note3'];

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/** Ustaning filtriga (kategoriya, radius) mos soxta buyurtma */
function makeMockOrder(here: LatLng, categories: CategoryId[], radiusKm: number): MasterOrder {
  const categoryId = pick(categories.length ? categories : (['plumber'] as CategoryId[]));
  const problem = pick(problemsOf(categoryId));
  // Mijoz 0,6 km dan radiusgacha (ko'pi bilan 3 km) uzoqlikda
  const km = 0.6 + Math.random() * (Math.min(radiusKm, 3) - 0.6);
  const angle = Math.random() * 2 * Math.PI;
  const location = {
    latitude: here.latitude + (km / 111) * Math.cos(angle),
    longitude: here.longitude + (km / (111 * Math.cos((here.latitude * Math.PI) / 180))) * Math.sin(angle),
  };
  const client = pick(CLIENTS);
  return {
    id: `mo${Date.now()}`,
    categoryId,
    problemId: problem.id,
    description: t(pick(NOTES)),
    address: pick(STREETS),
    location,
    clientName: client.name,
    clientPhone: client.phone,
    distanceKm: Math.round(distanceKm(here, location) * 10) / 10,
    etaMin: estimateEtaMin(here, location),
    sentAt: Date.now(),
    doorCode: makeDoorCode(),
  };
}

/** master/_layout'da bir marta ulanadi */
export function useMasterFeed() {
  const online = useMaster((s) => s.online);
  const { categories: filter, radiusKm, notifications, profile } = useMaster();
  // Faqat usta ro'yxatdan o'tgan kategoriyalardan (filtr shular ichidan tanlanadi)
  const own = profile.categories;
  const categories = filter.filter((c) => !own.length || own.includes(c));
  const blocked = useBlocked();
  const offer = useMasterWork((s) => s.offer);
  const job = useMasterWork((s) => s.job);
  const path = usePathname();
  // Joylashuv faqat onlayn yoki ishda bo'lganda kuzatiladi (yengil rejimda — serverga har 5 s yuborish uchun yetadi)
  const sharing = online || Boolean(job);
  const live = useWatchLocation(sharing, 'balanced');
  const here = useRef<LatLng>(useUser.getState().lastLocation ?? mockMasterSelf.location);
  if (live) here.current = live;

  // Takliflar: onlayn, buyurtmalar ochiq, qo'lda taklif ham, ish ham yo'q, tarif ekranida emas
  const canReceive = !LIVE && online && !blocked && !offer && !job && categories.length > 0 && !path.includes('/plan') && !path.includes('/register');
  useEffect(() => {
    if (!canReceive) return;
    const id = setTimeout(() => {
      const o = makeMockOrder(here.current, categories, radiusKm);
      useMasterWork.getState().setOffer(o);
      router.push('/master/offer');
      if (notifications) notify(t('notify.offerTitle'), `${t(`problems.${o.problemId}`)} · ${t('common.km', { value: o.distanceKm })}`, { url: '/master/offer' });
    }, nextDelay());
    return () => clearTimeout(id);
  }, [canReceive, categories.join(), radiusKm, notifications]); // eslint-disable-line react-hooks/exhaustive-deps

  // Taklif muddati shu yerda ham kuzatiladi: usta taklif ekranidan chiqib ketsa ham 60 s dan keyin
  // taklif o'zi yopiladi (aktivlik −5) va yangi takliflar kela boshlaydi — ilova qotib qolmaydi
  useEffect(() => {
    if (!offer || LIVE) return; // serverda muddatni offer-timeout yopadi
    const left = offer.sentAt + DISPATCH.offerTimeoutSec * 1000 - Date.now();
    const id = setTimeout(() => {
      const cur = useMasterWork.getState().offer;
      if (cur?.id !== offer.id) return;
      useMaster.getState().bumpActivity(DISPATCH.activity.declinedOrExpired);
      useMasterWork.getState().setOffer(null);
    }, Math.max(0, left));
    return () => clearTimeout(id);
  }, [offer]);

  // Joylashuv: onlayn yoki ishda bo'lsa — har 5 s
  useEffect(() => {
    if (!sharing) return;
    publishMasterLocation(here.current);
    const id = setInterval(() => publishMasterLocation(here.current), MASTER_LOCATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sharing]);
}
