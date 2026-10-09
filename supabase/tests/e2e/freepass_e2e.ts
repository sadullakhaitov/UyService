// E2E: bepul davr kodini yuborish (free-pass-send → deliverFreePass): Telegram, bo'lmasa SMS, ikkalasi yo'q — no_channel;
// ishlatilgan / bekor qilingan kod yuborilmaydi; yuborilgani free_passes.sent_via ga yoziladi
import { deliverFreePass } from '../../functions/_shared/freepass.ts';
import { check, db, proxy } from './harness.ts';

const M1 = '00000000-0000-4000-b000-000000000001'; // 998903333333

type TgCall = { url: string; body: { chat_id: number; text: string; reply_markup?: { inline_keyboard: { web_app: { url: string } }[][] } } };
let calls: TgCall[] = [];
const fakeTg = (status = 200) => (async (url: string | URL | Request, init?: RequestInit) => {
  calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
  return new Response(status === 200 ? '{"ok":true}' : '{"ok":false}', { status });
}) as typeof fetch;
let smsSent: string[] = [];
const sms = async (digits: string, text: string) => {
  smsSent.push(`${digits}:${text}`);
};
const reset = () => ((calls = []), (smsSent = []));
const soon = new Date(Date.now() + 30 * 86_400_000).toISOString();

const { error: ie } = await db.from('free_passes').insert([
  { code: 'UYNOCHAN01', phone: '+998907777777', days: 30, redeem_by: soon },
  { code: 'UYMASTER01', phone: '+998903333333', days: 90, redeem_by: soon },
  { code: 'UYUSED0001', phone: '+998903333333', days: 60, redeem_by: soon, redeemed_at: new Date().toISOString() },
]);
check(!ie, 'kodlar yozildi', ie);

reset();
let r = await deliverFreePass(db, { code: 'UYNOCHAN01', botToken: 'BOT', sms: null }, fakeTg());
check(r === 'no_channel' && calls.length === 0, 'Telegram noma’lum, SMS ulanmagan — no_channel', r);

reset();
r = await deliverFreePass(db, { code: 'UYNOCHAN01', botToken: 'BOT', sms }, fakeTg());
check(r === 'sms' && smsSent[0]?.startsWith('998907777777:') && smsSent[0].includes('UYNOCHAN01') && smsSent[0].includes('30 kunlik'),
  'Telegram noma’lum — SMS (kod va muddat bilan)', smsSent);

await db.from('profiles').update({ telegram_id: 4242, language: 'ru' }).eq('id', M1);
reset();
r = await deliverFreePass(db, { code: 'UYMASTER01', botToken: 'BOT', appUrl: 'https://uyservice.uz/', sms }, fakeTg());
check(
  r === 'telegram' && calls.length === 1 && calls[0].body.chat_id === 4242 && calls[0].body.text.includes('<code>UYMASTER01</code>') &&
    calls[0].body.text.includes('90 дней') && calls[0].body.reply_markup?.inline_keyboard[0][0].web_app.url === 'https://uyservice.uz/master/promo?code=UYMASTER01' &&
    smsSent.length === 0,
  'usta Telegram’da — kod botdan, o‘z tilida, "Ochish" — promokod ekrani',
  { r, calls },
);
const { data: row } = await db.from('free_passes').select('sent_via, sent_at').eq('code', 'UYMASTER01').single();
check(row?.sent_via === 'telegram' && row?.sent_at, 'yuborilgani yozildi', row);

reset();
r = await deliverFreePass(db, { code: 'UYMASTER01', botToken: 'BOT', sms }, fakeTg(403));
check(r === 'sms' && smsSent.length === 1, 'bot bloklangan — SMS’ga o‘tadi', { r, smsSent });

reset();
r = await deliverFreePass(db, { code: 'UYUSED0001', botToken: 'BOT', sms }, fakeTg());
check(r === 'not_pending' && calls.length === 0 && smsSent.length === 0, 'ishlatilgan kod yuborilmaydi', r);

await proxy.shutdown();
