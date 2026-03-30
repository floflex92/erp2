import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { STATUT_OPS, StatutOpsDot, type StatutOps } from '@/lib/statut-ops'
import {
  getAffretementContextByOtId,
  listAffretementContracts,
  listAffreteurEquipments,
  subscribeAffretementPortalUpdates,
  type AffretementContract,
} from '@/lib/affretementPortal'
import { validatePlanningDropAudit, type CEAlert } from '@/lib/ce561Validation'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type OT = {
  id: string; reference: string; client_nom: string
  date_chargement_prevue: string | null; date_livraison_prevue: string | null
  type_transport: string; nature_marchandise: string | null
  statut: string; conducteur_id: string | null; vehicule_id: string | null
  remorque_id: string | null; prix_ht: number | null; statut_operationnel: string | null
  distance_km: number | null; donneur_ordre_id: string | null
  chargement_site_id: string | null; livraison_site_id: string | null
  est_affretee: boolean
}
type Conducteur = { id: string; nom: string; prenom: string; statut: string }
type Vehicule   = { id: string; immatriculation: string; marque: string | null; modele: string | null; statut: string }
type Remorque   = { id: string; immatriculation: string; type_remorque: string; statut: string }
type ClientRef  = { id: string; nom: string; actif: boolean | null }
type LogisticSite = { id: string; nom: string; adresse: string | null }
type Affectation = {
  id: string
  conducteur_id: string | null
  vehicule_id: string | null
  remorque_id: string | null
  actif: boolean
}
type Tab        = 'conducteurs' | 'camions' | 'remorques'
type ViewMode   = 'semaine' | 'jour'
type ColorMode  = 'statut' | 'conducteur' | 'type' | 'client'
type AssignForm = {
  ot: OT; conducteur_id: string; vehicule_id: string; remorque_id: string
  date_chargement: string; time_chargement: string; date_livraison: string; time_livraison: string
}
type EditDraft = {
  reference: string; nature_marchandise: string; prix_ht: string; statut: string
  statut_operationnel: string | null
  conducteur_id: string; vehicule_id: string; remorque_id: string
  date_chargement: string; time_chargement: string; date_livraison: string; time_livraison: string
  donneur_ordre_id: string
  chargement_site_id: string
  livraison_site_id: string
  distance_km: string
}
type PlanningInlineType = 'course' | 'hlp' | 'maintenance' | 'repos'
type CustomRow   = { id: string; label: string; subtitle: string }
type CustomBlock = {
  id: string
  rowId: string
  label: string
  dateStart: string
  dateEnd: string
  color: string
  otId?: string
  kind?: Exclude<PlanningInlineType, 'course'>
}
type DragState   = { ot: OT | null; kind: 'pool'|'block'|'custom'; durationDays: number; durationMinutes: number; customBlockId?: string }
type NativeDragPayload = {
  kind: 'pool' | 'block' | 'custom'
  otId?: string
  durationDays: number
  durationMinutes: number
  customBlockId?: string
}
type RowOrderMap = Record<Tab, string[]>
type ContextMenu = { x: number; y: number; ot: OT } | null
type AffretementContext = NonNullable<ReturnType<typeof getAffretementContextByOtId>>
type RowConflict = { first: OT; second: OT; overlapMinutes: number }

function getUpdateFailureReason(result: { error?: { message?: string } | null; data?: unknown }) {
  if (result.error?.message) return result.error.message
  if (Array.isArray(result.data)) {
    return 'Ecriture distante refusee, fallback local detecte (verifier droits/RLS Supabase).'
  }
  if (result.data == null) {
    return 'Aucune ligne distante mise a jour (OT introuvable ou non accessible).'
  }
  return 'Mise a jour non confirmee sur la base distante.'
}

const ACTIVE_AFFRETEMENT_STATUSES: AffretementContract['status'][] = ['propose', 'accepte', 'en_cours', 'termine']

// â”€â”€â”€ Date helpers (timezone-safe) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return date
}
function addDays(d: Date, n: number): Date { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() + n); return r }
// Timezone-safe ISO string (uses local date components, not UTC)
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
// Timezone-safe parse (creates local midnight, not UTC)
function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function daysDiff(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000) }
function snapToQuarter(minutes: number): number { return Math.round(minutes / 15) * 15 }
function minutesFromMidnight(iso: string): number { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() }
function toDateTimeISO(date: string, time: string): string { return `${date}T${time || '08:00'}:00` }
function toDateTimeFromDate(d: Date): string {
  return `${toISO(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`
}
function normalizeDateTimeInput(value: string, defaultTime = '08:00'): string {
  const date = value.slice(0, 10)
  const rawTime = value.includes('T') ? value.slice(11, 16) : defaultTime
  const time = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : defaultTime
  return `${date}T${time}:00`
}
function isoToTime(iso: string | null): string {
  if (!iso) return '08:00'
  if (iso.includes('T')) return iso.slice(11, 16)
  return '08:00'
}
function isoToDate(iso: string | null): string {
  if (!iso) return toISO(new Date())
  return iso.slice(0, 10)
}

