import { Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { Squish } from './Pressable';
import { Text } from './Text';

// Kichik: ⭐ 4.9
export function RatingBadge({ value }: { value: number }) {
  useScheme();
  return (
    <View style={styles.badge}>
      <Star size={14} color={colors.accent} fill={colors.accent} />
      <Text style={styles.badgeText}>{value.toFixed(1)}</Text>
    </View>
  );
}

// Katta: 5 ta bosiladigan yulduz
export function RatingInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  useScheme();
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <Squish
            key={n}
            scaleTo={0.85}
            accessibilityRole="button"
            accessibilityLabel={t('rate.star', { n })}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(n)}
            style={styles.star}
          >
            <Star size={38} color={on ? colors.accent : colors.starEmpty} fill={on ? colors.accent : 'transparent'} strokeWidth={1.8} />
          </Squish>
        );
      })}
    </View>
  );
}

const styles = themed(() => ({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  badgeText: { fontFamily: fonts.heavy, fontSize: 13, color: colors.ink },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  star: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
}));
