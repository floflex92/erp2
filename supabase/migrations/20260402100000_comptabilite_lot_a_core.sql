-- Lot A comptabilite: socle legal et operationnel
-- Perimetre:
-- - Comptabilite generale (journaux, plan comptable, ecritures, lignes)
-- - Verrouillage des ecritures validees
-- - Journal d audit append-only
-- - TVA (regles/periodes/lignes)
-- - Vues balance, grand livre, FEC v1
-- - Generation automatique des ecritures depuis factures

create extension if not exists pgcrypto;

-- 1) Referentiels
create table if not exists public.compta_journaux (
  id uuid primary key default gen_random_uuid(),
  code_journal text not null unique,
  libelle text not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_journaux_code_chk check (code_journal ~ '^[A-Z0-9_]{2,10}$')
);

insert into public.compta_journaux (code_journal, libelle)
values
  ('AC', 'Journal achats'),
  ('VT', 'Journal ventes'),
  ('BQ', 'Journal banque'),
  ('CA', 'Journal caisse'),
  ('OD', 'Operations diverses')
on conflict (code_journal) do nothing;

create table if not exists public.compta_plan_comptable (
  code_compte text primary key,
  libelle text not null,
  classe integer not null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_plan_code_chk check (code_compte ~ '^[0-9]{2,8}$'),
  constraint compta_plan_classe_chk check (classe between 1 and 8)
);

insert into public.compta_plan_comptable (code_compte, libelle, classe)
values
  ('401000', 'Fournisseurs', 4),
  ('411000', 'Clients', 4),
  ('445660', 'TVA deductible', 4),
  ('445710', 'TVA collectee', 4),
  ('512000', 'Banque', 5),
  ('530000', 'Caisse', 5),
  ('606100', 'Achats non stockes', 6),
  ('611000', 'Sous-traitance generale', 6),
  ('625100', 'Deplacements', 6),
  ('706000', 'Prestations de services', 7)
on conflict (code_compte) do nothing;

create table if not exists public.compta_tva_regles (
  id uuid primary key default gen_random_uuid(),
  code_tva text not null unique,
  taux numeric(6,3) not null,
  regime text not null,
  compte_collectee text not null references public.compta_plan_comptable(code_compte),
  compte_deductible text not null references public.compta_plan_comptable(code_compte),
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_tva_regime_chk check (regime in ('national', 'intracom', 'export'))
);

insert into public.compta_tva_regles (code_tva, taux, regime, compte_collectee, compte_deductible)
values
  ('TVA_20_NAT', 20.000, 'national', '445710', '445660'),
  ('TVA_10_NAT', 10.000, 'national', '445710', '445660'),
  ('TVA_55_NAT', 5.500, 'national', '445710', '445660'),
  ('TVA_21_NAT', 2.100, 'national', '445710', '445660'),
  ('TVA_0_INTRACOM', 0.000, 'intracom', '445710', '445660'),
  ('TVA_0_EXPORT', 0.000, 'export', '445710', '445660')
on conflict (code_tva) do nothing;

-- 2) Pieces, ecritures, lignes
create table if not exists public.compta_pieces (
  id uuid primary key default gen_random_uuid(),
  type_piece text not null,
  numero_piece text not null,
  date_piece date not null default current_date,
  source_table text null,
  source_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_piece_type_chk check (type_piece in ('facture_client', 'facture_fournisseur', 'od', 'banque', 'caisse')),
  constraint compta_piece_unique unique (type_piece, numero_piece)
);

create table if not exists public.compta_ecritures (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references public.compta_journaux(id),
  piece_id uuid null references public.compta_pieces(id) on delete set null,
  date_ecriture date not null default current_date,
  exercice integer not null default extract(year from now())::integer,
  numero_mouvement integer not null,
  libelle text not null,
  statut text not null default 'brouillon',
  valide_at timestamptz null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_ecriture_statut_chk check (statut in ('brouillon', 'validee', 'annulee')),
  constraint compta_ecriture_mouvement_unique unique (journal_id, exercice, numero_mouvement)
);