const DAY_NAMES   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
const MONTH_NAMES = ['jan','fev','mar','avr','mai','juin','juil','aout','sep','oct','nov','dec']
function fmtWeek(start: Date): string {
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth())
    return `${start.getDate()}-${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} - ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`
}
function fmtDay(d: Date): string {
  return `${DAY_NAMES[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function toTimeValue(iso: string | null, fallbackDayISO: string): number {
  const safeISO = iso && iso.includes('T') ? iso : `${fallbackDayISO}T08:00:00`
  const d = new Date(safeISO)
  if (!Number.isFinite(d.getTime())) return new Date(`${fallbackDayISO}T08:00:00`).getTime()
  return d.getTime()
}

// â”€â”€â”€ Block position (week view) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function blockPos(ot: OT, weekStart: Date): React.CSSProperties | null {
  const weekStartMs    = weekStart.getTime()
  const weekDurationMs = 7 * 24 * 60 * 60 * 1000
  const weekEndMs      = weekStartMs + weekDurationMs  // exclusif : lundi suivant 00:00

  const startISO = ot.date_chargement_prevue ?? ot.date_livraison_prevue
  const endISO   = ot.date_livraison_prevue  ?? ot.date_chargement_prevue
  if (!startISO || !endISO) return null

  const startMs = toTimeValue(startISO, startISO.slice(0, 10))
  const endMs   = toTimeValue(endISO,   endISO.slice(0, 10))

  if (endMs < weekStartMs || startMs >= weekEndMs) return null

  const visStartMs = Math.max(startMs, weekStartMs)
  const visEndMs   = Math.min(endMs,   weekEndMs)

  // Largeur minimale 30 minutes pour rester lisible
  const minWidthMs = 30 * 60 * 1000
  const left  = (visStartMs - weekStartMs) / weekDurationMs
  const width = Math.max(minWidthMs, visEndMs - visStartMs) / weekDurationMs

  return { position:'absolute', top:'6px', height:'52px', left:`calc(${left*100}% + 2px)`, width:`calc(${width*100}% - 4px)` }
}

// Block position (day view - full 24h)

const DAY_START_MIN  = 0            // 00:00
const DAY_TOTAL_MIN  = 24 * 60      // 00:00 - 23:59
const HOUR_WIDTH_PX  = 100          // px per hour column

function blockPosDay(startISO: string | null, endISO: string | null, selectedDay: string): React.CSSProperties | null {
  if (!startISO) return null
  const startDate = isoToDate(startISO)
  const endDate   = isoToDate(endISO ?? startISO)
  if (startDate > selectedDay || endDate < selectedDay) return null
  // Si l'OT débute avant le jour sélectionné → commence à 00:00, sinon utilise l'heure réelle
  const startMin = startDate < selectedDay ? DAY_START_MIN : minutesFromMidnight(startISO)
  // Si l'OT finit après le jour sélectionné → finit à 23:59, sinon utilise l'heure réelle
  const endMin   = endDate   > selectedDay ? DAY_START_MIN + DAY_TOTAL_MIN : minutesFromMidnight(endISO ?? startISO)
  const cStart = Math.max(DAY_START_MIN, Math.min(DAY_START_MIN + DAY_TOTAL_MIN, startMin))
  const cEnd   = Math.max(cStart + 15,  Math.min(DAY_START_MIN + DAY_TOTAL_MIN, endMin > cStart ? endMin : cStart + 60))
  const left  = (cStart - DAY_START_MIN) / DAY_TOTAL_MIN
  const width = (cEnd   - cStart)        / DAY_TOTAL_MIN
  if (width <= 0) return null
  return { position:'absolute', top:'4px', height:'52px', left:`${left*100}%`, width:`${width*100}%` }
}

// â”€â”€â”€ Color constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUT_CLS: Record<string,string> = {
  planifie: 'bg-indigo-600 border-indigo-500',
  en_cours: 'bg-emerald-600 border-emerald-500',
  livre:    'bg-teal-600 border-teal-500',
  facture:  'bg-violet-700 border-violet-600',
}
const BADGE_CLS: Record<string,string> = {
  brouillon:'bg-slate-700 text-slate-400', confirme:'bg-blue-900/60 text-blue-300',
  planifie: 'bg-indigo-900/60 text-indigo-300', en_cours:'bg-emerald-900/60 text-emerald-300',
  livre:    'bg-teal-900/60 text-teal-300',    facture: 'bg-violet-900/60 text-violet-300',
}
const STATUT_LABEL: Record<string,string> = {
  brouillon:'Brouillon', confirme:'Confirme', planifie:'Planifie',
  en_cours:'En cours', livre:'Livre', facture:'Facture', annule:'Annule',
}
const CUSTOM_COLORS = [
  'bg-sky-600 border-sky-500','bg-rose-600 border-rose-500','bg-amber-600 border-amber-500',
  'bg-lime-600 border-lime-500','bg-fuchsia-600 border-fuchsia-500','bg-cyan-600 border-cyan-500',
]
const INLINE_EVENT_COLORS: Record<Exclude<PlanningInlineType, 'course'>, string> = {
  hlp: 'bg-slate-600 border-slate-500',
  maintenance: 'bg-orange-600 border-orange-500',
  repos: 'bg-indigo-600 border-indigo-500',
}
const INLINE_EVENT_LABELS: Record<PlanningInlineType, string> = {
  course: 'Course',
  hlp: 'HLP',
  maintenance: 'Maintenance',
  repos: 'Repos',
}
const COLOR_PALETTE = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6',
  '#f97316','#84cc16','#06b6d4','#fb7185',
]
const TYPE_TRANSPORT_COLORS: Record<string, string> = {
  complet:'#3b82f6', groupage:'#f59e0b', express:'#ef4444',
  partiel:'#8b5cf6', frigorifique:'#06b6d4', vrac:'#84cc16', conventionnel:'#6b7280',
}

// â”€â”€â”€ localStorage helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ROWS_KEY             = 'nexora_planning_custom_rows_v1'
const BLOCKS_KEY           = 'nexora_planning_custom_blocks_v1'
const CONDUCTOR_COLORS_KEY = 'nexora_planning_conductor_colors_v1'
const ROW_ORDER_KEY        = 'nexora_planning_row_order_v1'
const SHOW_AFF_ASSETS_KEY  = 'nexora_planning_show_affretement_assets_v1'
const COMPLIANCE_BLOCK_KEY = 'nexora_planning_compliance_block_v1'
const COMPLIANCE_BLOCK_RULES_KEY = 'nexora_planning_compliance_block_rules_v1'

const COMPLIANCE_RULE_LABELS: Record<string, string> = {
  PERMIS_EXPIRE: 'Permis CE expire',
  FCO_EXPIREE: 'FIMO/FCO expiree',
  CARTE_EXPIREE: 'Carte conducteur expiree',
  CHEVAUCHEMENT: 'Chevauchement de missions',
  CONDUITE_JOUR_MAX: 'Conduite journaliere max depassee',
  CONDUITE_JOUR_ETENDU: 'Conduite journaliere etendue (avertissement)',
  CONDUITE_HEBDO_MAX: 'Conduite hebdomadaire max depassee',
  CONDUITE_BI_HEBDO_MAX: 'Conduite bi-hebdo max depassee',
  PAUSE_OBLIGATOIRE: 'Pause obligatoire 45 min (Art. 7 CE561)',
  PAUSE_A_VERIFIER: 'Pause a verifier (donnees tachy absentes)',
  REPOS_INSUFFISANT: 'Repos journalier insuffisant',
  REPOS_REDUIT: 'Repos journalier reduit',
  REPOS_HEBDO_INSUFFISANT: 'Repos hebdomadaire insuffisant',
  REPOS_HEBDO_REDUIT: 'Repos hebdomadaire reduit',
  NB_REPOS_HEBDO_REDUIT_MAX: 'Trop de repos hebdo reduits',
  JOURS_CONSECUTIFS_MAX: 'Jours consecutifs max depasses',
}

const DEFAULT_BLOCKING_RULE_CODES = new Set<string>([
  'PERMIS_EXPIRE',
  'FCO_EXPIREE',
  'CARTE_EXPIREE',
  'CHEVAUCHEMENT',
  'CONDUITE_JOUR_MAX',
  'CONDUITE_HEBDO_MAX',
  'CONDUITE_BI_HEBDO_MAX',
  'PAUSE_OBLIGATOIRE',
  'REPOS_INSUFFISANT',
  'REPOS_HEBDO_INSUFFISANT',
  'NB_REPOS_HEBDO_REDUIT_MAX',
  'JOURS_CONSECUTIFS_MAX',
])

function loadCustomRows(): CustomRow[]   { try { return JSON.parse(localStorage.getItem(ROWS_KEY)   ?? '[]') } catch { return [] } }
function saveCustomRows(r: CustomRow[])  { localStorage.setItem(ROWS_KEY,   JSON.stringify(r)) }
function loadCustomBlocks(): CustomBlock[]   { try { return JSON.parse(localStorage.getItem(BLOCKS_KEY) ?? '[]') } catch { return [] } }
function saveCustomBlocks(b: CustomBlock[])  { localStorage.setItem(BLOCKS_KEY, JSON.stringify(b)) }
function loadConductorColors(): Record<string,string> { try { return JSON.parse(localStorage.getItem(CONDUCTOR_COLORS_KEY) ?? '{}') } catch { return {} } }
function saveConductorColors(c: Record<string,string>) { localStorage.setItem(CONDUCTOR_COLORS_KEY, JSON.stringify(c)) }
function loadRowOrder(): RowOrderMap { try { return JSON.parse(localStorage.getItem(ROW_ORDER_KEY) ?? '{}') } catch { return {} as RowOrderMap } }
function saveRowOrder(o: RowOrderMap)  { localStorage.setItem(ROW_ORDER_KEY, JSON.stringify(o)) }
function loadShowAffretementAssets(): boolean {
  try {
    const raw = localStorage.getItem(SHOW_AFF_ASSETS_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}
function saveShowAffretementAssets(value: boolean) { localStorage.setItem(SHOW_AFF_ASSETS_KEY, value ? '1' : '0') }
function loadComplianceBlockMode(): boolean {
  try {
    return localStorage.getItem(COMPLIANCE_BLOCK_KEY) === '1'
  } catch {
    return false
  }
}
function saveComplianceBlockMode(value: boolean) { localStorage.setItem(COMPLIANCE_BLOCK_KEY, value ? '1' : '0') }
function loadComplianceBlockingRules(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(COMPLIANCE_BLOCK_RULES_KEY) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}
function saveComplianceBlockingRules(value: Record<string, boolean>) {
  localStorage.setItem(COMPLIANCE_BLOCK_RULES_KEY, JSON.stringify(value))
}
function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Planning() {
  const [weekStart,   setWeekStart]   = useState(() => getMonday(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => toISO(new Date()))
  const [tab,         setTab]         = useState<Tab>('conducteurs')
  const [viewMode,    setViewMode]    = useState<ViewMode>('semaine')

  const [pool,        setPool]        = useState<OT[]>([])
  const [ganttOTs,    setGanttOTs]    = useState<OT[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [vehicules,   setVehicules]   = useState<Vehicule[]>([])
  const [remorques,   setRemorques]   = useState<Remorque[]>([])
  const [clients,     setClients]     = useState<ClientRef[]>([])
  const [logisticSites, setLogisticSites] = useState<LogisticSite[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])

  const [assignModal,  setAssignModal]  = useState<AssignForm | null>(null)
  const [selected,     setSelected]     = useState<OT | null>(null)
  const [editDraft,    setEditDraft]    = useState<EditDraft | null>(null)
  const [saving,       setSaving]       = useState(false)
  const [planningNotice, setPlanningNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Drag & drop (OT blocks)
  const [drag,       setDragState]  = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const setDrag = useCallback((d: DragState | null) => { dragRef.current = d; setDragState(d) }, [])
  const [hoverRow,   setHoverRow]   = useState<{ rowId:string; dayIdx:number; timeMin:number } | null>(null)
  const [savingOtId, setSavingOtId] = useState<string | null>(null)

  // Custom rows
  const [customRows,    setCustomRows]    = useState<CustomRow[]>(() => loadCustomRows())
  const [customBlocks,  setCustomBlocks]  = useState<CustomBlock[]>(() => loadCustomBlocks())
  const [showAddRow,    setShowAddRow]    = useState(false)
  const [newRowLabel,   setNewRowLabel]   = useState('')
  const [addBlockFor,   setAddBlockFor]   = useState<{ rowId:string; dateStart:string } | null>(null)
  const [newBlockLabel, setNewBlockLabel] = useState('')
  const [newBlockType, setNewBlockType] = useState<PlanningInlineType>('hlp')
  const [newBlockClientId, setNewBlockClientId] = useState('')
  const [newBlockReferenceCourse, setNewBlockReferenceCourse] = useState('')
  const [newBlockDonneurOrdreId, setNewBlockDonneurOrdreId] = useState('')
  const [newBlockChargementSiteId, setNewBlockChargementSiteId] = useState('')
  const [newBlockLivraisonSiteId, setNewBlockLivraisonSiteId] = useState('')
  const [newBlockDistanceKm, setNewBlockDistanceKm] = useState('')
  const [newBlockDateChargement, setNewBlockDateChargement] = useState(toISO(new Date()))
  const [newBlockTimeChargement, setNewBlockTimeChargement] = useState('08:00')
  const [newBlockDateLivraison, setNewBlockDateLivraison] = useState(toISO(new Date()))
  const [newBlockTimeLivraison, setNewBlockTimeLivraison] = useState('18:00')
  const [newBlockDurationHours, setNewBlockDurationHours] = useState('10')
  const [creatingInlineEvent, setCreatingInlineEvent] = useState(false)

  // Couleurs conducteurs
  const [conductorColors, setConductorColors] = useState<Record<string,string>>(() => loadConductorColors())
  const [colorPickerFor,  setColorPickerFor]  = useState<string | null>(null)
  const [colorMode,       setColorMode]       = useState<ColorMode>('statut')
  const [affretementContracts, setAffretementContracts] = useState<AffretementContract[]>(() => listAffretementContracts())
  const [showAffretementAssets, setShowAffretementAssets] = useState<boolean>(() => loadShowAffretementAssets())
  const [blockOnCompliance, setBlockOnCompliance] = useState<boolean>(() => loadComplianceBlockMode())
  const [complianceBlockingRules, setComplianceBlockingRules] = useState<Record<string, boolean>>(() => loadComplianceBlockingRules())
  const [showComplianceRules, setShowComplianceRules] = useState(false)
  const [lastComplianceAudit, setLastComplianceAudit] = useState<{
    alerts: CEAlert[]
    effectiveBlockingCodes: string[]
    sourceLabel: string
  } | null>(null)
  const [weekScanResults, setWeekScanResults] = useState<Record<string, { alerts: CEAlert[]; hasBlocking: boolean }>>( {})
  const [scanningWeek, setScanningWeek] = useState(false)

  // Filtres & recherche
  const [poolSearch,    setPoolSearch]    = useState('')
  const [resourceSearch, setResourceSearch] = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterClient,  setFilterClient]  = useState('')
  const [showOnlyAlert, setShowOnlyAlert] = useState(false)
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false)
  const [conflictPanelRowId, setConflictPanelRowId] = useState<string | null>(null)
  const [resolvingRowId, setResolvingRowId] = useState<string | null>(null)

  // Menu contextuel
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null)

  // Ordre des lignes
  const [rowOrder,      setRowOrder]      = useState<RowOrderMap>(() => loadRowOrder())
  const [isRowEditMode, setIsRowEditMode] = useState(false)
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null)
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)

  const dayScrollRef    = useRef<HTMLDivElement>(null)
  const dayBodyScrollRef = useRef<HTMLDivElement>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const today = toISO(new Date())

  function pushPlanningNotice(message: string, type: 'success' | 'error' = 'success') {
    setPlanningNotice({ type, message })
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => {
      setPlanningNotice(null)
      noticeTimerRef.current = null
    }, 3500)
  }

  function isRuleBlocking(code: string): boolean {
    const override = complianceBlockingRules[code]
    return override == null ? DEFAULT_BLOCKING_RULE_CODES.has(code) : !!override
  }

  function updateRuleBlocking(code: string, value: boolean) {
    setComplianceBlockingRules(current => {
      const next = { ...current, [code]: value }
      saveComplianceBlockingRules(next)
      return next
    })
  }

  const complianceRuleCodes = useMemo(() => {
    return Array.from(new Set([
      ...Object.keys(COMPLIANCE_RULE_LABELS),
      ...(lastComplianceAudit?.alerts.map(alert => alert.code) ?? []),
    ])).sort()
  }, [lastComplianceAudit])

  async function buildComplianceAuditSummary(input: {
    otId: string
    conducteurId: string | null
    startISO: string
    endISO: string
  }): Promise<{ message: string; hasBlocking: boolean } | null> {
    try {
      const result = await validatePlanningDropAudit(input)
      if (!result.alerts.length) {
        setLastComplianceAudit(null)
        return null
      }
      const blockingAlerts = result.alerts.filter(alert => alert.type === 'bloquant')
      const effectiveBlockingCodes = blockingAlerts.filter(alert => isRuleBlocking(alert.code)).map(alert => alert.code)
      const blocking = blockingAlerts.length
      const effectiveBlocking = effectiveBlockingCodes.length
      const warnings = result.alerts.length - blocking
      const sourceLabel = result.source === 'database' ? 'parametres base' : 'valeurs par defaut'
      const firstDetail = result.alerts[0]?.message
      setLastComplianceAudit({
        alerts: result.alerts,
        effectiveBlockingCodes,
        sourceLabel,
      })
      return {
        message: `Audit CE 561: ${blocking} bloquante(s), ${warnings} avertissement(s), blocage actif sur ${effectiveBlocking} regle(s) (${sourceLabel})${firstDetail ? ` - ${firstDetail}` : ''}.`,
        hasBlocking: effectiveBlocking > 0,
      }
    } catch {
      return null
    }
  }

  async function scanWeekCompliance() {
    if (scanningWeek) return
    setScanningWeek(true)
    setWeekScanResults({})
    const weekEndISO = toISO(addDays(weekStart, 6))
    const weekStartISO = toISO(weekStart)
    const weekOTs = ganttOTs.filter(ot =>
      ot.conducteur_id &&
      ot.date_chargement_prevue &&
      ot.date_livraison_prevue &&
      ot.date_chargement_prevue.slice(0, 10) <= weekEndISO &&
      ot.date_livraison_prevue.slice(0, 10) >= weekStartISO,
    )
    const byDriver: Record<string, typeof weekOTs> = {}
    for (const ot of weekOTs) {
      const dId = ot.conducteur_id!
      if (!byDriver[dId]) byDriver[dId] = []
      byDriver[dId].push(ot)
    }
    const results: Record<string, { alerts: CEAlert[]; hasBlocking: boolean }> = {}
    await Promise.all(
      Object.entries(byDriver).map(async ([driverId, ots]) => {
        const driverAlerts: CEAlert[] = []
        let driverHasBlocking = false
        for (const ot of ots) {
          try {
            const res = await validatePlanningDropAudit({
              otId: ot.id,
              conducteurId: driverId,
              startISO: ot.date_chargement_prevue!,
              endISO: ot.date_livraison_prevue!,
            })
            for (const alert of res.alerts) {
              if (!driverAlerts.some(a => a.code === alert.code)) {
                driverAlerts.push(alert)
              }
              if (alert.type === 'bloquant' && isRuleBlocking(alert.code)) {
                driverHasBlocking = true
              }
            }
          } catch {
            // silencieux par OT
          }
        }
        if (driverAlerts.length > 0) {
          results[driverId] = { alerts: driverAlerts, hasBlocking: driverHasBlocking }
        }
      }),
    )
    setWeekScanResults(results)
    setScanningWeek(false)
    const totalDrivers = Object.keys(results).length
    const blockingDrivers = Object.values(results).filter(r => r.hasBlocking).length
    if (totalDrivers === 0) {
      pushPlanningNotice('Scan CE561 : aucune alerte detectee sur la semaine.')
    } else {
      pushPlanningNotice(
        `Scan CE561 : ${blockingDrivers} chauffeur(s) en violation bloquante, ${totalDrivers} avec alerte(s).`,
        blockingDrivers > 0 ? 'error' : 'success',
      )
    }
  }

  function setNativeDragPayload(e: React.DragEvent, payload: NativeDragPayload) {
    try {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('application/x-planning-drag', JSON.stringify(payload))
      e.dataTransfer.setData('text/plain', payload.otId ?? payload.customBlockId ?? payload.kind)
    } catch {
      // Fallback: React state keeps the active drag in memory.
    }
  }

  function readNativeDragPayload(e: React.DragEvent): DragState | null {
    try {
      const raw = e.dataTransfer.getData('application/x-planning-drag')
      if (!raw) return null
      const parsed = JSON.parse(raw) as NativeDragPayload
      if (!parsed?.kind) return null
      const ot = parsed.otId ? findOTById(parsed.otId) : null
      return {
        ot,
        kind: parsed.kind,
        durationDays: Math.max(1, Number(parsed.durationDays) || 1),
        durationMinutes: Math.max(15, Number(parsed.durationMinutes) || 60),
        customBlockId: parsed.customBlockId,
      }
    } catch {
      return null
    }
  }

  // Scroll to current hour in day view
  useEffect(() => {
    if (viewMode === 'jour' && dayScrollRef.current) {
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      const px = (nowMin / DAY_TOTAL_MIN) * (24 * HOUR_WIDTH_PX)
      dayScrollRef.current.scrollLeft = Math.max(0, px - 200)
    }
  }, [viewMode, selectedDay])

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    }
  }, [])

  // Keep weekStart in sync when selectedDay changes (e.g. date input)
  useEffect(() => {
    const day = parseDay(selectedDay)
    const monday = getMonday(day)
    setWeekStart(prev => (toISO(monday) !== toISO(prev) ? monday : prev))
  }, [selectedDay])

  // Close color picker on outside click
  useEffect(() => {
    if (!colorPickerFor) return
    function close() { setColorPickerFor(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [colorPickerFor])

  // Close context menu on outside click or scroll
  useEffect(() => {
    if (!contextMenu) return
    function close() { setContextMenu(null) }
    document.addEventListener('click', close)
    document.addEventListener('scroll', close, true)
    return () => { document.removeEventListener('click', close); document.removeEventListener('scroll', close, true) }
  }, [contextMenu])

  useEffect(() => {
    const reloadAffretement = () => setAffretementContracts(listAffretementContracts())
    reloadAffretement()
    const unsubscribe = subscribeAffretementPortalUpdates(reloadAffretement)
    return unsubscribe
  }, [])

  const loadAll = useCallback(async () => {
    const extendedOtSelect = 'id, reference, statut, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, distance_km, donneur_ordre_id, chargement_site_id, livraison_site_id, est_affretee, clients!ordres_transport_client_id_fkey(nom)'
    const legacyOtSelect = 'id, reference, statut, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, distance_km, clients!ordres_transport_client_id_fkey(nom)'
    const bareMinimumOtSelect = 'id, reference, statut, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, distance_km'

    let otR: {
      data: unknown[] | null
      error: { message?: string; details?: string; hint?: string } | null
    } = await supabase
      .from('ordres_transport')
      .select(extendedOtSelect)
      .neq('statut', 'annule')
      .order('date_chargement_prevue', { ascending: true, nullsFirst: false })

    if (otR.error) {
      // Fallback 1 : colonnes originales + FK join
      const legacyR = await supabase
        .from('ordres_transport')
        .select(legacyOtSelect)
        .neq('statut', 'annule')
        .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
      if (!legacyR.error) {
        otR = legacyR as typeof otR
      } else {
        // Fallback 2 : colonnes originales sans FK join
        const bareR = await supabase
          .from('ordres_transport')
          .select(bareMinimumOtSelect)
          .neq('statut', 'annule')
          .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
        if (!bareR.error) otR = bareR as typeof otR
      }
    }

    const [cR, vR, rR, clientR, siteR, aR] = await Promise.all([
      supabase.from('conducteurs').select('id, nom, prenom, statut').eq('statut', 'actif').order('nom'),
      supabase.from('vehicules').select('id, immatriculation, marque, modele, statut').neq('statut', 'hors_service').order('immatriculation'),
      supabase.from('remorques').select('id, immatriculation, type_remorque, statut').neq('statut', 'hors_service').order('immatriculation'),
      supabase.from('clients').select('id, nom, actif').eq('actif', true).order('nom'),
      looseSupabase.from('sites_logistiques').select('id, nom, adresse').order('nom'),
      supabase.from('affectations').select('id, conducteur_id, vehicule_id, remorque_id, actif').eq('actif', true),
    ])
    if (otR.error) {
      setPool([])
      setGanttOTs([])
      setSelected(null)
    } else if (otR.data) {
      type OtLoadRow = Omit<OT, 'client_nom'> & {
        clients: { nom: string } | { nom: string }[] | null
        distance_km?: number | null
        donneur_ordre_id?: string | null
        chargement_site_id?: string | null
        livraison_site_id?: string | null
      }
      const ots: OT[] = (otR.data as OtLoadRow[]).map(r => ({
        id: r.id, reference: r.reference, client_nom: (Array.isArray(r.clients) ? r.clients[0] : r.clients)?.nom ?? '-',
        date_chargement_prevue: r.date_chargement_prevue, date_livraison_prevue: r.date_livraison_prevue,
        type_transport: r.type_transport, nature_marchandise: r.nature_marchandise,
        statut: r.statut, conducteur_id: r.conducteur_id, vehicule_id: r.vehicule_id,
        remorque_id: r.remorque_id, prix_ht: r.prix_ht, statut_operationnel: r.statut_operationnel,
        distance_km: r.distance_km ?? null, donneur_ordre_id: r.donneur_ordre_id ?? null,
        chargement_site_id: r.chargement_site_id ?? null, livraison_site_id: r.livraison_site_id ?? null,
        est_affretee: r.est_affretee,
      }))
      const principalPlanning = ots.filter(o => !o.est_affretee)
      setPool(principalPlanning.filter(o => o.statut === 'brouillon' || o.statut === 'confirme'))
      setGanttOTs(principalPlanning.filter(o => !['brouillon','confirme'].includes(o.statut)))
      setSelected(current => current ? (ots.find(ot => ot.id === current.id) ?? null) : current)
    }
    if (cR.error) setConducteurs([])
    else if (cR.data) setConducteurs(cR.data)

    if (vR.error) setVehicules([])
    else if (vR.data) setVehicules(vR.data)

    if (rR.error) setRemorques([])
    else if (rR.data) setRemorques(rR.data)

    if (clientR.error) setClients([])
    else if (clientR.data) setClients(clientR.data)

    if (siteR.error) setLogisticSites([])
    else if (siteR.data) setLogisticSites((siteR.data as LogisticSite[]) ?? [])

    if (aR.error) setAffectations([])
    else if (aR.data) setAffectations(aR.data)
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  useEffect(() => {
    const db = looseSupabase
    const channel = db
      .channel('planning-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordres_transport' }, () => {
        void loadAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'etapes_mission' }, () => {
        void loadAll()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historique_statuts' }, () => {
        void loadAll()
      })
      .subscribe()

    return () => {
      void db.removeChannel(channel)
    }
  }, [loadAll])

  // â”€â”€ Assign modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // ── Edit modal (clic sur un bloc du planning) ─────────────────────────────────────────────

  function openSelected(ot: OT) {
    setSelected(ot)
    setEditDraft({
      reference:           ot.reference,
      nature_marchandise:  ot.nature_marchandise ?? '',
      prix_ht:             ot.prix_ht != null ? String(ot.prix_ht) : '',
      statut:              ot.statut,
      statut_operationnel: ot.statut_operationnel,
      conducteur_id:       ot.conducteur_id ?? '',
      vehicule_id:         ot.vehicule_id   ?? '',
      remorque_id:         ot.remorque_id   ?? '',
      date_chargement:     isoToDate(ot.date_chargement_prevue),
      time_chargement:     isoToTime(ot.date_chargement_prevue),
      date_livraison:      isoToDate(ot.date_livraison_prevue ?? ot.date_chargement_prevue),
      time_livraison:      isoToTime(ot.date_livraison_prevue),
      donneur_ordre_id:    ot.donneur_ordre_id ?? '',
      chargement_site_id:  ot.chargement_site_id ?? '',
      livraison_site_id:   ot.livraison_site_id ?? '',
      distance_km:         ot.distance_km != null ? String(ot.distance_km) : '',
    })
  }
  function closeSelected() {
    setSelected(null)
    setEditDraft(null)
  }
  async function saveEdit() {
    if (!selected || !editDraft) return
    setSaving(true)
    const payload = {
      reference:              editDraft.reference || selected.reference,
      nature_marchandise:     editDraft.nature_marchandise || null,
      prix_ht:                editDraft.prix_ht !== '' ? parseFloat(editDraft.prix_ht) : null,
      statut:                 editDraft.statut,
      statut_operationnel:    editDraft.statut_operationnel || null,
      conducteur_id:          editDraft.conducteur_id || null,
      vehicule_id:            editDraft.vehicule_id   || null,
      remorque_id:            editDraft.remorque_id   || null,
      date_chargement_prevue: toDateTimeISO(editDraft.date_chargement, editDraft.time_chargement),
      date_livraison_prevue:  toDateTimeISO(editDraft.date_livraison,  editDraft.time_livraison),
      donneur_ordre_id:       editDraft.donneur_ordre_id || undefined,
      chargement_site_id:     editDraft.chargement_site_id || null,
      livraison_site_id:      editDraft.livraison_site_id || null,
      distance_km:            editDraft.distance_km !== '' ? Number.parseFloat(editDraft.distance_km) : null,
    }
    const result = await supabase.from('ordres_transport').update(payload).eq('id', selected.id)
    setSaving(false)
    if (result.error) {
      pushPlanningNotice(`Erreur: ${result.error.message}`, 'error')
      return
    }
    closeSelected()
    loadAll()
    pushPlanningNotice('Course mise a jour.')
  }

  function openAssign(ot: OT, resourceId?: string, dropDay?: string, dropTimeMin?: number) {
    const preC = tab === 'conducteurs' ? (resourceId ?? ot.conducteur_id ?? '') : (ot.conducteur_id ?? '')
    const preV = tab === 'camions'     ? (resourceId ?? ot.vehicule_id   ?? '') : (ot.vehicule_id   ?? '')
    const preR = tab === 'remorques'   ? (resourceId ?? ot.remorque_id   ?? '') : (ot.remorque_id   ?? '')
    const baseDate = dropDay ?? isoToDate(ot.date_chargement_prevue)
    const baseTime = dropTimeMin != null
      ? `${String(Math.floor(dropTimeMin/60)).padStart(2,'0')}:${String(dropTimeMin%60).padStart(2,'0')}`
      : isoToTime(ot.date_chargement_prevue)
    const endDate = dropDay ?? isoToDate(ot.date_livraison_prevue ?? ot.date_chargement_prevue)
    const endTime = isoToTime(ot.date_livraison_prevue)
    setAssignModal({ ot, conducteur_id:preC, vehicule_id:preV, remorque_id:preR,
      date_chargement:baseDate, time_chargement:baseTime, date_livraison:endDate, time_livraison:endTime })
    closeSelected()
  }

  async function saveAssign() {
    if (!assignModal) return
    const otId = assignModal.ot.id
    setSaving(true)
    const plannedStartISO = toDateTimeISO(assignModal.date_chargement, assignModal.time_chargement)
    const plannedEndISO = toDateTimeISO(assignModal.date_livraison, assignModal.time_livraison)
    const auditSummary = await buildComplianceAuditSummary({
      otId,
      conducteurId: assignModal.conducteur_id || null,
      startISO: plannedStartISO,
      endISO: plannedEndISO,
    })
    if (blockOnCompliance && auditSummary?.hasBlocking) {
      setSaving(false)
      pushPlanningNotice(`Affectation bloquee. ${auditSummary.message}`, 'error')
      return
    }

    const updatePayload = {
      statut: 'planifie',
      conducteur_id:          assignModal.conducteur_id  || null,
      vehicule_id:            assignModal.vehicule_id    || null,
      remorque_id:            assignModal.remorque_id    || null,
      date_chargement_prevue: plannedStartISO,
      date_livraison_prevue:  plannedEndISO,
    }
    const firstTry = await supabase
      .from('ordres_transport')
      .update(updatePayload)
      .eq('id', otId)
    if (firstTry.error) {
      // Some schemas store planned dates as DATE instead of TIMESTAMP.
      const fallbackPayload = {
        ...updatePayload,
        date_chargement_prevue: assignModal.date_chargement,
        date_livraison_prevue: assignModal.date_livraison,
      }
      const fallbackTry = await supabase
        .from('ordres_transport')
        .update(fallbackPayload)
        .eq('id', otId)
      if (fallbackTry.error) {
        setSaving(false)
        const message = getUpdateFailureReason(fallbackTry)
        pushPlanningNotice(`Affectation impossible: ${message}`, 'error')
        return
      }
    }
    setCustomBlocks(prev => {
      const upd = prev.filter(block => block.otId !== otId)
      if (upd.length !== prev.length) saveCustomBlocks(upd)
      return upd
    })
    setSaving(false); setAssignModal(null); loadAll()
    pushPlanningNotice(
      auditSummary ? `Affectation enregistree. ${auditSummary.message}` : 'Affectation enregistree.',
      auditSummary?.hasBlocking ? 'error' : 'success',
    )
  }

  async function quickAssignFromDrop(
    ot: OT,
    resourceId: string,
    dropDay: string,
    dropTimeMin: number | null,
    durationMinutes: number,
    durationDays: number,
  ) {
    setSavingOtId(ot.id)
    try {
      const startTime = dropTimeMin != null
        ? `${String(Math.floor(dropTimeMin / 60)).padStart(2, '0')}:${String(dropTimeMin % 60).padStart(2, '0')}`
        : isoToTime(ot.date_chargement_prevue)

      let endDate = toISO(addDays(parseDay(dropDay), Math.max(1, durationDays) - 1))
      let endTime = ot.date_livraison_prevue ? isoToTime(ot.date_livraison_prevue) : startTime
      // Garantir une duree minimale d 8h quand les dates n ont pas de composante horaire exploitable
      if (endDate === dropDay && endTime === startTime) {
        const [h, m] = startTime.split(':').map(Number)
        const endH = h + 8
        if (endH < 24) {
          endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        } else {
          endDate = toISO(addDays(parseDay(dropDay), 1))
          endTime = `${String(endH - 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`
        }
      }

      if (dropTimeMin != null) {
        const startDate = parseDay(dropDay)
        startDate.setHours(Math.floor(dropTimeMin / 60), dropTimeMin % 60, 0, 0)
        const endDateTime = new Date(startDate.getTime() + Math.max(15, durationMinutes) * 60000)
        endDate = toISO(endDateTime)
        endTime = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`
      }

      const updatePayload = {
        statut: 'planifie',
        conducteur_id: tab === 'conducteurs' ? resourceId : (ot.conducteur_id ?? null),
        vehicule_id: tab === 'camions' ? resourceId : (ot.vehicule_id ?? null),
        remorque_id: tab === 'remorques' ? resourceId : (ot.remorque_id ?? null),
        date_chargement_prevue: toDateTimeISO(dropDay, startTime),
        date_livraison_prevue: toDateTimeISO(endDate, endTime),
      }

      const targetConducteurId = tab === 'conducteurs' ? resourceId : (ot.conducteur_id ?? null)
      const auditSummary = await buildComplianceAuditSummary({
        otId: ot.id,
        conducteurId: targetConducteurId,
        startISO: toDateTimeISO(dropDay, startTime),
        endISO: toDateTimeISO(endDate, endTime),
      })
      if (blockOnCompliance && auditSummary?.hasBlocking) {
        pushPlanningNotice(`Affectation bloquee. ${auditSummary.message}`, 'error')
        return
      }

      const firstTry = await supabase
        .from('ordres_transport')
        .update(updatePayload)
        .eq('id', ot.id)
      if (firstTry.error) {
        const fallbackPayload = {
          ...updatePayload,
          date_chargement_prevue: dropDay,
          date_livraison_prevue: endDate,
        }
        const fallbackTry = await supabase
          .from('ordres_transport')
          .update(fallbackPayload)
          .eq('id', ot.id)
        if (fallbackTry.error) {
          const message = getUpdateFailureReason(fallbackTry)
          pushPlanningNotice(`Affectation impossible: ${message}`, 'error')
          return
        }
      }

      setCustomBlocks(prev => {
        const upd = prev.filter(block => block.otId !== ot.id)
        if (upd.length !== prev.length) saveCustomBlocks(upd)
        return upd
      })

      await loadAll()
      pushPlanningNotice(
        auditSummary ? `Affectation enregistree. ${auditSummary.message}` : 'Affectation enregistree.',
        auditSummary?.hasBlocking ? 'error' : 'success',
      )
    } finally {
      setSavingOtId(null)
    }
  }

  async function unassign(ot: OT) {
    // Remet au statut confirme et efface les affectations quelle que soit l'etape
    const newStatut = ['brouillon','confirme'].includes(ot.statut) ? ot.statut : 'confirme'
    await supabase.from('ordres_transport').update({
      statut: newStatut, conducteur_id:null, vehicule_id:null, remorque_id:null,
    }).eq('id', ot.id)
    setCustomBlocks(prev => {
      const upd = prev.filter(block => block.otId !== ot.id)
      if (upd.length !== prev.length) saveCustomBlocks(upd)
      return upd
    })
    closeSelected(); setContextMenu(null); loadAll()
  }

  // â”€â”€ Direct block move â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  async function moveBlock(ot: OT, resourceId: string, newStartISO: string, newEndISO: string, notifySuccess = true) {
    setSavingOtId(ot.id)
    const targetConducteurId = tab === 'conducteurs' ? resourceId : (ot.conducteur_id ?? null)
    const auditSummary = await buildComplianceAuditSummary({
      otId: ot.id,
      conducteurId: targetConducteurId,
      startISO: newStartISO,
      endISO: newEndISO,
    })
    if (blockOnCompliance && auditSummary?.hasBlocking) {
      pushPlanningNotice(`Deplacement bloque. ${auditSummary.message}`, 'error')
      setSavingOtId(null)
      return
    }

    const updates: Record<string,string|null> = { date_chargement_prevue:newStartISO, date_livraison_prevue:newEndISO }
    if (tab === 'conducteurs') updates.conducteur_id = resourceId
    else if (tab === 'camions') updates.vehicule_id  = resourceId
    else updates.remorque_id = resourceId
    setGanttOTs(prev => prev.map(o => o.id !== ot.id ? o : {
      ...o, date_chargement_prevue:newStartISO, date_livraison_prevue:newEndISO,
      ...(tab==='conducteurs' ? {conducteur_id:resourceId} : {}),
      ...(tab==='camions'     ? {vehicule_id:resourceId}   : {}),
      ...(tab==='remorques'   ? {remorque_id:resourceId}   : {}),
    }))
    const firstTry = await supabase
      .from('ordres_transport')
      .update(updates)
      .eq('id', ot.id)

    if (firstTry.error) {
      const fallbackUpdates: Record<string, string | null> = {
        ...updates,
        date_chargement_prevue: newStartISO.slice(0, 10),
        date_livraison_prevue: newEndISO.slice(0, 10),
      }
      const fallbackTry = await supabase
        .from('ordres_transport')
        .update(fallbackUpdates)
        .eq('id', ot.id)
      if (fallbackTry.error) {
        const message = getUpdateFailureReason(fallbackTry)
        pushPlanningNotice(`Deplacement impossible: ${message}`, 'error')
      } else if (notifySuccess) {
        pushPlanningNotice(
          auditSummary ? `Deplacement enregistre. ${auditSummary.message}` : 'Deplacement enregistre.',
          auditSummary?.hasBlocking ? 'error' : 'success',
        )
      }
    } else if (notifySuccess) {
      pushPlanningNotice(
        auditSummary ? `Deplacement enregistre. ${auditSummary.message}` : 'Deplacement enregistre.',
        auditSummary?.hasBlocking ? 'error' : 'success',
      )
    }
    setSavingOtId(null)
  }

  function findOTById(otId?: string): OT | null {
    if (!otId) return null
    return pool.find(ot => ot.id === otId) ?? ganttOTs.find(ot => ot.id === otId) ?? null
  }

  // â”€â”€ OT Drag handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function onDragStartPool(ot: OT, e: React.DragEvent) {
    if (isRowEditMode) return
    const start = ot.date_chargement_prevue ? new Date(ot.date_chargement_prevue) : null
    const end   = ot.date_livraison_prevue  ? new Date(ot.date_livraison_prevue)  : start
    const rawMs = start && end ? Math.max(0, end.getTime() - start.getTime()) : 0
    const durationDays    = rawMs > 0 ? Math.max(1, Math.ceil(rawMs / 86400000)) : 1
    const durationMinutes = rawMs > 0 ? Math.max(60, Math.round(rawMs / 60000)) : 480
    setNativeDragPayload(e, { kind: 'pool', otId: ot.id, durationDays, durationMinutes })
    setDrag({ ot, kind:'pool', durationDays, durationMinutes })
  }
  function onDragStartBlock(ot: OT, e: React.DragEvent) {
    if (isRowEditMode) return
    const start = ot.date_chargement_prevue ? new Date(ot.date_chargement_prevue) : null
    const end   = ot.date_livraison_prevue  ? new Date(ot.date_livraison_prevue)  : start
    const durationDays    = start && end ? Math.max(1, Math.ceil((end.getTime()-start.getTime())/86400000)) : 1
    const durationMinutes = start && end ? Math.max(15, Math.round((end.getTime()-start.getTime())/60000)) : 120
    setNativeDragPayload(e, { kind: 'block', otId: ot.id, durationDays, durationMinutes })
    setDrag({ ot, kind:'block', durationDays, durationMinutes })
  }
  function onDragStartCustomBlock(block: CustomBlock, e: React.DragEvent) {
    if (isRowEditMode) return
    const start = new Date(block.dateStart), end = new Date(block.dateEnd)
    const durationDays    = Math.max(1, Math.ceil((end.getTime()-start.getTime())/86400000))
    const durationMinutes = Math.max(15, Math.round((end.getTime()-start.getTime())/60000))
    const linkedOT = findOTById(block.otId)
    if (linkedOT) {
      setNativeDragPayload(e, {
        kind: 'block',
        otId: linkedOT.id,
        durationDays,
        durationMinutes,
        customBlockId: block.id,
      })
      setDrag({ ot:linkedOT, kind:'block', durationDays, durationMinutes, customBlockId:block.id })
      return
    }
    setNativeDragPayload(e, {
      kind: 'custom',
      durationDays,
      durationMinutes,
      customBlockId: block.id,
    })
    setDrag({ ot:null, kind:'custom', durationDays, durationMinutes, customBlockId:block.id })
  }
  function onDragEnd() { setDrag(null); setHoverRow(null) }

  function onRowDragOver(e: React.DragEvent, rowId: string) {
    if (isRowEditMode) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = e.clientX - rect.left
    if (viewMode === 'semaine') {
      const dayIdx = Math.max(0, Math.min(6, Math.floor(relX / rect.width * 7)))
      setHoverRow({ rowId, dayIdx, timeMin:0 })
    } else {
      const rawMin = DAY_START_MIN + (relX / rect.width) * DAY_TOTAL_MIN
      const timeMin = snapToQuarter(Math.max(DAY_START_MIN, Math.min(DAY_START_MIN + DAY_TOTAL_MIN - 15, rawMin)))
      setHoverRow({ rowId, dayIdx:0, timeMin })
    }
  }
  function onRowDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setHoverRow(null)
  }

  async function onRowDrop(e: React.DragEvent, rowId: string, isCustomRow = false) {
    if (isRowEditMode) return
    e.preventDefault()
    e.stopPropagation()
    const activeDrag = dragRef.current ?? readNativeDragPayload(e)
    if (!activeDrag) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = e.clientX - rect.left
    setHoverRow(null)

    if (isCustomRow) {
      const dropDateISO = viewMode === 'semaine'
        ? toISO(addDays(weekStart, Math.max(0, Math.min(6, Math.floor(relX / rect.width * 7)))))
        : selectedDay
      const timeMin = viewMode === 'jour'
        ? snapToQuarter(DAY_START_MIN + Math.round((relX / rect.width) * DAY_TOTAL_MIN))
        : 8 * 60
      const startDate = parseDay(dropDateISO)
      startDate.setHours(Math.floor(timeMin / 60), timeMin % 60, 0, 0)
      const endDate = new Date(startDate.getTime() + Math.max(15, activeDrag.durationMinutes || 60) * 60000)
      const startISO = toDateTimeFromDate(startDate)
      const endISO = toDateTimeFromDate(endDate)

      if (activeDrag.kind === 'custom' && activeDrag.customBlockId) {
        const upd = customBlocks.map(b => b.id === activeDrag.customBlockId ? {...b, rowId, dateStart:startISO, dateEnd:endISO} : b)
        setCustomBlocks(upd); saveCustomBlocks(upd)
      } else if (activeDrag.ot) {
        const existing = customBlocks.find(b => b.otId === activeDrag.ot!.id)
        const nextId = existing?.id ?? uid()
        const nextColor = existing?.color ?? CUSTOM_COLORS[0]
        const label = `${activeDrag.ot.reference} - ${activeDrag.ot.client_nom}`
        const upd: CustomBlock[] = [
          ...customBlocks.filter(b => b.id !== nextId && b.otId !== activeDrag.ot!.id),
          { id:nextId, rowId, label, dateStart:startISO, dateEnd:endISO, color:nextColor, otId:activeDrag.ot.id },
        ]
        setCustomBlocks(upd); saveCustomBlocks(upd)
      } else {
        const block: CustomBlock = { id:uid(), rowId, label:'Bloc provisoire', dateStart:startISO, dateEnd:endISO, color:CUSTOM_COLORS[0] }
        const upd = [...customBlocks, block]; setCustomBlocks(upd); saveCustomBlocks(upd)
      }
      setDrag(null); return
    }

    if (viewMode === 'semaine') {
      const dayIdx  = Math.max(0, Math.min(6, Math.floor(relX / rect.width * 7)))
      const dropDay = toISO(addDays(weekStart, dayIdx))
      if (activeDrag.kind === 'pool') {
        if (activeDrag.ot) {
          await quickAssignFromDrop(
            activeDrag.ot,
            rowId,
            dropDay,
            null,
            activeDrag.durationMinutes,
            activeDrag.durationDays,
          )
        }
      } else if (activeDrag.kind === 'block' && activeDrag.ot) {
        const newStart  = toDateTimeISO(dropDay, isoToTime(activeDrag.ot.date_chargement_prevue))
        const newEnd    = toISO(addDays(parseDay(dropDay), activeDrag.durationDays - 1))
        const newEndISO = toDateTimeISO(newEnd, isoToTime(activeDrag.ot.date_livraison_prevue))
        await moveBlock(activeDrag.ot, rowId, newStart, newEndISO)
        if (activeDrag.customBlockId) {
          const upd = customBlocks.filter(b => b.id !== activeDrag.customBlockId)
          if (upd.length !== customBlocks.length) { setCustomBlocks(upd); saveCustomBlocks(upd) }
        }
      }
    } else {
      const rawMin  = DAY_START_MIN + (relX / rect.width) * DAY_TOTAL_MIN
      const timeMin = snapToQuarter(Math.max(DAY_START_MIN, Math.min(DAY_START_MIN + DAY_TOTAL_MIN - 15, rawMin)))
      if (activeDrag.kind === 'pool') {
        if (activeDrag.ot) {
          await quickAssignFromDrop(
            activeDrag.ot,
            rowId,
            selectedDay,
            timeMin,
            activeDrag.durationMinutes,
            activeDrag.durationDays,
          )
        }
      } else if (activeDrag.kind === 'block' && activeDrag.ot) {
        const startDate = parseDay(selectedDay)
        startDate.setHours(Math.floor(timeMin / 60), timeMin % 60, 0, 0)
        const endDate = new Date(startDate.getTime() + Math.max(15, activeDrag.durationMinutes) * 60000)
        await moveBlock(activeDrag.ot, rowId, toDateTimeFromDate(startDate), toDateTimeFromDate(endDate))
        if (activeDrag.customBlockId) {
          const upd = customBlocks.filter(b => b.id !== activeDrag.customBlockId)
          if (upd.length !== customBlocks.length) { setCustomBlocks(upd); saveCustomBlocks(upd) }
        }
      }
    }
    setDrag(null)
  }

  // â”€â”€ Row reorder drag handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function onRowReorderStart(rowId: string, e: React.DragEvent) {
    e.stopPropagation()
    setDraggingRowId(rowId)
  }
  function onRowReorderOver(rowId: string, e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    if (draggingRowId && draggingRowId !== rowId) setDragOverRowId(rowId)
  }
  function onRowReorderDrop(targetRowId: string, e: React.DragEvent) {
    e.preventDefault(); e.stopPropagation()
    if (!draggingRowId || draggingRowId === targetRowId) {
      setDraggingRowId(null); setDragOverRowId(null); return
    }
    // Use the current ordered IDs
    const orderedIds = [...(rowOrder[tab] ?? []), ...allRows.map(r => r.id).filter(id => !(rowOrder[tab] ?? []).includes(id))]
    const allIds = allRows.map(r => r.id)
    const base = allIds.map(id => orderedIds.includes(id) ? id : id) // ensure all exist
    const sorted = [...base].sort((a, b) => {
      const ia = orderedIds.indexOf(a), ib = orderedIds.indexOf(b)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1; if (ib === -1) return -1
      return ia - ib
    })
    const fromIdx = sorted.indexOf(draggingRowId)
    const toIdx   = sorted.indexOf(targetRowId)
    if (fromIdx === -1 || toIdx === -1) { setDraggingRowId(null); setDragOverRowId(null); return }
    const newOrder = [...sorted]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggingRowId)
    const updated = { ...rowOrder, [tab]: newOrder }
    setRowOrder(updated); saveRowOrder(updated)
    setDraggingRowId(null); setDragOverRowId(null)
  }
  function onRowReorderEnd() { setDraggingRowId(null); setDragOverRowId(null) }

  // â”€â”€ Custom rows management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function addCustomRow() {
    if (!newRowLabel.trim()) return
    const row: CustomRow = { id:uid(), label:newRowLabel.trim(), subtitle:'Ligne personnalisee' }
    const upd = [...customRows, row]; setCustomRows(upd); saveCustomRows(upd)
    setNewRowLabel(''); setShowAddRow(false)
  }
  function deleteCustomRow(rowId: string) {
    setCustomRows(r => { const u = r.filter(x => x.id !== rowId); saveCustomRows(u); return u })
    setCustomBlocks(b => { const u = b.filter(x => x.rowId !== rowId); saveCustomBlocks(u); return u })
  }
  function generatePlanningCourseReference() {
    const stamp = `${Date.now()}`.slice(-8)
    return `OT-PLAN-${stamp}`
  }

  function resolveRowAssignment(rowId: string): Pick<AssignForm, 'conducteur_id' | 'vehicule_id' | 'remorque_id'> {
    const row = allRows.find(item => item.id === rowId)
    if (!row || row.isCustom || row.isAffretementAsset) return { conducteur_id: '', vehicule_id: '', remorque_id: '' }
    if (tab === 'conducteurs') return { conducteur_id: rowId, vehicule_id: '', remorque_id: '' }
    if (tab === 'camions') return { conducteur_id: '', vehicule_id: rowId, remorque_id: '' }
    return { conducteur_id: '', vehicule_id: '', remorque_id: rowId }
  }

  async function addCustomBlock() {
    if (!addBlockFor || !newBlockLabel.trim()) return
    const startISO = normalizeDateTimeInput(addBlockFor.dateStart, '08:00')
    const startDate = new Date(startISO)
    const safeStart = Number.isNaN(startDate.getTime()) ? new Date(`${toISO(new Date())}T08:00:00`) : startDate
    const durationHours = Math.max(1, Number.parseFloat(newBlockDurationHours) || 10)
    const endDate = new Date(safeStart.getTime() + durationHours * 60 * 60000)

    if (newBlockType === 'course') {
      if (!newBlockClientId) {
        pushPlanningNotice('Selectionne un client pour creer la course.', 'error')
        return
      }
      if (!newBlockDonneurOrdreId) {
        pushPlanningNotice('Selectionne le donneur d ordre.', 'error')
        return
      }
      const assignment = resolveRowAssignment(addBlockFor.rowId)
      const courseStartISO = toDateTimeISO(newBlockDateChargement, newBlockTimeChargement)
      const courseEndISO = toDateTimeISO(newBlockDateLivraison, newBlockTimeLivraison)
      const payload = {
        client_id: newBlockClientId,
        donneur_ordre_id: newBlockDonneurOrdreId,
        chargement_site_id: newBlockChargementSiteId || null,
        livraison_site_id: newBlockLivraisonSiteId || null,
        distance_km: newBlockDistanceKm !== '' ? Number.parseFloat(newBlockDistanceKm) : null,
        reference: newBlockReferenceCourse.trim() || generatePlanningCourseReference(),
        type_transport: 'complet',
        nature_marchandise: newBlockLabel.trim(),
        statut: 'planifie',
        conducteur_id: assignment.conducteur_id || null,
        vehicule_id: assignment.vehicule_id || null,
        remorque_id: assignment.remorque_id || null,
        date_chargement_prevue: courseStartISO,
        date_livraison_prevue: courseEndISO,
      }
      setCreatingInlineEvent(true)
      try {
        const insertTry = await supabase.from('ordres_transport').insert(payload)
        if (insertTry.error) {
          const fallback = {
            ...payload,
            date_chargement_prevue: newBlockDateChargement,
            date_livraison_prevue: newBlockDateLivraison,
          }
          const fallbackTry = await supabase.from('ordres_transport').insert(fallback)
          if (fallbackTry.error) {
            pushPlanningNotice(`Creation course impossible: ${fallbackTry.error.message}`, 'error')
            return
          }
        }
        setNewBlockLabel('')
        setAddBlockFor(null)
        setNewBlockDistanceKm('')
        await loadAll()
        pushPlanningNotice('Course creee depuis le planning.')
      } finally {
        setCreatingInlineEvent(false)
      }
      return
    }

    const block: CustomBlock = {
      id:uid(), rowId:addBlockFor.rowId, label:newBlockLabel.trim(),
      dateStart: toDateTimeFromDate(safeStart),
      dateEnd:   toDateTimeFromDate(endDate),
      color: INLINE_EVENT_COLORS[newBlockType],
      kind: newBlockType,
    }
    const upd = [...customBlocks, block]; setCustomBlocks(upd); saveCustomBlocks(upd)
    setNewBlockLabel(''); setAddBlockFor(null)
    pushPlanningNotice(`${INLINE_EVENT_LABELS[newBlockType]} ajoute sur le planning.`)
  }
  function deleteCustomBlock(blockId: string) {
    const upd = customBlocks.filter(b => b.id !== blockId); setCustomBlocks(upd); saveCustomBlocks(upd)
  }
  async function unassignFromCustomBlock(block: CustomBlock) {
    const linkedOT = findOTById(block.otId)
    if (!linkedOT) {
      deleteCustomBlock(block.id)
      return
    }
    await unassign(linkedOT)
  }

  // â”€â”€ Block color resolver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function getBlockColors(ot: OT, rowId: string): { cls:string; style:React.CSSProperties } {
    if (colorMode === 'conducteur' && tab === 'conducteurs' && conductorColors[rowId]) {
      const hex = conductorColors[rowId]
      return { cls:'', style:{ background:hex, borderColor:hex } }
    }
    if (colorMode === 'type') {
      const hex = TYPE_TRANSPORT_COLORS[ot.type_transport?.toLowerCase()] ?? '#6b7280'
      return { cls:'', style:{ background:hex, borderColor:hex } }
    }
    if (colorMode === 'client') {
      const hex = clientColorMap[ot.client_nom] ?? '#6b7280'
      return { cls:'', style:{ background:hex, borderColor:hex } }
    }
    return { cls: STATUT_CLS[ot.statut] ?? 'bg-slate-600 border-slate-500', style:{} }
  }

  // â”€â”€ Computed values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const weekDays  = Array.from({ length: 7  }, (_, i) => addDays(weekStart, i))
  const hourSlots = Array.from({ length: 24 }, (_, i) => i)  // 00-23

  type Row = { id:string; primary:string; secondary:string; isCustom?:boolean; isAffretementAsset?: boolean }
  const activeAffretementContracts = useMemo(
    () => affretementContracts.filter(contract => ACTIVE_AFFRETEMENT_STATUSES.includes(contract.status)),
    [affretementContracts],
  )
  const affretementContextByOtId = useMemo<Record<string, AffretementContext>>(() => {
    const next: Record<string, AffretementContext> = {}
    for (const contract of activeAffretementContracts) {
      const context = getAffretementContextByOtId(contract.otId)
      if (!context) continue
      next[contract.otId] = context
    }
    return next
  }, [activeAffretementContracts])
  const affretementRows = useMemo<Row[]>(() => {
    if (!showAffretementAssets) return []

    const rows = new Map<string, Row>()
    const equipmentCache = new Map<string, ReturnType<typeof listAffreteurEquipments>>()
    const getOnboardingEquipments = (onboardingId: string) => {
      if (!equipmentCache.has(onboardingId)) {
        equipmentCache.set(onboardingId, listAffreteurEquipments(onboardingId).filter(item => item.active))
      }
      return equipmentCache.get(onboardingId) ?? []
    }

    for (const context of Object.values(affretementContextByOtId)) {
      const companyName = context.onboarding?.companyName ?? 'Affreteur'
      if (tab === 'conducteurs' && context.driver) {
        rows.set(`aff-driver:${context.driver.id}`, {
          id: `aff-driver:${context.driver.id}`,
          primary: context.driver.fullName,
          secondary: `${companyName} - conducteur affrete`,
          isAffretementAsset: true,
        })
      }

      if (tab === 'camions' && context.vehicle) {
        rows.set(`aff-vehicle:${context.vehicle.id}`, {
          id: `aff-vehicle:${context.vehicle.id}`,
          primary: context.vehicle.plate,
          secondary: [companyName, context.vehicle.brand, context.vehicle.model].filter(Boolean).join(' - '),
          isAffretementAsset: true,
        })
      }

      if (tab === 'remorques' && context.contract.assignedEquipmentIds.length > 0) {
        const equipmentsById = new Map(getOnboardingEquipments(context.contract.onboardingId).map(item => [item.id, item] as const))
        for (const equipmentId of context.contract.assignedEquipmentIds) {
          const equipment = equipmentsById.get(equipmentId)
          if (!equipment) continue
          rows.set(`aff-equipment:${equipment.id}`, {
            id: `aff-equipment:${equipment.id}`,
            primary: equipment.label,
            secondary: `${companyName} - ${equipment.kind}`,
            isAffretementAsset: true,
          })
        }
      }
    }

    return Array.from(rows.values())
  }, [affretementContextByOtId, showAffretementAssets, tab])
  const affretementRowIds = useMemo(() => new Set(affretementRows.map(row => row.id)), [affretementRows])

  const vehiculeById = useMemo(() => new Map(vehicules.map(item => [item.id, item] as const)), [vehicules])
  const remorqueById = useMemo(() => new Map(remorques.map(item => [item.id, item] as const)), [remorques])
  const conducteurById = useMemo(() => new Map(conducteurs.map(item => [item.id, item] as const)), [conducteurs])

  const activeAffectationByConducteurId = useMemo(() => {
    const map = new Map<string, Affectation>()
    for (const affectation of affectations) {
      if (!affectation.conducteur_id) continue
      if (!map.has(affectation.conducteur_id)) map.set(affectation.conducteur_id, affectation)
    }
    return map
  }, [affectations])

  const activeAffectationByVehiculeId = useMemo(() => {
    const map = new Map<string, Affectation>()
    for (const affectation of affectations) {
      if (!affectation.vehicule_id) continue
      if (!map.has(affectation.vehicule_id)) map.set(affectation.vehicule_id, affectation)
    }
    return map
  }, [affectations])

  const activeAffectationByRemorqueId = useMemo(() => {
    const map = new Map<string, Affectation>()
    for (const affectation of affectations) {
      if (!affectation.remorque_id) continue
      if (!map.has(affectation.remorque_id)) map.set(affectation.remorque_id, affectation)
    }
    return map
  }, [affectations])

  function conducteurSecondary(conducteurId: string): string {
    const affectation = activeAffectationByConducteurId.get(conducteurId)
    if (!affectation) return ''
    const vehicule = affectation.vehicule_id ? vehiculeById.get(affectation.vehicule_id) : null
    const remorque = affectation.remorque_id ? remorqueById.get(affectation.remorque_id) : null
    return [vehicule ? `Camion ${vehicule.immatriculation}` : null, remorque ? `Remorque ${remorque.immatriculation}` : null]
      .filter(Boolean)
      .join(' - ')
  }

  function vehiculeSecondary(vehicule: Vehicule): string {
    const base = [vehicule.marque, vehicule.modele].filter(Boolean).join(' ')
    const affectation = activeAffectationByVehiculeId.get(vehicule.id)
    if (!affectation) return base
    const conducteur = affectation.conducteur_id ? conducteurById.get(affectation.conducteur_id) : null
    const remorque = affectation.remorque_id ? remorqueById.get(affectation.remorque_id) : null
    const extra = [
      conducteur ? `${conducteur.prenom} ${conducteur.nom}` : null,
      remorque ? `Remorque ${remorque.immatriculation}` : null,
    ].filter(Boolean).join(' - ')
    return [base, extra].filter(Boolean).join(' - ')
  }

  function remorqueSecondary(remorque: Remorque): string {
    const base = remorque.type_remorque
    const affectation = activeAffectationByRemorqueId.get(remorque.id)
    if (!affectation) return base
    const conducteur = affectation.conducteur_id ? conducteurById.get(affectation.conducteur_id) : null
    const vehicule = affectation.vehicule_id ? vehiculeById.get(affectation.vehicule_id) : null
    const extra = [
      vehicule ? `Camion ${vehicule.immatriculation}` : null,
      conducteur ? `${conducteur.prenom} ${conducteur.nom}` : null,
    ].filter(Boolean).join(' - ')
    return [base, extra].filter(Boolean).join(' - ')
  }

  const dbRows: Row[] = tab === 'conducteurs'
    ? conducteurs.map(c => ({ id:c.id, primary:`${c.prenom} ${c.nom}`,  secondary:conducteurSecondary(c.id) }))
    : tab === 'camions'
    ? vehicules.map(v  => ({ id:v.id, primary:v.immatriculation,         secondary:vehiculeSecondary(v) }))
    : remorques.map(r  => ({ id:r.id, primary:r.immatriculation,         secondary:remorqueSecondary(r) }))

  const allRows: Row[] = [
    ...dbRows,
    ...affretementRows,
    ...customRows.map(r => ({ id:r.id, primary:r.label, secondary:r.subtitle, isCustom:true })),
  ]

  // Apply saved row order
  const orderedRows: Row[] = (() => {
    const order = rowOrder[tab] ?? []
    if (!order.length) return allRows
    return [...allRows].sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id)
      if (ia === -1 && ib === -1) return 0
      if (ia === -1) return 1; if (ib === -1) return -1
      return ia - ib
    })
  })()

  const customOTIds = useMemo(
    () => new Set(customBlocks.map(b => b.otId).filter((id): id is string => !!id)),
    [customBlocks],
  )

  const rowConflictPairsById: Record<string, RowConflict[]> = (() => {
    const viewStart = viewMode === 'semaine'
      ? new Date(`${toISO(weekStart)}T00:00:00`).getTime()
      : new Date(`${selectedDay}T00:00:00`).getTime()
    const viewEnd = viewMode === 'semaine'
      ? new Date(`${toISO(addDays(weekStart, 6))}T23:59:59`).getTime()
      : new Date(`${selectedDay}T23:59:59`).getTime()

    const next: Record<string, RowConflict[]> = {}
    for (const row of orderedRows) {
      if (row.isCustom) {
        next[row.id] = []
        continue
      }
      const segments = rowOTs(row.id)
        .map(ot => {
          const fallbackStart = isoToDate(ot.date_chargement_prevue)
          const fallbackEnd = isoToDate(ot.date_livraison_prevue ?? ot.date_chargement_prevue)
          const start = toTimeValue(ot.date_chargement_prevue, fallbackStart)
          const endRaw = toTimeValue(ot.date_livraison_prevue ?? ot.date_chargement_prevue, fallbackEnd)
          const end = Math.max(endRaw, start + 15 * 60 * 1000)
          return { ot, start, end }
        })
        .filter(seg => seg.end >= viewStart && seg.start <= viewEnd)
        .sort((a, b) => a.start - b.start)

      const conflicts: RowConflict[] = []
      for (let i = 0; i < segments.length; i += 1) {
        for (let j = i + 1; j < segments.length; j += 1) {
          if (segments[j].start >= segments[i].end) break
          const overlapMs = Math.max(0, Math.min(segments[i].end, segments[j].end) - Math.max(segments[i].start, segments[j].start))
          if (overlapMs <= 0) continue
          conflicts.push({
            first: segments[i].ot,
            second: segments[j].ot,
            overlapMinutes: Math.round(overlapMs / 60000),
          })
        }
      }
      next[row.id] = conflicts
    }
    return next
  })()

  const rowConflictCountById: Record<string, number> = useMemo(() => {
    const next: Record<string, number> = {}
    for (const row of orderedRows) next[row.id] = rowConflictPairsById[row.id]?.length ?? 0
    return next
  }, [orderedRows, rowConflictPairsById])

  // Appliquer les filtres lignes (retards, conflits, recherche ressource)
  const visibleRows = (() => {
    const q = resourceSearch.trim().toLowerCase()
    return orderedRows.filter(row => {
      if (showOnlyAlert) {
        const hasLate = !row.isCustom && rowOTs(row.id).some(o => o.statut !== 'facture' && o.date_livraison_prevue && o.date_livraison_prevue.slice(0, 10) < today)
        if (!hasLate) return false
      }
      if (showOnlyConflicts && (rowConflictCountById[row.id] ?? 0) === 0) return false
      if (!q) return true
      const haystack = `${row.primary} ${row.secondary}`.toLowerCase()
      return haystack.includes(q)
    })
  })()

  // Client color map - couleur unique par client
  const clientColorMap = useMemo<Record<string,string>>(() => {
    const allOTs = [...pool, ...ganttOTs]
    const clients = [...new Set(allOTs.map(o => o.client_nom))]
    const map: Record<string,string> = {}
    clients.forEach((c, i) => { map[c] = COLOR_PALETTE[i % COLOR_PALETTE.length] })
    return map
  }, [pool, ganttOTs])

  // KPIs exploitation
  const kpi = useMemo(() => {
    const now = toISO(new Date())
    const retard = ganttOTs.filter(o =>
      o.statut !== 'facture' && o.date_livraison_prevue && o.date_livraison_prevue.slice(0,10) < now
    ).length
    const aFacturer = ganttOTs.filter(o => o.statut === 'livre').length
    const caPlanning = ganttOTs.filter(o => o.statut !== 'facture').reduce((s,o) => s + (o.prix_ht ?? 0), 0)
    const nbAff = ganttOTs.filter(o => !!affretementContextByOtId[o.id]).length
    const conflits = Object.values(rowConflictCountById).reduce((sum, n) => sum + n, 0)
    return { retard, aFacturer, caPlanning, nbAff, conflits }
  }, [ganttOTs, affretementContextByOtId, rowConflictCountById])

  // Pool filtre
  const visiblePool = useMemo(() => {
    let list = pool.filter(ot => !customOTIds.has(ot.id))
    if (poolSearch) {
      const q = poolSearch.toLowerCase()
      list = list.filter(o => o.reference.toLowerCase().includes(q) || o.client_nom.toLowerCase().includes(q))
    }
    if (filterType) list = list.filter(o => o.type_transport === filterType)
    if (filterClient) list = list.filter(o => o.client_nom === filterClient)
    return list
  }, [pool, customOTIds, poolSearch, filterType, filterClient])

  function getAffretementRowId(ot: OT): string | null {
    const context = affretementContextByOtId[ot.id]
    if (!context) return null
    if (tab === 'conducteurs') return context.contract.assignedDriverId ? `aff-driver:${context.contract.assignedDriverId}` : null
    if (tab === 'camions') return context.contract.assignedVehicleId ? `aff-vehicle:${context.contract.assignedVehicleId}` : null
    if (tab === 'remorques') {
      const firstEquipmentId = context.contract.assignedEquipmentIds[0]
      return firstEquipmentId ? `aff-equipment:${firstEquipmentId}` : null
    }
    return null
  }

  function resolveRowId(ot: OT): string | null {
    if (showAffretementAssets) {
      const affretementRowId = getAffretementRowId(ot)
      if (affretementRowId && affretementRowIds.has(affretementRowId)) return affretementRowId
    }
    if (tab === 'conducteurs') return ot.conducteur_id
    if (tab === 'camions') return ot.vehicule_id
    return ot.remorque_id
  }

  function getAffretementCompany(otId: string): string | null {
    const context = affretementContextByOtId[otId]
    return context?.onboarding?.companyName ?? null
  }

  function isAffretedOt(otId: string): boolean {
    return Boolean(affretementContextByOtId[otId])
  }

  function rowOTs(resourceId: string): OT[] {
    return ganttOTs.filter(ot => resolveRowId(ot) === resourceId && !customOTIds.has(ot.id))
  }

  function otInterval(ot: OT): { start: number; end: number } {
    const fallbackStart = isoToDate(ot.date_chargement_prevue)
    const fallbackEnd = isoToDate(ot.date_livraison_prevue ?? ot.date_chargement_prevue)
    const start = toTimeValue(ot.date_chargement_prevue, fallbackStart)
    const endRaw = toTimeValue(ot.date_livraison_prevue ?? ot.date_chargement_prevue, fallbackEnd)
    const end = Math.max(endRaw, start + 15 * 60 * 1000)
    return { start, end }
  }

  async function resolveConflictsForRow(rowId: string) {
    const row = orderedRows.find(r => r.id === rowId)
    if (!row || row.isCustom || row.isAffretementAsset) return

    const rowItems = rowOTs(rowId)
      .map(ot => ({ ot, ...otInterval(ot) }))
      .sort((a, b) => a.start - b.start)

    if (rowItems.length < 2) return

    setResolvingRowId(rowId)
    try {
      const minSlotMs = 15 * 60 * 1000
      let cursorEnd = rowItems[0].end
      const updates: Array<{ ot: OT; start: number; end: number }> = []

      for (let i = 1; i < rowItems.length; i += 1) {
        const item = rowItems[i]
        const duration = Math.max(minSlotMs, item.end - item.start)
        if (item.start < cursorEnd) {
          const nextStart = cursorEnd
          const nextEnd = nextStart + duration
          updates.push({ ot: item.ot, start: nextStart, end: nextEnd })
          cursorEnd = nextEnd
        } else {
          cursorEnd = item.end
        }
      }

      for (const update of updates) {
        await moveBlock(
          update.ot,
          rowId,
          toDateTimeFromDate(new Date(update.start)),
          toDateTimeFromDate(new Date(update.end)),
          false,
        )
      }
      await loadAll()
    } finally {
      setResolvingRowId(null)
    }
  }

  const unresourced = ganttOTs.filter(ot => !resolveRowId(ot)).filter(ot => !customOTIds.has(ot.id))
    .filter(ot => viewMode === 'semaine' ? blockPos(ot, weekStart) !== null : isoToDate(ot.date_chargement_prevue) === selectedDay)

  const canMove   = (ot: OT) => ot.statut === 'planifie' || ot.statut === 'confirme'
  const canUnlock = canMove

  function ghostPos(rowId: string): React.CSSProperties | null {
    if (!hoverRow || hoverRow.rowId !== rowId || !drag) return null
    if (viewMode === 'semaine') {
      const left  = hoverRow.dayIdx / 7
      const width = Math.min(drag.durationDays, 7 - hoverRow.dayIdx) / 7
      return { position:'absolute', top:'6px', height:'40px', left:`calc(${left*100}% + 2px)`, width:`calc(${width*100}% - 4px)`, zIndex:20, pointerEvents:'none' }
    } else {
      const left  = (hoverRow.timeMin - DAY_START_MIN) / DAY_TOTAL_MIN
      const width = Math.min(drag.durationMinutes, DAY_TOTAL_MIN - (hoverRow.timeMin - DAY_START_MIN)) / DAY_TOTAL_MIN
      return { position:'absolute', top:'4px', height:'44px', left:`${left*100}%`, width:`${width*100}%`, zIndex:20, pointerEvents:'none' }
    }
  }

  const nowPct = (() => {
    const now = new Date()
    return (now.getHours() * 60 + now.getMinutes()) / DAY_TOTAL_MIN
  })()

  const conflictRow = conflictPanelRowId ? orderedRows.find(row => row.id === conflictPanelRowId) ?? null : null
  const activeRowConflicts = conflictPanelRowId ? (rowConflictPairsById[conflictPanelRowId] ?? []) : []

  function formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h}h${String(m).padStart(2, '0')}`
    return `${m} min`
  }

  // â”€â”€ Row label renderer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const ROW_H = 64

  function renderRowLabel(row: Row) {
    const accentColor = tab === 'conducteurs' && !row.isCustom && !row.isAffretementAsset ? conductorColors[row.id] : undefined
    const isDraggingThis = draggingRowId === row.id
    const isOverThis     = dragOverRowId === row.id && draggingRowId !== row.id
    // Charge de la ressource sur la semaine visible
    const rowOtList = row.isCustom ? [] : rowOTs(row.id)
    const rowCount  = rowOtList.filter(o =>
      viewMode === 'semaine' ? blockPos(o, weekStart) !== null : isoToDate(o.date_chargement_prevue) === selectedDay
    ).length
    const hasLateOT = rowOtList.some(o => o.statut !== 'facture' && o.date_livraison_prevue && o.date_livraison_prevue.slice(0,10) < today)
    const conflictCount = rowConflictCountById[row.id] ?? 0
    return (
      <div
        className={`w-48 flex-shrink-0 border-r border-slate-700/40 flex flex-col justify-center bg-slate-900 transition-colors relative select-none
          ${isRowEditMode ? 'cursor-grab active:cursor-grabbing group-hover:bg-slate-800/40' : 'group-hover:bg-slate-800/20'}
          ${isDraggingThis ? 'opacity-30' : ''}
          ${row.isAffretementAsset ? 'border-l-2 border-l-blue-600/50' : ''}
        `}
        style={{
          paddingTop:10, paddingBottom:10,
          paddingLeft: accentColor ? 9 : 12,
          paddingRight:10,
          ...(accentColor ? { borderLeftColor:accentColor, borderLeftWidth:3 } : {}),
        }}
        draggable={isRowEditMode}
        onDragStart={isRowEditMode ? e => onRowReorderStart(row.id, e) : undefined}
        onDragOver={isRowEditMode  ? e => onRowReorderOver(row.id, e)  : undefined}
        onDrop={isRowEditMode      ? e => onRowReorderDrop(row.id, e)  : undefined}
        onDragEnd={isRowEditMode   ? onRowReorderEnd                   : undefined}
      >
        {/* Drop indicator */}
        {isOverThis && <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 z-20 pointer-events-none rounded" />}

        <div className="flex items-center gap-1.5 min-w-0">
          {/* Drag handle - row edit mode */}
          {isRowEditMode && (
            <svg className="w-3 h-4 text-slate-500 flex-shrink-0" viewBox="0 0 12 16" fill="currentColor">
              <circle cx="4" cy="3" r="1.2"/><circle cx="8" cy="3" r="1.2"/>
              <circle cx="4" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/>
              <circle cx="4" cy="13" r="1.2"/><circle cx="8" cy="13" r="1.2"/>
            </svg>
          )}

          {/* Colour dot - normal mode, conducteurs only */}
          {tab === 'conducteurs' && !row.isCustom && !row.isAffretementAsset && !isRowEditMode && (
            <div className="relative flex-shrink-0">
              <button
                onClick={e => { e.stopPropagation(); setColorPickerFor(p => p === row.id ? null : row.id) }}
                className="w-3 h-3 rounded-full border border-white/20 hover:scale-125 transition-transform"
                style={{ background: accentColor ?? '#374151' }}
                title="Couleur conducteur"
              />
              {colorPickerFor === row.id && (
                <div className="absolute left-0 top-5 z-50 bg-slate-800 border border-slate-600 rounded-xl p-2 shadow-2xl"
                  style={{ width:152 }} onClick={e => e.stopPropagation()}>
                  <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mb-1.5">Couleur conducteur</p>
                  <div className="grid grid-cols-6 gap-1 mb-1">
                    {COLOR_PALETTE.map(hex => (
                      <button key={hex}
                        className="w-5 h-5 rounded-full hover:scale-110 transition-transform"
                        style={{ background:hex, outline: conductorColors[row.id]===hex ? '2px solid white' : 'none', outlineOffset:1 }}
                        onClick={e => { e.stopPropagation(); const u={...conductorColors,[row.id]:hex}; setConductorColors(u); saveConductorColors(u); setColorPickerFor(null) }}
                      />
                    ))}
                  </div>
                  {accentColor && (
                    <button className="w-full text-[10px] text-slate-500 hover:text-rose-400 transition-colors py-0.5 border-t border-slate-700 mt-1 pt-1.5"
                      onClick={e => {
                        e.stopPropagation()
                        const rest = Object.fromEntries(
                          Object.entries(conductorColors).filter(([id]) => id !== row.id),
                        )
                        setConductorColors(rest)
                        saveConductorColors(rest)
                        setColorPickerFor(null)
                      }}>
                      Effacer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Badges speciaux */}
          {row.isAffretementAsset && (
            <span className="text-[9px] bg-blue-600/30 text-blue-300 rounded px-1 py-0.5 font-bold flex-shrink-0">AFF</span>
          )}
          {row.isCustom && <span className="text-[9px] bg-amber-500/20 text-amber-400 rounded px-1 py-0.5 font-semibold flex-shrink-0">Libre</span>}

          {/* Alerte retard */}
          {hasLateOT && !row.isCustom && (
            <span className="text-[9px] text-red-400 flex-shrink-0" title="OT en retard">⚠</span>
          )}

          <p className={`text-sm font-semibold truncate ${row.isAffretementAsset ? 'text-blue-200' : 'text-slate-200'}`}>{row.primary}</p>

          {/* Badge scan CE561 */}
          {!row.isCustom && !row.isAffretementAsset && weekScanResults[row.id] && (
            <span
              title={weekScanResults[row.id].alerts.map(a => `${a.type === 'bloquant' ? '⛔' : '⚠'} ${a.code}: ${a.message}`).join('\n')}
              className={`text-[9px] px-1 py-0.5 rounded font-bold flex-shrink-0 cursor-default ${
                weekScanResults[row.id].hasBlocking
                  ? 'bg-rose-500/30 text-rose-200'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {weekScanResults[row.id].hasBlocking ? '⛔' : '⚠'} CE561
            </span>
          )}

          {/* Badge nombre d'OT */}
          {!row.isCustom && rowCount > 0 && !isRowEditMode && (
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ml-auto ${
              rowCount >= 3 ? 'bg-orange-600/30 text-orange-300' : 'bg-slate-700 text-slate-400'
            }`}>{rowCount}</span>
          )}
          {!row.isCustom && conflictCount > 0 && !isRowEditMode && (
            <button
              type="button"
              onClick={() => setConflictPanelRowId(row.id)}
              className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 bg-rose-600/30 text-rose-300 hover:bg-rose-600/45 transition-colors"
              title="Afficher les details de conflit"
            >
              C{conflictCount}
            </button>
          )}
        </div>

        {row.secondary && <p className="text-[10px] text-slate-600 truncate mt-0.5 pl-0.5">{row.secondary}</p>}

        {row.isCustom && !isRowEditMode && (
          <div className="flex items-center gap-1 mt-1">
            <button onClick={() => {
              setAddBlockFor({ rowId:row.id, dateStart:toISO(weekStart) })
              setNewBlockLabel('')
              setNewBlockType('hlp')
              setNewBlockDurationHours('10')
              setNewBlockClientId(clients[0]?.id ?? '')
              setNewBlockDonneurOrdreId(clients[0]?.id ?? '')
              setNewBlockReferenceCourse(generatePlanningCourseReference())
              setNewBlockChargementSiteId('')
              setNewBlockLivraisonSiteId('')
              setNewBlockDistanceKm('')
              setNewBlockDateChargement(toISO(weekStart))
              setNewBlockTimeChargement('08:00')
              setNewBlockDateLivraison(toISO(weekStart))
              setNewBlockTimeLivraison('18:00')
            }}
              className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors">+ bloc</button>
            <button onClick={() => deleteCustomRow(row.id)}
              className="text-[9px] text-red-800 hover:text-red-500 transition-colors ml-1">suppr.</button>
          </div>
        )}
      </div>
    )
  }

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-slate-950">
      {planningNotice && (
        <div className={`absolute right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl ${drag ? 'pointer-events-none' : ''}`}
          style={planningNotice.type === 'error'
            ? { borderColor: 'rgba(244,114,182,0.35)', background: 'rgba(127,29,29,0.92)', color: '#fecdd3' }
            : { borderColor: 'rgba(52,211,153,0.35)', background: 'rgba(6,78,59,0.92)', color: '#d1fae5' }}>
          {planningNotice.message}
        </div>
      )}
      {lastComplianceAudit && (
        <div className={`absolute right-4 top-24 z-[79] w-[26rem] max-h-[45vh] overflow-y-auto rounded-xl border border-amber-500/30 bg-slate-900/95 px-3 py-3 shadow-2xl ${drag ? 'pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">Detail audit CE561</p>
            <button
              type="button"
              onClick={() => setLastComplianceAudit(null)}
              className="text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200"
            >
              masquer
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Source regles: {lastComplianceAudit.sourceLabel}</p>
          <div className="mt-2 space-y-1.5">
            {lastComplianceAudit.alerts.map((alert, idx) => {
              const activeBlock = alert.type === 'bloquant' && isRuleBlocking(alert.code)
              return (
                <div key={`${alert.code}-${idx}`} className="rounded-lg border border-slate-700/70 bg-slate-800/70 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-semibold ${alert.type === 'bloquant' ? 'text-rose-300' : 'text-amber-300'}`}>
                      {alert.type === 'bloquant' ? 'Bloquant' : 'Avertissement'} - {alert.code}
                    </span>
                    {alert.type === 'bloquant' && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${activeBlock ? 'bg-rose-500/30 text-rose-200' : 'bg-slate-700 text-slate-300'}`}>
                        {activeBlock ? 'bloque' : 'non bloque'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-200 mt-0.5">{alert.message}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* -- Pool panel - file d'attente -- */}
      <div className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-700/80 flex flex-col shadow-lg">
        {/* En-tete pool */}
        <div className="px-3 pt-3 pb-2 border-b border-slate-700/60 flex-shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">File d'attente</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-bold text-white">{visiblePool.length}</span>
                <span className="text-xs text-slate-500">OT{visiblePool.length !== 1 ? 's' : ''} a placer</span>
              </div>
            </div>
            {kpi.retard > 0 && (
              <div className="flex flex-col items-center bg-red-900/30 border border-red-700/40 rounded-lg px-2 py-1">
                <span className="text-lg font-bold text-red-400">{kpi.retard}</span>
                <span className="text-[9px] text-red-500 font-semibold">RETARD</span>
              </div>
            )}
          </div>
          {/* Recherche */}
          <div className="relative">
            <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={poolSearch} onChange={e => setPoolSearch(e.target.value)}
              placeholder="Ref., client"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          {/* Filtres rapides type transport */}
          <div className="flex gap-1 flex-wrap">
            {(['complet','groupage','express'] as string[]).map(t => (
              <button key={t} onClick={() => setFilterType(v => v === t ? '' : t)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${filterType === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-600 hover:text-slate-400'}`}>
                {t}
              </button>
            ))}
          </div>
          {drag?.kind === 'pool' && (
            <p className="text-[10px] text-indigo-400 animate-pulse">Deposer sur une ligne</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-1.5 px-2">
          {visiblePool.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-2xl mb-2">?</p>
              <p className="text-xs text-slate-600">Tout est planifie</p>
            </div>
          ) : (() => {
            const nowDate = toISO(new Date())
            const urgents = visiblePool.filter(o => o.date_livraison_prevue && o.date_livraison_prevue.slice(0,10) < nowDate)
            const affrete = visiblePool.filter(o => !urgents.includes(o) && isAffretedOt(o.id))
            const standard = visiblePool.filter(o => !urgents.includes(o) && !affrete.includes(o))
            type PoolGroup = { label: string; color: string; list: OT[] }
            const groups: PoolGroup[] = [
              { label: 'Urgent / retard', color: 'text-red-400', list: urgents },
              { label: 'Affrete', color: 'text-blue-400', list: affrete },
              { label: 'A planifier', color: 'text-slate-500', list: standard },
            ]
            return groups.filter(g => g.list.length > 0).map(group => (
              <div key={group.label} className="mb-1">
                <p className={`text-[10px] font-bold uppercase tracking-wider px-1 py-1 ${group.color}`}>{group.label} ({group.list.length})</p>
                {group.list.map(ot => {
                  const isLate = !!ot.date_livraison_prevue && ot.date_livraison_prevue.slice(0,10) < nowDate
                  const clientDot = clientColorMap[ot.client_nom]
                  return (
                    <div key={ot.id} role="button" tabIndex={0} draggable
                      onDragStart={e => onDragStartPool(ot, e)} onDragEnd={onDragEnd}
                      onClick={() => openAssign(ot)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing mb-1 select-none ${
                        drag?.ot?.id === ot.id
                          ? 'border-indigo-500 bg-indigo-900/30 opacity-40'
                          : isLate
                          ? 'border-red-700/40 bg-red-950/20 hover:bg-red-950/40'
                          : 'border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/60 hover:border-slate-600'
                      }`}>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: clientDot ?? '#4b5563' }} />
                          {isAffretedOt(ot.id) && <span className="rounded px-1 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300 flex-shrink-0">AFF</span>}
                          <StatutOpsDot statut={ot.statut_operationnel} size="xs" />
                          <span className="text-[10px] font-mono text-slate-500 truncate">{ot.reference}</span>
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${BADGE_CLS[ot.statut] ?? 'bg-slate-700 text-slate-400'}`}>
                          {STATUT_LABEL[ot.statut]}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white truncate leading-tight">{ot.client_nom}</p>
                      {getAffretementCompany(ot.id) && (
                        <p className="text-[10px] text-blue-300/80 truncate mt-0.5">{getAffretementCompany(ot.id)}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-slate-500 font-mono">
                          {ot.date_chargement_prevue?.slice(5,10).replace('-','/') ?? '?'} - {ot.date_livraison_prevue?.slice(5,10).replace('-','/') ?? '?'}
                        </p>
                        {ot.type_transport && <span className="text-[9px] text-slate-600 capitalize">{ot.type_transport}</span>}
                      </div>
                      {ot.prix_ht != null && (
                        <p className="text-[10px] text-emerald-500/70 mt-0.5 font-medium">{ot.prix_ht.toFixed(0)} EUR HT</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ))
          })()}
        </div>
      </div>

      {/* -- Gantt area ---------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* â”€â”€ Top bar â”€â”€ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-900 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-bold text-white flex-shrink-0">Planning</h1>

            {/* View mode */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden flex-shrink-0">
              {(['semaine','jour'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode===v ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}>
                  {v === 'semaine' ? '7 jours' : 'Journee'}
                </button>
              ))}
            </div>

            <span className="text-sm text-slate-400 truncate">
              {viewMode === 'semaine' ? fmtWeek(weekStart) : fmtDay(parseDay(selectedDay))}
            </span>

            <div className="relative hidden lg:block">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={resourceSearch}
                onChange={e => setResourceSearch(e.target.value)}
                placeholder="Rechercher une ressource"
                className="w-52 bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 relative">
            {/* Lock / reorder rows */}
            <button
              onClick={() => setIsRowEditMode(v => !v)}
              title={isRowEditMode ? 'Verrouiller les lignes' : 'Reorganiser les lignes'}
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border transition-all ${
                isRowEditMode
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}>
              {isRowEditMode ? (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Verrouiller
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                  </svg>
                  Reorganiser
                </>
              )}
            </button>

            <button
              onClick={() => setBlockOnCompliance(current => {
                const next = !current
                saveComplianceBlockMode(next)
                return next
              })}
              title="Activer ou desactiver le blocage des affectations sur alertes CE 561"
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border transition-all ${
                blockOnCompliance
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-200'
                  : 'border-emerald-700/40 text-emerald-300 hover:border-emerald-500/50'
              }`}
            >
              CE561 {blockOnCompliance ? 'bloquant' : 'audit'}
            </button>

            <button
              onClick={() => void scanWeekCompliance()}
              disabled={scanningWeek}
              title="Lancer l audit CE561 sur tous les OT de la semaine affichee"
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border transition-all ${
                scanningWeek
                  ? 'border-slate-700 text-slate-500 cursor-wait'
                  : 'border-amber-600/40 text-amber-300 hover:border-amber-500/60'
              }`}
            >
              {scanningWeek ? 'Scan...' : 'Scanner la semaine'}
            </button>
            {Object.keys(weekScanResults).length > 0 && (
              <button
                onClick={() => setWeekScanResults({})}
                title="Effacer les resultats du scan"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-xs border border-slate-700 text-slate-500 hover:text-slate-300"
              >✕</button>
            )}

            <button
              onClick={() => setShowComplianceRules(v => !v)}
              title="Parametrer le blocage CE561 par regle"
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:border-slate-500"
            >
              Regles CE561
            </button>
            {showComplianceRules && (
              <div className={`absolute right-0 top-10 z-[81] w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-2xl max-h-96 overflow-y-auto ${drag ? 'pointer-events-none' : ''}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300">Blocage par regle</p>
                <p className="text-[10px] text-slate-500 mt-1">Ces bascules s appliquent seulement quand le mode CE561 bloquant est actif.</p>
                <div className="mt-2 space-y-1.5">
                  {complianceRuleCodes.map(code => (
                    <label key={code} className="flex items-start gap-2 rounded-lg border border-slate-700/70 bg-slate-800/70 px-2 py-1.5">
                      <input
                        type="checkbox"
                        checked={isRuleBlocking(code)}
                        onChange={e => updateRuleBlocking(code, e.target.checked)}
                        className="mt-0.5"
                      />
                      <span className="text-[11px] text-slate-200">
                        <span className="font-semibold">{COMPLIANCE_RULE_LABELS[code] ?? code}</span>
                        <span className="text-slate-500"> ({code})</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => {
              if (viewMode==='semaine') setWeekStart(w => addDays(w,-7))
              else { const d = parseDay(selectedDay); d.setDate(d.getDate()-1); setSelectedDay(toISO(d)) }
            }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xl font-light transition-colors">&lt;</button>

            <button onClick={() => {
              const todayDate = new Date(); setWeekStart(getMonday(todayDate)); setSelectedDay(toISO(todayDate))
            }} className="px-3 h-8 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              Aujourd'hui
            </button>

            <button onClick={() => {
              if (viewMode==='semaine') setWeekStart(w => addDays(w,7))
              else { const d = parseDay(selectedDay); d.setDate(d.getDate()+1); setSelectedDay(toISO(d)) }
            }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xl font-light transition-colors">&gt;</button>
          </div>
        </div>

        {/* -- KPI Strip exploitation -- */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/60 bg-slate-950/60 flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">A placer</span>
            <span className="text-sm font-bold text-white">{pool.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"/>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Conducteurs</span>
            <span className="text-sm font-bold text-white">{conducteurs.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"/>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Vehicules</span>
            <span className="text-sm font-bold text-white">{vehicules.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"/>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Remorques</span>
            <span className="text-sm font-bold text-white">{remorques.length}</span>
          </div>
          {kpi.retard > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyAlert(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0 animate-pulse transition-colors ${showOnlyAlert ? 'bg-red-700/40 border-red-500/60' : 'bg-red-950/40 border-red-700/40'}`}
            >
              <span className="text-[10px] font-bold text-red-400 whitespace-nowrap">? {kpi.retard} retard{kpi.retard > 1 ? 's' : ''}</span>
            </button>
          )}
          {kpi.conflits > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyConflicts(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0 transition-colors ${showOnlyConflicts ? 'bg-rose-700/40 border-rose-500/60' : 'bg-rose-950/40 border-rose-700/40'}`}
            >
              <span className="text-[10px] font-bold text-rose-300 whitespace-nowrap">Conflits {kpi.conflits}</span>
            </button>
          )}
          {kpi.aFacturer > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-950/40 border border-violet-700/40 flex-shrink-0">
              <span className="text-[10px] font-bold text-violet-400 whitespace-nowrap">EUR {kpi.aFacturer} a facturer</span>
            </div>
          )}
          {kpi.nbAff > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/40 border border-blue-700/40 flex-shrink-0">
              <span className="text-[10px] font-bold text-blue-300 whitespace-nowrap">Affrete: {kpi.nbAff}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex-shrink-0">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">CA planifie</span>
            <span className="text-sm font-bold text-emerald-400">{kpi.caPlanning > 0 ? `${(kpi.caPlanning/1000).toFixed(0)}k EUR` : '-'}</span>
          </div>
        </div>

        {/* Day view - mini week selector */}
        {viewMode === 'jour' && (
          <div className="flex items-center gap-2 px-5 py-2 border-b border-slate-700/60 bg-slate-900/80 flex-shrink-0">
            {/* Direct date input */}
            <input
              type="date"
              value={selectedDay}
              onChange={e => { if (e.target.value) setSelectedDay(e.target.value) }}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white outline-none focus:border-slate-500 transition-colors flex-shrink-0"
            />
            {/* Week day quick-select */}
            <div className="flex gap-1 flex-1">
              {weekDays.map((day, i) => {
                const iso = toISO(day)
                const isSel = iso === selectedDay
                const isT   = iso === today
                const isWE  = i >= 5
                return (
                  <button key={i} onClick={() => setSelectedDay(iso)}
                    className={`flex-1 flex flex-col items-center py-1 rounded-lg text-[10px] font-medium transition-all ${
                      isSel  ? 'bg-white text-slate-900'
                      : isT  ? 'border border-blue-500/40 text-blue-400 hover:bg-slate-800'
                      : isWE ? 'text-slate-600 hover:bg-slate-800'
                               : 'text-slate-400 hover:bg-slate-800'
                    }`}>
                    <span>{DAY_NAMES[i]}</span>
                    <span className="font-bold">{day.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* -- Onglets ressources + filtres couleur -- */}
        <div className="flex items-center border-b border-slate-700/80 bg-slate-900 px-4 flex-shrink-0 gap-1 overflow-x-auto">
          {/* Tabs */}
          <div className="flex items-center flex-shrink-0">
            {([
              { key:'conducteurs' as Tab, label:'Conducteurs', count:conducteurs.length + affretementRows.filter(r=>r.id.startsWith('aff-driver')).length },
              { key:'camions'     as Tab, label:'Camions',     count:vehicules.length   + affretementRows.filter(r=>r.id.startsWith('aff-vehicle')).length },
              { key:'remorques'   as Tab, label:'Remorques',   count:remorques.length   + affretementRows.filter(r=>r.id.startsWith('aff-equipment')).length },
            ]).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab===t.key ? 'border-indigo-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab===t.key ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* Separateur */}
          <div className="h-5 w-px bg-slate-700 flex-shrink-0 mx-1"/>

          {/* Couleur */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-slate-600 mr-0.5 whitespace-nowrap">Couleur :</span>
            {(['statut','conducteur','type','client'] as ColorMode[]).map(mode => {
              if (mode==='conducteur' && tab!=='conducteurs') return null
              return (
                <button key={mode} onClick={() => setColorMode(mode)}
                  className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors whitespace-nowrap ${
                    colorMode===mode ? 'bg-indigo-600/80 text-white border border-indigo-500' : 'text-slate-600 hover:text-slate-400 border border-transparent'
                  }`}>
                  {mode==='statut' ? 'Statut' : mode==='conducteur' ? 'Conducteur' : mode==='type' ? 'Type' : 'Client'}
                </button>
              )
            })}
          </div>

          {/* Separateur */}
          <div className="h-5 w-px bg-slate-700 flex-shrink-0 mx-1"/>

          {/* Filtre client */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-slate-600 whitespace-nowrap">Client :</span>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-indigo-500 transition-colors max-w-[110px]">
              <option value="">Tous</option>
              {[...new Set([...pool, ...ganttOTs].map(o => o.client_nom))].sort().map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Affrete toggle */}
          <div className="flex items-center gap-1 flex-shrink-0 border-l border-slate-700 ml-1 pl-2">
            <button
              type="button"
              onClick={() => setShowAffretementAssets(current => { const next = !current; saveShowAffretementAssets(next); return next })}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors border ${
                showAffretementAssets ? 'bg-blue-500/20 border-blue-600/40 text-blue-200' : 'border-slate-700 text-slate-600 hover:text-slate-400'
              }`}>
              <span className="text-[9px] font-bold">AFF</span>
              {showAffretementAssets ? 'Affiche' : 'Masque'}
            </button>
          </div>

          {/* Legende */}
          <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-600 py-2 flex-wrap justify-end flex-shrink-0">
            {colorMode==='statut' && Object.entries(STATUT_CLS).map(([k,cls]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-sm ${cls.split(' ')[0]}`}/>{STATUT_LABEL[k]}
              </span>
            ))}
            {colorMode==='type' && Object.entries(TYPE_TRANSPORT_COLORS).map(([k,hex]) => (
              <span key={k} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm" style={{background:hex}}/>{k}
              </span>
            ))}
            {colorMode==='client' && Object.entries(clientColorMap).slice(0,5).map(([c,hex]) => (
              <span key={c} className="flex items-center gap-1 max-w-[80px]">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{background:hex}}/><span className="truncate">{c}</span>
              </span>
            ))}
            {colorMode==='conducteur' && <span className="italic text-slate-600">? cliquer sur le point pour choisir</span>}
          </div>
        </div>

        {/* â”€â”€ WEEK VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {viewMode === 'semaine' && (
          <div className="flex-1 overflow-auto" onDragOver={e => e.preventDefault()}>
            {/* Day headers */}
            <div className="flex sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
              <div className="w-44 flex-shrink-0 border-r border-slate-700 bg-slate-900" />
              <div className="flex-1 grid grid-cols-7">
                {weekDays.map((day, i) => {
                  const isToday = toISO(day)===today; const isWE = i>=5
                  return (
                    <button key={i}
                      className={`py-2 text-center border-r border-slate-700/50 last:border-r-0 ${isWE?'bg-slate-800/40':''} hover:bg-slate-800/60 transition-colors`}
                      onClick={() => { setSelectedDay(toISO(day)); setViewMode('jour') }}
                      title="Voir ce jour en detail"
                    >
                      <p className={`text-[10px] font-medium ${isToday?'text-blue-400':isWE?'text-slate-600':'text-slate-500'}`}>{DAY_NAMES[i]}</p>
                      <p className={`text-base font-bold leading-tight ${isToday?'text-blue-400':isWE?'text-slate-600':'text-slate-300'}`}>{day.getDate()}</p>
                      {isToday && <div className="w-1 h-1 bg-blue-400 rounded-full mx-auto mt-0.5"/>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Resource rows */}
            {visibleRows.length === 0 ? (
              <div className="p-16 text-center text-slate-600 text-sm">Aucune ressource disponible</div>
            ) : visibleRows.map(row => {
              const ots = row.isCustom ? [] : rowOTs(row.id)
              const cBlocks = row.isCustom ? customBlocks.filter(b => b.rowId===row.id) : []
              const isDropTarget = hoverRow?.rowId === row.id && !isRowEditMode
              const gPos = ghostPos(row.id)
              return (
                <div key={row.id}
                  onDragOver={!isRowEditMode ? e => { e.preventDefault(); e.stopPropagation() } : undefined}
                  onDrop={!isRowEditMode ? e => onRowDrop(e, row.id, !!row.isCustom) : undefined}
                  className={`flex border-b border-slate-800/50 transition-colors group ${isDropTarget?'bg-indigo-950/30':'hover:bg-white/[0.01]'}`}>
                  {renderRowLabel(row)}
                  {/* Timeline */}
                  <div className="flex-1 relative" style={{ height:ROW_H }}
                    onDragOver={!isRowEditMode ? e => onRowDragOver(e, row.id) : undefined}
                    onDragLeave={!isRowEditMode ? onRowDragLeave : undefined}
                    onDrop={!isRowEditMode ? e => onRowDrop(e, row.id, !!row.isCustom) : undefined}>
                    <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                      {weekDays.map((day,i) => (
                        <div key={i} className={`border-r border-slate-800/40 last:border-r-0 ${i>=5?'bg-slate-800/15':''} ${toISO(day)===today?'bg-blue-950/20':''}`}/>
                      ))}
                    </div>
                    {isDropTarget && drag && <div className="absolute inset-0 border-2 border-dashed border-indigo-500/50 rounded pointer-events-none z-10"/>}
                    {gPos && (
                      <div style={gPos} className={`${STATUT_CLS[drag?.ot?.statut??'']??'bg-slate-500 border-slate-400'} border rounded-md flex items-center px-2 text-white text-[11px] opacity-50 overflow-hidden`}>
                        {drag?.ot?.reference ?? '-'}
                      </div>
                    )}
                    {ots.map(ot => {
                      const pos = blockPos(ot, weekStart); if (!pos) return null
                      const { cls:cCls, style:cStyle } = getBlockColors(ot, row.id)
                      const isSaving   = savingOtId === ot.id
                      const isDragging = drag?.ot?.id === ot.id
                      const isLate = ot.statut !== 'facture' && ot.date_livraison_prevue && ot.date_livraison_prevue.slice(0,10) < today
                      const hCharge = ot.date_chargement_prevue?.includes('T') ? ot.date_chargement_prevue.slice(11,16) : ''
                      const hLivre  = ot.date_livraison_prevue?.includes('T')  ? ot.date_livraison_prevue.slice(11,16)  : ''
                      return (
                        <div key={ot.id} style={{...pos,...cStyle}}
                          draggable={canMove(ot) && !isRowEditMode && !drag}
                          onDragStart={canMove(ot)&&!isRowEditMode&&!drag ? e => onDragStartBlock(ot, e) : undefined}
                          onDragEnd={onDragEnd}
                          className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col px-2 py-1 gap-0 transition-all overflow-hidden shadow-md group/block
                            ${canMove(ot)&&!isRowEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                            ${isDragging?'opacity-30':isSaving?'opacity-70 animate-pulse':'hover:brightness-110'}
                            ${isLate ? 'ring-1 ring-red-400/60' : ''}
                            ${drag && !isDragging ? 'pointer-events-none' : ''}`}
                            onClick={() => !isRowEditMode && openSelected(ot)}
                          onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot }) }}>
                          {/* Ligne 1 : badges + reference + bouton desaffecter */}
                          <div className="flex items-center gap-1 min-w-0">
                            {isAffretedOt(ot.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                            {isLate && <span className="rounded px-1 text-[8px] font-bold bg-red-500/30 text-red-200 flex-shrink-0">?</span>}
                            {ot.statut === 'facture' && <span className="rounded px-1 text-[8px] font-bold bg-violet-500/30 text-violet-200 flex-shrink-0">EUR</span>}
                            <StatutOpsDot statut={ot.statut_operationnel} size="xs"/>
                            <span className="font-mono text-[10px] font-bold truncate flex-1">{ot.reference}</span>
                            {!isRowEditMode && (
                              <button title="Desaffecter" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/20 text-[10px]"
                                onClick={e => { e.stopPropagation(); unassign(ot) }}>x</button>
                            )}
                          </div>
                          {/* Ligne 2 : nom client + heures */}
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="truncate flex-1 text-[10px] text-white/80 font-semibold">{ot.client_nom}</span>
                            {(hCharge || hLivre) && (
                              <span className="text-[9px] text-white/50 flex-shrink-0 font-mono">{hCharge}{hCharge && hLivre ? '-' : ''}{hLivre}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {cBlocks.map(block => {
                      const start=block.dateStart.slice(0,10), end=block.dateEnd.slice(0,10)
                      const sD=parseDay(start), eD=parseDay(end), wE=addDays(weekStart,6)
                      if (eD<weekStart||sD>wE) return null
                      const vS=sD<weekStart?weekStart:sD, vE=eD>wE?wE:eD
                      const p2: React.CSSProperties = { position:'absolute', top:'6px', height:'40px', left:`calc(${daysDiff(weekStart,vS)/7*100}% + 2px)`, width:`calc(${(daysDiff(vS,vE)+1)/7*100}% - 4px)` }
                      const linkedOT = findOTById(block.otId)
                      if (linkedOT) {
                        const { cls:cCls, style:cStyle } = getBlockColors(linkedOT, row.id)
                        const isLate = linkedOT.statut !== 'facture' && linkedOT.date_livraison_prevue && linkedOT.date_livraison_prevue.slice(0,10) < today
                        const hCharge = linkedOT.date_chargement_prevue?.includes('T') ? linkedOT.date_chargement_prevue.slice(11,16) : ''
                        const hLivre  = linkedOT.date_livraison_prevue?.includes('T')  ? linkedOT.date_livraison_prevue.slice(11,16)  : ''
                        return (
                          <div key={block.id} style={{...p2,...cStyle}}
                            draggable={!isRowEditMode && !drag}
                            onDragStart={!isRowEditMode&&!drag ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                            className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col px-2 py-1 gap-0 transition-all overflow-hidden shadow-md group/cblock
                              ${!isRowEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                              ${drag?.customBlockId===block.id ? 'opacity-30' : 'hover:brightness-110'}
                              ${isLate ? 'ring-1 ring-red-400/60' : ''}
                              ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}`}
                              onClick={() => !isRowEditMode && openSelected(linkedOT)}
                            onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot:linkedOT }) }}>
                            <div className="flex items-center gap-1 min-w-0">
                              {isAffretedOt(linkedOT.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                              {isLate && <span className="rounded px-1 text-[8px] font-bold bg-red-500/30 text-red-200 flex-shrink-0">!</span>}
                              {linkedOT.statut === 'facture' && <span className="rounded px-1 text-[8px] font-bold bg-violet-500/30 text-violet-200 flex-shrink-0">EUR</span>}
                              <StatutOpsDot statut={linkedOT.statut_operationnel} size="xs"/>
                              <span className="font-mono text-[10px] font-bold truncate flex-1">{linkedOT.reference}</span>
                              {!isRowEditMode && (
                                <button title="Desaffecter" className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/20 text-[10px]"
                                  onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>
                              )}
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="truncate flex-1 text-[10px] text-white/80 font-semibold">{linkedOT.client_nom}</span>
                              {(hCharge || hLivre) && (
                                <span className="text-[9px] text-white/50 flex-shrink-0 font-mono">{hCharge}{hCharge && hLivre ? '-' : ''}{hLivre}</span>
                              )}
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={block.id} style={p2} draggable={!isRowEditMode && !drag}
                          onDragStart={!isRowEditMode&&!drag ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                          className={`${block.color} border rounded-md text-white text-[11px] font-medium flex items-center px-2 gap-1.5 cursor-grab active:cursor-grabbing group/cblock overflow-hidden shadow-sm ${drag?.customBlockId===block.id?'opacity-30':''} ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}`}>
                          <span className="truncate flex-1">{block.label}</span>
                          {!isRowEditMode && <button className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                            onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Non-affecte row */}
            {unresourced.length > 0 && (
              <div className="flex border-b border-slate-800/30 border-dashed opacity-60 hover:opacity-100 transition-opacity">
                <div className="w-44 flex-shrink-0 border-r border-slate-700/30 px-3 py-3 flex items-center bg-slate-900">
                  <p className="text-[11px] text-slate-600 italic">Non affecte</p>
                </div>
                <div className="flex-1 relative" style={{ height:ROW_H }}>
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {weekDays.map((_,i) => <div key={i} className="border-r border-slate-800/30 last:border-r-0"/>)}
                  </div>
                  {unresourced.map(ot => {
                    const pos=blockPos(ot,weekStart); if(!pos) return null
                    return (
                      <div key={ot.id} style={pos}
                        className="border border-slate-600/40 bg-slate-700/30 rounded-md text-[11px] text-slate-500 flex items-center px-2 cursor-pointer hover:bg-slate-700/50 overflow-hidden"
                        onClick={() => openAssign(ot)}>
                        {isAffretedOt(ot.id) && <span className="rounded px-1 py-0.5 text-[9px] font-semibold bg-blue-500/20 text-blue-300 mr-1">AFF</span>}
                        <span className="font-mono truncate">{ot.reference}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Add row */}
            {!showAddRow ? (
              <button onClick={() => setShowAddRow(true)}
                className="flex items-center gap-2 w-full px-3 py-3 text-xs text-slate-600 hover:text-slate-400 hover:bg-white/3 transition-colors border-b border-slate-800/30">
                <span className="w-44 flex-shrink-0 px-3 flex items-center gap-1.5"><span className="text-lg leading-none">+</span>Ajouter une ligne</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900/80">
                <div className="w-44 flex-shrink-0 flex items-center gap-2">
                  <input autoFocus value={newRowLabel} onChange={e => setNewRowLabel(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter') addCustomRow(); if(e.key==='Escape'){setShowAddRow(false);setNewRowLabel('')} }}
                    placeholder="Nom de la ligne..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"/>
                </div>
                <button onClick={addCustomRow} className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors">OK</button>
                <button onClick={() => { setShowAddRow(false); setNewRowLabel('') }} className="px-2.5 py-1.5 text-slate-500 hover:text-white text-xs transition-colors">Annuler</button>
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ DAY VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {viewMode === 'jour' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Hour header */}
            <div className="flex flex-shrink-0 bg-slate-900 border-b border-slate-700 overflow-hidden">
              <div className="w-44 flex-shrink-0 border-r border-slate-700 bg-slate-900"/>
              <div ref={dayScrollRef} className="flex-1 overflow-x-hidden" style={{scrollbarWidth:'none'}}>
                <div className="flex" style={{ width:`${24*HOUR_WIDTH_PX}px` }}>
                  {hourSlots.map(h => (
                    <div key={h} className="flex-shrink-0 border-r border-slate-700/50" style={{width:HOUR_WIDTH_PX}}>
                      <p className={`text-[10px] font-mono text-center py-2 ${h===new Date().getHours()&&selectedDay===today?'text-blue-400':'text-slate-500'}`}>
                        {String(h).padStart(2,'0')}:00
                      </p>
                      <div className="flex">
                        {[0,15,30,45].map(m => <div key={m} className="flex-1 border-r border-slate-800/30 last:border-r-0 h-1"/>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rows body */}
            <div ref={dayBodyScrollRef} className="flex-1 overflow-auto" onDragOver={e => e.preventDefault()} onScroll={e => {
              if (dayScrollRef.current) dayScrollRef.current.scrollLeft = (e.target as HTMLDivElement).scrollLeft
            }}>
              {visibleRows.map(row => {
                const ots    = row.isCustom ? [] : rowOTs(row.id)
                const cBlocks = row.isCustom ? customBlocks.filter(b => b.rowId===row.id) : []
                const isDropTarget = hoverRow?.rowId===row.id && !isRowEditMode
                const gPos = ghostPos(row.id)
                return (
                  <div key={row.id}
                    onDragOver={!isRowEditMode ? e => { e.preventDefault(); e.stopPropagation() } : undefined}
                    onDrop={!isRowEditMode ? e => onRowDrop(e, row.id, !!row.isCustom) : undefined}
                    className={`flex border-b border-slate-800/50 transition-colors group ${isDropTarget?'bg-indigo-950/30':'hover:bg-white/[0.01]'}`}>
                    {renderRowLabel(row)}
                    <div className="flex-1 relative overflow-hidden" style={{ height:ROW_H, width:`${24*HOUR_WIDTH_PX}px`, minWidth:`${24*HOUR_WIDTH_PX}px` }}
                      onDragOver={!isRowEditMode ? e => onRowDragOver(e, row.id) : undefined}
                      onDragLeave={!isRowEditMode ? onRowDragLeave : undefined}
                      onDrop={!isRowEditMode ? e => onRowDrop(e, row.id, !!row.isCustom) : undefined}
                      onDoubleClick={e => {
                        if (isRowEditMode) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        const rawMin = DAY_START_MIN + ((e.clientX - rect.left) / rect.width) * DAY_TOTAL_MIN
                        const snapped = snapToQuarter(Math.round(rawMin))
                        const hh = String(Math.floor(snapped/60)).padStart(2,'0')
                        const mm = String(snapped%60).padStart(2,'0')
                        setAddBlockFor({ rowId:row.id, dateStart:`${selectedDay}T${hh}:${mm}` })
                        setNewBlockLabel('')
                        setNewBlockType('hlp')
                        setNewBlockDurationHours('10')
                        setNewBlockClientId(clients[0]?.id ?? '')
                        setNewBlockDonneurOrdreId(clients[0]?.id ?? '')
                        setNewBlockReferenceCourse(generatePlanningCourseReference())
                        setNewBlockChargementSiteId('')
                        setNewBlockLivraisonSiteId('')
                        setNewBlockDistanceKm('')
                        setNewBlockDateChargement(selectedDay)
                        setNewBlockTimeChargement(`${hh}:${mm}`)
                        setNewBlockDateLivraison(selectedDay)
                        setNewBlockTimeLivraison('18:00')
                      }}>
                      {/* Hour grid */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {hourSlots.map(h => (
                          <div key={h} className="flex-shrink-0 border-r border-slate-800/40" style={{width:HOUR_WIDTH_PX}}>
                            <div className="flex h-full">
                              {[0,1,2,3].map(q => <div key={q} className="flex-1 border-r border-slate-800/20 last:border-r-0"/>)}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Now indicator */}
                      {selectedDay===today && nowPct>=0 && nowPct<=1 && (
                        <div className="absolute top-0 bottom-0 w-px bg-blue-400/70 z-30 pointer-events-none" style={{left:`${nowPct*100}%`}}>
                          <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-400 rounded-full"/>
                        </div>
                      )}
                      {isDropTarget && drag && <div className="absolute inset-0 border-2 border-dashed border-indigo-500/50 rounded pointer-events-none z-10"/>}
                      {gPos && (
                        <div style={gPos} className={`${STATUT_CLS[drag?.ot?.statut??'']??'bg-slate-500 border-slate-400'} border rounded-md flex items-center px-2 text-white text-[11px] opacity-50 overflow-hidden`}>
                          {drag?.ot?.reference ?? '-'}
                        </div>
                      )}
                      {ots.map(ot => {
                        const pos = blockPosDay(ot.date_chargement_prevue, ot.date_livraison_prevue, selectedDay)
                        if (!pos) return null
                        const { cls:cCls, style:cStyle } = getBlockColors(ot, row.id)
                        const isDragging = drag?.ot?.id===ot.id
                        const isLate = ot.statut !== 'facture' && ot.date_livraison_prevue && ot.date_livraison_prevue.slice(0,10) < today
                        return (
                          <div key={ot.id} style={{...pos,...cStyle}}
                            draggable={canMove(ot)&&!isRowEditMode&&!drag}
                            onDragStart={canMove(ot)&&!isRowEditMode&&!drag ? e => onDragStartBlock(ot, e) : undefined}
                            onDragEnd={onDragEnd}
                            className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col justify-center px-2 group/block overflow-hidden shadow-md
                              ${canMove(ot)&&!isRowEditMode?'cursor-grab active:cursor-grabbing':'cursor-pointer'}
                              ${isDragging?'opacity-30':'hover:brightness-110'}
                              ${isLate?'ring-1 ring-red-400/60':''}
                              ${drag && !isDragging ? 'pointer-events-none' : ''}`}
                            onClick={() => !isRowEditMode && openSelected(ot)}
                            onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot }) }}>
                            <div className="flex items-center gap-1 min-w-0">
                              {isAffretedOt(ot.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                              {isLate && <span className="text-[8px] flex-shrink-0">?</span>}
                              {ot.statut === 'facture' && <span className="text-[8px] flex-shrink-0 text-violet-300">EUR</span>}
                              <StatutOpsDot statut={ot.statut_operationnel} size="xs"/>
                              <span className="font-mono font-bold truncate flex-1">{ot.reference}</span>
                            </div>
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-white/80 text-[10px] font-semibold truncate flex-1">{ot.client_nom}</span>
                              <span className="text-white/50 text-[9px] font-mono flex-shrink-0">{isoToTime(ot.date_chargement_prevue)}?{isoToTime(ot.date_livraison_prevue)}</span>
                            </div>
                          </div>
                        )
                      })}
                      {cBlocks.map(block => {
                        const pos = blockPosDay(block.dateStart, block.dateEnd, selectedDay)
                        if (!pos) return null
                        const linkedOT = findOTById(block.otId)
                        if (linkedOT) {
                          const { cls:cCls, style:cStyle } = getBlockColors(linkedOT, row.id)
                          const isLate = linkedOT.statut !== 'facture' && linkedOT.date_livraison_prevue && linkedOT.date_livraison_prevue.slice(0,10) < today
                          return (
                            <div key={block.id} style={{...pos,...cStyle}}
                              draggable={!isRowEditMode&&!drag}
                              onDragStart={!isRowEditMode&&!drag ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                              className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col justify-center px-2 group/cblock overflow-hidden shadow-md
                                ${!isRowEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                                ${drag?.customBlockId===block.id ? 'opacity-30' : 'hover:brightness-110'}
                                ${isLate ? 'ring-1 ring-red-400/60' : ''}
                                ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}`}
                              onClick={() => !isRowEditMode && openSelected(linkedOT)}
                              onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot:linkedOT }) }}>
                              <div className="flex items-center gap-1 min-w-0">
                                {isAffretedOt(linkedOT.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                                {isLate && <span className="text-[8px] flex-shrink-0">!</span>}
                                {linkedOT.statut === 'facture' && <span className="text-[8px] flex-shrink-0 text-violet-300">EUR</span>}
                                <StatutOpsDot statut={linkedOT.statut_operationnel} size="xs"/>
                                <span className="font-mono font-bold truncate flex-1">{linkedOT.reference}</span>
                                {!isRowEditMode && (
                                  <button title="Desaffecter" className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/20 text-[10px]"
                                    onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>
                                )}
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-white/80 text-[10px] font-semibold truncate flex-1">{linkedOT.client_nom}</span>
                                <span className="text-white/50 text-[9px] font-mono flex-shrink-0">{isoToTime(linkedOT.date_chargement_prevue)}-{isoToTime(linkedOT.date_livraison_prevue)}</span>
                              </div>
                            </div>
                          )
                        }
                        return (
                          <div key={block.id} style={pos} draggable={!isRowEditMode&&!drag}
                            onDragStart={!isRowEditMode&&!drag ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                            className={`${block.color} border rounded-md text-white text-[11px] font-medium flex flex-col justify-center px-2 cursor-grab active:cursor-grabbing group/cblock overflow-hidden shadow-sm ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}`}>
                            <span className="truncate leading-tight">{block.label}</span>
                              <span className="text-white/60 text-[9px]">{block.dateStart.slice(11,16)}-{block.dateEnd.slice(11,16)}</span>
                            {!isRowEditMode && <button className="absolute right-1 top-1 opacity-0 group-hover/cblock:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                              onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Add row */}
              {!showAddRow ? (
                <button onClick={() => setShowAddRow(true)}
                  className="flex items-center gap-2 px-3 py-3 text-xs text-slate-600 hover:text-slate-400 transition-colors border-b border-slate-800/30">
                  <span className="w-44 flex-shrink-0 flex items-center gap-1.5"><span className="text-lg">+</span>Ajouter une ligne</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700 bg-slate-900/80">
                  <div className="w-44 flex-shrink-0 flex items-center gap-2">
                    <input autoFocus value={newRowLabel} onChange={e => setNewRowLabel(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter') addCustomRow(); if(e.key==='Escape'){setShowAddRow(false);setNewRowLabel('')} }}
                      placeholder="Nom de la ligne..."
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-indigo-500 transition-colors"/>
                  </div>
                  <button onClick={addCustomRow} className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg">OK</button>
                  <button onClick={() => { setShowAddRow(false); setNewRowLabel('') }} className="px-2.5 py-1.5 text-slate-500 hover:text-white text-xs">Annuler</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* -- Assign modal -------------------------------------------------------- */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Placer sur le planning</h3>
              <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
                <span className="font-mono">{assignModal.ot.reference}</span>
                <span className="text-slate-600">-</span><span>{assignModal.ot.client_nom}</span>
                {assignModal.ot.prix_ht && <span className="ml-auto text-slate-500">{assignModal.ot.prix_ht.toFixed(0)} EUR HT</span>}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Date chargement', type:'date', key:'date_chargement' as const },
                  { label:'Heure depart',    type:'time', key:'time_chargement' as const },
                  { label:'Date livraison',  type:'date', key:'date_livraison'  as const },
                  { label:'Heure arrivee',   type:'time', key:'time_livraison'  as const },
                ].map(({ label, type, key }) => (
                  <label key={key} className="block">
                    <span className="text-xs font-medium text-slate-400">{label}</span>
                    <input type={type} step={type==='time'?900:undefined} value={assignModal[key]}
                      onChange={e => setAssignModal(m => m && { ...m, [key]: e.target.value })}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors"/>
                  </label>
                ))}
              </div>
              {[
                { label:'Conducteur', key:'conducteur_id' as const, items: conducteurs.map(c => ({ id:c.id, label:`${c.prenom} ${c.nom}` })), placeholder:'Non affecte' },
                { label:'Camion',     key:'vehicule_id'   as const, items: vehicules.map(v  => ({ id:v.id, label:`${v.immatriculation}${v.marque?` - ${v.marque}`:''}` })), placeholder:'Non affecte' },
                { label:'Remorque',   key:'remorque_id'   as const, items: remorques.map(r  => ({ id:r.id, label:`${r.immatriculation} - ${r.type_remorque}` })), placeholder:'Sans remorque' },
              ].map(({ label, key, items, placeholder }) => (
                <label key={key} className="block">
                  <span className="text-xs font-medium text-slate-400">{label}</span>
                  <select value={assignModal[key]}
                    onChange={e => setAssignModal(m => m && { ...m, [key]: e.target.value })}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors">
                    <option value="">{placeholder}</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="p-6 pt-2 flex gap-3 justify-end">
              <button onClick={() => setAssignModal(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
              <button onClick={saveAssign} disabled={saving}
                className="px-5 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : 'Placer sur le planning'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Add custom block modal ---------------------------------------------- */}
      {addBlockFor && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setAddBlockFor(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-3">Ajouter un evenement planning</h3>
            <label className="block mb-2">
              <span className="text-[11px] text-slate-400">Type</span>
              <select
                value={newBlockType}
                onChange={e => setNewBlockType(e.target.value as PlanningInlineType)}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
              >
                {(Object.keys(INLINE_EVENT_LABELS) as PlanningInlineType[]).map(type => (
                  <option key={type} value={type}>{INLINE_EVENT_LABELS[type]}</option>
                ))}
              </select>
            </label>
            <input autoFocus value={newBlockLabel} onChange={e => setNewBlockLabel(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') void addCustomBlock(); if(e.key==='Escape') setAddBlockFor(null) }}
              placeholder={newBlockType === 'course' ? 'Libelle de la course...' : `Description ${INLINE_EVENT_LABELS[newBlockType].toLowerCase()}...`}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-indigo-500 mb-3"/>
            {newBlockType === 'course' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <label className="block">
                  <span className="text-[11px] text-slate-400">Client</span>
                  <select
                    value={newBlockClientId}
                    onChange={e => setNewBlockClientId(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Selectionner</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.nom}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-400">Donneur d ordre</span>
                  <select
                    value={newBlockDonneurOrdreId}
                    onChange={e => setNewBlockDonneurOrdreId(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Selectionner</option>
                    {clients.map(client => <option key={client.id} value={client.id}>{client.nom}</option>)}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-slate-400">Numero de reference course</span>
                  <input
                    value={newBlockReferenceCourse}
                    onChange={e => setNewBlockReferenceCourse(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-400">Lieu de chargement</span>
                  <select
                    value={newBlockChargementSiteId}
                    onChange={e => setNewBlockChargementSiteId(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Selectionner</option>
                    {logisticSites.map(site => <option key={site.id} value={site.id}>{site.nom}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-400">Lieu de livraison</span>
                  <select
                    value={newBlockLivraisonSiteId}
                    onChange={e => setNewBlockLivraisonSiteId(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  >
                    <option value="">Selectionner</option>
                    {logisticSites.map(site => <option key={site.id} value={site.id}>{site.nom}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-400">Date chargement</span>
                  <input
                    type="date"
                    value={newBlockDateChargement}
                    onChange={e => setNewBlockDateChargement(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-400">Heure chargement</span>
                  <input
                    type="time"
                    step={900}
                    value={newBlockTimeChargement}
                    onChange={e => setNewBlockTimeChargement(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-400">Date livraison</span>
                  <input
                    type="date"
                    value={newBlockDateLivraison}
                    onChange={e => setNewBlockDateLivraison(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] text-slate-400">Heure livraison</span>
                  <input
                    type="time"
                    step={900}
                    value={newBlockTimeLivraison}
                    onChange={e => setNewBlockTimeLivraison(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] text-slate-400">Distance du parcours (km)</span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={newBlockDistanceKm}
                    onChange={e => setNewBlockDistanceKm(e.target.value)}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                  />
                </label>
              </div>
            )}
            <label className="block mb-3">
              <span className="text-[11px] text-slate-400">Duree (heures)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={newBlockDurationHours}
                onChange={e => setNewBlockDurationHours(e.target.value)}
                className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAddBlockFor(null)} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
              <button onClick={() => void addCustomBlock()} disabled={creatingInlineEvent} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                {creatingInlineEvent ? 'Creation...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Block detail -------------------------------------------------------- */}
      {selected && editDraft && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeSelected}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isAffretedOt(selected.id) && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300">AFF</span>}
                  <input
                    value={editDraft.reference}
                    onChange={e => setEditDraft(d => d && { ...d, reference: e.target.value })}
                    className="font-mono text-xs text-slate-300 bg-transparent border-b border-slate-700 hover:border-slate-500 focus:border-indigo-500 focus:text-white outline-none transition-colors w-full"
                  />
                </div>
                <p className="text-white font-bold text-base leading-tight truncate">{selected.client_nom}</p>
                {getAffretementCompany(selected.id) && <p className="text-[11px] text-blue-300/80 mt-0.5">{getAffretementCompany(selected.id)}</p>}
              </div>
              <select
                value={editDraft.statut}
                onChange={e => setEditDraft(d => d && { ...d, statut: e.target.value })}
                className={`text-[11px] px-2.5 py-1 rounded-full font-semibold outline-none cursor-pointer flex-shrink-0 ${BADGE_CLS[editDraft.statut] ?? 'bg-slate-700 text-slate-300'}`}
              >
                {(['planifie','en_cours','livre','facture'] as const).map(s => (
                  <option key={s} value={s} className="bg-slate-800 text-white">{STATUT_LABEL[s]}</option>
                ))}
              </select>
            </div>

            <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Planification */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Planification</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {([
                    { label: 'Date chargement', type: 'date', key: 'date_chargement' as const },
                    { label: 'Heure depart',    type: 'time', key: 'time_chargement' as const },
                    { label: 'Date livraison',  type: 'date', key: 'date_livraison'  as const },
                    { label: 'Heure arrivee',   type: 'time', key: 'time_livraison'  as const },
                  ] as const).map(({ label, type, key }) => (
                    <label key={key} className="block">
                      <span className="text-[10px] text-slate-500">{label}</span>
                      <input type={type} step={type === 'time' ? 900 : undefined}
                        value={editDraft[key]}
                        onChange={e => setEditDraft(d => d && { ...d, [key]: e.target.value })}
                        className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors" />
                    </label>
                  ))}
                </div>
              </div>

              {/* Ressources */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Ressources</p>
                <div className="space-y-2">
                  {([
                    { label: 'Conducteur', key: 'conducteur_id' as const, items: conducteurs.map(c => ({ id:c.id, label:`${c.prenom} ${c.nom}` })), placeholder: 'Non affecte' },
                    { label: 'Camion',     key: 'vehicule_id'   as const, items: vehicules.map(v  => ({ id:v.id, label:`${v.immatriculation}${v.marque?` - ${v.marque}`:''}` })), placeholder: 'Non affecte' },
                    { label: 'Remorque',   key: 'remorque_id'   as const, items: remorques.map(r  => ({ id:r.id, label:`${r.immatriculation} - ${r.type_remorque}` })), placeholder: 'Sans remorque' },
                  ] as const).map(({ label, key, items, placeholder }) => (
                    <label key={key} className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-500 w-20 flex-shrink-0">{label}</span>
                      <select value={editDraft[key]}
                        onChange={e => setEditDraft(d => d && { ...d, [key]: e.target.value })}
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors">
                        <option value="">{placeholder}</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Details</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="block">
                    <span className="text-[10px] text-slate-500">Marchandise</span>
                    <input value={editDraft.nature_marchandise}
                      onChange={e => setEditDraft(d => d && { ...d, nature_marchandise: e.target.value })}
                      placeholder="Nature de la marchandise"
                      className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-slate-500">Prix HT (EUR)</span>
                    <input type="number" min="0" step="0.01" value={editDraft.prix_ht}
                      onChange={e => setEditDraft(d => d && { ...d, prix_ht: e.target.value })}
                      placeholder="0.00"
                      className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-slate-500">Donneur d ordre</span>
                    <select
                      value={editDraft.donneur_ordre_id}
                      onChange={e => setEditDraft(d => d && { ...d, donneur_ordre_id: e.target.value })}
                      className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Selectionner</option>
                      {clients.map(client => <option key={client.id} value={client.id}>{client.nom}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-slate-500">Distance du parcours (km)</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={editDraft.distance_km}
                      onChange={e => setEditDraft(d => d && { ...d, distance_km: e.target.value })}
                      placeholder="0"
                      className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-slate-500">Lieu de chargement</span>
                    <select
                      value={editDraft.chargement_site_id}
                      onChange={e => setEditDraft(d => d && { ...d, chargement_site_id: e.target.value })}
                      className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Selectionner</option>
                      {logisticSites.map(site => <option key={site.id} value={site.id}>{site.nom}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[10px] text-slate-500">Lieu de livraison</span>
                    <select
                      value={editDraft.livraison_site_id}
                      onChange={e => setEditDraft(d => d && { ...d, livraison_site_id: e.target.value })}
                      className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Selectionner</option>
                      {logisticSites.map(site => <option key={site.id} value={site.id}>{site.nom}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {/* Statut operationnel */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Statut operationnel</p>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.entries(STATUT_OPS) as [StatutOps, typeof STATUT_OPS[StatutOps]][]).map(([k, cfg]) => (
                    <button key={k} type="button"
                      onClick={() => setEditDraft(d => d ? { ...d, statut_operationnel: d.statut_operationnel === k ? null : k } : d)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                        editDraft.statut_operationnel === k
                          ? `${cfg.dot} text-white border-transparent`
                          : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                      }`}>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}/>{cfg.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 pt-3 border-t border-slate-800 flex items-center gap-2">
              {canUnlock(selected) && (
                <button onClick={() => unassign(selected)}
                  className="py-2 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg border border-red-900/30 transition-colors">
                  Retirer
                </button>
              )}
              <div className="flex-1" />
              <button onClick={closeSelected}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">
                Annuler
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="px-5 py-2.5 bg-white text-slate-900 text-xs font-semibold rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {conflictPanelRowId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setConflictPanelRowId(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">Details des conflits</h3>
                <p className="text-xs text-slate-400 mt-0.5">{conflictRow?.primary ?? 'Ressource'} - {activeRowConflicts.length} chevauchement{activeRowConflicts.length > 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {conflictRow && !conflictRow.isCustom && !conflictRow.isAffretementAsset && activeRowConflicts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => resolveConflictsForRow(conflictPanelRowId)}
                    disabled={resolvingRowId === conflictPanelRowId}
                    className="px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-60 transition-colors"
                  >
                    {resolvingRowId === conflictPanelRowId ? 'Resolution...' : 'Resoudre automatiquement'}
                  </button>
                )}
                <button onClick={() => setConflictPanelRowId(null)} className="px-3 py-2 text-xs text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors">Fermer</button>
              </div>
            </div>
            <div className="p-5 max-h-[65vh] overflow-auto space-y-2">
              {activeRowConflicts.length === 0 ? (
                <p className="text-sm text-slate-400">Aucun conflit detecte sur la periode affichee.</p>
              ) : activeRowConflicts.map((conflict, idx) => (
                <div key={`${conflict.first.id}-${conflict.second.id}-${idx}`} className="rounded-xl border border-slate-700/70 bg-slate-800/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-white font-mono">{conflict.first.reference} / {conflict.second.reference}</p>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">{formatMinutes(conflict.overlapMinutes)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {isoToDate(conflict.first.date_chargement_prevue)} {isoToTime(conflict.first.date_chargement_prevue)} - {isoToDate(conflict.first.date_livraison_prevue)} {isoToTime(conflict.first.date_livraison_prevue)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isoToDate(conflict.second.date_chargement_prevue)} {isoToTime(conflict.second.date_chargement_prevue)} - {isoToDate(conflict.second.date_livraison_prevue)} {isoToTime(conflict.second.date_livraison_prevue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* -- Context menu (clic droit sur un bloc) ------------------------------ */}
      {contextMenu && (
        <div
          className="fixed z-[60] min-w-[220px] rounded-xl border border-slate-700/80 bg-slate-900 shadow-2xl py-1 overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          {/* En-tete */}
          <div className="px-3 py-2.5 border-b border-slate-800 bg-slate-800/40">
            <div className="flex items-center gap-1.5 mb-1">
              {isAffretedOt(contextMenu.ot.id) && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-blue-600/30 text-blue-300">AFF</span>}
              <span className="text-xs font-mono text-slate-400">{contextMenu.ot.reference}</span>
              <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium ${BADGE_CLS[contextMenu.ot.statut] ?? 'bg-slate-700 text-slate-400'}`}>
                {STATUT_LABEL[contextMenu.ot.statut] ?? contextMenu.ot.statut}
              </span>
            </div>
            <p className="text-sm font-bold text-white truncate">{contextMenu.ot.client_nom}</p>
            {getAffretementCompany(contextMenu.ot.id) && (
              <p className="text-[11px] text-blue-300/80 truncate mt-0.5">{getAffretementCompany(contextMenu.ot.id)}</p>
            )}
            {contextMenu.ot.prix_ht != null && (
              <p className="text-[10px] text-emerald-400/80 mt-0.5">{contextMenu.ot.prix_ht.toFixed(0)} EUR HT</p>
            )}
          </div>

          {/* Actions principales */}
          <div className="py-1">
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
              onClick={() => { setContextMenu(null); openSelected(contextMenu.ot) }}>
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
              Details / Statut operationnel
            </button>

            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
              onClick={() => { setContextMenu(null); openAssign(contextMenu.ot) }}>
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modifier dates / ressources
            </button>

            {(contextMenu.ot.statut === 'livre' || contextMenu.ot.statut === 'en_cours') && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-violet-300 hover:bg-violet-900/30 hover:text-violet-200 transition-colors text-left"
                onClick={async () => {
                  setContextMenu(null)
                  await supabase.from('ordres_transport').update({ statut: 'facture' }).eq('id', contextMenu.ot.id)
                  loadAll()
                }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M7 15h2M11 15h6"/>
                </svg>
                Marquer comme facture
              </button>
            )}

            <div className="border-t border-slate-800 my-1"/>

            {canUnlock(contextMenu.ot) && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-900/20 hover:text-rose-300 transition-colors text-left"
                onClick={() => unassign(contextMenu.ot)}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>
                </svg>
                Desaffecter la course
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}



