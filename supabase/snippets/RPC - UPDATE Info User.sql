-- Actualiza en una sola transaccion los datos personales del usuario autenticado y, si es administrador, tambien actualiza su empresa. No modifica correo, rol, IDs ni codigo empresarial.

begin;

drop function if exists public.update_profile(
  text,
  text,
  text,
  text,
  text,
  text
);

create function public.update_profile(
  p_name text,
  p_last_name text,
  p_phone text,
  p_company_name text default null,
  p_company_direction text default null,
  p_company_phone text default null
)
returns table (
  profile_id uuid,
  company_id uuid,
  is_admin boolean
)
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Elimina permisos de ejecucion heredados.
revoke all
on function public.update_profile(
  text,
  text,
  text,
  text,
  text,
  text
)
from public, anon, authenticated;

-- Solamente usuarios autenticados pueden ejecutar la RPC.
grant execute
on function public.update_profile(
  text,
  text,
  text,
  text,
  text,
  text
)
to authenticated;

commit;

-- Solicita a PostgREST que actualice su cache de funciones.
notify pgrst, 'reload schema';