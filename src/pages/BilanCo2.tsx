import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  computeOtCo2,
  computeClientCo2,
  exportCo2TransportCsv,
  exportCo2ClientCsv,
  formatCo2,
  CO2_FACTORS,
  type OtForCo2,
  type OtCo2Result,
  type Co2ClientSummary,
} from '@/lib/co2Transport'

type View = 'clients' | 'transports'

function fmtN(n: number, unit = '') {
  return `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}${unit}`
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

export default function BilanCo2() {
  const [ots, setOts] = useState<OtForCo2[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('clients')
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString())
  const [filterClient, setFilterClient] = useState('')

  async function load() {
    setLoading(true)
    const [otsRes, clientsRes] = await Promise.all([
      supabase
        .from('ordres_transport')
        .select('id, reference, client_id, type_transport, distance_km, poids_kg, date_chargement_prevue')
        .not('statut', 'in', '(brouillon,annule)')
        .order('date_chargement_prevue', { ascending: false }),
      supabase.from('clients').select('id, nom'),
    ])
    const clientMap = Object.fromEntries(
      ((clientsRes.data ?? []) as { id: string; nom: string }[]).map(c => [c.id, c.nom]),
    )
    setOts(
      ((otsRes.data ?? []) as OtForCo2[]).map(ot => ({
        ...ot,
        client_nom: clientMap[ot.client_id ?? ''] ?? null,
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const years = useMemo(() => {
    const s = new Set<string>()
    ots.forEach(ot => { if (ot.date_chargement_prevue) s.add(ot.date_chargement_prevue.slice(0, 4)) })
    return [...s].sort((a, b) => b.localeCompare(a))
  }, [ots])

  const filtered = useMemo(() => {
    return ots.filter(ot => {
      const matchYear = !filterYear || (ot.date_chargement_prevue ?? '').startsWith(filterYear)
      const matchClient = !filterClient || (ot.client_nom ?? '').toLowerCase().includes(filterClient.toLowerCase())
      return matchYear && matchClient
    })
  }, [ots, filterYear, filterClient])

  const results: OtCo2Result[] = useMemo(() => filtered.map(ot => computeOtCo2(ot)), [filtered])
  const clientSummaries: Co2ClientSummary[] = useMemo(() => computeClientCo2(results), [results])

  const co2Total = results.reduce((s, r) => s + r.co2_kg, 0)
  const co2Moyen = results.length > 0 ? co2Total / results.length : 0
  const distTotale = results.reduce((s, r) => s + r.distance_utilisee, 0)
  const poidsTotalT = results.reduce((s, r) => s + r.poids_t_utilise, 0)
  const nbEstimations = results.filter(r => r.estimation).length
  const maxClientCo2 = clientSummaries.length > 0 ? clientSummaries[0].co2_total_kg : 1

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">RSE / Environnement</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Bilan CO₂ Transport</h2>
        <p className="mt-1 text-sm text-slate-500">
          Empreinte carbone par transport et par client — Methode ADEME Base Empreinte® 2023
        </p>
      </div>

      {/* Methode */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 leading-relaxed">
        <strong>Methode de calcul&nbsp;:</strong> CO₂ (kg) = distance (km) × poids charge (t) × facteur d'emission (g CO₂eq / t.km) ÷ 1000.
        Referentiel ADEME Base Empreinte® v23.1, retour a vide inclus.
        Facteurs&nbsp;: Articule &gt;40t&nbsp;→&nbsp;62&nbsp;g, Porteur&nbsp;→&nbsp;80&nbsp;g, Porteur leger&nbsp;→&nbsp;115&nbsp;g, Fourgon&nbsp;→&nbsp;195&nbsp;g, Groupage&nbsp;→&nbsp;100&nbsp;g.
        {nbEstimations > 0 && (
          <span className="ml-2 font-medium text-amber-700">
            ⚠ {nbEstimations} transport{nbEstimations > 1 ? 's' : ''} avec distance ou poids estime (valeur par defaut appliquee).
          </span>
        )}
      </div>

      {/* Filtres + actions */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="">Toutes les periodes</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filtrer par client..."
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-300 w-52"
          />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setView('clients')}
              className={`px-3 py-2 font-medium transition-colors ${view === 'clients' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Par client
            </button>
            <button
              type="button"
              onClick={() => setView('transports')}
              className={`px-3 py-2 font-medium transition-colors border-l border-slate-200 ${view === 'transports' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Par transport
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => view === 'clients' ? exportCo2ClientCsv(clientSummaries) : exportCo2TransportCsv(results)}
            disabled={results.length === 0}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            Exporter CSV
          </button>
          <button
            type="button"
            onClick={load}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ↺ Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">Chargement...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              label="CO₂ total"
              value={formatCo2(co2Total)}
              sub={`${results.length} transports`}
            />
            <KpiCard
              label="CO₂ moyen / transport"
              value={formatCo2(co2Moyen)}
            />
            <KpiCard
              label="Distance totale"
              value={`${fmtN(distTotale, ' km')}`}
              sub={`${fmtN(poidsTotalT, ' t')} charges`}
            />
            <KpiCard
              label="Clients concernes"
              value={String(clientSummaries.length)}
              sub={nbEstimations > 0 ? `dont ${nbEstimations} estimations` : 'Donnees messurees'}
            />
          </div>

          {results.length === 0 && (
            <div className="rounded-xl border border-slate-200 py-16 text-center text-slate-400">
              Aucun transport sur la periode selectionnee.
            </div>
          )}

          {/* Vue clients */}
          {results.length > 0 && view === 'clients' && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Bilan CO₂ par client</h3>
                <p className="text-xs text-slate-400">Classe du plus emetteur au moins emetteur</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Client', 'Transports', 'Distance', 'Poids', 'CO₂ total', 'CO₂ / transport', 'g/t.km', 'Repartition'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientSummaries.map((s, i) => (
                      <tr key={s.client_id ?? i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{s.client_nom}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{s.nb_transports}</td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {s.distance_totale_km.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} km
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {s.poids_total_t.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} t
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">{formatCo2(s.co2_total_kg)}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{formatCo2(s.co2_par_transport_kg)}</td>
                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                          {s.co2_par_tkm_g?.toFixed(0) ?? '—'}
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="h-2.5 rounded-full bg-slate-100">
                            <div
                              className="h-2.5 rounded-full bg-emerald-500"
                              style={{ width: `${Math.max((s.co2_total_kg / maxClientCo2) * 100, 2)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {((s.co2_total_kg / (co2Total || 1)) * 100).toFixed(1)} % du total
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Vue transports */}
          {results.length > 0 && view === 'transports' && (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Detail CO₂ par transport</h3>
                <p className="text-xs text-slate-400">{results.length} transport{results.length > 1 ? 's' : ''}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Reference', 'Client', 'Date', 'Type', 'Distance', 'Poids', 'Classe vehicule', 'CO₂', 'CO₂/km', 'Source'].map(h => (
                        <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-3 font-mono text-xs font-semibold text-slate-800">{r.reference}</td>
                        <td className="px-3 py-3 text-slate-600">{r.client_nom ?? '—'}</td>
                        <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {r.date_chargement_prevue
                            ? new Date(r.date_chargement_prevue).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {r.type_transport}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-slate-600">{r.distance_utilisee.toLocaleString('fr-FR')} km</td>
                        <td className="px-3 py-3 text-right text-slate-600">
                          {r.poids_t_utilise.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} t
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-400 max-w-[140px] truncate">
                          {CO2_FACTORS[r.classe]?.label ?? r.classe}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-slate-900">{formatCo2(r.co2_kg)}</td>
                        <td className="px-3 py-3 text-right text-slate-500 text-xs">{r.co2_par_km.toFixed(3)}</td>
                        <td className="px-3 py-3 text-center">
                          {r.estimation
                            ? <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Estimee</span>
                            : <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Mesuree</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Comparaison annuelle */}
          {years.length > 1 && !filterYear && (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Evolution annuelle</h3>
              <div className="space-y-3">
                {years.map(y => {
                  const annualResults = ots.filter(ot => (ot.date_chargement_prevue ?? '').startsWith(y)).map(ot => computeOtCo2(ot))
                  const annualCo2 = annualResults.reduce((s, r) => s + r.co2_kg, 0)
                  const maxAnnual = Math.max(...years.map(yr => {
                    return ots.filter(ot => (ot.date_chargement_prevue ?? '').startsWith(yr)).reduce((s, ot) => s + computeOtCo2(ot).co2_kg, 0)
                  }))
                  return (
                    <div key={y} className="flex items-center gap-4">
                      <span className="w-12 text-sm font-semibold text-slate-600 shrink-0">{y}</span>
                      <div className="flex-1 h-6 rounded-lg bg-slate-100">
                        <div
                          className="h-6 rounded-lg bg-emerald-400 flex items-center justify-end pr-3 transition-all"
                          style={{ width: `${Math.max((annualCo2 / (maxAnnual || 1)) * 100, 3)}%` }}
                        >
                          <span className="text-xs font-bold text-white whitespace-nowrap">{formatCo2(annualCo2)}</span>
                        </div>
                      </div>
                      <span className="w-16 text-xs text-slate-400 text-right shrink-0">{annualResults.length} OT</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
