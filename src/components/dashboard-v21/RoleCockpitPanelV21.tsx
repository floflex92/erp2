import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { ROLE_LABELS, useAuth, type Role } from '@/lib/auth'
import { looseSupabase } from '@/lib/supabaseLoose'
import { AlertBox, type AlertItem } from '@/components/dashboard-v21/AlertBox'
import { ChartContainer } from '@/components/dashboard-v21/ChartContainer'
import { DashboardSkeleton } from '@/components/dashboard-v21/DashboardSkeleton'
import { FinanceSummaryCard } from '@/components/dashboard-v21/FinanceSummaryCard'
import { KpiCard } from '@/components/dashboard-v21/KpiCard'
import { LatePaymentWidget } from '@/components/dashboard-v21/LatePaymentWidget'
import { RoleCockpitPanel } from '@/components/dashboard/RoleCockpitPanel'

const ChartsHost = lazy(() => import('@/components/dashboard-v21/charts/ChartsHost'))

type PeriodFilter = 'day' | 'week' | 'month' | 'quarter'
type CockpitRole = 'exploitant' | 'conducteur' | 'dirigeant' | 'parc' | 'commercial' | 'rh' | 'finance'

type LooseRow = Record<string, unknown>

interface DataBundle {
  orders: LooseRow[]
  margins: LooseRow[]
  invoices: LooseRow[]
  financeKpis: LooseRow[]
  financeClientPerf: LooseRow[]
  financeChargeBreakdown: LooseRow[]
  financeLatePayments: LooseRow[]
  supplierInvoices: LooseRow[]
  missionCosts: LooseRow[]
  bankMoves: LooseRow[]
  cashForecast: LooseRow[]
  drivers: LooseRow[]
  interviews: LooseRow[]
  vehicles: LooseRow[]
  driverAlerts: LooseRow[]
  fleetAlerts: LooseRow[]
  clients: LooseRow[]
}

type DataBundleKey = keyof DataBundle

interface DataTask {
  key: DataBundleKey
  table: string
  select?: string
  dateKey?: string
  limit?: number
}

// Date de référence calculée au démarrage du module (dernier trimestre)
const QUARTER_AGO_ISO = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
})()

const emptyData: DataBundle = {
  orders: [],
  margins: [],
  invoices: [],
  financeKpis: [],
  financeClientPerf: [],
  financeChargeBreakdown: [],
  financeLatePayments: [],
  supplierInvoices: [],
  missionCosts: [],
  bankMoves: [],
  cashForecast: [],
  drivers: [],
  interviews: [],
  vehicles: [],
  driverAlerts: [],
  fleetAlerts: [],
  clients: [],
}

const criticalTasks: DataTask[] = [
  {
    key: 'orders',
    table: 'ordres_transport',
    select: 'id,reference,statut,statut_transport,statut_operationnel,date_chargement_prevue,date_livraison_prevue,distance_km,nature_marchandise,type_transport,client_id,vehicule_id,conducteur_id,prix_ht,facturation_id,agence,agence_nom,service,service_nom,created_at',
    dateKey: 'created_at',
    limit: 300,
  },
  {
    key: 'margins',
    table: 'vue_marge_ot',
    dateKey: 'created_at',
    limit: 300,
  },
  {
    key: 'invoices',
    table: 'factures',
    select: 'id,numero,statut,montant_ht,montant_ttc,date_emission,date_echeance,client_id',
    dateKey: 'date_emission',
    limit: 300,
  },
  { key: 'drivers', table: 'conducteurs', select: 'id,statut,nom,prenom', limit: 200 },
  { key: 'vehicles', table: 'vehicules', select: 'id,statut', limit: 200 },
]

// Tous les batches de fond s'exécutent en parallèle (voir load())
const backgroundTasks: DataTask[] = [
  { key: 'financeKpis', table: 'vue_finance_kpis_v21', dateKey: 'month_key', limit: 200 },
  { key: 'financeClientPerf', table: 'vue_finance_client_perf_v21', dateKey: 'month_key', limit: 200 },
  { key: 'financeChargeBreakdown', table: 'vue_finance_charge_breakdown_v21', dateKey: 'month_key', limit: 200 },
  { key: 'financeLatePayments', table: 'vue_finance_late_payments_v21', limit: 200 },
  { key: 'supplierInvoices', table: 'compta_factures_fournisseurs', dateKey: 'date_facture', limit: 300 },
  { key: 'missionCosts', table: 'couts_mission', dateKey: 'date_cout', limit: 300 },
  { key: 'bankMoves', table: 'mouvements_bancaires', dateKey: 'date_operation', limit: 300 },
  { key: 'cashForecast', table: 'flux_previsionnel', limit: 200 },
  { key: 'interviews', table: 'entretiens', limit: 200 },
  { key: 'driverAlerts', table: 'vue_conducteur_alertes', select: 'id,label,days_remaining', limit: 100 },
  { key: 'fleetAlerts', table: 'vue_alertes_flotte', limit: 100 },
  { key: 'clients', table: 'clients', select: 'id,nom,type_client', limit: 500 },
]

