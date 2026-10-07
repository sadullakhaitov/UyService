import { View } from 'react-native';
import { getCategory, type CategoryId } from '@/constants/categories';
import { useScheme } from '@/constants/theme';

/** Kategoriya ikonkasi o'z rangida (ilovadagidek) */
export function CategoryIcon({ id, size = 32 }: { id: CategoryId; size?: number }) {
  useScheme();
  const c = getCategory(id);
  const Icon = c.icon;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.tint, alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.55} color={c.ink} strokeWidth={2} />
    </View>
  );
}
