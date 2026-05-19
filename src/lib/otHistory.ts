/**
 * otHistory.ts
 * Helper pour enregistrer les événements dans ot_historique.
 * Appelé après chaque mutation clé (affectation, désaffectation, déplacement, etc.)
 */
import { supabase } from '@/lib/supabase'

export type OtHistoriqueAction =
  | 'creation'
  | 'statut_change'
  | 'affectation'
  | 'desaffectation'
  | 'deplacement'
  | 'livraison'
  | 'retard_valide'
  | 'modification'
  | 'note'

export interface LogOtHistoryParams {
  otId: string
  companyId: number
  action: OtHistoriqueAction
  ancienStatut?: string | null
  nouveauStatut?: string | null
  auteurId?: string | null
  auteurNom?: string | null
  details?: Record<string, unknown>
}

/**
 * Enregistre un événement dans ot_historique.
 * Fire-and-forget : les erreurs sont loggées en console mais ne bloquent pas le flux.
 */
export async function logOtHistory(params: LogOtHistoryParams): Promise<void> {
  const {
    otId,
    companyId,
    action,
    ancienStatut = null,
    nouveauStatut = null,
    auteurId = null,
    auteurNom = null,
    details = {},
  } = params

  const { error } = await (supabase as any).from('ot_historique').insert({
    ot_id: otId,
    company_id: companyId,
    action,
    ancien_statut: ancienStatut,
    nouveau_statut: nouveauStatut,
    auteur_id: auteurId,
    auteur_nom: auteurNom,
    details,
  })

  if (error) {
    console.warn('[otHistory] Impossible d\'enregistrer l\'événement:', error.message)
  }
}

/**
 * Enregistre plusieurs OTs en batch (affectation groupage).
 */
export async function logOtHistoryBatch(
  otIds: string[],
  params: Omit<LogOtHistoryParams, 'otId'>,
): Promise<void> {
  if (otIds.length === 0) return
  const rows = otIds.map(otId => ({
    ot_id: otId,
    company_id: params.companyId,
    action: params.action,
    ancien_statut: params.ancienStatut ?? null,
    nouveau_statut: params.nouveauStatut ?? null,
    auteur_id: params.auteurId ?? null,
    auteur_nom: params.auteurNom ?? null,
    details: params.details ?? {},
  }))

  const { error } = await (supabase as any).from('ot_historique').insert(rows)
  if (error) {
    console.warn('[otHistory] Impossible d\'enregistrer le batch:', error.message)
  }
}
