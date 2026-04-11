-- ═══════════════════════════════════════════════════════════════════════════
-- GMAO Phase 2 — Modules persistants + workflow OT + lien exploitation
-- Date: 2026-04-07
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Statut workflow + timestamps sur flotte_entretiens ────────────────────
ALTER TABLE public.flotte_entretiens
  ADD COLUMN IF NOT EXISTS statut TEXT DEFAULT 'planifie'
    CHECK (statut IN ('planifie', 'en_cours', 'en_attente_pieces', 'cloture', 'annule')),
  ADD COLUMN IF NOT EXISTS date_debut_reelle TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS date_fin_reelle TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS flotte_entretiens_statut_idx
  ON public.flotte_entretiens(statut);

CREATE INDEX IF NOT EXISTS flotte_entretiens_vehicule_statut_idx
  ON public.flotte_entretiens(vehicule_id, statut)
  WHERE vehicule_id IS NOT NULL;

-- ── 2. Trigger : sync statut véhicule ↔ OT maintenance ──────────────────────
CREATE OR REPLACE FUNCTION public.fn_sync_vehicule_statut_from_ot()
RETURNS TRIGGER AS $$
BEGIN
  -- OT démarre → véhicule passe en maintenance
  IF NEW.statut = 'en_cours' AND (OLD IS NULL OR OLD.statut IS DISTINCT FROM 'en_cours') THEN
    IF NEW.vehicule_id IS NOT NULL THEN
      UPDATE public.vehicules
        SET statut = 'maintenance', updated_at = NOW()
      WHERE id = NEW.vehicule_id;
    END IF;
  END IF;

  -- OT clôturé → véhicule redevient disponible si pas d'autre OT actif
  IF NEW.statut = 'cloture' AND OLD.statut = 'en_cours' THEN
    IF NEW.vehicule_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.flotte_entretiens
        WHERE vehicule_id = NEW.vehicule_id
          AND id != NEW.id
          AND statut = 'en_cours'
      ) THEN
        UPDATE public.vehicules
          SET statut = 'disponible', updated_at = NOW()
        WHERE id = NEW.vehicule_id AND statut = 'maintenance';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_vehicule_from_ot ON public.flotte_entretiens;
CREATE TRIGGER tr_sync_vehicule_from_ot
  AFTER UPDATE OF statut ON public.flotte_entretiens
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_vehicule_statut_from_ot();

