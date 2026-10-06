import { useLocalSearchParams } from 'expo-router';
import { Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Text } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useChats } from '@/store';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chat = useChats((s) => s.chats.find((c) => c.id === id));
  const { send, markRead } = useChats();
  const [text, setText] = useState('');
  const list = useRef<FlatList>(null);

  useEffect(() => {
    if (id) markRead(id);
  }, [id, markRead, chat?.messages.length]);

  if (!chat) return null;
  const canWrite = chat.kind !== 'news';

  const submit = () => {
    const v = text.trim();
    if (!v) return;
    send(chat.id, v);
    setText('');
    // Soxta: qo'llab-quvvatlash avtomatik javob beradi
    if (chat.kind === 'support') {
      setTimeout(() => useChats.setState((s) => ({
        chats: s.chats.map((c) =>
          c.id === chat.id ? { ...c, messages: [...c.messages, { id: `r${Date.now()}`, mine: false, text: t('chats.autoReply'), at: Date.now() }] } : c,
        ),
      })), 1500);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.root}>
      <ScreenHeader title={chat.title} kicker={chat.subtitle} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={chat.messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardDismissMode="interactive"
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.msg, item.mine && { color: colors.onPrimary }]}>{item.text}</Text>
            </View>
          )}
        />
        {canWrite ? (
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('chats.placeholder')}
              placeholderTextColor={colors.muted}
              accessibilityLabel={t('chats.placeholder')}
              style={styles.input}
              multiline
            />
            <Pressable accessibilityRole="button" accessibilityLabel={t('chats.send')} onPress={submit} style={[styles.send, !text.trim() && { opacity: 0.4 }]}>
              <Send size={20} color={colors.onPrimary} strokeWidth={2.4} />
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { padding: 16, gap: 8 },
  bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 6 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 6, borderWidth: 1, borderColor: colors.line },
  msg: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.field,
    backgroundColor: colors.field,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.ink,
  },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
});
