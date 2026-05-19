-- Extension du schéma compte_client_db_v1
-- Ajout des tables manquantes: adresses, remorques, équipements, amendes, paie, maintenance, RH, prospections
-- Avec corrélation à compte_erp_id

-- 1) Adresses (sites de chargement/déchargement)
create table core.adresses (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  partenaire_id uuid null references core.partenaires(id) on delete set null,
  code text not null,
  nom_entreprise text not null,
  adresse_ligne1 text not null,
  adresse_ligne2 text,
  code_postal text not null,
  ville text not null,
  pays text default 'France',
  telephone text,
  email text,
  horaire_ouverture time,
  horaire_fermeture time,
  jours_ouverture text not null, -- 'lun,mar,mer,jeu,ven,sam,dim' ou variante
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz null,
  unique(compte_erp_id, code)
);

create index adresses_compte_idx on core.adresses(compte_erp_id);
create index adresses_partenaire_idx on core.adresses(partenaire_id);

-- 2) Remorques (types et instances)
create table core.remorques (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  immatriculation text not null,
  type_remorque text not null, -- 'benne', 'plateau', 'citerne', 'fourgon', 'reefer', 'basculante'
  marque text,
  modele text,
  volume_m3 numeric,
  poids_vide_kg numeric,
  charge_utile_kg numeric,
  dernier_controle_date date,
  prochain_controle_date date,
  proprietaire boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz null,
  unique(compte_erp_id, immatriculation)
);

create index remorques_compte_idx on core.remorques(compte_erp_id);

-- 3) Équipements (accessoires véhicules/remorques)
create table core.equipements (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  nom text not null,
  type_equipement text not null, -- 'sanitaire', 'rampe', 'hayon', 'bâche', 'chauffage', 'gps', 'dashcam'
  quantite integer default 1,
  valeur_euro numeric,
  date_acquisition date,
  etat text default 'bon', -- 'bon', 'usé', 'défectueux'
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz null
);

create index equipements_compte_idx on core.equipements(compte_erp_id);

-- 4) Maintenance (historique atelier)
create table core.maintenance_history (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  vehicule_id uuid references core.vehicules(id) on delete set null,
  remorque_id uuid references core.remorques(id) on delete set null,
  type_maintenance text not null, -- 'contrôle_technique', 'révision', 'réparation', 'entretien', 'vidange'
  description text,
  date_debut date not null,
  date_fin date,
  cout_euro numeric,
  statut text default 'planifié', -- 'planifié', 'en_cours', 'terminé', 'annulé'
  technicien_nom text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references core.utilisateurs_compte(id) on delete set null
);

create index maintenance_history_compte_idx on core.maintenance_history(compte_erp_id);
create index maintenance_history_vehicule_idx on core.maintenance_history(vehicule_id);

-- 5) Amendes (infractions/ PV)
create table core.amendes (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  conducteur_id uuid not null references core.conducteurs(id) on delete restrict,
  ordre_transport_id uuid references core.ordres_transport(id) on delete set null,
  numero_pv text unique,
  type_infraction text not null, -- 'exces_vitesse', 'doc_manquant', 'stationnement', 'chargement', 'autres'
  montant_euro numeric not null,
  date_infraction date not null,
  date_notification date,
  statut_paiement text default 'non_payé', -- 'non_payé', 'en_attente', 'payé', 'contesté'
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references core.utilisateurs_compte(id) on delete set null
);

create index amendes_compte_idx on core.amendes(compte_erp_id);
create index amendes_conducteur_idx on core.amendes(conducteur_id);

-- 6) Fiches de paie
create table core.fiches_paie (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  conducteur_id uuid not null references core.conducteurs(id) on delete restrict,
  mois date not null, -- Premier jour du mois
  salaire_base_euro numeric not null,
  primes_euro numeric default 0,
  heures_supplementaires numeric default 0,
  deductions_euro numeric default 0,
  montant_net_euro numeric not null,
  statut_paiement text default 'en_attente', -- 'en_attente', 'payé', 'rejeté'
  date_paiement date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references core.utilisateurs_compte(id) on delete set null,
  unique(compte_erp_id, conducteur_id, mois)
);

