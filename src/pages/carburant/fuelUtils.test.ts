import { describe, expect, it } from 'vitest'
import type { Role } from '@/lib/auth'
import {
  canManageFuelByRole,
  computeCommandeTotals,
  formatFuelError,
  isNonNegativeNumber,
  isPositiveNumber,
  isValidDriverIdentifier4d,
  isValidTvaRate,
} from './fuelUtils'

describe('fuelUtils validations', () => {
  it('valide correctement les nombres positifs et non-negatifs', () => {
    expect(isPositiveNumber(1)).toBe(true)
    expect(isPositiveNumber(0)).toBe(false)
    expect(isPositiveNumber(-1)).toBe(false)
    expect(isPositiveNumber(Number.NaN)).toBe(false)

    expect(isNonNegativeNumber(0)).toBe(true)
    expect(isNonNegativeNumber(2.5)).toBe(true)
    expect(isNonNegativeNumber(-0.1)).toBe(false)
  })

  it('valide un identifiant conducteur strictement sur 4 chiffres', () => {
    expect(isValidDriverIdentifier4d('1234')).toBe(true)
    expect(isValidDriverIdentifier4d('0123')).toBe(true)
    expect(isValidDriverIdentifier4d('123')).toBe(false)
    expect(isValidDriverIdentifier4d('12a4')).toBe(false)
    expect(isValidDriverIdentifier4d('12345')).toBe(false)
  })

  it('valide les bornes TVA [0, 100]', () => {
    expect(isValidTvaRate(0)).toBe(true)
    expect(isValidTvaRate(20)).toBe(true)
    expect(isValidTvaRate(100)).toBe(true)
    expect(isValidTvaRate(-1)).toBe(false)
    expect(isValidTvaRate(120)).toBe(false)
    expect(isValidTvaRate(Number.NaN)).toBe(false)
  })
})

describe('fuelUtils calcul commande', () => {
  it('calcule HT/TVA/TTC de maniere deterministe', () => {
    const { montantHt, montantTva, montantTtc } = computeCommandeTotals(1000, 1.5, 20)

    expect(montantHt).toBeCloseTo(1500, 6)
    expect(montantTva).toBeCloseTo(300, 6)
    expect(montantTtc).toBeCloseTo(1800, 6)
  })
})

describe('fuelUtils format erreurs', () => {
  it('mappe les erreurs SQL usuelles vers des messages metier', () => {
    const duplicateErr = new Error('duplicate key value violates unique constraint carburant_cuves_numero_cuve_key')
    expect(formatFuelError(duplicateErr)).toBe('Ce numero de cuve existe deja.')

    const fkErr = new Error('insert or update on table carburant_pleins violates foreign key constraint')
    expect(formatFuelError(fkErr)).toContain('Reference invalide')

    const syntaxErr = new Error('invalid input syntax for type uuid: "abc"')
    expect(formatFuelError(syntaxErr)).toContain('Format de donnee invalide')
  })

  it('retourne un message d erreur generique sinon', () => {
    expect(formatFuelError(new Error('boom'))).toBe('Erreur: boom')
    expect(formatFuelError('oops')).toBe('Erreur: inconnue')
  })
})

describe('fuelUtils permissions', () => {
  it('autorise uniquement les roles carburant management', () => {
    expect(canManageFuelByRole('dirigeant' as Role)).toBe(true)
    expect(canManageFuelByRole('exploitant' as Role)).toBe(true)
    expect(canManageFuelByRole('flotte' as Role)).toBe(true)
    expect(canManageFuelByRole('conducteur' as Role)).toBe(false)
    expect(canManageFuelByRole(null)).toBe(false)
  })
})
