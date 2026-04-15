-- Refonte V2 - Suite execution
-- Reconciliation automatique des mappings simples + snapshot conflits par tenant.

create schema if not exists refonte_v2;

-- =====================================================
-- 1) PERSONS: mapping automatique (profils, conducteurs, employee_directory)
-- =====================================================

-- A. profils -> persons
with candidates as (
  select
    m.id as map_id,
    min(p.id::text)::uuid as person_id,
    count(*) as candidate_count
  from refonte_v2.map_person_legacy m
  join public.profils s
    on m.source_table = 'profils'
   and s.id = m.source_id
  join public.persons p
    on p.company_id = m.company_id
   and (
        (
          s.matricule is not null
          and s.matricule <> ''
          and p.matricule = s.matricule
        )
        or
        (
          (s.matricule is null or s.matricule = '')
          and coalesce(lower(p.first_name), '') = coalesce(lower(s.prenom), '')
          and coalesce(lower(p.last_name), '') = coalesce(lower(s.nom), '')
        )
   )
  where m.source_table = 'profils'
    and m.mapping_status in ('pending', 'conflict')
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- B. conducteurs -> persons
with candidates as (
  select
    m.id as map_id,
    min(p.id::text)::uuid as person_id,
    count(*) as candidate_count
  from refonte_v2.map_person_legacy m
  join public.conducteurs s
    on m.source_table = 'conducteurs'
   and s.id = m.source_id
  join public.persons p
    on p.company_id = m.company_id
   and (
        (
          s.matricule is not null
          and s.matricule <> ''
          and p.matricule = s.matricule
        )
        or
        (
          (s.matricule is null or s.matricule = '')
          and coalesce(lower(p.first_name), '') = coalesce(lower(s.prenom), '')
          and coalesce(lower(p.last_name), '') = coalesce(lower(s.nom), '')
        )
   )
  where m.source_table = 'conducteurs'
    and m.mapping_status in ('pending', 'conflict')
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- C. employee_directory -> persons
with candidates as (
  select
    m.id as map_id,
    min(p.id::text)::uuid as person_id,
    count(*) as candidate_count
  from refonte_v2.map_person_legacy m
  join public.employee_directory s
    on m.source_table = 'employee_directory'
   and s.id = m.source_id
  join public.persons p
    on p.company_id = m.company_id
   and (
        (
          s.matricule is not null
          and s.matricule <> ''
          and p.matricule = s.matricule
        )
        or
        (
          (s.matricule is null or s.matricule = '')
          and coalesce(lower(p.first_name), '') = coalesce(lower(s.first_name), '')
          and coalesce(lower(p.last_name), '') = coalesce(lower(s.last_name), '')
        )
   )
  where m.source_table = 'employee_directory'
    and m.mapping_status in ('pending', 'conflict')
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- D. Tout ce qui reste pending devient conflit no_candidate
update refonte_v2.map_person_legacy
set mapping_status = 'conflict',
    conflict_reason = coalesce(conflict_reason, 'no_candidate'),
    mapped_at = null
where mapping_status = 'pending';

-- E. Propagation vers colonnes legacy
update public.profils p
set person_id = m.person_id
from refonte_v2.map_person_legacy m
where m.source_table = 'profils'
  and m.source_id = p.id
  and m.mapping_status = 'mapped'
  and m.person_id is not null
  and (p.person_id is distinct from m.person_id);

update public.conducteurs c
set person_id = m.person_id
from refonte_v2.map_person_legacy m
where m.source_table = 'conducteurs'
  and m.source_id = c.id
  and m.mapping_status = 'mapped'
  and m.person_id is not null
  and (c.person_id is distinct from m.person_id);

update public.employee_directory e
set person_id = m.person_id
from refonte_v2.map_person_legacy m
where m.source_table = 'employee_directory'
  and m.source_id = e.id
  and m.mapping_status = 'mapped'
  and m.person_id is not null
  and (e.person_id is distinct from m.person_id);

-- =====================================================
-- 2) ASSETS: mapping automatique (vehicules, remorques)
-- =====================================================

-- A. vehicules -> assets(type=vehicle)
with candidates as (
  select
    m.id as map_id,
    min(a.id::text)::uuid as asset_id,
    count(*) as candidate_count
  from refonte_v2.map_asset_legacy m
  join public.vehicules v
    on m.source_table = 'vehicules'
   and v.id = m.source_id
  join public.assets a
    on a.company_id = m.company_id
   and a.type = 'vehicle'
   and v.immatriculation is not null
   and v.immatriculation <> ''
   and a.registration = v.immatriculation
  where m.source_table = 'vehicules'
    and m.mapping_status in ('pending', 'conflict')
  group by m.id
)
update refonte_v2.map_asset_legacy m
set asset_id = c.asset_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- B. remorques -> assets(type=trailer)
with candidates as (
  select
    m.id as map_id,
    min(a.id::text)::uuid as asset_id,
    count(*) as candidate_count
  from refonte_v2.map_asset_legacy m
  join public.remorques r
    on m.source_table = 'remorques'
   and r.id = m.source_id
  join public.assets a
    on a.company_id = m.company_id
   and a.type = 'trailer'
   and r.immatriculation is not null
   and r.immatriculation <> ''
   and a.registration = r.immatriculation
  where m.source_table = 'remorques'
    and m.mapping_status in ('pending', 'conflict')
  group by m.id
)
update refonte_v2.map_asset_legacy m
set asset_id = c.asset_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- C. Tout ce qui reste pending devient conflit no_candidate
update refonte_v2.map_asset_legacy
set mapping_status = 'conflict',
    conflict_reason = coalesce(conflict_reason, 'no_candidate'),
    mapped_at = null
where mapping_status = 'pending';

-- D. Propagation vers colonnes legacy
update public.vehicules v
set asset_id = m.asset_id
from refonte_v2.map_asset_legacy m
where m.source_table = 'vehicules'
  and m.source_id = v.id
  and m.mapping_status = 'mapped'
  and m.asset_id is not null
  and (v.asset_id is distinct from m.asset_id);

update public.remorques r
set asset_id = m.asset_id
from refonte_v2.map_asset_legacy m
where m.source_table = 'remorques'
  and m.source_id = r.id
  and m.mapping_status = 'mapped'
  and m.asset_id is not null
  and (r.asset_id is distinct from m.asset_id);

-- =====================================================
-- 3) DOCUMENTS: marquage provisoire des mappings non traites
-- =====================================================

update refonte_v2.map_document_legacy
set mapping_status = 'ignored',
    conflict_reason = 'documents_reconciliation_deferred'
where mapping_status = 'pending';

-- =====================================================
-- 4) Snapshot conflits par tenant
-- =====================================================

