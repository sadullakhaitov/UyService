import { useEffect, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, radius, themed } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { Logo } from './Logo';
import { Text } from './Text';

// Klaviatura ochiqmi
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

// Kirish ekranlari uchun umumiy qobiq: yuqorida yashil brend qismi, pastda oq panel.
// Klaviatura ochilganda brend qismi kichrayadi, tugma klaviatura ustida turadi;
// bo'sh joyga bosilsa yoki pastga tortilsa klaviatura yopiladi.
export function AuthShell({ children, footer, compact }: { children: ReactNode; footer?: ReactNode; compact?: boolean }) {
  const keyboard = useKeyboardOpen();
  const small = compact || keyboard;
  return (
    <View style={styles.root}>
      <Pressable accessible={false} onPress={Keyboard.dismiss} style={[styles.hero, small && styles.heroSmall]}>
        <Pattern />
        <SafeAreaView edges={['top']} style={styles.heroInner}>
          <Logo size={20} light />
          {!small ? (
            <Text style={styles.tagline} variant="h2">
              {t('app.tagline')}
            </Text>
          ) : null}
        </SafeAreaView>
      </Pressable>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.panelWrap}>
        <View style={styles.panel}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            bounces={false}
          >
            {/* Bo'sh joyga bosish klaviaturani yopadi */}
            <Pressable accessible={false} onPress={Keyboard.dismiss} style={styles.bodyInner}>
              {children}
            </Pressable>
          </ScrollView>
          {footer ? (
            <SafeAreaView edges={keyboard ? [] : ['bottom']} style={styles.footer}>
              {footer}
            </SafeAreaView>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// Fondagi yengil naqsh: uy tomlari izlari
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

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.primary },
  flex: { flex: 1 },
  hero: { paddingBottom: 64, overflow: 'hidden' },
  heroSmall: { paddingBottom: 44 },
  heroInner: { paddingHorizontal: 24, paddingTop: 24, gap: 28 },
  tagline: { color: colors.onPrimary, maxWidth: 280, fontSize: 26, lineHeight: 33 },
  panelWrap: { flex: 1, marginTop: -28 },
  panel: { flex: 1, backgroundColor: colors.surface, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: 'hidden' },
  body: { flexGrow: 1 },
  bodyInner: { flexGrow: 1, padding: 24, gap: 18 },
  footer: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16, gap: 12, backgroundColor: colors.surface },
}));
