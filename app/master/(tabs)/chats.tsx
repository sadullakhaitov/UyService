import { router } from 'expo-router';
import { Headset, Megaphone } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Squish, Text } from '@/components/ui';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { chatTitle, msgText, useChats, type Chat } from '@/store';

const time = (ms: number) => {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  return today ? `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}` : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Chats() {
  useScheme();
  const chats = useChats((s) => s.chats);
  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <Text style={styles.title}>{t('chats.title')}</Text>
      <FlatList
        data={chats.filter((c) => c.kind !== 'master')}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <ChatRow chat={item} />}
      />
    </SafeAreaView>
  );
}

function ChatRow({ chat }: { chat: Chat }) {
  useScheme();
  const last = chat.messages[chat.messages.length - 1];
  return (
    <Squish accessibilityRole="button" scaleTo={0.98} onPress={() => router.push(`/master/chat/${chat.id}`)} style={styles.row}>
      {chat.kind === 'support' ? (
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Headset size={24} color={colors.primary} strokeWidth={2.2} />
        </View>
      ) : chat.kind === 'news' ? (
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Megaphone size={22} color={colors.accent} strokeWidth={2.2} />
        </View>
      ) : (
        <Avatar initials={chatTitle(chat).slice(0, 2).toUpperCase()} size={52} />
      )}
      <View style={styles.flex}>
        <View style={styles.top}>
          <Text variant="bodyBold" numberOfLines={1} style={styles.flex}>
            {chatTitle(chat)}
          </Text>
          {last ? <Text variant="caption">{time(last.at)}</Text> : null}
        </View>
        <View style={styles.top}>
          <Text variant="small" numberOfLines={1} style={styles.flex}>
            {last ? `${last.mine ? t('chats.you') : ''}${msgText(last)}` : t('chats.empty')}
          </Text>
          {chat.unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{chat.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Squish>
  );
}


const styles = themed(() => ({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  title: { fontFamily: fonts.heavy, fontSize: 32, color: colors.ink, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sep: { height: 1, backgroundColor: colors.line, marginLeft: 68 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.heavy, fontSize: 12, color: colors.onPrimary },
}));
