-- Refonte V2 - Suite execution (1/2)
-- Reconciliation v2: matching normalise pour persons et assets.

create schema if not exists refonte_v2;

create or replace function refonte_v2.norm_token(p_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]', '', 'g'), '');
$$;

-- =====================================================
-- PERSONS - reset conflicts to pending for v2 pass
-- =====================================================

update refonte_v2.map_person_legacy
set mapping_status = 'pending',
    conflict_reason = null,
    mapped_at = null
where source_table in ('conducteurs', 'employee_directory')
  and mapping_status = 'conflict';

-- Conducteurs strategy A: matricule normalise
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
   and refonte_v2.norm_token(p.matricule) is not null
   and refonte_v2.norm_token(p.matricule) = refonte_v2.norm_token(s.matricule)
  where m.source_table = 'conducteurs'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_matricule' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- Conducteurs strategy B: email
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
   and lower(coalesce(p.email, '')) <> ''
   and lower(p.email) = lower(coalesce(s.email, ''))
  where m.source_table = 'conducteurs'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_email' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- Conducteurs strategy C: nom/prenom normalises
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
   and refonte_v2.norm_token(p.first_name) = refonte_v2.norm_token(s.prenom)
   and refonte_v2.norm_token(p.last_name) = refonte_v2.norm_token(s.nom)
  where m.source_table = 'conducteurs'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_name' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- Employee directory strategy A: matricule
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
   and refonte_v2.norm_token(p.matricule) is not null
   and refonte_v2.norm_token(p.matricule) = refonte_v2.norm_token(s.matricule)
  where m.source_table = 'employee_directory'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_matricule' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- Employee directory strategy B: professional/personal email
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
   and lower(coalesce(p.email, '')) <> ''
   and lower(p.email) in (lower(coalesce(s.professional_email, '')), lower(coalesce(s.personal_email, '')))
  where m.source_table = 'employee_directory'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_email' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- Employee directory strategy C: nom/prenom
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
   and refonte_v2.norm_token(p.first_name) = refonte_v2.norm_token(s.first_name)
   and refonte_v2.norm_token(p.last_name) = refonte_v2.norm_token(s.last_name)
  where m.source_table = 'employee_directory'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_person_legacy m
set person_id = c.person_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_name' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

update refonte_v2.map_person_legacy
set mapping_status = 'conflict',
    conflict_reason = coalesce(conflict_reason, 'no_candidate_v2')
where source_table in ('conducteurs', 'employee_directory')
  and mapping_status = 'pending';

-- Propagation person_id
update public.conducteurs c
set person_id = m.person_id
from refonte_v2.map_person_legacy m
where m.source_table = 'conducteurs'
  and m.source_id = c.id
  and m.mapping_status = 'mapped'
  and m.person_id is not null
  and c.person_id is distinct from m.person_id;

update public.employee_directory e
set person_id = m.person_id
from refonte_v2.map_person_legacy m
where m.source_table = 'employee_directory'
  and m.source_id = e.id
  and m.mapping_status = 'mapped'
  and m.person_id is not null
  and e.person_id is distinct from m.person_id;

-- =====================================================
-- ASSETS - reset conflicts then normalized registration match
-- =====================================================

update refonte_v2.map_asset_legacy
set mapping_status = 'pending',
    conflict_reason = null,
    mapped_at = null
where source_table in ('vehicules', 'remorques')
  and mapping_status = 'conflict';

-- Vehicules by registration normalization
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
   and refonte_v2.norm_token(a.registration) is not null
   and refonte_v2.norm_token(a.registration) = refonte_v2.norm_token(v.immatriculation)
  where m.source_table = 'vehicules'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_asset_legacy m
set asset_id = c.asset_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_registration' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

-- Remorques by registration normalization
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
   and refonte_v2.norm_token(a.registration) is not null
   and refonte_v2.norm_token(a.registration) = refonte_v2.norm_token(r.immatriculation)
  where m.source_table = 'remorques'
    and m.mapping_status = 'pending'
  group by m.id
)
update refonte_v2.map_asset_legacy m
set asset_id = c.asset_id,
    mapping_status = case when c.candidate_count = 1 then 'mapped' else 'conflict' end,
    conflict_reason = case when c.candidate_count = 1 then null else 'multiple_candidates_registration' end,
    mapped_at = case when c.candidate_count = 1 then now() else null end
from candidates c
where m.id = c.map_id;

update refonte_v2.map_asset_legacy
set mapping_status = 'conflict',
    conflict_reason = coalesce(conflict_reason, 'no_candidate_v2')
where source_table in ('vehicules', 'remorques')
  and mapping_status = 'pending';

-- Propagation asset_id
update public.vehicules v
set asset_id = m.asset_id
from refonte_v2.map_asset_legacy m
where m.source_table = 'vehicules'
  and m.source_id = v.id
  and m.mapping_status = 'mapped'
  and m.asset_id is not null
  and v.asset_id is distinct from m.asset_id;

update public.remorques r
set asset_id = m.asset_id
from refonte_v2.map_asset_legacy m
where m.source_table = 'remorques'
  and m.source_id = r.id
  and m.mapping_status = 'mapped'
  and m.asset_id is not null
  and r.asset_id is distinct from m.asset_id;

-- =====================================================
-- REBUILD daily snapshot and KPI
-- =====================================================

delete from refonte_v2.mapping_conflict_snapshot where day = current_date;

insert into refonte_v2.mapping_conflict_snapshot(
  day, company_id, domain_code, source_table, mapped_count, pending_count, conflict_count, generated_at
)
select
  current_date,
  m.company_id,
  'person',
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
  'asset',
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
  'document',
  m.source_table,
  count(*) filter (where m.mapping_status = 'mapped')::integer,
  count(*) filter (where m.mapping_status = 'pending')::integer,
  count(*) filter (where m.mapping_status = 'conflict')::integer,
  now()
from refonte_v2.map_document_legacy m
group by m.company_id, m.source_table;

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
