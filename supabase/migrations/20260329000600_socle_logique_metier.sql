-- Socle logique metier (additif)
-- Objectif: clarifier les liens entre societe mere, affretement, courses, documents et historiques.

create table if not exists public.affreteur_onboardings (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid null references public.profils(id) on delete set null,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  company_name text not null,
  siret text not null,
  vat_number text null,
  contact_email text not null,
  contact_phone text null,
  billing_address text not null,
  operation_address text null,
  notes text null,
  commercial_review text not null default 'en_attente',
  comptable_review text not null default 'en_attente',
  status text not null default 'en_verification_commerciale',
  rejection_reason text null,
  created_at timestamptz not null default now(),
  constraint affreteur_onboardings_commercial_review_check
    check (commercial_review in ('en_attente', 'valide', 'refuse')),
  constraint affreteur_onboardings_comptable_review_check
    check (comptable_review in ('en_attente', 'valide', 'refuse')),
  constraint affreteur_onboardings_status_check
    check (status in ('en_verification_commerciale', 'en_verification_comptable', 'validee', 'refusee'))
);

create unique index if not exists affreteur_onboardings_owner_profile_uidx
  on public.affreteur_onboardings(owner_profile_id)
  where owner_profile_id is not null;
create index if not exists affreteur_onboardings_status_idx on public.affreteur_onboardings(status);
create index if not exists affreteur_onboardings_company_idx on public.affreteur_onboardings(company_name);
create index if not exists affreteur_onboardings_email_idx on public.affreteur_onboardings(lower(contact_email));

