-- compte_client_db V1 - foundation schema
-- migration versionnee issue du snippet V1
-- cible: socle d'une base client dediee

create extension if not exists pgcrypto;

create schema if not exists core;
create schema if not exists docs;
create schema if not exists rt;
create schema if not exists audit;
create schema if not exists backup;

create or replace function core.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists core.comptes_erp (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  nom text not null,
  statut text not null default 'actif' check (statut in ('actif','inactif')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

drop trigger if exists trg_comptes_erp_updated_at on core.comptes_erp;
create trigger trg_comptes_erp_updated_at
before update on core.comptes_erp
for each row execute function core.set_updated_at();

create table if not exists core.partenaires (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  code text,
  nom text not null,
  siret text,
  email text,
  telephone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  created_by uuid null,
  updated_by uuid null
);

create index if not exists partenaires_compte_idx on core.partenaires(compte_erp_id);

drop trigger if exists trg_partenaires_updated_at on core.partenaires;
create trigger trg_partenaires_updated_at
before update on core.partenaires
for each row execute function core.set_updated_at();

create table if not exists core.roles_compte (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  code text not null,
  libelle text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(compte_erp_id, code)
);

create index if not exists roles_compte_compte_idx on core.roles_compte(compte_erp_id);

drop trigger if exists trg_roles_compte_updated_at on core.roles_compte;
create trigger trg_roles_compte_updated_at
before update on core.roles_compte
for each row execute function core.set_updated_at();

create table if not exists core.utilisateurs_compte (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  role_compte_id uuid not null references core.roles_compte(id) on delete restrict,
  user_auth_id uuid null,
  email text not null,
  nom text,
  prenom text,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  created_by uuid null,
  updated_by uuid null,
  unique(compte_erp_id, email)
);

create index if not exists utilisateurs_compte_compte_idx on core.utilisateurs_compte(compte_erp_id);

drop trigger if exists trg_utilisateurs_compte_updated_at on core.utilisateurs_compte;
create trigger trg_utilisateurs_compte_updated_at
before update on core.utilisateurs_compte
for each row execute function core.set_updated_at();

create table if not exists core.ordres_transport (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  partenaire_id uuid not null references core.partenaires(id) on delete restrict,
  destinataire_final_id uuid null references core.partenaires(id) on delete restrict,
  reference text not null,
  statut_transport text not null default 'en_attente',
  date_chargement_prevue timestamptz null,
  date_livraison_prevue timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  created_by uuid null,
  updated_by uuid null,
  unique(compte_erp_id, reference)
);

create index if not exists ordres_transport_compte_idx on core.ordres_transport(compte_erp_id);
create index if not exists ordres_transport_partenaire_idx on core.ordres_transport(partenaire_id);

drop trigger if exists trg_ordres_transport_updated_at on core.ordres_transport;
create trigger trg_ordres_transport_updated_at
before update on core.ordres_transport
for each row execute function core.set_updated_at();

create table if not exists core.vehicules (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  immatriculation text not null,
  libelle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  unique(compte_erp_id, immatriculation)
);

create index if not exists vehicules_compte_idx on core.vehicules(compte_erp_id);

drop trigger if exists trg_vehicules_updated_at on core.vehicules;
create trigger trg_vehicules_updated_at
before update on core.vehicules
for each row execute function core.set_updated_at();

create table if not exists core.conducteurs (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  nom text,
  prenom text,
  telephone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null
);

create index if not exists conducteurs_compte_idx on core.conducteurs(compte_erp_id);

drop trigger if exists trg_conducteurs_updated_at on core.conducteurs;
create trigger trg_conducteurs_updated_at
before update on core.conducteurs
for each row execute function core.set_updated_at();

create table if not exists core.messages (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  ordre_transport_id uuid null references core.ordres_transport(id) on delete set null,
  auteur_user_id uuid null references core.utilisateurs_compte(id) on delete set null,
  contenu text not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz null
);

create index if not exists messages_compte_idx on core.messages(compte_erp_id);

create table if not exists docs.documents (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  ordre_transport_id uuid null references core.ordres_transport(id) on delete set null,
  type_document text not null,
  nom_fichier text not null,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz null,
  created_by uuid null,
  updated_by uuid null
);

create index if not exists documents_compte_idx on docs.documents(compte_erp_id);

drop trigger if exists trg_documents_updated_at on docs.documents;
create trigger trg_documents_updated_at
before update on docs.documents
for each row execute function core.set_updated_at();

create table if not exists docs.documents_versions (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  document_id uuid not null references docs.documents(id) on delete cascade,
  version_num integer not null,
  storage_path text,
  checksum text,
  created_at timestamptz not null default now(),
  created_by uuid null,
  unique(document_id, version_num)
);

create index if not exists documents_versions_compte_idx on docs.documents_versions(compte_erp_id);

create table if not exists rt.evenements_transport (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  ordre_transport_id uuid null references core.ordres_transport(id) on delete set null,
  type_evenement text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists evenements_transport_compte_idx on rt.evenements_transport(compte_erp_id, created_at desc);

create table if not exists rt.notifications (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  user_id uuid null references core.utilisateurs_compte(id) on delete set null,
  type_notification text not null,
  payload jsonb not null default '{}'::jsonb,
  lu_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_compte_idx on rt.notifications(compte_erp_id, created_at desc);

create table if not exists audit.journal_actions (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid not null references core.comptes_erp(id) on delete restrict,
  acteur_user_id uuid null references core.utilisateurs_compte(id) on delete set null,
  action text not null,
  table_cible text not null,
  cible_id uuid null,
  payload_before jsonb null,
  payload_after jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists journal_actions_compte_idx on audit.journal_actions(compte_erp_id, created_at desc);

create table if not exists backup.snapshots (
  id uuid primary key default gen_random_uuid(),
  compte_erp_id uuid null references core.comptes_erp(id) on delete set null,
  type_snapshot text not null check (type_snapshot in ('technique_annuel', 'fonctionnel_annuel')),
  reference_externe text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists snapshots_type_created_idx on backup.snapshots(type_snapshot, created_at desc);
