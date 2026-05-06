/**
 * usePlanningRelais — gestion complète des relais de transport
 *
 * Extrait de Planning.tsx (Phase 2 — refactorisation God Component).
 * Encapsule : état, chargement API, ouverture modale, soumission dépôt/affectation.
 */
import { useState, useCallback } from 'react'
import type {
  OT, ContextMenu, RelaisModal, RelaisDepotForm, RelaisAssignForm,
  TransportRelaisRecord, TransportRelaisStatut, TypeRelais, BottomDockTab,
} from '@/pages/planning/planningTypes'

export interface UsePlanningRelaisDeps {
  ensureWriteAllowed: (action: string) => boolean
  pushPlanningNotice: (msg: string, type?: 'success' | 'error') => void
  setBottomDockTab: (tab: BottomDockTab) => void
  setContextMenu: (menu: ContextMenu) => void
}

export function usePlanningRelais({
  ensureWriteAllowed,
  pushPlanningNotice,
  setBottomDockTab,
  setContextMenu,
}: UsePlanningRelaisDeps) {
  const [relaisList,       setRelaisList]       = useState<TransportRelaisRecord[]>([])
  const [relaisLoading,    setRelaisLoading]    = useState(false)
  const [relaisError,      setRelaisError]      = useState<string | null>(null)
  const [relaisModal,      setRelaisModal]      = useState<RelaisModal>({ mode: null, ot: null, relais: null })
  const [relaisDepotForm,  setRelaisDepotForm]  = useState<RelaisDepotForm>({
    type_relais: 'depot_marchandise',
    site_id: '',
    lieu_nom: '',
    lieu_adresse: '',
    date_depot: new Date().toISOString().slice(0, 16),
    conducteur_depose_id: '',
    vehicule_depose_id: '',
    remorque_depose_id: '',
    notes: '',
  })
  const [relaisAssignForm, setRelaisAssignForm] = useState<RelaisAssignForm>({
    conducteur_reprise_id: '',
    vehicule_reprise_id: '',
    remorque_reprise_id: '',
    date_reprise_prevue: '',
    notes: '',
  })
  const [relaisSaving,     setRelaisSaving]     = useState(false)
  const [relaisDepotSites, setRelaisDepotSites] = useState<
    { id: string; nom: string; ville: string | null; adresse: string }[]
  >([])

  // ── Chargement ──────────────────────────────────────────────────────────────

  const loadRelais = useCallback(async () => {
    setRelaisLoading(true)
    try {
      const res = await fetch('/.netlify/functions/v11-transport-relay')
      if (!res.ok) { setRelaisError('Erreur chargement relais.'); return }
      const body = await res.json() as { data?: TransportRelaisRecord[] }
      setRelaisList(body.data ?? [])
      setRelaisError(null)
    } catch {
      setRelaisError('Erreur reseau relais.')
    } finally {
      setRelaisLoading(false)
    }
  }, [])

  const loadRelaisDepotSites = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/v11-logistic-sites?est_depot_relais=true')
      if (!res.ok) return
      const body = await res.json() as {
        data?: { id: string; nom: string; ville: string | null; adresse: string }[]
      }
      setRelaisDepotSites(body.data ?? [])
    } catch { /* silencieux */ }
  }, [])

  // ── Ouverture modale ────────────────────────────────────────────────────────

  const openRelaisDepot = useCallback((ot: OT, type: TypeRelais = 'depot_marchandise') => {
    if (!ensureWriteAllowed('Depot relais')) return
    setRelaisDepotForm({
      type_relais: type,
      site_id: '',
      lieu_nom: '',
      lieu_adresse: '',
      date_depot: new Date().toISOString().slice(0, 16),
      conducteur_depose_id: ot.conducteur_id ?? '',
      vehicule_depose_id: ot.vehicule_id ?? '',
      remorque_depose_id: ot.remorque_id ?? '',
      notes: '',
    })
    void loadRelaisDepotSites()
    setRelaisModal({ mode: type === 'relais_conducteur' ? 'relais_conducteur' : 'depot', ot, relais: null })
    setContextMenu(null)
  }, [ensureWriteAllowed, loadRelaisDepotSites, setContextMenu])

  const openRelaisAssign = useCallback((relais: TransportRelaisRecord) => {
    setRelaisAssignForm({
      conducteur_reprise_id: '',
      vehicule_reprise_id: '',
      remorque_reprise_id: '',
      date_reprise_prevue: '',
      notes: '',
    })
    setRelaisModal({ mode: 'assign', ot: null, relais })
  }, [])

  // ── Soumissions ─────────────────────────────────────────────────────────────

  const submitRelaisDepot = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!relaisModal.ot) return
    const form = relaisDepotForm
    const lieuNom = form.site_id
      ? (relaisDepotSites.find(s => s.id === form.site_id)?.nom ?? form.lieu_nom.trim())
      : form.lieu_nom.trim()
    if (!lieuNom) return
    setRelaisSaving(true)
    try {
      const res = await fetch('/.netlify/functions/v11-transport-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ot_id: relaisModal.ot.id,
          type_relais: form.type_relais,
          site_id: form.site_id || null,
          lieu_nom: lieuNom,
          lieu_adresse: form.lieu_adresse.trim() || null,
          conducteur_depose_id: form.conducteur_depose_id || null,
          vehicule_depose_id: form.vehicule_depose_id || null,
          remorque_depose_id: form.remorque_depose_id || null,
          date_depot: form.date_depot || new Date().toISOString(),
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) { pushPlanningNotice('Erreur creation relais.', 'error'); return }
      setRelaisModal({ mode: null, ot: null, relais: null })
      void loadRelais()
      setBottomDockTab('relais')
    } catch {
      pushPlanningNotice('Erreur reseau.', 'error')
    } finally {
      setRelaisSaving(false)
    }
  }, [relaisModal, relaisDepotForm, relaisDepotSites, loadRelais, pushPlanningNotice, setBottomDockTab])

  const submitRelaisAssign = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!relaisModal.relais) return
    const form = relaisAssignForm
    setRelaisSaving(true)
    try {
      const res = await fetch(
        `/.netlify/functions/v11-transport-relay?relais_id=${relaisModal.relais.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conducteur_reprise_id: form.conducteur_reprise_id || null,
            vehicule_reprise_id:   form.vehicule_reprise_id   || null,
            remorque_reprise_id:   form.remorque_reprise_id   || null,
            date_reprise_prevue:   form.date_reprise_prevue   || null,
            notes:                 form.notes.trim()          || null,
          }),
        },
      )
      if (!res.ok) { pushPlanningNotice('Erreur affectation.', 'error'); return }
      setRelaisModal({ mode: null, ot: null, relais: null })
      void loadRelais()
    } catch {
      pushPlanningNotice('Erreur reseau.', 'error')
    } finally {
      setRelaisSaving(false)
    }
  }, [relaisModal, relaisAssignForm, loadRelais, pushPlanningNotice])

  const updateRelaisStatut = useCallback(async (relaisId: string, statut: TransportRelaisStatut) => {
    try {
      await fetch(`/.netlify/functions/v11-transport-relay?relais_id=${relaisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      void loadRelais()
    } catch { /* silencieux */ }
  }, [loadRelais])

  // ── API publique ─────────────────────────────────────────────────────────────

  return {
    relaisList,       setRelaisList,
    relaisLoading,
    relaisError,
    relaisModal,      setRelaisModal,
    relaisDepotForm,  setRelaisDepotForm,
    relaisAssignForm, setRelaisAssignForm,
    relaisSaving,
    relaisDepotSites,
    loadRelais,
    loadRelaisDepotSites,
    openRelaisDepot,
    openRelaisAssign,
    submitRelaisDepot,
    submitRelaisAssign,
    updateRelaisStatut,
  }
}
