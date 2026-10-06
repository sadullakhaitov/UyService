import { useLocalSearchParams } from 'expo-router';
import { ChatView } from '@/components/chat/ChatView';
import { getCategory, type CategoryId } from '@/constants/categories';
import { useScheme } from '@/constants/theme';

// Mijoz ↔ usta chati (buyurtma bo'yicha), kategoriya rangida
export default function ClientChat() {
  useScheme();
  const { id, cat } = useLocalSearchParams<{ id: string; cat?: CategoryId }>();
  const c = cat ? getCategory(cat) : undefined;
  return id ? <ChatView id={id} accent={c?.main} onAccent={c?.onMain} /> : null;
}
