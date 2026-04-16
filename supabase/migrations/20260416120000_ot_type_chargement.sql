-- Migration: type de chargement, type de palette sur ordres_transport et ot_lignes
-- Date: 2026-04-16

-- Types de chargement sur l'OT principal
ALTER TABLE ordres_transport
  ADD COLUMN IF NOT EXISTS type_chargement TEXT DEFAULT NULL
    CHECK (type_chargement IN (
      'palette_europe','palette_120','palette_us','palette_demi',
      'vrac','vrac_alimentaire','vrac_chimique',
      'liquide','liquide_alimentaire','liquide_chimique',
      'colis','frigo','engin','conteneur'
    )),
  ADD COLUMN IF NOT EXISTS type_palette TEXT DEFAULT NULL
    CHECK (type_palette IN ('europe','120x100','us','demi','quart'));

COMMENT ON COLUMN ordres_transport.type_chargement IS 'Nature du conditionnement (palette, vrac, liquide, colis …)';
COMMENT ON COLUMN ordres_transport.type_palette    IS 'Format de palette si type_chargement = palette_*';

-- Type de chargement sur les lignes de lot (groupage / partiel)
ALTER TABLE ot_lignes
  ADD COLUMN IF NOT EXISTS type_chargement TEXT DEFAULT NULL
    CHECK (type_chargement IN (
      'palette_europe','palette_120','palette_us','palette_demi',
      'vrac','vrac_alimentaire','vrac_chimique',
      'liquide','liquide_alimentaire','liquide_chimique',
      'colis','frigo','engin','conteneur'
    ));

COMMENT ON COLUMN ot_lignes.type_chargement IS 'Nature du conditionnement pour cette ligne de lot';
