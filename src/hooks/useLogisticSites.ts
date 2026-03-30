import { useCallback, useEffect, useState } from 'react'
import { createLogisticSite, listLogisticSites, type LogisticSite, type LogisticSiteInsert } from '@/lib/transportCourses'

export function useLogisticSites() {
  const [sites, setSites] = useState<LogisticSite[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listLogisticSites()
      setSites(rows)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement des sites logistiques.')
    } finally {
      setLoading(false)
    }
  }, [])

  const addSite = useCallback(async (payload: LogisticSiteInsert) => {
    const created = await createLogisticSite(payload)
    setSites(current => {
      const next = [created, ...current.filter(item => item.id !== created.id)]
      return next.sort((a, b) => a.nom.localeCompare(b.nom))
    })
    return created
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    sites,
    loading,
    error,
    reload,
    addSite,
  }
}
