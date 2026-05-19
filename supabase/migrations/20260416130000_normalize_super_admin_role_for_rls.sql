-- Fix: super_admin role returned by get_active_role() is not listed in any RLS policy.
-- Solution: normalize 'super_admin' -> 'admin' in get_user_role() so all tables
-- with policies allowing 'admin' also allow super_admin users transparently.

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
  -- Preferred: unified role resolver (impersonation + tenant default role + legacy fallback).
  begin
    select public.get_active_role() into v_role;
  exception when undefined_function then
    v_role := null;
  end;

  -- Fallback 1: tenant_user_roles (when tenant_users.default_role_id is null).
  if v_role is null then
    begin
      select r.name into v_role
      from public.tenant_users tu
      join public.tenant_user_roles tur on tur.tenant_user_id = tu.id
      join public.roles r on r.id = tur.role_id
      where tu.user_id = auth.uid()
        and tu.is_active = true
      order by
        case r.name
          when 'admin' then 1
          when 'dirigeant' then 2
          when 'exploitant' then 3
          when 'logisticien' then 4
          when 'affreteur' then 5
          when 'conducteur_affreteur' then 6
          when 'commercial' then 7
          when 'comptable' then 8
          when 'rh' then 9
          when 'conducteur' then 10
          else 99
        end,
        tur.granted_at asc
      limit 1;
    exception when undefined_table then
      v_role := null;
    end;
  end if;

  -- Fallback 2: legacy profils table.
  if v_role is null then
    select p.role into v_role
    from public.profils p
    where p.user_id = auth.uid()
    limit 1;
  end if;

  -- Normalize super_admin -> admin so all existing RLS policies apply correctly.
  -- super_admin has at least the same access as admin for all business tables.
  if v_role = 'super_admin' then
    v_role := 'admin';
  end if;

  return v_role;
end;
$$;

revoke all on function public.get_user_role() from public;
grant execute on function public.get_user_role() to authenticated;
