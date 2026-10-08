import { Redirect } from 'expo-router';
import { useMaster, useUser } from '@/store';

// Birinchi ochilishda — til, yangi foydalanuvchiga kim sifatida (mijoz / usta); mijoz darhol bosh sahifaga (ro'yxatdan o'tish shart emas).
// Ro'yxatdan o'tish faqat usta chaqirganda yoki "Usta bo'lib ishlash"ni tanlaganda so'raladi.
export default function Index() {
  const { language, role, phone, billingPlan } = useUser();
  const registered = useMaster((s) => Boolean(s.profile.submittedAt));
  if (!language) return <Redirect href="/welcome" />;
  if (role === 'master' && phone) return <Redirect href={!registered ? '/master/register' : billingPlan ? '/master' : '/master/plan'} />;
  return <Redirect href="/client" />;
}
