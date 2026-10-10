// Pasport va selfi uchun alohida rozilik (selfi — biometrik ma'lumot): belgilanmaguncha hujjat yuklab bo'lmaydi.
// Server ham rozilik vaqtisiz hujjat yo'lini qabul qilmaydi (migrations/…_doc_consent.sql).
import { router } from 'expo-router';
import { Check } from 'lucide-react-native';
import { View } from 'react-native';
import { Squish, Text } from '@/components/ui';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { notice } from '@/lib/dialog';
import { t } from '@/lib/i18n';
import { useMaster } from '@/store';

/** Hujjat yuklashdan oldin chaqiriladi: rozilik bo'lmasa — eslatadi va false qaytaradi */
export async function needDocConsent(): Promise<boolean> {
  if (useMaster.getState().profile.docConsentAt) return true;
  await notice(t('docConsent.needTitle'), t('docConsent.needText'));
  return false;
}

export function DocConsent() {
  useScheme();
  const at = useMaster((s) => s.profile.docConsentAt);
  const setProfile = useMaster((s) => s.setProfile);
  const on = Boolean(at);
  return (
    <Squish
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      scaleTo={0.98}
      // Rozilik bir marta beriladi; yuklangan hujjatni o'chirish — hujjatlar sahifasida
      onPress={() => !on && setProfile({ docConsentAt: Date.now() })}
      style={styles.row}
    >
      <View style={[styles.box, on && styles.boxOn]}>{on ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
      <Text variant="small" style={styles.flex}>
        {t('docConsent.text')}{' '}
        <Text variant="small" style={styles.link} onPress={() => router.push('/legal/privacy')}>
          {t('legal.privacy')}
        </Text>
      </Text>
    </Squish>
  );
}

const styles = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  flex: { flex: 1 },
  link: { color: colors.primary, fontFamily: fonts.bold },
}));
