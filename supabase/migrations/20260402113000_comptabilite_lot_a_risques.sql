-- Lot A comptabilite - fermeture des risques restants
-- Objectifs:
-- 1) Couvrir les factures fournisseurs + ecritures automatiques AC (TVA deductible)
-- 2) Ajouter vues Bilan + Compte de resultat
-- 3) Ajouter une fonction d'export FEC tracee (checksum + journalisation)

-- 1) Factures fournisseurs (socle)
create table if not exists public.compta_factures_fournisseurs (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  fournisseur_nom text not null,
  date_facture date not null,
  date_echeance date null,
  date_paiement date null,
  montant_ht numeric(14,2) not null default 0,
  montant_tva numeric(14,2) not null default 0,
  montant_ttc numeric(14,2) generated always as (montant_ht + montant_tva) stored,
  statut text not null default 'recu',
  mode_paiement text null,
  compte_charge_code text not null default '606100' references public.compta_plan_comptable(code_compte),
  compte_tva_deductible_code text not null default '445660' references public.compta_plan_comptable(code_compte),
  compte_fournisseur_code text not null default '401000' references public.compta_plan_comptable(code_compte),
  notes text null,
  source_table text null,
  source_id uuid null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint compta_ff_statut_chk check (statut in ('recu', 'validee', 'payee', 'annulee')),
  constraint compta_ff_montants_chk check (montant_ht >= 0 and montant_tva >= 0)
);

create index if not exists idx_compta_ff_date_facture on public.compta_factures_fournisseurs(date_facture);
create index if not exists idx_compta_ff_statut on public.compta_factures_fournisseurs(statut);

create trigger trg_compta_ff_touch
before update on public.compta_factures_fournisseurs
for each row execute function public.compta_touch_updated_at();

