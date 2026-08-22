-- Devuelve los colaboradores no administradores que pertenecen a la misma empresa del administrador autenticado.
begin;

drop function if exists public.get_company_workers ();

create function public.get_company_workers () returns table (
  id uuid,
  name text,
  last_name text,
  email text,
  phone text,
  salary numeric
) language plpgsql security definer
set
  search_path = '' as $$
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
$$;

revoke all on function public.get_company_workers ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.get_company_workers () to authenticated;

commit;

notify pgrst,
'reload schema';