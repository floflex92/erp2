/**
 * useAsyncData — hook générique de chargement de données pour tout l'ERP.
 *
 * Fonctionnalités :
 *   - États standardisés : loading / refreshing / success / error
 *   - Cache in-memory avec TTL configurable (évite les re-fetch inutiles)
 *   - Distinction premier chargement (skeleton) vs rafraîchissement (bandeau)
 *   - Nettoyage automatique (pas de setState sur composant démonté)
 *   - API simple, compatible avec le pattern existant useState/useEffect
 *
 * Usage minimal :
 *   const { data, loading, error, refresh } = useAsyncData(
 *     ['clients', tenantId],
 *     () => supabase.from('clients').select('*'),
 *   )
 *
 * Usage avec cache 2 min :
 *   const { data, loading } = useAsyncData(
 *     ['kpi-dirigeant'],
 *     fetchKpiData,
 *     { ttl: 120_000 }
 *   )
 *
 * Usage avec données initiales (affichage immédiat) :
 *   const { data, loading } = useAsyncData(
 *     ['vehicules'],
 *     fetchVehicules,
 *     { initialData: [] }
 *   )
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/* ─── Cache in-memory partagé entre tous les hooks ─────────────────────── */

interface CacheEntry<T> {
  data: T
  at: number
}

const _cache = new Map<string, CacheEntry<unknown>>()

function cacheGet<T>(key: string, ttl: number): T | undefined {
  const entry = _cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return undefined
  if (Date.now() - entry.at > ttl) {
    _cache.delete(key)
    return undefined
  }
  return entry.data
}

function cacheSet<T>(key: string, data: T): void {
  _cache.set(key, { data, at: Date.now() })
}

/** Invalider manuellement une entrée du cache (ex: après mutation) */
export function invalidateCache(keyOrPrefix: string) {
  for (const k of _cache.keys()) {
    if (k.startsWith(keyOrPrefix)) _cache.delete(k)
  }
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

export type AsyncDataStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'error'

export interface AsyncDataResult<T> {
  data: T | undefined
  status: AsyncDataStatus
  /** true uniquement au premier chargement sans données → afficher le skeleton */
  loading: boolean
  /** true lors d'un rechargement quand des données existent déjà */
  refreshing: boolean
  error: string | null
  refresh: () => void
}

interface Options<T> {
  /** TTL du cache en millisecondes. 0 = pas de cache. Défaut: 0 */
  ttl?: number
  /** Données initiales (évite le skeleton si on a déjà quelque chose) */
  initialData?: T
  /** Ne pas lancer le fetch automatiquement */
  skip?: boolean
}

/* ─── Hook ──────────────────────────────────────────────────────────────── */

export function useAsyncData<T>(
  /** Clé de cache : tableau de valeurs sérialisables */
  key: (string | number | null | undefined)[],
  /** Fonction de fetch : doit retourner T ou lancer une erreur */
  fetcher: () => Promise<T>,
  options: Options<T> = {},
): AsyncDataResult<T> {
  const { ttl = 0, initialData, skip = false } = options
  const cacheKey = key.join('::')

  const [data, setData] = useState<T | undefined>(() => {
    if (ttl > 0) {
      const cached = cacheGet<T>(cacheKey, ttl)
      if (cached !== undefined) return cached
    }
    return initialData
  })
  const [status, setStatus] = useState<AsyncDataStatus>(() => {
    if (ttl > 0 && cacheGet<T>(cacheKey, ttl) !== undefined) return 'success'
    if (initialData !== undefined) return 'success'
    return 'idle'
  })
  const [error, setError] = useState<string | null>(null)

  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const run = useCallback(
    async (isRefresh = false) => {
      if (skip) return

      // Si on a des données en cache valides, ne pas refetch
      if (ttl > 0) {
        const cached = cacheGet<T>(cacheKey, ttl)
        if (cached !== undefined) {
          if (!mountedRef.current) return
          setData(cached)
          setStatus('success')
          return
        }
      }

      // Passer en mode loading ou refreshing selon si des données existent
      if (!mountedRef.current) return
      setStatus(isRefresh || data !== undefined ? 'refreshing' : 'loading')
      setError(null)

      try {
        const result = await fetcher()
        if (!mountedRef.current) return
        if (ttl > 0) cacheSet(cacheKey, result)
        setData(result)
        setStatus('success')
      } catch (err) {
        if (!mountedRef.current) return
        setError(err instanceof Error ? err.message : 'Erreur de chargement.')
        setStatus('error')
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey, ttl, skip],
  )

  // Relancer quand la clé change
  useEffect(() => {
    void run(false)
  }, [run])

  const refresh = useCallback(() => void run(true), [run])

  return {
    data,
    status,
    loading: status === 'loading',
    refreshing: status === 'refreshing',
    error,
    refresh,
  }
}
