import { describe, expect, it } from 'vitest'
import type { OT } from './planningTypes'
import { buildPlanningUrgences, type ConflictSummary } from './planningUrgenceUtils'

function makeOt(overrides: Partial<OT> = {}): OT {
  return {
    id: 'ot-1',
    reference: 'OT-REF-1',
    client_nom: 'Client Test',
    date_chargement_prevue: '2026-04-20T08:00:00',
    date_livraison_prevue: '2026-04-20T10:00:00',
    type_transport: 'complet',
    nature_marchandise: 'marchandise',
    statut: 'planifie',
    statut_transport: 'planifie',
    conducteur_id: null,
    vehicule_id: null,
    remorque_id: null,
    prix_ht: 100,
    statut_operationnel: null,
    distance_km: null,
    donneur_ordre_id: null,
    chargement_site_id: null,
    livraison_site_id: null,
    mission_id: null,
    groupage_fige: false,
    est_affretee: false,
    ...overrides,
  }
}

function fmt(minutes: number): string {
  return `${minutes} min`
}

describe('planningUrgenceUtils', () => {
  it('cree une urgence retard avec niveau critique apres 180 min', () => {
    const nowTs = new Date('2026-04-20T12:00:00').getTime()
    const gantt = [
      makeOt({
        id: 'late-1',
        reference: 'OT-LATE',
        statut: 'planifie',
        date_livraison_prevue: '2026-04-20T08:30:00',
      }),
    ]

    const urgences = buildPlanningUrgences({
      nowTs,
      ganttOTs: gantt,
      unresourced: [],
      conflicts: [],
      formatMinutes: fmt,
    })

    expect(urgences).toHaveLength(1)
    expect(urgences[0].source).toBe('retard')
    expect(urgences[0].level).toBe('critique')
  })

  it('cree une urgence non_affectee si depart dans 24h', () => {
    const nowTs = new Date('2026-04-20T08:00:00').getTime()
    const unresourced = [
      makeOt({
        id: 'u-1',
        reference: 'OT-U',
        date_chargement_prevue: '2026-04-20T10:00:00',
        date_livraison_prevue: '2026-04-20T13:00:00',
      }),
    ]

    const urgences = buildPlanningUrgences({
      nowTs,
      ganttOTs: [],
      unresourced,
      conflicts: [],
      formatMinutes: fmt,
    })

    expect(urgences).toHaveLength(1)
    expect(urgences[0].source).toBe('non_affectee')
    expect(urgences[0].level).toBe('critique')
  })

  it('ignore les non_affectees hors fenetre 24h', () => {
    const nowTs = new Date('2026-04-20T08:00:00').getTime()
    const unresourced = [
      makeOt({
        id: 'u-2',
        reference: 'OT-U2',
        date_chargement_prevue: '2026-04-22T10:00:00',
      }),
    ]

    const urgences = buildPlanningUrgences({
      nowTs,
      ganttOTs: [],
      unresourced,
      conflicts: [],
      formatMinutes: fmt,
    })

    expect(urgences).toHaveLength(0)
  })

  it('cree une urgence conflit avec niveau selon chevauchement cumule', () => {
    const nowTs = new Date('2026-04-20T08:00:00').getTime()
    const conflicts: ConflictSummary[] = [
      {
        rowId: 'r1',
        rowLabel: 'Camion 1',
        pairs: [{ overlapMinutes: 80 }, { overlapMinutes: 50 }],
      },
    ]

    const urgences = buildPlanningUrgences({
      nowTs,
      ganttOTs: [],
      unresourced: [],
      conflicts,
      formatMinutes: fmt,
    })

    expect(urgences).toHaveLength(1)
    expect(urgences[0].source).toBe('conflit')
    expect(urgences[0].level).toBe('critique')
  })

  it('trie les urgences par score desc et applique la limite', () => {
    const nowTs = new Date('2026-04-20T12:00:00').getTime()
    const urgences = buildPlanningUrgences({
      nowTs,
      ganttOTs: [
        makeOt({ id: 'late-a', reference: 'A', date_livraison_prevue: '2026-04-20T11:55:00' }),
        makeOt({ id: 'late-b', reference: 'B', date_livraison_prevue: '2026-04-20T00:00:00' }),
      ],
      unresourced: [],
      conflicts: [],
      formatMinutes: fmt,
      limit: 1,
    })

    expect(urgences).toHaveLength(1)
    expect(urgences[0].id).toBe('late-late-b')
  })
})
