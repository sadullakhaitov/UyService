import { Bookmark, ChevronLeft, Copy, EllipsisVertical, ExternalLink, Share, SquarePlus } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { ModalSheet } from '@/components/sheets/ModalSheet';
import { Button, Text } from '@/components/ui';
import { colors, fonts, themed, useScheme } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { openInBrowser, type InstallKind } from '@/lib/install';

const ICON = require('../../assets/icon.png');

// iPhone'dagi Chrome'da «Ulashish» manzil satrida (tepada), Safari'da — pastki panelda
const chrome = () => typeof navigator !== 'undefined' && /CriOS/.test(navigator.userAgent);
const iphone = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

/** «Ilovani o'rnatish»: brauzer o'zi oyna ochmaydigan joyda — rasmli yo'riqnoma (iPhone) yoki brauzerga o'tkazish (Telegram) */
export function InstallSheet({ kind, onClose }: { kind: Exclude<InstallKind, 'prompt'> | null; onClose: () => void }) {
  useScheme();
  return (
    <ModalSheet visible={kind !== null} onClose={onClose}>
      <Text variant="h2">{t('install.title')}</Text>
      {kind === 'telegram' ? <TelegramBody onClose={onClose} /> : null}
      {kind === 'ios' ? <IosBody onClose={onClose} /> : null}
      {kind === 'manual' ? (
        <>
          <Step n={1} text={t('install.manual1')} />
          <Step n={2} text={t('install.manual2')} />
          <Button title={t('install.ok')} big onPress={onClose} />
        </>
      ) : null}
    </ModalSheet>
  );
}

// Telegram ichida o'rnatib bo'lmaydi — bitta tugma bilan sayt brauzerda ochiladi va yo'riqnoma o'zi chiqadi
function TelegramBody({ onClose }: { onClose: () => void }) {
  return (
    <>
      <Text variant="small">{t('install.tgWhy')}</Text>
      <Button
        title={t(iphone() ? 'install.openSafari' : 'install.openBrowser')}
        icon={ExternalLink}
        big
        onPress={() => {
          openInBrowser();
          onClose();
        }}
      />
    </>
  );
}

function IosBody({ onClose }: { onClose: () => void }) {
  const inChrome = chrome();
  return (
    <>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.steps} showsVerticalScrollIndicator={false}>
        <Step n={1} text={t(inChrome ? 'install.ios1Chrome' : 'install.ios1')}>
          {inChrome ? <ChromeBar /> : <SafariBar />}
        </Step>
        <Step n={2} text={t('install.ios2')}>
          <ShareSheet />
        </Step>
        <Step n={3} text={t('install.ios3')}>
          <AddDialog />
        </Step>
        <Step n={4} text={t('install.ios4')}>
          <HomeScreen />
        </Step>
      </ScrollView>
      <Button title={t('install.ok')} big onPress={onClose} />
    </>
  );
}

function Step({ n, text, children }: { n: number; text: string; children?: ReactNode }) {
  useScheme();
  return (
    <View style={styles.step}>
      <View style={styles.stepHead}>
        <View style={styles.num}>
          <Text style={styles.numText}>{n}</Text>
        </View>
        <Text style={styles.stepText}>{text}</Text>
      </View>
      {children ? <View style={styles.pic}>{children}</View> : null}
    </View>
  );
}

/** Bosiladigan joy: to'q sariq halqa */
function Spot({ children }: { children: ReactNode }) {
  return <View style={styles.spot}>{children}</View>;
}

// 1-qadam rasmi: Safari'ning pastki paneli, «Ulashish» belgilangan
function SafariBar() {
  return (
    <View style={styles.bar}>
      <ChevronLeft size={20} color={colors.info} />
      <View style={styles.url}>
        <Text style={styles.urlText}>uyservice.uz</Text>
      </View>
      <Spot>
        <Share size={20} color={colors.info} />
      </Spot>
      <Text style={styles.dots}>⋯</Text>
    </View>
  );
}

