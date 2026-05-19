-- Refonte V2 - Suite execution (v3)
-- Reconciliation agressive: autocreation des pivots manquants pour eliminer les conflits
-- sur conducteurs / employee_directory / vehicules / remorques.

create schema if not exists refonte_v2;

create or replace function refonte_v2.norm_token(p_value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(lower(coalesce(p_value, '')), '[^a-z0-9]', '', 'g'), '');
$$;

-- Reouvrir les lignes en conflit pour la passe v3
update refonte_v2.map_person_legacy
set mapping_status = 'pending',
    conflict_reason = null,
    mapped_at = null
where source_table in ('conducteurs', 'employee_directory')
  and mapping_status = 'conflict';

update refonte_v2.map_asset_legacy
set mapping_status = 'pending',
    conflict_reason = null,
    mapped_at = null
where source_table in ('vehicules', 'remorques')
  and mapping_status = 'conflict';

-- -----------------------------------------------------------------
-- PERSONS bridge: conducteurs
-- -----------------------------------------------------------------
do $$
declare
  rec record;
  v_person_id uuid;
begin
  for rec in
    select
      m.id as map_id,
      m.company_id,
      c.prenom,
      c.nom,
      nullif(c.matricule, '') as matricule,
      nullif(c.email, '') as email,
      nullif(c.telephone, '') as phone,
      c.statut
    from refonte_v2.map_person_legacy m
    join public.conducteurs c on c.id = m.source_id
    where m.source_table = 'conducteurs'
      and m.mapping_status = 'pending'
  loop
    v_person_id := null;

    if rec.matricule is not null then
      select p.id into v_person_id
      from public.persons p
      where p.company_id = rec.company_id
        and p.matricule = rec.matricule
      limit 1;
    end if;

    if v_person_id is null and rec.email is not null then
      select p.id into v_person_id
      from public.persons p
      where p.company_id = rec.company_id
        and lower(coalesce(p.email, '')) = lower(rec.email)
      limit 1;
    end if;

    if v_person_id is null then
      select p.id into v_person_id
      from public.persons p
      where p.company_id = rec.company_id
        and refonte_v2.norm_token(p.first_name) = refonte_v2.norm_token(rec.prenom)
        and refonte_v2.norm_token(p.last_name) = refonte_v2.norm_token(rec.nom)
      limit 1;
    end if;

    if v_person_id is null then
      insert into public.persons (
        company_id, first_name, last_name, person_type, matricule, email, phone, status
      ) values (
        rec.company_id,
        rec.prenom,
        rec.nom,
        'driver',
        rec.matricule,
        rec.email,
        rec.phone,
        case
          when lower(coalesce(rec.statut, '')) in ('inactif', 'inactive', 'sorti') then 'inactive'
          else 'active'
        end
      )
      returning id into v_person_id;
    else
      update public.persons p
      set
        email = coalesce(p.email, rec.email),
        phone = coalesce(p.phone, rec.phone),
        matricule = coalesce(p.matricule, rec.matricule),
        updated_at = now()
      where p.id = v_person_id;
    end if;

    update refonte_v2.map_person_legacy
    set person_id = v_person_id,
        mapping_status = 'mapped',
        conflict_reason = null,
        mapped_at = now()
    where id = rec.map_id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------
-- PERSONS bridge: employee_directory
-- -----------------------------------------------------------------
do $$
declare
  rec record;
  v_person_id uuid;
