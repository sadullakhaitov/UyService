// Yetib kelish vaqti haqiqiy ko'chalar bo'yicha (TZ 7-bo'lim: "eng yaqin 10 ta uchun yo'l xizmati").
// Hozircha bepul OSRM "table" xizmati (ilovadagi lib/routes.ts bilan bir xil serverlar): bitta so'rovda
// eng yaqin ustalardan buyurtma manziligacha vaqt. Javob bo'lmasa (2,5 s) yoki xato — taxminiy hisob (estimateEtaMin).
// Keyin Google Routes / Yandex'ga almashtirish uchun faqat shu fayl o'zgaradi.
// Sozlash: DISPATCH_ROUTING=off — o'chirish (sinovlar), OSRM_URL — o'z serveringiz (…/table/v1/driving).
import { DISPATCH, distanceKm, estimateEtaMin, type EtaFn, type LatLng } from './dispatch.ts';

const SERVERS = ['https://routing.openstreetmap.de/routed-car/table/v1/driving', 'https://router.project-osrm.org/table/v1/driving'];
const TIMEOUT_MS = 2500;

const key = (p: LatLng) => `${p.latitude.toFixed(6)},${p.longitude.toFixed(6)}`;

/**
 * Eng yaqin `routesTopN` ta usta uchun yo'l bo'yicha vaqt (daqiqa) va shu vaqtlarni beradigan EtaFn.
 * Ro'yxatda yo'q yoki xizmat javob bermagan usta — taxminiy vaqt.
 */
export async function roadEta(
  to: LatLng,
  from: LatLng[],
  fetchImpl: typeof fetch = fetch,
  env: (k: string) => string | undefined = (k) => Deno.env.get(k),
): Promise<EtaFn> {
  const known = new Map<string, number>();
  const eta: EtaFn = (a, b) => known.get(key(a)) ?? estimateEtaMin(a, b);
  if (env('DISPATCH_ROUTING') === 'off' || !from.length) return eta;

  const near = [...from].sort((a, b) => distanceKm(a, to) - distanceKm(b, to)).slice(0, DISPATCH.routesTopN);
  const coords = [...near, to].map((p) => `${p.longitude},${p.latitude}`).join(';');
  const qs = `sources=${near.map((_, i) => i).join(';')}&destinations=${near.length}&annotations=duration`;
  const custom = env('OSRM_URL');
  for (const base of custom ? [custom] : SERVERS) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      const res = await fetchImpl(`${base}/${coords}?${qs}`, { signal: ctl.signal }).finally(() => clearTimeout(timer));
      if (!res.ok) continue;
      const body = (await res.json()) as { code?: string; durations?: (number | null)[][] };
      if (body.code !== 'Ok' || !Array.isArray(body.durations)) continue;
      body.durations.forEach((row, i) => {
        const s = row?.[0];
        if (typeof s === 'number' && Number.isFinite(s) && near[i]) known.set(key(near[i]), Math.max(1, Math.round(s / 60)));
      });
      return eta;
    } catch {
      // vaqt tugadi yoki tarmoq — keyingi server
    }
  }
  return eta;
}
