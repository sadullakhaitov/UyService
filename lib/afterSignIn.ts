// Raqam tasdiqlangandan keyin (SMS kod yoki Telegram) — qayerga o'tish: buyurtma avtomatik yuboriladi,
// usta anketasi / tarif yoki profil. app/(auth)/code.tsx va phone.tsx (Telegram tugmasi) ishlatadi.
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useMaster, useUser } from '@/store';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { displayPhone, telegram, telegramSignIn } from './telegram';

export function afterSignIn(phone: string, next: string | undefined, name?: string) {
  const u = useUser.getState();
  u.setPhone(phone);
  if (name && !u.name) u.setName(name);
  if (next === 'order') {
    router.dismissTo({ pathname: '/client/order', params: { autoSubmit: '1' } });
  } else if (next === 'master') {
    u.setRole('master');
    const registered = Boolean(useMaster.getState().profile.submittedAt);
    router.replace(!registered ? '/master/register' : u.billingPlan ? '/master' : '/master/plan');
  } else {
    router.dismissTo('/client/account');
  }
}

/**
 * Server rejimida telefondagi raqam = Supabase sessiyasi. Sessiya yo'q bo'lsa (sinov rejimidan qolgan "kirish",
 * muddati o'tgan yoki boshqa joyda chiqilgan) — raqam o'chiriladi va keyingi buyurtmada qayta tasdiqlanadi;
 * Telegram ichida bog'langan foydalanuvchi o'zi kiradi. Sessiya bor-u raqam yo'q bo'lsa (masalan, /admin orqali
 * kirgan) — raqam sessiyadan olinadi. Ildiz _layout'da, saqlangan sozlamalar o'qilgandan keyin.
 */
export function useSessionSync(hydrated: boolean) {
  useEffect(() => {
    const db = getSupabase();
    if (!hydrated || !isSupabaseConfigured || !db) return;
    let alive = true;
    void db.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const u = useUser.getState();
      const fromSession = displayPhone(data.session?.user.phone);
      if (data.session) {
        if (!u.phone && fromSession) u.setPhone(fromSession);
        return;
      }
      if (u.phone) u.setPhone('');
      if (!telegram()) return;
      const r = await telegramSignIn();
      if (!alive || !r.ok) return;
      u.setPhone(r.phone);
      if (!useUser.getState().name && r.name) u.setName(r.name);
    });
    const sub = db.auth.onAuthStateChange((event, session) => {
      const u = useUser.getState();
      if (event === 'SIGNED_OUT' && u.phone) u.setPhone('');
      const p = displayPhone(session?.user.phone);
      if (event === 'SIGNED_IN' && !u.phone && p) u.setPhone(p);
    });
    return () => {
      alive = false;
      sub.data.subscription.unsubscribe();
    };
  }, [hydrated]);
}
