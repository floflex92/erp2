import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ST_BROUILLON, ST_CONFIRME, TRANSPORT_STATUS_LABELS } from '@/lib/transportCourses'

interface OTRow {
  id: string
  reference: string
  statut_transport: string | null
  type_transport: string
  date_livraison_prevue: string | null
  date_chargement_prevue: string | null
  conducteur_id: string | null
  vehicule_id: string | null
  clients: { nom: string } | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  en_attente_validation: { label: 'En attente validation', color: 'nx-status-warning' },
  valide: { label: 'Validé', color: 'nx-status-success' },
}

const TYPE_LABELS: Record<string, string> = {
  complet: 'Complet',
  partiel: 'Partiel',
  express: 'Express',
  groupage: 'Groupage',
}

function dateFmt(iso: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function isLate(iso: string | null) {
  if (!iso) return false
  return new Date(iso) < new Date()
}

export function WidgetTransportsEnAttente() {
  const [rows, setRows] = useState<OTRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('ordres_transport')
      .select('id, reference, statut_transport, type_transport, date_livraison_prevue, date_chargement_prevue, conducteur_id, vehicule_id, clients(nom)')
      .in('statut_transport', [...ST_BROUILLON, ...ST_CONFIRME])
      .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
      .limit(20)
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
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <div className="mb-2 text-3xl opacity-20">OK</div>
        <p className="text-sm text-discreet">Aucun transport en attente</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {rows.map(ot => {
        const late = isLate(ot.date_livraison_prevue)
        const statusCfg = STATUS_LABELS[ot.statut_transport ?? ''] ?? { label: TRANSPORT_STATUS_LABELS[ot.statut_transport as never] ?? (ot.statut_transport ?? '—'), color: 'nx-status-warning' }
        const noDriver = !ot.conducteur_id
        const noVehicle = !ot.vehicule_id
        return (
          <div key={ot.id} className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-soft ${late ? 'border-l-2 border-red-500' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-mono font-semibold text-slate-950">{ot.reference}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                <span className="rounded-full border border-line bg-surface-soft px-2 py-0.5 text-[10px] text-secondary">
                  {TYPE_LABELS[ot.type_transport] ?? ot.type_transport}
                </span>
                {late && <span className="nx-status-error rounded-full px-2 py-0.5 text-[10px] font-medium">En retard</span>}
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-discreet">
                <span>{ot.clients?.nom ?? '-'}</span>
                <span>•</span>
                <span>Chargement : {dateFmt(ot.date_chargement_prevue)}</span>
                {late && <span className="text-red-600">Livraison : {dateFmt(ot.date_livraison_prevue)}</span>}
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5 text-[10px]">
              {noDriver && <span className="nx-status-warning rounded-full px-2 py-0.5 font-medium">Sans conducteur</span>}
              {noVehicle && <span className="nx-status-warning rounded-full px-2 py-0.5 font-medium">Sans vehicule</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
