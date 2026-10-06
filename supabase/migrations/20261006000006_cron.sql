-- UyService: har 15 soniyada `offer-timeout` Edge Function'ini chaqirish (pg_cron + pg_net).
-- U javobsiz takliflarni yopadi (60 s), keyingi ustaga o'tadi, radiusni kengaytiradi
-- va rejalashtirilgan buyurtmalar uchun qidiruvni vaqtidan 30 daqiqa oldin boshlaydi.
--
-- Migratsiya faqat yordamchi funksiyani yaratadi. Yoqish (bir marta, Supabase → SQL Editor):
--   select public.schedule_offer_timeout('https://<PROJECT_REF>.supabase.co', '<CRON_SECRET>');
-- <CRON_SECRET> — `npx supabase secrets set CRON_SECRET=...` da yozilgan qiymatning o'zi.
-- O'chirish:  select public.unschedule_offer_timeout();
-- Tekshirish: select * from cron.job;  select * from cron.job_run_details order by start_time desc limit 10;

create or replace function public.schedule_offer_timeout(
  p_project_url text,
  p_cron_secret text,
  p_every text default '15 seconds'
) returns bigint
language plpgsql security definer set search_path = public, extensions as $$
declare
  cmd text;
  jid bigint;
begin
  begin
    create extension if not exists pg_cron;
    create extension if not exists pg_net with schema extensions;
  exception when others then
    raise exception 'pg_cron / pg_net yoqilmadi (%). Dashboard → Database → Extensions → pg_cron va pg_net ni yoqing, keyin qayta urinib ko''ring', sqlerrm;
  end;

  cmd := format(
    'select net.http_post(url := %L, headers := %L::jsonb, body := ''{}''::jsonb, timeout_milliseconds := 10000)',
    rtrim(p_project_url, '/') || '/functions/v1/offer-timeout',
    jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', p_cron_secret)::text
  );

  execute 'select cron.unschedule(jobid) from cron.job where jobname = ''uyservice-offer-timeout''';
  execute 'select cron.schedule(''uyservice-offer-timeout'', $1, $2)' into jid using p_every, cmd;
  return jid;
end $$;

create or replace function public.unschedule_offer_timeout() returns void
language plpgsql security definer set search_path = public as $$
begin
  execute 'select cron.unschedule(jobid) from cron.job where jobname = ''uyservice-offer-timeout''';
end $$;

-- Faqat SQL Editor'dan (postgres) — ilovadan chaqirib bo'lmaydi
revoke execute on function public.schedule_offer_timeout(text, text, text) from public, anon, authenticated, service_role;
revoke execute on function public.unschedule_offer_timeout() from public, anon, authenticated, service_role;