create table if not exists public.affreteur_onboarding_history (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.affreteur_onboardings(id) on delete cascade,
  event_at timestamptz not null default now(),
  actor_role text not null,
  actor_name text not null,
  message text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists affreteur_onboarding_history_onboarding_idx
  on public.affreteur_onboarding_history(onboarding_id, event_at desc);

create table if not exists public.affreteur_employees (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.affreteur_onboardings(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null,
  permissions text[] not null default '{}'::text[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affreteur_employees_role_check
    check (role in ('gestionnaire', 'conducteur_affreteur')),
  constraint affreteur_employees_unique_email unique (onboarding_id, email)
);

create index if not exists affreteur_employees_onboarding_idx on public.affreteur_employees(onboarding_id);
create index if not exists affreteur_employees_active_idx on public.affreteur_employees(active);

create table if not exists public.affreteur_drivers (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.affreteur_onboardings(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text null,
  license_number text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affreteur_drivers_unique_email unique (onboarding_id, email)
);

create index if not exists affreteur_drivers_onboarding_idx on public.affreteur_drivers(onboarding_id);
create index if not exists affreteur_drivers_active_idx on public.affreteur_drivers(active);

create table if not exists public.affreteur_vehicles (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.affreteur_onboardings(id) on delete cascade,
  plate text not null,
  brand text null,
  model text null,
  capacity_kg numeric(12,2) null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affreteur_vehicles_unique_plate unique (onboarding_id, plate)
);

create index if not exists affreteur_vehicles_onboarding_idx on public.affreteur_vehicles(onboarding_id);
create index if not exists affreteur_vehicles_active_idx on public.affreteur_vehicles(active);

create table if not exists public.affreteur_equipments (
  id uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.affreteur_onboardings(id) on delete cascade,
  label text not null,
  kind text not null,
  serial_number text null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint affreteur_equipments_unique_label_kind unique (onboarding_id, label, kind)
);

create index if not exists affreteur_equipments_onboarding_idx on public.affreteur_equipments(onboarding_id);
create index if not exists affreteur_equipments_active_idx on public.affreteur_equipments(active);

create table if not exists public.affretement_contracts (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  onboarding_id uuid not null references public.affreteur_onboardings(id) on delete cascade,
  status text not null default 'propose',
  proposed_at timestamptz not null default now(),
  decided_at timestamptz null,
  updated_at timestamptz not null default now(),
  proposed_by_role text not null,
  proposed_by_name text not null,
  exploitation_note text null,
  affreteur_note text null,
  assigned_driver_id uuid null references public.affreteur_drivers(id) on delete set null,
  assigned_vehicle_id uuid null references public.affreteur_vehicles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint affretement_contracts_status_check
    check (status in ('propose', 'accepte', 'refuse', 'en_cours', 'termine', 'annule')),
  constraint affretement_contracts_proposed_by_role_check
    check (proposed_by_role in ('admin', 'dirigeant', 'exploitant', 'mecanicien', 'commercial', 'comptable', 'rh', 'conducteur', 'conducteur_affreteur', 'client', 'affreteur')),
  constraint affretement_contracts_ot_unique unique (ot_id)
);

create index if not exists affretement_contracts_onboarding_idx on public.affretement_contracts(onboarding_id, status, updated_at desc);
create index if not exists affretement_contracts_status_idx on public.affretement_contracts(status, updated_at desc);

create table if not exists public.affretement_contract_equipments (
  contract_id uuid not null references public.affretement_contracts(id) on delete cascade,
  equipment_id uuid not null references public.affreteur_equipments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contract_id, equipment_id)
);

create index if not exists affretement_contract_equipments_equipment_idx
  on public.affretement_contract_equipments(equipment_id);

create table if not exists public.affretement_contract_updates (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.affretement_contracts(id) on delete cascade,
  status_key text not null,
  event_at timestamptz not null default now(),
  note text null,
  gps_lat numeric(10,7) null,
  gps_lng numeric(10,7) null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint affretement_contract_updates_status_key_check
    check (status_key in ('hlp_vers_chargement', 'en_cours_chargement', 'charge', 'en_route_livraison', 'livre')),
  constraint affretement_contract_updates_unique_per_key unique (contract_id, status_key)
);

create index if not exists affretement_contract_updates_contract_idx
  on public.affretement_contract_updates(contract_id, event_at desc);

create table if not exists public.affretement_contract_history (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.affretement_contracts(id) on delete cascade,
  event_at timestamptz not null default now(),
  actor_role text not null,
  actor_name text not null,
  message text not null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists affretement_contract_history_contract_idx
  on public.affretement_contract_history(contract_id, event_at desc);

create index if not exists historique_statuts_ot_created_idx
  on public.historique_statuts(ot_id, created_at desc);
create index if not exists ordres_transport_status_dates_idx
  on public.ordres_transport(statut, statut_operationnel, date_chargement_prevue, date_livraison_prevue);
create index if not exists ordres_transport_assets_idx
  on public.ordres_transport(conducteur_id, vehicule_id, remorque_id);

-- Contraintes de coherence addititives (non valid pour ne pas casser les historiques deja existants)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_planification_check'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_planification_check
      check (
        date_chargement_prevue is null
        or date_livraison_prevue is null
        or date_livraison_prevue >= date_chargement_prevue
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_livraison_reelle_check'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_livraison_reelle_check
      check (
        date_chargement_prevue is null
        or date_livraison_reelle is null
        or date_livraison_reelle >= date_chargement_prevue
      ) not valid;
  end if;
end $$;

create or replace view public.vue_societe_mere
with (security_invoker = true) as
with cfg as (
  select
    cle,
    case
      when valeur is null then null
      when jsonb_typeof(valeur) = 'string' then valeur #>> '{}'
      else valeur::text
    end as valeur_text,
    valeur
  from public.config_entreprise
)
select
  coalesce(max(case when cle = 'societe_nom' then valeur_text end), 'NEXORA truck') as societe_nom,
  max(case when cle = 'societe_forme' then valeur_text end) as societe_forme,
  max(case when cle = 'societe_siret' then valeur_text end) as societe_siret,
  max(case when cle = 'societe_tva_intra' then valeur_text end) as societe_tva_intra,
  max(case when cle = 'societe_adresse' then valeur_text end) as societe_adresse,
  max(case when cle = 'societe_telephone' then valeur_text end) as societe_telephone,
  max(case when cle = 'mail_from' then valeur_text end) as mail_from,
  max(case when cle = 'responsable_exploitation_nom' then valeur_text end) as responsable_exploitation_nom,
  max(case when cle = 'responsable_exploitation_email' then valeur_text end) as responsable_exploitation_email,
  max(case when cle = 'rgpd_charte' then valeur_text end) as rgpd_charte,
  max(case when cle = 'reglement_interne' then valeur_text end) as reglement_interne,
  coalesce(jsonb_object_agg(cle, valeur) filter (where cle is not null), '{}'::jsonb) as configuration_complete
from cfg;

create or replace view public.vue_documents_metier
with (security_invoker = true) as
select
  d.id as document_id,
  'conducteur_documents'::text as source_table,
  'rh'::text as domaine,
  'conducteur'::text as entity_type,
  d.conducteur_id as entity_id,
  trim(concat(c.prenom, ' ', c.nom)) as entity_label,
  null::uuid as vehicule_id,
  null::uuid as remorque_id,
  d.category,
  d.title,
  d.file_name,
  d.mime_type,
  d.storage_bucket,
  d.storage_path,
  d.issued_at,
  d.expires_at,
  d.archived_at,
  d.notes,
  d.uploaded_by,
  d.created_at,
  d.updated_at
from public.conducteur_documents d
join public.conducteurs c on c.id = d.conducteur_id

union all

select
  d.id as document_id,
  'flotte_documents'::text as source_table,
  'flotte'::text as domaine,
  case when d.vehicule_id is not null then 'vehicule' else 'remorque' end as entity_type,
  coalesce(d.vehicule_id, d.remorque_id) as entity_id,
  coalesce(v.immatriculation, r.immatriculation, d.title) as entity_label,
  d.vehicule_id,
  d.remorque_id,
  d.category,
  d.title,
  d.file_name,
  d.mime_type,
  d.storage_bucket,
  d.storage_path,
  d.issued_at,
  d.expires_at,
  d.archived_at,
  d.notes,
  d.uploaded_by,
  d.created_at,
  d.updated_at
from public.flotte_documents d
left join public.vehicules v on v.id = d.vehicule_id
left join public.remorques r on r.id = d.remorque_id;

create or replace view public.vue_courses_centre
with (security_invoker = true) as
with latest_history as (
  select distinct on (hs.ot_id)
    hs.ot_id,
    hs.statut_ancien,
    hs.statut_nouveau,
    hs.commentaire,
    hs.created_at,
    hs.created_by
  from public.historique_statuts hs
  order by hs.ot_id, hs.created_at desc
),
history_counts as (
  select
    hs.ot_id,
    count(*)::integer as total_transitions
  from public.historique_statuts hs
  group by hs.ot_id
),
latest_eta as (
  select distinct on (ep.ot_id)
    ep.ot_id,
    ep.prediction_at,
    ep.eta_at,
    ep.delay_minutes,
    ep.method,
    ep.source_provider,
    ep.confidence
  from public.erp_v11_eta_predictions ep
  order by ep.ot_id, ep.prediction_at desc
),
latest_position as (
  select distinct on (vp.vehicle_id)
    vp.vehicle_id,
    vp.position_at,
    vp.latitude,
    vp.longitude,
    vp.speed_kmh,
    vp.source
  from public.erp_v11_vehicle_positions vp
  order by vp.vehicle_id, vp.position_at desc
),
latest_affretement_update as (
  select distinct on (u.contract_id)
    u.contract_id,
    u.status_key,
    u.event_at,
    u.note,
    u.gps_lat,
    u.gps_lng
  from public.affretement_contract_updates u
  order by u.contract_id, u.event_at desc
)
select
  ot.id as ot_id,
  ot.reference,
  ot.client_id,
  c.nom as client_nom,
  c.type_client,
  c.siret as client_siret,
  ot.conducteur_id,
  trim(concat(cd.prenom, ' ', cd.nom)) as conducteur_nom,
  cd.statut as conducteur_statut,
  ot.vehicule_id,
  v.immatriculation as vehicule_immatriculation,
  v.type_vehicule,
  ot.remorque_id,
  r.immatriculation as remorque_immatriculation,
  r.type_remorque,
  ot.statut as statut_commercial,
  ot.statut_operationnel,
  ot.type_transport,
  ot.created_at,
  ot.date_chargement_prevue,
  ot.date_livraison_prevue,
  ot.date_livraison_reelle,
  ot.prix_ht,
  ot.taux_tva,
  ot.distance_km,
  ot.poids_kg,
  ot.volume_m3,
  ot.temperature_requise,
  ot.instructions,
  ot.notes_internes,
  ot.updated_at,
  hc.total_transitions,
  lh.created_at as derniere_transition_at,
  lh.statut_ancien as derniere_transition_from,
  lh.statut_nouveau as derniere_transition_to,
  lh.commentaire as derniere_transition_commentaire,
  eta.prediction_at as derniere_eta_calculee_at,
  eta.eta_at,
  eta.delay_minutes,
  eta.method as eta_method,
  eta.source_provider as eta_source_provider,
  eta.confidence as eta_confidence,
  pos.position_at as derniere_position_at,
  pos.latitude as derniere_latitude,
  pos.longitude as derniere_longitude,
  pos.speed_kmh as derniere_vitesse_kmh,
  pos.source as position_source,
  ac.id as affretement_contract_id,
  ac.status as affretement_status,
  ao.id as affreteur_onboarding_id,
  ao.company_name as affreteur_company_name,
  ac.assigned_driver_id as affretement_driver_id,
  ad.full_name as affretement_driver_name,
  ac.assigned_vehicle_id as affretement_vehicle_id,
  av.plate as affretement_vehicle_plate,
  au.status_key as affretement_last_operational_status,
  au.event_at as affretement_last_operational_at,
  au.note as affretement_last_operational_note,
  au.gps_lat as affretement_last_gps_lat,
  au.gps_lng as affretement_last_gps_lng
from public.ordres_transport ot
join public.clients c on c.id = ot.client_id
left join public.conducteurs cd on cd.id = ot.conducteur_id
left join public.vehicules v on v.id = ot.vehicule_id
left join public.remorques r on r.id = ot.remorque_id
left join latest_history lh on lh.ot_id = ot.id
left join history_counts hc on hc.ot_id = ot.id
left join latest_eta eta on eta.ot_id = ot.id
left join latest_position pos on pos.vehicle_id = ot.vehicule_id
left join public.affretement_contracts ac on ac.ot_id = ot.id
left join public.affreteur_onboardings ao on ao.id = ac.onboarding_id
left join public.affreteur_drivers ad on ad.id = ac.assigned_driver_id
left join public.affreteur_vehicles av on av.id = ac.assigned_vehicle_id
left join latest_affretement_update au on au.contract_id = ac.id;

create or replace view public.vue_historique_metier
with (security_invoker = true) as
select
  concat('ot:', hs.id::text) as event_id,
  hs.created_at as occurred_at,
  'course'::text as domaine,
  'historique_statuts'::text as source_table,
  'ordre_transport'::text as entity_type,
  hs.ot_id::text as entity_id,
  hs.ot_id,
  hs.statut_nouveau as event_code,
  concat(coalesce(hs.statut_ancien, 'initial'), ' -> ', hs.statut_nouveau) as label,
  hs.commentaire as details,
  null::text as actor_role,
  null::text as actor_name,
  hs.created_by as actor_id
from public.historique_statuts hs

union all

select
  concat('rh:', erh.id::text) as event_id,
  erh.start_date::timestamptz as occurred_at,
  'rh'::text as domaine,
  'conducteur_evenements_rh'::text as source_table,
  'conducteur'::text as entity_type,
  erh.conducteur_id::text as entity_id,
  null::uuid as ot_id,
  erh.event_type as event_code,
  erh.title as label,
  erh.description as details,
  'rh'::text as actor_role,
  null::text as actor_name,
  erh.created_by as actor_id
from public.conducteur_evenements_rh erh

union all

select
  concat('flotte:', fe.id::text) as event_id,
  fe.service_date::timestamptz as occurred_at,
  'flotte'::text as domaine,
  'flotte_entretiens'::text as source_table,
  case when fe.vehicule_id is not null then 'vehicule' else 'remorque' end as entity_type,
  coalesce(fe.vehicule_id, fe.remorque_id)::text as entity_id,
  null::uuid as ot_id,
  fe.maintenance_type as event_code,
  fe.maintenance_type as label,
  fe.notes as details,
  'mecanicien'::text as actor_role,
  null::text as actor_name,
  fe.created_by as actor_id
from public.flotte_entretiens fe

union all

select
  concat('api:', l.id::text) as event_id,
  l.created_at as occurred_at,
  'api'::text as domaine,
  'erp_v11_api_logs'::text as source_table,
  'module'::text as entity_type,
  coalesce(l.provider_key, l.module_key) as entity_id,
  null::uuid as ot_id,
  l.status as event_code,
  concat(l.module_key, ' / ', coalesce(l.provider_key, 'internal')) as label,
  coalesce(l.error_message, 'http_status=' || coalesce(l.http_status::text, 'null')) as details,
  'system'::text as actor_role,
  coalesce(l.provider_key, 'engine') as actor_name,
  null::uuid as actor_id
from public.erp_v11_api_logs l

union all

select
  concat('aff-onb:', h.id::text) as event_id,
  h.event_at as occurred_at,
  'affretement'::text as domaine,
  'affreteur_onboarding_history'::text as source_table,
  'affreteur_onboarding'::text as entity_type,
  h.onboarding_id::text as entity_id,
  null::uuid as ot_id,
  h.actor_role as event_code,
  h.message as label,
  null::text as details,
  h.actor_role,
  h.actor_name,
  h.created_by as actor_id
from public.affreteur_onboarding_history h

union all

select
  concat('aff-contract:', h.id::text) as event_id,
  h.event_at as occurred_at,
  'affretement'::text as domaine,
  'affretement_contract_history'::text as source_table,
  'affretement_contract'::text as entity_type,
  h.contract_id::text as entity_id,
  c.ot_id,
  h.actor_role as event_code,
  h.message as label,
  null::text as details,
  h.actor_role,
  h.actor_name,
  h.created_by as actor_id
from public.affretement_contract_history h
join public.affretement_contracts c on c.id = h.contract_id

union all

select
  concat('aff-op:', u.id::text) as event_id,
  u.event_at as occurred_at,
  'affretement'::text as domaine,
  'affretement_contract_updates'::text as source_table,
  'affretement_contract'::text as entity_type,
  u.contract_id::text as entity_id,
  c.ot_id,
  u.status_key as event_code,
  concat('Statut operationnel ', u.status_key) as label,
  u.note as details,
  'affreteur'::text as actor_role,
  null::text as actor_name,
  u.created_by as actor_id
from public.affretement_contract_updates u
join public.affretement_contracts c on c.id = u.contract_id;

alter table public.affreteur_onboardings enable row level security;
alter table public.affreteur_onboarding_history enable row level security;
alter table public.affreteur_employees enable row level security;
alter table public.affreteur_drivers enable row level security;
alter table public.affreteur_vehicles enable row level security;
alter table public.affreteur_equipments enable row level security;
alter table public.affretement_contracts enable row level security;
alter table public.affretement_contract_equipments enable row level security;
alter table public.affretement_contract_updates enable row level security;
alter table public.affretement_contract_history enable row level security;

do $$
begin
  perform public.add_updated_at_trigger('public.affreteur_onboardings');
  perform public.add_updated_at_trigger('public.affreteur_employees');
  perform public.add_updated_at_trigger('public.affreteur_drivers');
  perform public.add_updated_at_trigger('public.affreteur_vehicles');
  perform public.add_updated_at_trigger('public.affreteur_equipments');
  perform public.add_updated_at_trigger('public.affretement_contracts');
exception
  when undefined_function then
    null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affreteur_onboardings' and policyname = 'affreteur_onboardings_rw'
  ) then
    create policy affreteur_onboardings_rw
      on public.affreteur_onboardings
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affreteur_onboarding_history' and policyname = 'affreteur_onboarding_history_rw'
  ) then
    create policy affreteur_onboarding_history_rw
      on public.affreteur_onboarding_history
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affreteur_employees' and policyname = 'affreteur_employees_rw'
  ) then
    create policy affreteur_employees_rw
      on public.affreteur_employees
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affreteur_drivers' and policyname = 'affreteur_drivers_rw'
  ) then
    create policy affreteur_drivers_rw
      on public.affreteur_drivers
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affreteur_vehicles' and policyname = 'affreteur_vehicles_rw'
  ) then
    create policy affreteur_vehicles_rw
      on public.affreteur_vehicles
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affreteur_equipments' and policyname = 'affreteur_equipments_rw'
  ) then
    create policy affreteur_equipments_rw
      on public.affreteur_equipments
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affretement_contracts' and policyname = 'affretement_contracts_rw'
  ) then
    create policy affretement_contracts_rw
      on public.affretement_contracts
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affretement_contract_equipments' and policyname = 'affretement_contract_equipments_rw'
  ) then
    create policy affretement_contract_equipments_rw
      on public.affretement_contract_equipments
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affretement_contract_updates' and policyname = 'affretement_contract_updates_rw'
  ) then
    create policy affretement_contract_updates_rw
      on public.affretement_contract_updates
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'affretement_contract_history' and policyname = 'affretement_contract_history_rw'
  ) then
    create policy affretement_contract_history_rw
      on public.affretement_contract_history
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur'));
  end if;
end $$;

grant select on public.vue_societe_mere to authenticated;
grant select on public.vue_documents_metier to authenticated;
grant select on public.vue_courses_centre to authenticated;
grant select on public.vue_historique_metier to authenticated;
