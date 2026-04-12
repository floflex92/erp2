import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { retryPayrollBonusAccounting } from '@/lib/payrollBonusBridge'

type LinkRow = {
  id: string
  profil_id: string | null
  period_key: string
  payroll_slip_id: string
  payroll_period_label: string
  compta_ecriture_id: string | null
  statut: 'pending' | 'linked' | 'accounting_failed'
  error_message: string | null
  updated_at: string
  created_at: string
  bonus_calculation_id: string
}

type BonusRow = {
  id: string
  total_calculated_bonus: number
  payment_reference: string | null
}

type Filter = 'all' | 'linked' | 'pending' | 'accounting_failed'

const btn = 'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors'

export default function PrimesRapprochementTab() {
  const [rows, setRows] = useState<LinkRow[]>([])
  const [bonusById, setBonusById] = useState<Record<string, BonusRow>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<Filter>('all')
  const [retryingSlipIds, setRetryingSlipIds] = useState<string[]>([])

  async function load() {
    setLoading(true)
    setError(null)
    setNotice(null)

    const { data, error: linksError } = await (supabase as any)
      .from('bonus_payroll_accounting_links')
      .select('id, profil_id, period_key, payroll_slip_id, payroll_period_label, compta_ecriture_id, statut, error_message, updated_at, created_at, bonus_calculation_id')
      .order('updated_at', { ascending: false })
      .limit(300)

    if (linksError) {
      setRows([])
      setBonusById({})
      setError(`Chargement rapprochement impossible: ${linksError.message}`)
      setLoading(false)
      return
    }

    const nextRows = (data as LinkRow[] | null) ?? []
    setRows(nextRows)

    const uniqueBonusIds = Array.from(new Set(nextRows.map(item => item.bonus_calculation_id)))
    if (uniqueBonusIds.length === 0) {
      setBonusById({})
      setLoading(false)
      return
    }

    const { data: bonusRows, error: bonusError } = await (supabase as any)
      .from('bonus_calculations')
      .select('id, total_calculated_bonus, payment_reference')
      .in('id', uniqueBonusIds)

    if (bonusError) {
      setError(`Chargement montants bonus impossible: ${bonusError.message}`)
      setBonusById({})
      setLoading(false)
      return
    }

    const map: Record<string, BonusRow> = {}
    for (const row of (bonusRows as BonusRow[] | null) ?? []) {
      map[row.id] = row
    }
    setBonusById(map)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter(row => row.statut === statusFilter)
  }, [rows, statusFilter])

  const stats = useMemo(() => ({
    total: rows.length,
    linked: rows.filter(row => row.statut === 'linked').length,
    pending: rows.filter(row => row.statut === 'pending').length,
    failed: rows.filter(row => row.statut === 'accounting_failed').length,
  }), [rows])

  async function handleRetry(row: LinkRow) {
    if (retryingSlipIds.includes(row.payroll_slip_id)) return

    setRetryingSlipIds(current => [...current, row.payroll_slip_id])
    setError(null)
    setNotice(null)

    const result = await retryPayrollBonusAccounting(row.payroll_slip_id)
    if (result.status === 'linked') {
      setNotice(`Reprise OK pour le bulletin ${row.payroll_slip_id.slice(0, 12)}${result.accountingEntryId ? ` (OD ${result.accountingEntryId.slice(0, 12)})` : ''}.`)
    } else {
      setError(result.errorMessage ?? 'Reprise impossible.')
    }

    await load()
    setRetryingSlipIds(current => current.filter(id => id !== row.payroll_slip_id))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total liens" value={stats.total} tone="slate" />
        <StatCard label="Rapproches" value={stats.linked} tone="green" />
        <StatCard label="En attente" value={stats.pending} tone="amber" />
        <StatCard label="En echec" value={stats.failed} tone="red" />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'all', label: 'Tous' },
            { key: 'linked', label: 'Rapproches' },
            { key: 'pending', label: 'En attente' },
            { key: 'accounting_failed', label: 'Erreurs' },
          ] as const).map(item => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`${btn} ${statusFilter === item.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button onClick={() => void load()} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 text-slate-700 hover:bg-slate-100">
          Actualiser
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {notice && <div className="p-3 bg-emerald-50 text-emerald-700 rounded text-sm">{notice}</div>}

      {loading ? (
        <div className="text-center py-10 text-slate-400">Chargement...</div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Aucun rapprochement pour ce filtre.</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Periode', 'Bulletin', 'Bonus', 'OD', 'Statut', 'Maj', 'Details', 'Action'].map(header => (
                  <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => {
                const bonus = bonusById[row.bonus_calculation_id]
                return (
                  <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{row.payroll_period_label || row.period_key}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{row.payroll_slip_id.slice(0, 16)}</td>
                    <td className="px-3 py-2 text-slate-700">{bonus ? `${bonus.total_calculated_bonus.toFixed(2)} EUR` : '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{row.compta_ecriture_id ? row.compta_ecriture_id.slice(0, 12) : '—'}</td>
                    <td className="px-3 py-2">
                      <StatusPill status={row.statut} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(row.updated_at).toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {row.error_message ? row.error_message : bonus?.payment_reference ? `Ref: ${bonus.payment_reference}` : 'OK'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {(row.statut === 'accounting_failed' || row.statut === 'pending') ? (
                        <button
                          onClick={() => void handleRetry(row)}
                          disabled={retryingSlipIds.includes(row.payroll_slip_id)}
                          className="px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          {retryingSlipIds.includes(row.payroll_slip_id) ? 'Reprise...' : 'Reprendre'}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'green' | 'amber' | 'red' }) {
  const toneClass =
    tone === 'green'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : tone === 'amber'
        ? 'bg-amber-50 border-amber-200 text-amber-700'
        : tone === 'red'
          ? 'bg-rose-50 border-rose-200 text-rose-700'
          : 'bg-slate-50 border-slate-200 text-slate-700'

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: LinkRow['statut'] }) {
  const cls =
    status === 'linked'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700'

  const label = status === 'linked' ? 'Rapproche' : status === 'pending' ? 'En attente' : 'Echec'
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
}
