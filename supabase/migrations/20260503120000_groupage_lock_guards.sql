-- Groupage guards cote base: bloquer les liaisons/deliaisons sur missions figees
-- + RPC explicite pour figer/defiger une mission complete sans passer par des updates ligne a ligne.

create or replace function public.guard_transport_groupage_lock()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  old_mission_is_frozen boolean := false;
  new_mission_is_frozen boolean := false;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.mission_id is distinct from old.mission_id then
    if old.groupage_fige then
      raise exception 'Liaison/de-liaison impossible: la course source est figee.';
    end if;

    if old.mission_id is not null then
      select exists (
        select 1
        from public.ordres_transport ot
        where ot.mission_id = old.mission_id
          and ot.groupage_fige
      ) into old_mission_is_frozen;

      if old_mission_is_frozen then
        raise exception 'Liaison/de-liaison impossible: la mission source est figee.';
      end if;
    end if;

    if new.mission_id is not null then
      select exists (
        select 1
        from public.ordres_transport ot
        where ot.mission_id = new.mission_id
          and ot.groupage_fige
      ) into new_mission_is_frozen;

      if new_mission_is_frozen then
        raise exception 'Liaison/de-liaison impossible: la mission cible est figee.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists ordres_transport_guard_groupage_lock on public.ordres_transport;

create trigger ordres_transport_guard_groupage_lock
before update of mission_id on public.ordres_transport
for each row
when (old.mission_id is distinct from new.mission_id)
execute function public.guard_transport_groupage_lock();

create or replace function public.rpc_set_transport_mission_freeze(
  p_mission_id uuid,
  p_next_frozen boolean
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_updated integer := 0;
begin
  if p_mission_id is null then
    raise exception 'Mission requise pour figer/defiger.';
  end if;

  update public.ordres_transport
  set groupage_fige = p_next_frozen
  where mission_id = p_mission_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Mission introuvable ou sans course associee.';
  end if;

  return v_updated;
end;
$$;

grant execute on function public.rpc_set_transport_mission_freeze(uuid, boolean)
  to authenticated;
