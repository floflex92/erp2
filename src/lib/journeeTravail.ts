/**
 * Module recalcul journée travail (agrégats conducteur/jour)
 * Consolidation des données tachygraphe + planning
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type JourneeTravail = {
  id?: string
  conducteur_id: string
  jour: string
  minutes_conduite: number
  minutes_travail: number
  minutes_repos: number
  nb_missions: number
  source?: string | null
  updated_at?: string | null
}

/**
 * Service de recalcul des journées travail
 */
export class JourneeTravailService {
  private supabase: SupabaseClient<Database>

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * Recalcule la journée travail pour un conducteur à une date donnée
   * - Agrège tachygraphe (conduite, travail, repos, disponibilité)
   * - Compte les missions affectées
   * - Met à jour journee_travail
   */
  async recalculerJournee(conducteur_id: string, jour: Date): Promise<JourneeTravail | null> {
    const jourISO = jour.toISOString().split('T')[0]
    const db = this.supabase as any

    // 1. Lire tachygraphe pour la journée
    const { data: tachy, error: tachyErr } = await db
      .from('tachygraphe_entrees')
      .select('type_activite, date_debut, date_fin, duree_minutes')
      .eq('conducteur_id', conducteur_id)
      .gte('date_debut', `${jourISO}T00:00:00`)
      .lt('date_debut', `${jourISO}T23:59:59`)

    if (tachyErr) throw tachyErr

    // 2. Calculer les minutes par type d'activité
    const minutes_conduite = this.sumActivityMinutes(tachy, 'conduite')
    const minutes_travail = this.sumActivityMinutes(tachy, ['conduite', 'travail', 'disponibilite', 'autre'])
    const minutes_repos = this.sumActivityMinutes(tachy, 'repos')

    // 3. Compter missions affectées
    const { data: ots, error: otErr } = await db
      .from('ordres_transport')
      .select('id')
      .eq('conducteur_id', conducteur_id)
      .neq('statut', 'annule')
      .or(
        `and(gte(date_chargement_prevue,${jourISO}T00:00:00),lte(date_chargement_prevue,${jourISO}T23:59:59)),and(gte(date_livraison_prevue,${jourISO}T00:00:00),lte(date_livraison_prevue,${jourISO}T23:59:59))`
      )

    if (otErr) throw otErr
    const nb_missions = ots?.length ?? 0

    // 4. Upsert journee_travail
    const { data, error: upsertErr } = await db
      .from('journee_travail')
      .upsert(
        {
          conducteur_id,
          jour: jourISO,
          minutes_conduite,
          minutes_travail,
          minutes_repos,
          nb_missions,
          source: 'tachygraphe',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'conducteur_id,jour' }
      )
      .select()
      .single()

    if (upsertErr) throw upsertErr
    return (data as JourneeTravail | null) ?? null
  }

  /**
   * Recalcule les journées travail pour une plage de dates
   */
  async recalculerPlage(
    conducteur_id: string,
    date_debut: Date,
    date_fin: Date
  ): Promise<JourneeTravail[]> {
    const results: JourneeTravail[] = []
    const cursor = new Date(date_debut)

    while (cursor <= date_fin) {
      const journee = await this.recalculerJournee(conducteur_id, cursor)
      if (journee) results.push(journee)
      cursor.setDate(cursor.getDate() + 1)
    }

    return results
  }

  /**
   * Récupère la journée travail actuelle (ou la crée si absent)
   */
  async getOrCreateJournee(conducteur_id: string, jour: Date): Promise<JourneeTravail> {
    const jourISO = jour.toISOString().split('T')[0]
    const db = this.supabase as any

    const { data: existing } = await db
      .from('journee_travail')
      .select('*')
      .eq('conducteur_id', conducteur_id)
      .eq('jour', jourISO)
      .single()

    if (existing) return existing

    // Créer une journée vide
    const { data: created, error } = await db
      .from('journee_travail')
      .insert({
        conducteur_id,
        jour: jourISO,
        minutes_conduite: 0,
        minutes_travail: 0,
        minutes_repos: 0,
        nb_missions: 0,
        source: 'planning',
      })
      .select()
      .single()

    if (error) throw error
    return created as JourneeTravail
  }