create table if not exists public.compta_ecriture_lignes (
  id uuid primary key default gen_random_uuid(),
  ecriture_id uuid not null references public.compta_ecritures(id) on delete cascade,
  ordre integer not null default 1,
  compte_code text not null references public.compta_plan_comptable(code_compte),
  tiers_client_id uuid null references public.clients(id) on delete set null,
  libelle_ligne text null,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0,
  devise text not null default 'EUR',
  axe_camion_id uuid null,
  axe_chauffeur_id uuid null,
  axe_tournee_id uuid null,
  axe_client_id uuid null references public.clients(id) on delete set null,
  axe_mission_id uuid null references public.ordres_transport(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_lignes_debit_credit_chk check (
    debit >= 0 and credit >= 0 and not (debit > 0 and credit > 0)
  )
);

create index if not exists idx_compta_lignes_ecriture on public.compta_ecriture_lignes(ecriture_id, ordre);
create index if not exists idx_compta_lignes_compte on public.compta_ecriture_lignes(compte_code);

-- 3) TVA declarative
create table if not exists public.compta_tva_periodes (
  id uuid primary key default gen_random_uuid(),
  annee integer not null,
  periode_type text not null,
  periode_index integer not null,
  date_debut date not null,
  date_fin date not null,
  statut text not null default 'ouverte',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_tva_periode_type_chk check (periode_type in ('mensuel', 'trimestriel', 'annuel')),
  constraint compta_tva_statut_chk check (statut in ('ouverte', 'cloturee', 'declaree')),
  constraint compta_tva_periode_unique unique (annee, periode_type, periode_index)
);

create table if not exists public.compta_tva_lignes (
  id uuid primary key default gen_random_uuid(),
  periode_id uuid not null references public.compta_tva_periodes(id) on delete cascade,
  code_case text not null,
  base_ht numeric(14,2) not null default 0,
  montant_tva numeric(14,2) not null default 0,
  origine text not null default 'manuel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_tva_lignes_unique unique (periode_id, code_case)
);

-- 4) Audit + FEC
create table if not exists public.compta_audit_evenements (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity text not null,
  entity_id uuid null,
  payload_json jsonb not null default '{}'::jsonb,
  actor_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  hash_prev text null,
  hash_current text not null
);

create table if not exists public.compta_fec_exports (
  id uuid primary key default gen_random_uuid(),
  exercice integer not null,
  date_export timestamptz not null default now(),
  checksum_sha256 text not null,
  chemin_fichier text null,
  genere_par uuid null references auth.users(id) on delete set null
);

