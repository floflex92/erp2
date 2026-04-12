import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROLE_LABELS, useAuth, type Role } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { ST_ACTIFS, ST_EN_COURS, ST_TERMINE } from '@/lib/transportCourses'

type CockpitProfile = 'direction' | 'operations' | 'fleet' | 'finance' | 'commercial'
type NotificationLevel = 'critique' | 'action' | 'alerte' | 'recommandation' | 'info'

type OrderRow = {
  id: string
  reference: string | null
  statut_transport: string | null
  statut_operationnel: string | null
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  prix_ht: number | null
  est_affretee: boolean | null
  facturation_id: string | null
  numero_cmr: string | null
  numero_bl: string | null
  vehicule_id: string | null
  conducteur_id: string | null
  created_at: string | null
}

type MarginRow = {
  id: string | null
  reference: string | null
  client: string | null
  created_at: string | null
  chiffre_affaires: number | null
  marge_brute: number | null
  taux_marge_pct: number | null
  statut: string | null
  date_livraison_prevue: string | null
  date_livraison_reelle: string | null
}

type DriverAlertRow = {
  id: string | null
  conducteur_id: string | null
  alert_type: string | null
  label: string | null
  days_remaining: number | null
  due_on: string | null
}

type FleetAlertRow = {
  id: string | null
  asset_id: string | null
  asset_label: string | null
  asset_type: string | null
  alert_type: string | null
  label: string | null
  days_remaining: number | null
  due_on: string | null
}

type IncidentRow = {
  id: string
  titre: string
  type: string
  priorite: 'critique' | 'elevee' | 'normale'
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'clos'
  created_at: string
}

type DelayRow = {
  id: string
  reference: string
  statut_operationnel: string
  date_livraison_prevue: string | null
  client_nom: string | null
}

type UnassignedRow = {
  id: string
  reference: string
  statut_transport: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  client_nom: string | null
  age_heures: number | null
}

type VehicleStatusRow = {
  id: string
  statut: string | null
}

type SummaryCard = {
  label: string
  value: string
  note: string
  tone: 'blue' | 'green' | 'amber' | 'red' | 'slate'
}

type NotificationItem = {
  id: string
  level: NotificationLevel
  title: string
  detail: string
  impact: string
  actionLabel: string
  to: string
}

type MetricItem = {
  label: string
  value: string
  note: string
  tone: 'blue' | 'green' | 'amber' | 'red' | 'slate'
}

type DecisionItem = {
  label: string
  value: string
  note: string
}

type LinkItem = {
  label: string
  to: string
  helper: string
}

type DistributionSegment = {
  label: string
  value: number
  color: string
  helper: string
}

type RankingItem = {
  label: string
  value: number
  displayValue: string
  helper: string
  color: string
}

type GaugeItem = {
  label: string
  value: number
  target: number
  helper: string
  tone: 'blue' | 'green' | 'amber' | 'red' | 'slate'
}

type GoalPreset = {
  id: string
  label: string
  helper: string
  current: number
  defaultTarget: number
  unit: 'currency' | 'percent' | 'count'
  inverse?: boolean
}

type GoalView = GoalPreset & {
  target: number
  progress: number
  status: 'ahead' | 'watch' | 'behind'
}

type GoalTargetMap = Record<string, number>

type CockpitData = {
  orders: OrderRow[]
  margins: MarginRow[]
  driverAlerts: DriverAlertRow[]
  fleetAlerts: FleetAlertRow[]
  incidents: IncidentRow[]
  delays: DelayRow[]
  unassigned: UnassignedRow[]
  vehicles: VehicleStatusRow[]
}

type CockpitViewModel = {
  summary: SummaryCard[]
  metrics: MetricItem[]
  decisions: DecisionItem[]
  notifications: NotificationItem[]
  quickLinks: LinkItem[]
  distribution: {
    title: string
    subtitle: string
    segments: DistributionSegment[]
  }
  ranking: {
    title: string
    subtitle: string
    items: RankingItem[]
  }
  gauges: GaugeItem[]
  goals: GoalView[]
  meta: {
    roleLabel: string
    updatedAt: string
  }
}

const PROFILE_BY_ROLE: Partial<Record<Role, CockpitProfile>> = {
  dirigeant: 'direction',
  admin: 'direction',
  super_admin: 'direction',
  observateur: 'direction',
  investisseur: 'direction',
  demo: 'direction',
  exploitant: 'operations',
  logisticien: 'operations',
  flotte: 'fleet',
  comptable: 'finance',
  administratif: 'finance',
  facturation: 'finance',
  commercial: 'commercial',
}

const LEVEL_LABELS: Record<NotificationLevel, string> = {
  critique: 'Critique',
  action: 'Action urgente',
  alerte: 'Alerte',
  recommandation: 'Recommandation',
  info: 'Info',
}

const LEVEL_STYLES: Record<NotificationLevel, string> = {
  critique: 'border-red-200 bg-red-50 text-red-800',
  action: 'border-amber-200 bg-amber-50 text-amber-800',
  alerte: 'border-orange-200 bg-orange-50 text-orange-800',
  recommandation: 'border-blue-200 bg-blue-50 text-blue-800',
  info: 'border-slate-200 bg-slate-50 text-slate-700',
}

const METRIC_STYLES: Record<SummaryCard['tone'], string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-900',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  red: 'border-red-200 bg-red-50 text-red-900',
  slate: 'border-slate-200 bg-slate-50 text-slate-900',
}

const ROLE_FOCUS: Record<CockpitProfile, { title: string; subtitle: string }> = {
  direction: {
    title: 'Pilotage direction',
    subtitle: 'Rentabilite, derive, arbitrages et lecture immediate des signaux faibles.',
  },
  operations: {
    title: 'Pilotage exploitation',
    subtitle: 'Ce qui bloque, ce qui retarde et ce qui doit etre traite maintenant.',
  },
  fleet: {
    title: 'Pilotage flotte & maintenance',
    subtitle: 'Disponibilite parc, echeances critiques et risques d immobilisation.',
  },
  finance: {
    title: 'Pilotage administratif & facturation',
    subtitle: 'Dossiers bloquants, retards de facturation et erosion de marge.',
  },
  commercial: {
    title: 'Pilotage commercial transport',
    subtitle: 'Clients a proteger, rentabilite a surveiller et opportunites a convertir.',
  },
}

const QUICK_LINKS: Record<CockpitProfile, LinkItem[]> = {
  direction: [
    { label: 'Analytique transport', to: '/analytique-transport', helper: 'Drill-down rentabilite et marges' },
    { label: 'Ops center', to: '/ops-center', helper: 'Arbitrages exploitation temps reel' },
    { label: 'Facturation', to: '/facturation', helper: 'Verifier les flux a transformer en cash' },
    { label: 'Vehicules', to: '/vehicules', helper: 'Suivre flotte et indisponibilites' },
  ],
  operations: [
    { label: 'Ops center', to: '/ops-center', helper: 'Traiter retards, imprévus et arbitrages' },
    { label: 'Planning', to: '/planning', helper: 'Affecter ressources et absorber la charge' },
    { label: 'Transports', to: '/transports', helper: 'Corriger les dossiers a risque' },
    { label: 'Feuille de route', to: '/feuille-route', helper: 'Suivre l execution terrain' },
  ],
  fleet: [
    { label: 'Vehicules', to: '/vehicules', helper: 'Disponibilites, alertes et dossiers parc' },
    { label: 'Maintenance', to: '/maintenance', helper: 'Planifier interventions et priorites atelier' },
    { label: 'Planning', to: '/planning', helper: 'Mesurer l impact sur les affectations' },
    { label: 'Tachygraphe', to: '/tachygraphe', helper: 'Suivre conformite conducteur et documents' },
  ],
  finance: [
    { label: 'Facturation', to: '/facturation', helper: 'Dossiers a transformer en facture' },
    { label: 'Comptabilite', to: '/comptabilite', helper: 'Suivi ecritures et controles' },
    { label: 'Reglements', to: '/reglements', helper: 'Verifier encaissements et litiges' },
    { label: 'Clients', to: '/clients', helper: 'Creances et exposition client' },
  ],
  commercial: [
    { label: 'Prospection', to: '/prospection', helper: 'Pipeline et opportunites a convertir' },
    { label: 'Clients', to: '/clients', helper: 'Suivre portefeuille et risques de derive' },
    { label: 'Analytique transport', to: '/analytique-transport', helper: 'Mesurer rentabilite client' },
    { label: 'Demandes clients', to: '/demandes-clients', helper: 'Prioriser les besoins entrants' },
  ],
}