create index fiches_paie_compte_idx on core.fiches_paie(compte_erp_id);
create index fiches_paie_conducteur_idx on core.fiches_paie(conducteur_id);

-- 7) Documents RH
create table core.documents_rh (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  conducteur_id uuid references core.conducteurs(id) on delete set null,
  utilisateur_id uuid references core.utilisateurs_compte(id) on delete set null,
  type_document text not null, -- 'cv', 'contrat', 'permis', 'visite_médicale', 'attestation', 'autre'
  nom_fichier text not null,
  storage_path text,
  date_document date,
  date_expiration date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references core.utilisateurs_compte(id) on delete set null,
  archived_at timestamptz null
);

create index documents_rh_compte_idx on core.documents_rh(compte_erp_id);
create index documents_rh_conducteur_idx on core.documents_rh(conducteur_id);

-- 8) Prospects (leads commerciaux)
create table core.prospects (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  nom_entreprise text not null,
  email text,
  telephone text,
  contact_nom text,
  contact_prenom text,
  secteur text, -- 'agro', 'retail', 'pharma', 'construction', 'autres'
  budget_estimé_euro numeric,
  volume_annuel_tonnes numeric,
  statut text default 'nouveau', -- 'nouveau', 'en_cours', 'qualifié', 'gagné', 'perdu'
  date_premier_contact date,
  date_qualif date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references core.utilisateurs_compte(id) on delete set null,
  archived_at timestamptz null
);

create index prospects_compte_idx on core.prospects(compte_erp_id);

-- 9) Interactions prospects (emails, appels, rencontres)
create table core.prospect_interactions (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  prospect_id uuid not null references core.prospects(id) on delete cascade,
  type_interaction text not null, -- 'email', 'appel', 'rencontre', 'devis', 'autre'
  date_interaction date not null,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references core.utilisateurs_compte(id) on delete set null
);

create index prospect_interactions_compte_idx on core.prospect_interactions(compte_erp_id);
create index prospect_interactions_prospect_idx on core.prospect_interactions(prospect_id);

-- 10) Planning (assignation ressources aux OT)
create table core.planning_ot (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  ordre_transport_id uuid not null references core.ordres_transport(id) on delete restrict,
  vehicule_id uuid references core.vehicules(id) on delete set null,
  remorque_id uuid references core.remorques(id) on delete set null,
  conducteur_id uuid references core.conducteurs(id) on delete set null,
  conducteur_2_id uuid references core.conducteurs(id) on delete set null, -- Conducteur relève
  date_planning date not null,
  heure_depart time,
  heure_arrivee_estimée time,
  km_planifiés integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(compte_erp_id, ordre_transport_id)
);

create index planning_ot_compte_idx on core.planning_ot(compte_erp_id);
create index planning_ot_ordre_idx on core.planning_ot(ordre_transport_id);
create index planning_ot_vehicule_idx on core.planning_ot(vehicule_id);
create index planning_ot_conducteur_idx on core.planning_ot(conducteur_id);

