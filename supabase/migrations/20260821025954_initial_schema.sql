-- Migration unit 1: schema_changes
-- Transaction mode: transactional
-- Boundary reason: default

SET check_function_bodies = false;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

CREATE SEQUENCE public.company_code_seq START WITH 1000;

REVOKE ALL ON SEQUENCE public.company_code_seq FROM anon, authenticated;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.company_code_seq TO service_role;

CREATE FUNCTION public.close_expired_attendance_periods()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.close_expired_attendance_periods() FROM PUBLIC;

CREATE FUNCTION public.get_company_worker_history (
  p_worker_id uuid
)
  RETURNS TABLE (
    id        uuid,
    work_date date,
    is_paid   boolean,
    paid_at   timestamp with time zone,
    periods   jsonb
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  -- Información obtenida de la sesión actual.
  v_auth_user_id uuid;
  v_admin_company_id uuid;
  v_is_admin boolean;

  -- Información real del colaborador solicitado.
  v_worker_company_id uuid;
  v_worker_is_admin boolean;
begin
  -- Obtiene la identidad desde la sesión autenticada.
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Obtiene el rol y la empresa del usuario autenticado.
  select
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_admin_company_id,
    v_is_admin
  from public.users
  where users.auth_user_id = v_auth_user_id;

  if not found then
    raise exception 'No se encontro el perfil del usuario';
  end if;

  if not v_is_admin then
    raise exception
      'Solo los administradores pueden consultar historiales';
  end if;

  if v_admin_company_id is null then
    raise exception
      'El administrador no tiene una empresa asignada';
  end if;

  -- Comprueba que se haya enviado un colaborador.
  if p_worker_id is null then
    raise exception 'El colaborador es obligatorio';
  end if;

  -- Obtiene el rol y la empresa del colaborador solicitado.
  select
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_worker_company_id,
    v_worker_is_admin
  from public.users
  where users.id = p_worker_id;

  if not found then
    raise exception 'No se encontro el colaborador';
  end if;

  -- Evita consultar administradores mediante esta función.
  if v_worker_is_admin then
    raise exception
      'No se puede consultar historial de administradores';
  end if;

  -- Impide consultar colaboradores de otras empresas.
  if v_worker_company_id is distinct from v_admin_company_id then
    raise exception
      'El colaborador no pertenece a tu empresa';
  end if;

  -- Devuelve cada día con sus periodos anidados y ordenados.
  return query
  select
    days.id,
    days.work_date,
    days.is_paid,
    days.paid_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', periods.id,
            'started_at', periods.started_at,
            'ended_at', periods.ended_at
          )
          order by periods.started_at asc
        )
        from public.periods
        where periods.day_id = days.id
      ),
      '[]'::jsonb
    ) as periods
  from public.days
  where days.user_id = p_worker_id
    and days.company_id = v_admin_company_id
  order by days.work_date desc;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_company_worker_history(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_company_worker_history(uuid) TO authenticated;

CREATE FUNCTION public.get_company_workers()
  RETURNS TABLE (
    id        uuid,
    name      text,
    last_name text,
    email     text,
    phone     text,
    salary    numeric
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_auth_user_id uuid;
  v_company_id uuid;
  v_is_admin boolean;
begin
  -- Obtiene el usuario directamente desde la sesión autenticada.
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Obtiene la empresa y el rol real del usuario.
  select
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_company_id,
    v_is_admin
  from public.users
  where users.auth_user_id = v_auth_user_id;

  if not found then
    raise exception 'No se encontro el perfil del usuario';
  end if;

  if not v_is_admin then
    raise exception 'Solo los administradores pueden consultar colaboradores';
  end if;

  if v_company_id is null then
    raise exception 'El administrador no tiene una empresa asignada';
  end if;

  -- Devuelve únicamente los trabajadores de la empresa del administrador.
return query
select
  users.id,
  users.name,
  users."lastName",
  users.email,
  users.phone,
  coalesce(users.salary, 0)::numeric
from public.users
where users.company = v_company_id
  and coalesce(users."isAdmin", false) = false
order by users.name, users."lastName";
end;
$function$;

REVOKE ALL ON FUNCTION public.get_company_workers() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_company_workers() TO authenticated;

CREATE FUNCTION public.get_today_attendance()
  RETURNS TABLE (
    day_id          uuid,
    work_date       date,
    first_clock_in  timestamp with time zone,
    latest_clock_in timestamp with time zone,
    last_clock_out  timestamp with time zone,
    open_period_id  uuid,
    open_started_at timestamp with time zone,
    worked_minutes  integer,
    is_paid         boolean,
    server_now      timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.get_today_attendance() FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_today_attendance() TO authenticated;

CREATE FUNCTION public.get_worker_pending_payments (
  p_worker_id uuid
)
  RETURNS TABLE (
    day_id           uuid,
    work_date        date,
    worked_minutes   integer,
    hourly_salary    numeric,
    estimated_amount numeric
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  -- Información del administrador autenticado.
  v_auth_user_id uuid;
  v_admin_company_id uuid;
  v_is_admin boolean;

  -- Información del colaborador solicitado.
  v_worker_company_id uuid;
  v_worker_is_admin boolean;
  v_hourly_salary numeric;

  -- Fecha oficial calculada en Ciudad de Mexico.
  v_now timestamptz;
  v_time_zone text := 'America/Mexico_City';
  v_work_date date;
begin
  -- Obtiene la identidad desde la sesión autenticada.
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Obtiene la empresa y el rol real del usuario autenticado.
  select
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_admin_company_id,
    v_is_admin
  from public.users
  where users.auth_user_id = v_auth_user_id;

  if not found then
    raise exception 'No se encontro el perfil del usuario';
  end if;

  if not v_is_admin then
    raise exception
      'Solo los administradores pueden consultar pagos pendientes';
  end if;

  if v_admin_company_id is null then
    raise exception
      'El administrador no tiene una empresa asignada';
  end if;

  -- Comprueba que se haya enviado un colaborador.
  if p_worker_id is null then
    raise exception 'El colaborador es obligatorio';
  end if;

  -- Obtiene la empresa, rol y sueldo actual del colaborador.
  select
    users.company,
    coalesce(users."isAdmin", false),
    users.salary
  into
    v_worker_company_id,
    v_worker_is_admin,
    v_hourly_salary
  from public.users
  where users.id = p_worker_id;

  if not found then
    raise exception 'No se encontro el colaborador';
  end if;

  -- Evita calcular pagos para administradores.
  if v_worker_is_admin then
    raise exception
      'No se pueden consultar pagos de administradores';
  end if;

  -- Impide consultar colaboradores de otras empresas.
  if v_worker_company_id is distinct from v_admin_company_id then
    raise exception
      'El colaborador no pertenece a tu empresa';
  end if;

  -- Comprueba que tenga un sueldo válido.
  if v_hourly_salary is null
    or v_hourly_salary::text in ('NaN', 'Infinity', '-Infinity')
    or v_hourly_salary <= 0 then
    raise exception
      'El colaborador no tiene un sueldo válido asignado';
  end if;

  -- Obtiene la fecha actual oficial.
  v_now := clock_timestamp();
  v_work_date := (v_now at time zone v_time_zone)::date;

  -- Devuelve únicamente jornadas completas, anteriores a hoy y no pagadas.
  return query
  select
    days.id as day_id,
    days.work_date,
    period_totals.worked_minutes,
    v_hourly_salary as hourly_salary,
    round(
      (
        period_totals.worked_minutes::numeric
        / 60
      ) * v_hourly_salary,
      2
    ) as estimated_amount
  from public.days
  cross join lateral (
    select
      coalesce(
        floor(
          (
            sum(
              extract(
                epoch from (
                  periods.ended_at
                  - periods.started_at
                )
              )
            ) filter (
              where periods.ended_at is not null
            )
          ) / 60
        ),
        0
      )::integer as worked_minutes,

      count(*) filter (
        where periods.ended_at is null
      ) as open_periods,

      count(*) filter (
        where periods.ended_at is not null
      ) as closed_periods
    from public.periods
    where periods.day_id = days.id
  ) as period_totals
  where days.user_id = p_worker_id
    and days.company_id = v_admin_company_id
    and days.is_paid = false
    and days.work_date < v_work_date
    and period_totals.open_periods = 0
    and period_totals.closed_periods > 0
    and period_totals.worked_minutes > 0
  order by days.work_date asc;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_worker_pending_payments(uuid) FROM PUBLIC;

GRANT ALL ON FUNCTION public.get_worker_pending_payments(uuid) TO authenticated;

CREATE FUNCTION public.register_company_admin (
  p_auth_user_id      uuid,
  p_company_name      text,
  p_company_direction text,
  p_company_phone     text,
  p_admin_name        text,
  p_admin_last_name   text,
  p_admin_email       text,
  p_admin_phone       text
)
  RETURNS TABLE (
    company_id   uuid,
    company_code text,
    user_auth_id uuid
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  v_company_id uuid;
  v_company_code text;
begin
  insert into public.companies (name, direction, phone)
  values (p_company_name, p_company_direction, p_company_phone)
  returning companies.id, companies.code
  into v_company_id, v_company_code;

  insert into public.users (
    auth_user_id,
    name,
    "lastName",
    email,
    phone,
    "isAdmin",
    salary,
    company
  )
  values (
    p_auth_user_id,
    p_admin_name,
    p_admin_last_name,
    p_admin_email,
    p_admin_phone,
    true,
    0,
    v_company_id
  );

  return query select v_company_id, v_company_code, p_auth_user_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.register_company_admin(uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_company_admin(uuid, text, text, text, text, text, text, text) TO service_role;

CREATE FUNCTION public.register_time()
  RETURNS TABLE (
    action         text,
    day_id         uuid,
    period_id      uuid,
    registered_at  timestamp with time zone,
    worked_minutes integer
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.register_time() FROM PUBLIC;

GRANT ALL ON FUNCTION public.register_time() TO authenticated;

CREATE FUNCTION public.register_worker_payment (
  p_worker_id uuid,
  p_day_ids   uuid[]
)
  RETURNS TABLE (
    payment_id    uuid,
    worker_id     uuid,
    paid_days     integer,
    total_minutes integer,
    salary        numeric,
    total_amount  numeric,
    paid_at       timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  -- Administrador autenticado.
  v_auth_user_id uuid;
  v_admin_profile_id uuid;
  v_admin_company_id uuid;
  v_is_admin boolean;

  -- Colaborador.
  v_worker_company_id uuid;
  v_worker_is_admin boolean;
  v_salary numeric;

  -- Pago.
  v_payment_id uuid;
  v_requested_days integer;
  v_locked_days integer;
  v_valid_days integer;
  v_total_minutes integer;
  v_total_amount numeric;
  v_inserted_days integer;
  v_updated_days integer;

  -- Fecha oficial.
  v_paid_at timestamptz;
  v_today date;
  v_time_zone text := 'America/Mexico_City';
begin
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Obtiene el perfil y la empresa del administrador.
  select
    users.id,
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_admin_profile_id,
    v_admin_company_id,
    v_is_admin
  from public.users
  where users.auth_user_id = v_auth_user_id;

  if not found then
    raise exception 'No se encontro el perfil del usuario';
  end if;

  if not v_is_admin then
    raise exception
      'Solo los administradores pueden registrar pagos';
  end if;

  if v_admin_company_id is null then
    raise exception
      'El administrador no tiene una empresa asignada';
  end if;

  if p_worker_id is null then
    raise exception 'El colaborador es obligatorio';
  end if;

  -- Valida la selección recibida.
  if p_day_ids is null
    or cardinality(p_day_ids) = 0 then
    raise exception
      'Selecciona al menos una jornada';
  end if;

  if exists (
    select 1
    from unnest(p_day_ids) as selected_day(day_id)
    where selected_day.day_id is null
  ) then
    raise exception
      'La seleccion contiene jornadas invalidas';
  end if;

  v_requested_days := cardinality(p_day_ids);

  -- Rechaza IDs repetidos.
  if v_requested_days <> (
    select count(distinct selected_day.day_id)::integer
    from unnest(p_day_ids) as selected_day(day_id)
  ) then
    raise exception
      'La seleccion contiene jornadas duplicadas';
  end if;

  -- Bloquea al trabajador para que su sueldo no cambie durante el pago.
  select
    users.company,
    coalesce(users."isAdmin", false),
    users.salary
  into
    v_worker_company_id,
    v_worker_is_admin,
    v_salary
  from public.users
  where users.id = p_worker_id
  for update;

  if not found then
    raise exception 'No se encontro el colaborador';
  end if;

  if v_worker_is_admin then
    raise exception
      'No se pueden registrar pagos para administradores';
  end if;

  if v_worker_company_id is distinct from v_admin_company_id then
    raise exception
      'El colaborador no pertenece a tu empresa';
  end if;

  if v_salary is null
    or v_salary::text in ('NaN', 'Infinity', '-Infinity')
    or v_salary <= 0 then
    raise exception
      'El colaborador no tiene un sueldo valido asignado';
  end if;

  -- Normaliza el sueldo que se guardará históricamente.
  v_salary := round(v_salary, 2);

  v_paid_at := clock_timestamp();
  v_today := (v_paid_at at time zone v_time_zone)::date;

  -- Bloquea las jornadas para impedir pagos concurrentes.
  perform days.id
  from public.days
  where days.id = any(p_day_ids)
  order by days.id
  for update;

  get diagnostics v_locked_days = row_count;

  if v_locked_days <> v_requested_days then
    raise exception
      'Una o mas jornadas no existen';
  end if;

  -- Recalcula y valida todas las jornadas seleccionadas.
  select
    count(*)::integer,
    coalesce(sum(valid_days.worked_minutes), 0)::integer,
    coalesce(sum(valid_days.amount), 0)
  into
    v_valid_days,
    v_total_minutes,
    v_total_amount
  from (
    select
      days.id,
      period_totals.worked_minutes,
      round(
        (
          period_totals.worked_minutes::numeric
          / 60
        ) * v_salary,
        2
      ) as amount
    from public.days
    cross join lateral (
      select
        coalesce(
          floor(
            (
              sum(
                extract(
                  epoch from (
                    periods.ended_at
                    - periods.started_at
                  )
                )
              ) filter (
                where periods.ended_at is not null
              )
            ) / 60
          ),
          0
        )::integer as worked_minutes,

        count(*) filter (
          where periods.ended_at is null
        ) as open_periods,

        count(*) filter (
          where periods.ended_at is not null
        ) as closed_periods
      from public.periods
      where periods.day_id = days.id
    ) as period_totals
    where days.id = any(p_day_ids)
      and days.user_id = p_worker_id
      and days.company_id = v_admin_company_id
      and days.is_paid = false
      and days.paid_at is null
      and days.work_date < v_today
      and period_totals.open_periods = 0
      and period_totals.closed_periods > 0
      and period_totals.worked_minutes > 0
      and not exists (
        select 1
        from public.payment_days
        where payment_days.day_id = days.id
      )
  ) as valid_days;

  if v_valid_days <> v_requested_days then
    raise exception
      'Una o mas jornadas ya no estan disponibles para pago';
  end if;

  if v_total_minutes <= 0
    or v_total_amount <= 0 then
    raise exception
      'No se pudo calcular un pago valido';
  end if;

  -- Crea el resumen del pago.
  insert into public.payments (
    company_id,
    worker_id,
    created_by,
    salary,
    total_minutes,
    total_amount,
    paid_at
  )
  values (
    v_admin_company_id,
    p_worker_id,
    v_admin_profile_id,
    v_salary,
    v_total_minutes,
    v_total_amount,
    v_paid_at
  )
  returning payments.id
  into v_payment_id;

  -- Guarda la copia histórica de cada jornada.
  insert into public.payment_days (
    payment_id,
    day_id,
    work_date,
    worked_minutes,
    salary,
    amount
  )
  select
    v_payment_id,
    days.id,
    days.work_date,
    period_totals.worked_minutes,
    v_salary,
    round(
      (
        period_totals.worked_minutes::numeric
        / 60
      ) * v_salary,
      2
    )
  from public.days
  cross join lateral (
    select
      coalesce(
        floor(
          (
            sum(
              extract(
                epoch from (
                  periods.ended_at
                  - periods.started_at
                )
              )
            ) filter (
              where periods.ended_at is not null
            )
          ) / 60
        ),
        0
      )::integer as worked_minutes
    from public.periods
    where periods.day_id = days.id
  ) as period_totals
  where days.id = any(p_day_ids)
  order by days.work_date;

  get diagnostics v_inserted_days = row_count;

  if v_inserted_days <> v_requested_days then
    raise exception
      'No se pudieron registrar todas las jornadas del pago';
  end if;

  -- Marca las jornadas como pagadas.
  update public.days
  set
    is_paid = true,
    paid_at = v_paid_at
  where days.id = any(p_day_ids)
    and days.user_id = p_worker_id
    and days.company_id = v_admin_company_id
    and days.is_paid = false;

  get diagnostics v_updated_days = row_count;

  if v_updated_days <> v_requested_days then
    raise exception
      'No se pudieron marcar todas las jornadas como pagadas';
  end if;

  -- Devuelve el pago registrado.
  return query
  select
    v_payment_id,
    p_worker_id,
    v_requested_days,
    v_total_minutes,
    v_salary,
    v_total_amount,
    v_paid_at;
end;
$function$;

REVOKE ALL ON FUNCTION public.register_worker_payment(uuid, uuid[]) FROM PUBLIC;

GRANT ALL ON FUNCTION public.register_worker_payment(uuid, uuid[]) TO authenticated;

CREATE FUNCTION public.update_profile (
  p_name              text,
  p_last_name         text,
  p_phone             text,
  p_company_name      text DEFAULT NULL::text,
  p_company_direction text DEFAULT NULL::text,
  p_company_phone     text DEFAULT NULL::text
)
  RETURNS TABLE (
    profile_id uuid,
    company_id uuid,
    is_admin   boolean
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  -- Identidad obtenida desde la sesion autenticada.
  v_auth_user_id uuid;
  v_profile_id uuid;
  v_company_id uuid;
  v_is_admin boolean;

  -- Datos personales normalizados.
  v_name text;
  v_last_name text;
  v_phone text;

  -- Datos empresariales normalizados.
  v_company_name text;
  v_company_direction text;
  v_company_phone text;
begin
  -- Obtiene el usuario desde el token autenticado.
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Obtiene y bloquea el perfil real del usuario.
  select
    users.id,
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_profile_id,
    v_company_id,
    v_is_admin
  from public.users
  where users.auth_user_id = v_auth_user_id
  for update;

  if not found then
    raise exception 'No se encontro el perfil del usuario';
  end if;

  if v_company_id is null then
    raise exception 'El usuario no tiene una empresa asignada';
  end if;

  -- Elimina espacios innecesarios y normaliza telefonos.
  v_name := btrim(coalesce(p_name, ''));
  v_last_name := btrim(coalesce(p_last_name, ''));

  v_phone := regexp_replace(
    coalesce(p_phone, ''),
    '[^0-9]',
    '',
    'g'
  );

  v_company_name := btrim(
    coalesce(p_company_name, '')
  );

  v_company_direction := btrim(
    coalesce(p_company_direction, '')
  );

  v_company_phone := regexp_replace(
    coalesce(p_company_phone, ''),
    '[^0-9]',
    '',
    'g'
  );

  -- Valida los datos personales.
  if char_length(v_name) < 2 then
    raise exception
      'El nombre debe tener al menos 2 caracteres';
  end if;

  if char_length(v_last_name) < 2 then
    raise exception
      'El apellido debe tener al menos 2 caracteres';
  end if;

  if char_length(v_phone) <> 10 then
    raise exception
      'El telefono debe tener 10 digitos';
  end if;

  -- Actualiza solamente los campos personales permitidos.
  update public.users
  set
    name = v_name,
    "lastName" = v_last_name,
    phone = v_phone
  where id = v_profile_id;

  if not found then
    raise exception
      'No se pudo actualizar el perfil del usuario';
  end if;

  -- Solamente un administrador puede modificar la empresa.
  if v_is_admin then
    if char_length(v_company_name) < 2 then
      raise exception
        'El nombre de la empresa debe tener al menos 2 caracteres';
    end if;

    if char_length(v_company_direction) < 5 then
      raise exception
        'La direccion debe tener al menos 5 caracteres';
    end if;

    if char_length(v_company_phone) <> 10 then
      raise exception
        'El telefono de la empresa debe tener 10 digitos';
    end if;

    -- Actualiza la empresa vinculada al administrador.
    update public.companies
    set
      name = v_company_name,
      direction = v_company_direction,
      phone = v_company_phone
    where id = v_company_id;

    if not found then
      raise exception
        'No se encontro la empresa del administrador';
    end if;
  end if;

  -- Devuelve los identificadores obtenidos en el servidor.
  return query
  select
    v_profile_id,
    v_company_id,
    v_is_admin;
end;
$function$;

REVOKE ALL ON FUNCTION public.update_profile(text, text, text, text, text, text) FROM PUBLIC;

GRANT ALL ON FUNCTION public.update_profile(text, text, text, text, text, text) TO authenticated;

CREATE FUNCTION public.update_worker_salary (
  p_worker_id uuid,
  p_salary    numeric
)
  RETURNS TABLE (
    worker_id uuid,
    salary    numeric
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
declare
  -- Datos del administrador autenticado.
  v_auth_user_id uuid;
  v_admin_company_id uuid;
  v_is_admin boolean;

  -- Datos del colaborador que se actualizará.
  v_worker_company_id uuid;
  v_worker_is_admin boolean;

  -- Sueldo normalizado a dos decimales.
  v_salary numeric;
begin
  -- Obtiene la identidad desde la sesión autenticada.
  v_auth_user_id := auth.uid();

  if v_auth_user_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  -- Obtiene la empresa y el rol real del usuario autenticado.
  select
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_admin_company_id,
    v_is_admin
  from public.users
  where users.auth_user_id = v_auth_user_id;

  if not found then
    raise exception 'No se encontro el perfil del usuario';
  end if;

  if not v_is_admin then
    raise exception
      'Solo los administradores pueden actualizar sueldos';
  end if;

  if v_admin_company_id is null then
    raise exception
      'El administrador no tiene una empresa asignada';
  end if;

  -- Valida el identificador recibido.
  if p_worker_id is null then
    raise exception 'El colaborador es obligatorio';
  end if;

  -- Rechaza valores nulos, no numéricos, infinitos o menores o iguales a cero.
  if p_salary is null
    or p_salary::text in ('NaN', 'Infinity', '-Infinity')
    or p_salary <= 0 then
    raise exception
      'El sueldo debe ser un numero mayor a 0';
  end if;

  -- Redondea el sueldo a dos decimales.
  v_salary := round(p_salary, 2);

  -- Obtiene y bloquea al colaborador durante la actualización.
  select
    users.company,
    coalesce(users."isAdmin", false)
  into
    v_worker_company_id,
    v_worker_is_admin
  from public.users
  where users.id = p_worker_id
  for update;

  if not found then
    raise exception 'No se encontro el colaborador';
  end if;

  -- Evita modificar administradores mediante esta función.
  if v_worker_is_admin then
    raise exception
      'No se puede actualizar el sueldo de un administrador';
  end if;

  -- Evita modificar trabajadores de otras empresas.
  if v_worker_company_id is distinct from v_admin_company_id then
    raise exception
      'El colaborador no pertenece a tu empresa';
  end if;

  -- Actualiza exclusivamente la columna salary.
  update public.users
  set salary = v_salary
  where users.id = p_worker_id;

  if not found then
    raise exception
      'No se pudo actualizar el sueldo del colaborador';
  end if;

  -- Devuelve el colaborador y su nuevo sueldo.
  return query
  select
    p_worker_id,
    v_salary;
end;
$function$;

REVOKE ALL ON FUNCTION public.update_worker_salary(uuid, numeric) FROM PUBLIC;

GRANT ALL ON FUNCTION public.update_worker_salary(uuid, numeric) TO authenticated;

CREATE TABLE public.companies (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  name       text                     DEFAULT ''::text NOT NULL,
  direction  text                     DEFAULT ''::text NOT NULL,
  phone      text                     DEFAULT ''::text NOT NULL,
  code       text                     DEFAULT ('DR-'::text || lpad((nextval('public.company_code_seq'::regclass))::text, 6, '0'::text)) NOT NULL
);

ALTER TABLE public.companies
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_code_key UNIQUE (code);

ALTER TABLE public.companies
  ADD CONSTRAINT companies_pkey PRIMARY KEY (id);

REVOKE ALL ON public.companies FROM anon, authenticated;

GRANT SELECT ON public.companies TO authenticated;

GRANT ALL ON public.companies TO service_role;

CREATE TABLE public.days (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  user_id    uuid                     NOT NULL,
  company_id uuid                     NOT NULL,
  work_date  date                     NOT NULL,
  is_paid    boolean                  DEFAULT false NOT NULL,
  paid_at    timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.days
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.days
  ADD CONSTRAINT days_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;

ALTER TABLE public.days
  ADD CONSTRAINT days_payment_status_check CHECK (is_paid = false AND paid_at IS NULL OR is_paid = true AND paid_at IS NOT NULL);

ALTER TABLE public.days
  ADD CONSTRAINT days_pkey PRIMARY KEY (id);

ALTER TABLE public.days
  ADD CONSTRAINT days_user_work_date_key UNIQUE (user_id, work_date);

GRANT SELECT ON public.days TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.days TO service_role;

CREATE INDEX days_company_work_date_idx ON public.days (company_id, work_date);

CREATE TABLE public.payment_days (
  payment_id     uuid    NOT NULL,
  day_id         uuid    NOT NULL,
  work_date      date    NOT NULL,
  worked_minutes integer NOT NULL,
  salary         numeric NOT NULL,
  amount         numeric NOT NULL
);

ALTER TABLE public.payment_days
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payment_days
  ADD CONSTRAINT payment_days_amount_check CHECK ((amount::text <> ALL (ARRAY['NaN'::text, 'Infinity'::text, '-Infinity'::text])) AND amount > 0::numeric);

ALTER TABLE public.payment_days
  ADD CONSTRAINT payment_days_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.days(id) ON DELETE RESTRICT;

ALTER TABLE public.payment_days
  ADD CONSTRAINT payment_days_day_id_key UNIQUE (day_id);

ALTER TABLE public.payment_days
  ADD CONSTRAINT payment_days_pkey PRIMARY KEY (payment_id, day_id);

ALTER TABLE public.payment_days
  ADD CONSTRAINT payment_days_salary_check CHECK ((salary::text <> ALL (ARRAY['NaN'::text, 'Infinity'::text, '-Infinity'::text])) AND salary > 0::numeric);

ALTER TABLE public.payment_days
  ADD CONSTRAINT payment_days_worked_minutes_check CHECK (worked_minutes > 0);

GRANT SELECT ON public.payment_days TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.payment_days TO service_role;

CREATE TABLE public.payments (
  id            uuid                     DEFAULT gen_random_uuid() NOT NULL,
  company_id    uuid                     NOT NULL,
  worker_id     uuid                     NOT NULL,
  created_by    uuid                     NOT NULL,
  salary        numeric                  NOT NULL,
  total_minutes integer                  NOT NULL,
  total_amount  numeric                  NOT NULL,
  paid_at       timestamp with time zone DEFAULT now() NOT NULL
);

CREATE POLICY "Users can read accessible payment days" ON public.payment_days
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.payments
  WHERE (payments.id = payment_days.payment_id))));

ALTER TABLE public.payments
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE RESTRICT;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_pkey PRIMARY KEY (id);

ALTER TABLE public.payment_days
  ADD CONSTRAINT payment_days_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE RESTRICT;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_salary_check CHECK ((salary::text <> ALL (ARRAY['NaN'::text, 'Infinity'::text, '-Infinity'::text])) AND salary > 0::numeric);

ALTER TABLE public.payments
  ADD CONSTRAINT payments_total_amount_check CHECK ((total_amount::text <> ALL (ARRAY['NaN'::text, 'Infinity'::text, '-Infinity'::text])) AND total_amount > 0::numeric);

ALTER TABLE public.payments
  ADD CONSTRAINT payments_total_minutes_check CHECK (total_minutes > 0);

GRANT SELECT ON public.payments TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.payments TO service_role;

CREATE INDEX payments_created_by_idx ON public.payments (created_by);

CREATE INDEX payments_worker_paid_at_idx ON public.payments (worker_id, paid_at DESC);

CREATE INDEX payments_company_paid_at_idx ON public.payments (company_id, paid_at DESC);

CREATE TABLE public.periods (
  id         uuid                     DEFAULT gen_random_uuid() NOT NULL,
  day_id     uuid                     NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  ended_at   timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.periods
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.periods
  ADD CONSTRAINT periods_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.days(id) ON DELETE CASCADE;

ALTER TABLE public.periods
  ADD CONSTRAINT periods_no_overlap EXCLUDE USING gist (day_id WITH =, tstzrange(started_at, COALESCE(ended_at, 'infinity'::timestamp WITH time zone), '[)'::text) WITH &&);

ALTER TABLE public.periods
  ADD CONSTRAINT periods_pkey PRIMARY KEY (id);

ALTER TABLE public.periods
  ADD CONSTRAINT periods_valid_time_check CHECK (ended_at IS NULL OR ended_at > started_at);

GRANT SELECT ON public.periods TO authenticated;

GRANT MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.periods TO service_role;

CREATE INDEX periods_day_id_idx ON public.periods (day_id);

CREATE UNIQUE INDEX periods_one_open_per_day_key ON public.periods (day_id)
  WHERE ended_at IS NULL;

CREATE POLICY "Users can read accessible periods" ON public.periods
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.days
  WHERE (days.id = periods.day_id))));

CREATE TABLE public.users (
  id           uuid                     DEFAULT gen_random_uuid() NOT NULL,
  created_at   timestamp with time zone DEFAULT now() NOT NULL,
  name         text,
  "lastName"   text,
  email        text,
  phone        text,
  "isAdmin"    boolean,
  salary       numeric                  DEFAULT '0'::numeric,
  company      uuid,
  auth_user_id uuid
);

CREATE POLICY "Users can read own company" ON public.companies
  FOR SELECT
  TO authenticated
  USING ((id IN ( SELECT users.company
   FROM public.users
  WHERE (users.auth_user_id = auth.uid()))));

CREATE POLICY "Users can read accessible days" ON public.days
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.users current_user_profile
  WHERE
    ((current_user_profile.auth_user_id = auth.uid()) AND ((days.user_id = current_user_profile.id) OR ((current_user_profile."isAdmin" = true) AND (days.company_id =
    current_user_profile.company)))))));

CREATE POLICY "Users can read accessible payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM public.users current_user_profile
  WHERE
    ((current_user_profile.auth_user_id = auth.uid()) AND ((payments.worker_id = current_user_profile.id) OR ((COALESCE(current_user_profile."isAdmin", false) = true) AND
    (payments.company_id = current_user_profile.company)))))));

ALTER TABLE public.users
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD CONSTRAINT users_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.users
  ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE public.users
  ADD CONSTRAINT users_company_fkey FOREIGN KEY (company) REFERENCES public.companies(id);

ALTER TABLE public.users
  ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE public.users
  ADD CONSTRAINT users_phone_key UNIQUE (phone);

ALTER TABLE public.users
  ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE public.days
  ADD CONSTRAINT days_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.users(id) ON DELETE RESTRICT;

REVOKE ALL ON public.users FROM anon, authenticated;

GRANT SELECT ON public.users TO authenticated;

GRANT INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE ON public.users TO service_role;

CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT
  TO authenticated
  USING ((auth.uid() = auth_user_id));
