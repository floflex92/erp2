import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchToutesAlertes, type AlertesResult } from '@/lib/alertesTransport'

const POLL_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const EMPTY: AlertesResult = {
  alertes: [],
  totalCritiques: 0,
  totalWarnings: 0,
  totalInfos: 0,
  total: 0,
}

export function useAlertesTransport() {
  const [result, setResult]   = useState<AlertesResult>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const timerRef              = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchToutesAlertes()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    timerRef.current = setInterval(() => void load(true), POLL_INTERVAL_MS)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [load])

  return {
    ...result,
    loading,
    error,
    refresh: () => void load(),
  }
}
