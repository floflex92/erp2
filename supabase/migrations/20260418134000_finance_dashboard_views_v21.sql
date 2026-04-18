-- ============================================================
-- V2.1 Cockpit Finance: vues SQL dediees
-- Objectif: fournir des agrégations fiables pour les widgets finance
-- ============================================================

create or replace view public.vue_finance_kpis_v21 as
with invoice_base as (
  select
    date_trunc('month', f.date_emission)::date as month_key,
    sum(case when f.statut not in ('brouillon', 'annulee') then coalesce(f.montant_ttc, f.montant_ht, 0) else 0 end)::numeric(14,2) as factured_ttc,
    sum(case when f.statut = 'payee' then coalesce(f.montant_ttc, f.montant_ht, 0) else 0 end)::numeric(14,2) as encaisse_ttc,
    sum(
      case
        when f.statut = 'en_retard' then coalesce(f.montant_ttc, f.montant_ht, 0)
        when f.statut = 'envoyee' and f.date_echeance is not null and f.date_echeance < current_date then coalesce(f.montant_ttc, f.montant_ht, 0)
        else 0
      end
    )::numeric(14,2) as impayes_ttc
  from public.factures f
  group by 1
),
to_invoice as (
  select
    date_trunc('month', coalesce(ot.date_livraison_prevue, ot.created_at))::date as month_key,
    sum(coalesce(ot.prix_ht, 0)) filter (
      where coalesce(ot.statut_transport, '') in ('termine', 'livre', 'facture', 'cloture')
        and ot.facturation_id is null
    )::numeric(14,2) as a_facturer_ht
  from public.ordres_transport ot
  group by 1
),
fixed_costs as (
  select
    date_trunc('month', coalesce(ff.date_facture, ff.created_at::date))::date as month_key,
    sum(coalesce(ff.montant_ht, 0)) filter (
      where coalesce(ff.compte_charge_code, '') like '61%'
         or coalesce(ff.compte_charge_code, '') like '62%'
         or coalesce(ff.compte_charge_code, '') like '64%'
    )::numeric(14,2) as charges_fixes_ht
  from public.compta_factures_fournisseurs ff
  group by 1
),
variable_costs as (
  select
    date_trunc('month', coalesce(cm.date_cout, cm.created_at::date))::date as month_key,
    sum(coalesce(cm.montant_ht, 0))::numeric(14,2) as charges_variables_ht
  from public.couts_mission cm
  group by 1
),
margin_base as (
  select
    date_trunc('month', coalesce(vm.created_at, vm.date_livraison_prevue, vm.date_livraison_reelle))::date as month_key,
    sum(coalesce(vm.chiffre_affaires, 0))::numeric(14,2) as ca_ht,
    sum(coalesce(vm.marge_brute, 0))::numeric(14,2) as marge_ht
  from public.vue_marge_ot vm
  group by 1
),
months as (
  select month_key from invoice_base
  union
  select month_key from to_invoice
  union
  select month_key from fixed_costs
  union
  select month_key from variable_costs
  union
  select month_key from margin_base
)
select
  m.month_key,
  coalesce(i.factured_ttc, 0)::numeric(14,2) as factured_ttc,
  coalesce(i.encaisse_ttc, 0)::numeric(14,2) as encaisse_ttc,
  coalesce(i.impayes_ttc, 0)::numeric(14,2) as impayes_ttc,
  coalesce(t.a_facturer_ht, 0)::numeric(14,2) as a_facturer_ht,
  coalesce(fc.charges_fixes_ht, 0)::numeric(14,2) as charges_fixes_ht,
  coalesce(vc.charges_variables_ht, 0)::numeric(14,2) as charges_variables_ht,
  coalesce(mb.ca_ht, 0)::numeric(14,2) as ca_ht,
  coalesce(mb.marge_ht, 0)::numeric(14,2) as marge_ht
