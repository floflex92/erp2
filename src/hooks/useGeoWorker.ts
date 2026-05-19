import { useCallback, useEffect, useRef } from 'react'

interface GeoPoint {
  lat: number
  lng: number
}

let geoWorkerInstance: Worker | null = null

function getGeoWorker(): Worker {
  if (!geoWorkerInstance) {
    geoWorkerInstance = new Worker(new URL('@/workers/geoCalculations.worker.ts', import.meta.url), { type: 'module' })
  }
  return geoWorkerInstance
}

export function useGeoWorker() {
  const callbackMapRef = useRef<Map<string, (result: unknown) => void>>(new Map())
  const nextIdRef = useRef(0)

  useEffect(() => {
    const worker = getGeoWorker()
    const handleMessage = (event: MessageEvent<{ id: string; result: unknown }>) => {
      const callback = callbackMapRef.current.get(event.data.id)
      if (callback) {
        callback(event.data.result)
        callbackMapRef.current.delete(event.data.id)
      }
    }

    worker.addEventListener('message', handleMessage)
    return () => worker.removeEventListener('message', handleMessage)
  }, [])

  const interpolateRoute = useCallback((points: GeoPoint[], progress: number): Promise<GeoPoint> => {
    return new Promise(resolve => {
      const worker = getGeoWorker()
      const id = `route-${nextIdRef.current++}`
      callbackMapRef.current.set(id, (result: unknown) => {
        resolve(result as GeoPoint)
      })
      worker.postMessage({ type: 'interpolateRoute', id, points, progress })
    })
  }, [])

  const distance = useCallback((a: GeoPoint, b: GeoPoint): Promise<number> => {
    return new Promise(resolve => {
      const worker = getGeoWorker()
      const id = `distance-${nextIdRef.current++}`
      callbackMapRef.current.set(id, (result: unknown) => {
        resolve(result as number)
      })
      worker.postMessage({ type: 'distance', id, a, b })
    })
  }, [])

  const hashString = useCallback((value: string): Promise<number> => {
    return new Promise(resolve => {
      const worker = getGeoWorker()
      const id = `hash-${nextIdRef.current++}`
      callbackMapRef.current.set(id, (result: unknown) => {
        resolve(result as number)
      })
      worker.postMessage({ type: 'hashString', id, value })
    })
  }, [])

  return { interpolateRoute, distance, hashString }
}
