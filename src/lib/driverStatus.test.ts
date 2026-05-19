import { describe, expect, it } from 'vitest'
import { isActiveDriverStatus, normalizeDriverStatus } from './driverStatus'

describe('driverStatus', () => {
  it('normalise les statuts connus des conducteurs', () => {
    expect(normalizeDriverStatus(null)).toBe('actif')
    expect(normalizeDriverStatus('ACTIVE')).toBe('actif')
    expect(normalizeDriverStatus('archived')).toBe('inactif')
    expect(normalizeDriverStatus('congé')).toBe('conge')
    expect(normalizeDriverStatus('arrêt maladie')).toBe('arret_maladie')
  })

  it('considere actifs les statuts operationnels non bloques', () => {
    expect(isActiveDriverStatus('actif')).toBe(true)
    expect(isActiveDriverStatus('conge')).toBe(true)
    expect(isActiveDriverStatus('inactive')).toBe(false)
  })
})