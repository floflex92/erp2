-- Reconciliation schema/types
-- Objectif: restaurer les objets attendus par le front apres evolutions de schema

-- 1) Clients: champs commerciaux/facturation
alter table public.clients
  add column if not exists code_client text,
  add column if not exists adresse_facturation text,
  add column if not exists code_postal_facturation text,
  add column if not exists ville_facturation text,
  add column if not exists pays_facturation text,
  add column if not exists contact_facturation_nom text,
  add column if not exists contact_facturation_email text,
  add column if not exists contact_facturation_telephone text,
  add column if not exists mode_paiement_defaut text,
  add column if not exists type_echeance text default 'date_facture_plus_delai',
  add column if not exists jour_echeance integer,
  add column if not exists iban text,
  add column if not exists bic text,
  add column if not exists banque text,
  add column if not exists titulaire_compte text;

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
end $$;

-- 2) Flotte: colonnes vehicules/remorques attendues par l'UI
alter table public.vehicules
  add column if not exists numero_carte_grise text,
  add column if not exists vin text,
  add column if not exists date_mise_en_circulation date,
  add column if not exists date_achat date,
  add column if not exists cout_achat_ht numeric(12,2),
  add column if not exists type_propriete text,
  add column if not exists garantie_expiration date,
  add column if not exists contrat_entretien boolean not null default false,
  add column if not exists prestataire_entretien text,
  add column if not exists garage_entretien text;

alter table public.remorques
  add column if not exists numero_carte_grise text,
  add column if not exists vin text,
  add column if not exists date_mise_en_circulation date,
  add column if not exists date_achat date,
  add column if not exists cout_achat_ht numeric(12,2),
  add column if not exists type_propriete text,
  add column if not exists garantie_expiration date,
  add column if not exists contrat_entretien boolean not null default false,
  add column if not exists prestataire_entretien text,
  add column if not exists garage_entretien text;

-- 3) Tables flotte optionnelles utilisees par les pages maintenance/vehicules/remorques
create table if not exists public.flotte_documents (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid null references public.vehicules(id) on delete cascade,
  remorque_id uuid null references public.remorques(id) on delete cascade,
  category text not null,
  title text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  storage_bucket text not null default 'flotte-documents',
  storage_path text not null unique,
  issued_at date null,
  expires_at date null,
  notes text null,
  uploaded_by uuid null references auth.users(id) on delete set null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flotte_documents_asset_check
    check (
      (vehicule_id is not null and remorque_id is null)
      or (vehicule_id is null and remorque_id is not null)
    )
);

create index if not exists flotte_documents_vehicule_idx on public.flotte_documents(vehicule_id);
create index if not exists flotte_documents_remorque_idx on public.flotte_documents(remorque_id);
create index if not exists flotte_documents_expires_at_idx on public.flotte_documents(expires_at);

create table if not exists public.vehicule_releves_km (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid not null references public.vehicules(id) on delete cascade,
  reading_date date not null,
  km_compteur integer not null,
  source text null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicule_releves_km_unique unique (vehicule_id, reading_date)
);

create index if not exists vehicule_releves_km_vehicule_idx on public.vehicule_releves_km(vehicule_id, reading_date);

create or replace view public.vue_couts_flotte_mensuels as
select
  'vehicule'::text as asset_type,
  fe.vehicule_id as asset_id,
  date_trunc('month', fe.service_date)::date as month,
  sum(fe.cout_ht)::numeric(12,2) as total_cout_ht
from public.flotte_entretiens fe
where fe.vehicule_id is not null
group by fe.vehicule_id, date_trunc('month', fe.service_date)

union all

select
  'remorque'::text as asset_type,
  fe.remorque_id as asset_id,
  date_trunc('month', fe.service_date)::date as month,
  sum(fe.cout_ht)::numeric(12,2) as total_cout_ht
from public.flotte_entretiens fe
where fe.remorque_id is not null
group by fe.remorque_id, date_trunc('month', fe.service_date);

