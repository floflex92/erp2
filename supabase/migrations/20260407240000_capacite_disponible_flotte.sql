-- ============================================================
-- Capacité disponible flotte
-- Date: 2026-04-07
-- Périmètre:
--   - Colonnes capacite_charge_kg / capacite_volume_m3 sur vehicules
--   - Vue v_capacite_disponible_aujourd_hui : charge restante par véhicule aujourd'hui
--   - Vue v_capacite_disponible_semaine : charge restante par véhicule × jour
-- ============================================================

-- 1. Colonnes capacité sur la table vehicules
alter table public.vehicules
  add column if not exists capacite_charge_kg  numeric(10,2) null,
  add column if not exists capacite_volume_m3  numeric(8,2)  null;

-- 2. Vue capacité disponible aujourd'hui par véhicule
create or replace view public.v_capacite_disponible_aujourd_hui as
with charge_du_jour as (
  select
    ot.vehicule_id,
    sum(coalesce(ot.poids_kg, 0))     as poids_charge_total,
    sum(coalesce(ot.volume_m3, 0))    as volume_charge_total,
    count(*)                           as nb_ot_actifs
  from public.ordres_transport ot
  where ot.vehicule_id is not null
    and ot.statut not in ('annule', 'brouillon', 'facture')
    and (
      -- OT actif aujourd'hui : chargement ≤ aujourd'hui et livraison ≥ aujourd'hui
      coalesce(ot.date_chargement_prevue::date, current_date) <= current_date
      and coalesce(ot.date_livraison_prevue::date, current_date) >= current_date
    )
  group by ot.vehicule_id
)
select
  v.id                                                        as vehicule_id,
  v.immatriculation                                           as vehicule_immat,
  v.marque,
  v.modele,
  v.statut                                                    as vehicule_statut,
  v.capacite_charge_kg,
  v.capacite_volume_m3,
  coalesce(cj.poids_charge_total, 0)                         as poids_charge_kg,
  coalesce(cj.volume_charge_total, 0)                        as volume_charge_m3,
  coalesce(cj.nb_ot_actifs, 0)                               as nb_ot_actifs,
  -- Capacité disponible (null si non renseignée sur le véhicule)
  case
    when v.capacite_charge_kg is not null
    then greatest(0, v.capacite_charge_kg - coalesce(cj.poids_charge_total, 0))
    else null
  end as poids_disponible_kg,
  case
    when v.capacite_volume_m3 is not null
    then greatest(0, v.capacite_volume_m3  - coalesce(cj.volume_charge_total, 0))
    else null
  end as volume_disponible_m3,
  -- Taux de remplissage (%)
  case
    when v.capacite_charge_kg > 0
    then round(100.0 * coalesce(cj.poids_charge_total, 0) / v.capacite_charge_kg, 1)
    else null
  end as taux_remplissage_pct
from public.vehicules v
left join charge_du_jour cj on cj.vehicule_id = v.id
where v.statut not in ('hors_service')
order by v.immatriculation;


-- 3. Vue capacité par véhicule × jour (7 prochains jours)
create or replace view public.v_capacite_disponible_semaine as
with jours as (
  select generate_series(0, 6) as jour_offset
),
charge_par_jour as (
  select
    ot.vehicule_id,
    j.jour_offset,
    (current_date + j.jour_offset)::date as jour,
    sum(coalesce(ot.poids_kg, 0))    as poids_charge_total
  from public.ordres_transport ot
  cross join jours j
  where ot.vehicule_id is not null
    and ot.statut not in ('annule', 'brouillon', 'facture')
    and coalesce(ot.date_chargement_prevue::date, current_date) <= (current_date + j.jour_offset)::date
    and coalesce(ot.date_livraison_prevue::date, current_date)  >= (current_date + j.jour_offset)::date
  group by ot.vehicule_id, j.jour_offset
)
select
  v.id                                                               as vehicule_id,
  v.immatriculation                                                  as vehicule_immat,
  v.capacite_charge_kg,
  cpj.jour,
  coalesce(cpj.poids_charge_total, 0)                               as poids_charge_kg,
  case
    when v.capacite_charge_kg > 0
    then greatest(0, v.capacite_charge_kg - coalesce(cpj.poids_charge_total, 0))
    else null
  end as poids_disponible_kg,
  case
    when v.capacite_charge_kg > 0
    then round(100.0 * coalesce(cpj.poids_charge_total, 0) / v.capacite_charge_kg, 1)
    else null
  end as taux_remplissage_pct
from public.vehicules v
cross join jours j
left join charge_par_jour cpj
  on cpj.vehicule_id = v.id
  and cpj.jour_offset = j.jour_offset
where v.statut not in ('hors_service')
order by v.immatriculation, j.jour_offset;