-- 2) Ecriture automatique pour facture fournisseur
create or replace function public.compta_generer_ecriture_facture_fournisseur(p_facture_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_facture public.compta_factures_fournisseurs;
  v_piece_id uuid;
  v_ecriture_id uuid;
  v_journal_id uuid;
  v_mvt integer;
  v_ht numeric(14,2);
  v_tva numeric(14,2);
  v_ttc numeric(14,2);
begin
  select * into v_facture
  from public.compta_factures_fournisseurs
  where id = p_facture_id;

  if v_facture.id is null then
    return null;
  end if;

  if v_facture.statut in ('recu', 'annulee') then
    return null;
  end if;

  -- Eviter les doublons de generation
  select id into v_piece_id
  from public.compta_pieces
  where source_table = 'compta_factures_fournisseurs'
    and source_id = v_facture.id
  limit 1;

  if v_piece_id is not null then
    return v_piece_id;
  end if;

  select id into v_journal_id
  from public.compta_journaux
  where code_journal = 'AC'
  limit 1;

  if v_journal_id is null then
    raise exception 'Journal AC introuvable';
  end if;

  v_ht := coalesce(v_facture.montant_ht, 0)::numeric(14,2);
  v_tva := coalesce(v_facture.montant_tva, 0)::numeric(14,2);
  v_ttc := coalesce(v_facture.montant_ttc, v_ht + v_tva)::numeric(14,2);

  insert into public.compta_pieces(type_piece, numero_piece, date_piece, source_table, source_id)
  values ('facture_fournisseur', v_facture.numero, v_facture.date_facture, 'compta_factures_fournisseurs', v_facture.id)
  returning id into v_piece_id;

  select coalesce(max(numero_mouvement), 0) + 1 into v_mvt
  from public.compta_ecritures
  where journal_id = v_journal_id
    and exercice = extract(year from v_facture.date_facture)::integer;

  insert into public.compta_ecritures(
    journal_id, piece_id, date_ecriture, exercice, numero_mouvement, libelle, statut, created_by
  )
  values (
    v_journal_id,
    v_piece_id,
    v_facture.date_facture,
    extract(year from v_facture.date_facture)::integer,
    v_mvt,
    'Facture fournisseur ' || v_facture.numero || ' - ' || v_facture.fournisseur_nom,
    'brouillon',
    auth.uid()
  )
  returning id into v_ecriture_id;

  -- Ecriture achat: charge + TVA deductible au debit, fournisseur au credit
  insert into public.compta_ecriture_lignes(ecriture_id, ordre, compte_code, libelle_ligne, debit, credit)
  values
    (v_ecriture_id, 1, v_facture.compte_charge_code, 'Charge facture ' || v_facture.numero, v_ht, 0),
    (v_ecriture_id, 2, v_facture.compte_tva_deductible_code, 'TVA deductible facture ' || v_facture.numero, v_tva, 0),
    (v_ecriture_id, 3, v_facture.compte_fournisseur_code, 'Fournisseur facture ' || v_facture.numero, 0, v_ttc);

  perform public.compta_valider_ecriture(v_ecriture_id);

  return v_piece_id;
end;
$$;

create or replace function public.compta_trigger_facture_fournisseur_to_ecriture()
returns trigger
language plpgsql
as $$
begin
  if new.statut in ('validee', 'payee') then
    perform public.compta_generer_ecriture_facture_fournisseur(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_compta_facture_fournisseur_to_ecriture on public.compta_factures_fournisseurs;
create trigger trg_compta_facture_fournisseur_to_ecriture
after insert or update of statut, montant_ht, montant_tva on public.compta_factures_fournisseurs
for each row execute function public.compta_trigger_facture_fournisseur_to_ecriture();

create trigger trg_compta_audit_factures_fournisseurs
after insert or update or delete on public.compta_factures_fournisseurs
for each row execute function public.compta_audit_trigger();

-- 3) Vues Bilan + Compte de resultat
create or replace view public.vue_compta_compte_resultat as
with soldes as (
  select
    e.exercice,
    l.compte_code,
    sum(l.debit)::numeric(14,2) as debit,
    sum(l.credit)::numeric(14,2) as credit
  from public.compta_ecriture_lignes l
  join public.compta_ecritures e on e.id = l.ecriture_id
  where e.statut = 'validee'
  group by e.exercice, l.compte_code
)
select
  s.exercice,
  case
    when s.compte_code like '6%' then 'charges'
    when s.compte_code like '7%' then 'produits'
    else 'hors_compte_resultat'
  end as categorie,
  s.compte_code,
  pc.libelle as compte_libelle,
  s.debit,
  s.credit,
  case
    when s.compte_code like '6%' then (s.debit - s.credit)
    when s.compte_code like '7%' then (s.credit - s.debit)
    else 0
  end::numeric(14,2) as solde_gestion
from soldes s
join public.compta_plan_comptable pc on pc.code_compte = s.compte_code
where s.compte_code like '6%' or s.compte_code like '7%';

create or replace view public.vue_compta_compte_resultat_synthese as
with lignes as (
  select
    exercice,
    sum(case when categorie = 'produits' then solde_gestion else 0 end)::numeric(14,2) as total_produits,
    sum(case when categorie = 'charges' then solde_gestion else 0 end)::numeric(14,2) as total_charges
  from public.vue_compta_compte_resultat
  group by exercice
)
select
  exercice,
  total_produits,
  total_charges,
  (total_produits - total_charges)::numeric(14,2) as resultat_net
from lignes;

create or replace view public.vue_compta_bilan as
with soldes as (
  select
    e.exercice,
    l.compte_code,
    sum(l.debit - l.credit)::numeric(14,2) as solde
  from public.compta_ecriture_lignes l
  join public.compta_ecritures e on e.id = l.ecriture_id
  where e.statut = 'validee'
  group by e.exercice, l.compte_code
)
select
  s.exercice,
  s.compte_code,
  pc.libelle as compte_libelle,
  case
    when s.compte_code like '1%' then 'passif'
    when s.compte_code like '2%' then 'actif'
    when s.compte_code like '3%' then 'actif'
    when s.compte_code like '4%' then case when s.solde >= 0 then 'actif' else 'passif' end
    when s.compte_code like '5%' then case when s.solde >= 0 then 'actif' else 'passif' end
    else 'hors_bilan'
  end as section_bilan,
  abs(s.solde)::numeric(14,2) as montant
from soldes s
join public.compta_plan_comptable pc on pc.code_compte = s.compte_code
where s.compte_code like '1%'
   or s.compte_code like '2%'
   or s.compte_code like '3%'
   or s.compte_code like '4%'
   or s.compte_code like '5%';

create or replace view public.vue_compta_bilan_synthese as
select
  exercice,
  sum(case when section_bilan = 'actif' then montant else 0 end)::numeric(14,2) as total_actif,
  sum(case when section_bilan = 'passif' then montant else 0 end)::numeric(14,2) as total_passif,
  (sum(case when section_bilan = 'actif' then montant else 0 end) -
   sum(case when section_bilan = 'passif' then montant else 0 end))::numeric(14,2) as ecart
from public.vue_compta_bilan
group by exercice;

-- 4) Export FEC trace (v1)
create or replace function public.compta_export_fec_v1(p_exercice integer)
returns table (
  journal_code_exercice text,
  journal_code text,
  journal_lib text,
  ecriture_date text,
  ecriture_num text,
  piece_ref text,
  piece_date text,
  compte_num text,
  compte_lib text,
  comp_aux_lib text,
  ecriture_lib text,
  debit numeric,
  credit numeric,
  devise text,
  i_piece text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checksum text;
  v_payload text;
begin
  select string_agg(
           concat_ws('|',
             v.journal_code_exercice,
             v.journal_code,
             v.journal_lib,
             v.ecriture_date,
             v.ecriture_num,
             v.piece_ref,
             v.piece_date,
             v.compte_num,
             v.compte_lib,
             v.comp_aux_lib,
             v.ecriture_lib,
             v.debit::text,
             v.credit::text,
             v.devise,
             v.i_piece
           ),
           E'\n' order by v.ecriture_date, v.ecriture_num, v.compte_num
         )
  into v_payload
  from public.vue_compta_fec_v1 v
  where split_part(v.journal_code_exercice, '-', 1)::integer = p_exercice;

  v_checksum := encode(digest(coalesce(v_payload, ''), 'sha256'), 'hex');

  insert into public.compta_fec_exports(exercice, checksum_sha256, chemin_fichier, genere_par)
  values (p_exercice, v_checksum, null, auth.uid());

  return query
  select
    v.journal_code_exercice,
    v.journal_code,
    v.journal_lib,
    v.ecriture_date,
    v.ecriture_num,
    v.piece_ref,
    v.piece_date,
    v.compte_num,
    v.compte_lib,
    v.comp_aux_lib,
    v.ecriture_lib,
    v.debit,
    v.credit,
    v.devise,
    v.i_piece
  from public.vue_compta_fec_v1 v
  where split_part(v.journal_code_exercice, '-', 1)::integer = p_exercice
  order by v.ecriture_date, v.ecriture_num, v.compte_num;
end;
$$;

-- 5) RLS sur table fournisseurs
alter table public.compta_factures_fournisseurs enable row level security;

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
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'compta_factures_fournisseurs'
        and policyname = 'compta_ff_read'
    ) then
      execute 'create policy compta_ff_read on public.compta_factures_fournisseurs for select to authenticated using (auth.uid() is not null)';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'compta_factures_fournisseurs'
        and policyname = 'compta_ff_rw'
    ) then
      execute 'create policy compta_ff_rw on public.compta_factures_fournisseurs for all to authenticated using (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation'')) with check (public.get_user_role() in (''admin'',''dirigeant'',''comptable'',''facturation''))';
    end if;
  else
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'compta_factures_fournisseurs'
        and policyname = 'compta_ff_read'
    ) then
      execute 'create policy compta_ff_read on public.compta_factures_fournisseurs for select to authenticated using (auth.uid() is not null)';
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'compta_factures_fournisseurs'
        and policyname = 'compta_ff_rw'
    ) then
      execute 'create policy compta_ff_rw on public.compta_factures_fournisseurs for all to authenticated using (auth.uid() is not null) with check (auth.uid() is not null)';
    end if;
  end if;
end
$$;