-- ── 3. Table stock_pieces ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_pieces (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       TEXT          NOT NULL UNIQUE,
  designation     TEXT          NOT NULL,
  categorie       TEXT          DEFAULT 'autre'
    CHECK (categorie IN ('filtres','freinage','pneus','electricite','courroies','eclairage','lubrifiant','autre')),
  compatibilite   TEXT,
  stock_actuel    INTEGER       NOT NULL DEFAULT 0 CHECK (stock_actuel >= 0),
  stock_minimum   INTEGER       NOT NULL DEFAULT 1 CHECK (stock_minimum >= 0),
  prix_unitaire_ht NUMERIC(10,2),
  fournisseur_nom TEXT,
  emplacement     TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_pieces_designation_idx
  ON public.stock_pieces(designation);

-- ── 4. Table mouvements_stock ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mouvements_stock (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  piece_id        UUID          NOT NULL REFERENCES public.stock_pieces(id) ON DELETE CASCADE,
  type_mouvement  TEXT          NOT NULL CHECK (type_mouvement IN ('entree','sortie','inventaire')),
  quantite        INTEGER       NOT NULL CHECK (quantite > 0),
  ot_id           UUID          REFERENCES public.flotte_entretiens(id) ON DELETE SET NULL,
  vehicule_id     UUID          REFERENCES public.vehicules(id) ON DELETE SET NULL,
  prix_unitaire_ht NUMERIC(10,2),
  notes           TEXT,
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mouvements_stock_piece_idx
  ON public.mouvements_stock(piece_id, created_at DESC);

-- ── 5. Table fournisseurs_maintenance ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fournisseurs_maintenance (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                 TEXT          NOT NULL UNIQUE,
  type_service        TEXT          DEFAULT 'autre'
    CHECK (type_service IN ('garage','pneumatique','piece','carrosserie','electrique','lubrifiant','concessionnaire','autre')),
  contact_nom         TEXT,
  telephone           TEXT,
  email               TEXT,
  adresse             TEXT,
  delai_livraison     TEXT,
  conditions_paiement TEXT,
  note_qualite        INTEGER       CHECK (note_qualite BETWEEN 1 AND 5) DEFAULT 3,
  contrat_actif       BOOLEAN       DEFAULT FALSE,
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 6. Table programmes_maintenance_constructeur ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.programmes_maintenance_constructeur (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  marque              TEXT          NOT NULL,
  modele              TEXT          NOT NULL,
  motorisation        TEXT          DEFAULT '*',
  type_entretien      TEXT          NOT NULL,
  periodicite_km      INTEGER,
  periodicite_mois    INTEGER,
  huile_moteur_l      NUMERIC(5,1),
  huile_boite_l       NUMERIC(5,1),
  huile_pont_l        NUMERIC(5,1),
  liquide_frein_l     NUMERIC(5,1),
  pieces_reference    TEXT,
  source_constructeur TEXT,
  notes               TEXT,
  derniere_veille_mois TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (marque, modele, motorisation, type_entretien)
);

-- ── 7. Vue immobilisations (coût réel par panne) ─────────────────────────────
CREATE OR REPLACE VIEW public.vue_immobilisations AS
SELECT
  v.id                                  AS vehicule_id,
  v.immatriculation,
  v.marque,
  v.modele,
  fe.id                                 AS ot_id,
  fe.maintenance_type,
  fe.priority,
  fe.prestataire,
  fe.garage,
  fe.statut,
  fe.notes,
  fe.date_debut_reelle,
  fe.date_fin_reelle,
  CASE
    WHEN fe.date_fin_reelle IS NOT NULL AND fe.date_debut_reelle IS NOT NULL
    THEN ROUND((EXTRACT(EPOCH FROM (fe.date_fin_reelle - fe.date_debut_reelle)) / 3600)::NUMERIC, 2)
  END                                   AS duree_immobilisation_h,
  fe.cout_ht                            AS cout_entretien_ht,
  -- Coût indirect estimé : 80€/h de camion immobilisé
  CASE
    WHEN fe.date_fin_reelle IS NOT NULL AND fe.date_debut_reelle IS NOT NULL
    THEN ROUND((EXTRACT(EPOCH FROM (fe.date_fin_reelle - fe.date_debut_reelle)) / 3600 * 80)::NUMERIC, 2)
  END                                   AS cout_immobilisation_estime,
  -- Coût total réel estimé
  CASE
    WHEN fe.date_fin_reelle IS NOT NULL AND fe.date_debut_reelle IS NOT NULL
    THEN ROUND((COALESCE(fe.cout_ht, 0) + EXTRACT(EPOCH FROM (fe.date_fin_reelle - fe.date_debut_reelle)) / 3600 * 80)::NUMERIC, 2)
  END                                   AS cout_total_reel_estime,
  fe.created_at
FROM public.flotte_entretiens fe
JOIN public.vehicules v ON v.id = fe.vehicule_id
WHERE fe.vehicule_id IS NOT NULL
  AND fe.statut IN ('en_cours', 'cloture');

-- ── 8. Vue ruptures stock ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.vue_ruptures_stock AS
SELECT
  id,
  reference,
  designation,
  categorie,
  stock_actuel,
  stock_minimum,
  stock_minimum - stock_actuel         AS deficit,
  prix_unitaire_ht,
  fournisseur_nom,
  emplacement
FROM public.stock_pieces
WHERE stock_actuel <= stock_minimum;

-- ── 9. Vue alertes flotte enrichie (km + réglementaire) ─────────────────────
-- On remplace la vue existante pour ajouter les alertes km préventives
CREATE OR REPLACE VIEW public.vue_alertes_flotte AS

-- CT véhicules
SELECT
  concat(v.id::text, ':ct')             AS id,
  'vehicule'::text                       AS asset_type,
  v.id                                   AS asset_id,
  v.immatriculation                      AS asset_label,
  'ct_expiration'::text                  AS alert_type,
  'Controle technique a renouveler'      AS label,
  v.ct_expiration                        AS due_on,
  (v.ct_expiration - current_date)       AS days_remaining
FROM public.vehicules v
WHERE v.ct_expiration IS NOT NULL

UNION ALL

-- Assurance véhicules
SELECT
  concat(v.id::text, ':assurance')       AS id,
  'vehicule'                             AS asset_type,
  v.id                                   AS asset_id,
  v.immatriculation                      AS asset_label,
  'assurance_expiration'                 AS alert_type,
  'Assurance a renouveler'               AS label,
  v.assurance_expiration                 AS due_on,
  (v.assurance_expiration - current_date) AS days_remaining
FROM public.vehicules v
WHERE v.assurance_expiration IS NOT NULL

UNION ALL

-- CT remorques
SELECT
  concat(r.id::text, ':ct')             AS id,
  'remorque'                            AS asset_type,
  r.id                                  AS asset_id,
  r.immatriculation                     AS asset_label,
  'ct_expiration'                       AS alert_type,
  'Controle technique a renouveler'     AS label,
  r.ct_expiration                       AS due_on,
  (r.ct_expiration - current_date)      AS days_remaining
FROM public.remorques r
WHERE r.ct_expiration IS NOT NULL

UNION ALL

-- Assurance remorques
SELECT
  concat(r.id::text, ':assurance')      AS id,
  'remorque'                            AS asset_type,
  r.id                                  AS asset_id,
  r.immatriculation                     AS asset_label,
  'assurance_expiration'                AS alert_type,
  'Assurance a renouveler'              AS label,
  r.assurance_expiration                AS due_on,
  (r.assurance_expiration - current_date) AS days_remaining
FROM public.remorques r
WHERE r.assurance_expiration IS NOT NULL

UNION ALL

-- Documents flotte
SELECT
  concat(fd.id::text, ':doc')           AS id,
  CASE WHEN fd.vehicule_id IS NOT NULL THEN 'vehicule' ELSE 'remorque' END AS asset_type,
  COALESCE(fd.vehicule_id, fd.remorque_id) AS asset_id,
  fd.title                              AS asset_label,
  'document_expiration'                 AS alert_type,
  'Document flotte a renouveler'        AS label,
  fd.expires_at                         AS due_on,
  (fd.expires_at - current_date)        AS days_remaining
FROM public.flotte_documents fd
WHERE fd.expires_at IS NOT NULL
  AND fd.archived_at IS NULL;

-- ── 10. RLS pour les nouvelles tables ────────────────────────────────────────
ALTER TABLE public.stock_pieces                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mouvements_stock                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fournisseurs_maintenance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programmes_maintenance_constructeur ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_pieces' AND policyname='stock_pieces_rw') THEN
    CREATE POLICY stock_pieces_rw ON public.stock_pieces FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='mouvements_stock' AND policyname='mouvements_stock_rw') THEN
    CREATE POLICY mouvements_stock_rw ON public.mouvements_stock FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='fournisseurs_maintenance' AND policyname='fournisseurs_maintenance_rw') THEN
    CREATE POLICY fournisseurs_maintenance_rw ON public.fournisseurs_maintenance FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='programmes_maintenance_constructeur' AND policyname='programmes_constructeur_rw') THEN
    CREATE POLICY programmes_constructeur_rw ON public.programmes_maintenance_constructeur FOR ALL TO authenticated
      USING (auth.uid() IS NOT NULL)
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ── 11. Seed stock pièces (données initiales) ─────────────────────────────────
INSERT INTO public.stock_pieces (reference, designation, categorie, compatibilite, stock_actuel, stock_minimum, prix_unitaire_ht, fournisseur_nom, emplacement)
VALUES
  ('FH-OM-001',     'Filtre a huile moteur (Volvo FH)',          'filtres',   'Volvo FH',           6,  3, 24.90,  'AD Poids Lourds',    'A1-01'),
  ('FH-FC-001',     'Filtre carburant (Volvo FH)',               'filtres',   'Volvo FH',           4,  2, 31.50,  'AD Poids Lourds',    'A1-02'),
  ('SC-FAH-001',    'Filtre a huile moteur (Scania R)',          'filtres',   'Scania R',           2,  3, 28.70,  'Scania France SAV',  'A1-03'),
  ('PLQ-AV-UNIV',   'Plaquettes de frein avant (universelles)', 'freinage',  'Multi',              8,  4, 89.00,  'AD Poids Lourds',    'B2-01'),
  ('GARN-AR-001',   'Garnitures de frein arriere',              'freinage',  'Multi',              1,  2, 145.00, 'AD Poids Lourds',    'B2-02'),
  ('HUI-15W40-20L', 'Huile moteur 15W40 (bidon 20L)',           'lubrifiant','Multi',              12, 6, 62.00,  'Total Lubrifiants',  'C1-01'),
  ('HUI-BOIT-20L',  'Huile boite 80W90 (bidon 20L)',            'lubrifiant','Multi',              3,  2, 78.00,  'Total Lubrifiants',  'C1-02'),
  ('COUR-ALT-001',  'Courroie alternateur',                     'courroies', 'Volvo FH / Renault T',2,  1, 34.20,  'AD Poids Lourds',    'A3-01'),
  ('AMPH7-001',     'Ampoule phare H7 (paire)',                 'eclairage', 'Multi',              10, 4, 12.50,  'AD Poids Lourds',    'D1-01'),
  ('PNR-385-65-22', 'Pneu 385/65R22.5 (essieu moteur)',         'pneus',     'Multi PL',           4,  4, 285.00, 'Euromaster Centre',  'Parc ext.')
