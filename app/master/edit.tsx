import { router } from 'expo-router';
import { UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, ScreenHeader, Text } from '@/components/ui';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { PhotoTile } from '@/components/ui/PhotoTile';
import type { CategoryId } from '@/constants/categories';
import { colors, fonts, radius, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { AVATAR_MAX, takePhoto } from '@/lib/photos';
import { useMaster } from '@/store';

const YEARS = [1, 2, 3, 5, 10];

// Profilni tahrirlash: ism, tajriba, kategoriyalar (buyurtma filtri ham shunga moslanadi)
export default function EditProfile() {
  useScheme();
  const { profile, setProfile, setFilter, categories } = useMaster();
  const [firstName, setFirst] = useState(profile.firstName);
  const [lastName, setLast] = useState(profile.lastName);
  const [years, setYears] = useState(profile.experienceYears);
  const [photo, setPhoto] = useState(profile.photo);
  const [cats, setCats] = useState<CategoryId[]>(profile.categories.length ? profile.categories : categories);
  const valid = firstName.trim().length >= 2 && lastName.trim().length >= 2 && cats.length > 0 && Boolean(photo);

  const save = () => {
    setProfile({ photo, firstName: firstName.trim(), lastName: lastName.trim(), experienceYears: years, categories: cats });
    setFilter({ categories: cats });
    router.back();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('edit.title')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.photoRow}>
            <PhotoTile
              uri={photo}
              icon={UserRound}
              label={t('register.photo')}
              onAdd={async () => {
                const uri = await takePhoto({ front: true, max: AVATAR_MAX });
                if (uri) setPhoto(uri);
              }}
              onRemove={() => setPhoto(null)}
            />
            <View style={styles.flex}>
              <Text variant="bodyBold">{t('register.photo')}</Text>
              <Text variant="small">{t('register.photoHint')}</Text>
            </View>
          </View>
          <Field label={t('register.firstName')} value={firstName} onChange={setFirst} />
          <Field label={t('register.lastName')} value={lastName} onChange={setLast} />
          <Text variant="bodyBold">{t('register.experience')}</Text>
          <View style={styles.chips}>
            {YEARS.map((y) => (
              <Chip key={y} label={y === 10 ? t('register.years10') : t('register.years', { n: y })} selected={years === y} onPress={() => setYears(y)} />
            ))}
          </View>
          <Text variant="bodyBold">{t('profile.categories')}</Text>
          <CategoryPicker value={cats} onChange={setCats} />
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.bottom}>
        <Button title={t('plan.save')} big disabled={!valid} onPress={save} />
      </View>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  useScheme();
  return (
    <View style={styles.field}>
      <Text variant="caption">{label}</Text>
      <TextInput value={value} onChangeText={onChange} accessibilityLabel={label} autoCapitalize="words" autoCorrect={false} style={styles.input} />
    </View>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
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
  bottom: { padding: 16 },
}));
