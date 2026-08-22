-- Actualiza el sueldo por hora de un colaborador. Verifica que el usuario autenticado sea administrador y que el colaborador pertenezca a su misma empresa.

begin;

drop function if exists public.update_worker_salary(
  uuid,
  numeric
);

create function public.update_worker_salary(
  p_worker_id uuid,
  p_salary numeric
)
returns table (
  worker_id uuid,
  salary numeric
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Elimina permisos de ejecución heredados.
revoke all
on function public.update_worker_salary(
  uuid,
  numeric
)
from public, anon, authenticated;

-- Permite ejecutar la RPC únicamente a usuarios autenticados.
grant execute
on function public.update_worker_salary(
  uuid,
  numeric
)
to authenticated;

commit;

-- Actualiza la caché de funciones de PostgREST.
notify pgrst, 'reload schema';