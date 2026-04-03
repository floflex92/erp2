-- Reconcile transport status history, OT fields, and driver alert view

alter table if exists public.ordres_transport
  add column if not exists affreteur_id uuid,
  add column if not exists chargement_site_id uuid,
  add column if not exists livraison_site_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ordres_transport_chargement_site_id_fkey'
      and conrelid = 'public.ordres_transport'::regclass
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_chargement_site_id_fkey
      foreign key (chargement_site_id)
      references public.sites_logistiques(id)
      on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ordres_transport_livraison_site_id_fkey'
      and conrelid = 'public.ordres_transport'::regclass
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_livraison_site_id_fkey
      foreign key (livraison_site_id)
      references public.sites_logistiques(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_ordres_transport_affreteur_id
  on public.ordres_transport(affreteur_id);

create index if not exists idx_ordres_transport_chargement_site_id
  on public.ordres_transport(chargement_site_id);

create index if not exists idx_ordres_transport_livraison_site_id
  on public.ordres_transport(livraison_site_id);

create table if not exists public.ordres_transport_statut_history (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  statut_precedent text,
  statut_nouveau text not null,
  commentaire text,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

alter table public.ordres_transport_statut_history
  add column if not exists ot_id uuid,
  add column if not exists statut_precedent text,
  add column if not exists statut_nouveau text,
  add column if not exists commentaire text,
  add column if not exists changed_by uuid,
  add column if not exists changed_at timestamptz;

update public.ordres_transport_statut_history
set statut_nouveau = coalesce(nullif(trim(statut_nouveau), ''), 'en_attente_validation'),
    changed_at = coalesce(changed_at, now());

alter table public.ordres_transport_statut_history
  alter column ot_id set not null,
  alter column statut_nouveau set not null,
  alter column changed_at set not null,
  alter column changed_at set default now();

create index if not exists idx_ot_statut_history_ot_id
  on public.ordres_transport_statut_history(ot_id, changed_at desc);

alter table public.ordres_transport_statut_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ordres_transport_statut_history'
      and policyname = 'ordres_transport_statut_history_rw'
  ) then
    create policy ordres_transport_statut_history_rw
      on public.ordres_transport_statut_history
      for all
      using (
        public.get_user_role() = any (array['admin','dirigeant','exploitant','rh','flotte','maintenance']::text[])
      )
      with check (
        public.get_user_role() = any (array['admin','dirigeant','exploitant','rh','flotte','maintenance']::text[])
      );
  end if;
end
$$;

alter table if exists public.conducteur_documents
  add column if not exists mime_type text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text;

update public.conducteur_documents
set storage_bucket = coalesce(nullif(trim(storage_bucket), ''), 'conducteur-documents'),
    storage_path = coalesce(nullif(trim(storage_path), ''), nullif(trim(file_path), ''), id::text),
    mime_type = coalesce(nullif(trim(mime_type), ''), 'application/octet-stream');

create or replace view public.vue_conducteur_alertes as
with due_dates as (
  select
    c.id as conducteur_id,
    v.alert_type,
    v.label,
    v.due_on
  from public.conducteurs c
  cross join lateral (
    values
      ('visite_medicale', 'Visite medicale', c.visite_medicale_expiration),
      ('recyclage', 'Recyclage', c.recyclage_expiration),
      ('permis', 'Permis de conduire', c.permis_expiration),
      ('carte_conducteur', 'Carte conducteur', c.carte_tachy_expiration),
      ('fimo', 'FIMO', c.fimo_date),
      ('fcos', 'FCO', c.fco_expiration)
  ) as v(alert_type, label, due_on)
)
select
  d.conducteur_id as id,
  d.conducteur_id,
  d.alert_type,
  d.label,
  (d.due_on - current_date)::integer as days_remaining,
  d.due_on
from due_dates d
where d.due_on is not null;
