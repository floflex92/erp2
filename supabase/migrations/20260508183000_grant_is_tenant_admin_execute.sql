-- Hotfix auth bootstrap/profile loading:
-- RLS policies and helper logic can call public.is_tenant_admin().
-- Ensure authenticated role can execute it.

DO $$
BEGIN
  IF to_regprocedure('public.is_tenant_admin()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_tenant_admin() TO authenticated';
  END IF;
END
$$;
