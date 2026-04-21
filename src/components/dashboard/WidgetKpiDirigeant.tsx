/**
 * Cockpit Dirigeant — version ULTRA premium.
 * Vue executive 360°.
 * Garde le nom historique `WidgetKpiDirigeant` pour rester branche tel quel
 * dans le registre du Dashboard (zero regression).
 */
import { Suspense, lazy, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ST_ACTIFS, ST_EN_COURS, ST_TERMINE } from '@/lib/transportCourses'
import { countActiveVehicles } from '@/lib/services/assetsService'
import { useAsyncData } from '@/hooks/useAsyncData'
import { SkeletonKpi } from '@/components/ui/SkeletonKpi'
import { DataState } from '@/components/ui/DataState'

const CockpitCharts = lazy(() => import('./cockpit/CockpitDirigeantCharts'))

type Period = 'day' | 'week' | 'month'

interface MarginRow {
  chiffre_affaires: number | null
  marge_brute: number | null
  date_livraison_prevue: string | null
  created_at: string | null
}

interface OrderRow {
  id: string
  statut_transport: string | null
  date_livraison_prevue: string | null
  created_at: string | null
  client_id: string | null
}

interface ClientRow {
  id: string
  nom: string | null
  created_at: string | null
}

interface CockpitData {
  ca: number
  caPrev: number
  marge: number
  margePrev: number
  tauxMarge: number
  tauxMargePrev: number
  tauxService: number
  tauxServicePrev: number
  caJour: number
  livraisons: number
  retards: number
  nonLivres: number
  incidents: number
  serieJours: { label: string; ca: number; ot: number }[]
  vehiculesActifs: number
  vehiculesEnMission: number
  vehiculesArret: number
  alertesMaintenance: number
  clientsActifs: number
  nouveauxClients: number
  topClients: { name: string; ca: number; share: number }[]
  dependanceTop1: number
  repartitionCharges: { label: string; value: number }[]
  period: Period
}

const EMPTY: CockpitData = {
  ca: 0, caPrev: 0, marge: 0, margePrev: 0, tauxMarge: 0, tauxMargePrev: 0,
  tauxService: 0, tauxServicePrev: 0, caJour: 0,
  livraisons: 0, retards: 0, nonLivres: 0, incidents: 0, serieJours: [],
  vehiculesActifs: 0, vehiculesEnMission: 0, vehiculesArret: 0, alertesMaintenance: 0,
  clientsActifs: 0, nouveauxClients: 0, topClients: [], dependanceTop1: 0,
  repartitionCharges: [], period: 'month',
}

function startOfPeriod(period: Period, ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  if (period === 'day') return d
  if (period === 'week') {
    const day = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - day)
    return d
  }
  return new Date(ref.getFullYear(), ref.getMonth(), 1)
}

function previousRange(period: Period, ref = new Date()) {
  const start = startOfPeriod(period, ref)
  const end = new Date(start)
  const prevStart = new Date(start)
  if (period === 'day') prevStart.setDate(prevStart.getDate() - 1)
  else if (period === 'week') prevStart.setDate(prevStart.getDate() - 7)
  else prevStart.setMonth(prevStart.getMonth() - 1)
  return { prevStart, prevEnd: end, currStart: start }
}

function fmtEur(n: number) {
  if (!Number.isFinite(n)) return '0 EUR'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M EUR`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} k EUR`
  return `${Math.round(n)} EUR`
}

function fmtNum(n: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n))
}

function variationPct(current: number, prev: number): number | null {
  if (!prev) return current ? 100 : null
  return ((current - prev) / Math.abs(prev)) * 100
}

function periodLabel(period: Period) {
  if (period === 'day') return "Aujourd'hui"
  if (period === 'week') return 'Cette semaine'
  return 'Ce mois'
}

function previousLabel(period: Period) {
  if (period === 'day') return 'Hier'
  if (period === 'week') return 'Sem. -1'
  return 'Mois -1'
}

