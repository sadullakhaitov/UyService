import { router } from 'expo-router';
import { Check, House, Wrench, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AuthShell } from '@/components/ui/AuthShell';
import { Button, Squish, Text } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useUser, type Role } from '@/store';

export default function RoleScreen() {
  const [role, setRole] = useState<Role>('client');
  const save = useUser((s) => s.setRole);
  const billingPlan = useUser((s) => s.billingPlan);

  const go = () => {
    save(role);
    if (role === 'client') router.replace('/client');
    else router.replace(billingPlan ? '/master' : '/master/plan');
  };

  return (
    <AuthShell compact footer={<Button title={t('common.continue')} big onPress={go} />}>
      <View style={styles.head}>
        <Text variant="h1">{t('auth.roleTitle')}</Text>
        <Text variant="small">{t('auth.roleHint')}</Text>
      </View>
      <RoleCard
        icon={House}
        title={t('auth.roleClient')}
        hint={t('auth.roleClientHint')}
        selected={role === 'client'}
        onPress={() => setRole('client')}
        tint={colors.accentSoft}
        ink={colors.accent}
      />
      <RoleCard
        icon={Wrench}
        title={t('auth.roleMaster')}
        hint={t('auth.roleMasterHint')}
        selected={role === 'master'}
        onPress={() => setRole('master')}
        tint={colors.primarySoft}
        ink={colors.primary}
      />
    </AuthShell>
  );
}

function RoleCard(p: { icon: LucideIcon; title: string; hint: string; selected: boolean; onPress: () => void; tint: string; ink: string }) {
  const Icon = p.icon;
  return (
    <Squish
      accessibilityRole="radio"
      accessibilityState={{ selected: p.selected }}
      onPress={p.onPress}
      style={[styles.card, p.selected && styles.cardOn]}
    >
      <View style={[styles.icon, { backgroundColor: p.tint }]}>
        <Icon size={28} color={p.ink} strokeWidth={2} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title}>{p.title}</Text>
        <Text variant="small">{p.hint}</Text>
      </View>
      <View style={[styles.radio, p.selected && styles.radioOn]}>{p.selected ? <Check size={16} color={colors.onPrimary} strokeWidth={3} /> : null}</View>
    </Squish>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6, marginBottom: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardOn: { borderColor: colors.primary, backgroundColor: '#F7FBF9' },
  icon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.heavy, fontSize: 17, color: colors.ink },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
