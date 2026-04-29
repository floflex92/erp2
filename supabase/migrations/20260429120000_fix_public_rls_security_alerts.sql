-- Fix Supabase security advisories:
-- - rls_disabled_in_public
-- - sensitive_columns_exposed
--
-- Some additive V2 tables were created after the previous global hardening
-- migration and contain personal or operational data. This migration closes
-- every remaining public table, then applies tenant-scoped policies to the
-- V2 tables that the application reads directly.

revoke create on schema public from anon;
revoke create on schema public from authenticated;

do $$
declare
  tbl record;
begin
  for tbl in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', tbl.table_name);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Refonte V2 - persons directory
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.persons') is not null then
    drop policy if exists persons_select_own_company on public.persons;
    create policy persons_select_own_company
      on public.persons
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or company_id = public.my_company_id()
      );

    drop policy if exists persons_write_admin_rh on public.persons;
    create policy persons_write_admin_rh
      on public.persons
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh')
        )
      );
  end if;

  if to_regclass('public.person_employment') is not null then
    drop policy if exists person_employment_select_hr on public.person_employment;
    create policy person_employment_select_hr
      on public.person_employment
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh', 'exploitant')
        )
      );

    drop policy if exists person_employment_write_hr on public.person_employment;
    create policy person_employment_write_hr
      on public.person_employment
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh')
        )
      );
  end if;

  if to_regclass('public.person_driver_details') is not null then
    drop policy if exists person_driver_details_select_staff on public.person_driver_details;
    create policy person_driver_details_select_staff
      on public.person_driver_details
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh', 'exploitant', 'mecanicien')
        )
      );

    drop policy if exists person_driver_details_write_hr_ops on public.person_driver_details;
    create policy person_driver_details_write_hr_ops
      on public.person_driver_details
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh', 'exploitant')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'rh', 'exploitant')
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Refonte V2 - assets and technical details
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.assets') is not null then
    drop policy if exists assets_select_staff on public.assets;
    create policy assets_select_staff
      on public.assets
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in (
            'admin', 'dirigeant', 'exploitant', 'mecanicien',
            'commercial', 'comptable', 'rh', 'conducteur'
          )
        )
      );

    drop policy if exists assets_write_fleet on public.assets;
    create policy assets_write_fleet
      on public.assets
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      );
  end if;

  if to_regclass('public.asset_vehicle_details') is not null then
    drop policy if exists asset_vehicle_details_select_staff on public.asset_vehicle_details;
    create policy asset_vehicle_details_select_staff
      on public.asset_vehicle_details
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien', 'comptable')
        )
      );

    drop policy if exists asset_vehicle_details_write_fleet on public.asset_vehicle_details;
    create policy asset_vehicle_details_write_fleet
      on public.asset_vehicle_details
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      );
  end if;

  if to_regclass('public.asset_trailer_details') is not null then
    drop policy if exists asset_trailer_details_select_staff on public.asset_trailer_details;
    create policy asset_trailer_details_select_staff
      on public.asset_trailer_details
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien', 'comptable')
        )
      );

    drop policy if exists asset_trailer_details_write_fleet on public.asset_trailer_details;
    create policy asset_trailer_details_write_fleet
      on public.asset_trailer_details
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      );
  end if;

  if to_regclass('public.asset_assignments') is not null then
    drop policy if exists asset_assignments_select_staff on public.asset_assignments;
    create policy asset_assignments_select_staff
      on public.asset_assignments
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien', 'rh')
        )
      );

    drop policy if exists asset_assignments_write_ops on public.asset_assignments;
    create policy asset_assignments_write_ops
      on public.asset_assignments
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant')
        )
      );
  end if;

  if to_regclass('public.asset_km_readings') is not null then
    drop policy if exists asset_km_readings_select_staff on public.asset_km_readings;
    create policy asset_km_readings_select_staff
      on public.asset_km_readings
      for select
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien', 'comptable')
        )
      );

    drop policy if exists asset_km_readings_write_fleet on public.asset_km_readings;
    create policy asset_km_readings_write_fleet
      on public.asset_km_readings
      for all
      to authenticated
      using (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      )
      with check (
        public.is_platform_admin()
        or (
          company_id = public.my_company_id()
          and public.get_user_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien')
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Refonte V2 - reference tables
-- ---------------------------------------------------------------------------
do $$
declare
  ref_table text;
begin
  foreach ref_table in array array[
    'ref_transport_status',
    'ref_transport_types',
    'ref_absence_types',
    'ref_asset_types',
    'ref_document_types',
    'ref_priority_levels',
    'ref_employment_status'
  ]
  loop
    if to_regclass(format('public.%I', ref_table)) is not null then
      execute format('drop policy if exists %I on public.%I', ref_table || '_select_own_or_global', ref_table);
      execute format(
        'create policy %I on public.%I
           for select
           to authenticated
           using (
             public.is_platform_admin()
             or company_id is null
             or company_id = public.my_company_id()
           )',
        ref_table || '_select_own_or_global',
        ref_table
      );

      execute format('drop policy if exists %I on public.%I', ref_table || '_write_admin_only', ref_table);
      execute format(
        'create policy %I on public.%I
           for all
           to authenticated
           using (
             public.is_platform_admin()
             or (
               company_id = public.my_company_id()
               and public.get_user_role() in (''admin'', ''dirigeant'')
             )
           )
           with check (
             public.is_platform_admin()
             or (
               company_id = public.my_company_id()
               and public.get_user_role() in (''admin'', ''dirigeant'')
             )
           )',
        ref_table || '_write_admin_only',
        ref_table
      );
    end if;
  end loop;
end $$;

-- Final safety net: any public table still without a policy is closed to
-- normal API users and only readable/manageable by platform admins.
do $$
declare
  tbl record;
  policy_count integer;
begin
  for tbl in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity = true
  loop
    select count(*)
    into policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = tbl.table_name;

    if policy_count = 0 then
      execute format(
        'create policy %I on public.%I
           for all
           to authenticated
           using (public.is_platform_admin())
           with check (public.is_platform_admin())',
        'platform_admin_only_' || tbl.table_name,
        tbl.table_name
      );
    end if;
  end loop;
end $$;
