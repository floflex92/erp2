function parseBoolean(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function isLocalHost() {
  if (typeof window === 'undefined') return false
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}

export function isDemoDataEnabled() {
  const enabledByEnv = parseBoolean(import.meta.env.VITE_ENABLE_DEMO_DATA)
  return enabledByEnv && isLocalHost()
}
