-- ============================================================
-- Cloture phases compta A -> B -> C
-- Date: 2026-04-13
-- Objectif:
--   A) Conformite: TVA 8.5 + export CA3/CA12 v1
--   B) Exploitation: import releves + rapprochement auto
--   C) Analytique: vues axes et marge par client
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- PHASE A - conformite legale minimale
-- ============================================================

-- A4: completer les taux requis (ajout explicite 8.5)
insert into public.compta_tva_regles (code_tva, taux, regime, compte_collectee, compte_deductible)
values ('TVA_85_NAT', 8.500, 'national', '445710', '445660')
on conflict (code_tva) do update
set
	taux = excluded.taux,
	regime = excluded.regime,
	compte_collectee = excluded.compte_collectee,
	compte_deductible = excluded.compte_deductible,
	actif = true,
	updated_at = now();

-- A4: export declaratif TVA (base CA3/CA12)
create or replace function public.compta_export_tva_declarative_v1(
	p_annee integer,
	p_periode_type text default 'mensuel'
)
returns table (
	annee integer,
	periode_type text,
	periode_index integer,
	date_debut date,
	date_fin date,
	statut text,
	tva_collectee numeric,
	tva_deductible numeric,
	tva_nette numeric
)
language sql
security definer
set search_path = public
as $$
	with periodes as (
		select
			p.id,
			p.annee,
			p.periode_type,
			p.periode_index,
			p.date_debut,
			p.date_fin,
			p.statut
		from public.compta_tva_periodes p
		where p.annee = p_annee
			and p.periode_type = p_periode_type
	),
	agg as (
		select
			l.periode_id,
			sum(case when l.code_case = 'TVA_COLLECTEE' then l.montant_tva else 0 end)::numeric(14,2) as tva_collectee,
			sum(case when l.code_case = 'TVA_DEDUCTIBLE' then l.montant_tva else 0 end)::numeric(14,2) as tva_deductible,
			sum(case when l.code_case = 'TVA_A_PAYER' then l.montant_tva else 0 end)::numeric(14,2) as tva_nette
		from public.compta_tva_lignes l
		group by l.periode_id
	)
	select
		p.annee,
		p.periode_type,
		p.periode_index,
		p.date_debut,
		p.date_fin,
		p.statut,
		coalesce(a.tva_collectee, 0)::numeric(14,2),
		coalesce(a.tva_deductible, 0)::numeric(14,2),
		coalesce(a.tva_nette, coalesce(a.tva_collectee, 0) - coalesce(a.tva_deductible, 0))::numeric(14,2)
	from periodes p
	left join agg a on a.periode_id = p.id
	order by p.periode_index;
$$;

-- ============================================================
-- PHASE B - exploitation / rapprochement bancaire
-- ============================================================

