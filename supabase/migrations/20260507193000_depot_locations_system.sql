-- Emplacements d'entrepot (tenant scope)

create table if not exists public.depot_locations (
  id uuid primary key default gen_random_uuid(),
  company_id integer not null references public.companies(id) on delete cascade,
  depot_site_id uuid not null references public.sites_logistiques(id) on delete cascade,
  code text not null,
  libelle text null,
  zone text null,
  allee text null,
  rayon text null,
  niveau text null,
  position text null,
  type_emplacement text not null default 'stockage'
    check (type_emplacement in ('stockage', 'quai_chargement', 'quai_dechargement', 'cross_dock', 'tampon', 'autre')),
  capacite_m3 numeric(10,2) null,
  actif boolean not null default true,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint depot_locations_code_not_blank check (length(btrim(code)) > 0)
);

create unique index if not exists depot_locations_company_site_code_uidx
  on public.depot_locations(company_id, depot_site_id, lower(code));

create index if not exists depot_locations_company_site_idx
  on public.depot_locations(company_id, depot_site_id, actif, created_at desc);

alter table public.depot_locations enable row level security;

drop policy if exists "depot_locations_read" on public.depot_locations;
create policy "depot_locations_read"
  on public.depot_locations
  for select to authenticated
  using (
    company_id = public.get_user_company_id()
    and public.get_user_role() in (
      'admin','dirigeant','exploitant','logisticien','rh','flotte','maintenance','mecanicien','conducteur'
    )
  );

drop policy if exists "depot_locations_write" on public.depot_locations;
create policy "depot_locations_write"
  on public.depot_locations
  for all to authenticated
  using (
    company_id = public.get_user_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','flotte')
  )
  with check (
    company_id = public.get_user_company_id()
    and public.get_user_role() in ('admin','dirigeant','exploitant','logisticien','flotte')
  );

do $$
begin
  perform public.add_updated_at_trigger('public.depot_locations');
exception when others then null;
end $$;
