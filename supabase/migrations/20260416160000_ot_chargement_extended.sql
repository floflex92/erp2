-- =============================================================================
-- Migration : Extension des données de chargement sur ordres_transport
-- Date      : 2026-04-16
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. Dimensions marchandise
-- ─────────────────────────────────────────────
ALTER TABLE ordres_transport
  ADD COLUMN IF NOT EXISTS largeur_m           NUMERIC(6,3)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hauteur_m           NUMERIC(6,3)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nb_palettes         INTEGER       DEFAULT NULL;

COMMENT ON COLUMN ordres_transport.largeur_m   IS 'Largeur des marchandises en mètres';
COMMENT ON COLUMN ordres_transport.hauteur_m   IS 'Hauteur des marchandises en mètres';
COMMENT ON COLUMN ordres_transport.nb_palettes IS 'Nombre de palettes (tous types confondus)';

-- ─────────────────────────────────────────────
-- 2. Contraintes spécifiques
-- ─────────────────────────────────────────────
ALTER TABLE ordres_transport
  ADD COLUMN IF NOT EXISTS adr               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS temperature_dirigee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hors_gabarit      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS charge_indivisible BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN ordres_transport.adr               IS 'Marchandises dangereuses (réglementation ADR)';
COMMENT ON COLUMN ordres_transport.temperature_dirigee IS 'Transport sous température dirigée (frigo/congelé)';
COMMENT ON COLUMN ordres_transport.hors_gabarit       IS 'Charge dont au moins une dimension dépasse le gabarit normal';
COMMENT ON COLUMN ordres_transport.charge_indivisible IS 'Charge ne pouvant être fractionnée (convoi exceptionnel possible)';

-- ─────────────────────────────────────────────
-- 3. Conditionnement (ajout de charge_indivisible dans le check existant)
--    NB: type_chargement déjà ajouté dans migration 20260416120000
--    On exclut la contrainte en la recréant pour inclure la nouvelle valeur
-- ─────────────────────────────────────────────
-- Suppression de la contrainte existante pour l'élargir
ALTER TABLE ordres_transport
  DROP CONSTRAINT IF EXISTS ordres_transport_type_chargement_check;

ALTER TABLE ordres_transport
  ADD CONSTRAINT ordres_transport_type_chargement_check
  CHECK (type_chargement IS NULL OR type_chargement IN (
    'palette_europe','palette_120','palette_us','palette_demi',
    'vrac','vrac_alimentaire','vrac_chimique',
    'liquide','liquide_alimentaire','liquide_chimique',
    'colis','frigo','engin','conteneur','charge_indivisible'
  ));

-- ─────────────────────────────────────────────
-- 4. Même chose sur ot_lignes
-- ─────────────────────────────────────────────
ALTER TABLE ot_lignes
  DROP CONSTRAINT IF EXISTS ot_lignes_type_chargement_check;

ALTER TABLE ot_lignes
  ADD CONSTRAINT ot_lignes_type_chargement_check
  CHECK (type_chargement IS NULL OR type_chargement IN (
    'palette_europe','palette_120','palette_us','palette_demi',
    'vrac','vrac_alimentaire','vrac_chimique',
    'liquide','liquide_alimentaire','liquide_chimique',
    'colis','frigo','engin','conteneur','charge_indivisible'
  ));
