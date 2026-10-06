import { Redirect } from 'expo-router';
import { useUser } from '@/store';

// Birinchi ochilishda — til tanlash; keyin darhol mijoz bosh sahifasi (ro'yxatdan o'tish shart emas).
// Ro'yxatdan o'tish faqat usta chaqirganda yoki "Usta bo'lib ishlash"ni tanlaganda so'raladi.
export default function Index() {
  const { language, role, phone, billingPlan } = useUser();
  if (!language) return <Redirect href="/welcome" />;
  if (role === 'master' && phone) return <Redirect href={billingPlan ? '/master' : '/master/plan'} />;
  return <Redirect href="/client" />;
}
