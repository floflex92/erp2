/**
 * usePlanningAssign — gestion de la modale d'affectation (assignation d'un OT)
 *
 * Extrait de Planning.tsx (Phase 2 — refactorisation God Component).
 * Encapsule : état de la modale, openAssign, saveAssign (avec compliance CE 561,
 * validation remorque, gestion groupage, écriture Supabase, historique).
 *
 * Les callbacks complexes (compliance, groupage…) sont passés par le composant
 * parent via un pattern ref-callback pour éviter les dépendances circulaires.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { supabase } from '@/lib/supabase'
import { logOtHistoryBatch } from '@/lib/otHistory'
import { validateTrailerAssignment } from '@/lib/trailerValidation'
import { TYPE_ABSENCE_LABELS, type AbsenceRh } from '@/lib/absencesRh'
import type { OT, Conducteur, Remorque, CustomBlock, AssignForm, Tab } from '@/pages/planning/planningTypes'
import {
  toDateTimeISO, isoToDate, isoToTime,
  getUpdateFailureReason, saveCustomBlocks,
} from '@/pages/planning/planningUtils'

// ── Types callbacks ───────────────────────────────────────────────────────────

export interface UsePlanningAssignDeps {
  tab: Tab
  conducteurs: Conducteur[]
  remorques: Remorque[]
  companyId: number | null
  blockOnCompliance: boolean
  blockImpossibleAssignments: boolean
  isMutatingRef: MutableRefObject<boolean>
  customBlocks: CustomBlock[]
  onCustomBlocksChange: (updater: (prev: CustomBlock[]) => CustomBlock[]) => void
  onLoadAll: () => void
  onNotice: (msg: string, type?: 'success' | 'error') => void
  onEnsureWriteAllowed: (label: string) => boolean
  onEnsureGroupageEditable: (ot: OT, label: string) => boolean
  onGetGroupageMembers: (ot: OT) => OT[]
  onBuildComplianceAudit: (input: {
    otId: string
    conducteurId: string | null
    startISO: string
    endISO: string
  }) => Promise<{ message: string; hasBlocking: boolean } | null>
  onGetConducteurAbsences: (conducteurId: string, dateDebut: string, dateFin: string) => AbsenceRh[]
  onCloseSelected: () => void
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePlanningAssign(deps: UsePlanningAssignDeps) {
  // Les callbacks passés en deps changent à chaque render dans Planning.tsx.
  // On les stocke en ref pour que saveAssign reste stable sans les lister
  // dans ses dépendances (pattern "latest-ref callback").
  const depsRef = useRef(deps)
  useEffect(() => { depsRef.current = deps })

  const [assignModal,        setAssignModal]        = useState<AssignForm | null>(null)
  const [assignKeepDuration, setAssignKeepDuration] = useState(true)
  const [assignSaving,       setAssignSaving]       = useState(false)

  // ── Ouverture de la modale ─────────────────────────────────────────────────

  const openAssign = useCallback((
    ot: OT,
    resourceId?: string,
    dropDay?: string,
    dropTimeMin?: number,
    applyToGroupage = false,
  ) => {
    const { tab, onCloseSelected } = depsRef.current
    const preC = tab === 'conducteurs' ? (resourceId ?? ot.conducteur_id ?? '') : (ot.conducteur_id ?? '')
    const preV = tab === 'camions'     ? (resourceId ?? ot.vehicule_id   ?? '') : (ot.vehicule_id   ?? '')
    const preR = tab === 'remorques'   ? (resourceId ?? ot.remorque_id   ?? '') : (ot.remorque_id   ?? '')
    const baseDate = dropDay ?? isoToDate(ot.date_chargement_prevue)
    const baseTime = dropTimeMin != null
      ? `${String(Math.floor(dropTimeMin / 60)).padStart(2, '0')}:${String(dropTimeMin % 60).padStart(2, '0')}`
      : isoToTime(ot.date_chargement_prevue)
    const endDate = dropDay ?? isoToDate(ot.date_livraison_prevue ?? ot.date_chargement_prevue)
    const endTime = isoToTime(ot.date_livraison_prevue)
    setAssignModal({
      ot, conducteur_id: preC, vehicule_id: preV, remorque_id: preR,
      date_chargement: baseDate, time_chargement: baseTime,
      date_livraison: endDate,  time_livraison: endTime,
      applyToGroupage,
    })
    onCloseSelected()
  }, []) // stable grâce au depsRef

  // ── Sauvegarde ────────────────────────────────────────────────────────────

  const saveAssign = useCallback(async () => {
    const {
      conducteurs, remorques, companyId,
      blockOnCompliance, blockImpossibleAssignments, isMutatingRef,
      onCustomBlocksChange, onLoadAll, onNotice,
      onEnsureWriteAllowed, onEnsureGroupageEditable, onGetGroupageMembers,
      onBuildComplianceAudit, onGetConducteurAbsences,
    } = depsRef.current

    if (!assignModal) return
    if (!onEnsureWriteAllowed('Affectation')) return
    if (!onEnsureGroupageEditable(assignModal.ot, 'Affectation')) return

    // ── Vérification absence RH ────────────────────────────────────────────
    if (assignModal.conducteur_id) {
      const absConflicts = onGetConducteurAbsences(
        assignModal.conducteur_id,
        assignModal.date_chargement,
        assignModal.date_livraison,
      )
      if (absConflicts.length > 0) {
        const cName = conducteurs.find(c => c.id === assignModal.conducteur_id)
        const absLabel = absConflicts
          .map(a => `${TYPE_ABSENCE_LABELS[a.type_absence]} (${a.date_debut} – ${a.date_fin})`)
          .join(', ')
        onNotice(
          `Affectation bloquee: ${cName ? `${cName.prenom} ${cName.nom}` : 'ce conducteur'} est indisponible (${absLabel}).`,
          'error',
        )
        return
      }
    }

    const targets = assignModal.applyToGroupage
      ? onGetGroupageMembers(assignModal.ot)
      : [assignModal.ot]
    const otId = assignModal.ot.id

    setAssignSaving(true)
    isMutatingRef.current = true

    const plannedStartISO = toDateTimeISO(assignModal.date_chargement, assignModal.time_chargement)
    const plannedEndISO   = toDateTimeISO(assignModal.date_livraison,  assignModal.time_livraison)

    // ── Compliance CE 561 ─────────────────────────────────────────────────
    let lastAuditSummary: { message: string; hasBlocking: boolean } | null = null
    for (const target of targets) {
      const auditSummary = await onBuildComplianceAudit({
        otId:         target.id,
        conducteurId: assignModal.conducteur_id || null,
        startISO:     plannedStartISO,
        endISO:       plannedEndISO,
      })
      lastAuditSummary = auditSummary
      if (blockOnCompliance && auditSummary?.hasBlocking) {
        setAssignSaving(false)
        isMutatingRef.current = false
        const prefix = assignModal.applyToGroupage
          ? `Programmation du lot bloquee sur ${target.reference}.`
          : 'Affectation bloquee.'
        onNotice(`${prefix} ${auditSummary.message}`, 'error')
        return
      }
    }

    const updatePayload = {
      statut:                 'planifie',
      conducteur_id:          assignModal.conducteur_id || null,
      vehicule_id:            assignModal.vehicule_id   || null,
      remorque_id:            assignModal.remorque_id   || null,
      date_chargement_prevue: plannedStartISO,
      date_livraison_prevue:  plannedEndISO,
    }

    // ── Validation remorque ↔ chargement ───────────────────────────────────
    if (assignModal.remorque_id) {
      const rem = remorques.find(r => r.id === assignModal.remorque_id)
      if (rem) {
        const firstOt = targets[0]
        const otData = {
          type_chargement:     firstOt.type_chargement,
          poids_kg:            firstOt.poids_kg,
          tonnage:             firstOt.tonnage,
          volume_m3:           firstOt.volume_m3,
          longueur_m:          firstOt.longueur_m,
          hors_gabarit:        firstOt.hors_gabarit,
          temperature_dirigee: firstOt.temperature_dirigee,
          charge_indivisible:  firstOt.charge_indivisible,
        }
        const validation = validateTrailerAssignment(otData, rem)
        if (validation.status === 'blocked' && blockImpossibleAssignments) {
          setAssignSaving(false)
          isMutatingRef.current = false
          onNotice(
            `Affectation remorque BLOQUÉE : ${validation.errors.map(e => e.message).join(' | ')}`,
            'error',
          )
          return
        }
        if (validation.status === 'blocked' && !blockImpossibleAssignments) {
          onNotice(
            `Affectation normalement bloquee (mode permissif actif) : ${validation.errors.map(e => e.message).join(' | ')}`,
            'success',
          )
        }
        if (validation.status === 'warning') {
          const msg = validation.warnings.map(w => w.message).join('\n')
          const ok = window.confirm(`⚠ Avertissement remorque :\n\n${msg}\n\nContinuer malgré tout ?`)
          if (!ok) { setAssignSaving(false); isMutatingRef.current = false; return }
        }
      }
    }

    // ── Écriture Supabase ──────────────────────────────────────────────────
    const firstTry = assignModal.applyToGroupage
      ? await supabase.from('ordres_transport').update(updatePayload).in('id', targets.map(t => t.id))
      : await supabase.from('ordres_transport').update(updatePayload).eq('id', otId)

    if (firstTry.error) {
      // Fallback : certains schémas stockent les dates en DATE et non TIMESTAMP
      const fallbackPayload = {
        ...updatePayload,
        date_chargement_prevue: assignModal.date_chargement,
        date_livraison_prevue:  assignModal.date_livraison,
      }
      const fallbackTry = assignModal.applyToGroupage
        ? await supabase.from('ordres_transport').update(fallbackPayload).in('id', targets.map(t => t.id))
        : await supabase.from('ordres_transport').update(fallbackPayload).eq('id', otId)

      if (fallbackTry.error) {
        setAssignSaving(false)
        isMutatingRef.current = false
        onNotice(`Affectation impossible: ${getUpdateFailureReason(fallbackTry)}`, 'error')
        return
      }
    }

    // Nettoyer les blocs custom liés aux OT affectés
    onCustomBlocksChange(prev => {
      const targetIds = new Set(targets.map(t => t.id))
      const upd = prev.filter(b => !b.otId || !targetIds.has(b.otId))
      if (upd.length !== prev.length) saveCustomBlocks(upd)
      return upd
    })

    // Historique en fire-and-forget
    void logOtHistoryBatch(
      targets.map(t => t.id),
      {
        companyId: companyId ?? 1,
        action: 'affectation',
        nouveauStatut: 'planifie',
        details: {
          conducteur_id: assignModal.conducteur_id || null,
          vehicule_id:   assignModal.vehicule_id   || null,
          date_chargement: plannedStartISO,
          date_livraison:  plannedEndISO,
        },
      },
    )

    setAssignSaving(false)
    isMutatingRef.current = false
    setAssignModal(null)
    onLoadAll()
    onNotice(
      lastAuditSummary
        ? `${assignModal.applyToGroupage ? 'Lot programme.' : 'Affectation enregistree.'} ${lastAuditSummary.message}`
        : assignModal.applyToGroupage ? 'Lot programme.' : 'Affectation enregistree.',
      blockOnCompliance && lastAuditSummary?.hasBlocking ? 'error' : 'success',
    )
  }, [assignModal]) // stable grâce au depsRef

  // ── API publique ─────────────────────────────────────────────────────────────

  return {
    assignModal,        setAssignModal,
    assignKeepDuration, setAssignKeepDuration,
    assignSaving,
    openAssign,
    saveAssign,
  }
}
