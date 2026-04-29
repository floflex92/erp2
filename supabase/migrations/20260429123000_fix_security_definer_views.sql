-- Fix Supabase Security Advisor: Security Definer View.
-- Public views should run with the permissions/RLS context of the querying user.

do $$
declare
  view_row record;
begin
  for view_row in
    select schemaname, viewname
    from pg_views
    where schemaname = 'public'
  loop
    execute format(
      'alter view %I.%I set (security_invoker = true)',
      view_row.schemaname,
      view_row.viewname
    );
  end loop;
end $$;
