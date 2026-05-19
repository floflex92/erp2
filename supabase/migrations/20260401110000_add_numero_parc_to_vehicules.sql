-- Ajout colonne numero_parc sur la table vehicules
-- Correction bug : la colonne était utilisée dans le frontend mais absente de la DB
-- causant "Enregistrement impossible" à chaque save

ALTER TABLE vehicules
  ADD COLUMN IF NOT EXISTS numero_parc text;

-- Commentaire métier
COMMENT ON COLUMN vehicules.numero_parc IS 'Numéro de parc interne du véhicule';
