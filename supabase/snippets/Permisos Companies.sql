grant usage on schema public to service_role;

grant insert, select, update, delete
on table public.companies
to service_role;

grant usage, select
on sequence public.company_code_seq
to service_role;

grant usage on schema public to authenticated;
grant select on table public.companies to authenticated;

alter table public.companies enable row level security;

drop policy if exists "Users can read own company"
on public.companies;

create policy "Users can read own company"
on public.companies
for select
to authenticated
using (
  id in (
    select company
    from public.users
    where auth_user_id = auth.uid()
  )
);