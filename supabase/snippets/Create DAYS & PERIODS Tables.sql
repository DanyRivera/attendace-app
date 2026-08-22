create extension if not exists btree_gist
with
  schema extensions;

create table public.days (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references public.users (id) on delete restrict,
  company_id uuid not null references public.companies (id) on delete restrict,
  work_date date not null,
  is_paid boolean not null default false,
  paid_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint days_user_work_date_key unique (user_id, work_date),
  constraint days_payment_status_check check (
    (
      is_paid = false
      and paid_at is null
    )
    or (
      is_paid = true
      and paid_at is not null
    )
  )
);

create table public.periods (
  id uuid primary key default gen_random_uuid (),
  day_id uuid not null references public.days (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint periods_valid_time_check check (
    ended_at is null
    or ended_at > started_at
  ),
  constraint periods_no_overlap exclude using gist (
    day_id
    with
      =,
      tstzrange (
        started_at,
        coalesce(ended_at, 'infinity'::timestamptz),
        '[)'
      )
    with
      &&
  )
);

/*INDICES*/
create unique index periods_one_open_per_day_key on public.periods (day_id)
where
  ended_at is null;

create index days_company_work_date_idx on public.days (company_id, work_date);

create index if not exists periods_day_id_idx on public.periods (day_id);

/*RLS*/
alter table public.days enable row level security;

alter table public.periods enable row level security;

/*Quitamos acceso directo y después damos únicamente lectura:*/
revoke all on table public.days
from
  anon,
  authenticated;

revoke all on table public.periods
from
  anon,
  authenticated;

grant
select
  on table public.days to authenticated;

grant
select
  on table public.periods to authenticated;

/*Policy De Days*/
/*El worker puede leer sus días. El admin puede leer los días de su empresa.*/
drop policy if exists "Users can read accessible days" on public.days;

create policy "Users can read accessible days" on public.days for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.users as current_user_profile
      where
        current_user_profile.auth_user_id = auth.uid ()
        and (
          days.user_id = current_user_profile.id
          or (
            current_user_profile."isAdmin" = true
            and days.company_id = current_user_profile.company
          )
        )
    )
  );

/*Policy De Periods*/
/*Permite leer periodos cuando el usuario tiene acceso al día correspondiente.*/
drop policy if exists "Users can read accessible periods" on public.periods;

create policy "Users can read accessible periods" on public.periods for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.days
      where
        days.id = periods.day_id
    )
  );



alter table public.periods enable row level security;

grant
select
  on table public.periods to authenticated;

drop policy if exists "Users can read accessible periods" on public.periods;

create policy "Users can read accessible periods" on public.periods for
select
  to authenticated using (
    exists (
      select
        1
      from
        public.days
      where
        days.id = periods.day_id
    )
  );