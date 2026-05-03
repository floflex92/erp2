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

export async function listLogisticSites(companyId?: number | null) {
  let query = supabase
    .from('sites_logistiques')
    .select('*')
    .order('nom', { ascending: true })

  if (companyId != null) {
    query = query.eq('company_id', companyId)
  }

  const result = await query

  if (result.error) throw result.error
  return result.data ?? []
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
  const rows: OtLigneInsert[] = lignes.map(l => ({ ...l, ot_id: otId, company_id: companyId }))
  const { data: existingRows, error: readErr } = await supabase
    .from('ot_lignes')
    .select('*')
    .eq('ot_id', otId)

  if (readErr) throw readErr

  const previousRows = existingRows ?? []
  const { error: delErr } = await supabase.from('ot_lignes').delete().eq('ot_id', otId)
  if (delErr) throw delErr
  if (rows.length === 0) return

  const { error: insErr } = await supabase.from('ot_lignes').insert(rows)
  if (!insErr) return

  if (previousRows.length > 0) {
    await supabase.from('ot_lignes').insert(previousRows)
  }
  throw insErr
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

/** Classes Tailwind badge pour chaque statut OT (dark mode). */
export const OT_STATUT_BADGE_CLS: Record<string, string> = {
  brouillon: 'bg-slate-700 text-slate-100',
  confirme:  'bg-blue-800/70 text-blue-100',
  planifie:  'bg-blue-700/70 text-blue-50',
  en_cours:  'bg-emerald-700/70 text-emerald-50',
  livre:     'bg-emerald-800/70 text-emerald-100',
  facture:   'bg-amber-700/70 text-amber-50',
  annule:    'bg-red-800/70 text-red-100',
}

/** Classes Tailwind badge pour chaque statut OT (light mode). */
export const OT_STATUT_BADGE_LIGHT_CLS: Record<string, string> = {
  brouillon: 'bg-slate-200 text-foreground',
  confirme:  'bg-blue-100 text-blue-800',
  planifie:  'bg-blue-200 text-blue-900',
  en_cours:  'bg-emerald-100 text-emerald-800',
  livre:     'bg-emerald-200 text-emerald-900',
  facture:   'bg-amber-100 text-amber-800',
  annule:    'bg-red-100 text-red-800',
}

/** Classes Tailwind bloc Gantt pour chaque statut OT. */
export const OT_STATUT_BLOCK_CLS: Record<string, string> = {
  brouillon: 'bg-slate-600 border-slate-500',
  confirme:  'bg-blue-700 border-blue-600',
  planifie:  'bg-blue-600 border-blue-500',
  en_cours:  'bg-emerald-600 border-emerald-500',
  livre:     'bg-emerald-700 border-emerald-600',
  facture:   'bg-amber-600 border-amber-500',
  annule:    'bg-red-700 border-red-600',
}