// 1-qadam rasmi (iPhone'dagi Chrome): manzil satri, o'ngda «Ulashish»
function ChromeBar() {
  return (
    <View style={styles.bar}>
      <View style={[styles.url, styles.urlWide]}>
        <Text style={styles.urlText}>uyservice.uz</Text>
        <Spot>
          <Share size={18} color={colors.ink} />
        </Spot>
      </View>
    </View>
  );
}

// 2-qadam rasmi: ulashish oynasidagi ro'yxat, «Bosh ekranga qo'shish» belgilangan
function ShareSheet() {
  return (
    <View style={styles.list}>
      <ListRow icon={<Copy size={18} color={colors.ink} />} label={t('install.picCopy')} />
      <View style={styles.listLine} />
      <ListRow icon={<Bookmark size={18} color={colors.ink} />} label={t('install.picBookmark')} />
      <View style={styles.listLine} />
      <View style={styles.listHot}>
        <ListRow icon={<SquarePlus size={18} color={colors.ink} />} label={t('install.picAdd')} />
      </View>
    </View>
  );
}

function ListRow({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={styles.listRow}>
      <Text style={styles.listText}>{label}</Text>
      {icon}
    </View>
  );
}

// 3-qadam rasmi: «Qo'shish» tugmasi o'ng tepada
function AddDialog() {
  return (
    <View style={styles.dialog}>
      <View style={styles.dialogHead}>
        <Text style={styles.dialogSide}>{t('install.picCancel')}</Text>
        <Spot>
          <Text style={styles.dialogAdd}>{t('install.picAddBtn')}</Text>
        </Spot>
      </View>
      <View style={styles.dialogBody}>
        <Image source={ICON} style={styles.appIcon} accessibilityIgnoresInvertColors />
        <Text style={styles.appName}>UyService</Text>
      </View>
    </View>
  );
}

// 4-qadam rasmi: bosh ekranda UyService ikonkasi
function HomeScreen() {
  return (
    <View style={styles.home}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.homeSlot}>
          <View style={styles.ghost} />
        </View>
      ))}
      <View style={styles.homeSlot}>
        <Spot>
          <Image source={ICON} style={styles.homeIcon} accessibilityIgnoresInvertColors />
        </Spot>
        <Text style={styles.homeName}>UyService</Text>
      </View>
    </View>
  );
}

const styles = themed(() => ({
  scroll: { maxHeight: 460, flexGrow: 0 },
  steps: { gap: 10 },
  step: { padding: 12, borderRadius: 18, backgroundColor: colors.surface, gap: 10 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: fonts.heavy, fontSize: 14, color: colors.onPrimary },
  stepText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  pic: { borderRadius: 14, backgroundColor: colors.field, padding: 12, alignItems: 'center' },
  spot: { borderWidth: 2.5, borderColor: colors.accent, borderRadius: 12, padding: 4, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch', justifyContent: 'center' },
  url: { flex: 1, height: 36, borderRadius: 18, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  urlWide: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 14, paddingRight: 4 },
  urlText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  dots: { fontFamily: fonts.heavy, fontSize: 18, color: colors.info },
  list: { alignSelf: 'stretch', borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9 },
  listText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  listLine: { height: 1, backgroundColor: colors.line, marginLeft: 12 },
  listHot: { borderWidth: 2.5, borderColor: colors.accent, borderRadius: 12 },
  dialog: { alignSelf: 'stretch', borderRadius: 12, backgroundColor: colors.surface, padding: 10, gap: 10 },
  dialogHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dialogSide: { fontFamily: fonts.bold, fontSize: 14, color: colors.info },
  dialogAdd: { fontFamily: fonts.heavy, fontSize: 14, color: colors.info, paddingHorizontal: 4 },
  dialogBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  appIcon: { width: 40, height: 40, borderRadius: 10 },
  appName: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  home: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  homeSlot: { alignItems: 'center', gap: 4, width: 60 },
  ghost: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.line, marginTop: 6 },
  homeIcon: { width: 46, height: 46, borderRadius: 12 },
  homeName: { fontFamily: fonts.bold, fontSize: 11, color: colors.ink },
}));
