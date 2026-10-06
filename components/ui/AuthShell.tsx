import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { Logo } from './Logo';
import { Text } from './Text';

// Kirish ekranlari uchun umumiy qobiq: yuqorida yashil brend qismi, pastda oq panel
export function AuthShell({ children, footer, compact }: { children: ReactNode; footer?: ReactNode; compact?: boolean }) {
  return (
    <View style={styles.root}>
      <View style={[styles.hero, compact && { paddingBottom: 44 }]}>
        <Pattern />
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <Logo size={20} light />
          {!compact ? (
            <Text style={styles.tagline} variant="h2">
              {t('app.tagline')}
            </Text>
          ) : null}
        </SafeAreaView>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.panelWrap}>
        <View style={styles.panel}>
          <View style={styles.body}>{children}</View>
          {footer ? <SafeAreaView edges={['bottom']} style={styles.footer}>{footer}</SafeAreaView> : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Fondagi yengil naqsh: kalit va uy tomlari izlari
function Pattern() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 300" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill}>
      <Circle cx="340" cy="40" r="90" fill="#FFFFFF" opacity={0.05} />
      <Circle cx="30" cy="250" r="120" fill="#FFFFFF" opacity={0.04} />
      <Path d="M250 210 l40 -32 l40 32" stroke={colors.accent} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <Path d="M290 230 l26 -20 l26 20" stroke="#FFFFFF" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.18} />
      <Circle cx="356" cy="132" r="6" fill={colors.accent} opacity={0.9} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.primary },
  hero: { paddingBottom: 64, overflow: 'hidden' },
  heroInner: { paddingHorizontal: 24, paddingTop: 24, gap: 28 },
  tagline: { color: colors.onPrimary, maxWidth: 280, fontSize: 26, lineHeight: 33 },
  panelWrap: { flex: 1, marginTop: -28 },
  panel: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet },
  body: { flex: 1, padding: 24, gap: 18 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
});
