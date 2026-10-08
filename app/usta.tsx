// uyservice.uz/usta?ref=KOD — do'st yuborgan "Usta bo'lib ishlash" havolasi.
// Kod eslab qolinadi (anketada o'zi yoziladi) va usta bo'lish yo'li ochiladi: kirmagan bo'lsa — raqam, keyin anketa.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useMaster, useUser } from '@/store';

export default function MasterInvite() {
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  useEffect(() => {
    const code = String(ref ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    const u = useUser.getState();
    if (code) u.setInviteRef(code);
    if (!u.phone) return router.replace('/phone?next=master');
    u.setRole('master');
    const registered = Boolean(useMaster.getState().profile.submittedAt);
    router.replace(!registered ? '/master/register' : u.billingPlan ? '/master' : '/master/plan');
  }, [ref]);
  return null;
}
