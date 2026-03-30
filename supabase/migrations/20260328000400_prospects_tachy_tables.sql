create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  nom_entreprise text not null,
  statut text not null default 'lead',
  montant_mensuel_estime numeric(12,2) null,
  commercial_nom text null,
  secteur text null,
  type_transport text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prospects_statut_check'
  ) then
    alter table public.prospects
      add constraint prospects_statut_check
      check (statut in ('lead', 'qualification', 'devis_envoye', 'negociation', 'closing', 'gagne', 'perdu'));
  end if;
end $$;

create index if not exists prospects_statut_idx on public.prospects(statut);
create index if not exists prospects_updated_at_idx on public.prospects(updated_at desc);

create table if not exists public.config_entreprise (
  cle text primary key,
  valeur jsonb null
);

create table if not exists public.rapports_conducteurs (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  type text not null,
  periode_debut date not null,
  periode_fin date not null,
  periode_label text not null,
  contenu jsonb not null default '{}'::jsonb,
  statut text not null default 'genere',
  envoye_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rapports_conducteurs_type_check'
  ) then
    alter table public.rapports_conducteurs
      add constraint rapports_conducteurs_type_check
      check (type in ('releve_infraction', 'attestation_activite'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'rapports_conducteurs_statut_check'
  ) then
    alter table public.rapports_conducteurs
      add constraint rapports_conducteurs_statut_check
      check (statut in ('genere', 'envoye', 'signe'));
  end if;
end $$;

create index if not exists rapports_conducteurs_conducteur_idx on public.rapports_conducteurs(conducteur_id);
create index if not exists rapports_conducteurs_periode_idx on public.rapports_conducteurs(periode_debut, periode_fin);
create index if not exists rapports_conducteurs_created_at_idx on public.rapports_conducteurs(created_at desc);

-- RLS / sécurité sur tables sensibles
alter table public.prospects enable row level security;
alter table public.config_entreprise enable row level security;
alter table public.rapports_conducteurs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prospects' and policyname = 'prospects_base_access'
  ) then
    create policy prospects_base_access
      on public.prospects
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'commercial'))
      with check (public.current_app_role() in ('admin', 'commercial'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'config_entreprise' and policyname = 'config_entreprise_admin'
  ) then
    create policy config_entreprise_admin
      on public.config_entreprise
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant'))
      with check (public.current_app_role() in ('admin', 'dirigeant'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'rapports_conducteurs' and policyname = 'rapports_conducteurs_admin'
  ) then
    create policy rapports_conducteurs_admin
      on public.rapports_conducteurs
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant'))
      with check (public.current_app_role() in ('admin', 'dirigeant'));
  end if;
end $$;
