-- Stabilisation module Courses / Transports
-- Objectif: structurer les courses, fiabiliser le statut transport, ajouter le suivi affretement
-- et normaliser les adresses de chargement / livraison.

create table if not exists public.sites_logistiques (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  adresse text not null,
  latitude numeric(10,7) null,
  longitude numeric(10,7) null,
  entreprise_id uuid null references public.clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sites_logistiques_nom_idx
  on public.sites_logistiques(lower(nom));
create index if not exists sites_logistiques_entreprise_idx
  on public.sites_logistiques(entreprise_id);
create unique index if not exists sites_logistiques_unique_idx
  on public.sites_logistiques(lower(nom), lower(adresse), coalesce(entreprise_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.ordres_transport_statut_history (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  statut_ancien text null,
  statut_nouveau text not null,
  commentaire text null,
  changed_by uuid null references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ordres_transport_statut_history_ot_idx
  on public.ordres_transport_statut_history(ot_id, changed_at desc);

create table if not exists public.transport_reference_sequences (
  period_yyyymm text primary key,
  last_value bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.ordres_transport
  add column if not exists source_course text,
  add column if not exists reference_transport text,
  add column if not exists reference_externe text,
  add column if not exists statut_transport text,
  add column if not exists donneur_ordre_id uuid,
  add column if not exists est_affretee boolean,
  add column if not exists affreteur_id uuid,
  add column if not exists chargement_site_id uuid,
  add column if not exists livraison_site_id uuid;

update public.ordres_transport
set
  source_course = coalesce(source_course, 'manuel'),
  statut_transport = coalesce(
    statut_transport,
    case
      when statut = 'brouillon' then 'en_attente_validation'
      when statut = 'confirme' then 'valide'
      when statut = 'planifie' then 'planifie'
      when statut = 'en_cours' then 'en_transit'
      when statut in ('livre', 'facture') then 'termine'
      when statut = 'annule' then 'annule'
      else 'en_attente_planification'
    end
  ),
  donneur_ordre_id = coalesce(donneur_ordre_id, client_id),
  est_affretee = coalesce(est_affretee, false)
where
  source_course is null
  or statut_transport is null
  or donneur_ordre_id is null
  or est_affretee is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_source_course_check'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_source_course_check
      check (source_course in ('client', 'bourse_fret', 'manuel'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_statut_transport_check'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_statut_transport_check
      check (statut_transport in (
        'en_attente_validation',
        'valide',
        'en_attente_planification',
        'planifie',
        'en_cours_approche_chargement',
        'en_chargement',
        'en_transit',
        'en_livraison',
        'termine',
        'annule'
      ));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_donneur_ordre_fkey'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_donneur_ordre_fkey
      foreign key (donneur_ordre_id) references public.clients(id) on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_affreteur_fkey'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_affreteur_fkey
      foreign key (affreteur_id) references public.affreteur_onboardings(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_chargement_site_fkey'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_chargement_site_fkey
      foreign key (chargement_site_id) references public.sites_logistiques(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_livraison_site_fkey'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_livraison_site_fkey
      foreign key (livraison_site_id) references public.sites_logistiques(id) on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_affretement_consistency_check'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_affretement_consistency_check
      check ((est_affretee = true and affreteur_id is not null) or (est_affretee = false and affreteur_id is null));
  end if;
end $$;

alter table public.ordres_transport
  alter column source_course set default 'manuel',
  alter column source_course set not null,
  alter column statut_transport set default 'en_attente_validation',
  alter column statut_transport set not null,
  alter column donneur_ordre_id set not null,
  alter column est_affretee set default false,
  alter column est_affretee set not null;

create unique index if not exists ordres_transport_reference_transport_uidx
  on public.ordres_transport(reference_transport)
  where reference_transport is not null;
create index if not exists ordres_transport_statut_transport_idx
  on public.ordres_transport(statut_transport, created_at desc);
create index if not exists ordres_transport_affretement_idx
  on public.ordres_transport(est_affretee, affreteur_id, date_chargement_prevue);
create index if not exists ordres_transport_sites_idx
  on public.ordres_transport(chargement_site_id, livraison_site_id);

create or replace function public.generate_transport_reference(p_donneur_ordre_id uuid default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  period_key text := to_char(now(), 'YYYYMM');
  next_value bigint;
  cfg_code text;
  normalized_code text;
begin
  select
    case
      when c.valeur is null then null
      when jsonb_typeof(c.valeur) = 'string' then c.valeur #>> '{}'
      else c.valeur::text
    end
  into cfg_code
  from public.config_entreprise c
  where c.cle in ('societe_code', 'societe_code_reference_transport', 'code_reference_transport')
  order by case c.cle
    when 'societe_code' then 1
    when 'societe_code_reference_transport' then 2
    else 3
  end
  limit 1;

  normalized_code := upper(regexp_replace(coalesce(nullif(trim(cfg_code), ''), 'NXR001'), '[^A-Za-z0-9]+', '', 'g'));
  normalized_code := left(rpad(normalized_code, 6, '0'), 6);

  loop
    update public.transport_reference_sequences
    set
      last_value = last_value + 1,
      updated_at = now()
    where period_yyyymm = period_key
    returning last_value into next_value;

    if found then
      exit;
    end if;

    begin
      insert into public.transport_reference_sequences(period_yyyymm, last_value)
      values (period_key, 1)
      returning last_value into next_value;
      exit;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return format('%s-%s-%s', normalized_code, period_key, lpad(next_value::text, 6, '0'));
end;
$$;

create or replace function public.ordres_transport_before_insert_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.donneur_ordre_id is null then
    new.donneur_ordre_id := new.client_id;
  end if;

  if new.source_course is null then
    new.source_course := 'manuel';
  end if;

  if new.statut_transport is null then
    new.statut_transport := 'en_attente_validation';
  end if;

  if coalesce(new.est_affretee, false) = false and new.affreteur_id is not null then
    new.est_affretee := true;
  end if;

  if coalesce(new.est_affretee, false) = true and new.affreteur_id is null then
    new.est_affretee := false;
  end if;

  if new.reference_transport is null or btrim(new.reference_transport) = '' then
    new.reference_transport := public.generate_transport_reference(new.donneur_ordre_id);
  end if;

  return new;
end;
$$;

create or replace function public.ordres_transport_after_statut_transport_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.statut_transport is distinct from new.statut_transport then
    insert into public.ordres_transport_statut_history(
      ot_id,
      statut_ancien,
      statut_nouveau,
      commentaire,
      changed_by,
      changed_at
    )
    values (
      new.id,
      old.statut_transport,
      new.statut_transport,
      null,
      auth.uid(),
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists ordres_transport_before_insert_defaults_trg on public.ordres_transport;
create trigger ordres_transport_before_insert_defaults_trg
before insert on public.ordres_transport
for each row execute function public.ordres_transport_before_insert_defaults();

drop trigger if exists ordres_transport_after_statut_transport_update_trg on public.ordres_transport;
create trigger ordres_transport_after_statut_transport_update_trg
after update on public.ordres_transport
for each row execute function public.ordres_transport_after_statut_transport_update();

update public.ordres_transport
set reference_transport = public.generate_transport_reference(donneur_ordre_id)
where reference_transport is null or btrim(reference_transport) = '';

insert into public.ordres_transport_statut_history(ot_id, statut_ancien, statut_nouveau, commentaire, changed_by, changed_at)
select
  ot.id,
  null,
  ot.statut_transport,
  'Initialisation historique statut transport',
  null,
  now()
from public.ordres_transport ot
where not exists (
  select 1
  from public.ordres_transport_statut_history h
  where h.ot_id = ot.id
);

create or replace view public.vue_courses_affretement_suivi
with (security_invoker = true) as
select
  ot.id,
  ot.reference,
  ot.reference_transport,
  ot.reference_externe,
  ot.statut,
  ot.statut_transport,
  ot.source_course,
  ot.est_affretee,
  ot.affreteur_id,
  ao.company_name as affreteur_nom,
  ot.donneur_ordre_id,
  do_client.nom as donneur_ordre_nom,
  ot.chargement_site_id,
  slc.nom as chargement_nom,
  slc.adresse as chargement_adresse,
  ot.livraison_site_id,
  sll.nom as livraison_nom,
  sll.adresse as livraison_adresse,
  ot.date_chargement_prevue,
  ot.date_livraison_prevue,
  ot.created_at,
  ot.updated_at
from public.ordres_transport ot
join public.clients do_client on do_client.id = ot.donneur_ordre_id
left join public.affreteur_onboardings ao on ao.id = ot.affreteur_id
left join public.sites_logistiques slc on slc.id = ot.chargement_site_id
left join public.sites_logistiques sll on sll.id = ot.livraison_site_id
where ot.est_affretee = true;

alter table public.sites_logistiques enable row level security;
alter table public.ordres_transport_statut_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'sites_logistiques' and policyname = 'sites_logistiques_rw'
  ) then
    create policy sites_logistiques_rw
      on public.sites_logistiques
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ordres_transport_statut_history' and policyname = 'ordres_transport_statut_history_rw'
  ) then
    create policy ordres_transport_statut_history_rw
      on public.ordres_transport_statut_history
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur', 'conducteur'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'affreteur', 'conducteur_affreteur', 'conducteur'));
  end if;
end $$;

do $$
begin
  perform public.add_updated_at_trigger('public.sites_logistiques');
  perform public.add_updated_at_trigger('public.transport_reference_sequences');
exception
  when undefined_function then
    null;
end $$;
