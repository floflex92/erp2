import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  optimizeRoute,
  buildStopsFromOts,
  type OptimizationConstraints,
  type OptimizationResult,
  type OtInputForOptimization,
} from '@/lib/routeOptimizer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawOtRow {
  id: string
  reference: string
  type_transport: string | null
  poids_kg: number | null
  volume_m3: number | null
  temperature_requise: string | null
  groupage_id: string | null
  groupage_fige: boolean
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  clients: { nom: string } | null
  chargement_site: RawSite | null
  livraison_site: RawSite | null
}

interface RawSite {
  id: string
  nom: string
  adresse: string
  ville: string | null
  latitude: number | null
  longitude: number | null
  horaires_ouverture: string | null
}

export interface UseRouteOptimizerState {
  ots: RawOtRow[]
  result: OptimizationResult | null
  loading: boolean
  computing: boolean
  applying: boolean
  error: string | null
  loadOts: (conducteurId: string, date: string) => Promise<void>
  runOptimization: (constraints: OptimizationConstraints, departureTime?: string) => void
  applyOptimization: () => Promise<void>
  reset: () => void
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRouteOptimizer(): UseRouteOptimizerState {
  const [ots, setOts] = useState<RawOtRow[]>([])
  const [result, setResult] = useState<OptimizationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [computing, setComputing] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadOts = useCallback(async (conducteurId: string, date: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      // Fenêtre J-1 → J+1 pour capturer les chargements et livraisons du jour
      const dateStart = date
      const dateEnd = date

      const { data, error: queryError } = await supabase
        .from('ordres_transport')
        .select(`
          id, reference, type_transport,
          poids_kg, volume_m3, temperature_requise,
          groupage_id, groupage_fige,
          date_chargement_prevue, date_livraison_prevue,
          clients!client_id ( nom ),
          chargement_site:sites_logistiques!chargement_site_id (
            id, nom, adresse, ville, latitude, longitude, horaires_ouverture
          ),
          livraison_site:sites_logistiques!livraison_site_id (
            id, nom, adresse, ville, latitude, longitude, horaires_ouverture
          )
        `)
        .eq('conducteur_id', conducteurId)
        .or(
          `date_chargement_prevue.eq.${dateStart},date_livraison_prevue.eq.${dateEnd}`,
        )
        .not('statut_transport', 'in', '("annule","termine")')
        .order('date_chargement_prevue', { ascending: true })

      if (queryError) throw queryError
      setOts((data as unknown as RawOtRow[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des OT')
    } finally {
      setLoading(false)
    }
  }, [])

  const runOptimization = useCallback(
    (constraints: OptimizationConstraints, departureTime?: string) => {
      if (ots.length === 0) return
      setComputing(true)
      setError(null)
      try {
        const inputs: OtInputForOptimization[] = ots.map(ot => ({
          id: ot.id,
          reference: ot.reference,
          clientNom: ot.clients?.nom ?? null,
          typeTransport: ot.type_transport,
          poidsKg: ot.poids_kg,
          volumeM3: ot.volume_m3,
          temperatureRequise: ot.temperature_requise,
          groupageId: ot.groupage_id,
          groupageFige: ot.groupage_fige,
          dateLivraisonPrevue: ot.date_livraison_prevue,
          chargementSite: ot.chargement_site
            ? {
                nom: ot.chargement_site.nom,
                adresse: ot.chargement_site.adresse,
                ville: ot.chargement_site.ville,
                latitude: ot.chargement_site.latitude,
                longitude: ot.chargement_site.longitude,
                horairesOuverture: ot.chargement_site.horaires_ouverture,
              }
            : null,
          livraisonSite: ot.livraison_site
            ? {
                nom: ot.livraison_site.nom,
                adresse: ot.livraison_site.adresse,
                ville: ot.livraison_site.ville,
                latitude: ot.livraison_site.latitude,
                longitude: ot.livraison_site.longitude,
                horairesOuverture: ot.livraison_site.horaires_ouverture,
              }
            : null,
        }))

        const stops = buildStopsFromOts(inputs)
        const optimized = optimizeRoute(stops, constraints, departureTime)
        setResult(optimized)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur de calcul')
      } finally {
        setComputing(false)
      }
    },
    [ots],
  )

  /**
   * Applique la séquence optimisée en mettant à jour les dates planifiées des OT.
   * Les heures sont espacées de la durée estimée entre chaque étape.
   */
  const applyOptimization = useCallback(async () => {
    if (!result || result.sequence.length === 0) return
    setApplying(true)
    setError(null)
    try {
      // Groupe les stops par OT, prend date de chargement du 1er chargement de chaque OT
      const otDateMap = new Map<
        string,
        { chargementDate: string | null; livraisonDate: string | null }
      >()

      // Référence de base : la date initiale du premier OT
      const baseOt = ots[0]
      const baseDate = baseOt?.date_chargement_prevue?.split('T')[0] ?? new Date().toISOString().split('T')[0]

      for (const stop of result.sequence) {
        if (!otDateMap.has(stop.otId)) {
          otDateMap.set(stop.otId, { chargementDate: null, livraisonDate: null })
        }
        const entry = otDateMap.get(stop.otId)!
        if (stop.type === 'chargement' && stop.estimatedArrival) {
          entry.chargementDate = `${baseDate}T${stop.estimatedArrival}:00`
        } else if (stop.type === 'livraison' && stop.estimatedArrival) {
          entry.livraisonDate = `${baseDate}T${stop.estimatedArrival}:00`
        }
      }

      // Appliquer les mises à jour en batch
      const updates = [...otDateMap.entries()]
        .filter(([, v]) => v.chargementDate || v.livraisonDate)
        .map(([otId, dates]) =>
          supabase
            .from('ordres_transport')
            .update({
              ...(dates.chargementDate ? { date_chargement_prevue: dates.chargementDate } : {}),
              ...(dates.livraisonDate ? { date_livraison_prevue: dates.livraisonDate } : {}),
            })
            .eq('id', otId),
        )

      const results = await Promise.all(updates)
      const firstError = results.find(r => r.error)?.error
      if (firstError) throw firstError
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'application')
    } finally {
      setApplying(false)
    }
  }, [result, ots])

  const reset = useCallback(() => {
    setOts([])
    setResult(null)
    setError(null)
  }, [])

  return {
    ots,
    result,
    loading,
    computing,
    applying,
    error,
    loadOts,
    runOptimization,
    applyOptimization,
    reset,
  }
}
