import { supabase } from '@/lib/supabase'

type RoutingPoint = {
  latitude: number
  longitude: number
}

export type TruckRouteResult = {
  distanceKm: number
  durationMinutes: number
  provider: string | null
  source: string | null
}

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function computeTruckRoute(origin: RoutingPoint, destination: RoutingPoint): Promise<TruckRouteResult> {
  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token ?? null

  if (!accessToken) {
    throw new Error('Session invalide: reconnectez-vous pour calculer un itineraire.')
  }

  const response = await fetch('/.netlify/functions/v11-routing', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'x-tenant-key': 'default',
    },
    body: JSON.stringify({
      origin,
      destination,
      profile: 'driving-hgv',
      options: {
        profile: 'driving-hgv',
        preference: 'recommended',
      },
    }),
  })

  const payload = await response.json().catch(() => null) as Record<string, unknown> | null
  if (!response.ok || !payload) {
    const errorMessage = payload && typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`
    throw new Error(`Calcul d'itineraire impossible: ${errorMessage}`)
  }

  const data = payload.data && typeof payload.data === 'object'
    ? payload.data as Record<string, unknown>
    : null
  const routePlan = data?.RoutePlan && typeof data.RoutePlan === 'object'
    ? data.RoutePlan as Record<string, unknown>
    : null

  const distanceKm = toFiniteNumber(routePlan?.distance_km)
  const durationMinutes = toFiniteNumber(routePlan?.duration_minutes)

  if (distanceKm == null || durationMinutes == null) {
    throw new Error('Reponse itineraire incomplete (distance ou duree manquante).')
  }

  return {
    distanceKm,
    durationMinutes,
    provider: typeof data?.provider === 'string' ? data.provider : null,
    source: typeof payload.source === 'string' ? payload.source : null,
  }
}
