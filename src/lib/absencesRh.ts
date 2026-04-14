import { supabase } from './supabase'

export type TypeAbsence =
  | 'conges_payes'
  | 'rtt'
  | 'arret_maladie'
  | 'arret_at'
  | 'formation'
  | 'conge_maternite'
  | 'conge_paternite'
  | 'conge_sans_solde'
  | 'absence_autorisee'
  | 'autre'

export type StatutAbsence =
  | 'demande'
  | 'validee_exploitation'
  | 'validee_direction'
  | 'integree_paie'
  | 'validee'
  | 'refusee'
  | 'annulee'

export interface AbsenceRh {
  id: string
  company_id: number | null
  employe_id: string
  type_absence: TypeAbsence
  date_debut: string
  date_fin: string
  nb_jours: number
  statut: StatutAbsence
  motif: string | null
  justificatif_url: string | null
  validateur_id: string | null
  date_validation: string | null
  commentaire_rh: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  // Workflow multi-étapes
  validateur_exploitation_id: string | null
  date_validation_exploitation: string | null
  validateur_direction_id: string | null
  date_validation_direction: string | null
  integre_paie_par_id: string | null
  date_integration_paie: string | null
}

export interface SoldeAbsences {
  id: string
  company_id: number | null
  employe_id: string
  annee: number
  cp_acquis: number
  cp_pris: number
  rtt_acquis: number
  rtt_pris: number
}

export const TYPE_ABSENCE_LABELS: Record<TypeAbsence, string> = {
  conges_payes: 'Congés payés',
  rtt: 'RTT',
  arret_maladie: 'Arrêt maladie',
  arret_at: 'Accident du travail',
  formation: 'Formation',
  conge_maternite: 'Congé maternité',
  conge_paternite: 'Congé paternité',
  conge_sans_solde: 'Congé sans solde',
  absence_autorisee: 'Absence autorisée',
  autre: 'Autre',
}

export const STATUT_ABSENCE_LABELS: Record<StatutAbsence, string> = {
  demande: 'Demandé',
  validee_exploitation: 'Validé exploitation',
  validee_direction: 'Validé direction',
  integree_paie: 'Intégré paie',
  validee: 'Validé',
  refusee: 'Refusé',
  annulee: 'Annulé',
}

export const STATUT_ABSENCE_COLORS: Record<StatutAbsence, string> = {
  demande: 'bg-amber-100 text-amber-700',
  validee_exploitation: 'bg-blue-100 text-blue-700',
  validee_direction: 'bg-indigo-100 text-indigo-700',
  integree_paie: 'bg-purple-100 text-purple-700',
  validee: 'bg-green-100 text-green-700',
  refusee: 'bg-red-100 text-red-600',
  annulee: 'bg-slate-100 text-slate-500',
}

/** Étapes du workflow d'absence avec le rôle autorisé pour chaque transition */
export const ABSENCE_WORKFLOW_STEPS: {
  from: StatutAbsence
  to: StatutAbsence
  label: string
  roles: string[]
}[] = [
  { from: 'demande', to: 'validee_exploitation', label: 'Valider (exploitation)', roles: ['exploitant', 'admin', 'super_admin'] },
  { from: 'validee_exploitation', to: 'validee_direction', label: 'Valider (direction)', roles: ['dirigeant', 'admin', 'super_admin'] },
  { from: 'validee_direction', to: 'integree_paie', label: 'Intégrer en paie', roles: ['rh', 'comptable', 'admin', 'super_admin'] },
  { from: 'integree_paie', to: 'validee', label: 'Validation finale', roles: ['rh', 'dirigeant', 'admin', 'super_admin'] },
]

/** Statuts considérés comme "en cours" pour le blocage planning */
export const STATUTS_ABSENCE_ACTIFS: StatutAbsence[] = [
  'demande', 'validee_exploitation', 'validee_direction', 'integree_paie', 'validee',
]

// ─── CRUD absences ────────────────────────────────────────────────────────────

export async function fetchAbsencesRh(employeId?: string): Promise<AbsenceRh[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any).from('absences_rh').select('*').order('date_debut', { ascending: false })
    if (employeId) query = query.eq('employe_id', employeId)
    const { data, error } = await query
    if (error) return []
    return (data as AbsenceRh[]) ?? []
  } catch {
    return []
  }
}

