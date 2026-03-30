-- Migration de rattrapage : tables, vues et fonctions manquantes
-- Toutes les operations sont idempotentes.
-- Resoud le risque de reproductibilite identifie dans l'audit schema.
--
-- Reel manquant vs migrations precedentes :
--   - fonction add_updated_at_trigger  (appelee dans mig 500 + 600 mais jamais definie)
--   - tables  : tachygraphe_entrees, couts_mission, documents, entretiens
--   - vue     : vue_marge_ot
-- Les autres vues (vue_alertes_flotte, vue_conducteur_alertes,
--   vue_cout_kilometrique_vehicules, vue_couts_flotte_mensuels)
--   sont deja definies dans les migrations 100 et 200.

-- ============================================================
-- 1. Fonction utilitaire set_updated_at + add_updated_at_trigger
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.add_updated_at_trigger(tbl text)
returns void
language plpgsql
as $$
begin
  execute format(
    'create trigger set_updated_at
     before update on %s
     for each row execute function public.set_updated_at()',
    tbl
  );
exception
  when duplicate_object then null;
end $$;

-- Re-application des triggers pour les tables dont le setup avait
-- echoue silencieusement dans les migrations 500 et 600
-- (exception when undefined_function then null)
do $$
declare
  tbls text[] := array[
    'public.erp_v11_tenants',
    'public.erp_v11_modules',
    'public.erp_v11_providers',
    'public.erp_v11_api_mappings',
    'public.erp_v11_cache',
    'public.erp_v11_driver_sessions',
    'public.erp_v11_client_portal_access',
    'public.affreteur_onboardings',
    'public.affreteur_employees',
    'public.affreteur_drivers',
    'public.affreteur_vehicles',
    'public.affreteur_equipments',
    'public.affretement_contracts'
  ];
  tbl text;
begin
  foreach tbl in array tbls loop
    perform public.add_updated_at_trigger(tbl);
  end loop;
end $$;

-- ============================================================
-- 2. Table tachygraphe_entrees
-- ============================================================

create table if not exists public.tachygraphe_entrees (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  vehicule_id uuid null references public.vehicules(id) on delete set null,
  ot_id uuid null references public.ordres_transport(id) on delete set null,
  type_activite text not null,
  date_debut timestamptz not null,
  date_fin timestamptz null,
  duree_minutes integer null,
  source text null,
  notes text null,
  created_at timestamptz not null default now(),
  constraint tachygraphe_entrees_type_activite_check
    check (type_activite in ('conduite', 'repos', 'travail', 'disponibilite', 'autre')),
  constraint tachygraphe_entrees_dates_check
    check (date_fin is null or date_fin >= date_debut)
);

create index if not exists tachy_conducteur_date_idx
  on public.tachygraphe_entrees(conducteur_id, date_debut desc);
create index if not exists tachy_vehicule_date_idx
  on public.tachygraphe_entrees(vehicule_id, date_debut desc)
  where vehicule_id is not null;
create index if not exists tachy_ot_idx
  on public.tachygraphe_entrees(ot_id)
  where ot_id is not null;

-- ============================================================
-- 3. Table couts_mission
-- ============================================================

create table if not exists public.couts_mission (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  type_cout text not null,
  montant_ht numeric(12,2) not null default 0,
  taux_tva numeric(5,2) null,
  libelle text null,
  date_cout date null,
  fournisseur text null,
  reference_piece text null,
  notes text null,
  created_at timestamptz not null default now(),
  constraint couts_mission_type_cout_check
    check (type_cout in ('carburant', 'peage', 'sous_traitance', 'reparation', 'divers'))
);

create index if not exists couts_mission_ot_idx
  on public.couts_mission(ot_id);
create index if not exists couts_mission_type_date_idx
  on public.couts_mission(type_cout, date_cout desc);

-- ============================================================
-- 4. Table documents  (legacy pièces jointes OT)
-- ============================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid null references public.ordres_transport(id) on delete set null,
  type_document text not null,
  nom_fichier text not null,
  url_stockage text null,
  taille_bytes integer null,
  uploaded_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists documents_ot_idx
  on public.documents(ot_id)
  where ot_id is not null;

-- ============================================================
-- 5. Table entretiens  (legacy maintenance véhicule)
-- ============================================================

create table if not exists public.entretiens (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete cascade,
  type_entretien text not null,
  date_entretien date not null,
  km_au_moment integer null,
  cout_ht numeric(12,2) null,
  prestataire text null,
  description text null,
  created_at timestamptz not null default now()
);

create index if not exists entretiens_vehicule_date_idx
  on public.entretiens(vehicule_id, date_entretien desc);

-- ============================================================
-- 6. Vue vue_marge_ot  (seule vue réellement manquante)
-- ============================================================

create or replace view public.vue_marge_ot
with (security_invoker = true) as
select
  ot.id,
  ot.reference,
  ot.statut,
  ot.created_at,
  ot.date_livraison_prevue,
  ot.date_livraison_reelle,
  c.nom as client,
  coalesce(ot.prix_ht, 0) as chiffre_affaires,
  coalesce(sum(cm.montant_ht), 0) as total_couts,
  coalesce(ot.prix_ht, 0) - coalesce(sum(cm.montant_ht), 0) as marge_brute,
  case
    when coalesce(ot.prix_ht, 0) > 0 then
      round(
        ((coalesce(ot.prix_ht, 0) - coalesce(sum(cm.montant_ht), 0))
         / ot.prix_ht * 100)::numeric,
        2
      )
    else null
  end as taux_marge_pct
from public.ordres_transport ot
join public.clients c on c.id = ot.client_id
left join public.couts_mission cm on cm.ot_id = ot.id
group by
  ot.id, ot.reference, ot.statut, ot.created_at,
  ot.date_livraison_prevue, ot.date_livraison_reelle,
  c.nom, ot.prix_ht;

-- ============================================================
-- RLS sur les nouvelles tables
-- ============================================================

alter table public.tachygraphe_entrees enable row level security;
alter table public.couts_mission       enable row level security;
alter table public.documents           enable row level security;
alter table public.entretiens          enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tachygraphe_entrees'
      and policyname = 'tachy_rw'
  ) then
    create policy tachy_rw on public.tachygraphe_entrees
      for all to authenticated
      using (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'mecanicien', 'rh', 'conducteur'))
      with check (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'mecanicien', 'rh', 'conducteur'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'couts_mission'
      and policyname = 'couts_mission_rw'
  ) then
    create policy couts_mission_rw on public.couts_mission
      for all to authenticated
      using (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'comptable'))
      with check (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'comptable'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'documents'
      and policyname = 'documents_rw'
  ) then
    create policy documents_rw on public.documents
      for all to authenticated
      using (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'commercial', 'comptable'))
      with check (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'commercial', 'comptable'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'entretiens'
      and policyname = 'entretiens_rw'
  ) then
    create policy entretiens_rw on public.entretiens
      for all to authenticated
      using (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'mecanicien'))
      with check (public.current_app_role() in (
        'admin', 'dirigeant', 'exploitant', 'mecanicien'));
  end if;
end $$;

grant select on public.vue_marge_ot to authenticated;