-- 5) Fonctions utilitaires
create or replace function public.compta_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.compta_is_balancee(p_ecriture_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(sum(debit), 0) = coalesce(sum(credit), 0)
  from public.compta_ecriture_lignes
  where ecriture_id = p_ecriture_id;
$$;

create or replace function public.compta_lock_if_validee()
returns trigger
language plpgsql
as $$
declare
  v_statut text;
begin
  if tg_table_name = 'compta_ecritures' then
    if old.statut = 'validee' then
      raise exception 'Ecriture validee non modifiable. Utiliser une contre-ecriture.';
    end if;
    return old;
  end if;

  if tg_table_name = 'compta_ecriture_lignes' then
    select e.statut into v_statut
    from public.compta_ecritures e
    where e.id = old.ecriture_id;

    if v_statut = 'validee' then
      raise exception 'Lignes d une ecriture validee non modifiables. Utiliser une contre-ecriture.';
    end if;
    return old;
  end if;

  return old;
end;
$$;

create or replace function public.compta_valider_ecriture(p_ecriture_id uuid)
returns public.compta_ecritures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_record public.compta_ecritures;
begin
  select count(*) into v_count
  from public.compta_ecriture_lignes
  where ecriture_id = p_ecriture_id;

  if v_count < 2 then
    raise exception 'Validation impossible: au moins 2 lignes comptables requises.';
  end if;

  if not public.compta_is_balancee(p_ecriture_id) then
    raise exception 'Validation impossible: debit et credit non equilibres.';
  end if;

  update public.compta_ecritures
  set statut = 'validee',
      valide_at = now(),
      updated_at = now()
  where id = p_ecriture_id
  returning * into v_record;

  if v_record.id is null then
    raise exception 'Ecriture introuvable.';
  end if;

  return v_record;
end;
$$;

create or replace function public.compta_audit_append_only_guard()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Audit comptable append-only: update/delete interdits.';
end;
$$;

create or replace function public.compta_log_event(
  p_event_type text,
  p_entity text,
  p_entity_id uuid,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev text;
  v_current text;
  v_actor uuid := auth.uid();
begin
  select hash_current into v_prev
  from public.compta_audit_evenements
  order by created_at desc, id desc
  limit 1;

  v_current := encode(
    digest(
      coalesce(v_prev, '') || coalesce(p_payload::text, '{}') || coalesce(v_actor::text, '') || clock_timestamp()::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.compta_audit_evenements(
    event_type, entity, entity_id, payload_json, actor_user_id, hash_prev, hash_current
  )
  values (
    p_event_type, p_entity, p_entity_id, coalesce(p_payload, '{}'::jsonb), v_actor, v_prev, v_current
  );
end;
$$;

create or replace function public.compta_audit_trigger()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.compta_log_event('insert', tg_table_name, new.id, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.compta_log_event('update', tg_table_name, new.id, jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new)));
    return new;
  else
    perform public.compta_log_event('delete', tg_table_name, old.id, to_jsonb(old));
    return old;
  end if;
end;
$$;

-- 6) Auto-generation ecriture facture client
create or replace function public.compta_generer_ecriture_facture(p_facture_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facture public.factures;
  v_piece_id uuid;
  v_ecriture_id uuid;
  v_journal_id uuid;
  v_mvt integer;
  v_ttc numeric(14,2);
  v_tva numeric(14,2);
  v_ht numeric(14,2);
begin
  select * into v_facture
  from public.factures
  where id = p_facture_id;

  if v_facture.id is null then
    return null;
  end if;

  if v_facture.statut in ('brouillon', 'annulee') then
    return null;
  end if;

  select id into v_piece_id
  from public.compta_pieces
  where source_table = 'factures'
    and source_id = v_facture.id
  limit 1;

  if v_piece_id is not null then
    return v_piece_id;
  end if;

  select id into v_journal_id
  from public.compta_journaux
  where code_journal = 'VT'
  limit 1;

  if v_journal_id is null then
    raise exception 'Journal VT introuvable';
  end if;

  v_ht := coalesce(v_facture.montant_ht, 0)::numeric(14,2);
  v_tva := coalesce(v_facture.montant_tva, 0)::numeric(14,2);
  v_ttc := coalesce(v_facture.montant_ttc, v_ht + v_tva)::numeric(14,2);

  insert into public.compta_pieces(type_piece, numero_piece, date_piece, source_table, source_id)
  values ('facture_client', v_facture.numero, v_facture.date_emission, 'factures', v_facture.id)
  returning id into v_piece_id;

  select coalesce(max(numero_mouvement), 0) + 1 into v_mvt
  from public.compta_ecritures
  where journal_id = v_journal_id
    and exercice = extract(year from v_facture.date_emission)::integer;

  insert into public.compta_ecritures(
    journal_id, piece_id, date_ecriture, exercice, numero_mouvement, libelle, statut, created_by
  )
  values (
    v_journal_id,
    v_piece_id,
    v_facture.date_emission,
    extract(year from v_facture.date_emission)::integer,
    v_mvt,
    'Facture client ' || v_facture.numero,
    'brouillon',
    auth.uid()
  )
  returning id into v_ecriture_id;

  insert into public.compta_ecriture_lignes(ecriture_id, ordre, compte_code, tiers_client_id, libelle_ligne, debit, credit, axe_client_id, axe_mission_id)
  values
    (v_ecriture_id, 1, '411000', v_facture.client_id, 'Client ' || v_facture.numero, v_ttc, 0, v_facture.client_id, v_facture.ot_id),
    (v_ecriture_id, 2, '706000', v_facture.client_id, 'Produit facture ' || v_facture.numero, 0, v_ht, v_facture.client_id, v_facture.ot_id),
    (v_ecriture_id, 3, '445710', v_facture.client_id, 'TVA facture ' || v_facture.numero, 0, v_tva, v_facture.client_id, v_facture.ot_id);

  perform public.compta_valider_ecriture(v_ecriture_id);

  return v_piece_id;
end;
$$;

create or replace function public.compta_trigger_facture_to_ecriture()
returns trigger
language plpgsql
as $$
begin
  if new.statut in ('envoyee', 'payee') then
    perform public.compta_generer_ecriture_facture(new.id);
  end if;
  return new;
end;
$$;

-- 7) Vues comptables
create or replace view public.vue_compta_balance as
select
  e.exercice,
  l.compte_code,
  pc.libelle as compte_libelle,
  sum(l.debit)::numeric(14,2) as total_debit,
  sum(l.credit)::numeric(14,2) as total_credit,
  (sum(l.debit) - sum(l.credit))::numeric(14,2) as solde
from public.compta_ecriture_lignes l
join public.compta_ecritures e on e.id = l.ecriture_id
join public.compta_plan_comptable pc on pc.code_compte = l.compte_code
where e.statut = 'validee'
group by e.exercice, l.compte_code, pc.libelle;

create or replace view public.vue_compta_grand_livre as
select
  e.exercice,
  e.date_ecriture,
  j.code_journal,
  e.numero_mouvement,
  e.libelle as ecriture_libelle,
  l.ordre,
  l.compte_code,
  pc.libelle as compte_libelle,
  l.libelle_ligne,
  l.debit,
  l.credit,
  sum(l.debit - l.credit) over (
    partition by e.exercice, l.compte_code
    order by e.date_ecriture, e.numero_mouvement, l.ordre
    rows between unbounded preceding and current row
  )::numeric(14,2) as solde_cumule
from public.compta_ecriture_lignes l
join public.compta_ecritures e on e.id = l.ecriture_id
join public.compta_journaux j on j.id = e.journal_id
join public.compta_plan_comptable pc on pc.code_compte = l.compte_code
where e.statut = 'validee';

create or replace view public.vue_compta_fec_v1 as
select
  e.exercice::text as journal_code_exercice,
  j.code_journal as journal_code,
  j.libelle as journal_lib,
  to_char(e.date_ecriture, 'YYYYMMDD') as ecriture_date,
  (j.code_journal || '-' || e.exercice::text || '-' || lpad(e.numero_mouvement::text, 6, '0')) as ecriture_num,
  coalesce(p.numero_piece, e.libelle) as piece_ref,
  to_char(coalesce(p.date_piece, e.date_ecriture), 'YYYYMMDD') as piece_date,
  l.compte_code as compte_num,
  pc.libelle as compte_lib,
  coalesce(c.nom, '') as comp_aux_lib,
  e.libelle as ecriture_lib,
  round(l.debit, 2) as debit,
  round(l.credit, 2) as credit,
  'EUR'::text as devise,
  coalesce(p.numero_piece, '') as i_piece
from public.compta_ecriture_lignes l
join public.compta_ecritures e on e.id = l.ecriture_id
join public.compta_journaux j on j.id = e.journal_id
join public.compta_plan_comptable pc on pc.code_compte = l.compte_code
left join public.compta_pieces p on p.id = e.piece_id
left join public.clients c on c.id = l.tiers_client_id
where e.statut = 'validee';

-- 8) Triggers
create trigger trg_compta_journaux_touch
before update on public.compta_journaux
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_plan_touch
before update on public.compta_plan_comptable
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_tva_regles_touch
before update on public.compta_tva_regles
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_pieces_touch
before update on public.compta_pieces
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_ecritures_touch
before update on public.compta_ecritures
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_lignes_touch
before update on public.compta_ecriture_lignes
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_tva_periodes_touch
before update on public.compta_tva_periodes
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_tva_lignes_touch
before update on public.compta_tva_lignes
for each row execute function public.compta_touch_updated_at();

create trigger trg_compta_lock_ecritures_update
before update on public.compta_ecritures
for each row execute function public.compta_lock_if_validee();

create trigger trg_compta_lock_ecritures_delete
before delete on public.compta_ecritures
for each row execute function public.compta_lock_if_validee();

create trigger trg_compta_lock_lignes_update
before update on public.compta_ecriture_lignes
for each row execute function public.compta_lock_if_validee();

create trigger trg_compta_lock_lignes_delete
before delete on public.compta_ecriture_lignes
for each row execute function public.compta_lock_if_validee();

create trigger trg_compta_audit_ecritures
after insert or update or delete on public.compta_ecritures
for each row execute function public.compta_audit_trigger();

create trigger trg_compta_audit_lignes
after insert or update or delete on public.compta_ecriture_lignes
for each row execute function public.compta_audit_trigger();

create trigger trg_compta_audit_append_only_guard
before update or delete on public.compta_audit_evenements
for each row execute function public.compta_audit_append_only_guard();

drop trigger if exists trg_factures_to_compta on public.factures;
create trigger trg_factures_to_compta
after insert or update of statut, montant_ht, montant_tva, montant_ttc on public.factures
for each row execute function public.compta_trigger_facture_to_ecriture();

-- 9) RLS
alter table public.compta_journaux enable row level security;
alter table public.compta_plan_comptable enable row level security;
alter table public.compta_tva_regles enable row level security;
alter table public.compta_pieces enable row level security;
alter table public.compta_ecritures enable row level security;
alter table public.compta_ecriture_lignes enable row level security;
alter table public.compta_tva_periodes enable row level security;
alter table public.compta_tva_lignes enable row level security;
alter table public.compta_audit_evenements enable row level security;
alter table public.compta_fec_exports enable row level security;