const ROLE_TO_COCKPIT: Partial<Record<Role, CockpitRole>> = {
  admin: 'dirigeant',
  super_admin: 'dirigeant',
  dirigeant: 'dirigeant',
  exploitant: 'exploitant',
  logisticien: 'exploitant',
  affreteur: 'exploitant',
  conducteur: 'conducteur',
  conducteur_affreteur: 'conducteur',
  mecanicien: 'parc',
  flotte: 'parc',
  maintenance: 'parc',
  commercial: 'commercial',
  rh: 'rh',
  comptable: 'finance',
  administratif: 'finance',
  facturation: 'finance',
  investisseur: 'dirigeant',
  observateur: 'dirigeant',
  demo: 'dirigeant',
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function getRowDate(row: LooseRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string') {
      const date = new Date(value)
      if (!Number.isNaN(date.getTime())) return date
    }
  }
  return null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function getStartDate(period: PeriodFilter) {
  const now = new Date()
  if (period === 'day') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return new Date(now.getFullYear(), now.getMonth() - 2, 1)
}

function groupByMonth(rows: LooseRow[], valueKey: string, dateKeys: string[]) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const date = getRowDate(row, dateKeys)
    if (!date) continue
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    map.set(key, (map.get(key) ?? 0) + toNumber(row[valueKey]))
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: key.slice(5),
      value,
    }))
}

async function fetchLoose(
  table: string,
  columns = '*',
  dateFilter?: string,
  limit = 400,
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (looseSupabase.from(table) as any).select(columns).limit(limit)
    if (dateFilter) {
      query = query.gte(dateFilter, QUARTER_AGO_ISO)
    }
    const { data } = await query
    return (data as LooseRow[] | null) ?? []
  } catch {
    return []
  }
}

async function fetchTaskBatch(tasks: DataTask[]): Promise<Partial<DataBundle>> {
  const entries = await Promise.all(
    tasks.map(async task => [
      task.key,
      await fetchLoose(task.table, task.select ?? '*', task.dateKey, task.limit),
    ] as const),
  )
  return Object.fromEntries(entries) as Partial<DataBundle>
}

function dateToDisplay(dateIso: string) {
  const date = new Date(dateIso)
  if (Number.isNaN(date.getTime())) return '--'
  return date.toLocaleDateString('fr-FR')
}

function chartFallback() {
  return <div className="h-56 animate-pulse rounded-xl bg-[color:var(--surface-soft)]" />
}

function inferDashboardRole(role: Role | null): CockpitRole {
  if (!role) return 'exploitant'
  return ROLE_TO_COCKPIT[role] ?? 'exploitant'
}

