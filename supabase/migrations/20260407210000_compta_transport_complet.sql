-- ============================================================
-- Comptabilité Transport Complet - Lot B
-- Date: 2026-04-07
-- Périmètre:
--   - Plan comptable enrichi (comptes transport)
--   - Barèmes tarifaires clients (tarif_km, CNR, péages)
--   - Index CNR mensuels
--   - Coûts réels par mission
--   - Mouvements bancaires (import relevé CSV)
--   - Rapprochements bancaires (lettrage)
--   - Scénarios de relance + historique
--   - Flux prévisionnels de trésorerie
--   - Vues analytiques (missions, scoring clients)
--   - RLS policies
-- ============================================================

-- 1. Plan comptable enrichi (transport-specific)
insert into public.compta_plan_comptable (code_compte, libelle, classe) values
  ('101000', 'Capital social', 1),
  ('106000', 'Reserves', 1),
  ('110000', 'Report a nouveau', 1),
  ('120000', 'Resultat de l exercice', 1),
  ('164000', 'Emprunts et dettes financieres', 1),
  ('167000', 'Credit-bail obligations', 1),
  ('218200', 'Materiel de transport', 2),
  ('280000', 'Amortissements', 2),
  ('281820', 'Amort. materiel de transport', 2),
  ('602100', 'Carburant', 6),
  ('602200', 'Lubrifiants et fluides', 6),
  ('613500', 'Location de vehicules', 6),
  ('616000', 'Primes d assurance', 6),
  ('621000', 'Personnel interimaire', 6),
  ('625200', 'Peages autoroutiers', 6),
  ('635100', 'Taxe a l essieu TSVR', 6),
  ('661000', 'Charges d interets', 6),
  ('681120', 'Dotations amort materiel transport', 6),
  ('708100', 'Supplement gasoil', 7),
  ('708200', 'Refacturation peages', 7),
  ('708300', 'Facturation attente', 7),
  ('708400', 'Majoration express', 7)
on conflict (code_compte) do nothing;

