-- Numero de parc pour vehicules/remorques + table equipements flotte assignables.
-- Migration idempotente.

alter table public.vehicules
  add column if not exists numero_parc text;

alter table public.remorques
  add column if not exists numero_parc text;

create index if not exists vehicules_numero_parc_idx on public.vehicules (numero_parc);
create index if not exists remorques_numero_parc_idx on public.remorques (numero_parc);

create table if not exists public.flotte_equipements (
  id uuid primary key default gen_random_uuid(),
  vehicule_id uuid null references public.vehicules(id) on delete cascade,
  remorque_id uuid null references public.remorques(id) on delete cascade,
  nom text not null,
  category text null,
  quantite integer not null default 1,
  statut text not null default 'conforme',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flotte_equipements_asset_check
    check (
      (vehicule_id is not null and remorque_id is null)
      or (vehicule_id is null and remorque_id is not null)
    ),
  constraint flotte_equipements_quantite_check
    check (quantite > 0),
  constraint flotte_equipements_statut_check
    check (statut in ('conforme', 'a_controler', 'hs'))
);

create index if not exists flotte_equipements_vehicule_idx on public.flotte_equipements(vehicule_id);
create index if not exists flotte_equipements_remorque_idx on public.flotte_equipements(remorque_id);
create index if not exists flotte_equipements_statut_idx on public.flotte_equipements(statut);

alter table public.flotte_equipements enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'flotte_equipements'
      and policyname = 'flotte_equipements_rw_flotte'
  ) then
    create policy flotte_equipements_rw_flotte
      on public.flotte_equipements
      for all
      to authenticated
      using (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'))
      with check (public.current_app_role() in ('admin', 'dirigeant', 'exploitant', 'mecanicien'));
  end if;
end $$;

do $$
begin
  perform public.add_updated_at_trigger('public.flotte_equipements');
exception
  when undefined_function then
    null;
end $$;
