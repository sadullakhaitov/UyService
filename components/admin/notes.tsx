// Sinov rejimi eslatmasi: ma'lumotlar namunaviy, amallar faqat shu brauzerda saqlanadi
import { Info } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { DEMO } from '@/lib/demo';
import { t } from '@/lib/i18n';

export function DemoNote() {
  useScheme();
  if (!DEMO) return null;
  return (
    <View style={styles.box} accessibilityRole="text">
      <Info size={18} color={colors.accentInk} strokeWidth={2.2} />
      <Text style={styles.text}>{t('admin.demoNote')}</Text>
    </View>
  );
}

const styles = themed(() => ({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.accentSoft },
  text: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.accentInk },
}));
