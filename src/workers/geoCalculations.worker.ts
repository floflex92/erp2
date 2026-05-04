/**
 * Web Worker pour calculs géographiques (hors main thread)
 * Tâches: distance, interpolation de route, hash de mission
 */

interface GeoPoint {
  lat: number
  lng: number
}

interface InterpolateRouteMessage {
  type: 'interpolateRoute'
  id: string
  points: GeoPoint[]
  progress: number
}

interface DistanceMessage {
  type: 'distance'
  id: string
  a: GeoPoint
  b: GeoPoint
}

interface HashStringMessage {
  type: 'hashString'
  id: string
  value: string
}

type WorkerMessage = InterpolateRouteMessage | DistanceMessage | HashStringMessage

function geoDistance(a: GeoPoint, b: GeoPoint): number {
  const dx = a.lng - b.lng
  const dy = a.lat - b.lat
  return Math.sqrt(dx * dx + dy * dy)
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

function interpolateRoute(points: GeoPoint[], progress: number): GeoPoint {
  if (points.length === 0) return { lat: 46.6034, lng: 1.8883 }
  if (points.length === 1) return points[0]

  const segments = points.slice(0, -1).map((point, index) => ({
    start: point,
    end: points[index + 1],
    length: geoDistance(point, points[index + 1]),
  }))

  const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0)
  if (totalLength === 0) return points[0]

  let remaining = (Math.max(0, Math.min(100, progress)) / 100) * totalLength
  for (const segment of segments) {
    if (remaining <= segment.length) {
      const ratio = segment.length === 0 ? 0 : remaining / segment.length
      return {
        lat: segment.start.lat + (segment.end.lat - segment.start.lat) * ratio,
        lng: segment.start.lng + (segment.end.lng - segment.start.lng) * ratio,
      }
    }
    remaining -= segment.length
  }

  return points[points.length - 1]
}

self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data

  if (message.type === 'interpolateRoute') {
    const result = interpolateRoute(message.points, message.progress)
    self.postMessage({ id: message.id, result })
  } else if (message.type === 'distance') {
    const result = geoDistance(message.a, message.b)
    self.postMessage({ id: message.id, result })
  } else if (message.type === 'hashString') {
    const result = hashString(message.value)
    self.postMessage({ id: message.id, result })
  }
})
