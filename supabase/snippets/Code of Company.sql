create sequence if not exists public.company_code_seq
start with 1000
increment by 1;

alter table public.companies
alter column code set default (
  'DR-' || lpad(nextval('public.company_code_seq')::text, 6, '0')
);

alter table public.companies
add constraint companies_code_key unique (code);

alter table public.companies
alter column code set not null;