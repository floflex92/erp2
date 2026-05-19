-- Hotfix auth bootstrap/profile loading:
-- Some RLS paths call public.is_platform_admin().
-- Ensure authenticated role can execute it.

DO $$
BEGIN
  IF to_regprocedure('public.is_platform_admin()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated';
  END IF;
END
$$;
