-- =============================================================================
-- FIX TENANT ADMIN POLICIES (login_enabled -> is_active)
-- Date: 2026-05-03
-- Problème: les policies tenant-admin continuent de référencer profils.login_enabled,
--          alors que la colonne a été renommée/supprimée au profit de profils.is_active.
-- Impact: erreurs SQL "column login_enabled does not exist" lors des updates tenant
--         (ex: activation/desactivation de modules dans companies.enabled_modules).
-- =============================================================================

-- 1) Fonction helper tenant-admin alignée sur is_active.
create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profils
    where user_id = auth.uid()
      and role in ('admin', 'super_admin', 'dirigeant')
      and coalesce(is_active, true) = true
  );
$$;

-- 2) Policies companies alignées sur is_active.
drop policy if exists companies_read_own on public.companies;
create policy companies_read_own
  on public.companies for select
  using (
    id in (
      select company_id
      from public.profils
      where user_id = auth.uid()
        and coalesce(is_active, true) = true
    )
    or public.is_platform_admin()
  );

drop policy if exists companies_update_tenant_admin on public.companies;
create policy companies_update_tenant_admin
  on public.companies for update
  using (
    (
      id in (
        select company_id
        from public.profils
        where user_id = auth.uid()
          and coalesce(is_active, true) = true
      )
      and public.is_tenant_admin()
    )
    or public.is_platform_admin()
  );

-- 3) Policies profils alignées sur is_active.
drop policy if exists profils_read_own on public.profils;
create policy profils_read_own
  on public.profils for select
  using (
    user_id = auth.uid()
    or (
      company_id in (
        select company_id
        from public.profils p2
        where p2.user_id = auth.uid()
          and coalesce(p2.is_active, true) = true
      )
      and public.is_tenant_admin()
    )
    or public.is_platform_admin()
  );

drop policy if exists profils_update_own_or_admin on public.profils;
create policy profils_update_own_or_admin
  on public.profils for update
  using (
    user_id = auth.uid()
    or (
      company_id in (
        select company_id
        from public.profils p2
        where p2.user_id = auth.uid()
          and coalesce(p2.is_active, true) = true
      )
      and public.is_tenant_admin()
    )
    or public.is_platform_admin()
  );
