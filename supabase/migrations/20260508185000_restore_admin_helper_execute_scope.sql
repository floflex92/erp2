-- Restore EXECUTE scope for auth helper functions used inside RLS policies.
-- These helpers are read-only boolean checks and must be callable during policy evaluation.

DO $$
DECLARE
  routine_name text;
BEGIN
  FOREACH routine_name IN ARRAY ARRAY['is_tenant_admin', 'is_platform_admin']
  LOOP
    IF to_regprocedure(format('public.%s()', routine_name)) IS NOT NULL THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I() TO PUBLIC, anon, authenticated', routine_name);
    END IF;
  END LOOP;
END
$$;