  /**
   * Calcule total minutes pour une activité ou liste d'activités
   */
  private sumActivityMinutes(
    rows: any[],
    types: string | string[]
  ): number {
    if (!Array.isArray(rows)) return 0

    const typesList = Array.isArray(types) ? types : [types]

    return rows
      .filter((row) => typesList.includes(row.type_activite))
      .reduce((sum, row) => {
        if (row.duree_minutes && typeof row.duree_minutes === 'number') {
          return sum + Math.max(0, row.duree_minutes)
        }
        if (row.date_debut && row.date_fin) {
          const start = new Date(row.date_debut).getTime()
          const end = new Date(row.date_fin).getTime()
          const diff = Math.max(0, (end - start) / 60000)
          return sum + Math.round(diff)
        }
        return sum
      }, 0)
  }

  /**
   * Récupère historique 7 jours (pour vérifications CE)
   */
  async get7DayHistory(conducteur_id: string, jusqu_a: Date): Promise<JourneeTravail[]> {
    const debut = new Date(jusqu_a)
    debut.setDate(debut.getDate() - 7)
    const debutISO = debut.toISOString().split('T')[0]
    const finISO = jusqu_a.toISOString().split('T')[0]

    const db = this.supabase as any
    const { data, error } = await db
      .from('journee_travail')
      .select('*')
      .eq('conducteur_id', conducteur_id)
      .gte('jour', debutISO)
      .lte('jour', finISO)
      .order('jour', { ascending: false })

    if (error) throw error
    return (data as JourneeTravail[] | null) ?? []
  }

  /**
   * Totalise conduite sur N jours glissants
   */
  async getConduiteTotal(
    conducteur_id: string,
    jusqu_a: Date,
    nb_jours: number
  ): Promise<number> {
    const debut = new Date(jusqu_a)
    debut.setDate(debut.getDate() - nb_jours + 1)
    const debutISO = debut.toISOString().split('T')[0]
    const finISO = jusqu_a.toISOString().split('T')[0]

    const db = this.supabase as any
    const { data, error } = await db
      .from('journee_travail')
      .select('minutes_conduite')
      .eq('conducteur_id', conducteur_id)
      .gte('jour', debutISO)
      .lte('jour', finISO)

    if (error) throw error
    return ((data as Array<{ minutes_conduite?: number }> | null) ?? [])
      .reduce((sum, row) => sum + (row.minutes_conduite || 0), 0)
  }

  /**
   * Totalise repos sur N semaines glissantes
   */
  async getReposHebdoMin(
    conducteur_id: string,
    jusqu_a: Date,
    nb_semaines: number = 1
  ): Promise<number> {
    const debut = new Date(jusqu_a)
    debut.setDate(debut.getDate() - nb_semaines * 7)
    const debutISO = debut.toISOString().split('T')[0]
    const finISO = jusqu_a.toISOString().split('T')[0]

    const db = this.supabase as any
    const { data, error } = await db
      .from('journee_travail')
      .select('minutes_repos')
      .eq('conducteur_id', conducteur_id)
      .gte('jour', debutISO)
      .lte('jour', finISO)

    if (error) throw error

    // Retourner minimum des semaines
    let minRepos = Infinity
    let currentWeekRepos = 0
    let lastMonday: Date | null = null

    const rows = (data as Array<{ minutes_repos?: number | null; jour?: string | null }> | null) ?? []
    for (const row of rows) {
      if (row.minutes_repos !== null && row.minutes_repos !== undefined) {
        currentWeekRepos += row.minutes_repos
      }

      const rowDate = new Date(row.jour || '')
      const rowMonday = this.getMonday(rowDate)

      if (lastMonday && rowMonday.getTime() !== lastMonday.getTime()) {
        minRepos = Math.min(minRepos, currentWeekRepos)
        currentWeekRepos = 0
      }

      lastMonday = rowMonday
    }

    if (currentWeekRepos > 0) {
      minRepos = Math.min(minRepos, currentWeekRepos)
    }

    return minRepos === Infinity ? 0 : minRepos
  }

  /**
   * Retourne date du lundi de la semaine
   */
  private getMonday(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.getFullYear(), d.getMonth(), diff)
  }
}

/**
 * Instance globale (usage dans composants)
 */
let serviceInstance: JourneeTravailService | null = null

export function setJourneeTravailService(service: JourneeTravailService): void {
  serviceInstance = service
}

export function getJourneeTravailService(): JourneeTravailService | null {
  return serviceInstance
}
