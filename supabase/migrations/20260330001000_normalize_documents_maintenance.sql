-- Migration P1 : consolider documents + entretiens
-- 1) Rassemblement via document_links
-- 2) Table maintenance_events

create table if not exists public.document_links (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  created_at timestamptz not null default now(),
  constraint document_links_entity_type_check check (entity_type in ('conducteur','vehicule','remorque','client','ot','autre'))
);

create index if not exists idx_document_links_entity on public.document_links(entity_type, entity_id);
create unique index if not exists document_links_unique_document_entity_idx
  on public.document_links(document_id, entity_type, entity_id);

-- Table de facturation maintenance unifiée
create table if not exists public.maintenance_events (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid null references public.vehicules(id) on delete set null,
  remorque_id uuid null references public.remorques(id) on delete set null,
  conducteur_id uuid null references public.conducteurs(id) on delete set null,
  ot_id uuid null references public.ordres_transport(id) on delete set null,
  type_entretien text not null,
  service_date date not null,
  km_compteur integer null,
  cout_ht numeric(12,2) null,
  cout_ttc numeric(12,2) null,
  prestataire text null,
  garage text null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maintenance_events_vehicle_date on public.maintenance_events(vehicule_id, service_date desc);
create index if not exists idx_maintenance_events_conducteur_date on public.maintenance_events(conducteur_id, service_date desc);

-- Migration des documents existants vers liens
-- 1) conducteur_documents
insert into public.documents (id, created_at, nom_fichier, ot_id, taille_bytes, type_document, uploaded_by, url_stockage)
select id, created_at, file_name, null, null, category, uploaded_by, null
from public.conducteur_documents
on conflict (id) do nothing;

insert into public.document_links (document_id, entity_type, entity_id)
select id, 'conducteur', conducteur_id
from public.conducteur_documents
on conflict (document_id, entity_type, entity_id) do nothing;

-- 2) flotte_documents
insert into public.documents (id, created_at, nom_fichier, ot_id, taille_bytes, type_document, uploaded_by, url_stockage)
select id, created_at, file_name, null, null, category, uploaded_by, null
from public.flotte_documents
on conflict (id) do nothing;

insert into public.document_links (document_id, entity_type, entity_id)
select id, case when vehicule_id is not null then 'vehicule' else 'remorque' end, coalesce(vehicule_id, remorque_id)
from public.flotte_documents
on conflict (document_id, entity_type, entity_id) do nothing;

-- 3) mov ? existing documents are already liens ot (if relevant)
insert into public.document_links (document_id, entity_type, entity_id)
select id, 'ot', ot_id
from public.documents
where ot_id is not null
on conflict (document_id, entity_type, entity_id) do nothing;

-- Migration des entretiens existants vers maintenance_events
insert into public.maintenance_events (id, vehicule_id, remorque_id, conducteur_id, ot_id, type_entretien, service_date, km_compteur, cout_ht, cout_ttc, prestataire, garage, notes, created_at, updated_at)
select id, vehicule_id, remorque_id, null, null, maintenance_type, service_date, km_compteur, cout_ht, cout_ttc, prestataire, garage, notes, created_at, updated_at
from public.flotte_entretiens
on conflict (id) do nothing;

insert into public.maintenance_events (id, vehicule_id, remorque_id, conducteur_id, ot_id, type_entretien, service_date, km_compteur, cout_ht, cout_ttc, prestataire, garage, notes, created_at, updated_at)
select id, vehicule_id, null, null, null, type_entretien, date_entretien, km_au_moment, cout_ht, null, prestataire, null, description, created_at, created_at
from public.entretiens
on conflict (id) do nothing;
