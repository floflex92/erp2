import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type OtLigne = Tables<'ot_lignes'>
export type OtLigneInsert = TablesInsert<'ot_lignes'>
export type OtLigneUpdate = TablesUpdate<'ot_lignes'>

export const TRANSPORT_SOURCES = ['client', 'bourse_fret', 'manuel'] as const
export type TransportSource = (typeof TRANSPORT_SOURCES)[number]

export const TRANSPORT_STATUS_FLOW = [
  'en_attente_validation',
  'valide',
  'en_attente_planification',
  'planifie',
  'en_cours_approche_chargement',
  'en_chargement',
  'en_transit',
  'en_livraison',
  'termine',
  'annule',
] as const
export type TransportStatus = (typeof TRANSPORT_STATUS_FLOW)[number]

/**
 * Groupes de statut_transport équivalents aux anciens statuts legacy (champ `statut`).
 * Utiliser ces constantes dans les filtres Supabase et les comparaisons côté client.
 */
/** Ancien 'brouillon' → en attente de validation */
export const ST_BROUILLON: TransportStatus[] = ['en_attente_validation']
/** Ancien 'confirme' → validé, prêt à planifier */
export const ST_CONFIRME: TransportStatus[] = ['valide']
/** Ancien 'planifie' → planifié ou en attente de planification */
export const ST_PLANIFIE: TransportStatus[] = ['planifie', 'en_attente_planification']
/** Ancien 'en_cours' → toutes les phases de transit */
export const ST_EN_COURS: TransportStatus[] = [
  'en_cours_approche_chargement',
  'en_chargement',
  'en_transit',
  'en_livraison',
]
/** Ancien 'livre' ou 'facture' → terminé */
export const ST_TERMINE: TransportStatus[] = ['termine']
/** Tous les OT actifs non terminés et non annulés */
export const ST_ACTIFS: TransportStatus[] = [
  'en_attente_validation',
  'valide',
  'en_attente_planification',
  'planifie',
  'en_cours_approche_chargement',
  'en_chargement',
  'en_transit',
  'en_livraison',
]

export const TRANSPORT_STATUS_LABELS: Record<TransportStatus, string> = {
  en_attente_validation: 'En attente validation',
  valide: 'Valide',
  en_attente_planification: 'En attente planification',
  planifie: 'Planifie',
  en_cours_approche_chargement: 'En approche chargement',
  en_chargement: 'En chargement',
  en_transit: 'En transit',
  en_livraison: 'En livraison',
  termine: 'Termine',
  annule: 'Annule',
}

export type CourseOrder = Tables<'ordres_transport'>
export type CourseOrderInsert = TablesInsert<'ordres_transport'>
export type CourseOrderUpdate = TablesUpdate<'ordres_transport'>
export type LogisticSite = Tables<'sites_logistiques'>
export type LogisticSiteInsert = TablesInsert<'sites_logistiques'>
export type LogisticSiteUpdate = TablesUpdate<'sites_logistiques'>
export type TransportStatusHistory = Tables<'ordres_transport_statut_history'>

export async function listLogisticSites() {
  const query = await supabase
    .from('sites_logistiques')
    .select('*')
    .order('nom', { ascending: true })

  if (query.error) throw query.error
  return query.data ?? []
}

export async function createLogisticSite(payload: LogisticSiteInsert) {
  const query = await supabase
    .from('sites_logistiques')
    .insert(payload)
    .select('*')
    .single()

  if (query.error) throw query.error
  return query.data
}

export async function updateLogisticSite(siteId: string, payload: LogisticSiteUpdate) {
  const query = await supabase
    .from('sites_logistiques')
    .update(payload)
    .eq('id', siteId)
    .select('*')
    .single()

  if (query.error) throw query.error
  return query.data
}

export async function setCourseTransportStatus(orderId: string, nextStatus: TransportStatus, commentaire?: string | null) {
  const query = await supabase
    .from('ordres_transport')
    .update({ statut_transport: nextStatus })
    .eq('id', orderId)
    .select('*')
    .single()

  if (query.error) throw query.error

  if (commentaire && commentaire.trim()) {
    await supabase
      .from('ordres_transport_statut_history')
      .update({ commentaire: commentaire.trim() })
      .eq('ot_id', orderId)
      .eq('statut_nouveau', nextStatus)
      .is('commentaire', null)
  }

  return query.data
}

export async function setCourseAffretement(orderId: string, onboardingId: string | null) {
  const payload: CourseOrderUpdate = {
    est_affretee: Boolean(onboardingId),
    affreteur_id: onboardingId,
  }

  const query = await supabase
    .from('ordres_transport')
    .update(payload)
    .eq('id', orderId)
    .select('*')
    .single()

  if (query.error) throw query.error
  return query.data
}

export async function listTransportStatusHistory(orderId: string) {
  const query = await supabase
    .from('ordres_transport_statut_history')
    .select('*')
    .eq('ot_id', orderId)
    .order('changed_at', { ascending: false })

  if (query.error) throw query.error
  return query.data ?? []
}

export async function listOtLignes(otId: string): Promise<OtLigne[]> {
  const { data, error } = await supabase
    .from('ot_lignes')
    .select('*')
    .eq('ot_id', otId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function syncOtLignes(otId: string, companyId: number, lignes: Array<Omit<OtLigneInsert, 'ot_id' | 'company_id'>>) {
  // Delete all existing then re-insert
  const { error: delErr } = await supabase.from('ot_lignes').delete().eq('ot_id', otId)
  if (delErr) throw delErr
  if (lignes.length === 0) return
  const rows: OtLigneInsert[] = lignes.map(l => ({ ...l, ot_id: otId, company_id: companyId }))
  const { error: insErr } = await supabase.from('ot_lignes').insert(rows)
  if (insErr) throw insErr
}

// ─── Labels et styles statuts OT (source de vérité UI) ───────────────────────
// IMPORTANT: toute modification ici se propage à toutes les pages.
// Ne pas redéfinir ces constantes localement dans les pages.

/** Libellés lisibles des statuts OT (champ `statut` legacy). */
export const OT_STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  confirme:  'Confirmé',
  planifie:  'Planifié',
  en_cours:  'En cours',
  livre:     'Livré',
  facture:   'Facturé',
  annule:    'Annulé',
}

/** Classes Tailwind badge pour chaque statut OT. */
export const OT_STATUT_BADGE_CLS: Record<string, string> = {
  brouillon: 'bg-slate-700 text-slate-400',
  confirme:  'bg-blue-900/60 text-blue-300',
  planifie:  'bg-indigo-900/60 text-indigo-300',
  en_cours:  'bg-emerald-900/60 text-emerald-300',
  livre:     'bg-teal-900/60 text-teal-300',
  facture:   'bg-violet-900/60 text-violet-300',
  annule:    'bg-red-900/60 text-red-400',
}

/** Classes Tailwind bloc Gantt pour chaque statut OT. */
export const OT_STATUT_BLOCK_CLS: Record<string, string> = {
  brouillon: 'bg-slate-600 border-slate-500',
  confirme:  'bg-blue-700 border-blue-600',
  planifie:  'bg-indigo-600 border-indigo-500',
  en_cours:  'bg-emerald-600 border-emerald-500',
  livre:     'bg-teal-600 border-teal-500',
  facture:   'bg-violet-700 border-violet-600',
}