create table if not exists refonte_v2.mapping_conflict_snapshot (
  id bigserial primary key,
  day date not null,
  company_id integer not null references public.companies(id) on delete cascade,
  domain_code text not null,
  source_table text not null,
  mapped_count integer not null,
  pending_count integer not null,
  conflict_count integer not null,
  generated_at timestamptz not null default now()
);

delete from refonte_v2.mapping_conflict_snapshot
where day = current_date;

insert into refonte_v2.mapping_conflict_snapshot(
  day, company_id, domain_code, source_table, mapped_count, pending_count, conflict_count, generated_at
)
select
  current_date,
  m.company_id,
  'person' as domain_code,
  m.source_table,
  count(*) filter (where m.mapping_status = 'mapped')::integer,
  count(*) filter (where m.mapping_status = 'pending')::integer,
  count(*) filter (where m.mapping_status = 'conflict')::integer,
  now()
from refonte_v2.map_person_legacy m
group by m.company_id, m.source_table;

insert into refonte_v2.mapping_conflict_snapshot(
  day, company_id, domain_code, source_table, mapped_count, pending_count, conflict_count, generated_at
)
select
  current_date,
  m.company_id,
  'asset' as domain_code,
  m.source_table,
  count(*) filter (where m.mapping_status = 'mapped')::integer,
  count(*) filter (where m.mapping_status = 'pending')::integer,
  count(*) filter (where m.mapping_status = 'conflict')::integer,
  now()
from refonte_v2.map_asset_legacy m
group by m.company_id, m.source_table;

insert into refonte_v2.mapping_conflict_snapshot(
  day, company_id, domain_code, source_table, mapped_count, pending_count, conflict_count, generated_at
)
select
  current_date,
  m.company_id,
  'document' as domain_code,
  m.source_table,
  count(*) filter (where m.mapping_status = 'mapped')::integer,
  count(*) filter (where m.mapping_status = 'pending')::integer,
  count(*) filter (where m.mapping_status = 'conflict')::integer,
  now()
from refonte_v2.map_document_legacy m
group by m.company_id, m.source_table;

-- =====================================================
-- 5) KPI journaliers de pilotage
-- =====================================================

insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, company_id, 'map_person_mapped', count(*) filter (where mapping_status = 'mapped')::numeric
from refonte_v2.map_person_legacy
group by company_id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();

insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, company_id, 'map_person_conflict', count(*) filter (where mapping_status = 'conflict')::numeric
from refonte_v2.map_person_legacy
group by company_id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();

insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, company_id, 'map_asset_mapped', count(*) filter (where mapping_status = 'mapped')::numeric
from refonte_v2.map_asset_legacy
group by company_id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();

insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, company_id, 'map_asset_conflict', count(*) filter (where mapping_status = 'conflict')::numeric
from refonte_v2.map_asset_legacy
group by company_id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();
