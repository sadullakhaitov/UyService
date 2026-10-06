import { WifiOff } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, themed } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useOnline } from '@/lib/useOnline';
import { Text } from './Text';

// Internet uzilsa — tepada yumshoq tushadigan banner (hamma ekran ustida)
export function OfflineBanner() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const y = useSharedValue(-120);
  useEffect(() => {
    y.value = withTiming(online ? -120 : 0, { duration: 280 });
  }, [online, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, { paddingTop: insets.top + 6 }, style]}>
      <View style={styles.row} accessibilityLiveRegion="polite">
        <WifiOff size={18} color={colors.onToast} strokeWidth={2.4} />
        <View style={styles.flex}>
          <Text style={styles.title}>{t('offline.title')}</Text>
          <Text style={styles.text}>{t('offline.text')}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = themed(() => ({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: colors.toast, paddingHorizontal: 16, paddingBottom: 10, zIndex: 100 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  flex: { flex: 1 },
  title: { fontFamily: fonts.heavy, fontSize: 14, color: colors.onToast },
  text: { fontFamily: fonts.medium, fontSize: 12, color: colors.onToastMuted },
}));