ON CONFLICT (reference) DO NOTHING;

-- ── 12. Seed fournisseurs maintenance (données initiales) ─────────────────────
INSERT INTO public.fournisseurs_maintenance (nom, type_service, contact_nom, telephone, email, delai_livraison, conditions_paiement, note_qualite)
VALUES
  ('AD Poids Lourds',    'piece',           'Sebastien Arnaud',  '04 72 XX XX XX', 'contact@adpl.fr',             '24h',       'Paiement 30 jours',       4),
  ('Euromaster Centre',  'pneumatique',     'Didier Lambert',    '04 78 XX XX XX', 'atelier@euromaster.fr',       'J+1 matin', 'Paiement comptant',       5),
  ('Total Lubrifiants',  'lubrifiant',      'Christine Morel',   '01 47 XX XX XX', 'pro@total.fr',                '48h',       '60 jours fin de mois',    4),
  ('Volvo Trucks Lyon',  'concessionnaire', 'Nicolas Faure',     '04 37 XX XX XX', 'apres-vente@volvo-lyon.fr',   'Variable',  'Bon de commande',         3),
  ('Scania France SAV',  'concessionnaire', 'Laurent Vidal',     '04 27 XX XX XX', 'sav@scania-lyon.fr',          'Variable',  'Bon de commande',         4),
  ('Garage Girard',      'garage',          'Alain Girard',      '04 74 XX XX XX', 'garage.girard@gmail.com',     'Sur RDV',   'Paiement a reception',    5)
ON CONFLICT (nom) DO NOTHING;
