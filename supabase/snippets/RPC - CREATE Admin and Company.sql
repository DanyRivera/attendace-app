create or replace function public.register_company_admin(
  p_auth_user_id uuid,
  p_company_name text,
  p_company_direction text,
  p_company_phone text,
  p_admin_name text,
  p_admin_last_name text,
  p_admin_email text,
  p_admin_phone text
)
returns table (
  company_id uuid,
  company_code text,
  user_auth_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_company_code text;
begin
  insert into public.companies (name, direction, phone)
  values (p_company_name, p_company_direction, p_company_phone)
  returning id, code into v_company_id, v_company_code;

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
$$;

grant execute on function public.register_company_admin(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to service_role;