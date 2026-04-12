/**
 * Hook personnalisé pour utiliser la compliance planning
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  PlanningComplianceService,
  getPlanningComplianceService,
  setPlanningComplianceService,
} from '@/lib/planningCompliance'
import type { AssignmentResult } from '@/lib/planningCompliance'

/**
 * Hook pour accéder au service de compliance planning
 */
export function usePlanningCompliance() {
  const [service, setService] = useState<PlanningComplianceService | null>(() => {
    return getPlanningComplianceService()
  })

  useEffect(() => {
    if (!service) {
      const newService = new PlanningComplianceService(supabase)
      setPlanningComplianceService(newService)
      setService(newService)
    }
  }, [service])

  return service
}

/**
 * Hook pour valider et assigner une mission (avec UI)
 */
export function useValidateAndAssign() {
  const service = usePlanningCompliance()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateAndAssign = useCallback(
    async (input: {
      ot_id: string
      conducteur_id: string | null
      start_iso: string
      end_iso: string
      force?: boolean
    }): Promise<AssignmentResult | null> => {
      if (!service) return null

      setLoading(true)
      setError(null)

      try {
        const result = await service.validateAndAssignMission({
          ...input,
          force: input.force ?? false,
        })
        return result
      } catch (err: any) {
        const message = err?.message ?? 'Erreur assignment'
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },[service]
  )

  return { validateAndAssign, loading, error }
}

/**
 * Hook pour pré-valider un drop over (before drop)
 */
export function usePrevalidateDropOver() {
  const service = usePlanningCompliance()

  const prevalidate = useCallback(
    async (input: {
      ot_id: string
      conducteur_id: string | null
      start_iso: string
      end_iso: string
    }) => {
      if (!service) {
        return { allowed: true, warning_count: 0, error_count: 0 }
      }

      try {
        return await service.preValidateDropOver(input)
      } catch {
        return { allowed: true, warning_count: 0, error_count: 0 }
      }
    },
    [service]
  )

  return prevalidate
}

/**
 * Hook pour les compteurs CE en temps réel
 */
export function useCECounters(conducteurId: string | null, date: Date) {
  const service = usePlanningCompliance()
  const [counters, setCounters] = useState({
    conduite_jour_minutes: 0,
    conduite_semaine_minutes: 0,
    conduite_14j_minutes: 0,
    repos_jour_minutes: 0,
    repos_semaine_minimum: 0,
    jours_consecutifs_travailles: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conducteurId || !service) {
      setCounters({
        conduite_jour_minutes: 0,
        conduite_semaine_minutes: 0,
        conduite_14j_minutes: 0,
        repos_jour_minutes: 0,
        repos_semaine_minimum: 0,
        jours_consecutifs_travailles: 0,
      })
      return
    }

    setLoading(true)
    service
      .getCompteursCE(conducteurId, date)
      .then(setCounters)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [conducteurId, date, service])

  return { counters, loading }
}

/**
 * Hook pour les indisponibilités du conducteur
 */
export function useConducteurIndisponibilites(conducteurId: string | null, date: Date) {
  const service = usePlanningCompliance()
  const [indisponibilites, setIndisponibilites] = useState<Array<{
    id: string
    type_indisponibilite: string
    date_debut: string
    date_fin: string
  }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!conducteurId || !service) {
      setIndisponibilites([])
      return
    }

    setLoading(true)
    service
      .getIndisponibilitesConducteur(conducteurId, date)
      .then(setIndisponibilites)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [conducteurId, date, service])

  return { indisponibilites, loading }
}
