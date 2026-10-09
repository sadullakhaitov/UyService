// E2E: kirish kodi (send-sms hook → deliverOtp): Telegram'i ma'lum bo'lsa — bot xabari, bo'lmasa — SMS, ikkalasi yo'q — no_channel
import { deliverOtp } from '../../functions/_shared/otp.ts';
import { check, db, proxy } from './harness.ts';

const CLIENT = '00000000-0000-4000-b000-00000000000a'; // 998901111111
const M1 = '00000000-0000-4000-b000-000000000001'; // 998903333333
const M2 = '00000000-0000-4000-b000-000000000002'; // 998904444444

type TgCall = { url: string; body: { chat_id: number; text: string; protect_content?: boolean } };
let calls: TgCall[] = [];
const fakeTg = (status = 200) => (async (url: string | URL | Request, init?: RequestInit) => {
  calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
  return new Response(status === 200 ? '{"ok":true}' : '{"ok":false,"description":"Forbidden: bot was blocked by the user"}', { status });
}) as typeof fetch;
let smsSent: string[] = [];
const sms = async (digits: string, otp: string) => {
  smsSent.push(`${digits}:${otp}`);
};
const reset = () => ((calls = []), (smsSent = []));

// Telegram ham, SMS ham yo'q
reset();
let r = await deliverOtp(db, { userId: CLIENT, digits: '998901111111', otp: '111111', botToken: 'T', sms: null }, fakeTg());
check(r === 'no_channel' && calls.length === 0, 'Telegram noma’lum, SMS ulanmagan — no_channel', r);

// Telegram noma'lum — SMS
reset();
r = await deliverOtp(db, { userId: CLIENT, digits: '998901111111', otp: '222222', botToken: 'T', sms }, fakeTg());
check(r === 'sms' && smsSent[0] === '998901111111:222222', 'Telegram noma’lum — SMS ketdi', { r, smsSent });

// Telegram orqali kirgan usta (profiles.telegram_id) — bot xabari, o'z tilida, SMS ketmaydi
await db.from('profiles').update({ telegram_id: 111, language: 'ru' }).eq('id', M1);
reset();
r = await deliverOtp(db, { userId: M1, digits: '998903333333', otp: '333333', botToken: 'BOT', sms }, fakeTg());
check(
  r === 'telegram' && calls.length === 1 && calls[0].url.includes('/botBOT/sendMessage') && calls[0].body.chat_id === 111 &&
    calls[0].body.text.includes('<code>333333</code>') && calls[0].body.text.includes('Код входа') && calls[0].body.protect_content === true &&
    smsSent.length === 0,
  'Telegram bilan kirgan — kod botdan, o‘z tilida, SMS ketmaydi',
  { r, calls, smsSent },
);

// Botga raqamini ulashgan (telegram_contacts), profilda Telegram yo'q — kontakt orqali
const { error: ce } = await db.from('telegram_contacts').insert({ telegram_id: 222, phone: '+998901111111' });
check(!ce, 'telegram_contacts yozildi', ce);
reset();
r = await deliverOtp(db, { userId: CLIENT, digits: '998901111111', otp: '444444', botToken: 'BOT', sms }, fakeTg());
check(r === 'telegram' && calls[0]?.body.chat_id === 222 && smsSent.length === 0, 'botga ulashilgan raqam — kod botdan', { r, calls });

// Bot bloklangan (403) — SMS'ga o'tadi
reset();
r = await deliverOtp(db, { userId: M1, digits: '998903333333', otp: '555555', botToken: 'BOT', sms }, fakeTg(403));
check(r === 'sms' && calls.length === 1 && smsSent[0] === '998903333333:555555', 'bot bloklangan — SMS’ga o‘tadi', { r, smsSent });

// Raqam almashtirilmoqda: profil boshqa raqamda — eski raqamning Telegram'iga kod ketmaydi
await db.from('profiles').update({ telegram_id: 333 }).eq('id', M2);
reset();
r = await deliverOtp(db, { userId: M2, digits: '998905555555', otp: '666666', botToken: 'BOT', sms: null }, fakeTg());
check(r === 'no_channel' && calls.length === 0, 'boshqa raqamga kod profilning Telegram’iga ketmaydi', { r, calls });

// Bot tokeni yo'q — Telegram tekshirilmaydi
reset();
r = await deliverOtp(db, { userId: M1, digits: '998903333333', otp: '777777', botToken: null, sms }, fakeTg());
check(r === 'sms' && calls.length === 0, 'bot tokeni yo‘q — faqat SMS', r);

await proxy.shutdown();
