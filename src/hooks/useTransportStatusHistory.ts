import { useCallback, useState } from 'react'
import {
  listTransportStatusHistory,
  setCourseTransportStatus,
  type TransportStatus,
  type TransportStatusHistory,
} from '@/lib/transportCourses'

export function useTransportStatusHistory() {
  const [history, setHistory] = useState<TransportStatusHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (orderId: string) => {
    setLoading(true)
    try {
      const rows = await listTransportStatusHistory(orderId)
      setHistory(rows)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateStatus = useCallback(async (orderId: string, nextStatus: TransportStatus, commentaire?: string | null) => {
    setSaving(true)
    try {
      const updated = await setCourseTransportStatus(orderId, nextStatus, commentaire)
      const rows = await listTransportStatusHistory(orderId)
      setHistory(rows)
      return updated
    } finally {
      setSaving(false)
    }
  }, [])

  return {
    history,
    loading,
    saving,
    load,
    updateStatus,
  }
}
