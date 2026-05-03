/**
 * chargementRules.ts
 * Règles métier de compatibilité remorque / type de chargement
 * et calculs de remplissage.
 */

// --------------------------------------------------------------------------
// Types de chargement
// --------------------------------------------------------------------------
export const TYPES_CHARGEMENT_LABELS: Record<string, string> = {
  palette_europe:       'Palettes Europe (80×120 cm)',
  palette_120:          'Palettes 120×100 cm',
  palette_us:           'Palettes US / industrielles',
  palette_demi:         'Demi-palettes (60×80 cm)',
  vrac:                 'Vrac (non alimentaire)',
  vrac_alimentaire:     'Vrac alimentaire',
  vrac_chimique:        'Vrac chimique / dangereux',
  liquide:              'Liquide',
  liquide_alimentaire:  'Liquide alimentaire',
  liquide_chimique:     'Liquide chimique / dangereux',
  colis:                'Colis / marchandises générales',
  frigo:                'Réfrigéré / surgelé',
  engin:                'Engins / machines / véhicules',
  conteneur:            'Conteneur ISO',
}

export const TYPES_PALETTE_LABELS: Record<string, string> = {
  europe:    'Europe (80×120 cm)',
  '120x100': '120×100 cm',
  us:        'US / Industrielle (100×120 cm)',
  demi:      'Demi-palette (60×80 cm)',
  quart:     'Quart de palette (40×60 cm)',
}

// Types de chargement qui nécessitent de préciser le type de palette
export const TYPES_CHARGEMENT_PALETTE = new Set([
  'palette_europe', 'palette_120', 'palette_us', 'palette_demi',
])

// --------------------------------------------------------------------------
// Types de remorques (valeurs issues de la DB)
// --------------------------------------------------------------------------
export const TYPES_REMORQUE_LABELS: Record<string, string> = {
  tautliner:         'Tautliner (bâché)',
  savoyarde:         'Savoyarde (ridelles)',
  frigo:             'Frigo / Frigorifique',
  benne:             'Benne',
  citerne:           'Citerne',
  citerne_alimentaire: 'Citerne alimentaire',
  plateau:           'Plateau',
  caisse:            'Caisse / Fourgon',
  mega:              'Méga (double plancher)',
  hayon:             'Hayon',
  standard:          'Standard',
  fourgon:           'Fourgon',
  dechetterie:       'Benne déchet',
}

// --------------------------------------------------------------------------
// Matrice de compatibilité : remorque → liste des types de chargement autorisés
// null  = type de remorque inconnu → aucune restriction appliquée
// --------------------------------------------------------------------------
export const CHARGEMENTS_AUTORISES: Record<string, string[]> = {
  tautliner: [
    'palette_europe','palette_120','palette_us','palette_demi','colis','frigo','conteneur',
  ],
  savoyarde: [
    'palette_europe','palette_120','palette_us','palette_demi','colis','engin',
  ],
  frigo: [
    'palette_europe','palette_120','palette_us','palette_demi','colis','frigo',
  ],
  benne: [
    'vrac','vrac_alimentaire','vrac_chimique',
  ],
  citerne: [
    'liquide','liquide_alimentaire','liquide_chimique','vrac_alimentaire','vrac_chimique',
  ],
  citerne_alimentaire: [
    'liquide_alimentaire','vrac_alimentaire',
  ],
  plateau: [
    'engin','colis','conteneur','palette_europe','palette_120',
  ],
  caisse: [
    'palette_europe','palette_120','palette_us','palette_demi','colis','frigo',
  ],
  fourgon: [
    'palette_europe','palette_120','palette_demi','colis','frigo',
  ],
  mega: [
    'palette_europe','palette_120','palette_us','palette_demi','colis','frigo','conteneur',
  ],
  hayon: [
    'palette_europe','palette_120','palette_demi','colis',
  ],
  standard: [
    'palette_europe','palette_120','palette_us','palette_demi','colis','frigo',
  ],
  dechetterie: [
    'vrac','vrac_chimique',
  ],
}

/**
 * Vérifie si un type de remorque est compatible avec un type de chargement.
 * Retourne `{ ok: true }` si compatible ou si l'une des valeurs est inconnue.
 */
export function checkCompatibilite(
  type_remorque: string | null | undefined,
  type_chargement: string | null | undefined,
): { ok: boolean; message: string } {
  if (!type_remorque || !type_chargement) return { ok: true, message: '' }
  const autorises = CHARGEMENTS_AUTORISES[type_remorque]
  if (!autorises) return { ok: true, message: '' } // type inconnu = pas de règle
  if (autorises.includes(type_chargement)) return { ok: true, message: '' }
  const labelRemorque = TYPES_REMORQUE_LABELS[type_remorque] ?? type_remorque
  const labelChargement = TYPES_CHARGEMENT_LABELS[type_chargement] ?? type_chargement
  return {
    ok: false,
    message: `Incompatibilité : une remorque "${labelRemorque}" ne peut pas transporter "${labelChargement}".`,
  }
}

/**
 * Retourne les types de chargement autorisés pour un type de remorque.
 * Retourne `null` si le type de remorque est inconnu (aucune restriction).
 */