do $$
declare
  has_role_fn boolean;
begin
  select exists(
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_user_role'
  ) into has_role_fn;

  if has_role_fn then
    execute 'create policy compta_read_journaux on public.compta_journaux for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_journaux on public.compta_journaux for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation''))';

    execute 'create policy compta_read_plan on public.compta_plan_comptable for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_plan on public.compta_plan_comptable for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable''))';

    execute 'create policy compta_read_tva_regles on public.compta_tva_regles for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_tva_regles on public.compta_tva_regles for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable''))';

    execute 'create policy compta_read_pieces on public.compta_pieces for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_pieces on public.compta_pieces for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation''))';

    execute 'create policy compta_read_ecritures on public.compta_ecritures for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_ecritures on public.compta_ecritures for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation''))';

    execute 'create policy compta_read_lignes on public.compta_ecriture_lignes for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_lignes on public.compta_ecriture_lignes for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation''))';

    execute 'create policy compta_read_tva_periodes on public.compta_tva_periodes for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_tva_periodes on public.compta_tva_periodes for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable''))';

    execute 'create policy compta_read_tva_lignes on public.compta_tva_lignes for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_tva_lignes on public.compta_tva_lignes for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable''))';

    execute 'create policy compta_read_audit on public.compta_audit_evenements for select to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable''))';
    execute 'create policy compta_insert_audit on public.compta_audit_evenements for insert to authenticated with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation''))';

    execute 'create policy compta_read_fec_exports on public.compta_fec_exports for select to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable''))';
    execute 'create policy compta_rw_fec_exports on public.compta_fec_exports for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable''))';
  else
    execute 'create policy compta_read_journaux on public.compta_journaux for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_journaux on public.compta_journaux for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_plan on public.compta_plan_comptable for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_plan on public.compta_plan_comptable for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_tva_regles on public.compta_tva_regles for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_tva_regles on public.compta_tva_regles for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_pieces on public.compta_pieces for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_pieces on public.compta_pieces for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_ecritures on public.compta_ecritures for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_ecritures on public.compta_ecritures for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_lignes on public.compta_ecriture_lignes for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_lignes on public.compta_ecriture_lignes for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_tva_periodes on public.compta_tva_periodes for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_tva_periodes on public.compta_tva_periodes for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_tva_lignes on public.compta_tva_lignes for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_tva_lignes on public.compta_tva_lignes for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';

    execute 'create policy compta_read_audit on public.compta_audit_evenements for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_insert_audit on public.compta_audit_evenements for insert to authenticated with check (auth.uid() is not null)';

    execute 'create policy compta_read_fec_exports on public.compta_fec_exports for select to authenticated using (auth.uid() is not null)';
    execute 'create policy compta_rw_fec_exports on public.compta_fec_exports for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';
  end if;
end
$$;
