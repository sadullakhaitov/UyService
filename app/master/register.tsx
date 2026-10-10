import { router } from 'expo-router';
import { Camera, IdCard, ImagePlus, Percent, ShieldCheck, UserRound } from 'lucide-react-native';
import { feePercent, UNVERIFIED_SURCHARGE_PERCENT } from '@/constants/billing';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, ScreenHeader, Text } from '@/components/ui';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { DocConsent, needDocConsent } from '@/components/ui/DocConsent';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { AVATAR_MAX, DOC_MAX, pickImages, takePhoto } from '@/lib/photos';
import { useMaster, useUser } from '@/store';
import { LIVE, liveApplyInvite, liveSubmitMaster } from '@/lib/live';
import { track } from '@/lib/track';
import { notice } from '@/lib/dialog';

const STEPS = 4;
const MAX_WORKS = 6;
const YEARS = [1, 2, 3, 5, 10];

// Usta anketasi (TZ, 4-bo'lim): ism, kategoriyalar, pasport rasmi, ish namunalari.
// Pasport va selfi ixtiyoriy: ularsiz ham buyurtma keladi, faqat platforma ulushi +5% (constants/billing.ts → feePercent).
export default function Register() {
  useScheme();
  const { profile, setProfile, submitProfile } = useMaster();
  const [sending, setSending] = useState(false);
  const billingPlan = useUser((s) => s.billingPlan);
  const plan = billingPlan ?? 'commission';
  const setRole = useUser((s) => s.setRole);
  const [invite, setInvite] = useState(() => useUser.getState().inviteRef);
  const [step, setStep] = useState(0);
  useEffect(() => track('master_register_open'), []);

  const valid = [
    // Profil surati majburiy: mijoz eshik ochishdan oldin ustaning yuzini ko'radi
    profile.firstName.trim().length >= 2 && profile.lastName.trim().length >= 2 && Boolean(profile.photo),
    profile.categories.length > 0,
    // pasport ixtiyoriy; yuklangan bo'lsa — alohida rozilik belgilangan bo'lishi kerak (server ham tekshiradi)
    !(profile.passportPhoto || profile.selfie) || Boolean(profile.docConsentAt),
    true, // ish namunalari ixtiyoriy (keyin Profil → Ish namunalari)
  ][step];

  const back = () => {
    if (step > 0) return setStep(step - 1);
    // Anketadan voz kechdi — mijoz rejimiga qaytadi
    setRole('client');
    router.replace('/client/account');
  };
  const next = async () => {
    if (step < STEPS - 1) return setStep(step + 1);
    if (LIVE) {
      if (sending) return;
      setSending(true);
      try {
        await liveSubmitMaster();
        track('master_registered');
      } catch {
        setSending(false);
        return notice(t('register.sendFailedTitle'), t('register.sendFailedText'));
      }
      // Do'stining taklif kodi (ixtiyoriy): noto'g'ri bo'lsa anketa baribir yuborilgan, faqat xabar beramiz
      const code = invite.trim();
      if (code) {
        try {
          await liveApplyInvite(code);
          useUser.getState().setInviteRef('');
        } catch {
          await notice(t('register.inviteBad'));
        }
      }
      setSending(false);
    }
    submitProfile();
    router.replace(billingPlan ? '/master' : '/master/plan');
  };

  const titles = [t('register.nameTitle'), t('register.catTitle'), t('register.passTitle'), t('register.worksTitle')];
  const hints = [t('register.nameHint'), t('register.catHint'), t('register.passHint'), t('register.worksHint')];

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader kicker={t('register.step', { n: step + 1, total: STEPS })} title={titles[step]} onBack={back} />
      <View style={styles.progress}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i <= step ? colors.primary : colors.line }]} />
        ))}
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text variant="small">{hints[step]}</Text>

          {step === 0 ? (
            <>
              <View style={styles.photoRow}>
                <PhotoTile
                  uri={profile.photo}
                  icon={UserRound}
                  label={t('register.photo')}
                  size={96}
                  onAdd={async () => {
                    const uri = await takePhoto({ front: true, max: AVATAR_MAX });
                    if (uri) setProfile({ photo: uri });
                  }}
                  onRemove={() => setProfile({ photo: null })}
                />
                <View style={styles.flex}>
                  <Text variant="bodyBold">{t('register.photo')}</Text>
                  <Text variant="small">{t('register.photoHint')}</Text>
                </View>
              </View>
              <Field label={t('register.firstName')} value={profile.firstName} onChange={(v) => setProfile({ firstName: v })} />
              <Field label={t('register.lastName')} value={profile.lastName} onChange={(v) => setProfile({ lastName: v })} />
              <Text variant="bodyBold">{t('register.experience')}</Text>
              <View style={styles.chips}>
                {YEARS.map((y) => (
                  <Chip
                    key={y}
                    label={y === 10 ? t('register.years10') : t('register.years', { n: y })}
                    selected={profile.experienceYears === y}
                    onPress={() => setProfile({ experienceYears: y })}
                  />
                ))}
              </View>
              <Field
                label={t('register.inviteCode')}
                value={invite}
                onChange={(v) => setInvite(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                caps="characters"
              />
              <Text variant="caption">{t('register.inviteHint')}</Text>
            </>
          ) : null}

          {step === 1 ? <CategoryPicker value={profile.categories} onChange={(categories) => setProfile({ categories })} /> : null}

          {step === 2 ? (
            <>
              <DocConsent />
              <View style={styles.docs}>
                <View style={styles.doc}>
                  <PhotoTile
                    uri={profile.passportPhoto}
                    icon={IdCard}
                    label={t('register.passport')}
                    size="100%"
                    onAdd={async () => {
                      if (!(await needDocConsent())) return;
                      const uri = await takePhoto({ max: DOC_MAX });
                      if (uri) setProfile({ passportPhoto: uri });
                    }}
                    onRemove={() => setProfile({ passportPhoto: null })}
                  />
                  <Text variant="caption" style={styles.center}>
                    {t('register.passport')}
                  </Text>
                </View>
                <View style={styles.doc}>
                  <PhotoTile
                    uri={profile.selfie}
                    icon={Camera}
                    label={t('register.selfie')}
                    size="100%"
                    onAdd={async () => {
                      if (!(await needDocConsent())) return;
                      const uri = await takePhoto({ front: true, max: DOC_MAX });
                      if (uri) setProfile({ selfie: uri });
                    }}
                    onRemove={() => setProfile({ selfie: null })}
                  />
                  <Text variant="caption" style={styles.center}>
                    {t('register.selfieOptional')}
                  </Text>
                </View>
              </View>
              {profile.passportPhoto ? null : (
                <View style={[styles.note, styles.warn]}>
                  <Percent size={18} color={colors.accentInk} strokeWidth={2.4} />
                  <Text variant="small" style={[styles.flex, { color: colors.accentInk }]}>
                    {t('register.passOptional', { extra: UNVERIFIED_SURCHARGE_PERCENT, pct: feePercent(plan, false), base: feePercent(plan, true) })}
                  </Text>
                </View>
              )}
              <View style={styles.note}>
                <ShieldCheck size={18} color={colors.primary} strokeWidth={2.2} />
                <Text variant="small" style={styles.flex}>
                  {t('register.privacy')}
                </Text>
              </View>
            </>
          ) : null}

          {step === 3 ? <Text variant="caption">{t('works.rules')}</Text> : null}
          {step === 3 ? (
            <View style={styles.works}>
              {profile.works.map((uri) => (
                <PhotoTile key={uri} uri={uri} size="31%" onRemove={() => setProfile({ works: profile.works.filter((w) => w !== uri) })} />
              ))}
              {profile.works.length < MAX_WORKS ? (
                <PhotoTile
                  icon={ImagePlus}
                  label={t('register.addWork')}
                  size="31%"
                  onAdd={async () => {
                    const uris = await pickImages(MAX_WORKS - profile.works.length);
                    if (uris.length) setProfile({ works: [...profile.works, ...uris].slice(0, MAX_WORKS) });
                  }}
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottom}>
        <Button
          title={step === STEPS - 1 ? (profile.works.length ? t('register.submit') : t('register.submitSkip')) : t('common.continue')}
          big
          disabled={!valid}
          onPress={next}
        />
        {step === STEPS - 1 ? (
          <Text variant="caption" style={styles.center}>
            {t('register.reviewNote')}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, caps = 'words' }: { label: string; value: string; onChange: (v: string) => void; caps?: 'words' | 'characters' }) {
  useScheme();
  return (
    <View style={styles.field}>
      <Text variant="caption">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        accessibilityLabel={label}
        autoCapitalize={caps}
        autoCorrect={false}
        style={styles.input}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = themed(() => ({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  scroll: { padding: 16, gap: 16, paddingBottom: 32 },
  field: { gap: 6 },
  input: {
    height: 54,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  docs: { flexDirection: 'row', gap: 12 },
  doc: { flex: 1, gap: 6 },
  center: { textAlign: 'center' },
  warn: { backgroundColor: colors.accentSoft },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: radius.card, backgroundColor: colors.primarySoft },
  works: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  bottom: { padding: 16, gap: 8 },
}));
