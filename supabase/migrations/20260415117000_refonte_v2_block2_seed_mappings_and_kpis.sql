-- Refonte V2 - Suite execution
-- Initialisation des mappings et KPI de depart apres fondations blocs 1-6.

create schema if not exists refonte_v2;

-- 1) Seed mapping personnes depuis legacy
insert into refonte_v2.map_person_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(p.company_id, 1), 'profils', p.id, 'pending'
from public.profils p
on conflict (source_table, source_id) do nothing;

insert into refonte_v2.map_person_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(c.company_id, 1), 'conducteurs', c.id, 'pending'
from public.conducteurs c
on conflict (source_table, source_id) do nothing;

insert into refonte_v2.map_person_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(e.company_id, 1), 'employee_directory', e.id, 'pending'
from public.employee_directory e
on conflict (source_table, source_id) do nothing;

-- 2) Seed mapping assets depuis legacy
insert into refonte_v2.map_asset_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(v.company_id, 1), 'vehicules', v.id, 'pending'
from public.vehicules v
on conflict (source_table, source_id) do nothing;

insert into refonte_v2.map_asset_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(r.company_id, 1), 'remorques', r.id, 'pending'
from public.remorques r
on conflict (source_table, source_id) do nothing;

-- 3) Seed mapping documents legacy connus
insert into refonte_v2.map_document_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(d.company_id, 1), 'conducteur_documents', d.id, 'pending'
from public.conducteur_documents d
on conflict (source_table, source_id) do nothing;

insert into refonte_v2.map_document_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(f.company_id, 1), 'flotte_documents', f.id, 'pending'
from public.flotte_documents f
on conflict (source_table, source_id) do nothing;

insert into refonte_v2.map_document_legacy(company_id, source_table, source_id, mapping_status)
select coalesce(v.company_id, 1), 'employee_vault_documents', v.id, 'pending'
from public.employee_vault_documents v
on conflict (source_table, source_id) do nothing;

-- 4) Capture KPI de demarrage par company
with companies_scope as (
  select id as company_id from public.companies
)
insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, c.company_id, 'map_person_pending',
       coalesce((select count(*) from refonte_v2.map_person_legacy m where m.company_id = c.company_id and m.mapping_status = 'pending'), 0)::numeric
from companies_scope c
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();

with companies_scope as (
  select id as company_id from public.companies
)
insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, c.company_id, 'map_asset_pending',
       coalesce((select count(*) from refonte_v2.map_asset_legacy m where m.company_id = c.company_id and m.mapping_status = 'pending'), 0)::numeric
from companies_scope c
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();

with companies_scope as (
  select id as company_id from public.companies
)
insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, c.company_id, 'map_document_pending',
       coalesce((select count(*) from refonte_v2.map_document_legacy m where m.company_id = c.company_id and m.mapping_status = 'pending'), 0)::numeric
from companies_scope c
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();
