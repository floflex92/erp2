import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AlerteRow {
  id: string | null
  conducteur_id: string | null
  alert_type: string | null
  label: string | null
  days_remaining: number | null
  due_on: string | null
  conducteurs?: { nom: string | null; prenom: string | null } | null
}

function urgencyColor(days: number | null) {
  if (days === null) return { row: 'bg-slate-50', badge: 'nx-status-warning' }
  if (days <= 7) return { row: 'bg-red-50', badge: 'nx-status-error' }
  if (days <= 30) return { row: 'bg-amber-50', badge: 'nx-status-warning' }
  return { row: 'bg-slate-50', badge: 'nx-status-success' }
}

function daysLabel(days: number | null) {
  if (days === null) return '-'
  if (days <= 0) return 'Expire'
  if (days === 1) return 'Demain'
  return `J-${days}`
}

const ALERT_ICONS: Record<string, string> = {
  visite_medicale: '🏥',
  recyclage: '📋',
  permis: '🪪',
  carte_conducteur: '💳',
  fimo: '📄',
  fcos: '🔖',
}

export function WidgetAlertesChrono() {
  const [alertes, setAlertes] = useState<AlerteRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('vue_conducteur_alertes')
      .select('id, conducteur_id, alert_type, label, days_remaining, due_on')
      .order('days_remaining', { ascending: true, nullsFirst: false })
      .limit(25)
      .then(async ({ data }) => {
        const rows = (data ?? []) as AlerteRow[]
        const conducteurIds = [...new Set(rows.map(r => r.conducteur_id).filter(Boolean))] as string[]
        if (conducteurIds.length > 0) {
          const { data: conducteurs } = await supabase.from('conducteurs').select('id, nom, prenom').in('id', conducteurIds)
          const map = new Map((conducteurs ?? []).map(c => [c.id, c]))
          rows.forEach(r => {
            if (r.conducteur_id) r.conducteurs = map.get(r.conducteur_id) ?? null
          })
        }
        setAlertes(rows)
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

  if (alertes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="mb-2 text-3xl opacity-30">✅</div>
        <p className="text-sm text-slate-500">Aucune alerte active</p>
        <p className="mt-1 text-xs text-slate-500">Tous les documents sont a jour</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {alertes.map((a, i) => {
        const c = urgencyColor(a.days_remaining)
        const conducteurName = a.conducteurs ? [a.conducteurs.prenom, a.conducteurs.nom].filter(Boolean).join(' ') : 'Conducteur inconnu'
        const icon = ALERT_ICONS[a.alert_type ?? ''] ?? '⚠️'
        return (
          <div key={`${a.id}-${i}`} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${c.row}`}>
            <span className="shrink-0 text-lg">{icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-950">{conducteurName}</p>
              <p className="truncate text-xs text-slate-500">{a.label ?? a.alert_type ?? 'Alerte'}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.badge}`}>{daysLabel(a.days_remaining)}</span>
              {a.due_on && <p className="mt-1 text-[10px] text-slate-500">{new Date(a.due_on).toLocaleDateString('fr-FR')}</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
