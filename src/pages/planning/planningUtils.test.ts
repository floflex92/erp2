import { describe, expect, it } from 'vitest'
import type { OT } from './planningTypes'
import {
  COMPLIANCE_BLOCK_KEY,
  COMPLIANCE_BLOCK_RULES_KEY,
  DEFAULT_BLOCKING_RULE_CODES,
  SHOW_AFF_ASSETS_KEY,
  SIMULATION_MODE_KEY,
  BOTTOM_DOCK_HEIGHT_KEY,
  getDayBlockMetrics,
  getWeekBlockMetrics,
  loadComplianceBlockMode,
  loadComplianceBlockingRules,
  loadNumberSetting,
  loadShowAffretementAssets,
  saveBooleanSetting,
  saveComplianceBlockMode,
  saveComplianceBlockingRules,
  saveNumberSetting,
  saveShowAffretementAssets,
  parseDay,
  resolveTransportTypeKey,
  toISO,
} from './planningUtils'

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

describe('planningUtils temporal metrics', () => {
  it('calcule les metriques semaine pour un OT visible', () => {
    const weekStart = parseDay('2026-04-20')
    const ot = makeOt({
      date_chargement_prevue: '2026-04-22T06:00:00',
      date_livraison_prevue: '2026-04-22T12:00:00',
    })

    const metrics = getWeekBlockMetrics(ot, weekStart)

    expect(metrics).not.toBeNull()
    expect(metrics!.leftPct).toBeGreaterThanOrEqual(0)
    expect(metrics!.widthPct).toBeGreaterThan(0)
  })

  it('retourne null quand un OT est hors de la semaine affichee', () => {
    const weekStart = parseDay('2026-04-20')
    const ot = makeOt({
      date_chargement_prevue: '2026-05-05T08:00:00',
      date_livraison_prevue: '2026-05-05T12:00:00',
    })

    expect(getWeekBlockMetrics(ot, weekStart)).toBeNull()
  })

  it('applique une largeur minimale sur un OT tres court', () => {
    const weekStart = parseDay('2026-04-20')
    const ot = makeOt({
      date_chargement_prevue: '2026-04-20T08:00:00',
      date_livraison_prevue: '2026-04-20T08:05:00',
    })

    const metrics = getWeekBlockMetrics(ot, weekStart)

    expect(metrics).not.toBeNull()
    // 30 minutes minimum sur 7 jours -> ~0.2976%
    expect(metrics!.widthPct).toBeGreaterThanOrEqual(0.29)
  })

  it('calcule les metriques jour pour un segment intra-jour', () => {
    const metrics = getDayBlockMetrics(
      '2026-04-20T08:00:00',
      '2026-04-20T12:00:00',
      '2026-04-20',
    )

    expect(metrics).not.toBeNull()
    expect(metrics!.leftPct).toBeCloseTo((8 * 60 / (24 * 60)) * 100, 3)
    expect(metrics!.widthPct).toBeCloseTo((4 * 60 / (24 * 60)) * 100, 3)
  })

  it('retourne null sur vue jour quand la course est hors jour selectionne', () => {
    const metrics = getDayBlockMetrics(
      '2026-04-19T08:00:00',
      '2026-04-19T09:00:00',
      '2026-04-20',
    )

    expect(metrics).toBeNull()
  })

  it('borne correctement un OT multi-jours sur la vue jour', () => {
    const metrics = getDayBlockMetrics(
      '2026-04-19T23:00:00',
      '2026-04-21T03:00:00',
      '2026-04-20',
    )

    expect(metrics).not.toBeNull()
    expect(metrics!.leftPct).toBe(0)
    expect(metrics!.widthPct).toBe(100)
  })
})

