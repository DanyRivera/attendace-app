-- Devuelve las jornadas cerradas y no pagadas de un colaborador, junto con sus minutos trabajados y el importe estimado usando su sueldo actual por hora. Excluye siempre el día actual.

begin;

drop function if exists public.get_worker_pending_payments(uuid);

create function public.get_worker_pending_payments(
  p_worker_id uuid
)
returns table (
  day_id uuid,
  work_date date,
  worked_minutes integer,
  hourly_salary numeric,
  estimated_amount numeric
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Elimina permisos heredados o previamente asignados.
revoke all
on function public.get_worker_pending_payments(uuid)
from public, anon, authenticated;

-- Solo usuarios autenticados pueden ejecutar la RPC.
grant execute
on function public.get_worker_pending_payments(uuid)
to authenticated;

commit;

-- Actualiza la caché de funciones de PostgREST.
notify pgrst, 'reload schema';