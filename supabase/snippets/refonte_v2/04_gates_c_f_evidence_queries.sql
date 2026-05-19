-- Refonte V2 - Requetes de preuves d exploitation Gates C -> F
-- Usage:
--   1) Lancer dans SQL Editor Supabase (projet prod/staging cible)
--   2) Exporter les resultats CSV/PDF et les joindre au dossier de preuves
-- Parametre:
--   - Remplacer p_company_id si necessaire

-- ============================================================================
-- Parametres
-- ============================================================================
with params as (
  select
    1::integer as p_company_id,
    (now() - interval '14 days')::timestamptz as c_window_start,
    (now() - interval '30 days')::timestamptz as e_window_start
)
select * from params;

-- ============================================================================
-- GATE C - 14 jours sans derive critique
-- ============================================================================

-- C1. Derives ouvertes critiques (doit etre 0)
with params as (
  select 1::integer as p_company_id, (now() - interval '14 days')::timestamptz as c_window_start
)
select
  l.company_id,
  count(*) filter (where l.severity = 'critical' and l.resolved_at is null) as open_critical,
  count(*) filter (where l.severity = 'critical') as critical_total,
  count(*) filter (where l.resolved_at is not null) as resolved_total
from refonte_v2.sync_drift_log l
join params p on p.p_company_id = l.company_id
where l.detected_at >= p.c_window_start
group by l.company_id;

-- C2. Evolution journaliere des derives par severite (courbe)
with params as (
  select 1::integer as p_company_id, (now() - interval '14 days')::timestamptz as c_window_start
)
select
  date_trunc('day', l.detected_at)::date as day,
  l.severity,
  count(*) as drift_count
from refonte_v2.sync_drift_log l
join params p on p.p_company_id = l.company_id
where l.detected_at >= p.c_window_start
group by 1, 2
order by 1 asc, 2 asc;

-- C3. KPI migration journaliers (si alimentes)
with params as (
  select 1::integer as p_company_id
)
select
  k.day,
  k.kpi_code,
  k.kpi_value
from refonte_v2.migration_kpis_daily k
join params p on p.p_company_id = k.company_id
where k.day >= current_date - 14
order by k.day asc, k.kpi_code asc;

-- ============================================================================
-- GATE D - Canary puis generalisation sans incident P1
-- ============================================================================
-- Note: ce repo ne contient pas une table incidents P1 standardisee.
-- On utilise un proxy via entity_history.event_type (incident/p1) + derive critique.

-- D1. Evenements type incident/P1 dans entity_history (proxy)
with params as (
  select 1::integer as p_company_id
)
select
  date_trunc('day', h.event_at)::date as day,
  count(*) as incident_like_events
from public.entity_history h
join params p on p.p_company_id = h.company_id
where h.event_at >= now() - interval '30 days'
  and (
    lower(h.event_type) like '%incident%'
    or lower(h.event_type) like '%p1%'
  )
group by 1
order by 1 asc;

-- D2. Zero derive critique ouverte sur periode canary (a ajuster)
-- Exemple: 7 jours canary
with params as (
  select 1::integer as p_company_id, (now() - interval '7 days')::timestamptz as d_window_start
)
select
  count(*) filter (where l.severity = 'critical' and l.resolved_at is null) as open_critical_canary,
  count(*) filter (where l.severity = 'critical') as critical_total_canary
from refonte_v2.sync_drift_log l
join params p on p.p_company_id = l.company_id
where l.detected_at >= p.d_window_start;

-- ============================================================================
-- GATE E - 30 jours de stabilite post-cutover
-- ============================================================================

-- E1. Derives critiques sur 30 jours post-cutover
with params as (
  select 1::integer as p_company_id, (now() - interval '30 days')::timestamptz as e_window_start
)
select
  count(*) filter (where l.severity = 'critical') as critical_total_30d,
  count(*) filter (where l.severity = 'critical' and l.resolved_at is null) as critical_open_30d,
  count(*) as drift_total_30d
from refonte_v2.sync_drift_log l
join params p on p.p_company_id = l.company_id
where l.detected_at >= p.e_window_start;

-- E2. Volume d historique metier (proxy activite stable)
with params as (
  select 1::integer as p_company_id, (now() - interval '30 days')::timestamptz as e_window_start
)
select
  date_trunc('day', h.event_at)::date as day,
  count(*) as history_events
from public.entity_history h
join params p on p.p_company_id = h.company_id
where h.event_at >= p.e_window_start
group by 1
order by 1 asc;

-- ============================================================================
-- GATE F - Debt legacy close + runbooks/observabilite a jour
-- ============================================================================

-- F1. Couverture mapping legacy -> pivots (doit tendre vers 100% mapped, 0 conflict)
with params as (
  select 1::integer as p_company_id
), mapping_union as (
  select 'person'::text as domain_code, m.mapping_status from refonte_v2.map_person_legacy m join params p on p.p_company_id = m.company_id
  union all
  select 'asset'::text as domain_code, m.mapping_status from refonte_v2.map_asset_legacy m join params p on p.p_company_id = m.company_id
  union all
  select 'document'::text as domain_code, m.mapping_status from refonte_v2.map_document_legacy m join params p on p.p_company_id = m.company_id
)
select
  domain_code,
  count(*) as total_rows,
  count(*) filter (where mapping_status = 'mapped') as mapped_rows,
  count(*) filter (where mapping_status = 'conflict') as conflict_rows,
  round(100.0 * count(*) filter (where mapping_status = 'mapped') / nullif(count(*), 0), 2) as mapped_pct
from mapping_union
group by domain_code
order by domain_code;

-- F2. Presence des artefacts runtime attendus (sanity check)
select
  to_regclass('refonte_v2.sync_drift_log') is not null as has_sync_drift_log,
  to_regclass('refonte_v2.migration_kpis_daily') is not null as has_migration_kpis_daily,
  to_regclass('public.entity_history') is not null as has_entity_history,
  to_regclass('public.v_persons_legacy_bridge') is not null as has_v_persons_legacy_bridge,
  to_regclass('public.v_assets_legacy_bridge') is not null as has_v_assets_legacy_bridge;
