/**
 * trailerValidation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * MOTEUR DE VALIDATION CENTRALISÉ — compatibilité remorque ↔ OT
 *
 * Source unique de vérité pour toute logique de validation d'affectation.
 * Aucune règle métier ne doit être dupliquée ailleurs.
 *
 * Modules :
 *   1. Types et interfaces
 *   2. Matrice de compatibilité (miroir JS de la table trailer_cargo_compatibility)
 *   3. Catalogue des types de remorques (miroir JS de trailer_types)
 *   4. Vérificateurs métier individuels
 *   5. Moteur de validation principal (validateTrailerAssignment)
 *   6. Utilitaires de scoring et de suggestion
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. TYPES ET INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type NiveauCompatibilite =
  | 'compatible'
  | 'compatible_sous_conditions'
  | 'incompatible'

export type ValidationSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  code:     string
  message:  string
  severity: ValidationSeverity
  field?:   string
}

/** Résultat global de validation */
export interface TrailerValidationResult {
  /** 'ok' = affectation autorisée, 'warning' = possible avec alerte, 'blocked' = interdit */
  status:   'ok' | 'warning' | 'blocked'
  errors:   ValidationIssue[]
  warnings: ValidationIssue[]
  infos:    ValidationIssue[]
  /** Score de pertinence 0–100 : 100 = remorque idéale */
  score:    number
}

/** Données minimales de l'OT nécessaires pour la validation */
export interface OtChargement {
  type_chargement?:  string | null
  poids_kg?:         number | null
  tonnage?:          number | null
  volume_m3?:        number | null
  longueur_m?:       number | null
  metrage_ml?:       number | null
  largeur_m?:        number | null
  hauteur_m?:        number | null
  nb_palettes?:      number | null
  adr?:              boolean | null
  temperature_dirigee?: boolean | null
  hors_gabarit?:     boolean | null
  charge_indivisible?: boolean | null
}

