import { ImagePlus } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Text } from '@/components/ui';
import { PhotoTile } from '@/components/ui/PhotoTile';
import { colors, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { pickImages } from '@/lib/photos';
import { useMaster } from '@/store';

const MAX_WORKS = 12;

// Ish namunalari: mijoz "Usta yo'lda" ekranida ko'radi
export default function Works() {
  useScheme();
  const { profile, setProfile } = useMaster();
  const works = profile.works;
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={t('profile.works')} kicker={t('works.count', { n: works.length, max: MAX_WORKS })} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="small">{t('profile.worksHint')}</Text>
        <Text variant="caption">{t('works.rules')}</Text>
        <View style={styles.grid}>
          {works.length < MAX_WORKS ? (
            <PhotoTile
              icon={ImagePlus}
              label={t('register.addWork')}
              size="31%"
              onAdd={async () => {
                const uris = await pickImages(MAX_WORKS - works.length);
                if (uris.length) setProfile({ works: [...works, ...uris].slice(0, MAX_WORKS) });
              }}
            />
          ) : null}
          {works.map((uri) => (
            <PhotoTile key={uri} uri={uri} size="31%" onRemove={() => setProfile({ works: works.filter((w) => w !== uri) })} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
}));
