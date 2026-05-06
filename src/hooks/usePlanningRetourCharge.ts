/**
 * usePlanningRetourCharge — recherche retour en charge (IA + fallback local)
 *
 * Extrait de Planning.tsx (Phase 2 — refactorisation God Component).
 * Encapsule : état du formulaire, suggestions, appel IA distant, fallback heuristique.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { ST_TERMINE } from '@/lib/transportCourses'
import type { OT, RetourChargeForm, RetourChargeSuggestion } from '@/pages/planning/planningTypes'

// Utilitaire pur — entier borné
function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export interface UsePlanningRetourChargeDeps {
  pool: OT[]
  ganttOTs: OT[]
  pushPlanningNotice: (msg: string, type?: 'success' | 'error') => void
}

export function usePlanningRetourCharge({ pool, ganttOTs, pushPlanningNotice }: UsePlanningRetourChargeDeps) {
  const [retourChargeForm, setRetourChargeForm] = useState<RetourChargeForm>({
    vehicule_id: '',
    date_debut: '',
    date_fin: '',
    retour_depot_avant: '',
    rayon_km: 200,
  })
  const [retourChargeSuggestions,  setRetourChargeSuggestions]  = useState<RetourChargeSuggestion[]>([])
  const [retourChargeLoading,      setRetourChargeLoading]      = useState(false)
  const [retourChargeError,        setRetourChargeError]        = useState<string | null>(null)
  const [retourChargeIaConnected,  setRetourChargeIaConnected]  = useState(false)

  // Ref pour éviter une re-création de buildFallbackSuggestions à chaque render
  const poolRef     = useRef(pool)
  const ganttOTsRef = useRef(ganttOTs)
  useEffect(() => { poolRef.current = pool },     [pool])
  useEffect(() => { ganttOTsRef.current = ganttOTs }, [ganttOTs])

  // ── Fallback heuristique local ───────────────────────────────────────────────

  const buildFallbackRetourChargeSuggestions = useCallback((form: RetourChargeForm): RetourChargeSuggestion[] => {
    const startBoundary = new Date(`${form.date_debut}T00:00:00`).getTime()
    const endBoundary   = new Date(`${form.date_fin}T23:59:59`).getTime()
    if (!Number.isFinite(startBoundary) || !Number.isFinite(endBoundary)) return []

    const retourDepotLimitMs = form.retour_depot_avant
      ? new Date(form.retour_depot_avant).getTime()
      : null

    const allCandidates = [...poolRef.current, ...ganttOTsRef.current]
    const uniqueById = new Map<string, OT>()
    for (const ot of allCandidates) {
      if (!uniqueById.has(ot.id)) uniqueById.set(ot.id, ot)
    }

    const suggestions = Array.from(uniqueById.values())
      .filter(ot => {
        const transportStatus = (ot.statut_transport ?? '').trim().toLowerCase()
        const legacyStatus    = (ot.statut ?? '').trim().toLowerCase()
        const isTerminal = transportStatus === 'termine' || transportStatus === 'annule'
          || legacyStatus === 'livre' || legacyStatus === 'facture' || legacyStatus === 'annule'
        if (isTerminal) return false
        if (ot.vehicule_id && ot.vehicule_id !== form.vehicule_id) return false
        const pickupMs = new Date(ot.date_chargement_prevue ?? '').getTime()
        if (!Number.isFinite(pickupMs)) return false
        if (pickupMs < startBoundary || pickupMs > endBoundary) return false
        return true
      })
      .map<RetourChargeSuggestion | null>(ot => {
        const distanceKm = ot.distance_km && ot.distance_km > 0 ? ot.distance_km : 180
        const estimatedEmptyKm = clampInt(
          (distanceKm * 0.22) + ((ot.type_transport ?? '').toLowerCase().includes('groupage') ? 24 : 0),
          8,
          Math.max(20, form.rayon_km * 2),
        )
        if (estimatedEmptyKm > Math.max(form.rayon_km * 1.25, form.rayon_km + 35)) return null

        const revenue        = ot.prix_ht ?? 0
        const estimatedCost  = (distanceKm * 0.92) + (estimatedEmptyKm * 0.88)
        const grossMargin    = revenue - estimatedCost
        const distancePenalty = Math.max(0, estimatedEmptyKm - 45) * 0.18
        const marginScore    = clampInt(
          (grossMargin / Math.max(300, revenue || 700)) * 100 + 45 - distancePenalty,
          0, 100,
        )

        const pickupMs   = new Date(ot.date_chargement_prevue ?? '').getTime()
        const deliveryMs = new Date(ot.date_livraison_prevue ?? '').getTime()
        const loadedDurationMinutes = Number.isFinite(deliveryMs) && deliveryMs > pickupMs
          ? Math.max(60, Math.round((deliveryMs - pickupMs) / 60000))
          : clampInt((distanceKm / 62) * 60 + 55, 90, 720)
        const estimatedEmptyDurationHours = Math.round(((estimatedEmptyKm / 62) * 10)) / 10
        const predictedFinishMs = pickupMs + (loadedDurationMinutes * 60000)
          + Math.round(estimatedEmptyDurationHours * 3600000)
        const retourDepotOk = !retourDepotLimitMs || !Number.isFinite(retourDepotLimitMs)
          || predictedFinishMs <= retourDepotLimitMs
        const finalScore = clampInt(marginScore + (retourDepotOk ? 8 : -22), 0, 100)

        return {
          id: ot.id,
          reference: ot.reference,
          client_nom: ot.client_nom,
          date_chargement_prevue: ot.date_chargement_prevue,
          date_livraison_prevue:  ot.date_livraison_prevue,
          nature_marchandise: ot.nature_marchandise,
          prix_ht:            ot.prix_ht,
          distance_km:        ot.distance_km,
          dist_vide_km:       estimatedEmptyKm,
          score_rentabilite:  finalScore,
          duree_vide_estimee_h: estimatedEmptyDurationHours,
          retour_depot_ok:    retourDepotOk,
          explication_ia:     'Prediction locale optimisee (fallback hors connexion IA).',
          ia_provider:        'local-heuristique',
        }
      })
      .filter((item): item is RetourChargeSuggestion => Boolean(item))
      .sort((a, b) => b.score_rentabilite - a.score_rentabilite)
      .slice(0, 15)

    return suggestions
  }, []) // refs sont stables, pas de dépendances

  // ── Recherche principale (IA + fallback) ─────────────────────────────────────

  const searchRetourCharge = useCallback(async () => {
    const form = retourChargeForm
    setRetourChargeLoading(true)
    setRetourChargeError(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      const { data: lastOt } = await (supabase as any)
        .from('ordres_transport')
        .select('livraison_lat, livraison_lng')
        .eq('vehicule_id', form.vehicule_id)
        .in('statut_transport', ST_TERMINE)
        .order('date_livraison_prevue', { ascending: false })
        .limit(1)
        .maybeSingle()

      const posLat: number = (lastOt as { livraison_lat?: number | null } | null)?.livraison_lat ?? 48.8566
      const posLng: number = (lastOt as { livraison_lng?: number | null } | null)?.livraison_lng ?? 2.3522

      if (!token) throw new Error('Session absente pour le moteur IA distant.')

      const res = await fetch('/.netlify/functions/v11-ai-placement', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicule_id:        form.vehicule_id,
          position_lat:       posLat,
          position_lng:       posLng,
          date_debut:         form.date_debut,
          date_fin:           form.date_fin,
          retour_depot_avant: form.retour_depot_avant || undefined,
          rayon_km:           form.rayon_km,
          limit:              15,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)

      setRetourChargeSuggestions(json.suggestions ?? [])
      setRetourChargeIaConnected(true)
    } catch (err) {
      const fallbackSuggestions = buildFallbackRetourChargeSuggestions(form)
      setRetourChargeIaConnected(false)
      setRetourChargeSuggestions(fallbackSuggestions)

      if (fallbackSuggestions.length > 0) {
        setRetourChargeError(null)
        pushPlanningNotice('IA indisponible: predictions locales optimisees appliquees.')
      } else {
        const detail = err instanceof Error ? err.message : 'Erreur recherche.'
        setRetourChargeError(
          `IA indisponible. Mode local actif, mais aucune suggestion exploitable. (${detail})`,
        )
      }
    } finally {
      setRetourChargeLoading(false)
    }
  }, [retourChargeForm, buildFallbackRetourChargeSuggestions, pushPlanningNotice])

  // ── API publique ─────────────────────────────────────────────────────────────

  return {
    retourChargeForm,              setRetourChargeForm,
    retourChargeSuggestions,       setRetourChargeSuggestions,
    retourChargeLoading,
    retourChargeError,             setRetourChargeError,
    retourChargeIaConnected,       setRetourChargeIaConnected,
    searchRetourCharge,
    buildFallbackRetourChargeSuggestions,
  }
}
