-- =============================================================================
-- Migration : Extension capacité et convoi exceptionnel sur la table remorques
-- Date      : 2026-04-16
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. Champs capacité standard
-- ─────────────────────────────────────────────
ALTER TABLE remorques
  ADD COLUMN IF NOT EXISTS volume_max_m3       NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS largeur_utile_m     NUMERIC(6,3)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hauteur_utile_m     NUMERIC(6,3)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nb_palettes_max     INTEGER       DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS charge_par_essieu_kg NUMERIC(10,0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS nb_essieux          SMALLINT      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ptac_kg             NUMERIC(10,0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ptra_kg             NUMERIC(10,0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS type_plancher       TEXT          DEFAULT NULL,
  -- Catégorie remorque pour filtrage rapide
  ADD COLUMN IF NOT EXISTS categorie_remorque  TEXT          DEFAULT 'standard'
    CHECK (categorie_remorque IN ('standard','specialise','convoi_exceptionnel')),
  -- Lien vers le catalogue normalisé
  ADD COLUMN IF NOT EXISTS trailer_type_code   TEXT          DEFAULT NULL
    REFERENCES trailer_types(code) ON DELETE SET NULL;

COMMENT ON COLUMN remorques.volume_max_m3       IS 'Volume utile maximum en m³';
COMMENT ON COLUMN remorques.largeur_utile_m     IS 'Largeur utile intérieure en mètres';
COMMENT ON COLUMN remorques.hauteur_utile_m     IS 'Hauteur utile intérieure en mètres';
COMMENT ON COLUMN remorques.nb_palettes_max     IS 'Nombre maximum de palettes Europe (80×120) chargeable';
COMMENT ON COLUMN remorques.charge_par_essieu_kg IS 'Charge admissible par essieu en kg';
COMMENT ON COLUMN remorques.nb_essieux          IS 'Nombre d essieux de la remorque';
COMMENT ON COLUMN remorques.ptac_kg             IS 'Poids total autorisé en charge (kg)';
COMMENT ON COLUMN remorques.ptra_kg             IS 'Poids total roulant autorisé (véhicule + remorque, kg)';
COMMENT ON COLUMN remorques.type_plancher       IS 'Matière du plancher : bois, acier, aluminium, inox…';
COMMENT ON COLUMN remorques.categorie_remorque  IS 'standard | specialise | convoi_exceptionnel';
COMMENT ON COLUMN remorques.trailer_type_code   IS 'FK vers trailer_types.code — type normalisé';

-- ─────────────────────────────────────────────
-- 2. Champs hors-gabarit / convoi exceptionnel
-- ─────────────────────────────────────────────
ALTER TABLE remorques
  ADD COLUMN IF NOT EXISTS largeur_hors_gabarit_m  NUMERIC(6,3)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hauteur_hors_gabarit_m  NUMERIC(6,3)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS longueur_hors_gabarit_m NUMERIC(8,3)  DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS masse_totale_kg         NUMERIC(12,0) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS categorie_convoi        TEXT          DEFAULT NULL
    CHECK (categorie_convoi IN ('CE1','CE2','CE3','CE4') OR categorie_convoi IS NULL),
  ADD COLUMN IF NOT EXISTS escorte_requise         BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS autorisation_requise    BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS itineraire_impose       BOOLEAN       DEFAULT FALSE;

COMMENT ON COLUMN remorques.largeur_hors_gabarit_m  IS 'Largeur hors-tout pour convoi exceptionnel (m)';
COMMENT ON COLUMN remorques.hauteur_hors_gabarit_m  IS 'Hauteur hors-tout pour convoi exceptionnel (m)';
COMMENT ON COLUMN remorques.longueur_hors_gabarit_m IS 'Longueur hors-tout pour convoi exceptionnel (m)';
COMMENT ON COLUMN remorques.masse_totale_kg         IS 'Masse totale du convoi en kg';
COMMENT ON COLUMN remorques.categorie_convoi        IS 'Catégorie CE1 à CE4 (réglementation française)';
COMMENT ON COLUMN remorques.escorte_requise         IS 'Nécessite voiture pilote / escorte police';
COMMENT ON COLUMN remorques.autorisation_requise    IS 'Autorisation préfectorale obligatoire';
COMMENT ON COLUMN remorques.itineraire_impose       IS 'Itinéraire défini par les autorités';

-- ─────────────────────────────────────────────
-- 3. Backfill categorie_remorque depuis type_remorque existant
-- ─────────────────────────────────────────────
UPDATE remorques
SET categorie_remorque = 'specialise'
WHERE type_remorque IN ('citerne_alimentaire','mega','hayon','dechetterie')
  AND categorie_remorque = 'standard';

UPDATE remorques
SET trailer_type_code = type_remorque
WHERE type_remorque IN (
  SELECT code FROM trailer_types
)
AND trailer_type_code IS NULL;
