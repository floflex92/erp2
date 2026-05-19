-- Fix RLS role resolution after multi-tenant auth refactor.
-- Problem: strict policies use public.get_user_role(), which only reads public.profils.
-- After tenant_users/impersonation rollout, some users have no usable profils row,
-- causing NULL role and empty result sets (notably ordres_transport in Planning).

create or replace function public.get_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
begin
  -- Preferred path: unified role resolver introduced by multi-tenant refactor.
  begin
    select public.get_active_role() into v_role;
  exception when undefined_function then
    v_role := null;
  end;

  -- Legacy fallback: direct profils role lookup.
  if v_role is null then
    select p.role into v_role
    from public.profils p
    where p.user_id = auth.uid()
    limit 1;
  end if;

  return v_role;
end;
$$;

revoke all on function public.get_user_role() from public;
grant execute on function public.get_user_role() to authenticated;