-- 2. Barèmes tarifaires par client
create table if not exists public.transport_tarifs_clients (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  libelle text not null default 'Tarif standard',
  tarif_km numeric(8,4) not null default 0,
  coeff_gazole boolean not null default true,
  peages_refactures boolean not null default false,
  forfait_minimum numeric(10,2) null,
  actif boolean not null default true,
  date_debut date not null default current_date,
  date_fin date null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transport_tarifs_client
  on public.transport_tarifs_clients(client_id, actif);

create trigger trg_transport_tarifs_touch
  before update on public.transport_tarifs_clients
  for each row execute function public.compta_touch_updated_at();

-- 3. Index CNR mensuels (indice gazole)
create table if not exists public.transport_cnr_indices (
  id uuid primary key default gen_random_uuid(),
  annee integer not null,
  mois integer not null,
  indice_gazole numeric(8,4) not null,
  indice_reference numeric(8,4) not null default 145.00,
  created_at timestamptz not null default now(),
  constraint transport_cnr_unique unique(annee, mois),
  constraint transport_cnr_mois_chk check (mois between 1 and 12),
  constraint transport_cnr_indice_chk check (indice_gazole > 0 and indice_reference > 0)
);

-- Données CNR 2026 (exemples)
insert into public.transport_cnr_indices (annee, mois, indice_gazole, indice_reference) values
  (2026, 1, 158.50, 145.00),
  (2026, 2, 160.20, 145.00),
  (2026, 3, 155.80, 145.00),
  (2026, 4, 157.30, 145.00)
on conflict (annee, mois) do nothing;

-- 4. Coûts réels par mission
create table if not exists public.transport_missions_couts (
  id uuid primary key default gen_random_uuid(),
  ot_id uuid not null references public.ordres_transport(id) on delete cascade,
  km_reels numeric(9,1) null,
  cout_carburant numeric(10,2) null,
  cout_peages numeric(10,2) null,
  cout_conducteur numeric(10,2) null,
  cout_amortissement numeric(10,2) null,
  cout_sous_traitance numeric(10,2) null,
  cout_autres numeric(10,2) null,
  prix_vente_ht numeric(10,2) null,
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transport_mc_ot_unique unique(ot_id)
);

create index if not exists idx_transport_mc_ot
  on public.transport_missions_couts(ot_id);

create trigger trg_transport_mc_touch
  before update on public.transport_missions_couts
  for each row execute function public.compta_touch_updated_at();

-- 5. Mouvements bancaires (import relevé CSV)
create table if not exists public.mouvements_bancaires (
  id uuid primary key default gen_random_uuid(),
  date_operation date not null,
  date_valeur date null,
  libelle text not null,
  montant numeric(14,2) not null,
  solde_apres numeric(14,2) null,
  reference_banque text null,
  compte_bancaire text not null default 'principal',
  statut text not null default 'a_rapprocher',
  import_hash text null,
  created_at timestamptz not null default now(),
  constraint mouvements_statut_chk check (statut in ('a_rapprocher', 'rapproche', 'ignore')),
  constraint mouvements_hash_unique unique (import_hash)
);

create index if not exists idx_mouvements_date
  on public.mouvements_bancaires(date_operation desc);
create index if not exists idx_mouvements_statut
  on public.mouvements_bancaires(statut);

-- 6. Rapprochements bancaires (lettrage)
create table if not exists public.rapprochements_bancaires (
  id uuid primary key default gen_random_uuid(),
  mouvement_bancaire_id uuid not null references public.mouvements_bancaires(id) on delete cascade,
  facture_id uuid null references public.factures(id) on delete set null,
  facture_fournisseur_id uuid null references public.compta_factures_fournisseurs(id) on delete set null,
  ecriture_id uuid null references public.compta_ecritures(id) on delete set null,
  montant_rapproche numeric(14,2) not null,
  ecart numeric(14,2) not null default 0,
  mode text not null default 'manuel',
  commentaire text null,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint rapprochement_mode_chk check (mode in ('auto', 'manuel'))
);

create index if not exists idx_rapproch_mouvement
  on public.rapprochements_bancaires(mouvement_bancaire_id);
create index if not exists idx_rapproch_facture
  on public.rapprochements_bancaires(facture_id);

-- 7. Scénarios de relance (paramétrage)
create table if not exists public.relances_scenarios (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  niveau integer not null,
  delai_apres_echeance integer not null,
  type text not null default 'email',
  sujet_template text null,
  corps_template text null,
  actif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relances_niveau_chk check (niveau between 1 and 5)
);

insert into public.relances_scenarios (nom, niveau, delai_apres_echeance, type, sujet_template, corps_template) values
  (
    'Rappel courtois', 1, 5, 'email',
    'Facture {{numero}} - Rappel de paiement',
    'Bonjour,' || chr(10) || chr(10) ||
    'Nous vous rappelons que la facture {{numero}} d''un montant de {{montant}} est arrivee a echeance le {{echeance}}.' || chr(10) || chr(10) ||
    'Nous vous remercions de proceder au reglement dans les meilleurs delais.' || chr(10) || chr(10) ||
    'Cordialement'
  ),
  (
    'Relance formelle', 2, 15, 'email',
    'RELANCE - Facture {{numero}} impayee',
    'Bonjour,' || chr(10) || chr(10) ||
    'Malgre notre relance precedente, la facture {{numero}} ({{montant}}) demeure impayee.' || chr(10) || chr(10) ||
    'Nous vous demandons de regulariser votre situation sous 8 jours.' || chr(10) ||
    'Note : des penalites de retard peuvent s''appliquer conformement a nos CGV.' || chr(10) || chr(10) ||
    'Cordialement'
  ),
  (
    'Mise en demeure', 3, 30, 'email',
    'MISE EN DEMEURE - Facture {{numero}}',
    'Bonjour,' || chr(10) || chr(10) ||
    'Par la presente, nous vous mettons en demeure de regler la facture {{numero}} ({{montant}}) dans un delai de 8 jours.' || chr(10) || chr(10) ||
    'A defaut de reglement, nous nous reserverons le droit d''engager une procedure de recouvrement judiciaire et de facturer des indemnites de recouvrement (40 EUR forfaitaires + interets legaux).' || chr(10) || chr(10) ||
    'Cordialement'
  ),
  (
    'Contentieux', 4, 45, 'email',
    'CONTENTIEUX - Dossier {{numero}}',
    'Bonjour,' || chr(10) || chr(10) ||
    'Ce courrier vaut dernier avertissement avant transmission de votre dossier a notre conseil juridique.' || chr(10) || chr(10) ||
    'Montant du : {{montant}}' || chr(10) ||
    'Reference : {{numero}}' || chr(10) || chr(10) ||
    'Cordialement'
  )
on conflict do nothing;

-- 8. Historique des relances envoyées
create table if not exists public.relances_historique (
  id uuid primary key default gen_random_uuid(),
  facture_id uuid not null references public.factures(id) on delete cascade,
  scenario_id uuid null references public.relances_scenarios(id) on delete set null,
  niveau integer not null,
  date_envoi timestamptz not null default now(),
  mode text not null default 'email',
  montant_relance numeric(14,2) not null default 0,
  statut text not null default 'envoye',
  notes text null,
  created_by uuid null references auth.users(id) on delete set null,
  constraint relances_hist_statut_chk check (statut in ('envoye', 'echec', 'annule'))
);

create index if not exists idx_relances_hist_facture
  on public.relances_historique(facture_id);
create index if not exists idx_relances_hist_date
  on public.relances_historique(date_envoi desc);

-- 9. Flux prévisionnels de trésorerie
create table if not exists public.treso_flux_previsionnels (
  id uuid primary key default gen_random_uuid(),
  date_flux date not null,
  libelle text not null,
  montant numeric(14,2) not null,
  type_flux text not null default 'autre',
  probabilite numeric(5,2) not null default 100,
  source text not null default 'manuel',
  source_id uuid null,
  realise boolean not null default false,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint treso_flux_type_chk check (type_flux in ('client', 'fournisseur', 'charge_fixe', 'leasing', 'salaires', 'impot', 'autre')),
  constraint treso_flux_proba_chk check (probabilite between 0 and 100)
);

create index if not exists idx_treso_flux_date
  on public.treso_flux_previsionnels(date_flux);

create trigger trg_treso_flux_touch
  before update on public.treso_flux_previsionnels
  for each row execute function public.compta_touch_updated_at();

-- 10. Vue : analytique missions
create or replace view public.vue_analytique_missions as
select
  ot.id                               as ot_id,
  ot.reference,
  ot.date_chargement_prevue           as date_chargement,
  ot.statut,
  ot.vehicule_id,
  ot.conducteur_id,
  c.id                                as client_id,
  c.nom                               as client_nom,
  mc.id                               as cout_id,
  mc.km_reels,
  coalesce(mc.cout_carburant,    0)   as cout_carburant,
  coalesce(mc.cout_peages,       0)   as cout_peages,
  coalesce(mc.cout_conducteur,   0)   as cout_conducteur,
  coalesce(mc.cout_amortissement,0)   as cout_amortissement,
  coalesce(mc.cout_sous_traitance,0)  as cout_sous_traitance,
  coalesce(mc.cout_autres,       0)   as cout_autres,
  (
    coalesce(mc.cout_carburant,    0)
    + coalesce(mc.cout_peages,     0)
    + coalesce(mc.cout_conducteur, 0)
    + coalesce(mc.cout_amortissement, 0)
    + coalesce(mc.cout_sous_traitance,0)
    + coalesce(mc.cout_autres,     0)
  )                                   as cout_total,
  coalesce(mc.prix_vente_ht, f.montant_ht, ot.prix_ht, 0) as prix_vente_ht,
  coalesce(mc.prix_vente_ht, f.montant_ht, ot.prix_ht, 0)
  - (
    coalesce(mc.cout_carburant,    0)
    + coalesce(mc.cout_peages,     0)
    + coalesce(mc.cout_conducteur, 0)
    + coalesce(mc.cout_amortissement, 0)
    + coalesce(mc.cout_sous_traitance,0)
    + coalesce(mc.cout_autres,     0)
  )                                   as marge_nette,
  case
    when coalesce(mc.prix_vente_ht, f.montant_ht, ot.prix_ht, 0) > 0 then
      round(
        (
          coalesce(mc.prix_vente_ht, f.montant_ht, ot.prix_ht, 0)
          - (
            coalesce(mc.cout_carburant,    0)
            + coalesce(mc.cout_peages,     0)
            + coalesce(mc.cout_conducteur, 0)
            + coalesce(mc.cout_amortissement, 0)
            + coalesce(mc.cout_sous_traitance,0)
            + coalesce(mc.cout_autres,     0)
          )
        ) / nullif(coalesce(mc.prix_vente_ht, f.montant_ht, ot.prix_ht, 0), 0) * 100
      , 2)
    else null
  end                                 as marge_pct,
  case
    when mc.km_reels > 0 then
      round(
        (coalesce(mc.cout_carburant, 0) + coalesce(mc.cout_peages, 0))
        / mc.km_reels
      , 4)
    else null
  end                                 as cout_km,
  f.id                                as facture_id,
  f.statut                            as facture_statut,
  ot.created_at
from public.ordres_transport ot
left join public.clients c              on c.id  = ot.client_id
left join public.transport_missions_couts mc on mc.ot_id = ot.id
left join public.factures f             on f.ot_id = ot.id and f.statut != 'annulee';

-- 11. Vue : scoring clients
create or replace view public.vue_scoring_clients as
with base as (
  select
    c.id                                                          as client_id,
    c.nom                                                         as client_nom,
    count(distinct f.id)                                          as nb_factures,
    coalesce(sum(f.montant_ht), 0)                                as ca_total,
    coalesce(avg(
      case
        when f.statut = 'payee'
          and f.date_paiement is not null
          and f.date_echeance is not null
          and f.date_paiement > f.date_echeance
        then extract(epoch from
          (f.date_paiement::timestamp - f.date_echeance::timestamp)
        ) / 86400.0
        else 0
      end
    ), 0)                                                         as retard_moyen_jours,
    coalesce(sum(case when f.statut = 'en_retard' then f.montant_ht else 0 end), 0)
                                                                  as encours_retard,
    coalesce(sum(case when f.statut in ('envoyee','en_retard') then f.montant_ht else 0 end), 0)
                                                                  as encours_total,
    count(distinct case when f.statut = 'en_retard' then f.id end)
                                                                  as nb_factures_retard
  from public.clients c
  left join public.factures f
    on f.client_id = c.id and f.statut != 'annulee'
  group by c.id, c.nom
),
scored as (
  select *,
    greatest(0, least(100,
      100::numeric
      - (retard_moyen_jours * 2)
      - (nb_factures_retard * 5)
    )) as score_paiement
  from base
)
select
  *,
  case
    when score_paiement >= 80 then 'vert'
    when score_paiement >= 50 then 'orange'
    else 'rouge'
  end as categorie_risque
from scored;

-- 12. RLS policies
alter table public.transport_tarifs_clients enable row level security;
drop policy if exists "transport_tarifs_clients_auth" on public.transport_tarifs_clients;
create policy "transport_tarifs_clients_auth" on public.transport_tarifs_clients
  for all to authenticated using (true) with check (true);

alter table public.transport_cnr_indices enable row level security;
drop policy if exists "transport_cnr_indices_auth" on public.transport_cnr_indices;
create policy "transport_cnr_indices_auth" on public.transport_cnr_indices
  for all to authenticated using (true) with check (true);

alter table public.transport_missions_couts enable row level security;
drop policy if exists "transport_missions_couts_auth" on public.transport_missions_couts;
create policy "transport_missions_couts_auth" on public.transport_missions_couts
  for all to authenticated using (true) with check (true);

alter table public.mouvements_bancaires enable row level security;
drop policy if exists "mouvements_bancaires_auth" on public.mouvements_bancaires;
create policy "mouvements_bancaires_auth" on public.mouvements_bancaires
  for all to authenticated using (true) with check (true);

alter table public.rapprochements_bancaires enable row level security;
drop policy if exists "rapprochements_bancaires_auth" on public.rapprochements_bancaires;
create policy "rapprochements_bancaires_auth" on public.rapprochements_bancaires
  for all to authenticated using (true) with check (true);

alter table public.relances_scenarios enable row level security;
drop policy if exists "relances_scenarios_auth" on public.relances_scenarios;
create policy "relances_scenarios_auth" on public.relances_scenarios
  for all to authenticated using (true) with check (true);

alter table public.relances_historique enable row level security;
drop policy if exists "relances_historique_auth" on public.relances_historique;
create policy "relances_historique_auth" on public.relances_historique
  for all to authenticated using (true) with check (true);

alter table public.treso_flux_previsionnels enable row level security;
drop policy if exists "treso_flux_previsionnels_auth" on public.treso_flux_previsionnels;
create policy "treso_flux_previsionnels_auth" on public.treso_flux_previsionnels
  for all to authenticated using (true) with check (true);