create or replace view public.vue_cout_kilometrique_vehicules as
with km_by_month as (
  select
    vr.vehicule_id,
    date_trunc('month', vr.reading_date)::date as month,
    max(vr.km_compteur) - min(vr.km_compteur) as km_parcourus
  from public.vehicule_releves_km vr
  group by vr.vehicule_id, date_trunc('month', vr.reading_date)
),
cost_by_month as (
  select
    fe.vehicule_id,
    date_trunc('month', fe.service_date)::date as month,
    sum(fe.cout_ht)::numeric(12,2) as cout_ht
  from public.flotte_entretiens fe
  where fe.vehicule_id is not null
  group by fe.vehicule_id, date_trunc('month', fe.service_date)
)
select
  coalesce(km.vehicule_id, cost.vehicule_id) as vehicule_id,
  coalesce(km.month, cost.month) as month,
  km.km_parcourus,
  cost.cout_ht,
  case
    when km.km_parcourus is null or km.km_parcourus <= 0 or cost.cout_ht is null then null
    else round((cost.cout_ht / km.km_parcourus)::numeric, 4)
  end as cout_km_ht
from km_by_month km
full outer join cost_by_month cost
  on cost.vehicule_id = km.vehicule_id
 and cost.month = km.month;

create or replace view public.vue_alertes_flotte as
select
  concat(v.id::text, ':ct') as id,
  'vehicule'::text as asset_type,
  v.id as asset_id,
  v.immatriculation as asset_label,
  'ct_expiration'::text as alert_type,
  'Controle technique a renouveler'::text as label,
  v.ct_expiration as due_on,
  (v.ct_expiration - current_date) as days_remaining
from public.vehicules v
where v.ct_expiration is not null

union all

select
  concat(v.id::text, ':assurance') as id,
  'vehicule'::text as asset_type,
  v.id as asset_id,
  v.immatriculation as asset_label,
  'assurance_expiration'::text as alert_type,
  'Assurance a renouveler'::text as label,
  v.assurance_expiration as due_on,
  (v.assurance_expiration - current_date) as days_remaining
from public.vehicules v
where v.assurance_expiration is not null

union all

select
  concat(r.id::text, ':ct') as id,
  'remorque'::text as asset_type,
  r.id as asset_id,
  r.immatriculation as asset_label,
  'ct_expiration'::text as alert_type,
  'Controle technique a renouveler'::text as label,
  r.ct_expiration as due_on,
  (r.ct_expiration - current_date) as days_remaining
from public.remorques r
where r.ct_expiration is not null

union all

select
  concat(r.id::text, ':assurance') as id,
  'remorque'::text as asset_type,
  r.id as asset_id,
  r.immatriculation as asset_label,
  'assurance_expiration'::text as alert_type,
  'Assurance a renouveler'::text as label,
  r.assurance_expiration as due_on,
  (r.assurance_expiration - current_date) as days_remaining
from public.remorques r
where r.assurance_expiration is not null

union all

select
  concat(fd.id::text, ':doc') as id,
  case when fd.vehicule_id is not null then 'vehicule' else 'remorque' end as asset_type,
  coalesce(fd.vehicule_id, fd.remorque_id) as asset_id,
  fd.title as asset_label,
  'document_expiration'::text as alert_type,
  'Document flotte a renouveler'::text as label,
  fd.expires_at as due_on,
  (fd.expires_at - current_date) as days_remaining
from public.flotte_documents fd
where fd.expires_at is not null
  and fd.archived_at is null;

-- 4) Tasks: table attendue par src/pages/Tasks.tsx
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profils(id) on delete cascade,
  title text not null,
  notes text null,
  completed boolean not null default false,
  due_date date null,
  priority text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_user_id on public.tasks(user_id);

alter table if exists public.flotte_documents enable row level security;
alter table if exists public.vehicule_releves_km enable row level security;
alter table if exists public.tasks enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'tasks' and policyname = 'tasks_rw'
  ) then
    create policy tasks_rw on public.tasks
      for all to authenticated
      using (
        public.get_user_role() in ('admin','dirigeant')
        or user_id = (select p.id from public.profils p where p.user_id = auth.uid() limit 1)
      )
      with check (
        public.get_user_role() in ('admin','dirigeant')
        or user_id = (select p.id from public.profils p where p.user_id = auth.uid() limit 1)
      );
  end if;
end $$;
