-- =============================================================================
-- Repair seed: ensure baseline tenant/company records exist (idempotent)
-- Date: 2026-04-15
-- Goal: restore visibility of baseline tenant in super-admin backoffice
-- =============================================================================

-- 1) Ensure companies table has baseline company id=1 (Tenant Test)
insert into public.companies (id, name, slug, status, subscription_plan, max_users, max_screens)
values (1, 'Tenant Test', 'tenant_test', 'active', 'enterprise', 100, 10)
on conflict (id) do nothing;

insert into public.companies (name, slug, status, subscription_plan, max_users, max_screens)
select 'Tenant Test', 'tenant_test', 'active', 'enterprise', 100, 10
where not exists (
  select 1 from public.companies where slug = 'tenant_test'
)
on conflict (slug) do nothing;

-- 2) Ensure tenant rows exist and point to company 1
alter table public.erp_v11_tenants
  add column if not exists company_id integer references public.companies(id) on delete set null;

insert into public.erp_v11_tenants (tenant_key, display_name, is_active, company_id, default_max_concurrent_screens, allowed_pages)
values ('tenant_test', 'Tenant Test', true, 1, 10, '[]'::jsonb)
on conflict (tenant_key) do update
set display_name = excluded.display_name,
    is_active = true,
    company_id = coalesce(public.erp_v11_tenants.company_id, excluded.company_id);

insert into public.erp_v11_tenants (tenant_key, display_name, is_active, company_id, default_max_concurrent_screens, allowed_pages)
values ('default', 'Tenant par defaut', true, 1, 1, '[]'::jsonb)
on conflict (tenant_key) do update
set is_active = true,
    company_id = coalesce(public.erp_v11_tenants.company_id, excluded.company_id);

-- 3) Keep old rows usable: attach orphan tenant rows to company 1
update public.erp_v11_tenants
set company_id = 1
where company_id is null
  and tenant_key in ('default', 'tenant_test');