describe('planningUtils transport type resolution', () => {
  it('mappe les types canoniques vers eux-memes', () => {
    expect(resolveTransportTypeKey('complet')).toBe('complet')
    expect(resolveTransportTypeKey('groupage')).toBe('groupage')
    expect(resolveTransportTypeKey('express')).toBe('express')
    expect(resolveTransportTypeKey('partiel')).toBe('partiel')
    expect(resolveTransportTypeKey('messagerie')).toBe('messagerie')
    expect(resolveTransportTypeKey('frigorifique')).toBe('frigorifique')
    expect(resolveTransportTypeKey('vrac')).toBe('vrac')
    expect(resolveTransportTypeKey('conventionnel')).toBe('conventionnel')
  })

  it('normalise les aliases et variantes metier courants', () => {
    expect(resolveTransportTypeKey('FTL')).toBe('complet')
    expect(resolveTransportTypeKey('lot plein')).toBe('complet')
    expect(resolveTransportTypeKey('LTL')).toBe('partiel')
    expect(resolveTransportTypeKey('demi-lot')).toBe('partiel')
    expect(resolveTransportTypeKey('groupage palettes')).toBe('groupage')
    expect(resolveTransportTypeKey('messagerie colis')).toBe('messagerie')
    expect(resolveTransportTypeKey('temperature dirigee')).toBe('frigorifique')
    expect(resolveTransportTypeKey('reefer')).toBe('frigorifique')
    expect(resolveTransportTypeKey('vrac citerne')).toBe('vrac')
    expect(resolveTransportTypeKey('tautliner')).toBe('conventionnel')
  })

  it('respecte la priorite metier quand plusieurs mots sont presents', () => {
    expect(resolveTransportTypeKey('complet urgent')).toBe('complet')
    expect(resolveTransportTypeKey('groupage express')).toBe('groupage')
    expect(resolveTransportTypeKey('partiel urgent')).toBe('partiel')
  })

  it('retombe sur conventionnel pour les valeurs vides ou inconnues', () => {
    expect(resolveTransportTypeKey(null)).toBe('conventionnel')
    expect(resolveTransportTypeKey('')).toBe('conventionnel')
    expect(resolveTransportTypeKey('type-inconnu-xyz')).toBe('conventionnel')
  })
})

describe('planningUtils compliance defaults', () => {
  it('inclut les regles critiques CE561 en blocage par defaut', () => {
    const requiredCodes = [
      'PERMIS_EXPIRE',
      'FCO_EXPIREE',
      'CARTE_EXPIREE',
      'PAUSE_OBLIGATOIRE',
      'REPOS_INSUFFISANT',
    ]

    for (const code of requiredCodes) {
      expect(DEFAULT_BLOCKING_RULE_CODES.has(code)).toBe(true)
    }
  })

  it('parse et formatte une date locale stable', () => {
    const day = parseDay('2026-04-20')
    expect(toISO(day)).toBe('2026-04-20')
  })
})

describe('planningUtils settings persistence', () => {
  it('gere le mode blocage conformite en localStorage', () => {
    localStorage.removeItem(COMPLIANCE_BLOCK_KEY)
    expect(loadComplianceBlockMode()).toBe(false)

    saveComplianceBlockMode(true)
    expect(loadComplianceBlockMode()).toBe(true)

    saveComplianceBlockMode(false)
    expect(loadComplianceBlockMode()).toBe(false)
  })

  it('persiste et relit les regles de blocage CE561', () => {
    localStorage.removeItem(COMPLIANCE_BLOCK_RULES_KEY)
    expect(loadComplianceBlockingRules()).toEqual({})

    saveComplianceBlockingRules({ PAUSE_OBLIGATOIRE: true, REPOS_INSUFFISANT: false })
    expect(loadComplianceBlockingRules()).toEqual({
      PAUSE_OBLIGATOIRE: true,
      REPOS_INSUFFISANT: false,
    })
  })

  it('retourne un objet vide si les regles CE561 sont corrompues', () => {
    localStorage.setItem(COMPLIANCE_BLOCK_RULES_KEY, '{not-valid-json')
    expect(loadComplianceBlockingRules()).toEqual({})
  })

  it('gere le toggle de visibilite des actifs affretement', () => {
    localStorage.removeItem(SHOW_AFF_ASSETS_KEY)
    expect(loadShowAffretementAssets()).toBe(true)

    saveShowAffretementAssets(false)
    expect(loadShowAffretementAssets()).toBe(false)

    saveShowAffretementAssets(true)
    expect(loadShowAffretementAssets()).toBe(true)
  })

  it('gere les bools et numeriques de preferences planning', () => {
    localStorage.removeItem(SIMULATION_MODE_KEY)
    localStorage.removeItem(BOTTOM_DOCK_HEIGHT_KEY)

    expect(loadNumberSetting(BOTTOM_DOCK_HEIGHT_KEY, 300)).toBe(300)

    saveBooleanSetting(SIMULATION_MODE_KEY, true)
    expect(localStorage.getItem(SIMULATION_MODE_KEY)).toBe('1')

    saveNumberSetting(BOTTOM_DOCK_HEIGHT_KEY, 420)
    expect(loadNumberSetting(BOTTOM_DOCK_HEIGHT_KEY, 300)).toBe(420)

    localStorage.setItem(BOTTOM_DOCK_HEIGHT_KEY, 'not-a-number')
    expect(loadNumberSetting(BOTTOM_DOCK_HEIGHT_KEY, 300)).toBe(300)
  })
})
