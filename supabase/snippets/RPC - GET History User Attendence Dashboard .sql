-- Devuelve el historial completo de un colaborador de la empresa del administrador autenticado. Comprueba sesión, rol, empresa y pertenencia antes de consultar días y periodos.

begin;

drop function if exists public.get_company_worker_history(uuid);

create function public.get_company_worker_history(
  p_worker_id uuid
)
returns table (
  id uuid,
  work_date date,
  is_paid boolean,
  paid_at timestamptz,
  periods jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Elimina permisos heredados o previamente asignados.
revoke all
on function public.get_company_worker_history(uuid)
from public, anon, authenticated;

-- Solamente usuarios autenticados pueden intentar ejecutarla.
grant execute
on function public.get_company_worker_history(uuid)
to authenticated;

commit;

-- Actualiza la caché de funciones de PostgREST.
notify pgrst, 'reload schema';