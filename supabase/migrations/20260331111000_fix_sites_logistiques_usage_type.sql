-- Correction des sites_logistiques auto-importés depuis adresses avec un mauvais usage_type.
-- Toutes les adresses importées doivent être compatibles chargement ET livraison (usage_type = 'mixte').
UPDATE public.sites_logistiques
SET usage_type = 'mixte'
WHERE usage_type IN ('chargement', 'livraison');
