import { Redirect } from 'expo-router';

// Noma'lum manzil (masalan, ilova boshqa sahifa ichida ochilganda) — bosh sahifaga
export default function NotFound() {
  return <Redirect href="/" />;
}