const GOALS_VISIBLE_KEY = (role: string) => `nexora_cockpit_goals_visible_${role}`
const GOALS_TARGETS_KEY = (role: string) => `nexora_cockpit_goals_targets_${role}`

function startOfMonthIso() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatCompactInt(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function isSameDay(dateIso: string | null | undefined, target: Date) {
  if (!dateIso) return false
  const date = new Date(dateIso)
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth() && date.getDate() === target.getDate()
}

function hoursSince(dateIso: string | null | undefined) {
  if (!dateIso) return null
  return Math.max(0, Math.floor((Date.now() - new Date(dateIso).getTime()) / 3600000))
}

function groupByClient(rows: MarginRow[]) {
  const map = new Map<string, { ca: number; marge: number; missions: number }>()
  for (const row of rows) {
    const key = row.client?.trim() || 'Client non renseigne'
    const current = map.get(key) ?? { ca: 0, marge: 0, missions: 0 }
    current.ca += row.chiffre_affaires ?? 0
    current.marge += row.marge_brute ?? 0
    current.missions += 1
    map.set(key, current)
  }
  return Array.from(map.entries()).map(([client, data]) => ({
    client,
    ca: data.ca,
    marge: data.marge,
    missions: data.missions,
    margePct: data.ca > 0 ? (data.marge / data.ca) * 100 : 0,
  }))
}

function getProfile(role: Role): CockpitProfile {
  return PROFILE_BY_ROLE[role] ?? 'operations'
}

function scoreNotification(level: NotificationLevel) {
  return { critique: 5, action: 4, alerte: 3, recommandation: 2, info: 1 }[level]
}

function formatGoalValue(value: number, unit: GoalPreset['unit']) {
  if (unit === 'currency') return formatCurrency(value)
  if (unit === 'percent') return formatPercent(value)
  return formatCompactInt(value)
}

function loadGoalsVisible(role: string) {
  try {
    return localStorage.getItem(GOALS_VISIBLE_KEY(role)) === '1'
  } catch {
    return false
  }
}

function loadGoalTargets(role: string) {
  try {
    const raw = localStorage.getItem(GOALS_TARGETS_KEY(role))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, number>
    const next: GoalTargetMap = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) next[key] = value
    }
    return next
  } catch {
    return {}
  }
}

function saveGoalsVisible(role: string, visible: boolean) {
  try {
    localStorage.setItem(GOALS_VISIBLE_KEY(role), visible ? '1' : '0')
  } catch {
    // ignore localStorage failures
  }
}

function saveGoalTargets(role: string, targets: GoalTargetMap) {
  try {
    localStorage.setItem(GOALS_TARGETS_KEY(role), JSON.stringify(targets))
  } catch {
    // ignore localStorage failures
  }
}

function computeGoalProgress(current: number, target: number, inverse = false) {
  if (target <= 0) return 0
  if (inverse) {
    if (current <= target) return 100
    return clampPercent((target / current) * 100)
  }
  return clampPercent((current / target) * 100)
}

function getGoalStatus(progress: number): GoalView['status'] {
  if (progress >= 100) return 'ahead'
  if (progress >= 70) return 'watch'
  return 'behind'
}

function SummaryMetricCard({ item }: { item: SummaryCard }) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${METRIC_STYLES[item.tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">{item.label}</p>
      <p className="mt-2 text-3xl font-semibold leading-none">{item.value}</p>
      <p className="mt-2 text-xs opacity-80">{item.note}</p>
    </div>
  )
}