export function getChargementsPossibles(type_remorque: string | null | undefined): string[] | null {
  if (!type_remorque) return null
  return CHARGEMENTS_AUTORISES[type_remorque] ?? null
}

// --------------------------------------------------------------------------
// Calcul de métrage linéaire à partir du nombre de palettes
// Hypothèse : largeur utile de la semi = 2.46 m
// --------------------------------------------------------------------------
const PALETTE_PROFONDEUR: Record<string, number> = {
  europe:    0.80, // profondeur dans le sens de chargement
  '120x100': 1.00,
  us:        1.00,
  demi:      0.60,
  quart:     0.40,
}
const PALETTE_LARGEUR: Record<string, number> = {
  europe:    1.20,
  '120x100': 1.20,
  us:        1.20,
  demi:      0.80,
  quart:     0.60,
}
const LARGEUR_UTILE_REMORQUE = 2.46

export function calcMetragePalettes(nb_palettes: number, type_palette: string): number {
  const profondeur = PALETTE_PROFONDEUR[type_palette] ?? 0.80
  const largeur = PALETTE_LARGEUR[type_palette] ?? 1.20
  const palettes_de_front = Math.floor(LARGEUR_UTILE_REMORQUE / largeur)
  const rangees = Math.ceil(nb_palettes / Math.max(palettes_de_front, 1))
  return Math.round(rangees * profondeur * 100) / 100
}

// --------------------------------------------------------------------------
// Calcul de remplissage
// --------------------------------------------------------------------------
export type RemplissageResult = {
  poids_pct:  number | null
  ml_pct:     number | null
  global_pct: number | null
  poids_libre_kg: number | null
  ml_libre_m:     number | null
  alerte_poids:   boolean
  alerte_ml:      boolean
  alerte:         boolean
}

export function calcRemplissage(
  poids_kg:           number | null,
  tonnage:            number | null,
  metrage_ml:         number | null,
  charge_utile_kg:    number | null,
  longueur_remorque_m: number | null,
): RemplissageResult {
  // Poids total (priorité poids_kg, sinon tonnage converti)
  const poids_total_kg = poids_kg ?? ((tonnage ?? 0) > 0 ? (tonnage! * 1000) : null)

  let poids_pct: number | null = null
  let poids_libre_kg: number | null = null
  if (poids_total_kg != null && poids_total_kg > 0 && charge_utile_kg && charge_utile_kg > 0) {
    poids_pct = Math.round((poids_total_kg / charge_utile_kg) * 100)
    poids_libre_kg = Math.round(charge_utile_kg - poids_total_kg)
  }

  let ml_pct: number | null = null
  let ml_libre_m: number | null = null
  if (metrage_ml != null && metrage_ml > 0 && longueur_remorque_m && longueur_remorque_m > 0) {
    ml_pct = Math.round((metrage_ml / longueur_remorque_m) * 100)
    ml_libre_m = Math.round((longueur_remorque_m - metrage_ml) * 100) / 100
  }

  const vals = [poids_pct, ml_pct].filter(v => v !== null) as number[]
  const global_pct = vals.length > 0 ? Math.max(...vals) : null

  return {
    poids_pct,
    ml_pct,
    poids_libre_kg,
    ml_libre_m,
    global_pct,
    alerte_poids: (poids_pct ?? 0) > 100,
    alerte_ml:    (ml_pct ?? 0) > 100,
    alerte:       (global_pct ?? 0) > 100,
  }
}

/**
 * Calcul de remplissage cumulé pour un groupage (additionne tous les OTs).
 */
export function calcRemplissageGroupage(
  ots: Array<{ poids_kg: number | null; tonnage: number | null; metrage_ml: number | null }>,
  charge_utile_kg: number | null,
  longueur_remorque_m: number | null,
): RemplissageResult {
  const total_poids = ots.reduce((sum, ot) => {
    const p = ot.poids_kg ?? ((ot.tonnage ?? 0) * 1000)
    return sum + p
  }, 0)
  const total_ml = ots.reduce((sum, ot) => sum + (ot.metrage_ml ?? 0), 0)
  return calcRemplissage(
    total_poids > 0 ? total_poids : null,
    null,
    total_ml > 0 ? total_ml : null,
    charge_utile_kg,
    longueur_remorque_m,
  )
}

// Seuils d'alerte
export const SEUIL_ALERTE_ORANGE = 85   // % → couleur orange
export const SEUIL_ALERTE_ROUGE  = 100  // % → rouge / blocage

export function couleurBarre(pct: number | null): string {
  if (pct === null) return 'bg-slate-300'
  if (pct > 100) return 'bg-red-500'
  if (pct >= SEUIL_ALERTE_ORANGE) return 'bg-amber-400'
  return 'bg-emerald-500'
}

export function couleurTexte(pct: number | null): string {
  if (pct === null) return 'text-muted'
  if (pct > 100) return 'text-red-600'
  if (pct >= SEUIL_ALERTE_ORANGE) return 'text-amber-600'
  return 'text-emerald-700'
}
