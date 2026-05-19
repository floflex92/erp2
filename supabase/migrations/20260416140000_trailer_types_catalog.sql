-- =============================================================================
-- Migration : Catalogue normalisé des types de remorques
-- Date      : 2026-04-16
-- =============================================================================

-- Table de référence des types de remorques
CREATE TABLE IF NOT EXISTS trailer_types (
  code         TEXT PRIMARY KEY,
  label        TEXT NOT NULL,
  categorie    TEXT NOT NULL CHECK (categorie IN ('standard','specialise','convoi_exceptionnel')),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  trailer_types IS 'Catalogue normalisé des types de remorques — source unique de vérité';
COMMENT ON COLUMN trailer_types.code      IS 'Code métier unique (snake_case)';
COMMENT ON COLUMN trailer_types.categorie IS 'standard | specialise | convoi_exceptionnel';

-- RLS
ALTER TABLE trailer_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trailer_types_read_all" ON trailer_types FOR SELECT USING (TRUE);
CREATE POLICY "trailer_types_write_admin" ON trailer_types FOR ALL
  USING (auth.jwt() ->> 'role' IN ('service_role','admin','super_admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('service_role','admin','super_admin'));

-- ─────────────────────────────────────────────
-- SEED — types standard
-- ─────────────────────────────────────────────
INSERT INTO trailer_types (code, label, categorie, description) VALUES
  ('tautliner',         'Tautliner / Rideaux coulissants', 'standard',
   'Remorque à bâche coulissante latérale. Chargement palette, colis, caillebotis.'),
  ('fourgon',           'Fourgon / Caisse fermée',         'standard',
   'Remorque fermée type caisse. Idéale pour colis standards et marchandises générales.'),
  ('frigo',             'Frigorifique / Thermique',        'standard',
   'Remorque avec groupe froid intégré. Obligatoire pour les denrées périssables.'),
  ('benne',             'Benne basculante',                'standard',
   'Benne articulée. Vrac non alimentaire, déchets, granulats, terres.'),
  ('citerne',           'Citerne standard',                'standard',
   'Transport de liquides industriels, chimiques. Étanche et pressurisée.'),
  ('citerne_alimentaire','Citerne alimentaire',            'specialise',
   'Citerne homologuée pour liquides alimentaires, lait, huiles, vins.'),
  ('plateau',           'Plateau standard',                'standard',
   'Plancher plat ohne ridelles. Engins, colis volumineux, conteneurs.'),
  ('plateau_ridelles',  'Plateau avec ridelles',           'standard',
   'Plateau avec ridelles métalliques. Palettes, engins, matériaux.'),
  ('plateau_nu',        'Plateau nu (sans ridelles)',      'standard',
   'Plancher ras sans équipement. Flexibilité maximale pour charges larges.'),
  ('porte_conteneur',   'Porte-conteneur',                 'standard',
   'Porte-conteneur ISO 20/40 pieds. Uniquement fret conteneurisé.'),
  ('fond_mouvant',      'Fond mouvant (walking floor)',    'standard',
   'Déchargement arrière par tapis. Vrac, bois, palettes difficiles à gerber.'),
  ('porte_engin',       'Porte-engin standard',            'standard',
   'Transport d engins de chantier standard. Rampes intégrées.'),
  ('remorque_bachee',   'Remorque bâchée',                 'standard',
   'Bâche tendue sur armature. Palettes, colis, matériaux légers.'),
  ('semi_standard',     'Semi standard (38t)',             'standard',
   'Semi-remorque polyvalente. Toutes marchandises générales conformes.'),
  ('mega',              'Méga (double plancher)',          'specialise',
   'Remorque bi-niveau. Volume accru pour colis légers peu denses.'),
  ('hayon',             'Hayon élévateur',                 'specialise',
   'Équipée d un hayon. Idéale pour charges sans quai de chargement.'),
  ('savoyarde',         'Savoyarde (ridelles bois)',       'standard',
   'Plateau ridelles bois. Tradition régionale, charge bois, palettes lourdes.'),
  ('dechetterie',       'Benne déchets / décheterie',     'specialise',
   'Benne adaptée collecte déchets, gravats, matériaux de démolition.'),
  ('caisse',            'Caisse / Fourgon fermé',          'standard',
   'Caisse isotherme ou standard. Marchandises générales à l abri.'),
-- ─────────────────────────────────────────────
-- SEED — types convoi exceptionnel
-- ─────────────────────────────────────────────
  ('plateau_surbaisse',         'Plateau surbaissé',              'convoi_exceptionnel',
   'Plancher très bas pour engins haute taille. Hauteur libre augmentée.'),
  ('semi_surbaissee',           'Semi surbaissée',                'convoi_exceptionnel',
   'Semi avec plateau abaissé. Charges hautes et lourdes.'),
  ('porte_char',                'Porte-char',                     'convoi_exceptionnel',
   'Transport de chars, blindés, véhicules militaires ou industriels lourds.'),
  ('porte_engin_renforce',      'Porte-engin renforcé',           'convoi_exceptionnel',
   'Structure renforcée pour engins > 40 t. Rampes hydrauliques.'),
  ('remorque_extra_surbaissee', 'Remorque extra-surbaissée',      'convoi_exceptionnel',
   'Plancher au ras du sol. Chargements de très grande hauteur.'),
  ('remorque_extensible',       'Remorque extensible (longueur)', 'convoi_exceptionnel',
   'Châssis télescopique. Longueur variable jusqu à 28 m. Charges longues.'),
  ('plateau_extensible',        'Plateau extensible',             'convoi_exceptionnel',
   'Plateau allongeable hydrauliquement. Flexibilité pour charges indivisibles.'),
  ('porte_engin_extensible',    'Porte-engin extensible',         'convoi_exceptionnel',
   'Porte-engin à longueur variable. Configurations multiples.'),
  ('remorque_modulaire',        'Remorque modulaire SPMT',        'convoi_exceptionnel',
   'Module SPMT automoteur. Industrie lourde, réacteurs, transformateurs.'),
  ('ligne_essieux',             'Ligne d essieux / Module hydraulique', 'convoi_exceptionnel',
   'Train d essieux indépendants. Transport industriel hors-norme.'),
  ('col_de_cygne',              'Remorque col de cygne',          'convoi_exceptionnel',
   'Avant abaissé en col de cygne. Accès facile pour chargements hauts.'),
  ('col_de_cygne_demontable',   'Col de cygne démontable',        'convoi_exceptionnel',
   'Col de cygne amovible. Chargement frontal ou roulant facilité.'),
  ('remorque_charge_indivisible','Remorque charge indivisible',   'convoi_exceptionnel',
   'Spécialement conçue pour charges ne pouvant être divisées.'),
  ('remorque_grande_longueur',  'Remorque grande longueur',       'convoi_exceptionnel',
   'Longueur > 20 m. Nécessite autorisation préfectorale.'),
  ('remorque_grande_largeur',   'Remorque grande largeur',        'convoi_exceptionnel',
   'Largeur > 3 m. Convoi exceptionnel catégorie 1 à 3.'),
  ('remorque_grande_hauteur',   'Remorque grande hauteur',        'convoi_exceptionnel',
   'Hauteur > 4 m. Nécessite balisage et itinéraire étudié.')
ON CONFLICT (code) DO UPDATE
  SET label       = EXCLUDED.label,
      categorie   = EXCLUDED.categorie,
      description = EXCLUDED.description;