function NotificationCard({ item }: { item: NotificationItem }) {
  return (
    <div className={`rounded-2xl border p-4 ${LEVEL_STYLES[item.level]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full border border-current/15 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]">
            {LEVEL_LABELS[item.level]}
          </span>
          <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
        </div>
        <span className="text-lg leading-none">{item.level === 'critique' ? '!' : item.level === 'action' ? '>' : item.level === 'recommandation' ? '+' : '-'}</span>
      </div>
      <p className="mt-2 text-sm opacity-90">{item.detail}</p>
      <p className="mt-2 text-xs opacity-80">Impact: {item.impact}</p>
      <Link to={item.to} className="mt-3 inline-flex text-xs font-semibold underline underline-offset-4">
        {item.actionLabel}
      </Link>
    </div>
  )
}

function MetricTile({ item }: { item: MetricItem }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${METRIC_STYLES[item.tone]}`}>
      <p className="text-xs font-semibold">{item.label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">{item.value}</p>
      <p className="mt-2 text-xs opacity-80">{item.note}</p>
    </div>
  )
}

function DistributionCard({ title, subtitle, segments }: { title: string; subtitle: string; segments: DistributionSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)

  return (
    <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="overflow-hidden rounded-full bg-slate-100">
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {segments.map(segment => {
            const width = total > 0 ? `${(segment.value / total) * 100}%` : '0%'
            return <div key={segment.label} style={{ width, background: segment.color }} />
          })}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {segments.map(segment => {
          const percent = total > 0 ? (segment.value / total) * 100 : 0
          return (
            <div key={segment.label} className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ background: segment.color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{segment.label}</p>
                  <p className="text-xs font-semibold text-slate-700">{formatCompactInt(segment.value)} · {formatPercent(percent)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-600">{segment.helper}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RankingCard({ title, subtitle, items }: { title: string; subtitle: string; items: RankingItem[] }) {
  const maxValue = Math.max(...items.map(item => item.value), 1)

  return (
    <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>

      <div className="space-y-4">
        {items.length > 0 ? items.map(item => {
          const width = `${(item.value / maxValue) * 100}%`
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="text-xs font-semibold text-slate-700">{item.displayValue}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width, background: item.color }} />
              </div>
              <p className="mt-1 text-xs text-slate-600">{item.helper}</p>
            </div>
          )
        }) : <EmptyState />}
      </div>
    </div>
  )
}

function GaugeCard({ item }: { item: GaugeItem }) {
  const progress = clampPercent(item.value)
  const color = {
    blue: '#2563eb',
    green: '#059669',
    amber: '#d97706',
    red: '#dc2626',
    slate: '#475569',
  }[item.tone]

  return (
    <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4">
      <div className="flex items-center gap-4">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${color} 0deg ${progress * 3.6}deg, rgba(148, 163, 184, 0.18) ${progress * 3.6}deg 360deg)`,
          }}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-sm font-semibold text-slate-900">
            {formatPercent(progress)}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
          <p className="mt-1 text-xs text-slate-600">{item.helper}</p>
          <p className="mt-2 text-xs font-semibold text-slate-700">Actuel {formatPercent(item.value)} · cible {formatPercent(item.target)}</p>
        </div>
      </div>
    </div>
  )
}

function GoalCard({ goal }: { goal: GoalView }) {
  const statusStyles = {
    ahead: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    watch: 'border-amber-200 bg-amber-50 text-amber-900',
    behind: 'border-red-200 bg-red-50 text-red-900',
  }[goal.status]

  return (
    <div className={`rounded-2xl border px-4 py-4 ${statusStyles}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{goal.label}</p>
          <p className="mt-1 text-xs opacity-80">{goal.helper}</p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{goal.status === 'ahead' ? 'Atteint' : goal.status === 'watch' ? 'En ligne' : 'En retard'}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
        <div className="h-full rounded-full bg-current" style={{ width: `${goal.progress}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold">
        <span>{formatGoalValue(goal.current, goal.unit)}</span>
        <span>Cible {formatGoalValue(goal.target, goal.unit)}</span>
      </div>
    </div>
  )
}

function DecisionList({ items }: { items: DecisionItem[] }) {
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label} className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              <p className="mt-1 text-xs text-slate-600">{item.note}</p>
            </div>
            <span className="text-sm font-semibold text-[color:var(--primary)]">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function QuickLinkGrid({ items }: { items: LinkItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 transition-transform duration-150 hover:-translate-y-0.5"
        >
          <p className="text-sm font-semibold text-slate-900">{item.label}</p>
          <p className="mt-1 text-xs text-slate-600">{item.helper}</p>
        </Link>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-5 text-sm text-slate-600">
      Aucun signal prioritaire sur ce perimetre pour le moment.
    </div>
  )
}

export function RoleCockpitPanel() {
  const { role } = useAuth()
  const currentRole = (role as Role) ?? 'exploitant'
  const profile = getProfile(currentRole)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [goalsVisible, setGoalsVisible] = useState(() => loadGoalsVisible(currentRole))
  const [goalTargets, setGoalTargets] = useState<GoalTargetMap>(() => loadGoalTargets(currentRole))
  const [goalEditorOpen, setGoalEditorOpen] = useState(false)
  const [data, setData] = useState<CockpitData>({
    orders: [],
    margins: [],
    driverAlerts: [],
    fleetAlerts: [],
    incidents: [],
    delays: [],
    unassigned: [],
    vehicles: [],
  })

  useEffect(() => {
    setGoalsVisible(loadGoalsVisible(currentRole))
    setGoalTargets(loadGoalTargets(currentRole))
    setGoalEditorOpen(false)
  }, [currentRole])

  useEffect(() => {
    saveGoalsVisible(currentRole, goalsVisible)
  }, [currentRole, goalsVisible])

  useEffect(() => {
    saveGoalTargets(currentRole, goalTargets)
  }, [currentRole, goalTargets])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const monthStart = startOfMonthIso()
        const [
          ordersRes,
          marginsRes,
          driverAlertsRes,
          fleetAlertsRes,
          incidentsRes,
          delaysRes,
          unassignedRes,
          vehiclesRes,
        ] = await Promise.all([
          supabase
            .from('ordres_transport')
            .select('id, reference, statut_transport, statut_operationnel, date_chargement_prevue, date_livraison_prevue, prix_ht, est_affretee, facturation_id, numero_cmr, numero_bl, vehicule_id, conducteur_id, created_at')
            .gte('created_at', monthStart),
          supabase
            .from('vue_marge_ot')
            .select('id, reference, client, created_at, chiffre_affaires, marge_brute, taux_marge_pct, statut, date_livraison_prevue, date_livraison_reelle')
            .gte('created_at', monthStart),
          supabase
            .from('vue_conducteur_alertes')
            .select('id, conducteur_id, alert_type, label, days_remaining, due_on')
            .order('days_remaining', { ascending: true, nullsFirst: false })
            .limit(60),
          looseSupabase
            .from('vue_alertes_flotte')
            .select('*')
            .order('days_remaining', { ascending: true, nullsFirst: false })
            .limit(60),
          looseSupabase
            .from('imprevu_exploitation')
            .select('id, titre, type, priorite, statut, created_at')
            .in('statut', ['ouvert', 'en_cours'])
            .order('created_at', { ascending: false })
            .limit(80),
          looseSupabase.from('v_war_room_ot_retard').select('*'),
          looseSupabase.from('v_war_room_ot_non_affectes').select('*'),
          supabase.from('vehicules').select('id, statut'),
        ])

        if (ordersRes.error || marginsRes.error || driverAlertsRes.error || vehiclesRes.error) {
          throw new Error('Chargement cockpit impossible')
        }

        if (!cancelled) {
          setData({
            orders: (ordersRes.data ?? []) as OrderRow[],
            margins: (marginsRes.data ?? []) as MarginRow[],
            driverAlerts: (driverAlertsRes.data ?? []) as DriverAlertRow[],
            fleetAlerts: ((fleetAlertsRes.data as FleetAlertRow[] | null) ?? []),
            incidents: ((incidentsRes.data as IncidentRow[] | null) ?? []),
            delays: ((delaysRes.data as DelayRow[] | null) ?? []),
            unassigned: ((unassignedRes.data as UnassignedRow[] | null) ?? []),
            vehicles: (vehiclesRes.data ?? []) as VehicleStatusRow[],
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          console.warn('RoleCockpitPanel: chargement incomplet', loadError)
          setError('Le cockpit n a pas pu charger toutes les donnees. Les widgets standards restent disponibles.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [currentRole])

  const viewModel = useMemo<CockpitViewModel>(() => {
    const today = startOfDay()
    const orders = data.orders
    const margins = data.margins
    const activeOrders = orders.filter(order => order.statut_transport && ST_ACTIFS.includes(order.statut_transport as never))
    const finishedOrders = orders.filter(order => order.statut_transport && ST_TERMINE.includes(order.statut_transport as never))
    const liveOrders = orders.filter(order => order.statut_transport && ST_EN_COURS.includes(order.statut_transport as never))
    const deliveriesToday = orders.filter(order => isSameDay(order.date_livraison_prevue, today))
    const priceMissingCount = orders.filter(order => (order.prix_ht ?? 0) <= 0).length
    const invoicePending = finishedOrders.filter(order => !order.facturation_id)
    const invoiceBlockedDocs = invoicePending.filter(order => !order.numero_cmr || !order.numero_bl)
    const invoiceLate = invoicePending.filter(order => (hoursSince(order.date_livraison_prevue) ?? 0) >= 48)
    const affretedCount = orders.filter(order => order.est_affretee).length
    const lowMarginRows = margins.filter(row => (row.chiffre_affaires ?? 0) > 0 && (row.taux_marge_pct ?? 0) < 8)
    const negativeMarginRows = margins.filter(row => (row.marge_brute ?? 0) < 0)
    const monthlyRevenue = margins.reduce((sum, row) => sum + (row.chiffre_affaires ?? 0), 0)
    const monthlyMargin = margins.reduce((sum, row) => sum + (row.marge_brute ?? 0), 0)
    const marginPct = monthlyRevenue > 0 ? (monthlyMargin / monthlyRevenue) * 100 : 0
    const onTimeCompleted = margins.filter(row => row.date_livraison_reelle && row.date_livraison_prevue && new Date(row.date_livraison_reelle).getTime() <= new Date(row.date_livraison_prevue).getTime()).length
    const completedWithEta = margins.filter(row => row.date_livraison_reelle && row.date_livraison_prevue).length
    const punctuality = completedWithEta > 0 ? (onTimeCompleted / completedWithEta) * 100 : 100
    const driverCritical = data.driverAlerts.filter(alert => (alert.days_remaining ?? 999) <= 7)
    const driverNearDue = data.driverAlerts.filter(alert => (alert.days_remaining ?? 999) <= 30)
    const fleetCritical = data.fleetAlerts.filter(alert => (alert.days_remaining ?? 999) <= 7)
    const fleetNearDue = data.fleetAlerts.filter(alert => (alert.days_remaining ?? 999) <= 30)
    const criticalIncidents = data.incidents.filter(incident => incident.priorite === 'critique' && incident.statut !== 'clos')
    const majorDelays = data.delays.filter(delay => delay.statut_operationnel === 'retard_majeur')
    const minorDelays = data.delays.filter(delay => delay.statut_operationnel !== 'retard_majeur')
    const staleUnassigned = data.unassigned.filter(item => (item.age_heures ?? 0) >= 4)
    const vehiclesUnavailable = data.vehicles.filter(vehicle => vehicle.statut === 'maintenance' || vehicle.statut === 'hs').length
    const vehiclesAvailable = data.vehicles.filter(vehicle => vehicle.statut === 'disponible' || vehicle.statut === 'en_service').length
    const fleetLoadPct = vehiclesAvailable > 0 ? clampPercent((liveOrders.length / vehiclesAvailable) * 100) : 0
    const topClients = groupByClient(margins)
      .sort((left, right) => right.marge - left.marge)
      .slice(0, 3)
    const flopClients = groupByClient(margins)
      .sort((left, right) => left.margePct - right.margePct)
      .slice(0, 3)
    const topClientWeight = topClients[0]?.ca && monthlyRevenue > 0 ? (topClients[0].ca / monthlyRevenue) * 100 : 0

    const globalCriticalCount = criticalIncidents.length + majorDelays.length + driverCritical.length + fleetCritical.length
    const flowSegmentsCommon: DistributionSegment[] = [
      { label: 'En attente', value: orders.filter(order => order.statut_transport === 'en_attente_validation' || order.statut_transport === 'valide' || order.statut_transport === 'en_attente_planification').length, color: '#f59e0b', helper: 'Ordres a valider ou a planifier' },
      { label: 'Planifie', value: orders.filter(order => order.statut_transport === 'planifie').length, color: '#38bdf8', helper: 'Ordres prets au depart' },
      { label: 'En execution', value: liveOrders.length, color: '#2563eb', helper: 'Courses en transit ou en livraison' },
      { label: 'Termine', value: finishedOrders.length, color: '#10b981', helper: 'Courses cloturees sur la periode' },
    ].filter(segment => segment.value > 0)

    const summaryByProfile: Record<CockpitProfile, SummaryCard[]> = {
      direction: [
        { label: 'CA du mois', value: formatCurrency(monthlyRevenue), note: `${formatCompactInt(orders.length)} missions suivies ce mois`, tone: 'blue' },
        { label: 'Marge reelle', value: formatCurrency(monthlyMargin), note: `${formatPercent(marginPct)} de marge moyenne`, tone: marginPct < 10 ? 'amber' : 'green' },
        { label: 'Ponctualite', value: formatPercent(punctuality), note: `${majorDelays.length} retard(s) majeur(s) a traiter`, tone: punctuality < 92 ? 'red' : 'green' },
        { label: 'Alertes critiques', value: formatCompactInt(globalCriticalCount), note: `${criticalIncidents.length} incident(s) + ${fleetCritical.length + driverCritical.length} alerte(s) conformite`, tone: globalCriticalCount > 0 ? 'red' : 'slate' },
      ],
      operations: [
        { label: 'Flux actif', value: formatCompactInt(activeOrders.length), note: `${liveOrders.length} mission(s) en execution`, tone: 'blue' },
        { label: 'A traiter maintenant', value: formatCompactInt(globalCriticalCount + staleUnassigned.length), note: `${majorDelays.length} retard(s) majeur(s), ${staleUnassigned.length} non affectee(s)`, tone: globalCriticalCount > 0 ? 'red' : 'amber' },
        { label: 'Missions du jour', value: formatCompactInt(deliveriesToday.length), note: `${minorDelays.length} vigilance(s) ponctualite`, tone: 'green' },
        { label: 'Charge flotte', value: formatPercent(fleetLoadPct), note: `${vehiclesAvailable} vehicule(s) mobilisable(s)`, tone: fleetLoadPct > 85 ? 'amber' : 'slate' },
      ],
      fleet: [
        { label: 'Vehicules disponibles', value: formatCompactInt(vehiclesAvailable), note: `${liveOrders.length} mission(s) en execution`, tone: 'blue' },
        { label: 'Immobilises', value: formatCompactInt(vehiclesUnavailable), note: `${fleetCritical.length} echeance(s) critique(s) flotte`, tone: vehiclesUnavailable > 0 ? 'red' : 'green' },
        { label: 'Conformite chauffeurs', value: formatCompactInt(driverCritical.length), note: `${driverNearDue.length} document(s) < 30 jours`, tone: driverCritical.length > 0 ? 'amber' : 'green' },
        { label: 'Impact exploitation', value: formatCompactInt(majorDelays.length + staleUnassigned.length), note: `${majorDelays.length} retard(s) + ${staleUnassigned.length} OT en risque`, tone: 'amber' },
      ],
      finance: [
        { label: 'A facturer', value: formatCompactInt(invoicePending.length), note: `${invoiceLate.length} dossier(s) en retard > 48h`, tone: invoiceLate.length > 0 ? 'red' : 'blue' },
        { label: 'Bloquants docs', value: formatCompactInt(invoiceBlockedDocs.length), note: 'CMR ou BL manquants', tone: invoiceBlockedDocs.length > 0 ? 'amber' : 'green' },
        { label: 'Anomalies marge', value: formatCompactInt(lowMarginRows.length + negativeMarginRows.length), note: `${negativeMarginRows.length} dossier(s) sous zero`, tone: negativeMarginRows.length > 0 ? 'red' : 'amber' },
        { label: 'CA du mois', value: formatCurrency(monthlyRevenue), note: `${formatCurrency(monthlyMargin)} de marge estimee`, tone: 'green' },
      ],
      commercial: [
        { label: 'CA du mois', value: formatCurrency(monthlyRevenue), note: `${formatCompactInt(margins.length)} dossier(s) valorises`, tone: 'blue' },
        { label: 'Clients a defendre', value: formatCompactInt(flopClients.filter(client => client.margePct < 8).length), note: 'Rentabilite a reprendre en main', tone: flopClients.some(client => client.margePct < 8) ? 'amber' : 'green' },
        { label: 'Marge moyenne', value: formatPercent(marginPct), note: `${formatCompactInt(lowMarginRows.length)} dossier(s) faible marge`, tone: marginPct < 10 ? 'amber' : 'green' },
        { label: 'Concentration CA', value: formatPercent(topClientWeight), note: topClients[0] ? `Poids du client ${topClients[0].client}` : 'Portefeuille diversifie', tone: topClientWeight > 35 ? 'red' : 'slate' },
      ],
    }

    const metricsByProfile: Record<CockpitProfile, MetricItem[]> = {
      direction: [
        { label: 'OT non affectees', value: formatCompactInt(data.unassigned.length), note: `${staleUnassigned.length} depuis plus de 4h`, tone: data.unassigned.length > 0 ? 'amber' : 'green' },
        { label: 'Taux affretement', value: formatPercent(orders.length > 0 ? (affretedCount / orders.length) * 100 : 0), note: `${formatCompactInt(affretedCount)} mission(s) sous-traitee(s)`, tone: affretedCount > orders.length * 0.45 ? 'amber' : 'slate' },
        { label: 'Dossiers marge faible', value: formatCompactInt(lowMarginRows.length), note: 'Sous 8% de marge', tone: lowMarginRows.length > 0 ? 'red' : 'green' },
        { label: 'Retards majeurs', value: formatCompactInt(majorDelays.length), note: 'Impact ponctualite client', tone: majorDelays.length > 0 ? 'red' : 'green' },
      ],
      operations: [
        { label: 'OT non affectees', value: formatCompactInt(data.unassigned.length), note: `${staleUnassigned.length} hors delai de traitement`, tone: data.unassigned.length > 0 ? 'red' : 'green' },
        { label: 'Incidents ouverts', value: formatCompactInt(data.incidents.length), note: `${criticalIncidents.length} critique(s)`, tone: criticalIncidents.length > 0 ? 'red' : 'amber' },
        { label: 'Conducteurs a risque', value: formatCompactInt(driverCritical.length), note: `${driverNearDue.length} document(s) proches echeance`, tone: driverCritical.length > 0 ? 'amber' : 'green' },
        { label: 'Rentabilite fragile', value: formatCompactInt(lowMarginRows.length), note: 'Dossiers a arbitrer avant execution', tone: lowMarginRows.length > 0 ? 'amber' : 'green' },
      ],
      fleet: [
        { label: 'Echeances flotte < 7j', value: formatCompactInt(fleetCritical.length), note: `${fleetNearDue.length} alerte(s) < 30 jours`, tone: fleetCritical.length > 0 ? 'red' : 'green' },
        { label: 'Documents conducteurs critiques', value: formatCompactInt(driverCritical.length), note: 'Risque de rupture planning', tone: driverCritical.length > 0 ? 'amber' : 'green' },
        { label: 'Charge parc', value: formatPercent(fleetLoadPct), note: 'Vehicules en service vs missions en cours', tone: fleetLoadPct > 85 ? 'amber' : 'slate' },
        { label: 'OT impactees', value: formatCompactInt(majorDelays.length + data.unassigned.length), note: 'Retards et non-affectations', tone: majorDelays.length + data.unassigned.length > 0 ? 'amber' : 'green' },
      ],
      finance: [
        { label: 'Factures en attente', value: formatCompactInt(invoicePending.length), note: `${invoiceLate.length} hors delai`, tone: invoiceLate.length > 0 ? 'red' : 'green' },
        { label: 'Documents manquants', value: formatCompactInt(invoiceBlockedDocs.length), note: 'Bloque la transformation en facture', tone: invoiceBlockedDocs.length > 0 ? 'amber' : 'green' },
        { label: 'Prix manquants', value: formatCompactInt(priceMissingCount), note: 'Dossiers sans base de facturation fiable', tone: priceMissingCount > 0 ? 'red' : 'green' },
        { label: 'Marge negative', value: formatCompactInt(negativeMarginRows.length), note: 'A arbitrer avec exploitation/commercial', tone: negativeMarginRows.length > 0 ? 'red' : 'green' },
      ],
      commercial: [
        { label: 'Clients top marge', value: formatCompactInt(topClients.length), note: topClients.map(client => client.client).join(' · ') || 'Aucun client dominant', tone: 'green' },
        { label: 'Clients sous 8%', value: formatCompactInt(flopClients.filter(client => client.margePct < 8).length), note: 'Portefeuille a reprendre en main', tone: flopClients.some(client => client.margePct < 8) ? 'amber' : 'green' },
        { label: 'Affretement eleve', value: formatPercent(orders.length > 0 ? (affretedCount / orders.length) * 100 : 0), note: 'Peut rogner la marge client', tone: affretedCount > orders.length * 0.45 ? 'amber' : 'slate' },
        { label: 'OT en retard', value: formatCompactInt(majorDelays.length + minorDelays.length), note: 'Impact direct sur satisfaction client', tone: majorDelays.length > 0 ? 'red' : 'amber' },
      ],
    }

    const decisionsByProfile: Record<CockpitProfile, DecisionItem[]> = {
      direction: [
        { label: 'Top client rentable', value: topClients[0] ? `${topClients[0].client}` : 'Aucun', note: topClients[0] ? `${formatCurrency(topClients[0].marge)} de marge sur ${formatCurrency(topClients[0].ca)}` : 'Aucune donnee marge exploitable' },
        { label: 'Client sous tension', value: flopClients[0] ? `${flopClients[0].client}` : 'Aucun', note: flopClients[0] ? `${formatPercent(flopClients[0].margePct)} de marge moyenne` : 'Aucun signal de derive' },
        { label: 'Capacite flotte propre', value: `${formatCompactInt(Math.max(0, vehiclesAvailable - liveOrders.length))}`, note: 'Vehicules encore mobilisables avant recours affretement' },
      ],
      operations: [
        { label: 'OT a replanifier', value: formatCompactInt(majorDelays.length + staleUnassigned.length), note: 'Affectation ou reaffectation immediate recommandees' },
        { label: 'Dossier le plus stale', value: staleUnassigned[0] ? `${staleUnassigned[0].reference}` : 'Aucun', note: staleUnassigned[0] ? `En attente depuis ${formatCompactInt(staleUnassigned[0].age_heures ?? 0)}h` : 'Aucune OT non affectee hors delai' },
        { label: 'Recours flotte/affretement', value: formatPercent(orders.length > 0 ? (affretedCount / orders.length) * 100 : 0), note: 'A surveiller pour arbitrage marge vs capacite' },
      ],
      fleet: [
        { label: 'Vehicule le plus expose', value: data.fleetAlerts[0]?.asset_label ?? 'Aucun', note: data.fleetAlerts[0]?.label ?? 'Aucune alerte flotte critique' },
        { label: 'Risque planning', value: formatCompactInt(driverCritical.length + fleetCritical.length), note: 'Conducteurs ou vehicules pouvant sortir du plan' },
        { label: 'Buffer capacitaire', value: `${formatCompactInt(Math.max(0, vehiclesAvailable - liveOrders.length))}`, note: 'Marge de manoeuvre immediate sur le parc' },
      ],
      finance: [
        { label: 'Dossiers sans preuve', value: formatCompactInt(invoiceBlockedDocs.length), note: 'CMR ou BL a relancer avant emission facture' },
        { label: 'CA en attente', value: formatCurrency(invoicePending.reduce((sum, order) => sum + (order.prix_ht ?? 0), 0)), note: 'Potentiel de facturation non transforme' },
        { label: 'Dossiers erosion marge', value: formatCompactInt(lowMarginRows.length + negativeMarginRows.length), note: 'Coordination exploitation/commercial recommandee' },
      ],
      commercial: [
        { label: 'Client a proteger', value: flopClients[0]?.client ?? 'Aucun', note: flopClients[0] ? `${formatPercent(flopClients[0].margePct)} de marge, action commerciale utile` : 'Pas de derive critique detectee' },
        { label: 'Client locomotive', value: topClients[0]?.client ?? 'Aucun', note: topClients[0] ? `${formatCurrency(topClients[0].ca)} de CA ce mois` : 'Pas de top client identifie' },
        { label: 'Dependance portefeuille', value: formatPercent(topClientWeight), note: 'Part du premier client dans le CA du mois' },
      ],
    }

    const distributionByProfile: Record<CockpitProfile, { title: string; subtitle: string; segments: DistributionSegment[] }> = {
      direction: {
        title: 'Flux missions du mois',
        subtitle: 'Lecture immediate de la charge entre attente, execution et cloture.',
        segments: flowSegmentsCommon,
      },
      operations: {
        title: 'Charge operationnelle',
        subtitle: 'Ce que l exploitation doit absorber, traiter ou securiser.',
        segments: [
          { label: 'Retards majeurs', value: majorDelays.length, color: '#dc2626', helper: 'Missions deja en derive critique' },
          { label: 'Non affectees > 4h', value: staleUnassigned.length, color: '#f97316', helper: 'Ordres sans ressource hors delai' },
          { label: 'Incidents critiques', value: criticalIncidents.length, color: '#7c3aed', helper: 'Imprevus d exploitation ouverts' },
          { label: 'Flux en execution', value: liveOrders.length, color: '#2563eb', helper: 'Missions a piloter en direct' },
        ].filter(segment => segment.value > 0),
      },
      fleet: {
        title: 'Etat parc & conformite',
        subtitle: 'Disponibilite immediate et contraintes a absorber avant rupture.',
        segments: [
          { label: 'Disponibles', value: vehiclesAvailable, color: '#10b981', helper: 'Vehicules exploitables maintenant' },
          { label: 'Immobilises', value: vehiclesUnavailable, color: '#dc2626', helper: 'Vehicules hors service ou maintenance' },
          { label: 'Alerte flotte < 30j', value: fleetNearDue.length, color: '#f59e0b', helper: 'Echeances parc proches' },
          { label: 'Docs conducteurs < 30j', value: driverNearDue.length, color: '#38bdf8', helper: 'Conformite terrain a remettre sous controle' },
        ].filter(segment => segment.value > 0),
      },
      finance: {
        title: 'Tunnel facturation',
        subtitle: 'Ce qui est terminable tout de suite et ce qui bloque la conversion en cash.',
        segments: [
          { label: 'A facturer', value: invoicePending.length, color: '#2563eb', helper: 'Dossiers termines non factures' },
          { label: 'Bloques documents', value: invoiceBlockedDocs.length, color: '#f59e0b', helper: 'Preuves manquantes a relancer' },
          { label: 'Prix manquants', value: priceMissingCount, color: '#7c3aed', helper: 'Dossiers sans base de facturation fiable' },
          { label: 'Marge negative', value: negativeMarginRows.length, color: '#dc2626', helper: 'Dossiers a arbitrer en urgence' },
        ].filter(segment => segment.value > 0),
      },
      commercial: {
        title: 'Portefeuille et execution',
        subtitle: 'Lecture conjointe du business gagne et de la qualite de service percue.',
        segments: [
          { label: 'Top clients rentables', value: topClients.length, color: '#10b981', helper: 'Clients les plus createurs de marge' },
          { label: 'Clients sous 8%', value: flopClients.filter(client => client.margePct < 8).length, color: '#f59e0b', helper: 'Portefeuille a redresser' },
          { label: 'Retards client', value: majorDelays.length + minorDelays.length, color: '#dc2626', helper: 'Experience client en tension' },
          { label: 'Affretement', value: affretedCount, color: '#2563eb', helper: 'Part sous-traitee du portefeuille' },
        ].filter(segment => segment.value > 0),
      },
    }

    const rankingByProfile: Record<CockpitProfile, { title: string; subtitle: string; items: RankingItem[] }> = {
      direction: {
        title: 'Top clients marge',
        subtitle: 'Clients qui tirent la rentabilite ce mois.',
        items: topClients.map(client => ({
          label: client.client,
          value: client.marge,
          displayValue: formatCurrency(client.marge),
          helper: `${formatCurrency(client.ca)} de CA · ${formatPercent(client.margePct)}`,
          color: '#10b981',
        })),
      },
      operations: {
        title: 'Points de rupture',
        subtitle: 'Les trois familles a soulager avant saturation exploitation.',
        items: [
          { label: 'Retards majeurs', value: majorDelays.length, displayValue: formatCompactInt(majorDelays.length), helper: 'Priorite absolue du jour', color: '#dc2626' },
          { label: 'OT non affectees', value: staleUnassigned.length, displayValue: formatCompactInt(staleUnassigned.length), helper: 'Risque chargement et promesse client', color: '#f97316' },
          { label: 'Incidents ouverts', value: criticalIncidents.length + data.incidents.length, displayValue: formatCompactInt(criticalIncidents.length + data.incidents.length), helper: 'Charge mentale et arbitrages terrain', color: '#7c3aed' },
        ].filter(item => item.value > 0),
      },
      fleet: {
        title: 'Actifs les plus exposes',
        subtitle: 'Parc ou conformite a traiter en premier.',
        items: data.fleetAlerts.slice(0, 4).map((alert, index) => ({
          label: alert.asset_label ?? `Actif ${index + 1}`,
          value: Math.max(1, 31 - Math.max(alert.days_remaining ?? 30, 0)),
          displayValue: (alert.days_remaining ?? 0) <= 0 ? 'Expire' : `J-${alert.days_remaining}`,
          helper: alert.label ?? alert.alert_type ?? 'Alerte flotte',
          color: '#ef4444',
        })),
      },
      finance: {
        title: 'Fuites de cash prioritaires',
        subtitle: 'Ce qui ralentit la facturation ou detruit la marge.',
        items: [
          { label: 'Factures en attente', value: invoicePending.length, displayValue: formatCompactInt(invoicePending.length), helper: 'Dossiers termines encore hors facturation', color: '#2563eb' },
          { label: 'Docs manquants', value: invoiceBlockedDocs.length, displayValue: formatCompactInt(invoiceBlockedDocs.length), helper: 'CMR ou BL absents', color: '#f59e0b' },
          { label: 'Dossiers sous zero', value: negativeMarginRows.length, displayValue: formatCompactInt(negativeMarginRows.length), helper: 'Perte nette immediate', color: '#dc2626' },
        ].filter(item => item.value > 0),
      },
      commercial: {
        title: 'Portefeuille a proteger',
        subtitle: 'Clients ou comptes qui meritent action commerciale.',
        items: flopClients.map(client => ({
          label: client.client,
          value: Math.max(1, 20 - client.margePct),
          displayValue: formatPercent(client.margePct),
          helper: `${formatCurrency(client.ca)} de CA · ${client.missions} mission(s)`,
          color: client.margePct < 8 ? '#f59e0b' : '#38bdf8',
        })),
      },
    }

    const gaugesByProfile: Record<CockpitProfile, GaugeItem[]> = {
      direction: [
        { label: 'Ponctualite', value: punctuality, target: 96, helper: 'OT livrees a l heure sur la periode', tone: punctuality < 92 ? 'red' : 'green' },
        { label: 'Marge moyenne', value: marginPct, target: 12, helper: 'Taux de marge global direction', tone: marginPct < 10 ? 'amber' : 'green' },
        { label: 'Flotte mobilisee', value: fleetLoadPct, target: 78, helper: 'Niveau de sollicitation du parc', tone: fleetLoadPct > 85 ? 'amber' : 'blue' },
      ],
      operations: [
        { label: 'Ponctualite terrain', value: punctuality, target: 95, helper: 'Qualite execution du plan du jour', tone: punctuality < 92 ? 'red' : 'green' },
        { label: 'Charge flotte', value: fleetLoadPct, target: 80, helper: 'Equilibre charge vs disponibilite', tone: fleetLoadPct > 85 ? 'amber' : 'blue' },
        { label: 'Affretement', value: orders.length > 0 ? (affretedCount / orders.length) * 100 : 0, target: 30, helper: 'Part sous-traitee a contenir', tone: affretedCount > orders.length * 0.45 ? 'amber' : 'slate' },
      ],
      fleet: [
        { label: 'Disponibilite parc', value: data.vehicles.length > 0 ? (vehiclesAvailable / data.vehicles.length) * 100 : 100, target: 85, helper: 'Vehicules exploitables immediatement', tone: vehiclesUnavailable > 0 ? 'amber' : 'green' },
        { label: 'Conformite conducteurs', value: driverNearDue.length > 0 ? clampPercent(100 - (driverCritical.length / driverNearDue.length) * 100) : 100, target: 95, helper: 'Pression documentaire chauffeurs', tone: driverCritical.length > 0 ? 'amber' : 'green' },
        { label: 'Pression atelier', value: fleetNearDue.length > 0 ? clampPercent((fleetCritical.length / fleetNearDue.length) * 100) : 0, target: 25, helper: 'Part d alertes parc deja critiques', tone: fleetCritical.length > 0 ? 'red' : 'blue' },
      ],
      finance: [
        { label: 'Transformation facture', value: finishedOrders.length > 0 ? ((finishedOrders.length - invoicePending.length) / finishedOrders.length) * 100 : 100, target: 90, helper: 'Dossiers termines deja transformes en facture', tone: invoicePending.length > 0 ? 'amber' : 'green' },
        { label: 'Marge moyenne', value: marginPct, target: 12, helper: 'Sante economique du portefeuille facture', tone: marginPct < 10 ? 'amber' : 'green' },
        { label: 'Dossiers preuves completes', value: invoicePending.length > 0 ? ((invoicePending.length - invoiceBlockedDocs.length) / invoicePending.length) * 100 : 100, target: 92, helper: 'CMR/BL disponibles pour facturer', tone: invoiceBlockedDocs.length > 0 ? 'amber' : 'green' },
      ],
      commercial: [
        { label: 'Marge commerciale', value: marginPct, target: 10, helper: 'Rentabilite moyenne du portefeuille', tone: marginPct < 10 ? 'amber' : 'green' },
        { label: 'Ponctualite client', value: punctuality, target: 95, helper: 'Execution visible cote client', tone: majorDelays.length > 0 ? 'red' : 'green' },
        { label: 'Concentration portefeuille', value: 100 - topClientWeight, target: 70, helper: 'Plus la jauge est haute, plus le portefeuille est diversifie', tone: topClientWeight > 35 ? 'red' : 'blue' },
      ],
    }

    const goalsByProfile: Record<CockpitProfile, GoalPreset[]> = {
      direction: [
        { id: 'revenue', label: 'CA cible', helper: 'Objectif de production mensuelle', current: monthlyRevenue, defaultTarget: 250000, unit: 'currency' },
        { id: 'margin_pct', label: 'Marge cible', helper: 'Tenue economique globale', current: marginPct, defaultTarget: 12, unit: 'percent' },
        { id: 'punctuality', label: 'Ponctualite cible', helper: 'Qualite de service globale', current: punctuality, defaultTarget: 96, unit: 'percent' },
      ],
      operations: [
        { id: 'deliveries_today', label: 'Missions du jour', helper: 'Volume du jour traite sans debordement', current: deliveriesToday.length, defaultTarget: 18, unit: 'count' },
        { id: 'punctuality', label: 'Ponctualite exploitation', helper: 'OT executees a l heure', current: punctuality, defaultTarget: 95, unit: 'percent' },
        { id: 'non_assigned_max', label: 'OT non affectees max', helper: 'Objectif de zero attente non traitee', current: staleUnassigned.length, defaultTarget: 1, unit: 'count', inverse: true },
      ],
      fleet: [
        { id: 'fleet_availability', label: 'Disponibilite parc', helper: 'Vehicules exploitables / parc total', current: data.vehicles.length > 0 ? (vehiclesAvailable / data.vehicles.length) * 100 : 100, defaultTarget: 85, unit: 'percent' },
        { id: 'fleet_critical_max', label: 'Alertes flotte max', helper: 'Maintenir les echeances critiques sous controle', current: fleetCritical.length, defaultTarget: 1, unit: 'count', inverse: true },
        { id: 'driver_critical_max', label: 'Docs chauffeurs critiques max', helper: 'Eviter les ruptures de planning', current: driverCritical.length, defaultTarget: 1, unit: 'count', inverse: true },
      ],
      finance: [
        { id: 'invoice_pending_max', label: 'Backlog facturation max', helper: 'Volume de dossiers finis non factures', current: invoicePending.length, defaultTarget: 8, unit: 'count', inverse: true },
        { id: 'invoice_blocked_max', label: 'Bloquants documentaires max', helper: 'Limiter les CMR/BL manquants', current: invoiceBlockedDocs.length, defaultTarget: 2, unit: 'count', inverse: true },
        { id: 'margin_amount', label: 'Marge mensuelle cible', helper: 'Objectif de marge brute', current: monthlyMargin, defaultTarget: 30000, unit: 'currency' },
      ],
      commercial: [
        { id: 'revenue', label: 'CA portefeuille', helper: 'Production commerciale du mois', current: monthlyRevenue, defaultTarget: 120000, unit: 'currency' },
        { id: 'margin_pct', label: 'Marge commerciale', helper: 'Rentabilite moyenne du portefeuille', current: marginPct, defaultTarget: 10, unit: 'percent' },
        { id: 'client_concentration_max', label: 'Dependance client max', helper: 'Poids du premier client a contenir', current: topClientWeight, defaultTarget: 30, unit: 'percent', inverse: true },
      ],
    }

    const notifications: NotificationItem[] = []

    if (majorDelays.length > 0) {
      notifications.push({
        id: 'major-delays',
        level: 'critique',
        title: `${majorDelays.length} retard(s) majeur(s) sur missions prioritaires`,
        detail: 'Des courses en derive operationnelle risquent de degrader ponctualite, satisfaction client et replanification du reste du plan.',
        impact: 'Risque client immediat et perturbation exploitation.',
        actionLabel: 'Ouvrir le pilotage temps reel',
        to: '/ops-center',
      })
    }

    if (criticalIncidents.length > 0) {
      notifications.push({
        id: 'critical-incidents',
        level: 'critique',
        title: `${criticalIncidents.length} imprevu(s) critique(s) d exploitation`,
        detail: 'Les evenements remontes terrain exigent arbitrage et trace de l action prise.',
        impact: 'Rupture de service potentielle et charge mentale forte des exploitants.',
        actionLabel: 'Traiter les imprévus',
        to: '/ops-center',
      })
    }

    if (staleUnassigned.length > 0) {
      notifications.push({
        id: 'unassigned',
        level: 'action',
        title: `${staleUnassigned.length} OT non affectee(s) hors delai`,
        detail: 'Des ordres validés ou proches execution n ont pas encore de ressource attribuee.',
        impact: 'Risque de rupture planning et de retard au chargement.',
        actionLabel: 'Affecter dans le planning',
        to: '/planning',
      })
    }

    if (invoiceBlockedDocs.length > 0) {
      notifications.push({
        id: 'invoice-blockers',
        level: profile === 'finance' ? 'action' : 'alerte',
        title: `${invoiceBlockedDocs.length} dossier(s) bloques avant facturation`,
        detail: 'CMR ou BL manquants sur des dossiers termines, ce qui retarde le cash et la cloture administrative.',
        impact: 'Retard de facturation et exposition client accrue.',
        actionLabel: 'Ouvrir la facturation',
        to: '/facturation',
      })
    }

    if (driverCritical.length > 0 || fleetCritical.length > 0) {
      notifications.push({
        id: 'compliance',
        level: 'alerte',
        title: `${driverCritical.length + fleetCritical.length} echeance(s) critique(s) conformite`,
        detail: 'Documents conducteurs ou obligations flotte arrivent a echeance sous 7 jours.',
        impact: 'Risque de sortie de parc ou indisponibilite conducteur.',
        actionLabel: 'Verifier la conformite',
        to: profile === 'fleet' ? '/vehicules' : '/tachygraphe',
      })
    }

    if (lowMarginRows.length > 0 || negativeMarginRows.length > 0) {
      notifications.push({
        id: 'margin-risk',
        level: negativeMarginRows.length > 0 ? 'alerte' : 'recommandation',
        title: `${lowMarginRows.length + negativeMarginRows.length} dossier(s) a marge fragile`,
        detail: 'Des missions sont sous le seuil de rentabilite cible ou passent deja sous zero.',
        impact: 'Erosion marge et arbitrages commerciaux/exploitation necessaires.',
        actionLabel: 'Analyser les marges',
        to: '/analytique-transport',
      })
    }

    if (orders.length > 0 && affretedCount / orders.length > 0.45) {
      notifications.push({
        id: 'high-affretement',
        level: 'recommandation',
        title: 'Taux affretement eleve sur la periode',
        detail: 'La part de sous-traitance depasse le seuil de vigilance du cockpit.',
        impact: 'Marge sous pression et moindre maitrise capacitaire.',
        actionLabel: 'Voir flotte et capacite',
        to: profile === 'commercial' ? '/analytique-transport' : '/vehicules',
      })
    }

    if (profile === 'commercial' && topClientWeight > 35) {
      notifications.push({
        id: 'client-concentration',
        level: 'info',
        title: 'Concentration portefeuille a surveiller',
        detail: 'Le premier client pese fortement dans le CA du mois.',
        impact: 'Dependance commerciale et exposition accrue en cas de derive.',
        actionLabel: 'Revoir le portefeuille',
        to: '/clients',
      })
    }

    const orderedNotifications = notifications.sort((left, right) => scoreNotification(right.level) - scoreNotification(left.level)).slice(0, 5)
    const goalViews = goalsByProfile[profile].map(goal => {
      const target = goalTargets[goal.id] ?? goal.defaultTarget
      const progress = computeGoalProgress(goal.current, target, goal.inverse)
      return {
        ...goal,
        target,
        progress,
        status: getGoalStatus(progress),
      }
    })

    return {
      summary: summaryByProfile[profile],
      metrics: metricsByProfile[profile],
      decisions: decisionsByProfile[profile],
      notifications: orderedNotifications,
      quickLinks: QUICK_LINKS[profile],
      distribution: distributionByProfile[profile],
      ranking: rankingByProfile[profile],
      gauges: gaugesByProfile[profile],
      goals: goalViews,
      meta: {
        roleLabel: ROLE_LABELS[currentRole] ?? currentRole,
        updatedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    }
  }, [currentRole, data, goalTargets, profile])

  if (loading) {
    return (
      <section className="nx-card rounded-[28px] border p-6" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[color:var(--primary)] border-t-transparent" />
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div
        className="rounded-[28px] border p-6"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(145deg, color-mix(in srgb, var(--surface) 92%, #dbeafe 8%), color-mix(in srgb, var(--surface-soft) 84%, #f8fafc 16%))',
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex rounded-full border border-[color:var(--border)] bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--primary)]">
              Cockpit {viewModel.meta.roleLabel}
            </span>
            <h2 className="mt-3 text-2xl font-semibold text-[color:var(--text-heading)]">{ROLE_FOCUS[profile].title}</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{ROLE_FOCUS[profile].subtitle}</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">Lecture priorisee</p>
              <p className="mt-1">Maintenant, sous surveillance, puis analyse. Mise a jour a {viewModel.meta.updatedAt}.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGoalsVisible(value => !value)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition-colors ${goalsVisible ? 'bg-emerald-600 text-white' : 'bg-white/70 text-slate-700'}`}
              >
                {goalsVisible ? 'Suivi objectifs actif' : 'Activer suivi objectifs'}
              </button>
              {goalsVisible && (
                <button
                  type="button"
                  onClick={() => setGoalEditorOpen(value => !value)}
                  className="rounded-full border border-[color:var(--border)] bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  {goalEditorOpen ? 'Fermer les objectifs' : 'Parametrer les objectifs'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {viewModel.summary.map(item => <SummaryMetricCard key={item.label} item={item} />)}
        </div>

        {goalsVisible && goalEditorOpen && (
          <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-white/75 p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Objectifs personnels ou d equipe</h3>
              <p className="mt-1 text-xs text-slate-600">Optionnel. Chaque role peut suivre ses propres cibles sans imposer cet affichage aux autres utilisateurs.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {viewModel.goals.map(goal => (
                <label key={goal.id} className="rounded-2xl border border-[color:var(--border)] bg-white px-3 py-3 text-sm text-slate-700">
                  <span className="block font-semibold text-slate-900">{goal.label}</span>
                  <span className="mt-1 block text-xs text-slate-600">{goal.helper}</span>
                  <input
                    type="number"
                    min="0"
                    step={goal.unit === 'currency' ? '1000' : goal.unit === 'percent' ? '1' : '1'}
                    value={goal.target}
                    onChange={event => {
                      const next = Number(event.target.value)
                      setGoalTargets(previous => ({
                        ...previous,
                        [goal.id]: Number.isFinite(next) && next >= 0 ? next : goal.target,
                      }))
                    }}
                    className="mt-3 w-full rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <DistributionCard
          title={viewModel.distribution.title}
          subtitle={viewModel.distribution.subtitle}
          segments={viewModel.distribution.segments}
        />
        <RankingCard
          title={viewModel.ranking.title}
          subtitle={viewModel.ranking.subtitle}
          items={viewModel.ranking.items}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {viewModel.gauges.map(item => <GaugeCard key={item.label} item={item} />)}
      </div>

      {goalsVisible && (
        <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">Suivi objectifs</h3>
              <p className="text-sm text-slate-600">Lecture motivante et facultative pour suivre l avancee individuelle ou d equipe.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {viewModel.goals.filter(goal => goal.status === 'ahead').length}/{viewModel.goals.length} atteints
            </span>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {viewModel.goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">A traiter maintenant</h3>
              <p className="text-sm text-slate-600">Notifications intelligentes groupees par impact, sans bruit inutile.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {viewModel.notifications.length} priorite(s)
            </span>
          </div>

          <div className="space-y-3">
            {viewModel.notifications.length > 0
              ? viewModel.notifications.map(item => <NotificationCard key={item.id} item={item} />)
              : <EmptyState />}
          </div>
        </div>

        <div className="space-y-5">
          <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">Sous surveillance</h3>
              <p className="text-sm text-slate-600">KPI prioritaires du role, visibles sans clic supplementaire.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {viewModel.metrics.map(item => <MetricTile key={item.label} item={item} />)}
            </div>
          </div>

          <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">Actions rapides</h3>
              <p className="text-sm text-slate-600">Raccourcis de decision et d execution selon le perimetre du role.</p>
            </div>
            <QuickLinkGrid items={viewModel.quickLinks} />
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">Analyse et pilotage</h3>
            <p className="text-sm text-slate-600">Angles d analyse directement utiles a la prise de decision metier.</p>
          </div>
          <DecisionList items={viewModel.decisions} />
        </div>

        <div className="nx-card rounded-[28px] border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">Garde-fous de lecture</h3>
            <p className="text-sm text-slate-600">Principes pour garder un cockpit lisible, utile et durable.</p>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50 px-4 py-3">
              Une alerte = un impact clair, une action recommandee, un lien direct. Les micro-evenements restent regroupes.
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50 px-4 py-3">
              Les cartes du haut restent limitees a quatre, pour imposer une lecture de decision et non une collection de chiffres.
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50 px-4 py-3">
              Les widgets existants restent disponibles plus bas comme second niveau de profondeur, sans concurrencer les priorites du cockpit.
            </div>
            <div className="rounded-2xl border border-[color:var(--border)] bg-slate-50 px-4 py-3">
              Tout nouvel indicateur doit repondre a une question de pilotage explicite: agir, arbitrer, anticiper ou rassurer.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}