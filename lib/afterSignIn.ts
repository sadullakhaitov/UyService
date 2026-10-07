// Raqam tasdiqlangandan keyin (SMS kod yoki Telegram) — qayerga o'tish: buyurtma avtomatik yuboriladi,
// usta anketasi / tarif yoki profil. app/(auth)/code.tsx va phone.tsx (Telegram tugmasi) ishlatadi.
import { router } from 'expo-router';
import { useMaster, useUser } from '@/store';

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