-- 11) Tachygraphe (chronographe d'activité)
create table core.tachygraphe_entries (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  conducteur_id uuid not null references core.conducteurs(id) on delete restrict,
  vehicule_id uuid references core.vehicules(id) on delete set null,
  ordre_transport_id uuid references core.ordres_transport(id) on delete set null,
  date_entree date not null,
  heure_debut time not null,
  heure_fin time not null,
  type_activite text not null, -- 'conduite', 'autre_travail', 'pause', 'repos'
  km_debut integer,
  km_fin integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index tachygraphe_entries_compte_idx on core.tachygraphe_entries(compte_erp_id);
create index tachygraphe_entries_conducteur_idx on core.tachygraphe_entries(conducteur_id);
create index tachygraphe_entries_date_idx on core.tachygraphe_entries(date_entree);

-- 12) Communications (emails/appels/sms)
create table core.communications (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  ordre_transport_id uuid references core.ordres_transport(id) on delete set null,
  prospect_id uuid references core.prospects(id) on delete set null,
  type_communication text not null, -- 'email', 'appel', 'sms', 'chat'
  expediteur_user_id uuid references core.utilisateurs_compte(id) on delete set null,
  expediteur_externe text, -- Email/tél external
  contenu text,
  date_communication timestamptz not null,
  statut text default 'envoyé', -- 'brouillon', 'envoyé', 'reçu', 'lu'
  created_at timestamptz default now(),
  archived_at timestamptz null
);

create index communications_compte_idx on core.communications(compte_erp_id);
create index communications_ordre_idx on core.communications(ordre_transport_id);

-- Apply auto-update timestamps
alter table core.adresses enable row level security;
alter table core.remorques enable row level security;
alter table core.equipements enable row level security;
alter table core.maintenance_history enable row level security;
alter table core.amendes enable row level security;
alter table core.fiches_paie enable row level security;
alter table core.documents_rh enable row level security;
alter table core.prospects enable row level security;
alter table core.prospect_interactions enable row level security;
alter table core.planning_ot enable row level security;
alter table core.tachygraphe_entries enable row level security;
alter table core.communications enable row level security;

-- Trigger for updated_at columns
create trigger set_updated_at_adresses before update on core.adresses
for each row execute function core.set_updated_at();

create trigger set_updated_at_remorques before update on core.remorques
for each row execute function core.set_updated_at();

create trigger set_updated_at_equipements before update on core.equipements
for each row execute function core.set_updated_at();

create trigger set_updated_at_maintenance_history before update on core.maintenance_history
for each row execute function core.set_updated_at();

create trigger set_updated_at_amendes before update on core.amendes
for each row execute function core.set_updated_at();

create trigger set_updated_at_fiches_paie before update on core.fiches_paie
for each row execute function core.set_updated_at();

create trigger set_updated_at_documents_rh before update on core.documents_rh
for each row execute function core.set_updated_at();

create trigger set_updated_at_prospects before update on core.prospects
for each row execute function core.set_updated_at();

create trigger set_updated_at_planning_ot before update on core.planning_ot
for each row execute function core.set_updated_at();

-- RLS Policies for new tables (all read/write gated by compte_erp_id)
create policy adresses_policy_read on core.adresses for select
using (core.is_same_compte(compte_erp_id));

create policy adresses_policy_insert on core.adresses for insert with check
(core.is_same_compte(compte_erp_id));

create policy adresses_policy_update on core.adresses for update using
(core.is_same_compte(compte_erp_id));

create policy adresses_policy_delete on core.adresses for delete using
(core.is_same_compte(compte_erp_id));

-- Apply same RLS pattern to all new tables
do $$
declare
  table_names text[] := array[
    'remorques', 'equipements', 'maintenance_history', 'amendes', 'fiches_paie',
    'documents_rh', 'prospects', 'prospect_interactions', 'planning_ot',
    'tachygraphe_entries', 'communications'
  ];
  table_name text;
begin
  foreach table_name in array table_names loop
    execute format(
      'create policy %I_policy_read on core.%I for select using (core.is_same_compte(compte_erp_id))',
      table_name, table_name
    );
    execute format(
      'create policy %I_policy_insert on core.%I for insert with check (core.is_same_compte(compte_erp_id))',
      table_name, table_name
    );
    execute format(
      'create policy %I_policy_update on core.%I for update using (core.is_same_compte(compte_erp_id))',
      table_name, table_name
    );
    execute format(
      'create policy %I_policy_delete on core.%I for delete using (core.is_same_compte(compte_erp_id))',
      table_name, table_name
    );
  end loop;
end $$;
