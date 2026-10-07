// Qo'llab-quvvatlash: foydalanuvchilar murojaatlari (javob kutayotganlari birinchi) va javob yozish.
// Kompyuterda — chapda suhbatlar, o'ngda yozishma; telefonda — avval ro'yxat, keyin yozishma. Har 15 s yangilanadi.
import { router, type Href } from 'expo-router';
import { ArrowLeft, ExternalLink, MessagesSquare, Send } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { fmtAgo, fmtDateTime, fmtPhone, initials } from '@/components/admin/format';
import { AButton, Badge, Empty, ErrorBox, Panel, Pill, SearchBox, SkeletonRows, useHover } from '@/components/admin/kit';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { useParamState } from '@/components/admin/useParams';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type SupportThread } from '@/lib/admin';
import { adminErrorText, invalidateAdmin, toast, useAdminQuery } from '@/lib/admin/hooks';
import { RULES } from '@/lib/admin/rules';
import { t } from '@/lib/i18n';

const DEFAULTS = { u: '', q: '' };

export default function Support() {
  useScheme();
  const { mode } = useAdminLayout();
  const [v, set] = useParamState(DEFAULTS);
  const threads = useAdminQuery('support-threads', () => adminApi.supportThreads(), { refreshMs: 15_000 });
  const rows = (threads.data ?? []).filter((x) => {
    const s = v.q.trim().toLowerCase();
    return !s || (x.name ?? '').toLowerCase().includes(s) || x.phone.includes(s.replace(/\D/g, '') || '§');
  });
  const selected = threads.data?.find((x) => x.userId === v.u) ?? null;
  const waiting = (threads.data ?? []).filter((x) => x.waiting).length;
  const mobile = mode === 'mobile';
  const showList = !mobile || !v.u;
  const showChat = !mobile || !!v.u;

  return (
    <AdminPage
      title={t('admin.nav.support')}
      subtitle={threads.data ? t('admin.support.subtitle', { n: waiting }) : undefined}
      onRefresh={threads.reload}
      refreshing={threads.refreshing}
      updatedAt={threads.updatedAt}
      scroll={false}
    >
      {threads.error && !threads.data ? <ErrorBox text={threads.error} onRetry={threads.reload} /> : null}
      <View style={styles.split}>
        {showList ? (
          <Panel style={[styles.listPanel, mobile && { flex: 1, width: '100%' }]} padded={false}>
            <View style={styles.listHead}>
              <SearchBox value={v.q} onChange={(q) => set({ q })} placeholder={t('admin.support.search')} />
            </View>
            <ScrollView style={styles.flex}>
              {!threads.data ? (
                <SkeletonRows n={5} />
              ) : rows.length ? (
                rows.map((x) => <ThreadRow key={x.userId} x={x} active={x.userId === v.u} onPress={() => set({ u: x.userId })} />)
              ) : (
                <Empty text={t('admin.support.empty')} />
              )}
            </ScrollView>
          </Panel>
        ) : null}
        {showChat ? (
          <Panel style={styles.chatPanel} padded={false}>
            {v.u ? (
              <Chat userId={v.u} thread={selected} onBack={mobile ? () => set({ u: '' }) : undefined} />
            ) : (
              <View style={styles.center}>
                <Empty icon={MessagesSquare} text={t('admin.support.pick')} />
              </View>
            )}
          </Panel>
        ) : null}
      </View>
    </AdminPage>
  );
}

