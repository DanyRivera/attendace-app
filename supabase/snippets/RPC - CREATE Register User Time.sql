begin;

create or replace function public.register_time()
returns table (
  action text,
  day_id uuid,
  period_id uuid,
  registered_at timestamptz,
  worked_minutes integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Usuario autenticado.
  v_auth_user_id uuid;
  v_user_id uuid;
  v_company_id uuid;
  v_is_admin boolean;

  -- Fecha y ventana oficial de asistencia.
  v_now timestamptz;
  v_time_zone text := 'America/Mexico_City';
  v_work_date date;
  v_window_start timestamptz;
  v_window_end timestamptz;

  -- Día actual.
  v_day_id uuid;
  v_day_is_paid boolean;

  -- Periodo abierto actual.
  v_period_id uuid;
  v_open_day_id uuid;
  v_open_is_paid boolean;
  v_open_started_at timestamptz;

  -- Resultado.
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
    raise exception
      'El usuario no tiene una empresa asignada';
  end if;

  if v_is_admin then
    raise exception
      'Los administradores no pueden registrar asistencia';
  end if;

  -- Evita registros simultáneos del mismo colaborador.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text, 0)
  );

  -- Hora oficial generada por PostgreSQL.
  v_now := clock_timestamp();
  v_work_date := (v_now at time zone v_time_zone)::date;

  -- Convierte las 07:00 y 21:30 locales a timestamptz.
  v_window_start := (
    v_work_date + time '07:00:00'
  ) at time zone v_time_zone;

  v_window_end := (
    v_work_date + time '21:30:00'
  ) at time zone v_time_zone;

  -- La validación ocurre en PostgreSQL, no solamente en el frontend.
  if v_now < v_window_start then
    raise exception
      'El registro de asistencia inicia a las 07:00';
  end if;

  if v_now >= v_window_end then
    raise exception
      'El registro de asistencia finaliza a las 21:30';
  end if;

  /*
   * Respaldo del job programado:
   * cierra silenciosamente periodos anteriores que sigan abiertos.
   *
   * ended_at se guarda exactamente a las 21:30 de la fecha
   * correspondiente, aunque el registro actual ocurra días después.
   */
  update public.periods as previous_periods
  set ended_at = (
    previous_days.work_date + time '21:30:00'
  ) at time zone v_time_zone
  from public.days as previous_days
  where previous_days.id = previous_periods.day_id
    and previous_days.user_id = v_user_id
    and previous_days.work_date < v_work_date
    and previous_days.is_paid = false
    and previous_periods.ended_at is null
    and previous_periods.started_at < (
      previous_days.work_date + time '21:30:00'
    ) at time zone v_time_zone;

  -- Busca un periodo abierto correspondiente al día actual.
  select
    periods.id,
    days.id,
    days.is_paid,
    periods.started_at
  into
    v_period_id,
    v_open_day_id,
    v_open_is_paid,
    v_open_started_at
  from public.periods
  inner join public.days
    on days.id = periods.day_id
  where days.user_id = v_user_id
    and days.work_date = v_work_date
    and periods.ended_at is null
  order by periods.started_at desc
  limit 1
  for update of periods, days;

  -- Si existe un periodo actual abierto, registra la salida.
  if found then
    if v_open_is_paid then
      raise exception
        'No se puede modificar un dia pagado';
    end if;

    if (
      v_open_started_at at time zone v_time_zone
    )::date <> v_work_date then
      raise exception
        'El periodo no corresponde a la fecha de asistencia';
    end if;

    if v_now <= v_open_started_at then
      raise exception
        'La salida debe ser posterior a la entrada';
    end if;

    update public.periods
    set ended_at = v_now
    where periods.id = v_period_id
      and periods.ended_at is null;

    if not found then
      raise exception
        'El periodo ya no se encuentra abierto';
    end if;

    select
      coalesce(
        floor(
          sum(
            extract(
              epoch from (
                periods.ended_at
                - periods.started_at
              )
            )
          ) / 60
        ),
        0
      )::integer
    into v_worked_minutes
    from public.periods
    where periods.day_id = v_open_day_id
      and periods.ended_at is not null;

    return query
    select
      'clock_out'::text,
      v_open_day_id,
      v_period_id,
      v_now,
      v_worked_minutes;

    return;
  end if;

  -- Busca el día de asistencia actual.
  select
    days.id,
    days.is_paid
  into
    v_day_id,
    v_day_is_paid
  from public.days
  where days.user_id = v_user_id
    and days.work_date = v_work_date
  for update;

  -- Crea el día si todavía no existe.
  if not found then
    insert into public.days (
      user_id,
      company_id,
      work_date
    )
    values (
      v_user_id,
      v_company_id,
      v_work_date
    )
    returning
      days.id,
      days.is_paid
    into
      v_day_id,
      v_day_is_paid;
  end if;

  if v_day_is_paid then
    raise exception
      'No se puede registrar tiempo en un dia pagado';
  end if;

  -- Registra una nueva entrada dentro de la ventana permitida.
  insert into public.periods (
    day_id,
    started_at
  )
  values (
    v_day_id,
    v_now
  )
  returning periods.id
  into v_period_id;

  -- Solo suma periodos que ya tienen salida.
  select
    coalesce(
      floor(
        sum(
          extract(
            epoch from (
              periods.ended_at
              - periods.started_at
            )
          )
        ) / 60
      ),
      0
    )::integer
  into v_worked_minutes
  from public.periods
  where periods.day_id = v_day_id
    and periods.ended_at is not null;

  return query
  select
    'clock_in'::text,
    v_day_id,
    v_period_id,
    v_now,
    v_worked_minutes;
end;
$$;

-- Elimina permisos heredados.
revoke all
on function public.register_time()
from public, anon, authenticated;

-- Solo usuarios autenticados pueden ejecutar la RPC.
grant execute
on function public.register_time()
to authenticated;

commit;

notify pgrst, 'reload schema';