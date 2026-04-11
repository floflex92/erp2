import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ST_BROUILLON, ST_CONFIRME, ST_PLANIFIE, ST_EN_COURS, TRANSPORT_STATUS_LABELS } from '@/lib/transportCourses'

interface TrackingOverviewData {
  enCours: number
  retards: number
  aujourdHui: number
  sansAffectation: number
}

interface FocusTransport {
  id: string
  reference: string
  statut: string
  statut_transport: string | null
  statut_operationnel: string | null
  date_livraison_prevue: string | null
}

function isToday(iso: string | null) {
  if (!iso) return false
  const date = new Date(iso)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
}

function statusLabel(value: string | null) {
  if (!value) return 'Non defini'
  const key = value as keyof typeof TRANSPORT_STATUS_LABELS
  return TRANSPORT_STATUS_LABELS[key] ?? value.replace(/_/g, ' ')
}

function etaLabel(value: string | null) {
  if (!value) return 'ETA non renseignee'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function WidgetTrackingOverview() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<TrackingOverviewData>({
    enCours: 0,
    retards: 0,
    aujourdHui: 0,
    sansAffectation: 0,
  })
  const [focusRows, setFocusRows] = useState<FocusTransport[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    async function load() {
      try {
        const nowIso = new Date().toISOString()

        const [inProgressRes, deliveriesRes, unassignedRes, focusRes] = await Promise.all([
          supabase
            .from('ordres_transport')
            .select('id, date_livraison_prevue')
            .in('statut_transport', ST_EN_COURS),
          supabase
            .from('ordres_transport')
            .select('id, date_livraison_prevue')
            .in('statut_transport', [...ST_EN_COURS, ...ST_CONFIRME]),
          supabase
            .from('ordres_transport')
            .select('id', { count: 'exact', head: true })
            .in('statut_transport', [...ST_BROUILLON, ...ST_CONFIRME])
            .or('conducteur_id.is.null,vehicule_id.is.null'),
          supabase
            .from('ordres_transport')
            .select('id, reference, statut, statut_transport, statut_operationnel, date_livraison_prevue')
            .in('statut_transport', [...ST_CONFIRME, ...ST_PLANIFIE, ...ST_EN_COURS])
            .order('date_livraison_prevue', { ascending: true, nullsFirst: false })
            .limit(6),
        ])

        const inProgressRows = inProgressRes.data ?? []
        const deliveriesRows = deliveriesRes.data ?? []
        const nextFocusRows = (focusRes.data ?? []) as FocusTransport[]

        setData({
          enCours: inProgressRows.length,
          retards: inProgressRows.filter(row => {
            const deliveryDate = row.date_livraison_prevue
            return typeof deliveryDate === 'string' && deliveryDate < nowIso
          }).length,
          aujourdHui: deliveriesRows.filter(row => isToday(row.date_livraison_prevue)).length,
          sansAffectation: unassignedRes.count ?? 0,
        })
        setFocusRows(nextFocusRows)
        setSelectedId(current => (current && nextFocusRows.some(item => item.id === current) ? current : nextFocusRows[0]?.id ?? ''))
      } catch {
        setData({
          enCours: 0,
          retards: 0,
          aujourdHui: 0,
          sansAffectation: 0,
        })
        setFocusRows([])
        setSelectedId('')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const selectedTransport = useMemo(
    () => focusRows.find(item => item.id === selectedId) ?? null,
    [focusRows, selectedId],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>Tracking overview</p>
        <Link to="/map-live?filter=all" className="text-xs font-semibold text-[color:var(--primary)] hover:underline">Ouvrir Map live</Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Missions en cours" value={data.enCours} tone="blue" />
        <MetricCard label="Retards" value={data.retards} tone={data.retards > 0 ? 'red' : 'green'} />
        <MetricCard label="Livraisons aujourd'hui" value={data.aujourdHui} tone="violet" />
        <MetricCard label="Sans affectation" value={data.sansAffectation} tone="amber" />
      </div>

      <div
        className="rounded-xl border px-3 py-3"
        style={{
          borderColor: 'color-mix(in srgb, var(--border) 70%, #8b5cf6)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--surface-soft) 80%, #f8fafc), color-mix(in srgb, var(--surface) 84%, #eef2ff))',
        }}
      >
        <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
          <span>Progression moyenne</span>
          <span>Chargement - Livraison</span>
        </div>
        <div className="relative h-8">
          <div className="absolute left-2 right-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-300/85" />
          <div className="absolute left-[14%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.18)]" />
          <div className="absolute left-[50%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-[color:var(--primary)] shadow-[0_0_0_4px_rgba(99,102,241,0.2)]" />
          <div className="absolute right-[14%] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.2)]" />
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>Lecture rapide des transports actifs.</p>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Suivre un transport en particulier</p>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{focusRows.length} dispo</span>
        </div>

        {focusRows.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Aucun transport actif a suivre actuellement.</p>
        ) : (
          <div className="space-y-2">
            <select
              value={selectedId}
              onChange={event => setSelectedId(event.target.value)}
              className="w-full rounded-lg border px-2.5 py-2 text-sm"
            >
              {focusRows.map(item => (
                <option key={item.id} value={item.id}>
                  {item.reference} - {statusLabel(item.statut_transport ?? item.statut)}
                </option>
              ))}
            </select>

            {selectedTransport && (
              <div className="rounded-lg border px-2.5 py-2 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)', color: 'var(--text-secondary)' }}>
                <p>
                  {selectedTransport.reference} - {statusLabel(selectedTransport.statut_operationnel ?? selectedTransport.statut_transport ?? selectedTransport.statut)}
                </p>
                <p className="mt-1">ETA: {etaLabel(selectedTransport.date_livraison_prevue)}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link to="/transports" className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50">
          Ordres transport
        </Link>
        {selectedTransport ? (
          <Link
            to={`/map-live?filter=all&ot=${encodeURIComponent(selectedTransport.id)}&ref=${encodeURIComponent(selectedTransport.reference)}`}
            className="rounded-lg px-3 py-2 text-center text-xs font-semibold text-white transition-opacity hover:opacity-95"
            style={{ background: 'var(--primary)' }}
          >
            Suivre ce transport
          </Link>
        ) : (
          <Link to="/map-live?filter=all" className="rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-black">
            Suivi carte
          </Link>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'red' | 'green' | 'amber' | 'violet' }) {
  const toneClass = tone === 'blue'
    ? 'bg-blue-600 text-white'
    : tone === 'red'
      ? 'bg-red-600 text-white'
      : tone === 'green'
        ? 'bg-emerald-600 text-white'
        : tone === 'amber'
          ? 'bg-amber-500 text-slate-900'
          : 'bg-violet-600 text-white'

  return (
    <div className="rounded-xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className={`mt-2 inline-flex min-w-9 items-center justify-center rounded-md px-2 py-1 text-sm font-semibold ${toneClass}`}>{value}</p>
    </div>
  )
}
