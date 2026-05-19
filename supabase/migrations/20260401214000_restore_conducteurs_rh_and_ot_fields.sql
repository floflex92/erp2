-- Reconcile RH conducteur structures and OT donor field expected by frontend

alter table if exists public.conducteurs
  add column if not exists matricule text,
  add column if not exists poste text,
  add column if not exists type_contrat text,
  add column if not exists date_entree date,
  add column if not exists date_sortie date,
  add column if not exists motif_sortie text,
  add column if not exists contact_urgence_nom text,
  add column if not exists contact_urgence_telephone text,
  add column if not exists visite_medicale_date date,
  add column if not exists visite_medicale_expiration date,
  add column if not exists recyclage_date date,
  add column if not exists recyclage_expiration date;

alter table if exists public.ordres_transport
  add column if not exists donneur_ordre_id uuid;

update public.ordres_transport
set donneur_ordre_id = client_id
where donneur_ordre_id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_donneur_ordre_id_fkey'
      and conrelid = 'public.ordres_transport'::regclass
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_donneur_ordre_id_fkey
      foreign key (donneur_ordre_id)
      references public.clients(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_ordres_transport_donneur_ordre_id
  on public.ordres_transport(donneur_ordre_id);

create table if not exists public.conducteur_documents (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  category text not null default 'autre',
  title text not null,
  file_name text not null,
  file_path text not null,
  issued_at date,
  expires_at date,
  is_mandatory boolean not null default false,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conducteur_documents
  add column if not exists conducteur_id uuid,
  add column if not exists category text,
  add column if not exists title text,
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists issued_at date,
  add column if not exists expires_at date,
  add column if not exists is_mandatory boolean,
  add column if not exists notes text,
  add column if not exists archived_at timestamptz,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.conducteur_documents
  alter column category set default 'autre',
  alter column is_mandatory set default false,
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.conducteur_documents
set category = coalesce(nullif(trim(category), ''), 'autre');

update public.conducteur_documents
set title = coalesce(nullif(trim(title), ''), file_name, 'Document');

update public.conducteur_documents
set file_name = coalesce(nullif(trim(file_name), ''), title, 'document');

update public.conducteur_documents
set file_path = coalesce(nullif(trim(file_path), ''), file_name, id::text)
where file_path is null or trim(file_path) = '';

update public.conducteur_documents
set is_mandatory = coalesce(is_mandatory, false),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table public.conducteur_documents
  alter column conducteur_id set not null,
  alter column category set not null,
  alter column title set not null,
  alter column file_name set not null,
  alter column file_path set not null,
  alter column is_mandatory set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists idx_conducteur_documents_conducteur_id
  on public.conducteur_documents(conducteur_id);

create table if not exists public.conducteur_evenements_rh (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  event_type text not null default 'autre',
  title text not null,
  description text,
  severity text not null default 'info',
  start_date date not null,
  end_date date,
  reminder_at date,
  document_id uuid references public.conducteur_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conducteur_evenements_rh
  add column if not exists conducteur_id uuid,
  add column if not exists event_type text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists severity text,
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists reminder_at date,
  add column if not exists document_id uuid,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.conducteur_evenements_rh
  alter column event_type set default 'autre',
  alter column severity set default 'info',
  alter column created_at set default now(),
  alter column updated_at set default now();

update public.conducteur_evenements_rh
set event_type = coalesce(nullif(trim(event_type), ''), 'autre'),
    title = coalesce(nullif(trim(title), ''), 'Evenement RH'),
    severity = coalesce(nullif(trim(severity), ''), 'info'),
    start_date = coalesce(start_date, current_date),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

alter table public.conducteur_evenements_rh
  alter column conducteur_id set not null,
  alter column event_type set not null,
  alter column title set not null,
  alter column severity set not null,
  alter column start_date set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create index if not exists idx_conducteur_evenements_rh_conducteur_id
  on public.conducteur_evenements_rh(conducteur_id);

create index if not exists idx_conducteur_evenements_rh_start_date
  on public.conducteur_evenements_rh(start_date desc);

alter table public.conducteur_documents enable row level security;
alter table public.conducteur_evenements_rh enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conducteur_documents'
      and policyname = 'conducteur_documents_rw'
  ) then
    create policy conducteur_documents_rw
      on public.conducteur_documents
      for all
      using (
        public.get_user_role() = any (array['admin','dirigeant','rh']::text[])
      )
      with check (
        public.get_user_role() = any (array['admin','dirigeant','rh']::text[])
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'conducteur_evenements_rh'
      and policyname = 'conducteur_evenements_rh_rw'
  ) then
    create policy conducteur_evenements_rh_rw
      on public.conducteur_evenements_rh
      for all
      using (
        public.get_user_role() = any (array['admin','dirigeant','rh']::text[])
      )
      with check (
        public.get_user_role() = any (array['admin','dirigeant','rh']::text[])
      );
  end if;
end
$$;
