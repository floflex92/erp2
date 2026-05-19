-- ============================================================
-- War Room Exploitation
-- Date: 2026-04-07
-- Périmètre:
--   - Table imprevu_exploitation (imprévus saisis manuellement)
--   - Vue v_war_room_ot_retard (OT avec statut opérationnel en retard)
--   - Vue v_war_room_ot_non_affectes (OT sans conducteur à planifier)
--   - RLS policies strictes
-- ============================================================

-- 1. Table des imprévus exploitation
create table if not exists public.imprevu_exploitation (
  id             uuid primary key default gen_random_uuid(),
  company_id     integer null references public.companies(id) on delete cascade,
  ot_id          uuid null references public.ordres_transport(id) on delete set null,
  vehicule_id    uuid null references public.vehicules(id) on delete set null,
  conducteur_id  uuid null references public.conducteurs(id) on delete set null,
  type           text not null check (type in (
    'panne_vehicule', 'retard_chargement', 'retard_livraison',
    'refus_chargement', 'accident', 'absence_conducteur', 'autre'
  )),
  titre          text not null,
  description    text null,
  priorite       text not null default 'normale' check (priorite in ('critique', 'elevee', 'normale')),
  statut         text not null default 'ouvert' check (statut in ('ouvert', 'en_cours', 'resolu', 'clos')),
  action_prise   text null,
  notif_client_envoyee boolean not null default false,
  resolved_by    uuid null references auth.users(id) on delete set null,
  resolved_at    timestamptz null,
  created_by     uuid null references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Index utiles
create index if not exists idx_imprevu_exploit_ot_id    on public.imprevu_exploitation(ot_id);
create index if not exists idx_imprevu_exploit_company  on public.imprevu_exploitation(company_id);
create index if not exists idx_imprevu_exploit_statut   on public.imprevu_exploitation(statut) where statut <> 'clos';
create index if not exists idx_imprevu_exploit_created  on public.imprevu_exploitation(created_at desc);
create index if not exists idx_imprevu_exploit_priorite on public.imprevu_exploitation(priorite);

-- Trigger updated_at
create or replace function public.set_imprevu_exploitation_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_imprevu_exploitation_updated_at on public.imprevu_exploitation;
create trigger trg_imprevu_exploitation_updated_at
  before update on public.imprevu_exploitation
  for each row execute function public.set_imprevu_exploitation_updated_at();

-- 2. Vue : OT actuellement en retard (War Room — zone rouge/orange)
create or replace view public.v_war_room_ot_retard as
select
  ot.id,
  ot.reference,
  ot.statut_operationnel,
  ot.statut_transport,
  ot.date_chargement_prevue,
  ot.date_livraison_prevue,
  ot.conducteur_id,
  ot.vehicule_id,
  ot.nature_marchandise,
  ot.poids_kg,
  c.nom   as client_nom,
  concat(cond.prenom, ' ', cond.nom) as conducteur_nom,
  v.immatriculation as vehicule_immat
from public.ordres_transport ot
left join public.clients     c    on c.id    = ot.client_id
left join public.conducteurs cond on cond.id = ot.conducteur_id
left join public.vehicules   v    on v.id    = ot.vehicule_id
where ot.statut_operationnel in ('retard_mineur', 'retard_majeur')
  and ot.statut not in ('annule', 'facture');

-- 3. Vue : OT validés non-affectés (War Room — zone vigilance)
create or replace view public.v_war_room_ot_non_affectes as
select
  ot.id,
  ot.reference,
  ot.statut_transport,
  ot.date_chargement_prevue,
  ot.date_livraison_prevue,
  ot.type_transport,
  ot.nature_marchandise,
  ot.poids_kg,
  c.nom as client_nom,
  round(extract(epoch from (now() - ot.created_at)) / 3600.0, 1) as age_heures
from public.ordres_transport ot
left join public.clients c on c.id = ot.client_id
where ot.conducteur_id is null
  and ot.statut_transport in ('valide', 'en_attente_planification')
  and ot.statut not in ('annule', 'brouillon')
  and ot.date_chargement_prevue >= current_date - 1
order by ot.date_chargement_prevue asc;

-- 4. RLS
alter table public.imprevu_exploitation enable row level security;

create policy "imprevu_exploit_select" on public.imprevu_exploitation
  for select to authenticated
  using (
    company_id is null
    or exists (
      select 1 from public.profils p
      where p.user_id = auth.uid()
        and (p.company_id = imprevu_exploitation.company_id or p.role in ('admin', 'super_admin'))
    )
  );

create policy "imprevu_exploit_insert" on public.imprevu_exploitation
  for insert to authenticated
  with check (
    company_id is null
    or exists (
      select 1 from public.profils p
      where p.user_id = auth.uid()
        and (p.company_id = imprevu_exploitation.company_id or p.role in ('admin', 'super_admin'))
    )
  );

create policy "imprevu_exploit_update" on public.imprevu_exploitation
  for update to authenticated
  using (
    company_id is null
    or exists (
      select 1 from public.profils p
      where p.user_id = auth.uid()
        and (p.company_id = imprevu_exploitation.company_id or p.role in ('admin', 'super_admin'))
    )
  )
  with check (
    company_id is null
    or exists (
      select 1 from public.profils p
      where p.user_id = auth.uid()
        and (p.company_id = imprevu_exploitation.company_id or p.role in ('admin', 'super_admin'))
    )
  );