begin
  for rec in
    select
      m.id as map_id,
      m.company_id,
      e.first_name,
      e.last_name,
      nullif(e.matricule, '') as matricule,
      nullif(coalesce(e.professional_email, e.personal_email), '') as email,
      null::text as phone,
      e.employment_status
    from refonte_v2.map_person_legacy m
    join public.employee_directory e on e.id = m.source_id
    where m.source_table = 'employee_directory'
      and m.mapping_status = 'pending'
  loop
    v_person_id := null;

    if rec.matricule is not null then
      select p.id into v_person_id
      from public.persons p
      where p.company_id = rec.company_id
        and p.matricule = rec.matricule
      limit 1;
    end if;

    if v_person_id is null and rec.email is not null then
      select p.id into v_person_id
      from public.persons p
      where p.company_id = rec.company_id
        and lower(coalesce(p.email, '')) = lower(rec.email)
      limit 1;
    end if;

    if v_person_id is null then
      select p.id into v_person_id
      from public.persons p
      where p.company_id = rec.company_id
        and refonte_v2.norm_token(p.first_name) = refonte_v2.norm_token(rec.first_name)
        and refonte_v2.norm_token(p.last_name) = refonte_v2.norm_token(rec.last_name)
      limit 1;
    end if;

    if v_person_id is null then
      insert into public.persons (
        company_id, first_name, last_name, person_type, matricule, email, phone, status
      ) values (
        rec.company_id,
        rec.first_name,
        rec.last_name,
        'employee',
        rec.matricule,
        rec.email,
        rec.phone,
        case
          when lower(coalesce(rec.employment_status, '')) in ('departed', 'inactive', 'archived') then 'inactive'
          else 'active'
        end
      )
      returning id into v_person_id;
    else
      update public.persons p
      set
        email = coalesce(p.email, rec.email),
        phone = coalesce(p.phone, rec.phone),
        matricule = coalesce(p.matricule, rec.matricule),
        updated_at = now()
      where p.id = v_person_id;
    end if;

    update refonte_v2.map_person_legacy
    set person_id = v_person_id,
        mapping_status = 'mapped',
        conflict_reason = null,
        mapped_at = now()
    where id = rec.map_id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------
-- ASSETS bridge: vehicules
-- -----------------------------------------------------------------
do $$
declare
  rec record;
  v_asset_id uuid;
begin
  for rec in
    select
      m.id as map_id,
      m.company_id,
      nullif(v.immatriculation, '') as registration,
      nullif(v.numero_parc, '') as fleet_number,
      v.marque,
      v.modele,
      v.annee,
      v.ptac_kg,
      nullif(v.vin, '') as vin,
      v.ct_expiration,
      v.assurance_expiration,
      v.statut
    from refonte_v2.map_asset_legacy m
    join public.vehicules v on v.id = m.source_id
    where m.source_table = 'vehicules'
      and m.mapping_status = 'pending'
  loop
    v_asset_id := null;

    if rec.registration is not null then
      select a.id into v_asset_id
      from public.assets a
      where a.company_id = rec.company_id
        and a.type = 'vehicle'
        and refonte_v2.norm_token(a.registration) = refonte_v2.norm_token(rec.registration)
      limit 1;
    end if;

    if v_asset_id is null then
      insert into public.assets (
        company_id, type, ownership_type, owner_kind, registration, fleet_number, status
      ) values (
        rec.company_id,
        'vehicle',
        'owned',
        'company',
        rec.registration,
        rec.fleet_number,
        case
          when lower(coalesce(rec.statut, '')) in ('hors_service', 'inactive', 'inactif') then 'inactive'
          when lower(coalesce(rec.statut, '')) in ('en_maintenance', 'maintenance') then 'maintenance'
          else 'active'
        end
      )
      returning id into v_asset_id;
    else
      update public.assets a
      set
        fleet_number = coalesce(a.fleet_number, rec.fleet_number),
        registration = coalesce(a.registration, rec.registration),
        updated_at = now()
      where a.id = v_asset_id;
    end if;

    insert into public.asset_vehicle_details (
      asset_id, company_id, brand, model, year, ptac_kg, vin, ct_expires_at, insurance_expires_at
    ) values (
      v_asset_id, rec.company_id, rec.marque, rec.modele, rec.annee, rec.ptac_kg, rec.vin, rec.ct_expiration, rec.assurance_expiration
    )
    on conflict (asset_id) do update
    set
      brand = coalesce(public.asset_vehicle_details.brand, excluded.brand),
      model = coalesce(public.asset_vehicle_details.model, excluded.model),
      year = coalesce(public.asset_vehicle_details.year, excluded.year),
      ptac_kg = coalesce(public.asset_vehicle_details.ptac_kg, excluded.ptac_kg),
      vin = coalesce(public.asset_vehicle_details.vin, excluded.vin),
      ct_expires_at = coalesce(public.asset_vehicle_details.ct_expires_at, excluded.ct_expires_at),
      insurance_expires_at = coalesce(public.asset_vehicle_details.insurance_expires_at, excluded.insurance_expires_at),
      updated_at = now();

    update refonte_v2.map_asset_legacy
    set asset_id = v_asset_id,
        mapping_status = 'mapped',
        conflict_reason = null,
        mapped_at = now()
    where id = rec.map_id;
  end loop;
