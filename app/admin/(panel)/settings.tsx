// Sozlamalar: adminlar (telefon raqami bo'yicha qo'shish / olib tashlash), ko'rinish va til, sessiya,
// server holati; sinov rejimida — namunaviy ma'lumotlarni tiklash
import { router } from 'expo-router';
import { Database, LogOut, RotateCcw, ShieldPlus, UserMinus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { ConfirmDialog } from '@/components/admin/Dialog';
import { fmtAgo, fmtDateOnly, fmtDateTime, fmtPhone } from '@/components/admin/format';
import { AButton, Badge, ErrorBox, Field, KV, Panel, Pill, SkeletonRows } from '@/components/admin/kit';
import { AdminPage, useAdminLayout } from '@/components/admin/Shell';
import { Text } from '@/components/ui/Text';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { adminApi, type AdminUser } from '@/lib/admin';
import { resetDemoData } from '@/lib/admin/demo';
import { adminErrorText, invalidateAdmin, toast, useAdminAction, useAdminQuery } from '@/lib/admin/hooks';
import { normalizePhone } from '@/lib/admin/rules';
import { ADMIN_IDLE_MS, useAdminSession } from '@/lib/admin/session';
import { signOut } from '@/lib/auth';
import { DEMO } from '@/lib/demo';
import { t, type Lang } from '@/lib/i18n';
import { SUPABASE_URL } from '@/lib/supabase';
import { useUser, type ThemeMode } from '@/store';

export default function Settings() {
  useScheme();
  const { mode } = useAdminLayout();
  const me = useAdminQuery('me', () => adminApi.me());
  const admins = useAdminQuery('admins', () => adminApi.admins());
  const session = useAdminSession();
  const { language, setLanguage, themeMode, setThemeMode } = useUser();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [remove, setRemove] = useState<AdminUser | null>(null);
  const [reset, setReset] = useState(false);
  const { run } = useAdminAction();

  const add = async () => {
    const p = normalizePhone(phone);
    if (!p) return setPhoneError(t('admin.errors.phone'));
    setAdding(true);
    setPhoneError(null);
    try {
      await adminApi.setAdmin(p, true);
      toast(t('admin.settings.added', { phone: fmtPhone(p) }));
      setPhone('');
      invalidateAdmin();
    } catch (e) {
      setPhoneError(adminErrorText(e));
    } finally {
      setAdding(false);
    }
  };

  const logout = async () => {
    useAdminSession.getState().clear();
    await signOut().catch(() => {});
    router.replace('/admin/login');
  };

  const host = (() => {
    try {
      return new URL(SUPABASE_URL).host;
    } catch {
      return '—';
    }
  })();

  return (
    <AdminPage title={t('admin.nav.settings')} maxWidth={900}>
      <Panel title={t('admin.settings.admins')} subtitle={t('admin.settings.adminsSub')} padded={false}>
        {admins.error ? <ErrorBox text={admins.error} onRetry={admins.reload} /> : null}
        {!admins.data ? (
          <SkeletonRows n={2} />
        ) : (
          admins.data.map((a) => {
            const self = a.phone === me.data?.phone;
            return (
              <View key={a.id} style={styles.admin}>
                <View style={styles.flex}>
                  <Text style={styles.name}>
                    {a.name || fmtPhone(a.phone)} {self ? <Text style={styles.you}>{t('admin.settings.you')}</Text> : null}
                  </Text>
                  <Text variant="caption">
                    {fmtPhone(a.phone)} · {t('admin.settings.since', { date: fmtDateOnly(a.createdAt) })}
                  </Text>
                </View>
                {!self ? <AButton size="sm" kind="danger" icon={UserMinus} title={mode === 'mobile' ? undefined : t('admin.settings.remove')} accessibilityLabel={t('admin.settings.remove')} onPress={() => setRemove(a)} /> : <Badge label={t('admin.role.admin')} tone="info" />}
              </View>
            );
          })
        )}
        <View style={styles.addRow}>
          <Field
            style={styles.flex}
            label={t('admin.settings.addLabel')}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setPhoneError(null);
            }}
            placeholder="+998 90 123 45 67"
            keyboardType="phone-pad"
            error={phoneError}
            hint={t('admin.settings.addHint')}
            onSubmitEditing={add}
          />
          <AButton title={t('admin.settings.add')} icon={ShieldPlus} kind="primary" loading={adding} disabled={!phone.trim()} onPress={add} style={styles.addBtn} />
        </View>
      </Panel>

      <Panel title={t('admin.settings.appearance')}>
        <Text style={styles.label}>{t('admin.settings.theme')}</Text>
        <View style={styles.pills}>
          {(['system', 'light', 'dark'] as ThemeMode[]).map((m) => (
            <Pill key={m} label={t(`admin.settings.themes.${m}`)} active={(themeMode ?? 'system') === m} onPress={() => setThemeMode(m)} />
          ))}
        </View>
        <Text style={[styles.label, { marginTop: 14 }]}>{t('admin.settings.language')}</Text>
        <View style={styles.pills}>
          {(['uz', 'ru', 'en'] as Lang[]).map((l) => (
            <Pill key={l} label={t(`admin.lang.${l}`)} active={(language ?? 'uz') === l} onPress={() => setLanguage(l)} />
          ))}
        </View>
      </Panel>

      <Panel title={t('admin.settings.security')}>
        <KV label={t('admin.settings.signedIn')} value={session.since ? fmtDateTime(session.since) : '—'} />
        <KV label={t('admin.settings.lastActive')} value={session.lastActive ? fmtAgo(session.lastActive) : '—'} />
        <KV label={t('admin.settings.autoLogout')} value={t('admin.settings.autoLogoutValue', { h: ADMIN_IDLE_MS / 3600_000 })} />
        <Text variant="caption" style={{ marginTop: 10 }}>
          {t('admin.settings.securityNote')}
        </Text>
        <AButton title={t('admin.logout')} icon={LogOut} kind="danger" onPress={logout} style={styles.self} />
      </Panel>

      <Panel title={t('admin.settings.server')}>
        <View style={styles.serverRow}>
          <Database size={20} color={DEMO ? colors.accent : colors.success} strokeWidth={2.2} />
          <View style={styles.flex}>
            <Text style={styles.name}>{DEMO ? t('admin.settings.demoMode') : t('admin.settings.connected', { host })}</Text>
            <Text variant="caption">{DEMO ? t('admin.settings.demoModeText') : t('admin.settings.connectedText')}</Text>
          </View>
        </View>
        {DEMO ? <AButton title={t('admin.settings.resetDemo')} icon={RotateCcw} onPress={() => setReset(true)} style={styles.self} /> : null}
      </Panel>

      <ConfirmDialog
        visible={!!remove}
        onClose={() => setRemove(null)}
        title={t('admin.settings.removeTitle', { phone: fmtPhone(remove?.phone) })}
        text={t('admin.settings.removeText')}
        confirmLabel={t('admin.settings.remove')}
        danger
        onConfirm={async () => {
          const r = await run(() => adminApi.setAdmin(remove!.phone, false), t('admin.settings.removed'));
          return r.ok ? null : r.error;
        }}
      />
      <ConfirmDialog
        visible={reset}
        onClose={() => setReset(false)}
        title={t('admin.settings.resetTitle')}
        text={t('admin.settings.resetText')}
        confirmLabel={t('admin.settings.resetDemo')}
        danger
        onConfirm={async () => {
          const r = await run(() => resetDemoData(), t('admin.settings.resetDone'));
          return r.ok ? null : r.error;
        }}
      />
    </AdminPage>
  );
}

const styles = themed(() => ({
  flex: { flex: 1, minWidth: 0 },
  admin: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  name: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: colors.ink },
  you: { fontFamily: fonts.medium, color: colors.muted },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 18, flexWrap: 'wrap' },
  addBtn: { marginTop: 24 },
  label: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink2, marginBottom: 8 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  self: { alignSelf: 'flex-start', marginTop: 14 },
  serverRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
}));
