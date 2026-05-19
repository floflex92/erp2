-- =============================================================================
-- FIX: RLS recursion on public.profils after is_active migration
-- Date: 2026-05-03
-- Cause: policy profils_read_own / profils_update_own_or_admin reintroduced a
--        subquery on public.profils from inside a policy on public.profils.
--        This triggers "infinite recursion detected in policy for relation profils".
-- =============================================================================

-- Ensure helper returns account activity from the current schema version.
create or replace function public.my_login_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_active from public.profils where user_id = auth.uid() limit 1),
    false
  );
$$;

-- Rebuild profils policies without self-referencing subqueries.
drop policy if exists profils_read_own on public.profils;
create policy profils_read_own
  on public.profils for select
  using (
    user_id = auth.uid()
    or (
      company_id = public.my_company_id()
      and public.my_login_enabled()
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
      company_id = public.my_company_id()
      and public.my_login_enabled()
      and public.is_tenant_admin()
    )
    or public.is_platform_admin()
  );

-- Keep companies policies aligned with helper-based checks.
drop policy if exists companies_read_own on public.companies;
create policy companies_read_own
  on public.companies for select
  using (
    id = public.my_company_id()
    or public.is_platform_admin()
  );

drop policy if exists companies_update_tenant_admin on public.companies;
create policy companies_update_tenant_admin
  on public.companies for update
  using (
    (
      id = public.my_company_id()
      and public.my_login_enabled()
      and public.is_tenant_admin()
    )
    or public.is_platform_admin()
  );
