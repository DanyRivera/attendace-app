begin;

drop function if exists public.register_worker_payment(
  uuid,
  uuid[]
);

create function public.register_worker_payment(
  p_worker_id uuid,
  p_day_ids uuid[]
)
returns table (
  payment_id uuid,
  worker_id uuid,
  paid_days integer,
  total_minutes integer,
  salary numeric,
  total_amount numeric,
  paid_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all
on function public.register_worker_payment(
  uuid,
  uuid[]
)
from public, anon, authenticated;

grant execute
on function public.register_worker_payment(
  uuid,
  uuid[]
)
to authenticated;

commit;

notify pgrst, 'reload schema';