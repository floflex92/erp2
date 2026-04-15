-- Refonte V2 - Documents pass
-- Bridge employee_vault_documents -> public.documents + mapping update.

create schema if not exists refonte_v2;

-- Reouvrir les lignes deferrees
update refonte_v2.map_document_legacy
set mapping_status = 'pending',
    conflict_reason = null,
    mapped_at = null
where source_table = 'employee_vault_documents'
  and mapping_status = 'ignored';

-- Mapping employee_vault_documents vers public.documents
-- Strategie:
-- 1) si document cible existe deja (company_id + url_stockage), le reutiliser
-- 2) sinon creer un enregistrement public.documents
-- 3) alimenter target_document_id + status mapped

do $$
declare
  rec record;
  v_doc_id uuid;
begin
  for rec in
    select
      m.id as map_id,
      m.company_id,
      s.id as source_id,
      nullif(s.document_type, '') as document_type,
      nullif(s.file_name, '') as file_name,
      nullif(s.title, '') as title,
      nullif(s.storage_path, '') as storage_path,
      s.created_at
    from refonte_v2.map_document_legacy m
    join public.employee_vault_documents s on s.id = m.source_id
    where m.source_table = 'employee_vault_documents'
      and m.mapping_status = 'pending'
  loop
    v_doc_id := null;

    -- Recherche exacte par storage_path
    if rec.storage_path is not null then
      select d.id into v_doc_id
      from public.documents d
      where d.company_id = rec.company_id
        and d.url_stockage = rec.storage_path
      limit 1;
    end if;

    -- Si absent, creation
    if v_doc_id is null then
      insert into public.documents (
        company_id,
        ot_id,
        type_document,
        nom_fichier,
        url_stockage,
        taille_bytes,
        uploaded_by,
        created_at
      ) values (
        rec.company_id,
        null,
        case
          when lower(coalesce(rec.document_type, '')) in ('cmr') then 'cmr'
          when lower(coalesce(rec.document_type, '')) in ('bl', 'bon_livraison', 'bon_de_livraison') then 'bl'
          when lower(coalesce(rec.document_type, '')) in ('pod', 'proof_of_delivery') then 'pod'
          when lower(coalesce(rec.document_type, '')) in ('facture', 'invoice') then 'facture'
          when lower(coalesce(rec.document_type, '')) in ('devis', 'quote') then 'devis'
          else 'autre'
        end,
        coalesce(rec.file_name, rec.title, 'document_sans_nom'),
        rec.storage_path,
        null,
        null,
        coalesce(rec.created_at, now())
      )
      returning id into v_doc_id;
    end if;

    update refonte_v2.map_document_legacy
    set target_document_id = v_doc_id,
        mapping_status = 'mapped',
        conflict_reason = null,
        mapped_at = now()
    where id = rec.map_id;
  end loop;
end;
$$;

-- Fallback securite: toute ligne encore pending -> conflict
update refonte_v2.map_document_legacy
set mapping_status = 'conflict',
    conflict_reason = coalesce(conflict_reason, 'no_candidate_document')
where source_table = 'employee_vault_documents'
  and mapping_status = 'pending';

-- Refresh snapshot du jour
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

-- Refresh KPI document
insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, company_id, 'map_document_mapped', count(*) filter (where mapping_status = 'mapped')::numeric
from refonte_v2.map_document_legacy
group by company_id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();

insert into refonte_v2.migration_kpis_daily(day, company_id, kpi_code, kpi_value)
select current_date, company_id, 'map_document_conflict', count(*) filter (where mapping_status = 'conflict')::numeric
from refonte_v2.map_document_legacy
group by company_id
on conflict (day, company_id, kpi_code) do update
set kpi_value = excluded.kpi_value,
    created_at = now();
