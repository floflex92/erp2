/**
 * fleetDepreciation.ts
 *
 * Calculs d'amortissement flotte pour véhicules et remorques.
 * Méthodes supportées :
 *  - Linéaire (dotation constante sur durée)
 *  - Dégressif fiscal (taux linéaire × coefficient légal)
 *  - Unités de production (basé sur les km parcourus)
 *
 * Impact rentabilité :
 *  - Coût d'amortissement mensuel par véhicule
 *  - Coût d'amortissement par km (avec km réels si disponibles)
 *  - Valeur nette comptable (VNC) à une date donnée
 *  - Fin de plan estimée
 */

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export type MethodeAmortissement = 'lineaire' | 'degressif' | 'unites_production'

export interface AssetDepreciationInput {
  id: string
  label: string
  type: 'vehicule' | 'remorque'
  coutAchatHt: number
  dateAchat: string | null
  dateMiseEnCirculation?: string | null
  valeurResiduelleHt?: number
  dureeMois?: number
  methode?: MethodeAmortissement
  /** Km parcourus par mois (pour méthode unités de production) */
  kmMensuels?: number | null
  /** Capacité totale en km (durée de vie estimée) */
  kmVieEstimee?: number | null
  /** Km actuels au compteur */
  kmActuel?: number | null
}

export interface DepreciationPeriod {
  /** "YYYY-MM" */
  periode: string
  label: string
  dotationHt: number
  amortissementCumule: number
  vncHt: number
  tauxAmortissementPct: number
}

export interface AssetDepreciationResult {
  id: string
  label: string
  type: 'vehicule' | 'remorque'
  coutAchatHt: number
  valeurResiduelleHt: number
  dureeMois: number
  methode: MethodeAmortissement
  dateDebut: string | null
  dateFinEstimee: string | null
  vncActuelle: number
  dotationMensuelle: number
  dotationAnnuelle: number
  tauxAmortissementAnnuelPct: number
  /** % déjà amorti à aujourd'hui */
  tauxAmortiPct: number
  /** Mois restants avant fin du plan */
  moisRestants: number
  /** Coût d'amortissement par km calculé (si km disponibles) */
  coutAmortissementParKm: number | null
  plan: DepreciationPeriod[]
  warnings: string[]
}

export interface FleetDepreciationSummary {
  /** Total valeur brute flotte */
  totalCoutAchatHt: number
  /** Total VNC à aujourd'hui */
  totalVncActuelle: number
  /** Dotation mensuelle globale */
  dotationMensuelleTotale: number
  /** Dotation annuelle globale */
  dotationAnnuelleTotale: number
  /** Taux moyen d'amortissement flotte */
  tauxMoyenAmortiPct: number
  /** Nb actifs entièrement amortis */
  nbAmortisTotal: number
  /** Nb actifs en cours d'amortissement */
  nbEnCours: number
  assets: AssetDepreciationResult[]
}

// ---------------------------------------------------------------------------
// Coefficients dégréssifs fiscaux (France)
// ---------------------------------------------------------------------------

const COEFF_DEGRESSIF: Record<string, number> = {
  '<=3': 1.25,
  '4-5': 1.75,
  '>=6': 2.25,
}

function getCoeffDegressif(dureeMois: number): number {
  const annees = dureeMois / 12
  if (annees <= 3) return COEFF_DEGRESSIF['<=3']
  if (annees <= 5) return COEFF_DEGRESSIF['4-5']
  return COEFF_DEGRESSIF['>=6']
}

// ---------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------

/** Nombre de mois entre deux dates ISO */
function monthsDiff(from: string, to: Date): number {
  const d1 = new Date(from)
  const years = to.getFullYear() - d1.getFullYear()
  const months = to.getMonth() - d1.getMonth()
  return Math.max(0, years * 12 + months)
}

