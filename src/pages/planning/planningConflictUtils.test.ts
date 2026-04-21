import { describe, expect, it } from 'vitest'
import type { OT } from './planningTypes'
import {
  buildRowConflicts,
  findOverlapTargetInRow,
  getOtInterval,
} from './planningConflictUtils'

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

describe('planningConflictUtils intervals', () => {
  it('applique un minimum de 15 minutes quand la fin est avant le debut', () => {
    const ot = makeOt({
      date_chargement_prevue: '2026-04-20T10:00:00',
      date_livraison_prevue: '2026-04-20T09:00:00',
    })

    const interval = getOtInterval(ot)

    expect(interval.end - interval.start).toBe(15 * 60 * 1000)
  })
})

describe('planningConflictUtils overlap targeting', () => {
  it('trouve la premiere course en chevauchement hors de la selection deplacement', () => {
    const row = [
      makeOt({ id: 'a', reference: 'A', date_chargement_prevue: '2026-04-20T08:00:00', date_livraison_prevue: '2026-04-20T10:00:00' }),
      makeOt({ id: 'b', reference: 'B', date_chargement_prevue: '2026-04-20T10:30:00', date_livraison_prevue: '2026-04-20T12:00:00' }),
    ]

    const overlap = findOverlapTargetInRow(row, '2026-04-20T09:00:00', '2026-04-20T09:30:00', ['moving-id'])

    expect(overlap?.id).toBe('a')
  })

  it('ignore les OT en cours de deplacement', () => {
    const row = [
      makeOt({ id: 'a', reference: 'A', date_chargement_prevue: '2026-04-20T08:00:00', date_livraison_prevue: '2026-04-20T10:00:00' }),
    ]

    const overlap = findOverlapTargetInRow(row, '2026-04-20T08:30:00', '2026-04-20T09:30:00', ['a'])

    expect(overlap).toBeNull()
  })
})

describe('planningConflictUtils conflict pairs', () => {
  it('detecte les chevauchements entre OT non groupees', () => {
    const row = [
      makeOt({ id: 'a', reference: 'A', date_chargement_prevue: '2026-04-20T08:00:00', date_livraison_prevue: '2026-04-20T10:00:00' }),
      makeOt({ id: 'b', reference: 'B', date_chargement_prevue: '2026-04-20T09:30:00', date_livraison_prevue: '2026-04-20T11:00:00' }),
    ]

    const conflicts = buildRowConflicts(
      row,
      new Date('2026-04-20T00:00:00').getTime(),
      new Date('2026-04-20T23:59:59').getTime(),
    )

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].first.id).toBe('a')
    expect(conflicts[0].second.id).toBe('b')
    expect(conflicts[0].overlapMinutes).toBe(30)
  })

  it('ignore les chevauchements dans un meme groupage', () => {
    const row = [
      makeOt({ id: 'a', mission_id: 'm1', date_chargement_prevue: '2026-04-20T08:00:00', date_livraison_prevue: '2026-04-20T10:00:00' }),
      makeOt({ id: 'b', mission_id: 'm1', date_chargement_prevue: '2026-04-20T09:00:00', date_livraison_prevue: '2026-04-20T11:00:00' }),
    ]

    const conflicts = buildRowConflicts(
      row,
      new Date('2026-04-20T00:00:00').getTime(),
      new Date('2026-04-20T23:59:59').getTime(),
    )

    expect(conflicts).toHaveLength(0)
  })

  it('filtre les OT hors fenetre visible', () => {
    const row = [
      makeOt({ id: 'a', date_chargement_prevue: '2026-04-19T08:00:00', date_livraison_prevue: '2026-04-19T10:00:00' }),
      makeOt({ id: 'b', date_chargement_prevue: '2026-04-20T09:00:00', date_livraison_prevue: '2026-04-20T11:00:00' }),
    ]

    const conflicts = buildRowConflicts(
      row,
      new Date('2026-04-20T00:00:00').getTime(),
      new Date('2026-04-20T23:59:59').getTime(),
    )

    expect(conflicts).toHaveLength(0)
  })
})