/** Données minimales de la remorque nécessaires pour la validation */
export interface RemorqueCapacite {
  type_remorque?:        string | null
  trailer_type_code?:    string | null
  categorie_remorque?:   string | null
  charge_utile_kg?:      number | null
  volume_max_m3?:        number | null
  longueur_m?:           number | null
  largeur_utile_m?:      number | null
  hauteur_utile_m?:      number | null
  nb_palettes_max?:      number | null
  escorte_requise?:      boolean | null
  autorisation_requise?: boolean | null
  categorie_convoi?:     string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. CATALOGUE DES TYPES DE REMORQUES
// ─────────────────────────────────────────────────────────────────────────────

export type CategorieRemorque = 'standard' | 'specialise' | 'convoi_exceptionnel'

export interface TrailerTypeDef {
  code:      string
  label:     string
  categorie: CategorieRemorque
}

/** Miroir JS du catalogue trailer_types (source : migration 20260416140000) */
export const TRAILER_TYPES: TrailerTypeDef[] = [
  // Standard
  { code: 'tautliner',         label: 'Tautliner / Rideaux coulissants', categorie: 'standard' },
  { code: 'fourgon',           label: 'Fourgon / Caisse fermée',         categorie: 'standard' },
  { code: 'frigo',             label: 'Frigorifique / Thermique',        categorie: 'standard' },
  { code: 'benne',             label: 'Benne basculante',                categorie: 'standard' },
  { code: 'citerne',           label: 'Citerne standard',                categorie: 'standard' },
  { code: 'plateau',           label: 'Plateau standard',                categorie: 'standard' },
  { code: 'plateau_ridelles',  label: 'Plateau avec ridelles',           categorie: 'standard' },
  { code: 'plateau_nu',        label: 'Plateau nu',                      categorie: 'standard' },
  { code: 'porte_conteneur',   label: 'Porte-conteneur',                 categorie: 'standard' },
  { code: 'fond_mouvant',      label: 'Fond mouvant (walking floor)',    categorie: 'standard' },
  { code: 'porte_engin',       label: 'Porte-engin standard',            categorie: 'standard' },
  { code: 'remorque_bachee',   label: 'Remorque bâchée',                 categorie: 'standard' },
  { code: 'semi_standard',     label: 'Semi standard (38t)',             categorie: 'standard' },
  { code: 'savoyarde',         label: 'Savoyarde',                       categorie: 'standard' },
  { code: 'caisse',            label: 'Caisse / Fourgon fermé',          categorie: 'standard' },
  // Spécialisé
  { code: 'citerne_alimentaire', label: 'Citerne alimentaire',           categorie: 'specialise' },
  { code: 'mega',              label: 'Méga (double plancher)',           categorie: 'specialise' },
  { code: 'hayon',             label: 'Hayon élévateur',                  categorie: 'specialise' },
  { code: 'dechetterie',       label: 'Benne déchets',                   categorie: 'specialise' },
  // Convoi exceptionnel
  { code: 'plateau_surbaisse',         label: 'Plateau surbaissé',              categorie: 'convoi_exceptionnel' },
  { code: 'semi_surbaissee',           label: 'Semi surbaissée',                categorie: 'convoi_exceptionnel' },
  { code: 'porte_char',                label: 'Porte-char',                     categorie: 'convoi_exceptionnel' },
  { code: 'porte_engin_renforce',      label: 'Porte-engin renforcé',           categorie: 'convoi_exceptionnel' },
  { code: 'remorque_extra_surbaissee', label: 'Remorque extra-surbaissée',      categorie: 'convoi_exceptionnel' },
  { code: 'remorque_extensible',       label: 'Remorque extensible',            categorie: 'convoi_exceptionnel' },
  { code: 'plateau_extensible',        label: 'Plateau extensible',             categorie: 'convoi_exceptionnel' },
  { code: 'porte_engin_extensible',    label: 'Porte-engin extensible',         categorie: 'convoi_exceptionnel' },
  { code: 'remorque_modulaire',        label: 'Remorque modulaire SPMT',        categorie: 'convoi_exceptionnel' },
  { code: 'ligne_essieux',             label: "Ligne d'essieux / Module hydraulique", categorie: 'convoi_exceptionnel' },
  { code: 'col_de_cygne',              label: 'Remorque col de cygne',          categorie: 'convoi_exceptionnel' },
  { code: 'col_de_cygne_demontable',   label: 'Col de cygne démontable',        categorie: 'convoi_exceptionnel' },
  { code: 'remorque_charge_indivisible','label': 'Remorque charge indivisible', categorie: 'convoi_exceptionnel' },
  { code: 'remorque_grande_longueur',  label: 'Remorque grande longueur',       categorie: 'convoi_exceptionnel' },
  { code: 'remorque_grande_largeur',   label: 'Remorque grande largeur',        categorie: 'convoi_exceptionnel' },
  { code: 'remorque_grande_hauteur',   label: 'Remorque grande hauteur',        categorie: 'convoi_exceptionnel' },
]

export const TRAILER_TYPE_MAP = new Map(TRAILER_TYPES.map(t => [t.code, t]))

/** Retourne l'objet type remorque en priorisant trailer_type_code, puis type_remorque legacy */
export function resolveTrailerTypeCode(rem: RemorqueCapacite): string | null {
  return rem.trailer_type_code ?? rem.type_remorque ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MATRICE DE COMPATIBILITÉ (miroir JS de trailer_cargo_compatibility)
// ─────────────────────────────────────────────────────────────────────────────
// Structure : Map<trailerCode, Map<cargoCode, {niveau, condition_note}>>

interface CompatEntry { niveau: NiveauCompatibilite; note: string | null }

type CompatMatrix = Record<string, Record<string, CompatEntry>>

/**
 * Matrice de compatibilité — source JS synchronisée avec la DB.
 * Pour les appels sans réseau (temps-réel formulaire), utiliser cette matrice.
 * Pour les rapports ou règles tenant, charger depuis Supabase.
 */
export const COMPAT_MATRIX: CompatMatrix = {
  tautliner: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible_sous_conditions', note: 'Température non contrôlée — vérifier délai' },
    conteneur:           { niveau: 'compatible',                 note: null },
    engin:               { niveau: 'compatible_sous_conditions', note: 'Poids et dimensions à valider' },
    vrac:                { niveau: 'incompatible',               note: 'Bâche non étanche' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Bâche non étanche — risque sanitaire' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Risque de dispersion' },
    liquide:             { niveau: 'incompatible',               note: 'Remorque non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Risque de fuite — interdit' },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier dimensions — convoi exceptionnel possible' },
  },
  semi_standard: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible_sous_conditions', note: 'Température non contrôlée' },
    conteneur:           { niveau: 'compatible',                 note: null },
    engin:               { niveau: 'compatible_sous_conditions', note: 'Rampes et arrimage à prévoir' },
    vrac:                { niveau: 'incompatible',               note: 'Remorque non adaptée au vrac' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Non adaptée' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Risque de dispersion' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Risque de fuite' },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier si convoi exceptionnel requis' },
  },
  remorque_bachee: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible_sous_conditions', note: 'Température non contrôlée' },
    conteneur:           { niveau: 'compatible',                 note: null },
    engin:               { niveau: 'compatible_sous_conditions', note: 'Vérifier poids et hauteur' },
    vrac:                { niveau: 'incompatible',               note: 'Bâche non étanche' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Bâche non étanche — risque sanitaire' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Interdit' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Interdit' },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier dimensions' },
  },
  fourgon: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible_sous_conditions', note: 'Température non maintenue — délai court exigé' },
    vrac:                { niveau: 'incompatible',               note: 'Fourgon non adapté au déchargement vrac' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Non adapté' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Interdit' },
    liquide:             { niveau: 'incompatible',               note: 'Fourgon non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non homologué' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Interdit' },
    engin:               { niveau: 'incompatible',               note: 'Porte fourgon trop petite' },
    conteneur:           { niveau: 'incompatible',               note: 'Fourgon trop court pour ISO' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Espace trop contraint' },
  },
  caisse: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible_sous_conditions', note: 'Température non maintenue' },
    vrac:                { niveau: 'incompatible',               note: 'Caisse non adaptée vrac' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Non adapté' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Interdit' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non homologué' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Interdit' },
    engin:               { niveau: 'incompatible',               note: 'Ouverture insuffisante' },
    conteneur:           { niveau: 'incompatible',               note: 'Trop court pour ISO' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Espace trop contraint' },
  },
  frigo: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible',                 note: null },
    vrac_alimentaire:    { niveau: 'compatible_sous_conditions', note: 'Nettoyage interne obligatoire' },
    vrac:                { niveau: 'incompatible',               note: 'Groupe froid endommageable' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Contamination possible' },
    liquide:             { niveau: 'incompatible',               note: 'Citerne uniquement' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Citerne alimentaire uniquement' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Interdit' },
    engin:               { niveau: 'incompatible',               note: 'Espace inadapté' },
    conteneur:           { niveau: 'incompatible',               note: 'Non conçu pour ISO' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Espace trop contraint' },
  },
  benne: {
    vrac:                { niveau: 'compatible',                 note: null },
    vrac_alimentaire:    { niveau: 'compatible_sous_conditions', note: 'Nettoyage certifié obligatoire' },
    vrac_chimique:       { niveau: 'compatible_sous_conditions', note: 'ADR + agrément benne chimique' },
    palette_europe:      { niveau: 'incompatible',               note: 'Plancher non lisse — interdit palettes' },
    palette_120:         { niveau: 'incompatible',               note: 'Interdit palettes' },
    palette_us:          { niveau: 'incompatible',               note: 'Interdit palettes' },
    palette_demi:        { niveau: 'incompatible',               note: 'Interdit palettes' },
    colis:               { niveau: 'incompatible',               note: 'Marchandises endommagées au déchargement' },
    frigo:               { niveau: 'incompatible',               note: 'Benne non réfrigérée' },
    liquide:             { niveau: 'incompatible',               note: 'Benne non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Non étanche — danger' },
    engin:               { niveau: 'incompatible',               note: 'Plancher non adapté' },
    conteneur:           { niveau: 'incompatible',               note: 'Non conçu pour ISO' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Non adapté' },
  },
  dechetterie: {
    vrac:                { niveau: 'compatible',                 note: null },
    vrac_chimique:       { niveau: 'compatible_sous_conditions', note: 'ADR + agrément déchets dangereux' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Benne déchets — interdit alimentaire' },
    palette_europe:      { niveau: 'incompatible',               note: 'Non adapté' },
    palette_120:         { niveau: 'incompatible',               note: 'Non adapté' },
    colis:               { niveau: 'incompatible',               note: 'Non adapté' },
    frigo:               { niveau: 'incompatible',               note: 'Non adapté' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Interdit alimentaire' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Non étanche — danger' },
    engin:               { niveau: 'incompatible',               note: 'Non adapté' },
    conteneur:           { niveau: 'incompatible',               note: 'Non adapté' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Non adapté' },
  },
  citerne: {
    liquide:             { niveau: 'compatible',                 note: null },
    vrac:                { niveau: 'compatible',                 note: null },
    liquide_chimique:    { niveau: 'compatible_sous_conditions', note: 'ADR + homologation produit' },
    vrac_chimique:       { niveau: 'compatible_sous_conditions', note: 'ADR + agrément vrac chimique' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Citerne non homologuée alimentaire' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Non homologuée alimentaire' },
    palette_europe:      { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    palette_120:         { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    palette_us:          { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    palette_demi:        { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    colis:               { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    frigo:               { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    engin:               { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    conteneur:           { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Non adapté' },
  },
  citerne_alimentaire: {
    liquide_alimentaire: { niveau: 'compatible',                 note: null },
    vrac_alimentaire:    { niveau: 'compatible',                 note: null },
    liquide:             { niveau: 'compatible_sous_conditions', note: 'Nettoyage et rinçage obligatoires' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Citerne alimentaire — interdit chimique' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Citerne alimentaire — interdit chimique' },
    vrac:                { niveau: 'incompatible',               note: 'Interdit vrac non alimentaire' },
    palette_europe:      { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    palette_120:         { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    colis:               { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    frigo:               { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    engin:               { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    conteneur:           { niveau: 'incompatible',               note: 'Citerne — pas de plancher' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Non adapté' },
  },
  plateau: {
    engin:               { niveau: 'compatible',                 note: null },
    conteneur:           { niveau: 'compatible',                 note: null },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier dimensions — convoi exceptionnel possible' },
    palette_europe:      { niveau: 'compatible_sous_conditions', note: 'Arrimages et protections latérales à prévoir' },
    palette_120:         { niveau: 'compatible_sous_conditions', note: 'Arrimages à prévoir' },
    colis:               { niveau: 'compatible_sous_conditions', note: 'Protection intempéries à prévoir' },
    vrac:                { niveau: 'incompatible',               note: 'Plateau ouvert — vrac non pris en charge' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Plateau ouvert — interdit alimentaire' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Danger dispersion' },
    liquide:             { niveau: 'incompatible',               note: 'Plateau non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Danger' },
    frigo:               { niveau: 'incompatible',               note: 'Non réfrigéré' },
  },
  plateau_nu: {
    engin:               { niveau: 'compatible',                 note: null },
    conteneur:           { niveau: 'compatible',                 note: null },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier dimensions' },
    palette_europe:      { niveau: 'compatible_sous_conditions', note: 'Arrimages et protections à prévoir' },
    colis:               { niveau: 'compatible_sous_conditions', note: 'Protection intempéries à prévoir' },
    vrac:                { niveau: 'incompatible',               note: 'Non adapté' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Interdit alimentaire' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Danger dispersion' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Danger' },
    frigo:               { niveau: 'incompatible',               note: 'Non réfrigéré' },
  },
  plateau_ridelles: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    engin:               { niveau: 'compatible_sous_conditions', note: 'Ridelles à retirer pour engins larges' },
    conteneur:           { niveau: 'compatible_sous_conditions', note: 'Ridelles à retirer' },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier dimensions et poids' },
    vrac:                { niveau: 'incompatible',               note: 'Ridelles non étanches au vrac' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Non étanche' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Interdit' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Interdit' },
    frigo:               { niveau: 'incompatible',               note: 'Non réfrigéré' },
  },
  savoyarde: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    engin:               { niveau: 'compatible_sous_conditions', note: 'Ridelles bois à retirer' },
    conteneur:           { niveau: 'compatible_sous_conditions', note: 'Ridelles à retirer' },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier dimensions' },
    vrac:                { niveau: 'incompatible',               note: 'Non étanche' },
    vrac_alimentaire:    { niveau: 'incompatible',               note: 'Non étanche' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Interdit' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Interdit' },
    frigo:               { niveau: 'incompatible',               note: 'Non réfrigéré' },
  },
  porte_conteneur: {
    conteneur:           { niveau: 'compatible',                 note: null },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Hors conteneur standard — vérifier fixation' },
    palette_europe:      { niveau: 'incompatible',               note: 'Porte-conteneur non adapté palette' },
    palette_120:         { niveau: 'incompatible',               note: 'Non adapté' },
    colis:               { niveau: 'incompatible',               note: 'Non adapté sans conteneur' },
    engin:               { niveau: 'incompatible',               note: 'Utiliser porte-engin' },
    vrac:                { niveau: 'incompatible',               note: 'Non adapté' },
    liquide:             { niveau: 'incompatible',               note: 'Non adapté' },
    frigo:               { niveau: 'incompatible',               note: 'Utiliser conteneur frigo' },
  },
  fond_mouvant: {
    vrac:                { niveau: 'compatible',                 note: null },
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    vrac_alimentaire:    { niveau: 'compatible_sous_conditions', note: 'Nettoyage obligatoire' },
    frigo:               { niveau: 'incompatible',               note: 'Non réfrigéré' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_alimentaire: { niveau: 'incompatible',               note: 'Non étanche' },
    liquide_chimique:    { niveau: 'incompatible',               note: 'Non étanche — danger' },
    vrac_chimique:       { niveau: 'incompatible',               note: 'Non adapté' },
    engin:               { niveau: 'incompatible',               note: 'Non adapté' },
    conteneur:           { niveau: 'incompatible',               note: 'Non adapté ISO' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Non adapté' },
  },
  porte_engin: {
    engin:               { niveau: 'compatible',                 note: null },
    charge_indivisible:  { niveau: 'compatible_sous_conditions', note: 'Vérifier poids et dimensions' },
    palette_europe:      { niveau: 'incompatible',               note: 'Non optimisé palettes' },
    colis:               { niveau: 'incompatible',               note: 'Non adapté' },
    vrac:                { niveau: 'incompatible',               note: 'Non adapté' },
    liquide:             { niveau: 'incompatible',               note: 'Non adapté' },
    frigo:               { niveau: 'incompatible',               note: 'Non adapté' },
    conteneur:           { niveau: 'incompatible',               note: 'Utiliser porte-conteneur' },
  },
  mega: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_us:          { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible_sous_conditions', note: 'Température non contrôlée' },
    conteneur:           { niveau: 'compatible',                 note: null },
    vrac:                { niveau: 'incompatible',               note: 'Méga non adapté au vrac' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    engin:               { niveau: 'incompatible',               note: 'Double plancher insuffisant' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Double plancher inadapté' },
  },
  hayon: {
    palette_europe:      { niveau: 'compatible',                 note: null },
    palette_120:         { niveau: 'compatible',                 note: null },
    palette_demi:        { niveau: 'compatible',                 note: null },
    colis:               { niveau: 'compatible',                 note: null },
    frigo:               { niveau: 'compatible_sous_conditions', note: 'Température non contrôlée' },
    engin:               { niveau: 'incompatible',               note: 'Charge hayon insuffisante' },
    vrac:                { niveau: 'incompatible',               note: 'Non adapté' },
    liquide:             { niveau: 'incompatible',               note: 'Non étanche' },
    conteneur:           { niveau: 'incompatible',               note: 'Non adapté ISO' },
    charge_indivisible:  { niveau: 'incompatible',               note: 'Non adapté' },
  },
  // Convois exceptionnels — tous orientés engin / charge_indivisible
  plateau_surbaisse:         { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null }, palette_europe: { niveau: 'compatible_sous_conditions', note: 'Possible mais non optimal' }, vrac: { niveau: 'incompatible', note: 'Non adapté' }, liquide: { niveau: 'incompatible', note: 'Non étanche' }, frigo: { niveau: 'incompatible', note: 'Non réfrigéré' } },
  semi_surbaissee:           { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null }, palette_europe: { niveau: 'compatible_sous_conditions', note: 'Possible' }, vrac: { niveau: 'incompatible', note: 'Non adapté' }, liquide: { niveau: 'incompatible', note: 'Non étanche' }, frigo: { niveau: 'incompatible', note: 'Non réfrigéré' } },
  porte_char:                { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null }, palette_europe: { niveau: 'incompatible', note: 'Non optimisé palettes' }, vrac: { niveau: 'incompatible', note: 'Non adapté' }, liquide: { niveau: 'incompatible', note: 'Non adapté' }, frigo: { niveau: 'incompatible', note: 'Non adapté' } },
  porte_engin_renforce:      { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null }, palette_europe: { niveau: 'incompatible', note: 'Non optimal' }, vrac: { niveau: 'incompatible', note: 'Non adapté' } },
  remorque_extra_surbaissee: { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null }, vrac: { niveau: 'incompatible', note: 'Non adapté' } },
  remorque_extensible:       { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null }, conteneur: { niveau: 'compatible_sous_conditions', note: 'Longueur à ajuster' }, vrac: { niveau: 'incompatible', note: 'Non adapté' } },
  plateau_extensible:        { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null }, vrac: { niveau: 'incompatible', note: 'Non adapté' } },
  porte_engin_extensible:    { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null } },
  remorque_modulaire:        { charge_indivisible: { niveau: 'compatible', note: null }, engin: { niveau: 'compatible', note: null } },
  ligne_essieux:             { charge_indivisible: { niveau: 'compatible', note: null }, engin: { niveau: 'compatible', note: null } },
  col_de_cygne:              { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null } },
  col_de_cygne_demontable:   { engin: { niveau: 'compatible', note: null }, charge_indivisible: { niveau: 'compatible', note: null } },
  remorque_charge_indivisible: { charge_indivisible: { niveau: 'compatible', note: null }, engin: { niveau: 'compatible', note: null } },
  remorque_grande_longueur:  { charge_indivisible: { niveau: 'compatible', note: null }, engin: { niveau: 'compatible', note: null } },
  remorque_grande_largeur:   { charge_indivisible: { niveau: 'compatible', note: null }, engin: { niveau: 'compatible', note: null } },
  remorque_grande_hauteur:   { charge_indivisible: { niveau: 'compatible', note: null }, engin: { niveau: 'compatible', note: null } },
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VÉRIFICATEURS MÉTIER INDIVIDUELS
// ─────────────────────────────────────────────────────────────────────────────

const SEUIL_WARNING_PCT = 85   // → orange / warning
const SEUIL_BLOCKED_PCT = 100  // → rouge / blocage

/**
 * 4a. Compatibilité type de remorque ↔ type de chargement
 */
export function checkCompatibiliteMetier(
  trailerCode: string | null | undefined,
  cargoCode:   string | null | undefined,
): { niveau: NiveauCompatibilite; note: string | null } {
  if (!trailerCode || !cargoCode) {
    return { niveau: 'compatible', note: null }
  }
  const row = COMPAT_MATRIX[trailerCode]?.[cargoCode]
  if (!row) {
    // Type inconnu → pas de règle = compatible par défaut (pas de blocage sur données anciennes)
    return { niveau: 'compatible', note: null }
  }
  return row
}

/**
 * 4b. Capacité poids
 */
function checkPoids(ot: OtChargement, rem: RemorqueCapacite): ValidationIssue | null {
  const poids = ot.poids_kg ?? (ot.tonnage ? ot.tonnage * 1000 : null)
  const cu = rem.charge_utile_kg
  if (!poids || !cu) return null
  const pct = (poids / cu) * 100
  if (pct > SEUIL_BLOCKED_PCT) {
    return {
      code:     'POIDS_DEPASSE',
      message:  `Poids dépassé : ${(poids / 1000).toFixed(2)} t pour une CU de ${(cu / 1000).toFixed(2)} t (${Math.round(pct)}%). Affectation impossible.`,
      severity: 'error',
      field:    'poids_kg',
    }
  }
  if (pct >= SEUIL_WARNING_PCT) {
    return {
      code:     'POIDS_QUASI_PLEIN',
      message:  `Chargement poids proche du maximum : ${Math.round(pct)}% (${(poids / 1000).toFixed(2)} t / ${(cu / 1000).toFixed(2)} t).`,
      severity: 'warning',
      field:    'poids_kg',
    }
  }
  return null
}

/**
 * 4c. Capacité volume
 */
function checkVolume(ot: OtChargement, rem: RemorqueCapacite): ValidationIssue | null {
  const vol = ot.volume_m3
  const volMax = rem.volume_max_m3
  if (!vol || !volMax) return null
  const pct = (vol / volMax) * 100
  if (pct > SEUIL_BLOCKED_PCT) {
    return {
      code:     'VOLUME_DEPASSE',
      message:  `Volume dépassé : ${vol} m³ pour un max de ${volMax} m³ (${Math.round(pct)}%). Affectation impossible.`,
      severity: 'error',
      field:    'volume_m3',
    }
  }
  if (pct >= SEUIL_WARNING_PCT) {
    return {
      code:     'VOLUME_QUASI_PLEIN',
      message:  `Chargement volume proche du maximum : ${Math.round(pct)}% (${vol} m³ / ${volMax} m³).`,
      severity: 'warning',
      field:    'volume_m3',
    }
  }
  return null
}

/**
 * 4d. Longueur marchandise vs longueur remorque
 */
function checkLongueur(ot: OtChargement, rem: RemorqueCapacite): ValidationIssue | null {
  // Longueur de la marchandise (priorité longueur_m, sinon métrage linéaire)
  const longueur = ot.longueur_m ?? ot.metrage_ml
  const longueurRem = rem.longueur_m
  if (!longueur || !longueurRem) return null
  const pct = (longueur / longueurRem) * 100
  if (pct > SEUIL_BLOCKED_PCT) {
    return {
      code:     'LONGUEUR_DEPASSEE',
      message:  `Longueur dépassée : ${longueur} m pour une remorque de ${longueurRem} m (${Math.round(pct)}%). Affectation impossible.`,
      severity: 'error',
      field:    'longueur_m',
    }
  }
  if (pct >= SEUIL_WARNING_PCT) {
    return {
      code:     'LONGUEUR_QUASI_PLEIN',
      message:  `Chargement longueur proche du maximum : ${Math.round(pct)}% (${longueur} m / ${longueurRem} m).`,
      severity: 'warning',
      field:    'longueur_m',
    }
  }
  return null
}

/**
 * 4e. Contrôles spécifiques : température dirigée, ADR, hors gabarit
 */
function checkContraintesSpecifiques(
  ot:    OtChargement,
  rem:   RemorqueCapacite,
  trailerCode: string | null,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Température dirigée → exige un frigo
  if (ot.temperature_dirigee && trailerCode !== 'frigo') {
    issues.push({
      code:     'TEMPERATURE_DIRIGEE_INCOMPATIBLE',
      message:  'La marchandise nécessite une température dirigée mais la remorque n\'est pas frigorifique.',
      severity: 'error',
      field:    'temperature_dirigee',
    })
  }

  // Hors gabarit → exige remorque convoi exceptionnel
  if (ot.hors_gabarit) {
    const categorie = rem.categorie_remorque ?? TRAILER_TYPE_MAP.get(trailerCode ?? '')?.categorie
    if (categorie !== 'convoi_exceptionnel') {
      issues.push({
        code:     'HORS_GABARIT_REMORQUE_INADAPTEE',
        message:  'La charge est hors gabarit. Une remorque de convoi exceptionnel est obligatoire.',
        severity: 'error',
        field:    'hors_gabarit',
      })
    }
  }

  // Charge indivisible → recommande convoi exceptionnel
  if (ot.charge_indivisible) {
    const categorie = rem.categorie_remorque ?? TRAILER_TYPE_MAP.get(trailerCode ?? '')?.categorie
    if (categorie !== 'convoi_exceptionnel') {
      issues.push({
        code:     'CHARGE_INDIVISIBLE_VERIFIER_CONVOI',
        message:  'La charge est indivisible. Vérifiez si un convoi exceptionnel est nécessaire.',
        severity: 'warning',
        field:    'charge_indivisible',
      })
    }
  }

  // ADR → information
  if (ot.adr) {
    issues.push({
      code:     'ADR_VERIFIER',
      message:  'Marchandises dangereuses (ADR) — Vérifiez les agréments ADR de la remorque et du véhicule.',
      severity: 'warning',
      field:    'adr',
    })
  }

  return issues
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOTEUR DE VALIDATION PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valide l'affectation d'une remorque à un OT.
 *
 * @returns TrailerValidationResult — status 'ok' | 'warning' | 'blocked'
 *
 * RÈGLE :
 *  - Au moins une erreur (severity='error') → status = 'blocked'
 *  - Seulement des warnings → status = 'warning'
 *  - Aucun problème → status = 'ok'
 */
export function validateTrailerAssignment(
  ot:  OtChargement,
  rem: RemorqueCapacite,
): TrailerValidationResult {
  const errors:   ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const infos:    ValidationIssue[] = []

  const trailerCode = resolveTrailerTypeCode(rem)

  // ── 1. Compatibilité métier ────────────────────────────────────────────────
  const compat = checkCompatibiliteMetier(trailerCode, ot.type_chargement)
  if (compat.niveau === 'incompatible') {
    const trailerLabel = TRAILER_TYPE_MAP.get(trailerCode ?? '')?.label ?? trailerCode ?? 'Remorque'
    errors.push({
      code:     'INCOMPATIBLE_METIER',
      message:  `Incompatibilité métier : une ${trailerLabel} ne peut pas transporter ce type de marchandise.${compat.note ? ` (${compat.note})` : ''}`,
      severity: 'error',
      field:    'type_chargement',
    })
  } else if (compat.niveau === 'compatible_sous_conditions' && compat.note) {
    warnings.push({
      code:     'COMPATIBLE_SOUS_CONDITIONS',
      message:  compat.note,
      severity: 'warning',
      field:    'type_chargement',
    })
  }

  // ── 2. Capacité poids ─────────────────────────────────────────────────────
  const issuesPoids = checkPoids(ot, rem)
  if (issuesPoids) {
    issuesPoids.severity === 'error' ? errors.push(issuesPoids) : warnings.push(issuesPoids)
  }

  // ── 3. Capacité volume ────────────────────────────────────────────────────
  const issuesVol = checkVolume(ot, rem)
  if (issuesVol) {
    issuesVol.severity === 'error' ? errors.push(issuesVol) : warnings.push(issuesVol)
  }

  // ── 4. Longueur ───────────────────────────────────────────────────────────
  const issuesLon = checkLongueur(ot, rem)
  if (issuesLon) {
    issuesLon.severity === 'error' ? errors.push(issuesLon) : warnings.push(issuesLon)
  }

  // ── 5. Contraintes spécifiques ────────────────────────────────────────────
  const specifiques = checkContraintesSpecifiques(ot, rem, trailerCode)
  for (const issue of specifiques) {
    if (issue.severity === 'error')   errors.push(issue)
    else if (issue.severity === 'warning') warnings.push(issue)
    else infos.push(issue)
  }

  // ── Calcul statut global ──────────────────────────────────────────────────
  const status = errors.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ok'

  // ── Score de pertinence (0–100) ───────────────────────────────────────────
  // Diminue selon le nombre de problèmes et leur gravité
  let score = 100
  score -= errors.length * 40
  score -= warnings.length * 10
  score = Math.max(0, score)

  return { status, errors, warnings, infos, score }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. UTILITAIRES DE SUGGESTION ET DE FILTRAGE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filtre une liste de remorques en ne retenant que celles compatibles avec l'OT.
 * Retourne les remorques triées par score décroissant.
 */
export function filterCompatibleTrailers<T extends RemorqueCapacite>(
  trailers: T[],
  ot:       OtChargement,
): Array<T & { _validation: TrailerValidationResult }> {
  return trailers
    .map(rem => ({ ...rem, _validation: validateTrailerAssignment(ot, rem) }))
    .filter(r => r._validation.status !== 'blocked')
    .sort((a, b) => b._validation.score - a._validation.score)
}

/**
 * Retourne la remorque idéale (score le plus élevé, sans blocage).
 */
export function suggestBestTrailer<T extends RemorqueCapacite>(
  trailers: T[],
  ot:       OtChargement,
): T | null {
  const sorted = filterCompatibleTrailers(trailers, ot)
  return sorted.length > 0 ? sorted[0] : null
}

/**
 * Calcul de remplissage étendu (poids + volume + longueur).
 * Utilisé pour l'affichage des barres dans les composants.
 */
export interface RemplissageEtendu {
  poids_pct:   number | null
  volume_pct:  number | null
  longueur_pct: number | null
  poids_libre_kg:   number | null
  volume_libre_m3:  number | null
  longueur_libre_m: number | null
  global_pct:  number | null
  alerte:      boolean
}

export function calcRemplissageEtendu(
  ot:  OtChargement,
  rem: RemorqueCapacite,
): RemplissageEtendu {
  const poids = ot.poids_kg ?? (ot.tonnage ? ot.tonnage * 1000 : null)
  const cu   = rem.charge_utile_kg

  let poids_pct: number | null = null
  let poids_libre_kg: number | null = null
  if (poids && cu && cu > 0) {
    poids_pct = Math.round((poids / cu) * 100)
    poids_libre_kg = Math.round(cu - poids)
  }

  const vol    = ot.volume_m3
  const volMax = rem.volume_max_m3
  let volume_pct: number | null = null
  let volume_libre_m3: number | null = null
  if (vol && volMax && volMax > 0) {
    volume_pct = Math.round((vol / volMax) * 100)
    volume_libre_m3 = Math.round((volMax - vol) * 100) / 100
  }

  const longueur    = ot.longueur_m ?? ot.metrage_ml
  const longueurRem = rem.longueur_m
  let longueur_pct: number | null = null
  let longueur_libre_m: number | null = null
  if (longueur && longueurRem && longueurRem > 0) {
    longueur_pct = Math.round((longueur / longueurRem) * 100)
    longueur_libre_m = Math.round((longueurRem - longueur) * 100) / 100
  }

  const vals = [poids_pct, volume_pct, longueur_pct].filter(v => v !== null) as number[]
  const global_pct = vals.length > 0 ? Math.max(...vals) : null

  return {
    poids_pct,
    volume_pct,
    longueur_pct,
    poids_libre_kg,
    volume_libre_m3,
    longueur_libre_m,
    global_pct,
    alerte: (global_pct ?? 0) > SEUIL_BLOCKED_PCT,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. HELPERS D'AFFICHAGE
// ─────────────────────────────────────────────────────────────────────────────

export function couleurBarrePct(pct: number | null): string {
  if (pct === null) return 'bg-slate-300'
  if (pct > 100) return 'bg-red-500'
  if (pct >= SEUIL_WARNING_PCT) return 'bg-amber-400'
  return 'bg-emerald-500'
}

export function couleurTextePct(pct: number | null): string {
  if (pct === null) return 'text-slate-400'
  if (pct > 100) return 'text-red-600 font-bold'
  if (pct >= SEUIL_WARNING_PCT) return 'text-amber-600 font-semibold'
  return 'text-emerald-700 font-medium'
}

export function badgeCompatibilite(niveau: NiveauCompatibilite): {
  label: string; cls: string
} {
  switch (niveau) {
    case 'compatible':
      return { label: 'Compatible',          cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
    case 'compatible_sous_conditions':
      return { label: 'Sous conditions',     cls: 'bg-amber-100 text-amber-800 border-amber-200' }
    case 'incompatible':
      return { label: 'Incompatible',        cls: 'bg-red-100 text-red-800 border-red-200' }
  }
}

export function badgeValidation(status: 'ok' | 'warning' | 'blocked'): {
  label: string; cls: string; icon: string
} {
  switch (status) {
    case 'ok':
      return { label: 'Affectation autorisée', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: '✓' }
    case 'warning':
      return { label: 'Affectation possible avec réserves', cls: 'bg-amber-50 text-amber-800 border-amber-200', icon: '⚠' }
    case 'blocked':
      return { label: 'Affectation impossible', cls: 'bg-red-50 text-red-800 border-red-200', icon: '⛔' }
  }
}
