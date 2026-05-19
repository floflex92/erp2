-- =============================================================================
-- Migration : Matrice de compatibilité remorque ↔ marchandise
-- Date      : 2026-04-16
-- =============================================================================
-- Cette table est la SOURCE UNIQUE DE VÉRITÉ pour la logique de compatibilité.
-- Elle est reflétée en front dans trailerValidation.ts pour les vérifications
-- temps-réel sans appel réseau.
-- =============================================================================

CREATE TABLE IF NOT EXISTS trailer_cargo_compatibility (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_type_code TEXT NOT NULL REFERENCES trailer_types(code) ON DELETE CASCADE,
  cargo_type_code   TEXT NOT NULL,
  niveau           TEXT NOT NULL DEFAULT 'compatible'
    CHECK (niveau IN ('compatible','compatible_sous_conditions','incompatible')),
  condition_note    TEXT,         -- ex: "ADR obligatoire", "Agrément sanitaire requis"
  company_id        INTEGER DEFAULT NULL,   -- NULL = règle globale, sinon surcharge tenant
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Contrainte d'unicité avec expression fonctionnelle (nécessite un index, pas une clause UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS trailer_cargo_compat_unique_idx
  ON trailer_cargo_compatibility (trailer_type_code, cargo_type_code, COALESCE(company_id, -1));

COMMENT ON TABLE  trailer_cargo_compatibility IS 'Matrice compatibilité remorque ↔ type de chargement';
COMMENT ON COLUMN trailer_cargo_compatibility.niveau         IS 'compatible | compatible_sous_conditions | incompatible';
COMMENT ON COLUMN trailer_cargo_compatibility.condition_note IS 'Condition ou restriction métier à afficher à l opérateur';
COMMENT ON COLUMN trailer_cargo_compatibility.company_id     IS 'NULL = règle partagée ; id = surcharge tenant spécifique';

-- RLS
ALTER TABLE trailer_cargo_compatibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tcc_read_all"    ON trailer_cargo_compatibility FOR SELECT USING (TRUE);
CREATE POLICY "tcc_write_admin" ON trailer_cargo_compatibility FOR ALL
  USING (auth.jwt() ->> 'role' IN ('service_role','admin','super_admin'))
  WITH CHECK (auth.jwt() ->> 'role' IN ('service_role','admin','super_admin'));

-- =============================================================================
-- SEED — matrice complète (règles globales, company_id = NULL)
-- =============================================================================
INSERT INTO trailer_cargo_compatibility (trailer_type_code, cargo_type_code, niveau, condition_note) VALUES

-- ── tautliner ──────────────────────────────────────────────────────────────
('tautliner','palette_europe',      'compatible',                  NULL),
('tautliner','palette_120',         'compatible',                  NULL),
('tautliner','palette_us',          'compatible',                  NULL),
('tautliner','palette_demi',        'compatible',                  NULL),
('tautliner','colis',               'compatible',                  NULL),
('tautliner','frigo',               'compatible_sous_conditions',  'Température non contrôlée — vérifier délai de livraison'),
('tautliner','conteneur',           'compatible',                  NULL),
('tautliner','engin',               'compatible_sous_conditions',  'Poids et dimensions à valider selon le type d engin'),
('tautliner','vrac',                'incompatible',                'Bâche non étanche — risque de perte de marchandise'),
('tautliner','vrac_alimentaire',    'incompatible',                'Bâche non étanche — risque sanitaire'),
('tautliner','vrac_chimique',       'incompatible',                'Risque de dispersion de produits dangereux'),
('tautliner','liquide',             'incompatible',                'Remorque non étanche aux liquides'),
('tautliner','liquide_alimentaire', 'incompatible',                'Remorque non conçue pour liquides alimentaires'),
('tautliner','liquide_chimique',    'incompatible',                'Risque de fuite — interdit'),
('tautliner','charge_indivisible',  'compatible_sous_conditions',  'Vérifier dimensions et nécessité d un convoi exceptionnel'),

-- ── semi_standard ──────────────────────────────────────────────────────────
('semi_standard','palette_europe',      'compatible',                NULL),
('semi_standard','palette_120',         'compatible',                NULL),
('semi_standard','palette_us',          'compatible',                NULL),
('semi_standard','palette_demi',        'compatible',                NULL),
('semi_standard','colis',               'compatible',                NULL),
('semi_standard','frigo',               'compatible_sous_conditions','Température non contrôlée'),
('semi_standard','conteneur',           'compatible',                NULL),
('semi_standard','engin',               'compatible_sous_conditions','Rampes et arrimage à prévoir'),
('semi_standard','vrac',                'incompatible',              'Remorque non adaptée au vrac'),
('semi_standard','vrac_alimentaire',    'incompatible',              'Remorque non adaptée au vrac'),
('semi_standard','vrac_chimique',       'incompatible',              'Risque de dispersion'),
('semi_standard','liquide',             'incompatible',              'Remorque non étanche'),
('semi_standard','liquide_alimentaire', 'incompatible',              'Remorque non étanche'),
('semi_standard','liquide_chimique',    'incompatible',              'Risque de fuite — interdit'),
('semi_standard','charge_indivisible',  'compatible_sous_conditions','Vérifier si convoi exceptionnel requis'),

-- ── remorque_bachee ────────────────────────────────────────────────────────
('remorque_bachee','palette_europe',      'compatible',                NULL),
('remorque_bachee','palette_120',         'compatible',                NULL),
('remorque_bachee','palette_us',          'compatible',                NULL),
('remorque_bachee','palette_demi',        'compatible',                NULL),
('remorque_bachee','colis',               'compatible',                NULL),
('remorque_bachee','frigo',               'compatible_sous_conditions','Température non contrôlée'),
('remorque_bachee','vrac',                'incompatible',              'Bâche non étanche'),
('remorque_bachee','liquide',             'incompatible',              'Remorque non étanche'),
('remorque_bachee','liquide_alimentaire', 'incompatible',              'Remorque non étanche'),
('remorque_bachee','liquide_chimique',    'incompatible',              'Interdit'),
('remorque_bachee','vrac_chimique',       'incompatible',              'Interdit'),
('remorque_bachee','vrac_alimentaire',    'incompatible',              'Bâche non étanche — risque sanitaire'),
('remorque_bachee','conteneur',           'compatible',                NULL),
('remorque_bachee','engin',               'compatible_sous_conditions','Vérifier poids et hauteur'),
('remorque_bachee','charge_indivisible',  'compatible_sous_conditions','Vérifier dimensions'),

-- ── fourgon / caisse ───────────────────────────────────────────────────────
('fourgon','palette_europe',      'compatible',                NULL),
('fourgon','palette_120',         'compatible',                NULL),
('fourgon','palette_us',          'compatible',                NULL),
('fourgon','palette_demi',        'compatible',                NULL),
('fourgon','colis',               'compatible',                NULL),
('fourgon','frigo',               'compatible_sous_conditions','Température non maintenue — délai court exigé'),
('fourgon','vrac',                'incompatible',              'Fourgon non adapté au déchargement vrac'),
('fourgon','vrac_alimentaire',    'incompatible',              'Fourgon non adapté'),
('fourgon','vrac_chimique',       'incompatible',              'Interdit'),
('fourgon','liquide',             'incompatible',              'Fourgon non étanche'),
('fourgon','liquide_alimentaire', 'incompatible',              'Non homologué liquide alimentaire'),
('fourgon','liquide_chimique',    'incompatible',              'Interdit — risque de fuite'),
('fourgon','engin',               'incompatible',              'Porte fourgon trop petite pour engins'),
('fourgon','conteneur',           'incompatible',              'Fourgon trop court pour conteneur ISO'),
('fourgon','charge_indivisible',  'incompatible',              'Espace trop contraint'),
('caisse','palette_europe',      'compatible',                NULL),
('caisse','palette_120',         'compatible',                NULL),
('caisse','palette_us',          'compatible',                NULL),
('caisse','palette_demi',        'compatible',                NULL),
('caisse','colis',               'compatible',                NULL),
('caisse','frigo',               'compatible_sous_conditions','Température non maintenue'),
('caisse','vrac',                'incompatible',              'Caisse non adaptée vrac'),
('caisse','vrac_alimentaire',    'incompatible',              'Non adapté'),
('caisse','vrac_chimique',       'incompatible',              'Interdit'),
('caisse','liquide',             'incompatible',              'Caisse non étanche'),
('caisse','liquide_alimentaire', 'incompatible',              'Non homologué'),
('caisse','liquide_chimique',    'incompatible',              'Interdit'),
('caisse','engin',               'incompatible',              'Ouverture insuffisante'),
('caisse','conteneur',           'incompatible',              'Trop court pour conteneur ISO'),
('caisse','charge_indivisible',  'incompatible',              'Espace trop contraint'),

-- ── frigo ──────────────────────────────────────────────────────────────────
('frigo','palette_europe',      'compatible',                NULL),
('frigo','palette_120',         'compatible',                NULL),
('frigo','palette_us',          'compatible',                NULL),
('frigo','palette_demi',        'compatible',                NULL),
('frigo','colis',               'compatible',                NULL),
('frigo','frigo',               'compatible',                NULL),
('frigo','vrac_alimentaire',    'compatible_sous_conditions','Nettoyage interne obligatoire après vrac alimentaire'),
('frigo','vrac',                'incompatible',              'Groupe froid endommageable — interdit vrac non alimentaire'),
('frigo','vrac_chimique',       'incompatible',              'Contamination possible — interdit'),
('frigo','liquide',             'incompatible',              'Citerne uniquement'),
('frigo','liquide_alimentaire', 'incompatible',              'Citerne alimentaire uniquement'),
('frigo','liquide_chimique',    'incompatible',              'Interdit'),
('frigo','engin',               'incompatible',              'Espace inadapté à des engins'),
('frigo','conteneur',           'incompatible',              'Frigo non conçu pour ISO'),
('frigo','charge_indivisible',  'incompatible',              'Espace trop contraint'),

-- ── benne ──────────────────────────────────────────────────────────────────
('benne','vrac',                'compatible',                NULL),
('benne','vrac_alimentaire',    'compatible_sous_conditions','Nettoyage certifié obligatoire entre chargements'),
('benne','vrac_chimique',       'compatible_sous_conditions','ADR obligatoire — agrément benne chimique requis'),
('benne','palette_europe',      'incompatible',              'Basculement et plancher non lisses — interdit palettes'),
('benne','palette_120',         'incompatible',              'Basculement et plancher non lisses — interdit palettes'),
('benne','palette_us',          'incompatible',              'Interdit palettes'),
('benne','palette_demi',        'incompatible',              'Interdit palettes'),
('benne','colis',               'incompatible',              'Marchandises endommagées au déchargement'),
('benne','frigo',               'incompatible',              'Benne non réfrigérée'),
('benne','liquide',             'incompatible',              'Benne non étanche'),
('benne','liquide_alimentaire', 'incompatible',              'Benne non étanche'),
('benne','liquide_chimique',    'incompatible',              'Benne non étanche — danger'),
('benne','engin',               'incompatible',              'Plancher non adapté aux engins'),
('benne','conteneur',           'incompatible',              'Benne non conçue pour ISO'),
('benne','charge_indivisible',  'incompatible',              'Non adapté'),

-- ── dechetterie ────────────────────────────────────────────────────────────
('dechetterie','vrac',                'compatible',                NULL),
('dechetterie','vrac_chimique',       'compatible_sous_conditions','ADR et agrément déchets dangereux requis'),
('dechetterie','vrac_alimentaire',    'incompatible',              'Benne déchets — interdit alimentaire'),
('dechetterie','palette_europe',      'incompatible',              'Non adapté'),
('dechetterie','palette_120',         'incompatible',              'Non adapté'),
('dechetterie','colis',               'incompatible',              'Non adapté'),
('dechetterie','frigo',               'incompatible',              'Non adapté'),
('dechetterie','liquide',             'incompatible',              'Non étanche'),
('dechetterie','liquide_alimentaire', 'incompatible',              'Interdit alimentaire'),
('dechetterie','liquide_chimique',    'incompatible',              'Non étanche — danger'),
('dechetterie','engin',               'incompatible',              'Non adapté'),
('dechetterie','conteneur',           'incompatible',              'Non adapté'),
('dechetterie','charge_indivisible',  'incompatible',              'Non adapté'),

-- ── citerne ────────────────────────────────────────────────────────────────
('citerne','liquide',             'compatible',                NULL),
('citerne','liquide_chimique',    'compatible_sous_conditions','ADR obligatoire + homologation spécifique produit'),
('citerne','vrac_chimique',       'compatible_sous_conditions','ADR + agrément citerne vrac chimique'),
('citerne','liquide_alimentaire', 'incompatible',              'Citerne non homologuée alimentaire — risque contamination'),
('citerne','vrac_alimentaire',    'incompatible',              'Citerne standard non homologuée alimentaire'),
('citerne','palette_europe',      'incompatible',              'Citerne — pas de plancher de chargement'),
('citerne','palette_120',         'incompatible',              'Citerne — pas de plancher'),
('citerne','palette_us',          'incompatible',              'Citerne — pas de plancher'),
('citerne','palette_demi',        'incompatible',              'Citerne — pas de plancher'),
('citerne','colis',               'incompatible',              'Citerne — pas de plancher'),
('citerne','frigo',               'incompatible',              'Citerne — pas de plancher'),
('citerne','engin',               'incompatible',              'Citerne — pas de plancher'),
('citerne','conteneur',           'incompatible',              'Citerne — pas de plancher'),
('citerne','vrac',                'compatible',                NULL),
('citerne','charge_indivisible',  'incompatible',              'Non adapté'),

-- ── citerne_alimentaire ────────────────────────────────────────────────────
('citerne_alimentaire','liquide_alimentaire', 'compatible',                NULL),
('citerne_alimentaire','vrac_alimentaire',    'compatible',                NULL),
('citerne_alimentaire','liquide',             'compatible_sous_conditions','Nettoyage et rinçage obligatoires'),
('citerne_alimentaire','liquide_chimique',    'incompatible',              'Citerne alimentaire — interdit chimique'),
('citerne_alimentaire','vrac_chimique',       'incompatible',              'Citerne alimentaire — interdit chimique'),
('citerne_alimentaire','vrac',               'incompatible',              'Citerne alimentaire — interdit vrac non alimentaire'),
('citerne_alimentaire','palette_europe',     'incompatible',              'Citerne — pas de plancher'),
('citerne_alimentaire','palette_120',        'incompatible',              'Citerne — pas de plancher'),
('citerne_alimentaire','colis',              'incompatible',              'Citerne — pas de plancher'),
('citerne_alimentaire','frigo',              'incompatible',              'Citerne — pas de plancher'),
('citerne_alimentaire','engin',              'incompatible',              'Citerne — pas de plancher'),
('citerne_alimentaire','conteneur',          'incompatible',              'Citerne — pas de plancher'),
('citerne_alimentaire','charge_indivisible', 'incompatible',              'Non adapté'),

-- ── plateau / plateau_nu ───────────────────────────────────────────────────
('plateau','engin',              'compatible',                NULL),
('plateau','conteneur',          'compatible',                NULL),
('plateau','charge_indivisible', 'compatible_sous_conditions','Vérifier dimensions — convoi exceptionnel possible'),
('plateau','palette_europe',     'compatible_sous_conditions','Arrimages et protections latérales à prévoir'),
('plateau','palette_120',        'compatible_sous_conditions','Arrimages à prévoir'),
('plateau','colis',              'compatible_sous_conditions','Protection intempéries à prévoir'),
('plateau','vrac',               'incompatible',              'Plateau ouvert — vrac non prise en charge'),
('plateau','vrac_alimentaire',   'incompatible',              'Plateau ouvert — interdit alimentaire'),
('plateau','vrac_chimique',      'incompatible',              'Plateau ouvert — danger dispersion'),
('plateau','liquide',            'incompatible',              'Plateau non étanche'),
('plateau','liquide_alimentaire','incompatible',              'Plateau non étanche'),
('plateau','liquide_chimique',   'incompatible',              'Plateau non étanche — danger'),
('plateau','frigo',              'incompatible',              'Plateau non réfrigéré'),
('plateau_nu','engin',              'compatible',                NULL),
('plateau_nu','conteneur',          'compatible',                NULL),
('plateau_nu','charge_indivisible', 'compatible_sous_conditions','Vérifier dimensions'),
('plateau_nu','palette_europe',     'compatible_sous_conditions','Arrimages et protections à prévoir'),
('plateau_nu','colis',              'compatible_sous_conditions','Protection intempéries à prévoir'),
('plateau_nu','vrac',               'incompatible',              'Non adapté'),
('plateau_nu','vrac_alimentaire',   'incompatible',              'Interdit alimentaire'),
('plateau_nu','vrac_chimique',      'incompatible',              'Danger dispersion'),
('plateau_nu','liquide',            'incompatible',              'Non étanche'),
('plateau_nu','liquide_alimentaire','incompatible',              'Non étanche'),
('plateau_nu','liquide_chimique',   'incompatible',              'Danger'),
('plateau_nu','frigo',              'incompatible',              'Non réfrigéré'),

-- ── plateau_ridelles / savoyarde ───────────────────────────────────────────
('plateau_ridelles','palette_europe',     'compatible',                NULL),
('plateau_ridelles','palette_120',        'compatible',                NULL),
('plateau_ridelles','palette_us',         'compatible',                NULL),
('plateau_ridelles','palette_demi',       'compatible',                NULL),
('plateau_ridelles','colis',              'compatible',                NULL),
('plateau_ridelles','engin',              'compatible_sous_conditions','Ridelles à retirer pour engins larges'),
('plateau_ridelles','conteneur',          'compatible_sous_conditions','Ridelles à retirer'),
('plateau_ridelles','charge_indivisible', 'compatible_sous_conditions','Vérifier dimensions et poids'),
('plateau_ridelles','vrac',               'incompatible',              'Ridelles non étanches au vrac'),
('plateau_ridelles','vrac_alimentaire',   'incompatible',              'Ridelles non étanches'),
('plateau_ridelles','vrac_chimique',      'incompatible',              'Interdit'),
('plateau_ridelles','liquide',            'incompatible',              'Non étanche'),
('plateau_ridelles','liquide_alimentaire','incompatible',              'Non étanche'),
('plateau_ridelles','liquide_chimique',   'incompatible',              'Interdit'),
('plateau_ridelles','frigo',              'incompatible',              'Non réfrigéré'),
('savoyarde','palette_europe',      'compatible',                NULL),
('savoyarde','palette_120',         'compatible',                NULL),
('savoyarde','palette_us',          'compatible',                NULL),
('savoyarde','palette_demi',        'compatible',                NULL),
('savoyarde','colis',               'compatible',                NULL),
('savoyarde','engin',               'compatible_sous_conditions','Ridelles bois à retirer'),
('savoyarde','conteneur',           'compatible_sous_conditions','Ridelles à retirer'),
('savoyarde','charge_indivisible',  'compatible_sous_conditions','Vérifier dimensions'),
('savoyarde','vrac',                'incompatible',              'Non étanche'),
('savoyarde','vrac_alimentaire',    'incompatible',              'Non étanche'),
('savoyarde','vrac_chimique',       'incompatible',              'Interdit'),
('savoyarde','liquide',             'incompatible',              'Non étanche'),
('savoyarde','liquide_alimentaire', 'incompatible',              'Non étanche'),
('savoyarde','liquide_chimique',    'incompatible',              'Interdit'),
('savoyarde','frigo',               'incompatible',              'Non réfrigéré'),

-- ── porte_conteneur ────────────────────────────────────────────────────────
('porte_conteneur','conteneur',           'compatible',                NULL),
('porte_conteneur','charge_indivisible',  'compatible_sous_conditions','Hors conteneur standard — vérifier fixation'),
('porte_conteneur','palette_europe',      'incompatible',              'Porte-conteneur non adapté au chargement vrac/palette'),
('porte_conteneur','palette_120',         'incompatible',              'Non adapté'),
('porte_conteneur','colis',               'incompatible',              'Non adapté sans conteneur'),
('porte_conteneur','engin',               'incompatible',              'Utiliser porte-engin'),
('porte_conteneur','vrac',                'incompatible',              'Non adapté'),
('porte_conteneur','liquide',             'incompatible',              'Non adapté'),
('porte_conteneur','frigo',               'incompatible',              'Utiliser conteneur frigo'),

-- ── fond_mouvant ───────────────────────────────────────────────────────────
('fond_mouvant','vrac',                'compatible',                NULL),
('fond_mouvant','palette_europe',      'compatible',                NULL),
('fond_mouvant','palette_120',         'compatible',                NULL),
('fond_mouvant','colis',               'compatible',                NULL),
('fond_mouvant','vrac_alimentaire',    'compatible_sous_conditions','Nettoyage obligatoire'),
('fond_mouvant','frigo',               'incompatible',              'Fond mouvant non réfrigéré'),
('fond_mouvant','liquide',             'incompatible',              'Non étanche'),
('fond_mouvant','liquide_alimentaire', 'incompatible',              'Non étanche'),
('fond_mouvant','liquide_chimique',    'incompatible',              'Non étanche — danger'),
('fond_mouvant','vrac_chimique',       'incompatible',              'Non adapté'),
('fond_mouvant','engin',               'incompatible',              'Fond mouvant non adapté aux engins'),
('fond_mouvant','conteneur',           'incompatible',              'Non adapté ISO'),
('fond_mouvant','charge_indivisible',  'incompatible',              'Non adapté'),

-- ── porte_engin ────────────────────────────────────────────────────────────
('porte_engin','engin',              'compatible',                NULL),
('porte_engin','charge_indivisible', 'compatible_sous_conditions','Vérifier poids et dimensions'),
('porte_engin','palette_europe',     'incompatible',              'Porte-engin non optimisé palettes'),
('porte_engin','colis',              'incompatible',              'Non adapté'),
('porte_engin','vrac',               'incompatible',              'Non adapté'),
('porte_engin','liquide',            'incompatible',              'Non adapté'),
('porte_engin','frigo',              'incompatible',              'Non adapté'),
('porte_engin','conteneur',          'incompatible',              'Utiliser porte-conteneur'),

-- ── mega ───────────────────────────────────────────────────────────────────
('mega','palette_europe',      'compatible',                NULL),
('mega','palette_120',         'compatible',                NULL),
('mega','palette_us',          'compatible',                NULL),
('mega','palette_demi',        'compatible',                NULL),
('mega','colis',               'compatible',                NULL),
('mega','frigo',               'compatible_sous_conditions','Température non contrôlée sur méga standard'),
('mega','conteneur',           'compatible',                NULL),
('mega','vrac',                'incompatible',              'Méga non adapté au vrac'),
('mega','liquide',             'incompatible',              'Non étanche'),
('mega','engin',               'incompatible',              'Plancher double insuffisant pour engins'),
('mega','charge_indivisible',  'incompatible',              'Double plancher inadapté'),

-- ── hayon ──────────────────────────────────────────────────────────────────
('hayon','palette_europe',      'compatible',                NULL),
('hayon','palette_120',         'compatible',                NULL),
('hayon','palette_demi',        'compatible',                NULL),
('hayon','colis',               'compatible',                NULL),
('hayon','frigo',               'compatible_sous_conditions','Température non contrôlée'),
('hayon','engin',               'incompatible',              'Charge hayon insuffisante pour engins'),
('hayon','vrac',                'incompatible',              'Non adapté'),
('hayon','liquide',             'incompatible',              'Non étanche'),
('hayon','conteneur',           'incompatible',              'Hayon non adapté ISO'),
('hayon','charge_indivisible',  'incompatible',              'Non adapté'),

-- ── plateau_surbaisse / semi_surbaissee / porte_char ──────────────────────
('plateau_surbaisse','engin',              'compatible',                NULL),
('plateau_surbaisse','charge_indivisible', 'compatible',                NULL),
('plateau_surbaisse','palette_europe',     'compatible_sous_conditions','Possible mais non optimal'),
('plateau_surbaisse','vrac',               'incompatible',              'Non adapté'),
('plateau_surbaisse','liquide',            'incompatible',              'Non étanche'),
('plateau_surbaisse','frigo',              'incompatible',              'Non réfrigéré'),
('semi_surbaissee','engin',              'compatible',                NULL),
('semi_surbaissee','charge_indivisible', 'compatible',                NULL),
('semi_surbaissee','palette_europe',     'compatible_sous_conditions','Possible'),
('semi_surbaissee','vrac',               'incompatible',              'Non adapté'),
('semi_surbaissee','liquide',            'incompatible',              'Non étanche'),
('semi_surbaissee','frigo',              'incompatible',              'Non réfrigéré'),
('porte_char','engin',              'compatible',                NULL),
('porte_char','charge_indivisible', 'compatible',                NULL),
('porte_char','palette_europe',     'incompatible',              'Porte-char non optimisé palettes'),
('porte_char','vrac',               'incompatible',              'Non adapté'),
('porte_char','liquide',            'incompatible',              'Non adapté'),
('porte_char','frigo',              'incompatible',              'Non adapté'),

-- ── convois exceptionnels (types extensibles / modulaires) ─────────────────
('porte_engin_renforce','engin',              'compatible',                NULL),
('porte_engin_renforce','charge_indivisible', 'compatible',                NULL),
('porte_engin_renforce','palette_europe',     'incompatible',              'Non optimal'),
('porte_engin_renforce','vrac',               'incompatible',              'Non adapté'),
('remorque_extra_surbaissee','engin',              'compatible',                NULL),
('remorque_extra_surbaissee','charge_indivisible', 'compatible',                NULL),
('remorque_extra_surbaissee','vrac',               'incompatible',              'Non adapté'),
('remorque_extensible','engin',              'compatible',                NULL),
('remorque_extensible','charge_indivisible', 'compatible',                NULL),
('remorque_extensible','conteneur',          'compatible_sous_conditions','Longueur à ajuster'),
('remorque_extensible','vrac',               'incompatible',              'Non adapté'),
('plateau_extensible','engin',              'compatible',                NULL),
('plateau_extensible','charge_indivisible', 'compatible',                NULL),
('plateau_extensible','vrac',               'incompatible',              'Non adapté'),
('porte_engin_extensible','engin',              'compatible',                NULL),
('porte_engin_extensible','charge_indivisible', 'compatible',                NULL),
('remorque_modulaire','charge_indivisible', 'compatible',                NULL),
('remorque_modulaire','engin',              'compatible',                NULL),
('ligne_essieux','charge_indivisible',      'compatible',                NULL),
('ligne_essieux','engin',                   'compatible',                NULL),
('col_de_cygne','engin',              'compatible',                NULL),
('col_de_cygne','charge_indivisible', 'compatible',                NULL),
('col_de_cygne_demontable','engin',              'compatible',                NULL),
('col_de_cygne_demontable','charge_indivisible', 'compatible',                NULL),
('remorque_charge_indivisible','charge_indivisible', 'compatible', NULL),
('remorque_charge_indivisible','engin',              'compatible', NULL),
('remorque_grande_longueur','charge_indivisible',    'compatible', NULL),
('remorque_grande_longueur','engin',                 'compatible', NULL),
('remorque_grande_largeur','charge_indivisible',     'compatible', NULL),
('remorque_grande_largeur','engin',                  'compatible', NULL),
('remorque_grande_hauteur','charge_indivisible',     'compatible', NULL),
('remorque_grande_hauteur','engin',                  'compatible', NULL)

ON CONFLICT (trailer_type_code, cargo_type_code, COALESCE(company_id, -1))
DO UPDATE SET
  niveau         = EXCLUDED.niveau,
  condition_note = EXCLUDED.condition_note;
