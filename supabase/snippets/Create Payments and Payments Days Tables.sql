begin;

-- Resumen general de cada pago registrado.
create table public.payments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies (id)
    on delete restrict,

  worker_id uuid not null
    references public.users (id)
    on delete restrict,

  -- Usuario administrador que registró el pago.
  created_by uuid not null
    references public.users (id)
    on delete restrict,

  -- Copia histórica del sueldo usado para calcular el pago.
  salary numeric not null,

  total_minutes integer not null,
  total_amount numeric not null,

  paid_at timestamptz not null default now(),

  constraint payments_salary_check check (
    salary::text not in ('NaN', 'Infinity', '-Infinity')
    and salary > 0
  ),

  constraint payments_total_minutes_check check (
    total_minutes > 0
  ),

  constraint payments_total_amount_check check (
    total_amount::text not in ('NaN', 'Infinity', '-Infinity')
    and total_amount > 0
  )
);

-- Copia histórica de cada jornada incluida en un pago.
create table public.payment_days (
  payment_id uuid not null
    references public.payments (id)
    on delete restrict,

  day_id uuid not null
    references public.days (id)
    on delete restrict,

  work_date date not null,
  worked_minutes integer not null,

  -- Copia histórica del sueldo usado para esta jornada.
  salary numeric not null,

  amount numeric not null,

  constraint payment_days_pkey primary key (
    payment_id,
    day_id
  ),

  -- Impide registrar una jornada en más de un pago.
  constraint payment_days_day_id_key unique (
    day_id
  ),

  constraint payment_days_worked_minutes_check check (
    worked_minutes > 0
  ),

  constraint payment_days_salary_check check (
    salary::text not in ('NaN', 'Infinity', '-Infinity')
    and salary > 0
  ),

  constraint payment_days_amount_check check (
    amount::text not in ('NaN', 'Infinity', '-Infinity')
    and amount > 0
  )
);

-- Índices para historial y consultas administrativas.
create index payments_company_paid_at_idx
  on public.payments (
    company_id,
    paid_at desc
  );

create index payments_worker_paid_at_idx
  on public.payments (
    worker_id,
    paid_at desc
  );

create index payments_created_by_idx
  on public.payments (
    created_by
  );

-- Activa Row Level Security.
alter table public.payments enable row level security;
alter table public.payment_days enable row level security;

-- Evita escrituras directas desde el cliente.
revoke all
  on table public.payments
  from public, anon, authenticated;

revoke all
  on table public.payment_days
  from public, anon, authenticated;

-- Los usuarios autenticados solo podrán consultar registros permitidos.
grant select
  on table public.payments
  to authenticated;

grant select
  on table public.payment_days
  to authenticated;

-- Un trabajador puede consultar sus pagos.
-- Un administrador puede consultar los pagos de su empresa.
create policy "Users can read accessible payments"
on public.payments
for select
to authenticated
using (
  exists (
    select 1
    from public.users as current_user_profile
    where current_user_profile.auth_user_id = auth.uid()
      and (
        payments.worker_id = current_user_profile.id
        or (
          coalesce(current_user_profile."isAdmin", false) = true
          and payments.company_id = current_user_profile.company
        )
      )
  )
);

-- Permite consultar los detalles cuando el pago principal es accesible.
create policy "Users can read accessible payment days"
on public.payment_days
for select
to authenticated
using (
  exists (
    select 1
    from public.payments
    where payments.id = payment_days.payment_id
  )
);

commit;

notify pgrst, 'reload schema';