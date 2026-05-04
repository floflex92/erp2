/**
 * Cache localStorage pour Map Live (ETA, tracking, AI insights)
 * TTL: 5-10s pour données en temps réel
 */

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const CACHE_PREFIX = 'map-live:'
const DEFAULT_TTL_MS = 6000 // 6 secondes

function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`
}

export function readMapLiveCache<T>(key: string): T | null {
  try {
    const cacheKey = getCacheKey(key)
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null

    const entry = JSON.parse(raw) as CacheEntry<T>
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(cacheKey)
      return null
    }

    return entry.value
  } catch {
    return null
  }
}

export function writeMapLiveCache<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  try {
    const cacheKey = getCacheKey(key)
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttlMs,
    }
    localStorage.setItem(cacheKey, JSON.stringify(entry))
  } catch {
    // Quota exceeded or localStorage unavailable; skip silently
  }
}

export function clearMapLiveCache(): void {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX))
    for (const key of keys) {
      localStorage.removeItem(key)
    }
  } catch {
    // Silently fail
  }
}

/**
 * Batch API calls avec debounce (max 1 appel par X ms)
 */
export function createBatchScheduler(batchFn: (ids: string[]) => Promise<void>, delayMs = 3000) {
  let pending = new Set<string>()
  let timer: number | null = null

  return {
    schedule(id: string) {
      pending.add(id)
      if (timer !== null) return

      timer = window.setTimeout(() => {
        const batch = Array.from(pending)
        pending.clear()
        timer = null
        void batchFn(batch)
      }, delayMs)
    },

    flush() {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      const batch = Array.from(pending)
      pending.clear()
      if (batch.length > 0) {
        void batchFn(batch)
      }
    },

    cancel() {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      pending.clear()
    },
  }
}