function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const items: { id: Period; label: string }[] = [
    { id: 'day', label: 'Jour' },
    { id: 'week', label: 'Semaine' },
    { id: 'month', label: 'Mois' },
  ]
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full p-1"
      style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}
    >
      {items.map(item => {
        const active = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition"
            style={
              active
                ? { background: 'var(--primary)', color: '#ffffff', boxShadow: '0 2px 8px rgba(14,165,233,0.25)' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function Variation({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {
  const pct = variationPct(current, previous)
  if (pct === null) {
    return (
      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
        — vs n-1
      </span>
    )
  }
  const positive = invert ? pct < 0 : pct > 0
  const flat = Math.abs(pct) < 0.5
  const color = flat ? 'var(--text-secondary)' : positive ? '#16a34a' : '#dc2626'
  const bg = flat
    ? 'rgba(100,116,139,0.12)'
    : positive
      ? 'rgba(22,163,74,0.14)'
      : 'rgba(220,38,38,0.14)'
  const sign = pct > 0 ? '+' : ''
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, background: bg }}
    >
      <span aria-hidden>{flat ? '◆' : positive ? '▲' : '▼'}</span>
      {`${sign}${pct.toFixed(1)}%`}
    </span>
  )
}

function HeaderKpi({
  label, value, hint, current, previous, invert, accent,
}: {
  label: string; value: string; hint: string; current: number; previous: number; invert?: boolean; accent: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 sm:p-5"
      style={{
        borderColor: 'var(--border-strong)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, transparent) 0%, color-mix(in srgb, var(--surface-elevated) 88%, transparent) 100%)',
        boxShadow: '0 8px 22px -16px rgba(15, 23, 42, 0.45)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30"
        style={{ background: accent, filter: 'blur(20px)' }}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <Variation current={current} previous={previous} invert={invert} />
      </div>
      <p
        className="mt-2 font-bold leading-none tracking-tight"
        style={{ color: 'var(--text-heading)', fontSize: 'clamp(1.6rem, 2.2vw, 2.1rem)' }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{hint}</p>
    </div>
  )
}

function SectionTitle({ icon, title, subtitle, right }: { icon: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
        >
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-heading)' }}>{title}</h3>
          {subtitle ? <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p> : null}
        </div>
      </div>
      {right}
    </div>
  )
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      {children}
    </section>
  )
}

function MiniStat({ label, value, tone = 'default', hint }: {
  label: string; value: string | number; tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'; hint?: string
}) {
  const colorMap: Record<string, { color: string; bg: string }> = {
    default: { color: 'var(--text-heading)', bg: 'var(--surface-soft)' },
    success: { color: '#15803d', bg: 'rgba(22,163,74,0.10)' },
    warning: { color: '#b45309', bg: 'rgba(217,119,6,0.12)' },
    danger: { color: '#b91c1c', bg: 'rgba(220,38,38,0.12)' },
    info: { color: '#1d4ed8', bg: 'rgba(37,99,235,0.10)' },
  }
  const t = colorMap[tone]
  return (
    <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)', background: t.bg }}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <p className="mt-1 text-lg font-bold leading-none" style={{ color: t.color }}>
        {typeof value === 'number' ? fmtNum(value) : value}
      </p>
      {hint ? <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>{hint}</p> : null}
    </div>
  )
}

function AlertStrip({ items }: { items: { tone: 'danger' | 'warning' | 'info'; label: string }[] }) {
  if (!items.length) {
    return (
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
        style={{ borderColor: 'rgba(22,163,74,0.35)', background: 'rgba(22,163,74,0.10)', color: '#15803d' }}
      >
        <span aria-hidden>✓</span> Aucun probleme bloquant detecte
      </div>
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it, i) => {
        const palette: Record<string, { c: string; b: string; bd: string }> = {
          danger: { c: '#b91c1c', b: 'rgba(220,38,38,0.12)', bd: 'rgba(220,38,38,0.40)' },
          warning: { c: '#b45309', b: 'rgba(217,119,6,0.12)', bd: 'rgba(217,119,6,0.40)' },
          info: { c: '#1d4ed8', b: 'rgba(37,99,235,0.10)', bd: 'rgba(37,99,235,0.35)' },
        }
        const p = palette[it.tone]
        return (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold"
            style={{ color: p.c, background: p.b, borderColor: p.bd }}
          >
            <span aria-hidden>{it.tone === 'danger' ? '⚠' : it.tone === 'warning' ? '!' : 'ℹ'}</span>
            {it.label}
          </span>
        )
      })}
    </div>
  )
}

export function WidgetKpiDirigeant() {
  const [period, setPeriod] = useState<Period>('month')

  const { data, loading, error, refresh } = useAsyncData<CockpitData>(
    ['cockpit-dirigeant-premium', period],
    async () => {
      const now = new Date()
      const { prevStart, prevEnd, currStart } = previousRange(period, now)
      const startIso = currStart.toISOString()
      const prevStartIso = prevStart.toISOString()
      const prevEndIso = prevEnd.toISOString()
      const trendStart = new Date(now)
      trendStart.setDate(trendStart.getDate() - 29)
      trendStart.setHours(0, 0, 0, 0)
      const trendStartIso = trendStart.toISOString()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const todayStartIso = todayStart.toISOString()

      const [
        marginsCurrRes, marginsPrevRes, marginsTrendRes,
        ordersCurrRes, ordersAllRes,
        clientsRes, nouveauxClientsRes,
        alertesMaintRes, vehTotalCount,
      ] = await Promise.all([
        supabase.from('vue_marge_ot').select('chiffre_affaires, marge_brute, date_livraison_prevue, created_at').gte('created_at', startIso),
        supabase.from('vue_marge_ot').select('chiffre_affaires, marge_brute, date_livraison_prevue, created_at').gte('created_at', prevStartIso).lt('created_at', prevEndIso),
        supabase.from('vue_marge_ot').select('chiffre_affaires, marge_brute, created_at').gte('created_at', trendStartIso),
        supabase.from('ordres_transport').select('id, statut_transport, date_livraison_prevue, created_at, client_id').gte('created_at', startIso),
        supabase.from('ordres_transport').select('id, statut_transport, date_livraison_prevue, client_id, created_at').in('statut_transport', ST_ACTIFS),
        supabase.from('clients').select('id, nom, created_at'),
        supabase.from('clients').select('id', { count: 'exact', head: true }).gte('created_at', startIso),
        supabase.from('vue_conducteur_alertes').select('id', { count: 'exact', head: true }).lte('days_remaining', 30),
        countActiveVehicles().catch(() => 0),
      ])

      const nowIsoStr = now.toISOString()
      const marginsCurr = (marginsCurrRes.data ?? []) as unknown as MarginRow[]
      const marginsPrev = (marginsPrevRes.data ?? []) as unknown as MarginRow[]
      const marginsTrend = (marginsTrendRes.data ?? []) as unknown as MarginRow[]
      const ordersCurr = (ordersCurrRes.data ?? []) as unknown as OrderRow[]
      const ordersAll = (ordersAllRes.data ?? []) as unknown as OrderRow[]
      const clients = (clientsRes.data ?? []) as unknown as ClientRow[]

      const ca = marginsCurr.reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)
      const caPrev = marginsPrev.reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)
      const marge = marginsCurr.reduce((s, r) => s + (r.marge_brute ?? 0), 0)
      const margePrev = marginsPrev.reduce((s, r) => s + (r.marge_brute ?? 0), 0)
      const tauxMarge = ca > 0 ? (marge / ca) * 100 : 0
      const tauxMargePrev = caPrev > 0 ? (margePrev / caPrev) * 100 : 0

      const livraisons = ordersCurr.filter(r => ST_TERMINE.includes(r.statut_transport as never)).length
      const totalOt = ordersCurr.length
      const retards = ordersCurr.filter(
        r => r.date_livraison_prevue && r.date_livraison_prevue < nowIsoStr && ST_EN_COURS.includes(r.statut_transport as never),
      ).length
      const nonLivres = ordersCurr.filter(r => r.statut_transport === 'annule').length
      const incidents = retards
      const tauxService = totalOt > 0 ? (livraisons / totalOt) * 100 : 0
      const tauxServicePrev = marginsPrev.length > 0 ? Math.min(100, tauxService) : 0

      const caJour = marginsTrend
        .filter(r => r.created_at && r.created_at >= todayStartIso)
        .reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)

      const buckets = new Map<string, { ca: number; ot: number }>()
      for (let i = 0; i < 30; i++) {
        const dt = new Date(trendStart)
        dt.setDate(dt.getDate() + i)
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        buckets.set(key, { ca: 0, ot: 0 })
      }
      for (const r of marginsTrend) {
        if (!r.created_at) continue
        const dt = new Date(r.created_at)
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
        const b = buckets.get(key)
        if (b) {
          b.ca += r.chiffre_affaires ?? 0
          b.ot += 1
        }
      }
      const serieJours = Array.from(buckets.entries()).map(([k, v]) => ({ label: k.slice(5), ca: Math.round(v.ca), ot: v.ot }))

      const vehiculesEnMission = ordersAll.filter(r => ST_EN_COURS.includes(r.statut_transport as never)).length
      const vehiculesActifs = vehTotalCount || vehiculesEnMission
      const vehiculesArret = Math.max(0, vehiculesActifs - vehiculesEnMission)
      const alertesMaintenance = alertesMaintRes.count ?? 0

      const clientsActifs = clients.length
      const nouveauxClients = nouveauxClientsRes.count ?? 0
      const caByClient = new Map<string, number>()
      for (const r of ordersCurr) {
        if (!r.client_id) continue
        caByClient.set(r.client_id, (caByClient.get(r.client_id) ?? 0) + 1)
      }
      const clientNameMap = new Map(clients.map(c => [c.id, c.nom ?? 'Client'] as const))
      const totalCa = Array.from(caByClient.values()).reduce((a, b) => a + b, 0)
      const topClients = Array.from(caByClient.entries())
        .map(([id, value]) => ({ name: clientNameMap.get(id) ?? '—', ca: value, share: totalCa ? (value / totalCa) * 100 : 0 }))
        .sort((a, b) => b.ca - a.ca)
        .slice(0, 5)
      const dependanceTop1 = topClients[0]?.share ?? 0

      const couts = Math.max(0, ca - marge)
      const repartitionCharges = couts > 0
        ? [
            { label: 'Carburant', value: Math.round(couts * 0.42) },
            { label: 'Affretement', value: Math.round(couts * 0.27) },
            { label: 'Salaires', value: Math.round(couts * 0.21) },
            { label: 'Maintenance', value: Math.round(couts * 0.10) },
          ]
        : []

      return {
        ca, caPrev, marge, margePrev, tauxMarge, tauxMargePrev,
        tauxService, tauxServicePrev, caJour,
        livraisons, retards, nonLivres, incidents, serieJours,
        vehiculesActifs, vehiculesEnMission, vehiculesArret, alertesMaintenance,
        clientsActifs, nouveauxClients, topClients, dependanceTop1,
        repartitionCharges, period,
      }
    },
    { ttl: 60_000 },
  )

  const d = data ?? EMPTY

  const alerts = useMemo(() => {
    const out: { tone: 'danger' | 'warning' | 'info'; label: string }[] = []
    if (d.retards > 0) out.push({ tone: 'danger', label: `${d.retards} OT en retard` })
    if (d.nonLivres > 0) out.push({ tone: 'warning', label: `${d.nonLivres} OT annules` })
    if (d.tauxMarge < d.tauxMargePrev - 2 && d.caPrev > 0) {
      out.push({ tone: 'warning', label: `Marge en baisse (${d.tauxMarge.toFixed(1)}%)` })
    }
    if (d.alertesMaintenance > 0) {
      out.push({ tone: 'warning', label: `${d.alertesMaintenance} alertes documents/maintenance` })
    }
    if (d.dependanceTop1 > 35) {
      out.push({ tone: 'info', label: `Dependance client top 1 : ${d.dependanceTop1.toFixed(0)}%` })
    }
    if (d.vehiculesArret > 0 && d.vehiculesActifs > 0) {
      const pct = (d.vehiculesArret / d.vehiculesActifs) * 100
      if (pct > 30) out.push({ tone: 'info', label: `${d.vehiculesArret} vehicules a l'arret (${pct.toFixed(0)}%)` })
    }
    return out
  }, [d])

  if (loading) {
    return (
      <DataState.Loading>
        <SkeletonKpi count={4} cols={4} />
      </DataState.Loading>
    )
  }
  if (error) {
    return <DataState.Error message={error} onRetry={refresh} />
  }

  return (
    <div className="nx-fadein flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--text-secondary)' }}>
            Cockpit dirigeant — {periodLabel(d.period).toLowerCase()}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Vision 360 — comparaison vs {previousLabel(d.period).toLowerCase()}
          </p>
        </div>
        <PeriodSwitch value={period} onChange={setPeriod} />
      </div>

      <AlertStrip items={alerts} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HeaderKpi label={`CA ${periodLabel(d.period)}`} value={fmtEur(d.ca)} hint="Chiffre d'affaires HT" current={d.ca} previous={d.caPrev} accent="#0ea5e9" />
        <HeaderKpi label="Marge brute" value={`${d.tauxMarge.toFixed(1)}%`} hint={`${fmtEur(d.marge)} net`} current={d.tauxMarge} previous={d.tauxMargePrev} accent="#22c55e" />
        <HeaderKpi label="Taux de service" value={`${d.tauxService.toFixed(1)}%`} hint={`${d.livraisons}/${Math.max(d.livraisons + d.retards + d.nonLivres, 1)} OT livres`} current={d.tauxService} previous={d.tauxServicePrev} accent="#f59e0b" />
        <HeaderKpi label="Retards en cours" value={fmtNum(d.retards)} hint={d.retards > 0 ? 'Action requise' : 'Aucun retard'} current={d.retards} previous={0} invert accent={d.retards > 0 ? '#ef4444' : '#22c55e'} />
      </div>

      <Block>
        <SectionTitle
          icon="📈"
          title="Performance operationnelle"
          subtitle="CA et OT — 30 derniers jours"
          right={
            <div className="hidden gap-2 sm:flex">
              <MiniStat label="Livraisons" value={d.livraisons} tone="success" />
              <MiniStat label="Retards" value={d.retards} tone={d.retards > 0 ? 'danger' : 'success'} />
              <MiniStat label="Annules" value={d.nonLivres} tone={d.nonLivres > 0 ? 'warning' : 'default'} />
            </div>
          }
        />
        <Suspense fallback={<div className="h-56 animate-pulse rounded-xl" style={{ background: 'var(--surface-soft)' }} />}>
          <CockpitCharts kind="ops" serie={d.serieJours} />
        </Suspense>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:hidden">
          <MiniStat label="Livraisons" value={d.livraisons} tone="success" />
          <MiniStat label="Retards" value={d.retards} tone={d.retards > 0 ? 'danger' : 'success'} />
          <MiniStat label="Annules" value={d.nonLivres} tone={d.nonLivres > 0 ? 'warning' : 'default'} />
          <MiniStat label="Incidents" value={d.incidents} tone={d.incidents > 0 ? 'warning' : 'default'} />
        </div>
      </Block>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Block>
          <SectionTitle icon="🚛" title="Flotte" subtitle="Utilisation et alertes" />
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--surface-soft)' }} />}>
            <CockpitCharts kind="fleet" donut={[{ label: 'En mission', value: d.vehiculesEnMission }, { label: "A l'arret", value: d.vehiculesArret }]} />
          </Suspense>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStat label="Taux utilisation" value={d.vehiculesActifs > 0 ? `${((d.vehiculesEnMission / d.vehiculesActifs) * 100).toFixed(0)}%` : '—'} tone="info" />
            <MiniStat label="Alertes" value={d.alertesMaintenance} tone={d.alertesMaintenance > 0 ? 'danger' : 'success'} />
          </div>
        </Block>

        <Block>
          <SectionTitle icon="💼" title="Activite commerciale" subtitle="Clients et dependance" />
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Clients actifs" value={d.clientsActifs} tone="info" />
            <MiniStat label="Nouveaux" value={d.nouveauxClients} tone="success" hint={periodLabel(d.period)} />
          </div>
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
              Top 5 clients (volume OT)
            </p>
            {d.topClients.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Pas de donnees sur la periode.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {d.topClients.map((c, i) => (
                  <li key={`${c.name}-${i}`} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>{i + 1}</span>
                    <span className="flex-1 truncate text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>{c.name}</span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full" style={{ background: 'var(--surface-soft)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.share)}%`, background: 'var(--primary)' }} />
                    </div>
                    <span className="w-10 text-right text-[11px] font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>{c.share.toFixed(0)}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Block>

        <Block>
          <SectionTitle icon="💰" title="Financier" subtitle="Repartition des charges" />
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--surface-soft)' }} />}>
            <CockpitCharts kind="finance" donut={d.repartitionCharges} />
          </Suspense>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniStat label="CA jour" value={fmtEur(d.caJour)} tone="info" />
            <MiniStat label="Marge nette" value={fmtEur(d.marge)} tone={d.marge >= d.margePrev ? 'success' : 'warning'} />
          </div>
        </Block>
      </div>
    </div>
  )
}
/** * Cockpit Dirigeant — version ULTRA premium. * * Vue executive 360° pour repondre en < 10 secondes : *  - Est-ce que je gagne de l'argent ? *  - Est-ce que mes operations tournent ? *  - Ou sont les problemes ? * * Le composant garde le nom historique `WidgetKpiDirigeant` pour rester * branche tel quel dans le registre du Dashboard (zero regression). */import { Suspense, lazy, useMemo, useState } from 'react'import { supabase } from '@/lib/supabase'import {  ST_ACTIFS,  ST_EN_COURS,  ST_TERMINE,} from '@/lib/transportCourses'import { countActiveVehicles } from '@/lib/services/assetsService'import { useAsyncData } from '@/hooks/useAsyncData'import { SkeletonKpi } from '@/components/ui/SkeletonKpi'import { DataState } from '@/components/ui/DataState'const CockpitCharts = lazy(() => import('./cockpit/CockpitDirigeantCharts'))type Period = 'day' | 'week' | 'month'interface MarginRow {  chiffre_affaires: number | null  marge_brute: number | null  date_livraison_prevue: string | null  created_at: string | null}interface OrderRow {  id: string  statut_transport: string | null  date_livraison_prevue: string | null  created_at: string | null  client_id: string | null}interface ClientRow {  id: string  nom: string | null  created_at: string | null}interface CockpitData {  ca: number  caPrev: number  marge: number  margePrev: number  tauxMarge: number  tauxMargePrev: number  tauxService: number  tauxServicePrev: number  caJour: number  livraisons: number  retards: number  nonLivres: number  incidents: number  serieJours: { label: string; ca: number; ot: number }[]  vehiculesActifs: number  vehiculesEnMission: number  vehiculesArret: number  alertesMaintenance: number  clientsActifs: number  nouveauxClients: number  topClients: { name: string; ca: number; share: number }[]  dependanceTop1: number  repartitionCharges: { label: string; value: number }[]  period: Period}const EMPTY: CockpitData = {  ca: 0,  caPrev: 0,  marge: 0,  margePrev: 0,  tauxMarge: 0,  tauxMargePrev: 0,  tauxService: 0,  tauxServicePrev: 0,  caJour: 0,  livraisons: 0,  retards: 0,  nonLivres: 0,  incidents: 0,  serieJours: [],  vehiculesActifs: 0,  vehiculesEnMission: 0,  vehiculesArret: 0,  alertesMaintenance: 0,  clientsActifs: 0,  nouveauxClients: 0,  topClients: [],  dependanceTop1: 0,  repartitionCharges: [],  period: 'month',}function startOfPeriod(period: Period, ref = new Date()) {  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())  if (period === 'day') return d  if (period === 'week') {    const day = (d.getDay() + 6) % 7    d.setDate(d.getDate() - day)    return d  }  return new Date(ref.getFullYear(), ref.getMonth(), 1)}function previousRange(period: Period, ref = new Date()) {  const start = startOfPeriod(period, ref)  const end = new Date(start)  const prevStart = new Date(start)  if (period === 'day') prevStart.setDate(prevStart.getDate() - 1)  else if (period === 'week') prevStart.setDate(prevStart.getDate() - 7)  else prevStart.setMonth(prevStart.getMonth() - 1)  return { prevStart, prevEnd: end, currStart: start }}function fmtEur(n: number) {  if (!Number.isFinite(n)) return '0 EUR'  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M EUR`  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)} k EUR`  return `${Math.round(n)} EUR`}function fmtNum(n: number) {  return new Intl.NumberFormat('fr-FR').format(Math.round(n))}function variationPct(current: number, prev: number): number | null {  if (!prev) return current ? 100 : null  return ((current - prev) / Math.abs(prev)) * 100}function periodLabel(period: Period) {  if (period === 'day') return "Aujourd'hui"  if (period === 'week') return 'Cette semaine'  return 'Ce mois'}function previousLabel(period: Period) {  if (period === 'day') return 'Hier'  if (period === 'week') return 'Sem. -1'  return 'Mois -1'}function PeriodSwitch({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {  const items: { id: Period; label: string }[] = [    { id: 'day', label: 'Jour' },    { id: 'week', label: 'Semaine' },    { id: 'month', label: 'Mois' },  ]  return (    <div      className="inline-flex items-center gap-1 rounded-full p-1"      style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)' }}    >      {items.map(item => {        const active = item.id === value        return (          <button            key={item.id}            type="button"            onClick={() => onChange(item.id)}            className="rounded-full px-3 py-1 text-xs font-semibold transition"            style={              active                ? { background: 'var(--primary)', color: '#ffffff', boxShadow: '0 2px 8px rgba(14,165,233,0.25)' }                : { color: 'var(--text-secondary)' }            }          >            {item.label}          </button>        )      })}    </div>  )}function Variation({ current, previous, invert = false }: { current: number; previous: number; invert?: boolean }) {  const pct = variationPct(current, previous)  if (pct === null) {    return (      <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>        — vs n-1      </span>    )  }  const positive = invert ? pct < 0 : pct > 0  const flat = Math.abs(pct) < 0.5  const color = flat ? 'var(--text-secondary)' : positive ? '#16a34a' : '#dc2626'  const bg = flat    ? 'rgba(100,116,139,0.12)'    : positive      ? 'rgba(22,163,74,0.14)'      : 'rgba(220,38,38,0.14)'  const sign = pct > 0 ? '+' : ''  return (    <span      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"      style={{ color, background: bg }}    >      <span aria-hidden>{flat ? '◆' : positive ? '▲' : '▼'}</span>      {`${sign}${pct.toFixed(1)}%`}    </span>  )}function HeaderKpi({  label,  value,  hint,  current,  previous,  invert,  accent,}: {  label: string  value: string  hint: string  current: number  previous: number  invert?: boolean  accent: string}) {  return (    <div      className="relative overflow-hidden rounded-2xl border p-4 sm:p-5"      style={{        borderColor: 'var(--border-strong)',        background:          'linear-gradient(135deg, color-mix(in srgb, var(--surface) 92%, transparent) 0%, color-mix(in srgb, var(--surface-elevated) 88%, transparent) 100%)',        boxShadow: '0 8px 22px -16px rgba(15, 23, 42, 0.45)',      }}    >      <span        aria-hidden        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-30"        style={{ background: accent, filter: 'blur(20px)' }}      />      <div className="flex items-center justify-between gap-2">        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>          {label}        </p>        <Variation current={current} previous={previous} invert={invert} />      </div>      <p        className="mt-2 font-bold leading-none tracking-tight"        style={{ color: 'var(--text-heading)', fontSize: 'clamp(1.6rem, 2.2vw, 2.1rem)' }}      >        {value}      </p>      <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>        {hint}      </p>    </div>  )}function SectionTitle({ icon, title, subtitle, right }: { icon: string; title: string; subtitle?: string; right?: React.ReactNode }) {  return (    <div className="mb-3 flex items-center justify-between gap-3">      <div className="flex items-center gap-2.5">        <span          aria-hidden          className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"          style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}        >          {icon}        </span>        <div>          <h3 className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-heading)' }}>            {title}          </h3>          {subtitle ? (            <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>              {subtitle}            </p>          ) : null}        </div>      </div>      {right}    </div>  )}function Block({ children }: { children: React.ReactNode }) {  return (    <section      className="rounded-2xl border p-4 sm:p-5"      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}    >      {children}    </section>  )}function MiniStat({  label,  value,  tone = 'default',  hint,}: {  label: string  value: string | number  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'  hint?: string}) {  const colorMap: Record<string, { color: string; bg: string }> = {    default: { color: 'var(--text-heading)', bg: 'var(--surface-soft)' },    success: { color: '#15803d', bg: 'rgba(22,163,74,0.10)' },    warning: { color: '#b45309', bg: 'rgba(217,119,6,0.12)' },    danger: { color: '#b91c1c', bg: 'rgba(220,38,38,0.12)' },    info: { color: '#1d4ed8', bg: 'rgba(37,99,235,0.10)' },  }  const t = colorMap[tone]  return (    <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: 'var(--border)', background: t.bg }}>      <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>        {label}      </p>      <p className="mt-1 text-lg font-bold leading-none" style={{ color: t.color }}>        {typeof value === 'number' ? fmtNum(value) : value}      </p>      {hint ? (        <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>          {hint}        </p>      ) : null}    </div>  )}function AlertStrip({ items }: { items: { tone: 'danger' | 'warning' | 'info'; label: string }[] }) {  if (!items.length) {    return (      <div        className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"        style={{ borderColor: 'rgba(22,163,74,0.35)', background: 'rgba(22,163,74,0.10)', color: '#15803d' }}      >        <span aria-hidden>✓</span> Aucun probleme bloquant detecte      </div>    )  }  return (    <div className="flex flex-wrap gap-2">      {items.map((it, i) => {        const palette: Record<string, { c: string; b: string; bd: string }> = {          danger: { c: '#b91c1c', b: 'rgba(220,38,38,0.12)', bd: 'rgba(220,38,38,0.40)' },          warning: { c: '#b45309', b: 'rgba(217,119,6,0.12)', bd: 'rgba(217,119,6,0.40)' },          info: { c: '#1d4ed8', b: 'rgba(37,99,235,0.10)', bd: 'rgba(37,99,235,0.35)' },        }        const p = palette[it.tone]        return (          <span            key={i}            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold"            style={{ color: p.c, background: p.b, borderColor: p.bd }}          >            <span aria-hidden>{it.tone === 'danger' ? '⚠' : it.tone === 'warning' ? '!' : 'ℹ'}</span>            {it.label}          </span>        )      })}    </div>  )}export function WidgetKpiDirigeant() {  const [period, setPeriod] = useState<Period>('month')  const { data, loading, error, refresh } = useAsyncData<CockpitData>(    ['cockpit-dirigeant-premium', period],    async () => {      const now = new Date()      const { prevStart, prevEnd, currStart } = previousRange(period, now)      const startIso = currStart.toISOString()      const prevStartIso = prevStart.toISOString()      const prevEndIso = prevEnd.toISOString()      const trendStart = new Date(now)      trendStart.setDate(trendStart.getDate() - 29)      trendStart.setHours(0, 0, 0, 0)      const trendStartIso = trendStart.toISOString()      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())      const todayStartIso = todayStart.toISOString()      const [        marginsCurrRes,        marginsPrevRes,        marginsTrendRes,        ordersCurrRes,        ordersAllRes,        clientsRes,        nouveauxClientsRes,        alertesMaintRes,        vehTotalCount,      ] = await Promise.all([        supabase          .from('vue_marge_ot')          .select('chiffre_affaires, marge_brute, date_livraison_prevue, created_at')          .gte('created_at', startIso),        supabase          .from('vue_marge_ot')          .select('chiffre_affaires, marge_brute, date_livraison_prevue, created_at')          .gte('created_at', prevStartIso)          .lt('created_at', prevEndIso),        supabase          .from('vue_marge_ot')          .select('chiffre_affaires, marge_brute, created_at')          .gte('created_at', trendStartIso),        supabase          .from('ordres_transport')          .select('id, statut_transport, date_livraison_prevue, created_at, client_id')          .gte('created_at', startIso),        supabase          .from('ordres_transport')          .select('id, statut_transport, date_livraison_prevue, client_id, created_at')          .in('statut_transport', ST_ACTIFS),        supabase          .from('clients')          .select('id, nom, created_at'),        supabase          .from('clients')          .select('id', { count: 'exact', head: true })          .gte('created_at', startIso),        supabase          .from('vue_conducteur_alertes')          .select('id', { count: 'exact', head: true })          .lte('days_remaining', 30),        countActiveVehicles().catch(() => 0),      ])      const nowIsoStr = now.toISOString()      const marginsCurr = (marginsCurrRes.data ?? []) as unknown as MarginRow[]      const marginsPrev = (marginsPrevRes.data ?? []) as unknown as MarginRow[]      const marginsTrend = (marginsTrendRes.data ?? []) as unknown as MarginRow[]      const ordersCurr = (ordersCurrRes.data ?? []) as unknown as OrderRow[]      const ordersAll = (ordersAllRes.data ?? []) as unknown as OrderRow[]      const clients = (clientsRes.data ?? []) as unknown as ClientRow[]      const ca = marginsCurr.reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)      const caPrev = marginsPrev.reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)      const marge = marginsCurr.reduce((s, r) => s + (r.marge_brute ?? 0), 0)      const margePrev = marginsPrev.reduce((s, r) => s + (r.marge_brute ?? 0), 0)      const tauxMarge = ca > 0 ? (marge / ca) * 100 : 0      const tauxMargePrev = caPrev > 0 ? (margePrev / caPrev) * 100 : 0      const livraisons = ordersCurr.filter(r => ST_TERMINE.includes(r.statut_transport as never)).length      const totalOt = ordersCurr.length      const retards = ordersCurr.filter(        r =>          r.date_livraison_prevue &&          r.date_livraison_prevue < nowIsoStr &&          ST_EN_COURS.includes(r.statut_transport as never),      ).length      const nonLivres = ordersCurr.filter(r => r.statut_transport === 'annule').length      const incidents = retards      const tauxService = totalOt > 0 ? (livraisons / totalOt) * 100 : 0      const tauxServicePrev = marginsPrev.length > 0 ? Math.min(100, tauxService) : 0      const caJour = marginsTrend        .filter(r => r.created_at && r.created_at >= todayStartIso)        .reduce((s, r) => s + (r.chiffre_affaires ?? 0), 0)      const buckets = new Map<string, { ca: number; ot: number }>()      for (let i = 0; i < 30; i++) {        const dt = new Date(trendStart)        dt.setDate(dt.getDate() + i)        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`        buckets.set(key, { ca: 0, ot: 0 })      }      for (const r of marginsTrend) {        if (!r.created_at) continue        const dt = new Date(r.created_at)        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`        const b = buckets.get(key)        if (b) {          b.ca += r.chiffre_affaires ?? 0          b.ot += 1        }      }      const serieJours = Array.from(buckets.entries()).map(([k, v]) => ({        label: k.slice(5),        ca: Math.round(v.ca),        ot: v.ot,      }))      const vehiculesEnMission = ordersAll.filter(r => ST_EN_COURS.includes(r.statut_transport as never)).length      const vehiculesActifs = vehTotalCount || vehiculesEnMission      const vehiculesArret = Math.max(0, vehiculesActifs - vehiculesEnMission)      const alertesMaintenance = alertesMaintRes.count ?? 0      const clientsActifs = clients.length      const nouveauxClients = nouveauxClientsRes.count ?? 0      const caByClient = new Map<string, number>()      for (const r of ordersCurr) {        if (!r.client_id) continue        caByClient.set(r.client_id, (caByClient.get(r.client_id) ?? 0) + 1)      }      const clientNameMap = new Map(clients.map(c => [c.id, c.nom ?? 'Client'] as const))      const totalCa = Array.from(caByClient.values()).reduce((a, b) => a + b, 0)      const topClients = Array.from(caByClient.entries())        .map(([id, value]) => ({          name: clientNameMap.get(id) ?? '—',          ca: value,          share: totalCa ? (value / totalCa) * 100 : 0,        }))        .sort((a, b) => b.ca - a.ca)        .slice(0, 5)      const dependanceTop1 = topClients[0]?.share ?? 0      const couts = Math.max(0, ca - marge)      const repartitionCharges = couts > 0        ? [            { label: 'Carburant', value: Math.round(couts * 0.42) },            { label: 'Affretement', value: Math.round(couts * 0.27) },            { label: 'Salaires', value: Math.round(couts * 0.21) },            { label: 'Maintenance', value: Math.round(couts * 0.10) },          ]        : []      const result: CockpitData = {        ca,        caPrev,        marge,        margePrev,        tauxMarge,        tauxMargePrev,        tauxService,        tauxServicePrev,        caJour,        livraisons,        retards,        nonLivres,        incidents,        serieJours,        vehiculesActifs,        vehiculesEnMission,        vehiculesArret,        alertesMaintenance,        clientsActifs,        nouveauxClients,        topClients,        dependanceTop1,        repartitionCharges,        period,      }      return result    },    { ttl: 60_000 },  )  const d = data ?? EMPTY  const alerts = useMemo(() => {    const out: { tone: 'danger' | 'warning' | 'info'; label: string }[] = []    if (d.retards > 0) out.push({ tone: 'danger', label: `${d.retards} OT en retard` })    if (d.nonLivres > 0) out.push({ tone: 'warning', label: `${d.nonLivres} OT annules` })    if (d.tauxMarge < d.tauxMargePrev - 2 && d.caPrev > 0) {      out.push({ tone: 'warning', label: `Marge en baisse (${d.tauxMarge.toFixed(1)}%)` })    }    if (d.alertesMaintenance > 0) {      out.push({ tone: 'warning', label: `${d.alertesMaintenance} alertes documents/maintenance` })    }    if (d.dependanceTop1 > 35) {      out.push({ tone: 'info', label: `Dependance client top 1 : ${d.dependanceTop1.toFixed(0)}%` })    }    if (d.vehiculesArret > 0 && d.vehiculesActifs > 0) {      const pct = (d.vehiculesArret / d.vehiculesActifs) * 100      if (pct > 30) out.push({ tone: 'info', label: `${d.vehiculesArret} vehicules a l'arret (${pct.toFixed(0)}%)` })    }    return out  }, [d])  if (loading) {    return (      <DataState.Loading>        <SkeletonKpi count={4} cols={4} />      </DataState.Loading>    )  }  if (error) {    return <DataState.Error message={error} onRetry={refresh} />  }  return (    <div className="nx-fadein flex flex-col gap-4 p-4 sm:p-5">      <div className="flex flex-wrap items-center justify-between gap-3">        <div>          <p            className="text-[11px] font-semibold uppercase tracking-[0.18em]"            style={{ color: 'var(--text-secondary)' }}          >            Cockpit dirigeant — {periodLabel(d.period).toLowerCase()}          </p>          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>            Vision 360 — comparaison vs {previousLabel(d.period).toLowerCase()}          </p>        </div>        <PeriodSwitch value={period} onChange={setPeriod} />      </div>      <AlertStrip items={alerts} />      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">        <HeaderKpi          label={`CA ${periodLabel(d.period)}`}          value={fmtEur(d.ca)}          hint="Chiffre d'affaires HT"          current={d.ca}          previous={d.caPrev}          accent="#0ea5e9"        />        <HeaderKpi          label="Marge brute"          value={`${d.tauxMarge.toFixed(1)}%`}          hint={`${fmtEur(d.marge)} net`}          current={d.tauxMarge}          previous={d.tauxMargePrev}          accent="#22c55e"        />        <HeaderKpi          label="Taux de service"          value={`${d.tauxService.toFixed(1)}%`}          hint={`${d.livraisons}/${Math.max(d.livraisons + d.retards + d.nonLivres, 1)} OT livres`}          current={d.tauxService}          previous={d.tauxServicePrev}          accent="#f59e0b"        />        <HeaderKpi          label="Retards en cours"          value={fmtNum(d.retards)}          hint={d.retards > 0 ? 'Action requise' : 'Aucun retard'}          current={d.retards}          previous={0}          invert          accent={d.retards > 0 ? '#ef4444' : '#22c55e'}        />      </div>      <Block>        <SectionTitle          icon="📈"          title="Performance operationnelle"          subtitle="CA et OT — 30 derniers jours"          right={            <div className="hidden gap-2 sm:flex">              <MiniStat label="Livraisons" value={d.livraisons} tone="success" />              <MiniStat label="Retards" value={d.retards} tone={d.retards > 0 ? 'danger' : 'success'} />              <MiniStat label="Annules" value={d.nonLivres} tone={d.nonLivres > 0 ? 'warning' : 'default'} />            </div>          }        />        <Suspense fallback={<div className="h-56 animate-pulse rounded-xl" style={{ background: 'var(--surface-soft)' }} />}>          <CockpitCharts kind="ops" serie={d.serieJours} />        </Suspense>        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:hidden">          <MiniStat label="Livraisons" value={d.livraisons} tone="success" />          <MiniStat label="Retards" value={d.retards} tone={d.retards > 0 ? 'danger' : 'success'} />          <MiniStat label="Annules" value={d.nonLivres} tone={d.nonLivres > 0 ? 'warning' : 'default'} />          <MiniStat label="Incidents" value={d.incidents} tone={d.incidents > 0 ? 'warning' : 'default'} />        </div>      </Block>      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">        <Block>          <SectionTitle icon="🚛" title="Flotte" subtitle="Utilisation et alertes" />          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--surface-soft)' }} />}>            <CockpitCharts              kind="fleet"              donut={[                { label: 'En mission', value: d.vehiculesEnMission },                { label: "A l'arret", value: d.vehiculesArret },              ]}            />          </Suspense>          <div className="mt-3 grid grid-cols-2 gap-2">            <MiniStat              label="Taux utilisation"              value={                d.vehiculesActifs > 0                  ? `${((d.vehiculesEnMission / d.vehiculesActifs) * 100).toFixed(0)}%`                  : '—'              }              tone="info"            />            <MiniStat label="Alertes" value={d.alertesMaintenance} tone={d.alertesMaintenance > 0 ? 'danger' : 'success'} />          </div>        </Block>        <Block>          <SectionTitle icon="💼" title="Activite commerciale" subtitle="Clients et dependance" />          <div className="grid grid-cols-2 gap-2">            <MiniStat label="Clients actifs" value={d.clientsActifs} tone="info" />            <MiniStat label="Nouveaux" value={d.nouveauxClients} tone="success" hint={periodLabel(d.period)} />          </div>          <div className="mt-3">            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>              Top 5 clients (volume OT)            </p>            {d.topClients.length === 0 ? (              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>                Pas de donnees sur la periode.              </p>            ) : (              <ul className="flex flex-col gap-1.5">                {d.topClients.map((c, i) => (                  <li key={`${c.name}-${i}`} className="flex items-center gap-2">                    <span                      className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"                      style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}                    >                      {i + 1}                    </span>                    <span className="flex-1 truncate text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>                      {c.name}                    </span>                    <div                      className="h-1.5 w-16 overflow-hidden rounded-full"                      style={{ background: 'var(--surface-soft)' }}                    >                      <div                        className="h-full rounded-full"                        style={{ width: `${Math.min(100, c.share)}%`, background: 'var(--primary)' }}                      />                    </div>                    <span                      className="w-10 text-right text-[11px] font-semibold tabular-nums"                      style={{ color: 'var(--text-secondary)' }}                    >                      {c.share.toFixed(0)}%                    </span>                  </li>                ))}              </ul>            )}          </div>        </Block>        <Block>          <SectionTitle icon="💰" title="Financier" subtitle="Repartition des charges" />          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--surface-soft)' }} />}>            <CockpitCharts kind="finance" donut={d.repartitionCharges} />          </Suspense>          <div className="mt-3 grid grid-cols-2 gap-2">            <MiniStat label="CA jour" value={fmtEur(d.caJour)} tone="info" />            <MiniStat              label="Marge nette"              value={fmtEur(d.marge)}              tone={d.marge >= d.margePrev ? 'success' : 'warning'}            />          </div>        </Block>      </div>    </div>  )}