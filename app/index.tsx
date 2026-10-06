import { Redirect } from 'expo-router';
import { useUser } from '@/store';

export default function Index() {
  const { role, billingPlan } = useUser();
  if (role === 'client') return <Redirect href="/client" />;
  if (role === 'master') return <Redirect href={billingPlan ? '/master' : '/master/plan'} />;
  return <Redirect href="/phone" />;
}
