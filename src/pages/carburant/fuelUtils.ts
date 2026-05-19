import type { Role } from '@/lib/auth'

export type NoticeType = 'success' | 'error'

export function formatFuelError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'inconnue'

  if (/duplicate key value/i.test(raw) && /carburant_cuves/i.test(raw) && /numero_cuve/i.test(raw)) {
    return 'Ce numero de cuve existe deja.'
  }
  if (/violates foreign key constraint/i.test(raw)) {
    return 'Reference invalide: verifie le vehicule, la cuve ou le conducteur selectionne.'
  }
  if (/invalid input syntax/i.test(raw)) {
    return 'Format de donnee invalide. Verifie les champs saisis.'
  }

  return `Erreur: ${raw}`
}

export function isPositiveNumber(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

export function isNonNegativeNumber(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export function isValidDriverIdentifier4d(value: string): boolean {
  return /^\d{4}$/.test(value)
}

export function isValidTvaRate(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100
}

export function computeCommandeTotals(quantiteLitres: number, priceUnitHt: number, tauxTva: number): {
  montantHt: number
  montantTva: number
  montantTtc: number
} {
  const montantHt = quantiteLitres * priceUnitHt
  const montantTva = montantHt * (tauxTva / 100)
  const montantTtc = montantHt + montantTva

  return { montantHt, montantTva, montantTtc }
}

export function canManageFuelByRole(role: Role | null): boolean {
  return role !== null && new Set<Role>(['admin', 'super_admin', 'dirigeant', 'exploitant', 'flotte']).has(role)
}
