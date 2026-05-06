-- Affectations depot pour les assets de flotte (vehicules / remorques)

create table if not exists public.asset_depot_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  depot_site_id uuid not null references public.sites_logistiques(id) on delete restrict,
  vehicule_id uuid null references public.vehicules(id) on delete cascade,
  remorque_id uuid null references public.remorques(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz null,
  assignment_source text not null default 'manual_transfer'
    check (assignment_source in ('auto_primary', 'manual_transfer', 'manual_create', 'sync')),
  notes text null,
  assigned_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_depot_assignments_target_chk
    check (((vehicule_id is not null)::int + (remorque_id is not null)::int) = 1)
);

create unique index if not exists asset_depot_assignments_active_vehicule_uidx
  on public.asset_depot_assignments(vehicule_id)
  where vehicule_id is not null and ended_at is null;

create unique index if not exists asset_depot_assignments_active_remorque_uidx
  on public.asset_depot_assignments(remorque_id)
  where remorque_id is not null and ended_at is null;

create index if not exists asset_depot_assignments_company_idx
  on public.asset_depot_assignments(company_id, assigned_at desc);

create index if not exists asset_depot_assignments_site_idx
  on public.asset_depot_assignments(depot_site_id, ended_at);

alter table public.asset_depot_assignments enable row level security;

drop policy if exists asset_depot_assignments_read on public.asset_depot_assignments;
create policy asset_depot_assignments_read
  on public.asset_depot_assignments
  for select to authenticated
  using (
    company_id = public.get_user_company_id()
    and public.get_user_role() in (
      'admin','dirigeant','exploitant','logisticien','flotte','maintenance','mecanicien','conducteur'
    )
  );

drop policy if exists asset_depot_assignments_write on public.asset_depot_assignments;
create policy asset_depot_assignments_write
  on public.asset_depot_assignments
  for all to authenticated
  using (
    company_id = public.get_user_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','flotte')
  )
  with check (
    company_id = public.get_user_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','flotte')
  );

insert into public.asset_depot_assignments (
  company_id,
  depot_site_id,
  vehicule_id,
  assignment_source,
  notes
)
select
  v.company_id,
  s.id,
  v.id,
  'auto_primary',
  'Backfill initial depot principal'
from public.vehicules v
join public.sites_logistiques s on s.company_id = v.company_id and s.is_primary = true
where not exists (
  select 1
  from public.asset_depot_assignments a
  where a.vehicule_id = v.id and a.ended_at is null
);

insert into public.asset_depot_assignments (
  company_id,
  depot_site_id,
  remorque_id,
  assignment_source,
  notes
)
select
  r.company_id,
  s.id,
  r.id,
  'auto_primary',
  'Backfill initial depot principal'
from public.remorques r
join public.sites_logistiques s on s.company_id = r.company_id and s.is_primary = true
where not exists (
  select 1
  from public.asset_depot_assignments a
  where a.remorque_id = r.id and a.ended_at is null
);
