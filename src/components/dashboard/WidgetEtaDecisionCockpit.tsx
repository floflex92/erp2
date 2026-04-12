import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { listAllTransportRequests, subscribeClientPortalUpdates, type ClientTransportRequest } from '@/lib/clientPortal'
import { persistEtaPredictions, persistJobScores } from '@/lib/transportDecisionPersistence'
import {
  buildCockpitAlerts,
  buildOrderEtaInput,
  computePredictiveEta,
  deriveJobScoreFromTransportRequest,
  type CockpitAlert,
  type EtaPrediction,
  type JobScoreResult,
} from '@/lib/transportDecisionEngine'

type ActiveOrder = {
  id: string
  reference: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  distance_km: number | null
  conducteur_id: string | null
  vehicule_id: string | null
  statut_operationnel: string | null
  statut_transport: string | null
  est_affretee: boolean | null
}

type EtaRow = {
  id: string
  reference: string
  plannedEtaIso: string | null
  prediction: EtaPrediction
}

type RequestRow = {
  request: ClientTransportRequest
  score: JobScoreResult
}

function etaToneClass(level: EtaPrediction['riskLevel']) {
  if (level === 'critique') return 'border-red-200 bg-red-50 text-red-700'
  if (level === 'a_surveiller') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function scoreToneClass(color: JobScoreResult['color']) {
  if (color === 'vert') return 'bg-emerald-600 text-white'
  if (color === 'orange') return 'bg-amber-500 text-slate-950'
  return 'bg-red-600 text-white'
}

function formatShortDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRecommendation(value: JobScoreResult['recommendation']) {
  if (value === 'accepter') return 'Accepter'
  if (value === 'a_optimiser') return 'A optimiser'
  if (value === 'risque') return 'Risque'
  return 'A refuser'
}

export function WidgetEtaDecisionCockpit() {
  const { companyId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<ActiveOrder[]>([])
  const [requests, setRequests] = useState<ClientTransportRequest[]>([])
  const [resourceContext, setResourceContext] = useState({
    vehiclesAvailableCount: 2,
    compatibleVehiclesCount: 2,
    driversAvailableCount: 2,
    exploitantLoadPct: 72,
    serviceLoadPct: 66,
    planningConflictCount: 0,
  })

  useEffect(() => {
    setRequests(listAllTransportRequests())
    const unsubscribe = subscribeClientPortalUpdates(() => setRequests(listAllTransportRequests()))
    return unsubscribe
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const [ordersRes, vehiclesRes, driversRes, liveOrdersRes] = await Promise.all([
          supabase
            .from('ordres_transport')
            .select('id, reference, date_chargement_prevue, date_livraison_prevue, distance_km, conducteur_id, vehicule_id, statut_operationnel, statut_transport, est_affretee')
            .in('statut_transport', ['planifie', 'en_cours_approche_chargement', 'en_chargement', 'en_transit', 'en_livraison'])
            .order('date_livraison_prevue', { ascending: true, nullsFirst: false })
            .limit(6),
          supabase.from('vehicules').select('id', { count: 'exact', head: true }).in('statut', ['disponible', 'en_service', 'actif']),
          supabase.from('conducteurs').select('id', { count: 'exact', head: true }).eq('statut', 'actif'),
          supabase.from('ordres_transport').select('id', { count: 'exact', head: true }).in('statut_transport', ['planifie', 'en_cours_approche_chargement', 'en_chargement', 'en_transit', 'en_livraison']),
        ])

        const vehiclesAvailableCount = vehiclesRes.count ?? 2
        const driversAvailableCount = driversRes.count ?? 2
        const liveOrders = liveOrdersRes.count ?? 0
        const openRequests = listAllTransportRequests().filter(item => item.status === 'soumise' || item.status === 'en_etude' || item.status === 'modification_demandee').length

        setOrders((ordersRes.data ?? []) as ActiveOrder[])
        setResourceContext({
          vehiclesAvailableCount,
          compatibleVehiclesCount: Math.max(1, vehiclesAvailableCount - Math.min(1, liveOrders)),
          driversAvailableCount,
          exploitantLoadPct: Math.min(96, 48 + (liveOrders * 7) + (openRequests * 3)),
          serviceLoadPct: Math.min(94, 42 + (openRequests * 8)),
          planningConflictCount: liveOrders > vehiclesAvailableCount ? liveOrders - vehiclesAvailableCount : 0,
        })
      } catch {
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const etaRows = useMemo<EtaRow[]>(
    () => orders.map(order => ({
      id: order.id,
      reference: order.reference,
      plannedEtaIso: order.date_livraison_prevue,
      prediction: computePredictiveEta(buildOrderEtaInput(order)),
    })),
    [orders],
  )

  const scoredRequests = useMemo<RequestRow[]>(
    () => requests
      .filter(item => item.status === 'soumise' || item.status === 'en_etude' || item.status === 'modification_demandee')
      .map(request => ({
        request,
        score: deriveJobScoreFromTransportRequest(request, resourceContext),
      }))
      .sort((left, right) => right.score.globalScore - left.score.globalScore)
      .slice(0, 4),
    [requests, resourceContext],
  )

  const alerts = useMemo<CockpitAlert[]>(
    () => buildCockpitAlerts({
      etaPredictions: etaRows.map(item => ({ reference: item.reference, prediction: item.prediction })),
      scoredRequests: scoredRequests.map(item => ({ reference: item.request.reference, score: item.score, status: item.request.status })),
      exploitantLoadPct: resourceContext.exploitantLoadPct,
    }),
    [etaRows, scoredRequests, resourceContext.exploitantLoadPct],
  )

  useEffect(() => {
    if (!companyId || etaRows.length === 0) return

    void persistEtaPredictions(etaRows.map(item => ({
      companyId,
      otId: item.id,
      reference: item.reference,
      distanceKm: orders.find(order => order.id === item.id)?.distance_km ?? null,
      prediction: item.prediction,
      sourceEvent: 'planning_change',
      metadata: {
        sourceSurface: 'WidgetEtaDecisionCockpit',
        plannedEtaIso: item.plannedEtaIso,
      },
    })))
  }, [companyId, etaRows, orders])

  useEffect(() => {
    if (!companyId || scoredRequests.length === 0) return

    void persistJobScores(scoredRequests.map(item => ({
      companyId,
      requestReference: item.request.reference,
      requestPayload: item.request,
      score: item.score,
      metadata: {
        sourceSurface: 'WidgetEtaDecisionCockpit',
        status: item.request.status,
      },
    })))
  }, [companyId, scoredRequests])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-secondary)' }}>Decision cockpit</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>ETA predictif, scoring et alertes</p>
        </div>
        <div className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)', color: 'var(--text-secondary)' }}>
          Charge exploitation {Math.round(resourceContext.exploitantLoadPct)}%
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-950">ETA missions actives</p>
            <Link to="/planning" className="text-xs font-semibold text-[color:var(--primary)] hover:underline">Ouvrir planning</Link>
          </div>

          <div className="space-y-3">
            {etaRows.length === 0 && <p className="text-xs text-slate-500">Aucune mission active pour le calcul ETA.</p>}
            {etaRows.map(item => {
              const progressPct = Math.max(12, Math.min(100, Math.round((item.prediction.baselineDurationMinutes / Math.max(item.prediction.predictedDurationMinutes, 1)) * 100)))
              return (
                <div key={item.id} className="rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.reference}</p>
                      <p className="mt-1 text-xs text-slate-500">ETA calculee {formatShortDate(item.prediction.etaIso)} · plan initial {formatShortDate(item.plannedEtaIso)}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${etaToneClass(item.prediction.riskLevel)}`}>
                      {item.prediction.statusLabel} · {item.prediction.confidencePct}%
                    </span>
                  </div>

                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full ${item.prediction.riskLevel === 'critique' ? 'bg-red-600' : item.prediction.riskLevel === 'a_surveiller' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${progressPct}%` }} />
                  </div>

                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    <MiniKpi label="Ecart" value={`${item.prediction.deltaMinutes} min`} />
                    <MiniKpi label="Optimiste" value={formatShortDate(item.prediction.optimisticEtaIso)} />
                    <MiniKpi label="Pessimiste" value={formatShortDate(item.prediction.pessimisticEtaIso)} />
                  </div>

                  <p className="mt-3 text-xs text-slate-600">{item.prediction.explanation[0] ?? 'Prediction disponible.'}</p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-950">Demandes priorisees</p>
            <Link to="/demandes-clients" className="text-xs font-semibold text-[color:var(--primary)] hover:underline">Ouvrir demandes</Link>
          </div>

          <div className="space-y-3">
            {scoredRequests.length === 0 && <p className="text-xs text-slate-500">Aucune demande ouverte a scorer.</p>}
            {scoredRequests.map(item => (
              <div key={item.request.id} className="rounded-2xl border px-3 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.request.reference}</p>
                    <p className="mt-1 text-xs text-slate-500">Marge estimee {item.score.estimatedMargin} EUR · {item.score.distanceKm} km</p>
                  </div>
                  <span className={`inline-flex min-w-11 items-center justify-center rounded-xl px-2.5 py-1.5 text-sm font-semibold ${scoreToneClass(item.score.color)}`}>
                    {item.score.globalScore}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">{formatRecommendation(item.score.recommendation)}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">Difficulte {item.score.difficultyLabel}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600">Impact {item.score.impactLabel}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="rounded-xl border border-white/80 bg-white/80 px-2.5 py-2">Rentabilite {item.score.subScores.find(score => score.key === 'rentabilite')?.score ?? 0}/100</div>
                  <div className="rounded-xl border border-white/80 bg-white/80 px-2.5 py-2">Faisabilite {item.score.subScores.find(score => score.key === 'faisabilite')?.score ?? 0}/100</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-950">Alertes intelligentes</p>
          <Link to="/ops-center" className="text-xs font-semibold text-[color:var(--primary)] hover:underline">Ouvrir Ops center</Link>
        </div>

        <div className="space-y-2">
          {alerts.length === 0 && <p className="text-xs text-slate-500">Aucune alerte critique en ce moment.</p>}
          {alerts.map(alert => (
            <div key={alert.id} className={`rounded-2xl border px-3 py-3 ${alert.level === 'critique' ? 'border-red-200 bg-red-50' : alert.level === 'a_surveiller' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">{alert.actionLabel}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{alert.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/80 bg-white/85 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
    </div>
  )
}