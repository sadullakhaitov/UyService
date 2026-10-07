import Constants from 'expo-constants';
import { router } from 'expo-router';
import {
  BadgeCheck,
  ChevronLeft,
  Banknote,
  ChevronRight,
  Clock3,
  FileText,
  Globe,
  Hammer,
  Mail,
  MapPinned,
  Phone,
  Send,
  ShieldCheck,
  Tag,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton, LogoMark, Squish, Text } from '@/components/ui';
import { CALL_FEE, categories, WARRANTY_DAYS } from '@/constants/categories';
import { COMPANY } from '@/constants/company';
import { colors, fonts, radius, shadow, themed, useScheme } from '@/constants/theme';
import { formatNumber, formatSum, t } from '@/lib/i18n';

type Icon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// "Biz haqimizda": logotip bosilganda ochiladi — kompaniya, qanday ishlaydi, kafolatlar, aloqa
export default function About() {
  useScheme();
  const version = Constants.expoConfig?.version ?? '0.1.0';

  const promises: { icon: Icon; title: string; text: string }[] = [
    { icon: Tag, title: t('about.p1Title'), text: t('about.p1Text', { fee: formatSum(CALL_FEE) }) },
    { icon: ShieldCheck, title: t('about.p2Title', { days: WARRANTY_DAYS }), text: t('about.p2Text') },
    { icon: BadgeCheck, title: t('about.p3Title'), text: t('about.p3Text') },
    { icon: Banknote, title: t('about.p4Title'), text: t('about.p4Text') },
  ];
  const contacts: { icon: Icon; label: string; value: string; url: string }[] = [
    { icon: Mail, label: t('about.email'), value: COMPANY.email, url: `mailto:${COMPANY.email}` },
    { icon: Globe, label: t('about.site'), value: COMPANY.site, url: `https://${COMPANY.site}` },
    { icon: Send, label: 'Telegram', value: `@${COMPANY.telegram}`, url: `https://t.me/${COMPANY.telegram}` },
    ...(COMPANY.phone ? [{ icon: Phone, label: t('about.phone'), value: COMPANY.phone, url: `tel:${COMPANY.phone.replace(/\s/g, '')}` }] : []),
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Bosh qism: yashil fon, logotip, shior */}
        <View style={styles.hero}>
          <View style={[styles.glow, styles.glowA]} />
          <View style={[styles.glow, styles.glowB]} />
          <SafeAreaView edges={['top']} style={styles.heroInner}>
            <IconButton icon={ChevronLeft} label={t('common.back')} floating onPress={() => (router.canGoBack() ? router.back() : router.replace('/client'))} />
            <View style={styles.brand}>
              <View style={styles.markWrap}>
                <LogoMark size={64} light={false} />
              </View>
              <Text style={styles.word}>
                <Text style={[styles.word, styles.wordAccent]}>Uy</Text>Service
              </Text>
              <Text style={styles.tagline}>{t('app.tagline')}</Text>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {/* Raqamlar */}
          <View style={[styles.stats, shadow.float]}>
            <Stat value={String(categories.length)} label={t('about.statCategories')} />
            <View style={styles.statSep} />
            <Stat value={formatNumber(CALL_FEE)} label={t('about.statFee')} />
            <View style={styles.statSep} />
            <Stat value={String(WARRANTY_DAYS)} label={t('about.statWarranty')} />
          </View>

          <Section title={t('about.missionTitle')}>
            <Text style={styles.lead}>{t('about.mission')}</Text>
          </Section>

          <Section title={t('about.howTitle')}>
            {[1, 2, 3, 4].map((n) => (
              <View key={n} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{n}</Text>
                </View>
                <View style={styles.flex}>
                  <Text variant="bodyBold">{t(`about.step${n}Title`)}</Text>
                  <Text variant="small">{t(`about.step${n}Text`)}</Text>
                </View>
              </View>
            ))}
          </Section>

          <Section title={t('about.servicesTitle')}>
            <View style={styles.cats}>
              {categories.map((c) => (
                <View key={c.id} style={[styles.cat, { backgroundColor: c.tint }]}>
                  <c.icon size={18} color={c.ink} strokeWidth={2.2} />
                  <Text style={[styles.catText, { color: c.ink }]}>{t(`categories.${c.id}`)}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title={t('about.promisesTitle')}>
            <View style={styles.grid}>
              {promises.map((p) => (
                <View key={p.title} style={styles.promise}>
                  <View style={styles.promiseIcon}>
                    <p.icon size={20} color={colors.primary} strokeWidth={2.2} />
                  </View>
                  <Text variant="bodyBold">{p.title}</Text>
                  <Text variant="small">{p.text}</Text>
                </View>
              ))}
            </View>
          </Section>

          {/* Ustalar uchun */}
          <View style={styles.masters}>
            <View style={styles.mastersIcon}>
              <Hammer size={22} color={colors.onPrimary} strokeWidth={2.2} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.mastersTitle}>{t('about.mastersTitle')}</Text>
              <Text style={styles.mastersText}>{t('about.mastersText')}</Text>
            </View>
            <Squish accessibilityRole="button" onPress={() => router.push('/client/account')} style={styles.mastersBtn}>
              <Text style={styles.mastersBtnText}>{t('about.mastersCta')}</Text>
              <ChevronRight size={16} color={colors.primary} strokeWidth={2.6} />
            </Squish>
          </View>

          <Section title={t('about.contactsTitle')}>
            <View style={styles.card}>
              {contacts.map((c, i) => (
                <Squish
                  key={c.url}
                  accessibilityRole="link"
                  scaleTo={0.98}
                  onPress={() => Linking.openURL(c.url).catch(() => {})}
                  style={[styles.row, i > 0 && styles.rowLine]}
                >
                  <c.icon size={20} color={colors.ink2} strokeWidth={2.2} />
                  <View style={styles.flex}>
                    <Text variant="caption">{c.label}</Text>
                    <Text variant="bodyBold">{c.value}</Text>
                  </View>
                  <ChevronRight size={18} color={colors.muted} strokeWidth={2.4} />
                </Squish>
              ))}
              <View style={[styles.row, styles.rowLine]}>
                <MapPinned size={20} color={colors.ink2} strokeWidth={2.2} />
                <View style={styles.flex}>
                  <Text variant="caption">{t('about.area')}</Text>
                  <Text variant="bodyBold">{t('about.areaValue')}</Text>
                </View>
              </View>
              <View style={[styles.row, styles.rowLine]}>
                <Clock3 size={20} color={colors.ink2} strokeWidth={2.2} />
                <View style={styles.flex}>
                  <Text variant="caption">{t('about.hours')}</Text>
                  <Text variant="bodyBold">{t('about.hoursValue', { hours: COMPANY.hours })}</Text>
                </View>
              </View>
            </View>
          </Section>

          <View style={styles.card}>
            {(['terms', 'privacy'] as const).map((d, i) => (
              <Squish key={d} accessibilityRole="link" scaleTo={0.98} onPress={() => router.push(`/legal/${d}`)} style={[styles.row, i > 0 && styles.rowLine]}>
                <FileText size={20} color={colors.ink2} strokeWidth={2.2} />
                <Text variant="bodyBold" style={styles.flex}>
                  {t(`legal.${d}`)}
                </Text>
                <ChevronRight size={18} color={colors.muted} strokeWidth={2.4} />
              </Squish>
            ))}
          </View>

          <Text variant="caption" style={styles.footer}>
            {t('about.footer', { version, year: COMPANY.founded })}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  useScheme();
  return (
    <View style={styles.section}>
      <Text variant="h3">{title}</Text>
      {children}
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  useScheme();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text variant="caption" style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: 40 },
  flex: { flex: 1 },
  hero: { backgroundColor: colors.primary, paddingBottom: 72, overflow: 'hidden' },
  glow: { position: 'absolute', borderRadius: 999 },
  glowA: { width: 320, height: 320, right: -120, top: -120, backgroundColor: 'rgba(255,255,255,0.07)' },
  glowB: { width: 220, height: 220, left: -90, bottom: -60, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroInner: { paddingHorizontal: 16, paddingTop: 8 },
  brand: { alignItems: 'center', gap: 10, marginTop: 4 },
  markWrap: { width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.96)', alignItems: 'center', justifyContent: 'center' },
  word: { fontFamily: fonts.logo, fontSize: 30, color: colors.onPrimary, letterSpacing: -0.5 },
  wordAccent: { color: colors.logoAccent },
  tagline: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.onPrimaryMuted, textAlign: 'center', maxWidth: 300 },
  body: { paddingHorizontal: 16, gap: 24, marginTop: -44 },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.card, paddingVertical: 16, paddingHorizontal: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  statValue: { fontFamily: fonts.heavy, fontSize: 22, color: colors.primary },
  statLabel: { textAlign: 'center' },
  statSep: { width: 1, height: 36, backgroundColor: colors.line },
  section: { gap: 12 },
  lead: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24, color: colors.ink },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: fonts.heavy, fontSize: 15, color: colors.primary },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: radius.chip },
  catText: { fontFamily: fonts.bold, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  promise: { flexGrow: 1, flexBasis: 150, gap: 6, padding: 14, borderRadius: radius.card, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  promiseIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  masters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: colors.primary },
  mastersIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  mastersTitle: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 22, color: colors.onPrimary },
  mastersText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.onPrimaryMuted },
  mastersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 40, paddingHorizontal: 14, borderRadius: 12, backgroundColor: colors.surface },
  mastersBtnText: { fontFamily: fonts.bold, fontSize: 14, color: colors.primary },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, paddingVertical: 10 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.line },
  footer: { textAlign: 'center', marginTop: 4 },
}));