function ThreadRow({ x, active, onPress }: { x: SupportThread; active: boolean; onPress: () => void }) {
  useScheme();
  const { hovered, bind } = useHover();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      {...bind}
      style={[styles.thread, active ? { backgroundColor: colors.primarySoft } : hovered ? { backgroundColor: colors.field } : null]}
    >
      <Avatar initials={initials(x.name)} size={40} />
      <View style={styles.flex}>
        <View style={styles.threadTop}>
          <Text style={styles.threadName} numberOfLines={1}>
            {x.name || fmtPhone(x.phone)}
          </Text>
          <Text variant="caption">{fmtAgo(x.lastAt)}</Text>
        </View>
        <Text style={[styles.threadText, x.waiting && { color: colors.ink, fontFamily: fonts.bold }]} numberOfLines={1}>
          {x.lastText}
        </Text>
        <View style={styles.threadBadges}>
          <Badge label={t(`admin.role.${x.role}`)} tone={x.role === 'master' ? 'primary' : 'neutral'} />
          {x.waiting ? <Badge label={t('admin.support.waiting')} tone="danger" dot /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const QUICK = ['q1', 'q2', 'q3', 'q4'];

function Chat({ userId, thread, onBack }: { userId: string; thread: SupportThread | null; onBack?: () => void }) {
  useScheme();
  const msgs = useAdminQuery(`support-${userId}`, () => adminApi.supportMessages(userId), { refreshMs: 15_000 });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => setText(''), [userId]);
  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 30);
  }, [msgs.data?.length, userId]);

  const send = async () => {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      await adminApi.supportReply(userId, body);
      setText('');
      invalidateAdmin();
    } catch (e) {
      toast(adminErrorText(e), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.chatHead}>
        {onBack ? <AButton icon={ArrowLeft} accessibilityLabel={t('common.back')} onPress={onBack} /> : null}
        <Avatar initials={initials(thread?.name)} size={38} />
        <View style={styles.flex}>
          <Text style={styles.threadName} numberOfLines={1}>
            {thread?.name || fmtPhone(thread?.phone)}
          </Text>
          <Text variant="caption">{thread ? `${fmtPhone(thread.phone)} · ${t(`admin.role.${thread.role}`)}` : ''}</Text>
        </View>
        <AButton
          size="sm"
          kind="ghost"
          icon={ExternalLink}
          title={onBack ? undefined : t('admin.support.profile')}
          accessibilityLabel={t('admin.support.profile')}
          onPress={() => router.push((thread?.role === 'master' ? `/admin/masters/${userId}` : `/admin/users/${userId}`) as Href)}
        />
      </View>
      <ScrollView ref={scroll} style={styles.flex} contentContainerStyle={styles.msgs}>
        {msgs.error && !msgs.data ? <ErrorBox text={msgs.error} onRetry={msgs.reload} /> : null}
        {!msgs.data ? (
          <SkeletonRows n={3} />
        ) : msgs.data.length ? (
          msgs.data.map((m) => (
            <View key={m.id} style={[styles.bubble, m.mine ? styles.mine : styles.theirs]}>
              <Text style={[styles.msg, m.mine && { color: colors.onPrimary }]}>{m.text}</Text>
              <Text style={[styles.time, m.mine && { color: colors.onPrimaryMuted }]}>{fmtDateTime(m.at)}</Text>
            </View>
          ))
        ) : (
          <Empty text={t('admin.support.noMessages')} />
        )}
      </ScrollView>
      <View style={styles.quick}>
        {QUICK.map((k) => (
          <Pill key={k} label={t(`admin.support.${k}`)} active={false} onPress={() => setText(t(`admin.support.${k}`))} />
        ))}
      </View>
      <View style={styles.composer}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('admin.support.placeholder')}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={RULES.messageMax}
          accessibilityLabel={t('admin.support.placeholder')}
          // Brauzer: Enter — yuborish, Shift+Enter — yangi qator
          onKeyPress={(e) => {
            const ne = e.nativeEvent as { key: string; shiftKey?: boolean };
            if (Platform.OS === 'web' && ne.key === 'Enter' && !ne.shiftKey) {
              (e as unknown as { preventDefault: () => void }).preventDefault();
              send();
            }
          }}
          style={styles.input}
        />
        <AButton kind="primary" icon={Send} accessibilityLabel={t('admin.support.send')} loading={busy} disabled={!text.trim()} onPress={send} />
      </View>
    </View>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  split: { flex: 1, flexDirection: 'row', gap: 18, minHeight: 420 },
  listPanel: { width: 360, flexShrink: 0 },
  listHead: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  chatPanel: { flex: 1, minWidth: 0 },
  thread: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line, cursor: 'pointer' },
  threadTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  threadName: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  threadText: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.ink2 },
  threadBadges: { flexDirection: 'row', gap: 6, marginTop: 4 },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  msgs: { padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.field, borderBottomLeftRadius: 4 },
  msg: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  time: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.muted, alignSelf: 'flex-end' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingTop: 10 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 14 },
  input: { flex: 1, minHeight: 44, maxHeight: 140, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 10, fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
}));
