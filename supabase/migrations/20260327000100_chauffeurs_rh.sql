create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select p.role
  from public.profils p
  where p.user_id = auth.uid()
  limit 1
$$;

alter table public.conducteurs
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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conducteurs_date_sortie_check'
  ) then
    alter table public.conducteurs
      add constraint conducteurs_date_sortie_check
      check (date_sortie is null or date_entree is null or date_sortie >= date_entree);
  end if;
end $$;

create index if not exists conducteurs_date_entree_idx on public.conducteurs(date_entree);
create index if not exists conducteurs_date_sortie_idx on public.conducteurs(date_sortie);
create index if not exists conducteurs_visite_medicale_expiration_idx on public.conducteurs(visite_medicale_expiration);
create index if not exists conducteurs_recyclage_expiration_idx on public.conducteurs(recyclage_expiration);

create table if not exists public.conducteur_documents (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  category text not null,
  title text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  storage_bucket text not null default 'conducteur-documents',
  storage_path text not null unique,
  issued_at date null,
  expires_at date null,
  is_mandatory boolean not null default false,
  notes text null,
  uploaded_by uuid null references auth.users(id) on delete set null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conducteur_documents_conducteur_idx on public.conducteur_documents(conducteur_id);
create index if not exists conducteur_documents_category_idx on public.conducteur_documents(category);
create index if not exists conducteur_documents_expires_at_idx on public.conducteur_documents(expires_at);

create table if not exists public.conducteur_evenements_rh (
  id uuid primary key default gen_random_uuid(),
  conducteur_id uuid not null references public.conducteurs(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text null,
  severity text not null default 'info',
  start_date date not null,
  end_date date null,
  reminder_at date null,
  document_id uuid null references public.conducteur_documents(id) on delete set null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conducteur_evenements_rh_conducteur_idx on public.conducteur_evenements_rh(conducteur_id);
create index if not exists conducteur_evenements_rh_event_type_idx on public.conducteur_evenements_rh(event_type);
create index if not exists conducteur_evenements_rh_start_date_idx on public.conducteur_evenements_rh(start_date);
create index if not exists conducteur_evenements_rh_reminder_at_idx on public.conducteur_evenements_rh(reminder_at);

create or replace view public.vue_conducteur_alertes as
select
  concat(c.id::text, ':permis') as id,
  c.id as conducteur_id,
  'permis_expiration'::text as alert_type,
  'Permis a renouveler'::text as label,
  c.permis_expiration as due_on,
  (c.permis_expiration - current_date) as days_remaining
from public.conducteurs c
where c.permis_expiration is not null

union all

select
  concat(c.id::text, ':fco') as id,
  c.id as conducteur_id,
  'fco_expiration'::text as alert_type,
  'FCO a renouveler'::text as label,
  c.fco_expiration as due_on,
  (c.fco_expiration - current_date) as days_remaining
from public.conducteurs c
where c.fco_expiration is not null

union all

select
  concat(c.id::text, ':tachy') as id,
  c.id as conducteur_id,
  'tachy_expiration'::text as alert_type,
  'Carte tachygraphe a renouveler'::text as label,
  c.carte_tachy_expiration as due_on,
  (c.carte_tachy_expiration - current_date) as days_remaining
from public.conducteurs c
where c.carte_tachy_expiration is not null

union all

select
  concat(c.id::text, ':visite') as id,
  c.id as conducteur_id,
  'visite_medicale_expiration'::text as alert_type,
  'Visite medicale a renouveler'::text as label,
  c.visite_medicale_expiration as due_on,
  (c.visite_medicale_expiration - current_date) as days_remaining
from public.conducteurs c
where c.visite_medicale_expiration is not null

union all

select
  concat(d.id::text, ':doc') as id,
  d.conducteur_id,
  'document_expiration'::text as alert_type,
  d.title as label,
  d.expires_at as due_on,
  (d.expires_at - current_date) as days_remaining
from public.conducteur_documents d
where d.expires_at is not null
  and d.archived_at is null;

alter table public.conducteur_documents enable row level security;
alter table public.conducteur_evenements_rh enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conducteur_documents'
      and policyname = 'conducteur_documents_rw_rh'
  ) then
    create policy conducteur_documents_rw_rh
      on public.conducteur_documents
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'rh'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'rh'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'conducteur_evenements_rh'
      and policyname = 'conducteur_evenements_rh_rw_rh'
  ) then
    create policy conducteur_evenements_rh_rw_rh
      on public.conducteur_evenements_rh
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'rh'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'rh'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('conducteur-documents', 'conducteur-documents', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'conducteur_documents_storage_select'
  ) then
    create policy conducteur_documents_storage_select
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'conducteur-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'rh')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'conducteur_documents_storage_insert'
  ) then
    create policy conducteur_documents_storage_insert
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'conducteur-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'rh')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'conducteur_documents_storage_update'
  ) then
    create policy conducteur_documents_storage_update
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'conducteur-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'rh')
      )
      with check (
        bucket_id = 'conducteur-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'rh')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'conducteur_documents_storage_delete'
  ) then
    create policy conducteur_documents_storage_delete
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'conducteur-documents'
        and public.current_app_role() in ('admin', 'dirigeant', 'rh')
      );
  end if;
end $$;
