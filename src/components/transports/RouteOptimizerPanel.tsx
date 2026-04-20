import { useState, useEffect, useCallback } from 'react'
import { useRouteOptimizer } from '@/hooks/useRouteOptimizer'
import type { OptimizationConstraints } from '@/lib/routeOptimizer'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Conducteur {
  id: string
  nom: string
  prenom: string
}

interface RouteOptimizerPanelProps {
  open: boolean
  onClose: () => void
  conducteurs: Conducteur[]
  /** Conducteur pré-sélectionné (depuis le planning) */
  defaultConducteurId?: string | null
  /** Date pré-sélectionnée (ISO YYYY-MM-DD) */
  defaultDate?: string
  onApplied?: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`
}

const TYPE_COLORS: Record<string, string> = {
  chargement: 'bg-blue-800 text-blue-100',
  livraison: 'bg-emerald-800 text-emerald-100',
  autre: 'bg-slate-700 text-slate-200',
}

const TYPE_LABELS: Record<string, string> = {
  chargement: 'CHG',
  livraison: 'LIV',
  autre: '...',
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------

export default function RouteOptimizerPanel({
  open,
  onClose,
  conducteurs,
  defaultConducteurId,
  defaultDate,
  onApplied,
}: RouteOptimizerPanelProps) {
  const today = new Date().toISOString().split('T')[0]
  const [conducteurId, setConducteurId] = useState<string>(defaultConducteurId ?? '')
  const [date, setDate] = useState<string>(defaultDate ?? today)
  const [departureTime, setDepartureTime] = useState<string>('07:00')
  const [capaciteKg, setCapaciteKg] = useState<string>('')
  const [capaciteM3, setCapaciteM3] = useState<string>('')
  const [vitesse, setVitesse] = useState<string>('70')
  const [applied, setApplied] = useState(false)

  const {
    ots,
    result,
    loading,
    computing,
    applying,
    error,
    loadOts,
    runOptimization,
    applyOptimization,
    reset,
  } = useRouteOptimizer()

  // Sync props →state
  useEffect(() => {
    if (defaultConducteurId) setConducteurId(defaultConducteurId)
  }, [defaultConducteurId])
  useEffect(() => {
    if (defaultDate) setDate(defaultDate)
  }, [defaultDate])

  // Reset quand on ferme
  useEffect(() => {
    if (!open) {
      reset()
      setApplied(false)
    }
  }, [open, reset])

  const handleLoad = useCallback(() => {
    if (!conducteurId || !date) return
    void loadOts(conducteurId, date)
    setApplied(false)
  }, [conducteurId, date, loadOts])

  const handleOptimize = useCallback(() => {
    const constraints: OptimizationConstraints = {
      vehicleCapacityKg: capaciteKg ? Number(capaciteKg) : null,
      vehicleCapacityM3: capaciteM3 ? Number(capaciteM3) : null,
      averageSpeedKmh: vitesse ? Number(vitesse) : 70,
      stopDurationMin: 15,
    }
    runOptimization(constraints, departureTime || undefined)
    setApplied(false)
  }, [capaciteKg, capaciteM3, vitesse, departureTime, runOptimization])

  const handleApply = useCallback(async () => {
    await applyOptimization()
    setApplied(true)
    onApplied?.()
  }, [applyOptimization, onApplied])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Optimisation de tournée"
        className="fixed right-0 top-0 z-[201] flex h-full w-full max-w-2xl flex-col bg-slate-900 shadow-2xl ring-1 ring-slate-700"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-white">Optimisation de tournée</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Calcul de la séquence de livraisons optimale (Nearest-Neighbor + 2-opt)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Fermer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 p-5">

            {/* ─── Sélection conducteur + date ─── */}
            <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Sélection
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Conducteur</label>
                  <select
                    value={conducteurId}
                    onChange={e => setConducteurId(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">— Choisir —</option>
                    {conducteurs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.prenom} {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleLoad}
                disabled={!conducteurId || !date || loading}
                className="mt-3 w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Chargement des OT…' : 'Charger les courses du jour'}
              </button>

              {/* OT count badge */}
              {ots.length > 0 && (
                <p className="mt-2 text-xs text-slate-400">
                  <span className="font-bold text-white">{ots.length}</span> OT trouvé{ots.length > 1 ? 's' : ''} pour ce conducteur / cette date
                </p>
              )}
            </section>

            {/* ─── Paramètres algorithme ─── */}
            {ots.length > 0 && (
              <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Paramètres de calcul
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Capacité véhicule (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="ex : 24000"
                      value={capaciteKg}
                      onChange={e => setCapaciteKg(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Capacité véhicule (m³)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="ex : 82"
                      value={capaciteM3}
                      onChange={e => setCapaciteM3(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Vitesse moy. (km/h)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="130"
                      value={vitesse}
                      onChange={e => setVitesse(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Heure de départ
                    </label>
                    <input
                      type="time"
                      value={departureTime}
                      onChange={e => setDepartureTime(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={computing || ots.length === 0}
                  className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {computing ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Calcul en cours…
                    </span>
                  ) : (
                    '🗺 Calculer la séquence optimale'
                  )}
                </button>
              </section>
            )}

            {/* ─── Erreur ─── */}
            {error && (
              <div className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* ─── Résultats ─── */}
            {result && (
              <>
                {/* Métriques globales */}
                <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Résultats d'optimisation
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <MetricCard
                      label="Distance totale"
                      value={`${result.totalDistanceKm} km`}
                      subtext="selon coordonnées GPS"
                    />
                    <MetricCard
                      label="Durée estimée"
                      value={formatDuration(result.estimatedDurationMin)}
                      subtext={`à ${vitesse || 70} km/h + arrêts`}
                    />
                    <MetricCard
                      label="Gain vs ordre initial"
                      value={`−${result.distanceSavedKm} km`}
                      valueClass={result.distanceSavedKm > 0 ? 'text-emerald-400' : 'text-slate-400'}
                      subtext={result.savingsPercent > 0 ? `soit −${result.savingsPercent}%` : 'Déjà optimal'}
                    />
                  </div>
                </section>

                {/* Avertissements */}
                {result.warnings.length > 0 && (
                  <section className="rounded-xl border border-amber-700/50 bg-amber-900/20 p-4">
                    <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                      </svg>
                      Avertissements ({result.warnings.length})
                    </h3>
                    <ul className="space-y-1">
                      {result.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-300">
                          • {w}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Séquence */}
                <section className="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Séquence optimisée — {result.sequence.length} arrêt{result.sequence.length > 1 ? 's' : ''}
                  </h3>
                  <div className="space-y-2">
                    {result.sequence.map((stop, idx) => (
                      <div key={stop.id} className="flex items-start gap-3">
                        {/* Numéro + ligne verticale */}
                        <div className="flex flex-col items-center">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-200">
                            {idx + 1}
                          </span>
                          {idx < result.sequence.length - 1 && (
                            <div className="mt-1 h-full min-h-[12px] w-px bg-slate-700" />
                          )}
                        </div>

                        {/* Contenu */}
                        <div className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${TYPE_COLORS[stop.type] ?? TYPE_COLORS.autre}`}
                                >
                                  {TYPE_LABELS[stop.type] ?? stop.type}
                                </span>
                                {stop.priority === 'express' && (
                                  <span className="rounded bg-orange-700 px-1.5 py-0.5 text-[10px] font-bold text-orange-100">
                                    EXPRESS
                                  </span>
                                )}
                                {stop.isFixedGroupage && (
                                  <span className="rounded bg-purple-800 px-1.5 py-0.5 text-[10px] font-bold text-purple-100">
                                    GROUPÉ
                                  </span>
                                )}
                                <span className="truncate text-xs font-semibold text-white">
                                  {stop.label}
                                </span>
                              </div>
                              <p className="mt-0.5 truncate text-[11px] text-slate-400">
                                {stop.address}
                              </p>
                            </div>

                            {/* Métriques arrêt */}
                            <div className="shrink-0 text-right">
                              {stop.estimatedArrival && (
                                <div
                                  className={`text-xs font-bold ${stop.timeWindowOk === false ? 'text-red-400' : stop.timeWindowOk === true ? 'text-emerald-400' : 'text-slate-300'}`}
                                >
                                  {stop.estimatedArrival}
                                  {stop.timeWindowOk === false && (
                                    <span className="ml-1 text-[10px] text-red-400">⚠ hors créneau</span>
                                  )}
                                </div>
                              )}
                              {idx > 0 && (
                                <div className="mt-0.5 text-[10px] text-slate-500">
                                  +{stop.distanceFromPrev} km
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Fenêtre horaire site */}
                          {(stop.timeWindowStart || stop.timeWindowEnd) && (
                            <p className="mt-1 text-[10px] text-slate-500">
                              Ouverture : {stop.timeWindowStart ?? '—'} → {stop.timeWindowEnd ?? '—'}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Footer — action Appliquer */}
        {result && (
          <div className="shrink-0 border-t border-slate-700 px-5 py-4">
            {applied ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300">
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Horaires appliqués — le planning est mis à jour.
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => void handleApply()}
                  disabled={applying}
                  className="flex-[2] rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {applying ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Application…
                    </span>
                  ) : (
                    'Appliquer les horaires au planning'
                  )}
                </button>
              </div>
            )}
            <p className="mt-2 text-[10px] text-slate-500">
              Met à jour les dates de chargement / livraison prévues sur chaque OT.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Sous-composant : MetricCard
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string
  value: string
  subtext?: string
  valueClass?: string
}

function MetricCard({ label, value, subtext, valueClass = 'text-white' }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClass}`}>{value}</p>
      {subtext && <p className="mt-0.5 text-[10px] text-slate-500">{subtext}</p>}
    </div>
  )
}
