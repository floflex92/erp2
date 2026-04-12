/**
 * Façade Planning Compliance - intégration UI/API pour validation CE 561
 * Expose API simple pour Planning drag-drop + alertes
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { validatePlanningDropAudit, type PlanningDropAuditInput, type PlanningDropAuditResult } from './ce561Validation'
import { JourneeTravailService } from './journeeTravail'

/**
 * Type retourné par validateAndAssignMission
 */
export interface AssignmentResult {
  success: boolean
  ot_id: string
  conducteur_id: string | null
  alertes: Array<{
    code: string
    type: 'bloquant' | 'avertissement'
    libelle: string
    severite?: 'legere' | 'normale' | 'grave' | 'critique'
  }>
  can_force: boolean
  raison_blocage?: string
  message_resultat: string
}

/**
 * Service façade pour compliance planning
 */
export class PlanningComplianceService {
  private supabase: SupabaseClient<Database>
  private journeeService: JourneeTravailService

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
    this.journeeService = new JourneeTravailService(supabase)
  }

  /**
   * Valide et assigne une mission (le cœur du drop handler)
   * Appelé par Planning.onDrop avec transaction
   */
  async validateAndAssignMission(input: {
    ot_id: string
    conducteur_id: string | null
    start_iso: string
    end_iso: string
    force: boolean
  }): Promise<AssignmentResult> {
    const { ot_id, conducteur_id, start_iso, end_iso, force } = input

    const result: AssignmentResult = {
      success: false,
      ot_id,
      conducteur_id,
      alertes: [],
      can_force: false,
      message_resultat: '',
    }

    // 1. Sans conducteur : validation basique
    if (!conducteur_id) {
      const db = this.supabase as any
      const { data: ot, error: otErr } = await db
        .from('ordres_transport')
        .select('id, reference, statut_transport')
        .eq('id', ot_id)
        .single()

      if (otErr || !ot) {
        result.message_resultat = 'Mission introuvable'
        return result
      }

      // Assigner directement
      const { error: updateErr } = await db
        .from('ordres_transport')
        .update({
          statut_transport: 'planifie',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ot_id)

      if (updateErr) {
        result.message_resultat = `Erreur mise à jour: ${updateErr.message}`
        return result
      }

      result.success = true
      result.message_resultat = `Mission ${ot.reference} planifiée sans conducteur`
      return result
    }

    // 2. Avec conducteur : validation CE 561
    const auditInput: PlanningDropAuditInput = {
      otId: ot_id,
      conducteurId: conducteur_id,
      startISO: start_iso,
      endISO: end_iso,
    }

    const auditResult: PlanningDropAuditResult = await validatePlanningDropAudit(auditInput)
      .catch((err) => {
        console.error('Erreur audit CE561:', err)
        return { alerts: [], source: 'defaults' as const }
      })

    // Mapper vers AlerteFront
    result.alertes = auditResult.alerts.map((a) => ({
      code: a.code,
      type: a.type,
      libelle: a.message,
    }))

    const alertesBloquantes = result.alertes.filter((a) => a.type === 'bloquant')
    result.can_force = alertesBloquantes.length > 0 && alertesBloquantes.length <= 3

    // 3. Vérifier blocages
    if (alertesBloquantes.length > 0 && !force) {
      result.raison_blocage = `${alertesBloquantes.length} infraction(s) bloquante(s)`
      result.message_resultat = `⚠️ Validation bloquée: ${alertesBloquantes.map((a) => a.libelle).join(', ')}`
      return result
    }

    if (alertesBloquantes.length > 0 && force && !result.can_force) {
      result.message_resultat = `❌ Forçage impossible: plus de 3 infractions détectées`
      return result
    }

    // 4. Assigner + transaction
    try {
      const db = this.supabase as any
      const { error: updateErr } = await db
        .from('ordres_transport')
        .update({
          conducteur_id,
          statut_transport: 'planifie',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ot_id)

      if (updateErr) throw updateErr

      // Recalculer journée du conducteur
      await this.journeeService.recalculerJournee(
        conducteur_id,
        new Date(start_iso)
      )

      result.success = true
      const suffix = force && alertesBloquantes.length > 0 ? ' (forçé)' : ''
      result.message_resultat = `✅ Mission assignée${suffix}. Avertissements: ${result.alertes.filter((a) => a.type === 'avertissement').length}`

      return result
    } catch (err: any) {
      result.message_resultat = `Erreur assignment: ${err?.message}`
      return result
    }
  }

  /**
   * Pré-validation légère (avant drop UI) pour feedback en temps réel
   */
  async preValidateDropOver(input: {
    ot_id: string
    conducteur_id: string | null
    start_iso: string
    end_iso: string
  }): Promise<{
    allowed: boolean
    warning_count: number
    error_count: number
  }> {
    if (!input.conducteur_id) {
      return { allowed: true, warning_count: 0, error_count: 0 }
    }

    const auditResult = await validatePlanningDropAudit({
      otId: input.ot_id,
      conducteurId: input.conducteur_id,
      startISO: input.start_iso,
      endISO: input.end_iso,
    })
      .catch(() => ({ alerts: [], source: 'defaults' as const }))

    const errors = auditResult.alerts.filter((a) => a.type === 'bloquant').length
    const warnings = auditResult.alerts.filter((a) => a.type === 'avertissement').length

    return {
      allowed: errors === 0,
      warning_count: warnings,
      error_count: errors,
    }
  }

  /**
   * Expose compteurs CE pour affichage temps réel
   */
  async getCompteursCE(conducteur_id: string, jusqu_a: Date): Promise<{
    conduite_jour_minutes: number
    conduite_semaine_minutes: number
    conduite_14j_minutes: number
    repos_jour_minutes: number
    repos_semaine_minimum: number
    jours_consecutifs_travailles: number
  }> {
    const [
      journeeAujourd,
      conduiteWeek,
      conduite14j,
      reposMin,
      history7j,
    ] = await Promise.all([
      this.journeeService.getOrCreateJournee(conducteur_id, jusqu_a),
      this.journeeService.getConduiteTotal(conducteur_id, jusqu_a, 7),
      this.journeeService.getConduiteTotal(conducteur_id, jusqu_a, 14),
      this.journeeService.getReposHebdoMin(conducteur_id, jusqu_a, 1),
      this.journeeService.get7DayHistory(conducteur_id, jusqu_a),
    ])

    // Jours consécutifs
    let consecutifs = 0
    let cursor = new Date(jusqu_a)
    const workedDays = new Set(history7j.map((j: { jour: string }) => j.jour))
    workedDays.add(jusqu_a.toISOString().split('T')[0])

    for (let i = 0; i < 30; i++) {
      const day = cursor.toISOString().split('T')[0]
      if (workedDays.has(day)) {
        consecutifs++
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }

    return {
      conduite_jour_minutes: journeeAujourd?.minutes_conduite ?? 0,
      conduite_semaine_minutes: conduiteWeek,
      conduite_14j_minutes: conduite14j,
      repos_jour_minutes: journeeAujourd?.minutes_repos ?? 0,
      repos_semaine_minimum: reposMin,
      jours_consecutifs_travailles: consecutifs,
    }
  }

  /**
   * Enregistre une infraction (optionnel, pour trace)
   */
  async recordInfraction(input: {
    conducteur_id: string
    ot_id: string
    date_infraction: string
    code_infraction: string
    libelle_infraction: string
    type_infraction: string
    valeur_mesuree: number
    seuil_reglementaire: number
    severite: 'legere' | 'normale' | 'grave' | 'critique'
  }): Promise<boolean> {
    try {
      const db = this.supabase as any
      const { error } = await db
        .from('infraction_tachy')
        .insert({
          conducteur_id: input.conducteur_id,
          ot_id: input.ot_id,
          date_infraction: input.date_infraction,
          code_infraction: input.code_infraction,
          libelle_infraction: input.libelle_infraction,
          type_infraction: input.type_infraction,
          valeur_mesuree: input.valeur_mesuree,
          seuil_reglementaire: input.seuil_reglementaire,
          unite: 'minutes',
          severite: input.severite,
          etat: 'detectee',
        })

      return !error
    } catch {
      return false
    }
  }

  /**
   * Récupère les indisponibilités actives pour un conducteur
   */
  async getIndisponibilitesConducteur(conducteur_id: string, date: Date): Promise<Array<{
    id: string
    type_indisponibilite: string
    date_debut: string
    date_fin: string
  }>> {
    const db = this.supabase as any
    const { data, error } = await db
      .from('indisponibilite_planning')
      .select('id, type_indisponibilite, date_debut, date_fin')
      .eq('type_ressource', 'conducteur')
      .eq('ressource_id', conducteur_id)
      .lte('date_debut', date.toISOString())
      .gte('date_fin', date.toISOString())

    if (error) {
      console.error('Erreur indisponibilités:', error)
      return []
    }

    return (data as Array<{
      id: string
      type_indisponibilite: string
      date_debut: string
      date_fin: string
    }> | null) ?? []
  }
}

/**
 * Instance globale
 */
let complianceInstance: PlanningComplianceService | null = null

export function setPlanningComplianceService(service: PlanningComplianceService): void {
  complianceInstance = service
}

export function getPlanningComplianceService(): PlanningComplianceService | null {
  return complianceInstance
}
