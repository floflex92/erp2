-- Corrige les tables publiques creees sans RLS (alerte Supabase: rls_disabled_in_public)
-- Objectif: fermer l'acces anonyme et appliquer un garde-fou role-based coherent.

do $$
declare
  tbl record;
  policy_count integer;
begin
  -- Active RLS sur toutes les tables physiques du schema public qui ne l'ont pas encore.
  for tbl in
    select c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = false
  loop
    execute format('alter table public.%I enable row level security', tbl.tablename);

    -- Si la table n'a aucune policy, on pose un garde-fou role-based commun.
    select count(*)
    into policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = tbl.tablename;

    if policy_count = 0 then
      execute format(
        'create policy %I on public.%I
           for all
           to authenticated
           using (auth.uid() is not null)
           with check (auth.uid() is not null)',
        'role_guard_' || tbl.tablename,
        tbl.tablename
      );
    end if;
  end loop;
end $$;