export function RoleCockpitPanelV21() {
  const { role } = useAuth()
  const currentRole = (role as Role) ?? 'exploitant'
  const dashboardRole = inferDashboardRole(currentRole)

  const [period, setPeriod] = useState<PeriodFilter>('month')
  const [agencyFilter, setAgencyFilter] = useState('all')
  const [serviceFilter, setServiceFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [activityFilter, setActivityFilter] = useState('all')
  const [showLegacy, setShowLegacy] = useState(false)

  const [loading, setLoading] = useState(true)
  const [hydrating, setHydrating] = useState(false)
  const [hydrationProgress, setHydrationProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DataBundle>(emptyData)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setHydrating(false)
      setHydrationProgress(0)
      setError(null)
      try {
        // Phase critique : 5 tables avec colonnes et filtres ciblés (~200ms)
        const criticalData = await fetchTaskBatch(criticalTasks)
        if (cancelled) return

        setData(previous => ({ ...previous, ...criticalData }))
        setLoading(false)

        // Fond : tous les tasks en parallèle (max(batch1, batch2, batch3) au lieu de sum)
        setHydrating(true)
        const backgroundData = await fetchTaskBatch(backgroundTasks)
        if (cancelled) return

        setData(previous => ({ ...previous, ...backgroundData }))
        setHydrationProgress(100)
        setHydrating(false)
      } catch {
        if (!cancelled) {
          setError('Le cockpit V2.1 n a pas pu charger toutes les donnees. Le mode historique reste disponible.')
          setLoading(false)
          setHydrating(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const baseStartDate = useMemo(() => getStartDate(period), [period])

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const client of data.clients) {
      map.set(toString(client.id), toString(client.nom, 'Client inconnu'))
    }
    return map
  }, [data.clients])

  const filterOptions = useMemo(() => {
    const agencies = new Set<string>()
    const services = new Set<string>()
    const activities = new Set<string>()

    for (const order of data.orders) {
      const agency = toString(order.agence) || toString(order.agence_nom)
      const service = toString(order.service) || toString(order.service_nom)
      const activity = toString(order.type_transport) || toString(order.nature_marchandise)
      if (agency) agencies.add(agency)
      if (service) services.add(service)
      if (activity) activities.add(activity)
    }

    const clientEntries = Array.from(clientNameById.entries()).map(([id, label]) => ({ id, label }))

    return {
      agencies: Array.from(agencies).sort((a, b) => a.localeCompare(b)),
      services: Array.from(services).sort((a, b) => a.localeCompare(b)),
      activities: Array.from(activities).sort((a, b) => a.localeCompare(b)),
      clients: clientEntries.sort((a, b) => a.label.localeCompare(b.label)),
    }
  }, [data.orders, clientNameById])

  const filtered = useMemo(() => {
    function matchCoreFilters(row: LooseRow) {
      const rowAgency = toString(row.agence) || toString(row.agence_nom)
      const rowService = toString(row.service) || toString(row.service_nom)
      const rowActivity = toString(row.type_transport) || toString(row.nature_marchandise)
      const rowClient = toString(row.client_id)

      if (agencyFilter !== 'all' && rowAgency !== agencyFilter) return false
      if (serviceFilter !== 'all' && rowService !== serviceFilter) return false
      if (activityFilter !== 'all' && rowActivity !== activityFilter) return false
      if (clientFilter !== 'all' && rowClient !== clientFilter) return false
      return true
    }

    function inRange(row: LooseRow, keys: string[]) {
      const rowDate = getRowDate(row, keys)
      if (!rowDate) return false
      return rowDate >= baseStartDate
    }

    const orders = data.orders.filter(order => matchCoreFilters(order) && inRange(order, ['created_at', 'date_chargement_prevue', 'date_livraison_prevue']))
    const margins = data.margins.filter(row => inRange(row, ['created_at', 'date_livraison_prevue']))
    const invoices = data.invoices.filter(row => inRange(row, ['date_emission', 'created_at']))
    const financeKpis = data.financeKpis.filter(row => inRange(row, ['month_key']))
    const financeClientPerf = data.financeClientPerf.filter(row => inRange(row, ['month_key']))
    const financeChargeBreakdown = data.financeChargeBreakdown.filter(row => inRange(row, ['month_key']))
    const financeLatePayments = data.financeLatePayments.filter(row => inRange(row, ['date_emission', 'date_echeance']))
    const supplierInvoices = data.supplierInvoices.filter(row => inRange(row, ['date_facture', 'created_at']))
    const missionCosts = data.missionCosts.filter(row => inRange(row, ['date_cout', 'created_at']))
    const bankMoves = data.bankMoves.filter(row => inRange(row, ['date_operation', 'created_at']))

    return {
      orders,
      margins,
      invoices,
      financeKpis,
      financeClientPerf,
      financeChargeBreakdown,
      financeLatePayments,
      supplierInvoices,
      missionCosts,
      bankMoves,
    }
  }, [activityFilter, agencyFilter, baseStartDate, clientFilter, data.bankMoves, data.financeChargeBreakdown, data.financeClientPerf, data.financeKpis, data.financeLatePayments, data.invoices, data.margins, data.missionCosts, data.orders, data.supplierInvoices, serviceFilter])

  const view = useMemo(() => {
    const doneStatuses = new Set(['termine', 'livre', 'facture', 'cloture'])
    const lateStatuses = new Set(['retard', 'retard_majeur'])

    const doneOrders = filtered.orders.filter(order => doneStatuses.has(toString(order.statut_transport)))
    const plannedOrders = filtered.orders.filter(order => !['annule', 'annulee'].includes(toString(order.statut_transport)))
    const lateOrders = filtered.orders.filter(order => lateStatuses.has(toString(order.statut_operationnel)) || toString(order.statut_transport) === 'en_retard')

    const revenueFallback = filtered.margins.reduce((sum, row) => sum + toNumber(row.chiffre_affaires), 0)
    const marginFallback = filtered.margins.reduce((sum, row) => sum + toNumber(row.marge_brute), 0)

    const financeKpiRows = filtered.financeKpis
    const financeKpiAvailable = financeKpiRows.length > 0

    const revenue = financeKpiAvailable
      ? financeKpiRows.reduce((sum, row) => sum + toNumber(row.ca_ht), 0)
      : revenueFallback
    const margin = financeKpiAvailable
      ? financeKpiRows.reduce((sum, row) => sum + toNumber(row.marge_ht), 0)
      : marginFallback
    const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0

    const invoicedFallback = filtered.invoices
      .filter(invoice => !['brouillon', 'annulee'].includes(toString(invoice.statut)))
      .reduce((sum, invoice) => sum + toNumber(invoice.montant_ttc || invoice.montant_ht), 0)

    const cashedFallback = filtered.invoices
      .filter(invoice => toString(invoice.statut) === 'payee')
      .reduce((sum, invoice) => sum + toNumber(invoice.montant_ttc || invoice.montant_ht), 0)

    const toInvoiceFallback = doneOrders
      .filter(order => !order.facturation_id)
      .reduce((sum, order) => sum + toNumber(order.prix_ht), 0)

    const invoiced = financeKpiAvailable
      ? financeKpiRows.reduce((sum, row) => sum + toNumber(row.factured_ttc), 0)
      : invoicedFallback
    const cashed = financeKpiAvailable
      ? financeKpiRows.reduce((sum, row) => sum + toNumber(row.encaisse_ttc), 0)
      : cashedFallback
    const toInvoice = financeKpiAvailable
      ? financeKpiRows.reduce((sum, row) => sum + toNumber(row.a_facturer_ht), 0)
      : toInvoiceFallback

    const unpaidLateFallback = filtered.invoices
      .filter(invoice => ['en_retard', 'envoyee'].includes(toString(invoice.statut)))
      .map(invoice => {
        const dueDate = toString(invoice.date_echeance)
        const daysLate = dueDate ? Math.max(0, Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000)) : 0
        return {
          id: toString(invoice.id),
          reference: toString(invoice.numero, 'Facture'),
          client: clientNameById.get(toString(invoice.client_id)) ?? 'Client inconnu',
          amount: toNumber(invoice.montant_ttc || invoice.montant_ht),
          dueDate,
          daysLate,
        }
      })
      .filter(item => item.daysLate > 0)

    const unpaidLate = filtered.financeLatePayments.length > 0
      ? filtered.financeLatePayments
        .map(row => ({
          id: toString(row.id),
          reference: toString(row.numero, 'Facture'),
          client: toString(row.client_nom, 'Client inconnu'),
          amount: toNumber(row.montant_ttc),
          dueDate: toString(row.date_echeance),
          daysLate: toNumber(row.days_late),
        }))
        .filter(item => item.daysLate > 0)
      : unpaidLateFallback

    const fixedCostsFallback = filtered.supplierInvoices
      .filter(row => {
        const code = toString(row.compte_charge_code)
        return code.startsWith('61') || code.startsWith('62') || code.startsWith('64')
      })
      .reduce((sum, row) => sum + toNumber(row.montant_ht), 0)

    const variableCostsFallback = filtered.missionCosts.reduce((sum, row) => sum + toNumber(row.montant_ht), 0)

    const fixedCosts = financeKpiAvailable
      ? financeKpiRows.reduce((sum, row) => sum + toNumber(row.charges_fixes_ht), 0)
      : fixedCostsFallback
    const variableCosts = financeKpiAvailable
      ? financeKpiRows.reduce((sum, row) => sum + toNumber(row.charges_variables_ht), 0)
      : variableCostsFallback

    const dailyPerformance = Array.from({ length: 7 }).map((_, offset) => {
      const day = new Date()
      day.setDate(day.getDate() - (6 - offset))
      const label = day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
      const value = filtered.orders.filter(order => {
        const orderDate = getRowDate(order, ['date_livraison_prevue', 'created_at'])
        if (!orderDate) return false
        return orderDate.toDateString() === day.toDateString() && doneStatuses.has(toString(order.statut_transport))
      }).length
      return { label, value }
    })

    const topVehicles = filtered.orders.reduce<Record<string, number>>((acc, order) => {
      const vehicleId = toString(order.vehicule_id, 'Sans vehicule')
      acc[vehicleId] = (acc[vehicleId] ?? 0) + 1
      return acc
    }, {})

    const occupancyData = Object.entries(topVehicles)
      .slice(0, 6)
      .map(([label, count]) => ({ label: label.slice(0, 8), a: count, b: 8 }))

    const transportTypeData = [
      { label: 'Complet', value: filtered.orders.filter(order => toString(order.type_transport) === 'route').length },
      { label: 'Groupage', value: filtered.orders.filter(order => toString(order.type_transport) === 'groupage').length },
      { label: 'Express', value: filtered.orders.filter(order => toString(order.type_transport) === 'express').length },
    ].filter(item => item.value > 0)

    const alerts: AlertItem[] = [
      ...lateOrders.slice(0, 3).map(order => ({
        id: `late-${toString(order.id)}`,
        level: 'critical' as const,
        title: `Retard OT ${toString(order.reference, 'sans ref')}`,
        detail: 'Retard operationnel detecte, replanification recommandee.',
      })),
      ...data.driverAlerts.slice(0, 2).map(alert => ({
        id: `driver-${toString(alert.id)}`,
        level: 'warning' as const,
        title: toString(alert.label, 'Alerte conducteur'),
        detail: 'Verifier conformite documentaire et disponibilite terrain.',
      })),
    ].slice(0, 5)

    const profitByClient = filtered.margins.reduce<Record<string, { ca: number; marge: number }>>((acc, row) => {
      const clientLabel = toString(row.client, 'Client')
      const current = acc[clientLabel] ?? { ca: 0, marge: 0 }
      current.ca += toNumber(row.chiffre_affaires)
      current.marge += toNumber(row.marge_brute)
      acc[clientLabel] = current
      return acc
    }, {})

    const clientProfitBar = filtered.financeClientPerf.length > 0
      ? filtered.financeClientPerf
        .reduce<Record<string, { ca: number; marge: number }>>((acc, row) => {
          const key = toString(row.client_nom, 'Client')
          const current = acc[key] ?? { ca: 0, marge: 0 }
          current.ca += toNumber(row.ca_ttc)
          current.marge += toNumber(row.marge_ht)
          acc[key] = current
          return acc
        }, {})
      : profitByClient

    const clientProfitBarData = Object.entries(clientProfitBar)
      .slice(0, 6)
      .map(([label, values]) => ({ label: label.slice(0, 10), a: values.ca, b: values.marge }))

    const fleetUsage = data.vehicles.length > 0 ? (filtered.orders.filter(order => ['en_cours', 'charge'].includes(toString(order.statut_transport))).length / Math.max(data.vehicles.length, 1)) * 100 : 0

    const dirScore = Math.max(0, Math.min(100, (marginRate * 3 + (100 - lateOrders.length * 5) + fleetUsage) / 3))

    const fleetStateData = [
      { label: 'OK', value: data.vehicles.filter(v => ['disponible', 'en_service'].includes(toString(v.statut))).length },
      { label: 'Panne', value: data.vehicles.filter(v => toString(v.statut) === 'hs').length },
      { label: 'Maintenance', value: data.vehicles.filter(v => toString(v.statut) === 'maintenance').length },
    ].filter(item => item.value > 0)

    const maintenanceCosts = groupByMonth(filtered.missionCosts, 'montant_ht', ['date_cout', 'created_at']).map(item => ({ label: item.label, a: item.value, b: item.value * 0.5 }))

    const mileageLine = Array.from({ length: 7 }).map((_, idx) => ({
      label: `S${idx + 1}`,
      value: filtered.orders.slice(idx * 6, idx * 6 + 6).reduce((sum, order) => sum + toNumber(order.distance_km), 0),
    }))

    const pipelineData = [
      { label: 'Prospects', value: data.clients.filter(client => toString(client.type_client) === 'prospect').length },
      { label: 'Qualifies', value: filtered.orders.filter(order => toString(order.statut_transport) === 'planifie').length },
      { label: 'Negociation', value: filtered.orders.filter(order => toString(order.statut_transport) === 'valide').length },
      { label: 'Signes', value: doneOrders.length },
    ]

    const salesLine = groupByMonth(filtered.margins, 'chiffre_affaires', ['created_at', 'date_livraison_prevue'])

    const conversionRate = pipelineData[0].value > 0 ? (pipelineData[pipelineData.length - 1].value / pipelineData[0].value) * 100 : 0

    const driversPresent = data.drivers.filter(driver => toString(driver.statut) === 'actif').length
    const driversAbsent = data.drivers.filter(driver => ['inactif', 'conge', 'arret_maladie'].includes(toString(driver.statut))).length

    const employeePerfBar = Object.entries(
      filtered.orders.reduce<Record<string, number>>((acc, order) => {
        const label = toString(order.conducteur_id, 'N/A')
        acc[label] = (acc[label] ?? 0) + 1
        return acc
      }, {}),
    )
      .slice(0, 6)
      .map(([label, value]) => ({ label: label.slice(0, 8), a: value, b: Math.max(1, value * 0.8) }))

    const completedInterviews = data.interviews.filter(interview => ['realise', 'termine', 'clos'].includes(toString(interview.statut))).length

    const turnoverLine = Array.from({ length: 4 }).map((_, idx) => {
      const monthDate = new Date()
      monthDate.setMonth(monthDate.getMonth() - (3 - idx))
      const created = data.drivers.filter(driver => {
        const date = getRowDate(driver, ['created_at'])
        return date ? date.getMonth() === monthDate.getMonth() && date.getFullYear() === monthDate.getFullYear() : false
      }).length
      const left = data.drivers.filter(driver => toString(driver.statut) === 'inactif').length
      return {
        label: monthDate.toLocaleDateString('fr-FR', { month: 'short' }),
        value: created - left / 4,
      }
    })

    const cashRate = invoiced > 0 ? (cashed / invoiced) * 100 : 0
    const monthlyRevenueLine = groupByMonth(filtered.margins, 'chiffre_affaires', ['created_at', 'date_livraison_prevue'])
    const monthlyCostsLine = groupByMonth(filtered.missionCosts, 'montant_ht', ['date_cout', 'created_at'])

    const financeTrend = financeKpiAvailable
      ? financeKpiRows
        .slice()
        .sort((left, right) => String(left.month_key).localeCompare(String(right.month_key)))
        .map(row => ({
          label: toString(row.month_key).slice(5, 7),
          a: toNumber(row.factured_ttc),
          b: toNumber(row.charges_fixes_ht) + toNumber(row.charges_variables_ht),
        }))
      : monthlyRevenueLine.map(item => {
        const matchedCost = monthlyCostsLine.find(cost => cost.label === item.label)?.value ?? 0
        return {
          label: item.label,
          a: item.value,
          b: matchedCost,
        }
      })

    const chargesDonut = filtered.financeChargeBreakdown.length > 0
      ? Object.entries(
        filtered.financeChargeBreakdown.reduce<Record<string, number>>((acc, row) => {
          const category = toString(row.charge_category, 'autres')
          acc[category] = (acc[category] ?? 0) + toNumber(row.montant_ht)
          return acc
        }, {}),
      ).map(([label, value]) => ({ label: label.charAt(0).toUpperCase() + label.slice(1), value }))
      : [
        { label: 'Carburant', value: filtered.missionCosts.filter(cost => toString(cost.type_cout) === 'carburant').reduce((sum, row) => sum + toNumber(row.montant_ht), 0) },
        { label: 'Peages', value: filtered.missionCosts.filter(cost => toString(cost.type_cout) === 'peage').reduce((sum, row) => sum + toNumber(row.montant_ht), 0) },
        { label: 'Salaires', value: fixedCosts * 0.45 },
        { label: 'Maintenance', value: filtered.missionCosts.filter(cost => ['amortissement', 'autre'].includes(toString(cost.type_cout))).reduce((sum, row) => sum + toNumber(row.montant_ht), 0) },
        { label: 'Affretement', value: filtered.missionCosts.filter(cost => toString(cost.type_cout) === 'sous_traitance').reduce((sum, row) => sum + toNumber(row.montant_ht), 0) },
        { label: 'Autres', value: Math.max(0, variableCosts * 0.12) },
      ]

    const chargesDonutData = chargesDonut.filter(item => item.value > 0)

    const treasuryAlerts: AlertItem[] = [
      ...unpaidLate.slice(0, 3).map(item => ({
        id: `cash-${item.id}`,
        level: 'critical' as const,
        title: `${item.reference} en retard`,
        detail: `${item.daysLate} jours de retard, ${formatCurrency(item.amount)} en risque de tresorerie.`,
      })),
      ...filtered.supplierInvoices.filter(invoice => {
        const due = toString(invoice.date_echeance)
        if (!due) return false
        const diff = Math.floor((new Date(due).getTime() - Date.now()) / 86400000)
        return diff >= 0 && diff <= 7
      }).slice(0, 2).map(invoice => ({
        id: `supplier-${toString(invoice.id)}`,
        level: 'warning' as const,
        title: `Echeance fournisseur ${toString(invoice.numero, '')}`,
        detail: 'Paiement fournisseur proche, verification cash recommandee.',
      })),
    ]

    return {
      doneOrders,
      plannedOrders,
      lateOrders,
      revenue,
      margin,
      marginRate,
      invoiced,
      cashed,
      toInvoice,
      unpaidLate,
      fixedCosts,
      variableCosts,
      dailyPerformance,
      occupancyData,
      transportTypeData,
      alerts,
      clientProfitBar: clientProfitBarData,
      fleetUsage,
      dirScore,
      fleetStateData,
      maintenanceCosts,
      mileageLine,
      pipelineData,
      salesLine,
      conversionRate,
      driversPresent,
      driversAbsent,
      employeePerfBar,
      completedInterviews,
      turnoverLine,
      cashRate,
      financeTrend,
      chargesDonut: chargesDonutData,
      treasuryAlerts,
    }
  }, [clientNameById, data.driverAlerts, data.drivers, data.fleetAlerts, data.interviews, data.vehicles.length, filtered.financeChargeBreakdown, filtered.financeClientPerf, filtered.financeKpis, filtered.financeLatePayments, filtered.invoices, filtered.margins, filtered.missionCosts, filtered.orders, filtered.supplierInvoices])

  if (showLegacy) {
    return (
      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setShowLegacy(false)}
          className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)]"
        >
          Revenir au cockpit V2.1
        </button>
        <RoleCockpitPanel />
      </section>
    )
  }

  if (loading) return <DashboardSkeleton />

  const headerSubtitle = `${ROLE_LABELS[currentRole] ?? currentRole} · comprehension en 5 secondes`

  function renderExploitant() {
    return (
      <>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="OT realisees / prevues"
            value={`${formatCompact(view.doneOrders.length)} / ${formatCompact(view.plannedOrders.length)}`}
            delta={formatPercent(view.plannedOrders.length > 0 ? (view.doneOrders.length / view.plannedOrders.length) * 100 : 0)}
            note="Execution de la periode"
            tone={view.lateOrders.length > 0 ? 'warning' : 'success'}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartContainer title="Performance journaliere" subtitle="OT terminees par jour">
            <Suspense fallback={chartFallback()}>
              <ChartsHost kind="line" lineData={view.dailyPerformance} colors={['#2563eb']} />
            </Suspense>
          </ChartContainer>

          <ChartContainer title="Occupation camions" subtitle="Charge vehicule vs capacite cible">
            <Suspense fallback={chartFallback()}>
              <ChartsHost kind="bar" barData={view.occupancyData} colors={['#2563eb', '#f59e0b']} />
            </Suspense>
          </ChartContainer>

          <ChartContainer title="Type de transport" subtitle="Complet, groupage, express">
            <Suspense fallback={chartFallback()}>
              <ChartsHost kind="donut" donutData={view.transportTypeData} colors={['#2563eb', '#f59e0b', '#10b981']} />
            </Suspense>
          </ChartContainer>

          <AlertBox title="Retards et anomalies" items={view.alerts} />
        </div>
      </>
    )
  }

  function renderConducteur() {
    const perfScore = Math.max(0, Math.min(100, 100 - view.lateOrders.length * 6))
    return (
      <div className="grid gap-4">
        <KpiCard
          label="Nombre de livraisons"
          value={formatCompact(view.doneOrders.length)}
          delta={formatPercent(perfScore)}
          note="Mobile first: lecture terrain immediate"
          tone={perfScore > 85 ? 'success' : 'warning'}
        />

        <ChartContainer title="Score performance" subtitle="Respect horaires et execution">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="gauge" gaugeValue={perfScore} gaugeTarget={92} colors={['#10b981']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Temps de tournee" subtitle="Estimation journaliere">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="line" lineData={view.dailyPerformance.map(item => ({ label: item.label, value: item.value * 1.4 + 2 }))} colors={['#2563eb']} />
          </Suspense>
        </ChartContainer>

        <AlertBox title="Alertes simples" items={view.alerts.slice(0, 3)} />
      </div>
    )
  }

  function renderDirigeant() {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="grid gap-3 md:grid-cols-2 xl:col-span-2">
          <KpiCard label="CA global" value={formatCurrency(view.revenue)} delta={formatPercent(view.marginRate)} note="Marge moyenne" tone="info" />
          <KpiCard label="Marge globale" value={formatCurrency(view.margin)} delta={formatPercent(view.fleetUsage)} note="Utilisation flotte" tone={view.marginRate >= 10 ? 'success' : 'warning'} />
        </div>

        <ChartContainer title="CA vs couts" subtitle="Vision decisionnelle">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="bar" barData={view.financeTrend} colors={['#2563eb', '#f59e0b']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Rentabilite client" subtitle="CA et marge par client">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="bar" barData={view.clientProfitBar} colors={['#2563eb', '#10b981']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Utilisation flotte" subtitle="Disponibilite vs charge">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="donut" donutData={view.fleetStateData} colors={['#10b981', '#dc2626', '#f59e0b']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Score global" subtitle="KPI consolide">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="gauge" gaugeValue={view.dirScore} gaugeTarget={90} colors={['#2563eb']} />
          </Suspense>
        </ChartContainer>
      </div>
    )
  }

  function renderParc() {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartContainer title="Etat flotte" subtitle="OK, panne, maintenance">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="donut" donutData={view.fleetStateData} colors={['#10b981', '#dc2626', '#f59e0b']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Cout maintenance" subtitle="Evolution mensuelle">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="bar" barData={view.maintenanceCosts} colors={['#f59e0b', '#2563eb']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Kilometrage" subtitle="Tendance exploitation">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="line" lineData={view.mileageLine} colors={['#2563eb']} />
          </Suspense>
        </ChartContainer>

        <AlertBox title="Alertes vehicules" items={view.alerts} />
      </div>
    )
  }

  function renderCommercial() {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartContainer title="Pipeline" subtitle="Du prospect a la conversion">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="funnel" funnelData={view.pipelineData} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="CA par client" subtitle="Top portefeuille">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="bar" barData={view.clientProfitBar} colors={['#2563eb', '#10b981']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Evolution CA" subtitle="Tendance mensuelle">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="line" lineData={view.salesLine} colors={['#2563eb']} />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Taux conversion" subtitle="Objectif commercial">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="gauge" gaugeValue={view.conversionRate} gaugeTarget={35} colors={['#10b981']} />
          </Suspense>
        </ChartContainer>
      </div>
    )
  }

  function renderRh() {
    return (
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartContainer title="Presence / absence" subtitle="Etat effectif">
          <Suspense fallback={chartFallback()}>
            <ChartsHost
              kind="donut"
              donutData={[
                { label: 'Presence', value: view.driversPresent },
                { label: 'Absence', value: view.driversAbsent },
              ]}
              colors={['#10b981', '#f59e0b']}
            />
          </Suspense>
        </ChartContainer>

        <ChartContainer title="Performance employes" subtitle="Missions par conducteur">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="bar" barData={view.employeePerfBar} colors={['#2563eb', '#10b981']} />
          </Suspense>
        </ChartContainer>

        <KpiCard
          label="Entretiens realises"
          value={formatCompact(view.completedInterviews)}
          note="Suivi RH de la periode"
          tone="info"
        />

        <ChartContainer title="Turnover" subtitle="Tendance recente">
          <Suspense fallback={chartFallback()}>
            <ChartsHost kind="line" lineData={view.turnoverLine} colors={['#2563eb']} />
          </Suspense>
        </ChartContainer>
      </div>
    )
  }

  function renderFinance() {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="CA encaisse" value={formatCurrency(view.cashed)} delta={formatPercent(view.cashRate)} note="Taux encaissement" tone={view.cashRate >= 80 ? 'success' : 'warning'} />
          <KpiCard label="Reste a facturer" value={formatCurrency(view.toInvoice)} note="OT terminees non facturees" tone={view.toInvoice > 0 ? 'warning' : 'success'} />
          <KpiCard label="Impayes" value={formatCurrency(view.unpaidLate.reduce((sum, item) => sum + item.amount, 0))} note={`${formatCompact(view.unpaidLate.length)} facture(s) en retard`} tone={view.unpaidLate.length > 0 ? 'critical' : 'success'} />
          <KpiCard label="Marge globale" value={formatCurrency(view.margin)} delta={formatPercent(view.marginRate)} note="Lecture rentabilite" tone={view.marginRate < 10 ? 'warning' : 'success'} />
        </div>

        <FinanceSummaryCard
          factured={view.invoiced}
          cashed={view.cashed}
          toInvoice={view.toInvoice}
          fixedCosts={view.fixedCosts}
          variableCosts={view.variableCosts}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <ChartContainer title="CA et marge par client" subtitle="Comparatif operationnel">
            <Suspense fallback={chartFallback()}>
              <ChartsHost kind="bar" barData={view.clientProfitBar} colors={['#2563eb', '#10b981']} />
            </Suspense>
          </ChartContainer>

          <ChartContainer title="Evolution CA / charges" subtitle="Vision mensuelle">
            <Suspense fallback={chartFallback()}>
              <ChartsHost kind="bar" barData={view.financeTrend} colors={['#2563eb', '#f59e0b']} />
            </Suspense>
          </ChartContainer>

          <ChartContainer title="Repartition des charges" subtitle="Carburant, peages, salaires, maintenance, affretement">
            <Suspense fallback={chartFallback()}>
              <ChartsHost kind="donut" donutData={view.chargesDonut} colors={['#2563eb', '#f59e0b', '#10b981']} />
            </Suspense>
          </ChartContainer>

          <ChartContainer title="Taux d encaissement" subtitle="Progression sur la periode">
            <Suspense fallback={chartFallback()}>
              <ChartsHost kind="gauge" gaugeValue={view.cashRate} gaugeTarget={92} colors={['#10b981']} />
            </Suspense>
          </ChartContainer>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <LatePaymentWidget
            items={view.unpaidLate.map(item => ({
              ...item,
              dueDate: dateToDisplay(item.dueDate),
            }))}
          />
          <AlertBox title="Alertes tresorerie prioritaires" items={view.treasuryAlerts} />
        </div>
      </div>
    )
  }

  return (
    <section className="space-y-4">
      <header
        className="rounded-[24px] border px-4 py-4"
        style={{
          borderColor: 'var(--border)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--surface) 90%, #dbeafe 10%), color-mix(in srgb, var(--surface-soft) 85%, #f8fafc 15%))',
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--primary)]">Cockpit KPI V2.1</p>
            <h2 className="mt-1 text-xl font-semibold text-[color:var(--text-heading)]">{headerSubtitle}</h2>
            <p className="mt-1 text-xs text-[color:var(--text-secondary)]">Priorite UX: lecture instantanee, contrastes forts, widgets strictement utiles.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowLegacy(true)}
            className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)]"
          >
            Ouvrir cockpit historique
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-semibold text-[color:var(--text-secondary)]">
            Periode
            <select value={period} onChange={event => setPeriod(event.target.value as PeriodFilter)} className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]">
              <option value="day">Jour</option>
              <option value="week">Semaine</option>
              <option value="month">Mois</option>
              <option value="quarter">Trimestre</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-[color:var(--text-secondary)]">
            Agence
            <select value={agencyFilter} onChange={event => setAgencyFilter(event.target.value)} className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]">
              <option value="all">Toutes</option>
              {filterOptions.agencies.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold text-[color:var(--text-secondary)]">
            Service
            <select value={serviceFilter} onChange={event => setServiceFilter(event.target.value)} className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]">
              <option value="all">Tous</option>
              {filterOptions.services.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold text-[color:var(--text-secondary)]">
            Client
            <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]">
              <option value="all">Tous</option>
              {filterOptions.clients.map(client => <option key={client.id} value={client.id}>{client.label}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold text-[color:var(--text-secondary)]">
            Activite
            <select value={activityFilter} onChange={event => setActivityFilter(event.target.value)} className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 text-sm text-[color:var(--text-primary)]">
              <option value="all">Toutes</option>
              {filterOptions.activities.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </header>

      {hydrating ? (
        <div
          className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-xs text-[color:var(--text-secondary)]"
          role="status"
          aria-live="polite"
        >
          Affichage rapide actif. Enrichissement progressif des indicateurs ({hydrationProgress}%).
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">{error}</div>
      ) : null}

      {dashboardRole === 'exploitant' ? renderExploitant() : null}
      {dashboardRole === 'conducteur' ? renderConducteur() : null}
      {dashboardRole === 'dirigeant' ? renderDirigeant() : null}
      {dashboardRole === 'parc' ? renderParc() : null}
      {dashboardRole === 'commercial' ? renderCommercial() : null}
      {dashboardRole === 'rh' ? renderRh() : null}
      {dashboardRole === 'finance' ? renderFinance() : null}
    </section>
  )
}
