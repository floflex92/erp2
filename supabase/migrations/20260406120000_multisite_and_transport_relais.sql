-- Extension multi-site / multi-depots + reprise de charge et relais conducteur
-- 2026-04-06

-- ─── 1. Etendre sites_logistiques ─────────────────────────────────────────────

alter table public.sites_logistiques
  add column if not exists code_postal    text,
  add column if not exists ville          text,
  add column if not exists pays           text not null default 'France',
  add column if not exists contact_nom    text,
  add column if not exists contact_tel    text,
  add column if not exists notes          text,
  add column if not exists est_depot_relais boolean not null default true,
  add column if not exists type_site      text not null default 'depot';

-- Contrainte sur type_site
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sites_logistiques_type_site_check'
  ) then
    alter table public.sites_logistiques
      add constraint sites_logistiques_type_site_check
        check (type_site in ('entrepot','depot','agence','client','quai','autre'));
  end if;
end $$;

-- ─── 2. Table transport_relais ────────────────────────────────────────────────

create table if not exists public.transport_relais (
  id                    uuid primary key default gen_random_uuid(),
  ot_id                 uuid not null references public.ordres_transport(id) on delete cascade,

  -- Type de relais
  type_relais           text not null default 'depot_marchandise'
                          check (type_relais in ('depot_marchandise', 'relais_conducteur')),

  -- Lieu du relais (site connu ou saisie libre)
  site_id               uuid references public.sites_logistiques(id) on delete set null,
  lieu_nom              text not null,
  lieu_adresse          text,
  lieu_lat              numeric(10,7),
  lieu_lng              numeric(10,7),

  -- Conducteur / ressources qui deposent (ou premier troncon relais)
  conducteur_depose_id  uuid references public.conducteurs(id) on delete set null,
  vehicule_depose_id    uuid references public.vehicules(id) on delete set null,
  remorque_depose_id    uuid references public.remorques(id) on delete set null,
  date_depot            timestamptz not null default now(),

  -- Conducteur / ressources qui reprennent (ou second troncon relais)
  conducteur_reprise_id uuid references public.conducteurs(id) on delete set null,
  vehicule_reprise_id   uuid references public.vehicules(id) on delete set null,
  remorque_reprise_id   uuid references public.remorques(id) on delete set null,
  date_reprise_prevue   timestamptz,
  date_reprise_reelle   timestamptz,

  -- Statut
  statut                text not null default 'en_attente'
                          check (statut in ('en_attente','assigne','en_cours_reprise','termine','annule')),

  notes                 text,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists transport_relais_ot_idx
  on public.transport_relais(ot_id);
create index if not exists transport_relais_statut_idx
  on public.transport_relais(statut);
create index if not exists transport_relais_site_idx
  on public.transport_relais(site_id)
  where site_id is not null;

-- ─── 3. RLS transport_relais ──────────────────────────────────────────────────

alter table public.transport_relais enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'transport_relais' and policyname = 'transport_relais_rw'
  ) then
    create policy transport_relais_rw
      on public.transport_relais
      for all
      using (get_user_role() in ('admin','dirigeant','exploitant','conducteur'))
      with check (get_user_role() in ('admin','dirigeant','exploitant'));
  end if;
end $$;

-- ─── 4. Trigger updated_at ────────────────────────────────────────────────────

do $$
begin
  perform public.add_updated_at_trigger('public.transport_relais');
exception when others then null;
end $$;
