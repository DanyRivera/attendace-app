delete from auth.users;

truncate table public.users, public.companies
restart identity
cascade;

alter sequence public.company_code_seq restart with 1000;