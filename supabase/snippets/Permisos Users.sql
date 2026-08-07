grant usage on schema public to service_role;

grant insert
on table public.users
to service_role;

/*Un usuario autenticado pueda leer solo su propio perfil*/
create policy "Users can read own profile"
on public.users
for select
to authenticated
using (auth.uid() = auth_user_id);

grant select on table public.users to authenticated;