export async function fetchAbsencesValideesPeriode(
  employeId: string,
  periodeDebut: string,
  periodeFin: string,
): Promise<AbsenceRh[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('absences_rh')
      .select('*')
      .eq('employe_id', employeId)
      .in('statut', STATUTS_ABSENCE_ACTIFS)
      .lte('date_debut', periodeFin)
      .gte('date_fin', periodeDebut)
      .order('date_debut', { ascending: true })
    if (error) return []
    return (data as AbsenceRh[]) ?? []
  } catch {
    return []
  }
}

/**
 * Charge les absences validées pour TOUS les employés d'un coup sur une période.
 * Une seule requête Supabase au lieu d'une par conducteur (élimine le N+1).
 */
export async function fetchAllAbsencesValideesPeriode(
  employeIds: string[],
  periodeDebut: string,
  periodeFin: string,
): Promise<Map<string, AbsenceRh[]>> {
  const result = new Map<string, AbsenceRh[]>()
  if (employeIds.length === 0) return result
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('absences_rh')
      .select('*')
      .in('employe_id', employeIds)
      .in('statut', STATUTS_ABSENCE_ACTIFS)
      .lte('date_debut', periodeFin)
      .gte('date_fin', periodeDebut)
      .order('date_debut', { ascending: true })
    if (error || !data) return result
    for (const row of data as AbsenceRh[]) {
      const list = result.get(row.employe_id)
      if (list) list.push(row)
      else result.set(row.employe_id, [row])
    }
    return result
  } catch {
    return result
  }
}

export async function createAbsenceRh(
  absence: Omit<AbsenceRh, 'id' | 'created_at' | 'updated_at'>,
): Promise<AbsenceRh | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('absences_rh')
      .insert([absence])
      .select()
      .single()
    if (error) return null
    return (data as AbsenceRh) ?? null
  } catch {
    return null
  }
}

export async function updateAbsenceRh(
  id: string,
  patch: Partial<AbsenceRh>,
): Promise<AbsenceRh | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('absences_rh')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) return null
    return (data as AbsenceRh) ?? null
  } catch {
    return null
  }
}

export async function deleteAbsenceRh(id: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('absences_rh').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}

// ─── Soldes CP/RTT ───────────────────────────────────────────────────────────

export async function fetchSoldeAbsences(
  employeId: string,
  annee: number,
): Promise<SoldeAbsences | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('soldes_absences')
      .select('*')
      .eq('employe_id', employeId)
      .eq('annee', annee)
      .maybeSingle()
    return (data as SoldeAbsences) ?? null
  } catch {
    return null
  }
}

export async function upsertSoldeAbsences(
  solde: Omit<SoldeAbsences, 'id'>,
): Promise<SoldeAbsences | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('soldes_absences')
      .upsert(solde, { onConflict: 'employe_id,annee' })
      .select()
      .single()
    if (error) return null
    return (data as SoldeAbsences) ?? null
  } catch {
    return null
  }
}

// ─── Calcul heures d'absence pour paie ───────────────────────────────────────

/**
 * Calcule le total d'heures d'absence non rémunérées pour une période de paie.
 * Retourne aussi le détail par type pour affichage dans le bulletin.
 */
export function computeAbsenceHeuresFromAbsences(
  absences: AbsenceRh[],
  hoursPerDay = 8,
): { totalHeures: number; detail: { label: string; jours: number; heures: number }[] } {
  const TYPES_NON_REMUNERES: TypeAbsence[] = [
    'arret_maladie', 'arret_at', 'conge_sans_solde', 'absence_autorisee', 'autre',
  ]
  const detail: { label: string; jours: number; heures: number }[] = []
  let totalHeures = 0

  for (const abs of absences) {
    if (abs.statut !== 'validee') continue
    const joursRemuneresNon = TYPES_NON_REMUNERES.includes(abs.type_absence)
    if (joursRemuneresNon) {
      const heures = abs.nb_jours * hoursPerDay
      totalHeures += heures
      detail.push({ label: TYPE_ABSENCE_LABELS[abs.type_absence], jours: abs.nb_jours, heures })
    }
  }

  return { totalHeures, detail }
}
