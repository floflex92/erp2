import { describe, expect, it } from 'vitest'
import type { AssignForm, OT } from './planningTypes'
import {
  applyAssignDurationFromStart,
  formatAssignDurationLabel,
  getAssignScheduleMeta,
  parseAssignDateTime,
  shiftAssignStartKeepingDuration,
  toTimeHHmm,
  updateAssignStartKeepingDuration,
} from './planningAssignUtils'

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

function makeAssign(overrides: Partial<AssignForm> = {}): AssignForm {
  return {
    ot: makeOt(),
    conducteur_id: 'd1',
    vehicule_id: 'v1',
    remorque_id: 'r1',
    date_chargement: '2026-04-20',
    time_chargement: '08:00',
    date_livraison: '2026-04-20',
    time_livraison: '10:30',
    applyToGroupage: false,
    ...overrides,
  }
}

describe('planningAssignUtils datetime helpers', () => {
  it('parse correctement date+heure locale', () => {
    const parsed = parseAssignDateTime('2026-04-20', '09:45')
    expect(parsed).not.toBeNull()
    expect(toTimeHHmm(parsed!)).toBe('09:45')
  })

  it('retourne null si la date est vide', () => {
    expect(parseAssignDateTime('', '09:45')).toBeNull()
  })
})

describe('planningAssignUtils schedule meta and label', () => {
  it('calcule une duree valide', () => {
    const meta = getAssignScheduleMeta(makeAssign())
    expect(meta.durationMinutes).toBe(150)
    expect(meta.valid).toBe(true)
  })

  it('retourne invalide si fin avant debut', () => {
    const meta = getAssignScheduleMeta(makeAssign({ time_livraison: '07:00' }))
    expect(meta.durationMinutes).toBe(-60)
    expect(meta.valid).toBe(false)
  })

  it('formate les labels de duree', () => {
    expect(formatAssignDurationLabel(150)).toBe('2h 30')
    expect(formatAssignDurationLabel(120)).toBe('2h')
    expect(formatAssignDurationLabel(45)).toBe('45 min')
  })
})

describe('planningAssignUtils assignment updates', () => {
  it('decale la fin quand on modifie le debut avec conservation de duree', () => {
    const current = makeAssign()
    const next = updateAssignStartKeepingDuration(current, '2026-04-20', '09:00', true)

    expect(next.time_chargement).toBe('09:00')
    expect(next.time_livraison).toBe('11:30')
  })

  it('ne touche pas la fin si conservation de duree desactivee', () => {
    const current = makeAssign()
    const next = updateAssignStartKeepingDuration(current, '2026-04-20', '09:00', false)

    expect(next.time_chargement).toBe('09:00')
    expect(next.time_livraison).toBe('10:30')
  })

  it('decale debut+fin via shift en conservant la duree', () => {
    const current = makeAssign()
    const next = shiftAssignStartKeepingDuration(current, 30, true)

    expect(next.time_chargement).toBe('08:30')
    expect(next.time_livraison).toBe('11:00')
  })

  it('applique un preset de duree depuis le debut', () => {
    const current = makeAssign({ time_chargement: '06:00', time_livraison: '07:00' })
    const next = applyAssignDurationFromStart(current, 180)

    expect(next.time_chargement).toBe('06:00')
    expect(next.time_livraison).toBe('09:00')
  })

  it('ignore les presets invalides', () => {
    const current = makeAssign({ time_chargement: '06:00', time_livraison: '07:00' })
    const next = applyAssignDurationFromStart(current, 0)

    expect(next).toEqual(current)
  })
})