from months m
left join invoice_base i on i.month_key = m.month_key
left join to_invoice t on t.month_key = m.month_key
left join fixed_costs fc on fc.month_key = m.month_key
left join variable_costs vc on vc.month_key = m.month_key
left join margin_base mb on mb.month_key = m.month_key;


create or replace view public.vue_finance_client_perf_v21 as
with factures_client as (
  select
    date_trunc('month', f.date_emission)::date as month_key,
    f.client_id,
    c.nom as client_nom,
    sum(case when f.statut not in ('brouillon', 'annulee') then coalesce(f.montant_ttc, f.montant_ht, 0) else 0 end)::numeric(14,2) as ca_ttc,
    sum(
      case
        when f.statut = 'en_retard' then coalesce(f.montant_ttc, f.montant_ht, 0)
        when f.statut = 'envoyee' and f.date_echeance is not null and f.date_echeance < current_date then coalesce(f.montant_ttc, f.montant_ht, 0)
        else 0
      end
    )::numeric(14,2) as impayes_ttc
  from public.factures f
  join public.clients c on c.id = f.client_id
  group by 1, 2, 3
),
marge_client as (
  select
    date_trunc('month', coalesce(ot.created_at, ot.date_livraison_prevue, ot.date_livraison_reelle))::date as month_key,
    ot.client_id,
    sum(coalesce(vm.marge_brute, 0))::numeric(14,2) as marge_ht
  from public.ordres_transport ot
  join public.vue_marge_ot vm on vm.id = ot.id
  group by 1, 2
)
select
  fc.month_key,
  fc.client_id,
  fc.client_nom,
  fc.ca_ttc,
  coalesce(mc.marge_ht, 0)::numeric(14,2) as marge_ht,
  fc.impayes_ttc
from factures_client fc
left join marge_client mc
  on mc.month_key = fc.month_key and mc.client_id = fc.client_id;


create or replace view public.vue_finance_charge_breakdown_v21 as
with mission_costs as (
  select
    date_trunc('month', coalesce(cm.date_cout, cm.created_at::date))::date as month_key,
    case
      when cm.type_cout = 'carburant' then 'carburant'
      when cm.type_cout = 'peage' then 'peages'
      when cm.type_cout = 'sous_traitance' then 'affretement'
      when cm.type_cout = 'chauffeur' then 'salaires'
      when cm.type_cout = 'amortissement' then 'maintenance'
      else 'autres'
    end as charge_category,
    sum(coalesce(cm.montant_ht, 0))::numeric(14,2) as montant_ht
  from public.couts_mission cm
  group by 1, 2
),
fixed_costs as (
  select
    date_trunc('month', coalesce(ff.date_facture, ff.created_at::date))::date as month_key,
    case
      when coalesce(ff.compte_charge_code, '') like '64%' then 'salaires'
      when coalesce(ff.compte_charge_code, '') like '615%' then 'maintenance'
      when coalesce(ff.compte_charge_code, '') like '61%' then 'maintenance'
      else 'autres'
    end as charge_category,
    sum(coalesce(ff.montant_ht, 0))::numeric(14,2) as montant_ht
  from public.compta_factures_fournisseurs ff
  group by 1, 2
),
all_rows as (
  select * from mission_costs
  union all
  select * from fixed_costs
)
select
  month_key,
  charge_category,
  sum(montant_ht)::numeric(14,2) as montant_ht
from all_rows
group by 1, 2;


create or replace view public.vue_finance_late_payments_v21 as
select
  f.id,
  f.numero,
  f.client_id,
  c.nom as client_nom,
  f.date_emission,
  f.date_echeance,
  coalesce(f.montant_ttc, f.montant_ht, 0)::numeric(14,2) as montant_ttc,
  f.statut,
  greatest(
    0,
    case
      when f.date_echeance is null then 0
      else (current_date - f.date_echeance)
    end
  )::int as days_late
from public.factures f
join public.clients c on c.id = f.client_id
where f.statut in ('envoyee', 'en_retard')
  and f.date_echeance is not null;
