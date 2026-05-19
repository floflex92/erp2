import { useCallback, useEffect, useState } from 'react'
import { createService, listServices } from '../queries'
import type { Service, ServiceHealth } from '../domain'

const DEFAULT_HEALTH: ServiceHealth = { ready: false, message: null }

export function useServices(companyId: number | null) {
  const [services, setServices] = useState<Service[]>([])
  const [health, setHealth] = useState<ServiceHealth>(DEFAULT_HEALTH)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const reload = useCallback(async () => {
    if (!companyId) {
      setServices([])
      setHealth({ ready: false, message: 'Company introuvable pour charger les services.' })
      return
    }

    setIsLoading(true)
    const result = await listServices(companyId)
    setServices(result.data)
    setHealth(result.health)
    setIsLoading(false)
  }, [companyId])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(async (input: { name: string; code: string; description?: string; color?: string | null }) => {
    if (!companyId) return { ok: false, error: 'Company introuvable.' }
    setIsSaving(true)
    const result = await createService({ company_id: companyId, ...input })
    if (!result.error) await reload()
    setIsSaving(false)
    return { ok: !result.error, error: result.error }
  }, [companyId, reload])

  return {
    services,
    health,
    isLoading,
    isSaving,
    reload,
    create: save,
  }
}
