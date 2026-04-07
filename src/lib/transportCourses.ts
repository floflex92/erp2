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
