-- Hardening securite: suppression des policies trop permissives + garde-fous RLS.
-- 1) Retire les policies historiques allow_all/admin_all et alias permissifs connus.
-- 2) Assure un fallback minimal si une table RLS n'a plus de policy.
-- 3) Durcit current_profil_id() (SECURITY DEFINER) avec search_path explicite.
-- 4) Empêche la creation d'objets dans public par anon/authenticated.

revoke create on schema public from anon;
revoke create on schema public from authenticated;

do $$
declare
  pol record;
  tbl record;
  policy_count integer;
begin
  -- Nettoyage des policies historiques permissives.
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (
        policyname like 'allow_all_%'
        or policyname like 'admin_all_%'
        or policyname in ('Authenticated read rapports', 'Authenticated read config')
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;

  -- Cas explicite: insertion de conversation reservee aux users authentifies.
  if to_regclass('public.tchat_conversations') is not null then
    execute 'drop policy if exists "tchat_conversations_insert" on public.tchat_conversations';
    execute '
      create policy tchat_conversations_insert
        on public.tchat_conversations
        for insert
        to authenticated
        with check (auth.uid() is not null)
    ';
  end if;

  -- Fallback: pour toute table publique avec RLS active et sans policy,
  -- poser une policy minimale auth-only.
  for tbl in
    select c.relname as tablename
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity = true
  loop
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

-- Durcit la fonction helper utilisee par les policies tchat.
create or replace function public.current_profil_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select id from public.profils where user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_profil_id() from public;
grant execute on function public.current_profil_id() to authenticated;