-- B1: import de releves via payload JSON avec dedoublonnage hash
create or replace function public.compta_import_mouvements_bancaires_json(
	p_items jsonb,
	p_compte_bancaire text default 'principal'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	v_item jsonb;
	v_inserted integer := 0;
	v_hash text;
begin
	if p_items is null or jsonb_typeof(p_items) <> 'array' then
		raise exception 'Payload mouvements invalide (array JSON attendu).';
	end if;

	for v_item in
		select value from jsonb_array_elements(p_items)
	loop
		v_hash := encode(
			digest(
				coalesce(v_item->>'date_operation','') || '|' ||
				coalesce(v_item->>'libelle','') || '|' ||
				coalesce(v_item->>'montant','') || '|' ||
				coalesce(v_item->>'reference_banque','') || '|' ||
				coalesce(p_compte_bancaire,''),
				'sha256'
			),
			'hex'
		);

		insert into public.mouvements_bancaires(
			date_operation,
			date_valeur,
			libelle,
			montant,
			solde_apres,
			reference_banque,
			compte_bancaire,
			statut,
			import_hash
		)
		values (
			(v_item->>'date_operation')::date,
			nullif(v_item->>'date_valeur','')::date,
			coalesce(nullif(v_item->>'libelle',''),'Mouvement bancaire'),
			coalesce((v_item->>'montant')::numeric, 0),
			nullif(v_item->>'solde_apres','')::numeric,
			nullif(v_item->>'reference_banque',''),
			p_compte_bancaire,
			'a_rapprocher',
			v_hash
		)
		on conflict (import_hash) do nothing;

		if found then
			v_inserted := v_inserted + 1;
		end if;
	end loop;

	return v_inserted;
end;
$$;

-- B2: proposition de rapprochement automatique simple (montant + fenetre date)
create or replace function public.compta_auto_rapprochements_v1(
	p_tolerance numeric default 1.00,
	p_window_days integer default 10
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
	v_inserted integer := 0;
begin
	with candidats as (
		select
			mb.id as mouvement_id,
			f.id as facture_id,
			coalesce(f.montant_ttc, f.montant_ht, 0)::numeric(14,2) as montant_facture,
			abs(mb.montant - coalesce(f.montant_ttc, f.montant_ht, 0))::numeric(14,2) as ecart,
			row_number() over (
				partition by mb.id
				order by abs(mb.montant - coalesce(f.montant_ttc, f.montant_ht, 0)) asc, f.date_echeance asc nulls last
			) as rn
		from public.mouvements_bancaires mb
		join public.factures f
			on f.statut in ('envoyee', 'en_retard')
		 and f.date_echeance is not null
		 and mb.date_operation between (f.date_echeance - p_window_days) and (f.date_echeance + p_window_days)
		where mb.statut = 'a_rapprocher'
			and mb.montant > 0
			and not exists (
				select 1
				from public.rapprochements_bancaires rb
				where rb.mouvement_bancaire_id = mb.id
			)
			and abs(mb.montant - coalesce(f.montant_ttc, f.montant_ht, 0)) <= p_tolerance
	),
	inserted as (
		insert into public.rapprochements_bancaires(
			mouvement_bancaire_id,
			facture_id,
			montant_rapproche,
			ecart,
			mode,
			commentaire,
			created_by
		)
		select
			c.mouvement_id,
			c.facture_id,
			c.montant_facture,
			c.ecart,
			'auto',
			'Proposition auto: montant/date',
			auth.uid()
		from candidats c
		where c.rn = 1
		returning id
	)
	select count(*) into v_inserted from inserted;

	update public.mouvements_bancaires mb
	set statut = 'rapproche'
	where mb.statut = 'a_rapprocher'
		and exists (
			select 1
			from public.rapprochements_bancaires rb
			where rb.mouvement_bancaire_id = mb.id
		);

	return v_inserted;
end;
$$;

-- ============================================================
-- PHASE C - analytique transport
-- ============================================================

-- C1: vue axes analytiques depuis ecritures validees
create or replace view public.vue_compta_axes_analytique as
select
	e.exercice,
	e.date_ecriture,
	e.journal_id,
	l.axe_camion_id,
	l.axe_chauffeur_id,
	l.axe_tournee_id,
	l.axe_client_id,
	l.axe_mission_id,
	sum(l.debit)::numeric(14,2) as total_debit,
	sum(l.credit)::numeric(14,2) as total_credit,
	(sum(l.debit) - sum(l.credit))::numeric(14,2) as solde
from public.compta_ecriture_lignes l
join public.compta_ecritures e on e.id = l.ecriture_id
where e.statut = 'validee'
group by
	e.exercice,
	e.date_ecriture,
	e.journal_id,
	l.axe_camion_id,
	l.axe_chauffeur_id,
	l.axe_tournee_id,
	l.axe_client_id,
	l.axe_mission_id;

-- C2: marge consolidee par client
create or replace view public.vue_marge_client as
select
	vam.client_id,
	vam.client_nom,
	count(vam.ot_id) as nb_missions,
	sum(vam.prix_vente_ht)::numeric(14,2) as ca_ht,
	sum(vam.cout_total)::numeric(14,2) as cout_total,
	sum(vam.marge_nette)::numeric(14,2) as marge_nette,
	case
		when sum(vam.prix_vente_ht) > 0 then
			round((sum(vam.marge_nette) / sum(vam.prix_vente_ht)) * 100, 2)
		else null
	end as marge_pct
from public.vue_analytique_missions vam
group by vam.client_id, vam.client_nom;

grant execute on function public.compta_export_tva_declarative_v1(integer, text) to authenticated;
grant execute on function public.compta_import_mouvements_bancaires_json(jsonb, text) to authenticated;
grant execute on function public.compta_auto_rapprochements_v1(numeric, integer) to authenticated;

grant select on public.vue_compta_axes_analytique to authenticated;
grant select on public.vue_marge_client to authenticated;

