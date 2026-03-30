import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface OTRow {
  id: string
  reference: string
  statut: string
  updated_at: string
  clients: { nom: string } | null
}

const STATUT_META: Record<string, { label: string; icon: string; color: string }> = {
  brouillon: { label: 'Brouillon cree', icon: '📝', color: 'text-slate-500' },
  confirme: { label: 'Confirme', icon: '✅', color: 'text-blue-700' },
  en_cours: { label: 'En route', icon: '🚛', color: 'text-blue-700' },
  livre: { label: 'Livre', icon: '📦', color: 'text-green-700' },
  facture: { label: 'Facture', icon: '🧾', color: 'text-slate-700' },
  annule: { label: 'Annule', icon: '❌', color: 'text-red-600' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "A l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `Il y a ${days} j`
}

export function WidgetActiviteRecente() {
  const [rows, setRows] = useState<OTRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('ordres_transport')
      .select('id, reference, statut, updated_at, clients(nom)')
      .order('updated_at', { ascending: false })
      .limit(15)
      .then(({ data }) => {
        setRows((data ?? []) as unknown as OTRow[])
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <p className="text-sm text-slate-500">Aucune activite recente</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {rows.map(ot => {
        const meta = STATUT_META[ot.statut] ?? { label: ot.statut, icon: '•', color: 'text-slate-500' }
        return (
          <div key={ot.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-slate-50">
            <span className="shrink-0 text-base">{meta.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-950">{ot.reference}</span>
                <span className={`text-xs ${meta.color}`}>{meta.label}</span>
              </div>
              <p className="truncate text-xs text-slate-500">{ot.clients?.nom ?? '-'}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-500">{timeAgo(ot.updated_at)}</span>
          </div>
        )
      })}
    </div>
  )
}
