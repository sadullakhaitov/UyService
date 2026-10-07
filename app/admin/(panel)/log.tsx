// Admin amallari jurnali: kim, qachon, nima qildi. O'zgartirib yoki o'chirib bo'lmaydi (serverda himoyalangan)
import { useState } from 'react';
import { Panel, Pill } from '@/components/admin/kit';
import { LogList } from '@/components/admin/LogList';
import { AdminPage } from '@/components/admin/Shell';
import { View } from 'react-native';
import { themed, useScheme } from '@/constants/theme';
import type { LogAction } from '@/lib/admin';
import { invalidateAdmin } from '@/lib/admin/hooks';
import { t } from '@/lib/i18n';

const ACTIONS: (LogAction | null)[] = [null, 'verify', 'balance', 'subscription', 'priority', 'block', 'unblock', 'cancel', 'delete_review', 'category', 'problem', 'grant_admin', 'revoke_admin'];

export default function Log() {
  useScheme();
  const [action, setAction] = useState<LogAction | null>(null);
  return (
    <AdminPage title={t('admin.nav.log')} subtitle={t('admin.log.subtitle')} onRefresh={invalidateAdmin}>
      <View style={styles.pills}>
        {ACTIONS.map((a) => (
          <Pill key={a ?? 'all'} label={a ? t(`admin.log.a.${a}`) : t('admin.common.all')} active={action === a} onPress={() => setAction(a)} />
        ))}
      </View>
      <Panel padded={false}>
        <LogList action={action} />
      </Panel>
    </AdminPage>
  );
}

const styles = themed(() => ({
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
}));
