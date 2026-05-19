-- Groupage de courses: liaison multi-courses figeable/deliable
-- Ajout minimal sur ordres_transport pour rester compatible avec l'existant.

alter table public.ordres_transport
  add column if not exists groupage_id uuid,
  add column if not exists groupage_fige boolean;
update public.ordres_transport
set groupage_fige = coalesce(groupage_fige, false)
where groupage_fige is null;
alter table public.ordres_transport
  alter column groupage_fige set default false,
  alter column groupage_fige set not null;
create index if not exists ordres_transport_groupage_idx
  on public.ordres_transport(groupage_id, groupage_fige, date_chargement_prevue);
create index if not exists ordres_transport_groupage_members_idx
  on public.ordres_transport(groupage_id)
  where groupage_id is not null;
-- Si la course n'appartient pas a un groupage, elle ne peut pas etre figee.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ordres_transport_groupage_consistency_check'
  ) then
    alter table public.ordres_transport
      add constraint ordres_transport_groupage_consistency_check
      check ((groupage_id is null and groupage_fige = false) or groupage_id is not null);
  end if;
end $$;
