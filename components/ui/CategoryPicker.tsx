import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { categories, type CategoryId } from '@/constants/categories';
import { fonts, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { Squish } from './Pressable';
import { Text } from './Text';

/** Kategoriyalarni tanlash (bir nechtasi) — har biri o'z rangida */
export function CategoryPicker({ value, onChange }: { value: CategoryId[]; onChange: (v: CategoryId[]) => void }) {
  const toggle = (id: CategoryId) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <View style={styles.grid}>
      {categories.map((c) => {
        const on = value.includes(c.id);
        const Icon = c.icon;
        return (
          <Squish
            key={c.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            onPress={() => toggle(c.id)}
            style={[styles.tile, { backgroundColor: on ? c.main : c.tint, borderColor: c.main }]}
          >
            <Icon size={28} color={on ? c.onMain : c.ink} strokeWidth={2} />
            <Text style={[styles.text, { color: on ? c.onMain : c.ink }]} numberOfLines={1}>
              {t(`categories.${c.id}`)}
            </Text>
            {on ? (
              <View style={styles.check}>
                <Check size={12} color={c.main} strokeWidth={3.4} />
              </View>
            ) : null}
          </Squish>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31.4%', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 6, borderRadius: radius.tile, borderWidth: 1.5 },
  text: { fontFamily: fonts.bold, fontSize: 13 },
  check: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
