// Telegram Mini App ma'lumotlarini tekshirish (core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
// data-check-string = "hash"dan boshqa hamma maydon, alifbo tartibida "kalit=qiymat", "\n" bilan;
// kalit = HMAC_SHA256("WebAppData", bot_token); hash = hex(HMAC_SHA256(kalit, data-check-string)).
// Shu usul bilan initData (kim ochdi) va requestContact javobi (raqam) tekshiriladi.

const enc = new TextEncoder();

async function hmac(key: Uint8Array, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as Uint8Array<ArrayBuffer>, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(data)));
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** Imzo to'g'ri va eskirmagan bo'lsa — maydonlar, aks holda null */
export async function verifyTelegramData(raw: string, botToken: string, maxAgeSec = 86_400, now = Date.now()): Promise<URLSearchParams | null> {
  if (!raw || !botToken) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash) return null;
  const check = [...params.entries()]
    .filter(([k]) => k !== 'hash')
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = await hmac(enc.encode('WebAppData'), botToken);
  const expected = hex(await hmac(secret, check));
  // Vaqt bo'yicha teng solishtirish
  if (expected.length !== hash.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ hash.charCodeAt(i);
  if (diff !== 0) return null;
  const authDate = Number(params.get('auth_date'));
  if (!authDate || now / 1000 - authDate > maxAgeSec) return null;
  return params;
}

/** Sinovlar uchun: maydonlarni bot tokeni bilan imzolaydi */
export async function signTelegramData(fields: Record<string, string>, botToken: string): Promise<string> {
  const check = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');
  const secret = await hmac(enc.encode('WebAppData'), botToken);
  const p = new URLSearchParams(fields);
  p.set('hash', hex(await hmac(secret, check)));
  return p.toString();
}

/** Telegram raqami → "+998XXXXXXXXX" (faqat O'zbekiston raqamlari) yoki null */
export function uzPhone(phone: string | null | undefined): string | null {
  const d = String(phone ?? '').replace(/\D/g, '');
  return /^998\d{9}$/.test(d) ? `+${d}` : null;
}
