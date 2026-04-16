-- Migration: ajout longueur_m et tonnage sur ordres_transport
-- Date: 2026-04-16

ALTER TABLE ordres_transport
  ADD COLUMN IF NOT EXISTS longueur_m NUMERIC(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tonnage     NUMERIC(10,3) DEFAULT NULL;

COMMENT ON COLUMN ordres_transport.longueur_m IS 'Longueur des marchandises en mètres';
COMMENT ON COLUMN ordres_transport.tonnage     IS 'Tonnage des marchandises en tonnes';