end;
$$;

-- -----------------------------------------------------------------
-- ASSETS bridge: remorques
-- -----------------------------------------------------------------
do $$
declare
  rec record;
  v_asset_id uuid;
begin
  for rec in
    select
      m.id as map_id,
      m.company_id,
      nullif(r.immatriculation, '') as registration,
      r.marque,
      r.type_remorque,
      r.charge_utile_kg,
      r.longueur_m,
      nullif(r.vin, '') as vin,
      r.ct_expiration,
      r.assurance_expiration,
      r.statut
    from refonte_v2.map_asset_legacy m
    join public.remorques r on r.id = m.source_id
    where m.source_table = 'remorques'
      and m.mapping_status = 'pending'
  loop
    v_asset_id := null;

    if rec.registration is not null then
      select a.id into v_asset_id
      from public.assets a
      where a.company_id = rec.company_id
        and a.type = 'trailer'
        and refonte_v2.norm_token(a.registration) = refonte_v2.norm_token(rec.registration)
      limit 1;
    end if;

    if v_asset_id is null then
      insert into public.assets (
        company_id, type, ownership_type, owner_kind, registration, status
      ) values (
        rec.company_id,
        'trailer',
        'owned',
        'company',
        rec.registration,
        case
          when lower(coalesce(rec.statut, '')) in ('hors_service', 'inactive', 'inactif') then 'inactive'
          when lower(coalesce(rec.statut, '')) in ('en_maintenance', 'maintenance') then 'maintenance'
          else 'active'
        end
      )
      returning id into v_asset_id;
    else
      update public.assets a
      set
        registration = coalesce(a.registration, rec.registration),
        updated_at = now()
      where a.id = v_asset_id;
    end if;

    insert into public.asset_trailer_details (
      asset_id, company_id, trailer_type, useful_load_kg, length_m, vin, ct_expires_at, insurance_expires_at
    ) values (
      v_asset_id, rec.company_id, rec.type_remorque, rec.charge_utile_kg, rec.longueur_m, rec.vin, rec.ct_expiration, rec.assurance_expiration
    )
    on conflict (asset_id) do update
    set
      trailer_type = coalesce(public.asset_trailer_details.trailer_type, excluded.trailer_type),
      useful_load_kg = coalesce(public.asset_trailer_details.useful_load_kg, excluded.useful_load_kg),
      length_m = coalesce(public.asset_trailer_details.length_m, excluded.length_m),
      vin = coalesce(public.asset_trailer_details.vin, excluded.vin),
      ct_expires_at = coalesce(public.asset_trailer_details.ct_expires_at, excluded.ct_expires_at),
      insurance_expires_at = coalesce(public.asset_trailer_details.insurance_expires_at, excluded.insurance_expires_at),
      updated_at = now();

    update refonte_v2.map_asset_legacy
    set asset_id = v_asset_id,
        mapping_status = 'mapped',
        conflict_reason = null,
        mapped_at = now()
    where id = rec.map_id;
  end loop;
end;
$$;

-- Final fallback: si encore pending, marquer conflict v3
update refonte_v2.map_person_legacy
set mapping_status = 'conflict',
    conflict_reason = coalesce(conflict_reason, 'no_candidate_v3')
where source_table in ('conducteurs', 'employee_directory')
  and mapping_status = 'pending';

update refonte_v2.map_asset_legacy
set mapping_status = 'conflict',
    conflict_reason = coalesce(conflict_reason, 'no_candidate_v3')
where source_table in ('vehicules', 'remorques')
  and mapping_status = 'pending';

-- Propagation legacy
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

-- Rebuild snapshot daily
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

-- Refresh KPI
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
