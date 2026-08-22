begin;

-- Habilita Supabase Cron / pg_cron.
create extension if not exists pg_cron;

create or replace function public.close_expired_attendance_periods()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closed_periods integer;
  v_now timestamptz;
  v_time_zone text := 'America/Mexico_City';
begin
  v_now := clock_timestamp();

  /*
   * Cierra periodos cuyo límite diario ya venció.
   *
   * El job puede ejecutarse segundos o minutos después,
   * pero ended_at siempre se guarda exactamente a las 21:30
   * de la fecha correspondiente.
   */
  update public.periods as expired_periods
  set ended_at = attendance_window.window_end
  from public.days as attendance_days
  cross join lateral (
    select (
      attendance_days.work_date + time '21:30:00'
    ) at time zone v_time_zone as window_end
  ) as attendance_window
  where attendance_days.id = expired_periods.day_id
    and expired_periods.ended_at is null
    and attendance_days.is_paid = false
    and attendance_window.window_end <= v_now

    -- Evita violar ended_at > started_at con datos antiguos inválidos.
    and expired_periods.started_at < attendance_window.window_end;

  get diagnostics v_closed_periods = row_count;

  return v_closed_periods;
end;
$$;

-- El frontend no puede ejecutar esta función.
revoke all
on function public.close_expired_attendance_periods()
from public, anon, authenticated;

-- Crea o actualiza el job utilizando siempre el mismo nombre.
select cron.schedule(
  'close-expired-attendance-periods',
  '30 3 * * *',
  $job$
    select public.close_expired_attendance_periods();
  $job$
);

commit;