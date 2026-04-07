-- Seed : 2 dépôts de types différents pour le tenant test
-- Entrepôt frigorifique (type: entrepot) lié à Transfrais Nord (client 001)
-- Dépôt palettes/lourds  (type: depot)   lié à Batilog Est      (client 002)

INSERT INTO public.sites_logistiques (
  id,
  nom,
  adresse,
  code_postal,
  ville,
  pays,
  entreprise_id,
  type_site,
  est_depot_relais,
  contact_nom,
  contact_tel,
  capacite_m3,
  horaires_ouverture,
  notes,
  latitude,
  longitude,
  usage_type
) VALUES
(
  '99000000-0001-0000-0000-000000000001',
  'Entrepôt Transfrais Lille-Nord',
  '45 rue du Grand Carrefour',
  '59650',
  'Villeneuve-d''Ascq',
  'France',
  '11111111-4444-1111-4444-111111111111',  -- Agro Distribution Nord
  'entrepot',
  true,
  'Pierre Dumoulin',
  '03 20 10 10 11',
  1200,
  'Lu-Ve 6h-22h / Sa 7h-14h',
  'Entrepôt frigorifique multi-températures. Quai 12 portes. Zone ADR séparée. Dépôt relais autorisé.',
  50.6456,
  3.1409,
  'mixte'
),
(
  '99000000-0002-0000-0000-000000000002',
  'Dépôt Batilog Nancy-Est',
  '12 avenue de la Sidérurgie',
  '54230',
  'Neuves-Maisons',
  'France',
  '11111111-4444-1111-4444-111111111111',  -- Agro Distribution Nord (tenant)
  'depot',
  true,
  'Sophie Marchal',
  '03 83 40 20 21',
  580,
  'Lu-Ve 7h-19h',
  'Dépôt palettes et colis lourds. Pont roulant disponible. Accès camion 25t maxi. Dépôt relais autorisé.',
  48.5908,
  6.1282,
  'livraison'
)
ON CONFLICT (id) DO UPDATE SET
  nom               = EXCLUDED.nom,
  adresse           = EXCLUDED.adresse,
  code_postal       = EXCLUDED.code_postal,
  ville             = EXCLUDED.ville,
  pays              = EXCLUDED.pays,
  entreprise_id     = EXCLUDED.entreprise_id,
  type_site         = EXCLUDED.type_site,
  est_depot_relais  = EXCLUDED.est_depot_relais,
  contact_nom       = EXCLUDED.contact_nom,
  contact_tel       = EXCLUDED.contact_tel,
  capacite_m3       = EXCLUDED.capacite_m3,
  horaires_ouverture = EXCLUDED.horaires_ouverture,
  notes             = EXCLUDED.notes,
  latitude          = EXCLUDED.latitude,
  longitude         = EXCLUDED.longitude,
  usage_type        = EXCLUDED.usage_type;