function addMonths(dateISO: string, months: number): string {
  const d = new Date(dateISO)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

function formatPeriode(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatPeriodeLabel(periode: string): string {
  const [year, month] = periode.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  return date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
}

/**
 * Calcule le plan d'amortissement linéaire.
 */
function planLineaire(
  coutAmorti: number,
  valeurResiduelle: number,
  dureeMois: number,
  dateDebut: string,
): DepreciationPeriod[] {
  const dotation = dureeMois > 0 ? coutAmorti / dureeMois : 0
  const plan: DepreciationPeriod[] = []
  let cumul = 0

  for (let i = 0; i < dureeMois; i++) {
    const d = new Date(dateDebut)
    d.setMonth(d.getMonth() + i)
    const periode = formatPeriode(d)
    const dot = Math.min(dotation, coutAmorti - cumul)
    cumul = Math.min(cumul + dot, coutAmorti)
    plan.push({
      periode,
      label: formatPeriodeLabel(periode),
      dotationHt: Math.round(dot * 100) / 100,
      amortissementCumule: Math.round(cumul * 100) / 100,
      vncHt: Math.round((coutAmorti + valeurResiduelle - cumul) * 100) / 100,
      tauxAmortissementPct: Math.round((cumul / (coutAmorti || 1)) * 10000) / 100,
    })
  }

  return plan
}

/**
 * Calcule le plan d'amortissement dégressif fiscal.
 * Bascule en linéaire dès que le linéaire > dégressif.
 */
function planDegressif(
  coutAmorti: number,
  valeurResiduelle: number,
  dureeMois: number,
  dateDebut: string,
): DepreciationPeriod[] {
  const coeff = getCoeffDegressif(dureeMois)
  const tauxAnnuel = (1 / (dureeMois / 12)) * coeff

  const plan: DepreciationPeriod[] = []
  let vncRestante = coutAmorti
  let cumul = 0
  let moisRestants = dureeMois

  for (let i = 0; i < dureeMois; i++) {
    const d = new Date(dateDebut)
    d.setMonth(d.getMonth() + i)
    const periode = formatPeriode(d)

    moisRestants = dureeMois - i
    // Dotation dégressive
    const dotDegressif = (vncRestante * tauxAnnuel) / 12
    // Dotation linéaire résiduelle
    const dotLineaire = moisRestants > 0 ? vncRestante / moisRestants : 0

    const dot = Math.max(dotDegressif, dotLineaire)
    const dotEffective = Math.min(dot, vncRestante)
    vncRestante = Math.max(0, vncRestante - dotEffective)
    cumul = Math.min(cumul + dotEffective, coutAmorti)

    plan.push({
      periode,
      label: formatPeriodeLabel(periode),
      dotationHt: Math.round(dotEffective * 100) / 100,
      amortissementCumule: Math.round(cumul * 100) / 100,
      vncHt: Math.round((vncRestante + valeurResiduelle) * 100) / 100,
      tauxAmortissementPct: Math.round((cumul / (coutAmorti || 1)) * 10000) / 100,
    })
  }

  return plan
}

/**
 * Calcule le plan par unités de production (km).
 */
function planUnitesProduction(
  coutAmorti: number,
  valeurResiduelle: number,
  kmVieEstimee: number,
  kmMensuels: number,
  dureeMoisMax: number,
  dateDebut: string,
): DepreciationPeriod[] {
  const tauxParKm = kmVieEstimee > 0 ? coutAmorti / kmVieEstimee : 0
  const plan: DepreciationPeriod[] = []
  let cumul = 0
  let kmCumul = 0

  for (let i = 0; i < dureeMoisMax && cumul < coutAmorti; i++) {
    const d = new Date(dateDebut)
    d.setMonth(d.getMonth() + i)
    const periode = formatPeriode(d)
    const dot = Math.min(tauxParKm * kmMensuels, coutAmorti - cumul)
    cumul = Math.min(cumul + dot, coutAmorti)
    kmCumul += kmMensuels

    plan.push({
      periode,
      label: formatPeriodeLabel(periode),
      dotationHt: Math.round(dot * 100) / 100,
      amortissementCumule: Math.round(cumul * 100) / 100,
      vncHt: Math.round((coutAmorti + valeurResiduelle - cumul) * 100) / 100,
      tauxAmortissementPct: Math.round((kmCumul / (kmVieEstimee || 1)) * 10000) / 100,
    })
  }

  return plan
}

// ---------------------------------------------------------------------------
// Fonction principale
// ---------------------------------------------------------------------------

const DEFAULT_DUREE_VEHICULE_MOIS = 60  // 5 ans
const DEFAULT_DUREE_REMORQUE_MOIS = 84  // 7 ans
const DEFAULT_VALEUR_RESIDUELLE = 0

export function computeAssetDepreciation(input: AssetDepreciationInput): AssetDepreciationResult {
  const warnings: string[] = []

  const coutAchatHt = input.coutAchatHt
  const valeurResiduelle = input.valeurResiduelleHt ?? DEFAULT_VALEUR_RESIDUELLE
  const coutAmorti = coutAchatHt - valeurResiduelle

  const defaultDuree = input.type === 'remorque' ? DEFAULT_DUREE_REMORQUE_MOIS : DEFAULT_DUREE_VEHICULE_MOIS
  const dureeMois = input.dureeMois ?? defaultDuree
  const methode = input.methode ?? 'lineaire'

  const dateRaw = input.dateAchat ?? input.dateMiseEnCirculation
  if (!dateRaw) {
    warnings.push('Date d\'achat non renseignée — estimation à partir d\'aujourd\'hui')
  }
  const dateDebut = dateRaw ?? new Date().toISOString().split('T')[0]

  // Génération du plan
  let plan: DepreciationPeriod[]
  if (methode === 'degressif') {
    plan = planDegressif(coutAmorti, valeurResiduelle, dureeMois, dateDebut)
  } else if (methode === 'unites_production') {
    const kmMensuels = input.kmMensuels ?? 5000
    const kmVie = input.kmVieEstimee ?? 500000
    if (!input.kmMensuels) warnings.push('Km moyens mensuels non renseignés — 5 000 km/mois utilisés')
    if (!input.kmVieEstimee) warnings.push('Durée de vie km non renseignée — 500 000 km utilisés')
    plan = planUnitesProduction(coutAmorti, valeurResiduelle, kmVie, kmMensuels, dureeMois * 2, dateDebut)
  } else {
    plan = planLineaire(coutAmorti, valeurResiduelle, dureeMois, dateDebut)
  }

  const now = new Date()
  const todayPeriode = formatPeriode(now)
  const moisEcoules = monthsDiff(dateDebut, now)

  // VNC actuelle : chercher dans le plan
  const periodeCourante = plan.find(p => p.periode === todayPeriode)
  const periodeAvant = plan.filter(p => p.periode <= todayPeriode).pop()
  const vncActuelle = periodeAvant?.vncHt ?? (coutAmorti + valeurResiduelle)

  // Dotation mensuelle actuelle
  const dotationMensuelle = periodeCourante?.dotationHt ?? plan[0]?.dotationHt ?? 0
  const dotationAnnuelle = plan
    .filter(p => p.periode.startsWith(String(now.getFullYear())))
    .reduce((s, p) => s + p.dotationHt, 0)

  const tauxAmortissementAnnuelPct = dureeMois > 0 ? Math.round((12 / dureeMois) * 10000) / 100 : 0
  const tauxAmortiPct = periodeAvant?.tauxAmortissementPct ?? 0

  const moisRestants = Math.max(0, dureeMois - moisEcoules)
  const dateFinEstimee = moisRestants > 0 ? addMonths(dateDebut, dureeMois) : null

  // Coût amortissement / km
  const kmActuel = input.kmActuel
  let coutAmortissementParKm: number | null = null
  if (kmActuel && kmActuel > 0 && moisEcoules > 0) {
    const coutAmortiADate = (coutAmorti + valeurResiduelle) - vncActuelle
    coutAmortissementParKm = coutAmortiADate > 0 ? Math.round((coutAmortiADate / kmActuel) * 100) / 100 : null
  }

  return {
    id: input.id,
    label: input.label,
    type: input.type,
    coutAchatHt,
    valeurResiduelleHt: valeurResiduelle,
    dureeMois,
    methode,
    dateDebut,
    dateFinEstimee,
    vncActuelle: Math.round(vncActuelle * 100) / 100,
    dotationMensuelle: Math.round(dotationMensuelle * 100) / 100,
    dotationAnnuelle: Math.round(dotationAnnuelle * 100) / 100,
    tauxAmortissementAnnuelPct,
    tauxAmortiPct: Math.round(tauxAmortiPct * 100) / 100,
    moisRestants,
    coutAmortissementParKm,
    plan,
    warnings,
  }
}

/** Calcule le résumé de flotte à partir d'une liste d'actifs */
export function computeFleetDepreciationSummary(
  assets: AssetDepreciationInput[],
): FleetDepreciationSummary {
  const results = assets.map(computeAssetDepreciation)

  const totalCoutAchatHt = results.reduce((s, r) => s + r.coutAchatHt, 0)
  const totalVncActuelle = results.reduce((s, r) => s + r.vncActuelle, 0)
  const dotationMensuelleTotale = results.reduce((s, r) => s + r.dotationMensuelle, 0)
  const dotationAnnuelleTotale = results.reduce((s, r) => s + r.dotationAnnuelle, 0)
  const tauxMoyenAmortiPct =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.tauxAmortiPct, 0) / results.length * 100) / 100
      : 0
  const nbAmortisTotal = results.filter(r => r.moisRestants === 0).length
  const nbEnCours = results.length - nbAmortisTotal

  return {
    totalCoutAchatHt: Math.round(totalCoutAchatHt * 100) / 100,
    totalVncActuelle: Math.round(totalVncActuelle * 100) / 100,
    dotationMensuelleTotale: Math.round(dotationMensuelleTotale * 100) / 100,
    dotationAnnuelleTotale: Math.round(dotationAnnuelleTotale * 100) / 100,
    tauxMoyenAmortiPct,
    nbAmortisTotal,
    nbEnCours,
    assets: results,
  }
}
