-- Migration de garde: assure l existance des tables coeur si elles manquent.
-- Doit pouvoir s'executer sans effet si schema deja present.

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
    select 1 from pg_constraint where conname = 'factures_ot_id_unique'
  ) then
    alter table public.factures add constraint factures_ot_id_unique unique (ot_id);
  end if;
end $$;

create index if not exists idx_ordres_transport_client_created on public.ordres_transport(client_id, created_at desc);
create index if not exists idx_factures_client_date on public.factures(client_id, date_emission desc);
