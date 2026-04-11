import { useCallback, useEffect, useState } from 'react'
import { looseSupabase } from '@/lib/supabaseLoose'

interface AppErrorLog {
  id: string
  created_at: string
  source: string
  error_type: string
  message: string
  stack_trace: string | null
  context: Record<string, unknown> | null
}

interface ApiLog {
  id: string
  created_at: string
  module_key: string
  provider_key: string | null
  status: string
  http_status: number | null
  latency_ms: number | null
  error_message: string | null
}

const ERROR_TYPE_LABELS: Record<string, string> = {
  unhandled_error: 'Erreur JS',
  unhandled_rejection: 'Promise rejetée',
  react_boundary: 'Rendu React',
  api_error: 'API 4xx',
  api_500: 'API 5xx',
}

const SOURCE_COLORS: Record<string, string> = {
  frontend: 'bg-blue-500/15 text-blue-400',
  netlify: 'bg-violet-500/15 text-violet-400',
}

const TYPE_COLORS: Record<string, string> = {
  unhandled_error: 'bg-red-500/15 text-red-400',
  unhandled_rejection: 'bg-orange-500/15 text-orange-400',
  react_boundary: 'bg-amber-500/15 text-amber-400',
  api_error: 'bg-slate-500/15 text-slate-400',
  api_500: 'bg-red-500/15 text-red-400',
}

function fmtDt(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(iso))
}

