-- ============================================================
-- Radar Km à Vide
-- Date: 2026-04-07
-- Périmètre:
--   - Vue v_radar_km_vide : km à vide estimé entre missions consécutives
--   - Vue v_radar_km_vide_synthese : taux de charge par véhicule
--   - Distance calculée par formule haversine (vol d'oiseau ×1.25 ≈ distance routière)
-- ============================================================

-- Vue détaillée : missions consécutives par véhicule avec km à vide estimé
create or replace view public.v_radar_km_vide as
with missions_ordered as (
  select
    ot.id,
    ot.reference,
    ot.vehicule_id,
    ot.conducteur_id,
    ot.date_chargement_prevue,
    ot.date_livraison_prevue,
    ot.date_livraison_reelle,
    ot.distance_km,
    ot.statut,
    ot.statut_transport,
    ot.livraison_site_id,
    ot.chargement_site_id,
    sl_liv.ville       as livraison_ville,
    sl_liv.latitude    as livraison_lat,
    sl_liv.longitude   as livraison_lng,
    sl_ch.ville        as chargement_ville,
    sl_ch.latitude     as chargement_lat,
    sl_ch.longitude    as chargement_lng,
    c.nom              as client_nom,
    v.immatriculation  as vehicule_immat,
    row_number() over (
      partition by ot.vehicule_id
      order by coalesce(ot.date_chargement_prevue, '2099-01-01'::date)
    ) as rn
  from public.ordres_transport ot
  left join public.sites_logistiques sl_liv on sl_liv.id = ot.livraison_site_id
  left join public.sites_logistiques sl_ch  on sl_ch.id  = ot.chargement_site_id
  left join public.clients            c      on c.id      = ot.client_id
  left join public.vehicules          v      on v.id      = ot.vehicule_id
  where ot.vehicule_id is not null
    and ot.statut not in ('annule', 'brouillon')
    and coalesce(ot.date_chargement_prevue, current_date) >= current_date - 30
),
missions_avec_suivant as (
  select
    m1.id,
    m1.reference,
    m1.vehicule_id,
    m1.vehicule_immat,
    m1.conducteur_id,
    m1.client_nom,
    m1.date_chargement_prevue,
    m1.date_livraison_prevue,
    m1.distance_km                   as km_charge,
    m1.livraison_ville,
    m1.livraison_lat,
    m1.livraison_lng,
    m1.statut,
    m1.statut_transport,
    m2.id                            as ot_suivant_id,
    m2.reference                     as ot_suivant_reference,
    m2.date_chargement_prevue        as suivant_date_chargement,
    m2.chargement_ville              as suivant_chargement_ville,
    m2.chargement_lat                as suivant_chargement_lat,
    m2.chargement_lng                as suivant_chargement_lng,
    -- Haversine vol d'oiseau × 1.25 ≈ distance routière
    case
      when m1.livraison_lat  is not null and m1.livraison_lng  is not null
       and m2.chargement_lat is not null and m2.chargement_lng is not null
      then round(
        (111.045 * degrees(acos(least(1.0,
          cos(radians(m1.livraison_lat)) * cos(radians(m2.chargement_lat))
          * cos(radians(m2.chargement_lng - m1.livraison_lng))
          + sin(radians(m1.livraison_lat)) * sin(radians(m2.chargement_lat))
        ))) * 1.25
      )::numeric, 0)
      else null
    end as km_vide_estime
  from missions_ordered m1
  left join missions_ordered m2
    on m2.vehicule_id = m1.vehicule_id
   and m2.rn = m1.rn + 1
)
select
  id,
  reference,
  vehicule_id,
  vehicule_immat,
  conducteur_id,
  client_nom,
  date_chargement_prevue,
  date_livraison_prevue,
  km_charge,
  livraison_ville,
  ot_suivant_id,
  ot_suivant_reference,
  suivant_date_chargement,
  suivant_chargement_ville,
  km_vide_estime,
  statut,
  statut_transport
from missions_avec_suivant
order by vehicule_id, date_chargement_prevue;


-- Vue synthèse : taux de charge par véhicule (30 derniers jours)
create or replace view public.v_radar_km_vide_synthese as
select
  vehicule_id,
  vehicule_immat,
  count(*)                      as nb_missions,
  sum(km_charge)                as total_km_charge,
  sum(km_vide_estime)           as total_km_vide_estime,
  case
    when (sum(coalesce(km_charge, 0)) + sum(coalesce(km_vide_estime, 0))) > 0
    then round(
      100.0 * sum(coalesce(km_charge, 0))
      / (sum(coalesce(km_charge, 0)) + sum(coalesce(km_vide_estime, 0)))
    , 1)
    else null
  end as taux_charge_pct
from public.v_radar_km_vide
group by vehicule_id, vehicule_immat;
