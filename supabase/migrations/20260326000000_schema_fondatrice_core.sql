-- Schema fondatrice du socle ERP transport.
-- Cette migration est idempotente et non destructive:
-- - elle cree les tables coeur si absentes;
-- - elle pose les contraintes/index essentiels;
-- - elle preserve la compatibilite avec les migrations additives existantes.

create extension if not exists pgcrypto;

create table if not exists public.profils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null default 'conducteur',
  nom text null,
  prenom text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  type_client text not null default 'chargeur',
  telephone text null,
  email text null,
  adresse text null,
  code_postal text null,
  ville text null,
  pays text null default 'France',
  siret text null,
  tva_intra text null,
  conditions_paiement integer null,
  encours_max numeric(12,2) null,
  taux_tva_defaut numeric(5,2) null,
  notes text null,
  actif boolean not null default true,
  code_client text null,
  adresse_facturation text null,
  code_postal_facturation text null,
  ville_facturation text null,
  pays_facturation text null,
  contact_facturation_nom text null,
  contact_facturation_email text null,
  contact_facturation_telephone text null,
  mode_paiement_defaut text null,
  type_echeance text null default 'date_facture_plus_delai',
  jour_echeance integer null,
  iban text null,
  bic text null,
  banque text null,
  titulaire_compte text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  nom text not null,
  prenom text null,
  poste text null,
  telephone text null,
  email text null,
  principal boolean null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.adresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid null references public.clients(id) on delete cascade,
  nom_lieu text not null,
  type_lieu text null,
  adresse text null,
  code_postal text null,
  ville text not null,
  pays text null,
  contact_nom text null,
  contact_tel text null,
  horaires text null,
  instructions text null,
  latitude numeric(10,7) null,
  longitude numeric(10,7) null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conducteurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  telephone text null,
  email text null,
  adresse text null,
  date_naissance date null,
  numero_permis text null,
  permis_categories text[] null,
  permis_expiration date null,
  fimo_date date null,
  fco_date date null,
  fco_expiration date null,
  carte_tachy_numero text null,
  carte_tachy_expiration date null,
  statut text not null default 'actif',
  notes text null,
  preferences text null,
  matricule text null,
  poste text null,
  type_contrat text null,
  date_entree date null,
  date_sortie date null,
  motif_sortie text null,
  contact_urgence_nom text null,
  contact_urgence_telephone text null,
  visite_medicale_date date null,
  visite_medicale_expiration date null,
  recyclage_date date null,
  recyclage_expiration date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicules (
  id uuid primary key default gen_random_uuid(),
  immatriculation text not null unique,
  marque text null,
  modele text null,
  annee integer null,
  type_vehicule text not null default 'tracteur',
  ptac_kg numeric(12,2) null,
  km_actuel integer null,
  ct_expiration date null,
  assurance_expiration date null,
  vignette_expiration date null,
  tachy_serie text null,
  tachy_etalonnage_prochain date null,
  statut text not null default 'disponible',
  notes text null,
  preferences text null,
  numero_carte_grise text null,
  vin text null,
  date_mise_en_circulation date null,
  date_achat date null,
  cout_achat_ht numeric(12,2) null,
  type_propriete text null,
  garantie_expiration date null,
  contrat_entretien boolean not null default false,
  prestataire_entretien text null,
  garage_entretien text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remorques (
  id uuid primary key default gen_random_uuid(),
  immatriculation text not null unique,
  type_remorque text not null default 'tautliner',
  marque text null,
  charge_utile_kg numeric(12,2) null,
  longueur_m numeric(6,2) null,
  statut text not null default 'disponible',
  notes text null,
  preferences text null,
  numero_carte_grise text null,
  vin text null,
  date_mise_en_circulation date null,
  date_achat date null,
  cout_achat_ht numeric(12,2) null,
  type_propriete text null,
  garantie_expiration date null,
  ct_expiration date null,
  assurance_expiration date null,
  contrat_entretien boolean not null default false,
  prestataire_entretien text null,
  garage_entretien text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.affectations (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  vehicule_id uuid null references public.vehicules(id) on delete set null,
  remorque_id uuid null references public.remorques(id) on delete set null,
  type_affectation text not null default 'fixe',
  date_debut date null,
  date_fin date null,
  actif boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affectations_dates_check
    check (date_fin is null or date_debut is null or date_fin >= date_debut)
);

create table if not exists public.ordres_transport (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  conducteur_id uuid null references public.conducteurs(id) on delete set null,
  vehicule_id uuid null references public.vehicules(id) on delete set null,
  remorque_id uuid null references public.remorques(id) on delete set null,
  reference text not null unique,
  type_transport text not null default 'complet',
  statut text not null default 'brouillon',
  statut_operationnel text null,
  date_chargement_prevue date null,
  date_livraison_prevue date null,
  date_livraison_reelle date null,
  distance_km integer null,
  nature_marchandise text null,
  poids_kg numeric(12,2) null,
  volume_m3 numeric(12,2) null,
  nombre_colis integer null,
  prix_ht numeric(12,2) null,
  taux_tva numeric(5,2) null,
  temperature_requise text null,
  numero_cmr text null,
  numero_bl text null,
  instructions text null,
  notes_internes text null,
  facturation_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.etapes_mission (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  ordre integer not null default 1,
  type_etape text not null,
  adresse_id uuid null references public.adresses(id) on delete set null,
  adresse_libre text null,
  ville text null,
  code_postal text null,
  pays text null,
  contact_nom text null,
  contact_tel text null,
  date_prevue date null,
  date_reelle date null,
  instructions text null,
  statut text not null default 'en_attente',
  poids_kg numeric(12,2) null,
  nombre_colis integer null,
  reference_marchandise text null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint etapes_mission_unique_ordre unique (ot_id, ordre)
);

create table if not exists public.historique_statuts (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  statut_ancien text null,
  statut_nouveau text not null,
  commentaire text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.factures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  ot_id uuid null references public.ordres_transport(id) on delete set null,
  numero text not null unique,
  date_emission date not null default current_date,
  date_echeance date null,
  date_paiement date null,
  mode_paiement text null,
  montant_ht numeric(12,2) not null default 0,
  montant_tva numeric(12,2) null,
  montant_ttc numeric(12,2) null,
  taux_tva numeric(5,2) not null default 20,
  statut text not null default 'brouillon',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ordres_transport'
      and column_name = 'temperature_requise'
  ) then
    alter table public.ordres_transport
      add column temperature_requise text null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'fk_ot_facture'
  ) then
    alter table public.ordres_transport
      add constraint fk_ot_facture
      foreign key (facturation_id) references public.factures(id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_type_echeance_check'
  ) then
    alter table public.clients
      add constraint clients_type_echeance_check
      check (
        type_echeance is null
        or type_echeance in ('date_facture_plus_delai', 'fin_de_mois', 'fin_de_mois_le_10', 'jour_fixe', 'comptant')
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clients_jour_echeance_check'
  ) then
    alter table public.clients
      add constraint clients_jour_echeance_check
      check (jour_echeance is null or jour_echeance between 1 and 31);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'conducteurs_date_sortie_check'
  ) then
    alter table public.conducteurs
      add constraint conducteurs_date_sortie_check
      check (date_sortie is null or date_entree is null or date_sortie >= date_entree);
  end if;
end $$;

create index if not exists idx_clients_nom on public.clients(nom);
create index if not exists idx_contacts_client on public.contacts(client_id);
create index if not exists idx_adresses_client_type on public.adresses(client_id, type_lieu);
create index if not exists conducteurs_date_entree_idx on public.conducteurs(date_entree);
create index if not exists conducteurs_date_sortie_idx on public.conducteurs(date_sortie);
create index if not exists conducteurs_visite_medicale_expiration_idx on public.conducteurs(visite_medicale_expiration);
create index if not exists conducteurs_recyclage_expiration_idx on public.conducteurs(recyclage_expiration);
create index if not exists vehicules_ct_expiration_idx on public.vehicules(ct_expiration);
create index if not exists vehicules_assurance_expiration_idx on public.vehicules(assurance_expiration);
create index if not exists remorques_ct_expiration_idx on public.remorques(ct_expiration);
create index if not exists remorques_assurance_expiration_idx on public.remorques(assurance_expiration);
create index if not exists idx_affectations_conducteur_actif on public.affectations(conducteur_id, actif);
create index if not exists idx_factures_client_date on public.factures(client_id, date_emission desc);
create index if not exists idx_ordres_transport_client_created on public.ordres_transport(client_id, created_at desc);
create index if not exists ordres_transport_status_dates_idx
  on public.ordres_transport(statut, statut_operationnel, date_chargement_prevue, date_livraison_prevue);
create index if not exists ordres_transport_assets_idx
  on public.ordres_transport(conducteur_id, vehicule_id, remorque_id);
create index if not exists historique_statuts_ot_created_idx
  on public.historique_statuts(ot_id, created_at desc);
