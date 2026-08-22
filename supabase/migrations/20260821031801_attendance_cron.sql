-- Habilita Supabase Cron.
create extension if not exists pg_cron;

-- Ejecuta el cierre automático diariamente a las 03:30 UTC,
-- equivalente a las 21:30 en America/Mexico_City.
select cron.schedule(
  'close-expired-attendance-periods',
  '30 3 * * *',
  $job$
    select public.close_expired_attendance_periods();
  $job$
);
