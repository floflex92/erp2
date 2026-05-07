import { useMemo, useState } from 'react'
import useSiteMeta from '@/site/hooks/useSiteMeta'
import {
  FUNNELS,
  FUNNEL_STEPS,
  EVENTS,
  type AnalyticsDebugEvent,
  getAnalyticsDebugEvents,
  getMarketingFunnelSnapshot,
  __analyticsInternals,
} from '@/site/lib/analytics'

type SessionRow = {
  sessionId: string
  startedAt: number
  endedAt: number
  eventCount: number
  homeViews: number
  demoClicks: number
  demoFormSubmits: number
  demoFormSuccesses: number
  contactPageViews: number
  contactFormSubmits: number
  contactFormSuccesses: number
  clickRateFromHomeView: number
  demoSubmitRateFromClicks: number
  demoSuccessRateFromSubmits: number
  contactSubmitRateFromViews: number
  contactSuccessRateFromSubmits: number
}

type SessionGroup = {
  id: string
  events: AnalyticsDebugEvent[]
}

type PeriodKey = '24h' | '7d' | '30d' | 'all'

const SESSION_GAP_MS = 30 * 60 * 1000

function toRate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return Number(((numerator / denominator) * 100).toFixed(1))
}

function toCsvValue(value: string | number) {
  const asString = String(value).replace(/"/g, '""')
  return `"${asString}"`
}

function getPeriodCutoff(period: PeriodKey, now: number) {
  if (period === 'all') return null
  if (period === '24h') return now - (24 * 60 * 60 * 1000)
  if (period === '7d') return now - (7 * 24 * 60 * 60 * 1000)
  return now - (30 * 24 * 60 * 60 * 1000)
}

function getPeriodDurationMs(period: PeriodKey) {
  if (period === 'all') return null
  if (period === '24h') return 24 * 60 * 60 * 1000
  if (period === '7d') return 7 * 24 * 60 * 60 * 1000
  return 30 * 24 * 60 * 60 * 1000
}

function getPeriodLabel(period: PeriodKey) {
  if (period === '24h') return '24h'
  if (period === '7d') return '7j'
  if (period === '30d') return '30j'
  return 'toutes periodes'
}

function buildSnapshotFromRows(rows: SessionRow[]) {
  const homeViews = rows.reduce((sum, row) => sum + row.homeViews, 0)
  const demoClicks = rows.reduce((sum, row) => sum + row.demoClicks, 0)
  const demoFormSubmits = rows.reduce((sum, row) => sum + row.demoFormSubmits, 0)
  const demoFormSuccesses = rows.reduce((sum, row) => sum + row.demoFormSuccesses, 0)
  const contactPageViews = rows.reduce((sum, row) => sum + row.contactPageViews, 0)
  const contactFormSubmits = rows.reduce((sum, row) => sum + row.contactFormSubmits, 0)
  const contactFormSuccesses = rows.reduce((sum, row) => sum + row.contactFormSuccesses, 0)

  return {
    homeViews,
    demoClicks,
    demoFormSubmits,
    demoFormSuccesses,
    contactPageViews,
    contactFormSubmits,
    contactFormSuccesses,
    clickRateFromHomeView: toRate(demoClicks, homeViews),
    demoSubmitRateFromClicks: toRate(demoFormSubmits, demoClicks),
    demoSuccessRateFromSubmits: toRate(demoFormSuccesses, demoFormSubmits),
    contactSubmitRateFromViews: toRate(contactFormSubmits, contactPageViews),
    contactSuccessRateFromSubmits: toRate(contactFormSuccesses, contactFormSubmits),
  }
}

function formatDeltaCount(current: number, previous: number) {
  if (previous === 0) {
    if (current === 0) return '0%'
    return 'nouveau'
  }

function getTrendTone(current: number, previous: number): 'positive' | 'negative' | 'neutral' {
  if (current > previous) return 'positive'
  if (current < previous) return 'negative'
  return 'neutral'
}
  const delta = ((current - previous) / previous) * 100
function StatCard({
  label,
  value,
  helper,
  helperTone = 'neutral',
  animationDelayMs = 0,
}: {
  label: string
  value: string | number
  helper?: string
  helperTone?: 'positive' | 'negative' | 'neutral'
  animationDelayMs?: number
}) {
  const helperColorClass =
    helperTone === 'positive'
      ? 'text-emerald-700'
      : helperTone === 'negative'
        ? 'text-rose-700'
        : 'text-slate-500'

  return `${sign}${delta.toFixed(1)}%`
}

function formatDeltaRate(current: number, previous: number) {
      {helper && <p className={`mt-2 text-xs ${helperColorClass}`}>{helper}</p>}
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)} pts`
}

function buildSessions(events: AnalyticsDebugEvent[]): SessionGroup[] {
  if (events.length === 0) return []

  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt)
  const sessions: SessionGroup[] = []
  let currentSession: SessionGroup | null = null
  let previousTs = 0

  for (const event of sorted) {
    if (!currentSession || event.createdAt - previousTs > SESSION_GAP_MS) {
      currentSession = {
        id: `s_${new Date(event.createdAt).toISOString()}`,
        events: [],
      }
      sessions.push(currentSession)
    }

    currentSession.events.push(event)
    previousTs = event.createdAt
  }

  return sessions
}

function buildSessionRowsFromSessions(sessions: SessionGroup[]): SessionRow[] {
  if (sessions.length === 0) return []

  return sessions.map(session => {
    let homeViews = 0
    let demoClicks = 0
    let demoFormSubmits = 0
    let demoFormSuccesses = 0
    let contactPageViews = 0
    let contactFormSubmits = 0
    let contactFormSuccesses = 0

    for (const event of session.events) {
      if (event.name !== EVENTS.FUNNEL_STEP) continue
      const funnel = event.params.funnel
      const step = event.params.step

      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.HOME_VIEW) homeViews += 1
      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.DEMO_CLICK) demoClicks += 1
      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.DEMO_FORM_SUBMIT) demoFormSubmits += 1
      if (funnel === FUNNELS.MARKETING_DEMO && step === FUNNEL_STEPS.MARKETING_DEMO.DEMO_FORM_SUCCESS) demoFormSuccesses += 1

      if (funnel === FUNNELS.MARKETING_CONTACT && step === FUNNEL_STEPS.MARKETING_CONTACT.CONTACT_PAGE_VIEW) contactPageViews += 1
      if (funnel === FUNNELS.MARKETING_CONTACT && step === FUNNEL_STEPS.MARKETING_CONTACT.CONTACT_FORM_SUBMIT) contactFormSubmits += 1
      if (funnel === FUNNELS.MARKETING_CONTACT && step === FUNNEL_STEPS.MARKETING_CONTACT.CONTACT_FORM_SUCCESS) contactFormSuccesses += 1
    }

    const startedAt = session.events[0]?.createdAt ?? Date.now()
    const endedAt = session.events[session.events.length - 1]?.createdAt ?? startedAt

    return {
      <article
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
        style={{ animation: `nexora-funnel-fade-up 280ms ease both`, animationDelay: `${animationDelayMs}ms` }}
      >
      startedAt,
      endedAt,
      eventCount: session.events.length,
      homeViews,
      demoClicks,
      demoFormSubmits,
      demoFormSuccesses,
      contactPageViews,
      contactFormSubmits,
      contactFormSuccesses,
      clickRateFromHomeView: toRate(demoClicks, homeViews),
      demoSubmitRateFromClicks: toRate(demoFormSubmits, demoClicks),
      demoSuccessRateFromSubmits: toRate(demoFormSuccesses, demoFormSubmits),
      contactSubmitRateFromViews: toRate(contactFormSubmits, contactPageViews),
      contactSuccessRateFromSubmits: toRate(contactFormSuccesses, contactFormSubmits),
    }
  })
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
    </article>
  )
}

export default function MarketingFunnelPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [period, setPeriod] = useState<PeriodKey>('7d')
  const now = useMemo(() => Date.now(), [refreshKey])
  const periodDuration = useMemo(() => getPeriodDurationMs(period), [period])
  const currentPeriodStart = useMemo(() => (periodDuration ? now - periodDuration : null), [now, periodDuration])
  const events = useMemo(() => getAnalyticsDebugEvents(), [refreshKey])
  const filteredEvents = useMemo(() => {
    const cutoff = getPeriodCutoff(period, now)
    if (!cutoff) return events
    return events.filter(event => event.createdAt >= cutoff)
  }, [events, period, now])
  const previousPeriodEvents = useMemo(() => {
    if (!periodDuration || !currentPeriodStart) return []
    const previousStart = currentPeriodStart - periodDuration
    return events.filter(event => event.createdAt >= previousStart && event.createdAt < currentPeriodStart)
  }, [events, periodDuration, currentPeriodStart])
  const sessions = useMemo(() => buildSessions(filteredEvents), [filteredEvents])
  const sessionRows = useMemo(() => buildSessionRowsFromSessions(sessions), [sessions])
  const snapshot = useMemo(() => buildSnapshotFromRows(sessionRows), [sessionRows])
  const previousSessionRows = useMemo(() => buildSessionRowsFromSessions(buildSessions(previousPeriodEvents)), [previousPeriodEvents])
  const previousSnapshot = useMemo(() => buildSnapshotFromRows(previousSessionRows), [previousSessionRows])

  const exportSessionsCsv = () => {
    if (sessionRows.length === 0) return

    const headers = [
      'session_id',
      'started_at',
      'ended_at',
      'event_count',
      'home_views',
      'demo_clicks',
      'demo_form_submits',
      'demo_form_successes',
      'contact_page_views',
      'contact_form_submits',
      'contact_form_successes',
      'click_rate_from_home_view',
      'demo_submit_rate_from_clicks',
      'demo_success_rate_from_submits',
      'contact_submit_rate_from_views',
      'contact_success_rate_from_submits',
    ]

    const lines = [headers.map(toCsvValue).join(',')]
    for (const row of sessionRows) {
      lines.push([
        row.sessionId,
        new Date(row.startedAt).toISOString(),
        new Date(row.endedAt).toISOString(),
        row.eventCount,
        row.homeViews,
        row.demoClicks,
        row.demoFormSubmits,
        row.demoFormSuccesses,
        row.contactPageViews,
        row.contactFormSubmits,
        row.contactFormSuccesses,
        row.clickRateFromHomeView,
        row.demoSubmitRateFromClicks,
        row.demoSuccessRateFromSubmits,
        row.contactSubmitRateFromViews,
        row.contactSuccessRateFromSubmits,
      ].map(toCsvValue).join(','))
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `funnel-sessions-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportEventsCsv = () => {
    if (sessions.length === 0) return

    const headers = [
      'session_id',
      'created_at',
      'event_name',
      'page_path',
      'funnel',
      'step',
      'placement',
      'target',
      'form_name',
      'surface',
      'variant',
      'params_json',
    ]

    const lines = [headers.map(toCsvValue).join(',')]
    for (const session of sessions) {
      for (const event of session.events) {
        lines.push([
          session.id,
          new Date(event.createdAt).toISOString(),
          event.name,
          event.params.page_path ?? '',
          event.params.funnel ?? '',
          event.params.step ?? '',
          event.params.placement ?? '',
          event.params.target ?? '',
          event.params.form_name ?? '',
          event.params.surface ?? '',
          event.params.variant ?? '',
          JSON.stringify(event.params),
        ].map(toCsvValue).join(','))
      }
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `funnel-events-${period}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  useSiteMeta({
    title: 'Pilotage Funnel Marketing',
    description: 'Tableau de bord local de conversion marketing NEXORA Truck.',
    canonicalPath: '/pilotage-funnel',
    robots: 'noindex, nofollow',
  })

  return (
    <section
      className="w-full"
      style={{
        paddingInline: 'clamp(24px, 8vw, 160px)',
        paddingBlock: 'clamp(72px, 10vw, 110px)',
        background: 'linear-gradient(180deg,#F8FBFF 0%, #EEF5FF 48%, #F7FAFF 100%)',
      }}
    >
      <style>{`
        @keyframes nexora-funnel-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">Pilotage</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 sm:text-[3rem]">
              Funnel marketing local
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Basé sur les événements analytics trackés localement après consentement. Utile pour vérifier rapidement
              le flux view → click → submit → success pendant les itérations produit.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs" key={`legend-${period}`}>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700"
                style={{ animation: 'nexora-funnel-fade-up 260ms ease both', animationDelay: '0ms' }}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Delta positif
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700"
                style={{ animation: 'nexora-funnel-fade-up 260ms ease both', animationDelay: '45ms' }}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />
                Delta négatif
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-600"
                style={{ animation: 'nexora-funnel-fade-up 260ms ease both', animationDelay: '90ms' }}
              >
                <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" />
                Delta stable
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
              Période
              <select
                value={period}
                onChange={event => setPeriod(event.target.value as PeriodKey)}
                className="bg-transparent font-semibold outline-none"
              >
                <option value="24h">24h</option>
                <option value="7d">7 jours</option>
                <option value="30d">30 jours</option>
                <option value="all">Tout</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => setRefreshKey(key => key + 1)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Rafraîchir
            </button>
            <button
              type="button"
              onClick={exportSessionsCsv}
              disabled={sessionRows.length === 0}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV sessions
            </button>
            <button
              type="button"
              onClick={exportEventsCsv}
              disabled={sessions.length === 0}
              className="rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV events
            </button>
            <button
              type="button"
              onClick={() => {
                __analyticsInternals.clearDebugEvents()
                setRefreshKey(key => key + 1)
              }}
              className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Vider l'historique
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            key={`home-views-${period}`}
            label="Home Views"
            value={snapshot.homeViews}
            helper={period === 'all' ? undefined : `Δ ${formatDeltaCount(snapshot.homeViews, previousSnapshot.homeViews)} vs période précédente`}
            helperTone={getTrendTone(snapshot.homeViews, previousSnapshot.homeViews)}
            animationDelayMs={0}
          />
          <StatCard
            key={`demo-clicks-${period}`}
            label="Demo Clicks"
            value={snapshot.demoClicks}
            helper={`${snapshot.clickRateFromHomeView}% depuis Home View${period === 'all' ? '' : ` • Δ ${formatDeltaCount(snapshot.demoClicks, previousSnapshot.demoClicks)}`}`}
            helperTone={getTrendTone(snapshot.demoClicks, previousSnapshot.demoClicks)}
            animationDelayMs={40}
          />
          <StatCard
            key={`demo-submits-${period}`}
            label="Demo Submits"
            value={snapshot.demoFormSubmits}
            helper={`${snapshot.demoSubmitRateFromClicks}% depuis Demo Click${period === 'all' ? '' : ` • Δ ${formatDeltaCount(snapshot.demoFormSubmits, previousSnapshot.demoFormSubmits)}`}`}
            helperTone={getTrendTone(snapshot.demoFormSubmits, previousSnapshot.demoFormSubmits)}
            animationDelayMs={80}
          />
          <StatCard
            key={`demo-success-${period}`}
            label="Demo Success"
            value={snapshot.demoFormSuccesses}
            helper={`${snapshot.demoSuccessRateFromSubmits}% depuis Demo Submit${period === 'all' ? '' : ` • Δ ${formatDeltaCount(snapshot.demoFormSuccesses, previousSnapshot.demoFormSuccesses)}`}`}
            helperTone={getTrendTone(snapshot.demoFormSuccesses, previousSnapshot.demoFormSuccesses)}
            animationDelayMs={120}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard
            key={`contact-views-${period}`}
            label="Contact Views"
            value={snapshot.contactPageViews}
            helper={period === 'all' ? undefined : `Δ ${formatDeltaCount(snapshot.contactPageViews, previousSnapshot.contactPageViews)} vs période précédente`}
            helperTone={getTrendTone(snapshot.contactPageViews, previousSnapshot.contactPageViews)}
            animationDelayMs={0}
          />
          <StatCard
            key={`contact-submits-${period}`}
            label="Contact Submits"
            value={snapshot.contactFormSubmits}
            helper={`${snapshot.contactSubmitRateFromViews}% depuis Contact View${period === 'all' ? '' : ` • Δ ${formatDeltaCount(snapshot.contactFormSubmits, previousSnapshot.contactFormSubmits)}`}`}
            helperTone={getTrendTone(snapshot.contactFormSubmits, previousSnapshot.contactFormSubmits)}
            animationDelayMs={50}
          />
          <StatCard
            key={`contact-success-${period}`}
            label="Contact Success"
            value={snapshot.contactFormSuccesses}
            helper={`${snapshot.contactSuccessRateFromSubmits}% depuis Contact Submit${period === 'all' ? '' : ` • Δ ${formatDeltaCount(snapshot.contactFormSuccesses, previousSnapshot.contactFormSuccesses)} • ${formatDeltaRate(snapshot.contactSuccessRateFromSubmits, previousSnapshot.contactSuccessRateFromSubmits)}`}`}
            helperTone={getTrendTone(snapshot.contactFormSuccesses, previousSnapshot.contactFormSuccesses)}
            animationDelayMs={100}
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-slate-900">Sessions funnel</h2>
          <p className="mt-1 text-xs text-slate-500">Découpage automatique par inactivité de 30 minutes ({getPeriodLabel(period)}): {sessionRows.length} sessions</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-3 py-2">Session</th>
                  <th className="px-3 py-2">Période</th>
                  <th className="px-3 py-2">Events</th>
                  <th className="px-3 py-2">Demo</th>
                  <th className="px-3 py-2">Contact</th>
                </tr>
              </thead>
              <tbody>
                {sessionRows.slice(-12).reverse().map(row => (
                  <tr key={row.sessionId} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2 font-medium text-slate-900">{row.sessionId}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">
                      {new Date(row.startedAt).toLocaleString('fr-FR')}<br />
                      → {new Date(row.endedAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.eventCount}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {row.homeViews} → {row.demoClicks} → {row.demoFormSubmits} → {row.demoFormSuccesses}<br />
                      {row.clickRateFromHomeView}% / {row.demoSubmitRateFromClicks}% / {row.demoSuccessRateFromSubmits}%
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {row.contactPageViews} → {row.contactFormSubmits} → {row.contactFormSuccesses}<br />
                      {row.contactSubmitRateFromViews}% / {row.contactSuccessRateFromSubmits}%
                    </td>
                  </tr>
                ))}
                {sessionRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      Aucune session détectée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <h2 className="text-lg font-semibold text-slate-900">Événements récents</h2>
          <p className="mt-1 text-xs text-slate-500">Derniers 25 événements stockés localement ({getPeriodLabel(period)}): {filteredEvents.length}</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Params</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice(-25).reverse().map(event => (
                  <tr key={`${event.createdAt}-${event.name}`} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2 text-slate-600">{new Date(event.createdAt).toLocaleString('fr-FR')}</td>
                    <td className="px-3 py-2 font-medium text-slate-900">{event.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{JSON.stringify(event.params)}</td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                      Aucun événement disponible pour le moment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