export function ObservabilitePanel() {
  const [errors, setErrors] = useState<AppErrorLog[]>([])
  const [apiErrors, setApiErrors] = useState<ApiLog[]>([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [filterSource, setFilterSource] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('7d')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'errors' | 'api'>('errors')

  const load = useCallback(async () => {
    setLoading(true)
    const since = new Date()
    if (filterPeriod === '24h') since.setHours(since.getHours() - 24)
    else if (filterPeriod === '7d') since.setDate(since.getDate() - 7)
    else since.setDate(since.getDate() - 30)

    let query = looseSupabase
      .from('app_error_logs')
      .select('id, created_at, source, error_type, message, stack_trace, context')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(200)

    if (filterSource !== 'all') query = query.eq('source', filterSource)
    if (filterType !== 'all') query = query.eq('error_type', filterType)

    const { data: errData } = await query
    setErrors((errData ?? []) as AppErrorLog[])

    const { data: apiData } = await looseSupabase
      .from('erp_v11_api_logs')
      .select('id, created_at, module_key, provider_key, status, http_status, latency_ms, error_message')
      .eq('status', 'error')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    setApiErrors((apiData ?? []) as ApiLog[])
    setLoading(false)
  }, [filterSource, filterType, filterPeriod])

  useEffect(() => { void load() }, [load])

  async function purgeOld() {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    const { error } = await looseSupabase
      .from('app_error_logs')
      .delete()
      .lt('created_at', cutoff.toISOString())
    if (!error) {
      setNotice('Entrées > 30 jours supprimées.')
      void load()
    }
  }

  const now = new Date()
  const h24 = new Date(now); h24.setHours(h24.getHours() - 24)
  const errors24h = errors.filter(e => new Date(e.created_at) >= h24).length
  const errorsTotal = errors.length

  const PERIODS = [{ id: '24h', label: '24h' }, { id: '7d', label: '7 jours' }, { id: '30d', label: '30 jours' }]
  const SOURCES = [{ id: 'all', label: 'Toutes' }, { id: 'frontend', label: 'Frontend' }, { id: 'netlify', label: 'Netlify' }]
  const TYPES = [
    { id: 'all', label: 'Tous' },
    { id: 'unhandled_error', label: 'Erreur JS' },
    { id: 'unhandled_rejection', label: 'Promise' },
    { id: 'react_boundary', label: 'React' },
    { id: 'api_error', label: 'API 4xx' },
    { id: 'api_500', label: 'API 5xx' },
  ]

  return (
    <div className="space-y-4">
      {notice && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          {notice}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Erreurs (24h)', value: errors24h, color: errors24h > 0 ? 'text-red-400' : 'text-emerald-400' },
          { label: `Erreurs (${filterPeriod})`, value: errorsTotal, color: errorsTotal > 10 ? 'text-amber-400' : '' },
          { label: 'Erreurs API', value: apiErrors.length, color: apiErrors.length > 0 ? 'text-orange-400' : 'text-emerald-400' },
          { label: 'Statut', value: errors24h === 0 ? '✓ OK' : '⚠ Actif', color: errors24h === 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <p className="text-[10px] uppercase tracking-[0.2em] nx-muted">{kpi.label}</p>
            <p className={`mt-1 text-2xl font-semibold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--border)' }}>
            {PERIODS.map(p => (
              <button key={p.id} type="button" onClick={() => setFilterPeriod(p.id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${filterPeriod === p.id ? 'bg-[color:var(--primary)] text-white' : 'nx-subtle'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--border)' }}>
            {SOURCES.map(s => (
              <button key={s.id} type="button" onClick={() => setFilterSource(s.id)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${filterSource === s.id ? 'bg-[color:var(--primary)] text-white' : 'nx-subtle'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-xl border p-1" style={{ borderColor: 'var(--border)' }}>
            {TYPES.map(t => (
              <button key={t.id} type="button" onClick={() => setFilterType(t.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${filterType === t.id ? 'bg-[color:var(--primary)] text-white' : 'nx-subtle'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => void purgeOld()}
          className="rounded-xl border px-3 py-1.5 text-xs nx-subtle hover:text-red-400" style={{ borderColor: 'var(--border)' }}>
          Purger &gt; 30j
        </button>
      </div>

      {/* Onglets */}
      <div className="flex items-center gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
        {[
          { id: 'errors' as const, label: `Erreurs applicatives (${errorsTotal})` },
          { id: 'api' as const, label: `Erreurs API providers (${apiErrors.length})` },
        ].map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === t.id ? 'border-[color:var(--primary)] text-[color:var(--primary)]' : 'border-transparent nx-subtle'}`}
            style={{ marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm nx-subtle">Chargement...</div>
      ) : (
        <>
          {activeTab === 'errors' && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              {errors.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-2xl opacity-20">✓</p>
                  <p className="mt-2 text-sm nx-subtle">Aucune erreur sur la période</p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {errors.map(e => (
                    <div key={e.id} className="px-5 py-3 hover:bg-white/2">
                      <div
                        className="flex cursor-pointer flex-wrap items-start gap-2"
                        onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                      >
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[e.source] ?? 'bg-slate-500/15 text-slate-400'}`}>{e.source}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[e.error_type] ?? 'bg-slate-500/15 text-slate-400'}`}>{ERROR_TYPE_LABELS[e.error_type] ?? e.error_type}</span>
                        <span className="flex-1 text-sm">{e.message}</span>
                        <span className="shrink-0 text-xs nx-subtle">{fmtDt(e.created_at)}</span>
                      </div>
                      {expanded === e.id && (
                        <div className="mt-3 space-y-2">
                          {e.context && Object.keys(e.context).length > 0 && (
                            <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide nx-muted">Contexte</p>
                              <pre className="whitespace-pre-wrap break-all font-mono text-xs nx-subtle">{JSON.stringify(e.context, null, 2)}</pre>
                            </div>
                          )}
                          {e.stack_trace && (
                            <div className="rounded-xl border px-3 py-2" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide nx-muted">Stack trace</p>
                              <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap break-all font-mono text-[10px] nx-subtle">{e.stack_trace}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'api' && (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              {apiErrors.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-2xl opacity-20">✓</p>
                  <p className="mt-2 text-sm nx-subtle">Aucune erreur API provider sur la période</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <tr>
                      {['Date', 'Module', 'Provider', 'HTTP', 'Latence', 'Message'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide nx-muted">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiErrors.map(log => (
                      <tr key={log.id} className="border-b hover:bg-white/2" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-2 text-xs nx-subtle whitespace-nowrap">{fmtDt(log.created_at)}</td>
                        <td className="px-4 py-2 text-xs font-medium">{log.module_key}</td>
                        <td className="px-4 py-2 text-xs nx-subtle">{log.provider_key ?? '—'}</td>
                        <td className="px-4 py-2">
                          {log.http_status ? (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${log.http_status >= 500 ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}>
                              {log.http_status}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2 text-xs nx-subtle">{log.latency_ms != null ? `${log.latency_ms} ms` : '—'}</td>
                        <td className="px-4 py-2 text-xs nx-subtle">{log.error_message ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
