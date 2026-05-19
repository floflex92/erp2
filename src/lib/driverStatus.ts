export function normalizeDriverStatus(status: string | null | undefined): string {
  const normalized = String(status ?? '').trim().toLowerCase()
  if (!normalized) return 'actif'
  if (['actif', 'active', 'enabled', 'enable', 'ok'].includes(normalized)) return 'actif'
  if (['inactif', 'inactive', 'disabled', 'archive', 'archived'].includes(normalized)) return 'inactif'
  if (['conge', 'congé'].includes(normalized)) return 'conge'
  if (['arret_maladie', 'arrêt_maladie', 'arret maladie', 'arrêt maladie'].includes(normalized)) return 'arret_maladie'
  return normalized
}

export function isActiveDriverStatus(status: string | null | undefined) {
  return normalizeDriverStatus(status) !== 'inactif'
}