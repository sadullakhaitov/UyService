// POST /functions/v1/telegram-auth  { init_data, contact? }
// Telegram ichida ochilgan ilova (lib/telegram.ts) shu orqali kiradi — SMS kodsiz.
//   1) init_data imzosi tekshiriladi (kim ochdi — Telegram foydalanuvchisi)
//   2) raqam: avval bog'langan profildan; bo'lmasa — requestContact javobidan (imzoli) yoki bot orqali
//      ulashilgan kontaktdan (telegram_contacts, telegram-bot yozadi). Raqam yo'q bo'lsa — { need: 'contact' }
//   3) shu raqamdagi foydalanuvchi topiladi yoki yaratiladi, Telegram'ga bog'lanadi
//   4) kirish uchun bir martalik token qaytadi: ilova supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
// Sir: TELEGRAM_BOT_TOKEN (`npx supabase secrets set TELEGRAM_BOT_TOKEN=...`).
import { adminClient, corsHeaders, json, readJson } from '../_shared/http.ts';
import { uzPhone, verifyTelegramData } from '../_shared/telegram.ts';

type TgUser = { id: number; first_name?: string; last_name?: string; language_code?: string };

/** Raqam (998XXXXXXXXX) bo'yicha kirish hisobi — Auth admin API'da to'g'ridan-to'g'ri qidiruv yo'q, sahifalab qaraymiz */
async function authUserByPhone(db: ReturnType<typeof adminClient>, digits: string): Promise<string | null> {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.phone ?? '').replace(/\D/g, '') === digits);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const bot = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? '';
  if (!bot) return json({ ok: false, error: 'not_configured' }, 500);

  const body = await readJson<{ init_data: string; contact: string }>(req);
  const init = await verifyTelegramData(body.init_data ?? '', bot);
  if (!init) return json({ ok: false, error: 'bad_init_data' }, 401);
  let tg: TgUser;
  try {
    tg = JSON.parse(init.get('user') ?? '');
  } catch {
    return json({ ok: false, error: 'bad_init_data' }, 401);
  }
  if (!tg?.id) return json({ ok: false, error: 'bad_init_data' }, 401);

  const db = adminClient();
  const name = [tg.first_name, tg.last_name].filter(Boolean).join(' ').trim();
  try {
    let userId: string | null = null;
    let phone: string | null = null;

    const { data: linked } = await db.from('profiles').select('id, phone, blocked_at').eq('telegram_id', tg.id).maybeSingle();
    if (linked) {
      userId = linked.id;
      phone = linked.phone;
    } else {
      // Raqam: requestContact javobi (Telegram imzolagan) yoki bot orqali ulashilgan kontakt
      if (body.contact) {
        const c = await verifyTelegramData(body.contact, bot, 3600);
        try {
          const contact = c ? JSON.parse(c.get('contact') ?? '') : null;
          if (contact && Number(contact.user_id) === tg.id) phone = uzPhone(contact.phone_number);
        } catch {
          // imzosiz yoki buzilgan — pastdagi yo'l
        }
      }
      if (!phone) {
        const { data: shared } = await db.from('telegram_contacts').select('phone').eq('telegram_id', tg.id).maybeSingle();
        if (shared) {
          phone = uzPhone(shared.phone);
          if (!phone) return json({ ok: false, error: 'phone_not_uz' });
        }
      }
      if (!phone) return json({ ok: false, need: 'contact' });

      const { data: prof } = await db.from('profiles').select('id').eq('phone', phone).maybeSingle();
      if (prof) userId = prof.id;
      else {
        const { data, error } = await db.auth.admin.createUser({ phone: phone.slice(1), phone_confirm: true, user_metadata: { name, language: tg.language_code } });
        if (data?.user) userId = data.user.id;
        else if (error && /already registered/i.test(error.message)) {
          // Kirish hisobi bor, profili yo'q (masalan, profil qo'lda o'chirilgan) — hisobni topib, profilni tiklaymiz
          userId = await authUserByPhone(db, phone.slice(1));
          if (!userId) throw new Error(error.message);
          const { error: pe } = await db.from('profiles').upsert({ id: userId, phone, name: name || null }, { onConflict: 'id', ignoreDuplicates: true });
          if (pe) throw new Error(pe.message);
        } else throw new Error(error?.message ?? 'create_user');
      }
      // Shu Telegram boshqa profilga bog'langan bo'lsa — uzib, shu raqamga bog'laymiz (raqamni Telegram tasdiqladi)
      await db.from('profiles').update({ telegram_id: null }).eq('telegram_id', tg.id);
      const { error: linkErr } = await db.from('profiles').update({ telegram_id: tg.id }).eq('id', userId);
      if (linkErr) throw new Error(linkErr.message);
      if (name) await db.from('profiles').update({ name }).eq('id', userId).is('name', null);
    }
    if (!userId) return json({ ok: false, need: 'contact' });
    if (linked?.blocked_at) return json({ ok: false, error: 'blocked' }, 403);

    // Kirish: yashirin email + bir martalik "magic link" tokeni (SMS'siz sessiya)
    const email = `tg${tg.id}@telegram.uyservice.uz`;
    const { data: owner } = await db.rpc('auth_user_by_email', { p_email: email });
    if (owner && owner !== userId) {
      await db.auth.admin.updateUserById(owner as string, { email: `tg${tg.id}-old-${Date.now()}@telegram.uyservice.uz` });
    }
    if (owner !== userId) {
      const { error } = await db.auth.admin.updateUserById(userId, { email, email_confirm: true });
      if (error) throw new Error(error.message);
    }
    const { data: link, error: linkError } = await db.auth.admin.generateLink({ type: 'magiclink', email });
    if (linkError || !link?.properties?.hashed_token) throw new Error(linkError?.message ?? 'generate_link');
    const { data: p } = await db.from('profiles').select('name').eq('id', userId).maybeSingle();
    return json({ ok: true, token_hash: link.properties.hashed_token, phone, name: p?.name ?? name });
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: String((e as Error).message ?? e) }, 500);
  }
});
