begin;

drop function if exists public.get_today_attendance();

create function public.get_today_attendance()
returns table (
  day_id uuid,
  work_date date,
  first_clock_in timestamptz,
  latest_clock_in timestamptz,
  last_clock_out timestamptz,
  open_period_id uuid,
  open_started_at timestamptz,
  worked_minutes integer,
  is_paid boolean,
  server_now timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auth_user_id uuid;
  v_user_id uuid;
  v_company_id uuid;
  v_is_admin boolean;

  v_now timestamptz;
  v_time_zone text := 'America/Mexico_City';
  v_work_date date;

  v_day_id uuid;
  v_is_paid boolean;

  v_first_clock_in timestamptz;
  v_latest_clock_in timestamptz;
  v_last_clock_out timestamptz;
  v_open_period_id uuid;
  v_open_started_at timestamptz;
  v_worked_minutes integer;
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  select
    users.id,
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_user_id,
    v_company_id,
    v_is_admin
  from public.users
  where users.auth_user_id = v_auth_user_id;

  if not found then
    raise exception 'No se encontro el perfil del usuario';
  end if;

  if v_company_id is null then
    raise exception 'El usuario no tiene una empresa asignada';
  end if;

  if v_is_admin then
    raise exception
      'Los administradores no tienen asistencia de trabajador';
  end if;

  v_now := clock_timestamp();
  v_work_date := (v_now at time zone v_time_zone)::date;

  select
    days.id,
    days.is_paid
  into
    v_day_id,
    v_is_paid
  from public.days
  where days.user_id = v_user_id
    and days.work_date = v_work_date;

  -- El usuario todavia no tiene registros hoy.
  if not found then
    return query
    select
      null::uuid,
      v_work_date,
      null::timestamptz,
      null::timestamptz,
      null::timestamptz,
      null::uuid,
      null::timestamptz,
      0::integer,
      false,
      v_now;

    return;
  end if;

  -- Obtiene el resumen completo de los periodos del dia.
  select
    min(periods.started_at),
    max(periods.started_at),
    max(periods.ended_at),
    coalesce(
      floor(
        sum(
          extract(
            epoch from (periods.ended_at - periods.started_at)
          )
        ) / 60
      ),
      0
    )::integer
  into
    v_first_clock_in,
    v_latest_clock_in,
    v_last_clock_out,
    v_worked_minutes
  from public.periods
  where periods.day_id = v_day_id;

  -- Obtiene el periodo que actualmente no tiene salida.
  select
    periods.id,
    periods.started_at
  into
    v_open_period_id,
    v_open_started_at
  from public.periods
  where periods.day_id = v_day_id
    and periods.ended_at is null
  order by periods.started_at desc
  limit 1;

  return query
  select
    v_day_id,
    v_work_date,
    v_first_clock_in,
    v_latest_clock_in,
    v_last_clock_out,
    v_open_period_id,
    v_open_started_at,
    v_worked_minutes,
    v_is_paid,
    v_now;
end;
$$;

revoke all
on function public.get_today_attendance()
from public;

grant execute
on function public.get_today_attendance()
to authenticated;

commit;

notify pgrst, 'reload schema';