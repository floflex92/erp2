-- Depot principal tenant + affectations depot pour conducteurs et employes

alter table public.sites_logistiques
  add column if not exists is_primary boolean not null default false;

create unique index if not exists sites_logistiques_one_primary_per_company_uidx
  on public.sites_logistiques(company_id)
  where is_primary = true;

create table if not exists public.staff_depot_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  depot_site_id uuid not null references public.sites_logistiques(id) on delete restrict,
  conducteur_id uuid null references public.conducteurs(id) on delete cascade,
  profil_id uuid null references public.profils(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz null,
  assignment_source text not null default 'manual_transfer'
    check (assignment_source in ('auto_primary', 'manual_transfer', 'manual_create', 'sync')),
  notes text null,
  assigned_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_depot_assignments_target_chk
    check (((conducteur_id is not null)::int + (profil_id is not null)::int) = 1)
);

create unique index if not exists staff_depot_assignments_active_conducteur_uidx
  on public.staff_depot_assignments(conducteur_id)
  where conducteur_id is not null and ended_at is null;

create unique index if not exists staff_depot_assignments_active_profil_uidx
  on public.staff_depot_assignments(profil_id)
  where profil_id is not null and ended_at is null;

create index if not exists staff_depot_assignments_company_idx
  on public.staff_depot_assignments(company_id, assigned_at desc);

create index if not exists staff_depot_assignments_site_idx
  on public.staff_depot_assignments(depot_site_id, ended_at);

alter table public.staff_depot_assignments enable row level security;

drop policy if exists "staff_depot_assignments_read" on public.staff_depot_assignments;
create policy "staff_depot_assignments_read"
  on public.staff_depot_assignments
  for select to authenticated
  using (
    company_id = public.get_user_company_id()
    and public.get_user_role() in (
      'admin','dirigeant','exploitant','logisticien','rh','flotte','maintenance','mecanicien','conducteur'
    )
  );

drop policy if exists "staff_depot_assignments_write" on public.staff_depot_assignments;
create policy "staff_depot_assignments_write"
  on public.staff_depot_assignments
  for all to authenticated
  using (
    company_id = public.get_user_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','rh','flotte')
  )
  with check (
    company_id = public.get_user_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','rh','flotte')
  );

do $$
declare
  site_row record;
begin
  for site_row in
    select distinct on (company_id) id, company_id
    from public.sites_logistiques
    where type_site in ('depot', 'entrepot')
    order by company_id, is_primary desc, created_at asc, nom asc
  loop
    update public.sites_logistiques
    set is_primary = true
    where id = site_row.id
      and not exists (
        select 1
        from public.sites_logistiques existing
        where existing.company_id = site_row.company_id
          and existing.is_primary = true
      );
  end loop;
end $$;

do $$
begin
  perform public.add_updated_at_trigger('public.staff_depot_assignments');
exception when others then null;
end $$;