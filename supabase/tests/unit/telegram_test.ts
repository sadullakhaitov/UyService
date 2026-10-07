// Telegram imzosini tekshirish (functions/_shared/telegram.ts). Ishga tushirish: deno test tests/unit/
import { signTelegramData, uzPhone, verifyTelegramData } from '../../functions/_shared/telegram.ts';

const BOT = '123456:TEST-token';
const now = Date.now();
const user = JSON.stringify({ id: 777, first_name: 'Aziz' });
const fields = { query_id: 'AAE', user, auth_date: String(Math.floor(now / 1000)) };

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

Deno.test('to\'g\'ri imzo qabul qilinadi', async () => {
  const raw = await signTelegramData(fields, BOT);
  const p = await verifyTelegramData(raw, BOT);
  assert(p && JSON.parse(p.get('user')!).id === 777, 'imzo qabul qilinmadi');
});

Deno.test('boshqa bot tokeni yoki o\'zgartirilgan maydon — rad', async () => {
  const raw = await signTelegramData(fields, BOT);
  assert((await verifyTelegramData(raw, '999:other')) === null, 'begona token qabul qilindi');
  const forged = raw.replace(encodeURIComponent('"id":777'), encodeURIComponent('"id":778'));
  assert(forged !== raw, 'sinov: maydon o\'zgarmadi');
  assert((await verifyTelegramData(forged, BOT)) === null, 'o\'zgartirilgan user qabul qilindi');
  assert((await verifyTelegramData('user=1&auth_date=1', BOT)) === null, 'hash\'siz qabul qilindi');
});

Deno.test('eskirgan ma\'lumot — rad', async () => {
  const old = await signTelegramData({ ...fields, auth_date: String(Math.floor(now / 1000) - 2 * 86_400) }, BOT);
  assert((await verifyTelegramData(old, BOT)) === null, 'eskirgan initData qabul qilindi');
});

Deno.test('Telegram algoritmi: kalit = HMAC("WebAppData", token), hash = HMAC(kalit, check-string)', async () => {
  // Mustaqil hisob (Web Crypto bilan bevosita)
  const enc = new TextEncoder();
  const key1 = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const secret = await crypto.subtle.sign('HMAC', key1, enc.encode(BOT));
  const key2 = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const check = `auth_date=${fields.auth_date}\nquery_id=AAE\nuser=${user}`;
  const h = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key2, enc.encode(check))), (x) => x.toString(16).padStart(2, '0')).join('');
  const raw = new URLSearchParams({ ...fields, hash: h }).toString();
  assert(await verifyTelegramData(raw, BOT), 'mustaqil hisoblangan hash qabul qilinmadi');
});

Deno.test('uzPhone', () => {
  assert(uzPhone('998901234567') === '+998901234567', '998...');
  assert(uzPhone('+998 90 123 45 67') === '+998901234567', '+998 ...');
  assert(uzPhone('+79161234567') === null, 'Rossiya raqami');
  assert(uzPhone('') === null, 'bo\'sh');
});
