// ─── Planning Utils ────────────────────────────────────────────────────────────
// Fonctions pures, constantes et helpers localStorage extraits de Planning.tsx.
// Importé via : import { ... } from './planning/planningUtils'

import type { CSSProperties } from 'react'
import { OT_STATUT_BLOCK_CLS, OT_STATUT_BADGE_CLS, OT_STATUT_LABELS, type LogisticSite } from '@/lib/transportCourses'
import type { AffretementContract } from '@/lib/affretementPortal'
import { syncCustomRows, syncCustomBlocks } from '@/lib/planningCustomBlocks'
import type {
  OT, BlockMetrics, RowOrderMap,
  SiteKind, SiteDraft, SiteLoadRow, SiteUsageType,
  CustomRow, CustomBlock, PlanningInlineType,
} from './planningTypes'

// ─── Misc helpers ──────────────────────────────────────────────────────────────

export function getUpdateFailureReason(result: { error?: { message?: string } | null; data?: unknown }) {
  if (result.error?.message) return result.error.message
  if (Array.isArray(result.data)) {
    return 'Ecriture distante refusee, fallback local detecte (verifier droits/RLS Supabase).'
  }
  if (result.data == null) {
    return 'Aucune ligne distante mise a jour (OT introuvable ou non accessible).'
  }
  return 'Mise a jour non confirmee sur la base distante.'
}

export const ACTIVE_AFFRETEMENT_STATUSES: AffretementContract['status'][] = ['propose', 'accepte', 'en_cours', 'termine']

// ─── Date helpers (timezone-safe) ─────────────────────────────────────────────

export function getMonday(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return date
}
export function addDays(d: Date, n: number): Date { const r = new Date(d.getFullYear(), d.getMonth(), d.getDate()); r.setDate(r.getDate() + n); return r }
/** Retourne une date ISO YYYY-MM-DD en heure locale (sans décalage UTC). */
export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
/** Parse YYYY-MM-DD en minuit local (sans décalage UTC). */
export function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function daysDiff(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / 86400000) }
export function getMonthStart(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1) }
export function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
export function getMonthDays(d: Date): Date[] { const y = d.getFullYear(); const m = d.getMonth(); const count = new Date(y, m+1, 0).getDate(); return Array.from({length: count}, (_, i) => new Date(y, m, i+1)) }
/** Noms complets des mois (Janvier, Février…) — vue mensuelle. */
export const MONTH_FULL_NAMES = ['Janvier','Fevrier','Mars','Avril','Mai','Juin','Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
export function snapToQuarter(minutes: number): number { return Math.round(minutes / 15) * 15 }
export function minutesFromMidnight(iso: string): number { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes() }
export function toDateTimeISO(date: string, time: string): string { return `${date}T${time || '08:00'}:00` }
export function toDateTimeFromDate(d: Date): string {
  return `${toISO(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:00`
}
export function isoToTime(iso: string | null): string {
  if (!iso) return '08:00'
  if (iso.includes('T')) return iso.slice(11, 16)
  return '08:00'
}
export function isoToDate(iso: string | null): string {
  if (!iso) return toISO(new Date())
  return iso.slice(0, 10)
}

export const DAY_NAMES   = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']
/** Abréviations des mois (jan, fev…) — formatage des plages de semaine. */
export const MONTH_SHORT_NAMES = ['jan','fev','mar','avr','mai','juin','juil','aout','sep','oct','nov','dec']
export function fmtWeek(start: Date): string {
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth())
    return `${start.getDate()}-${end.getDate()} ${MONTH_SHORT_NAMES[start.getMonth()]} ${start.getFullYear()}`
  return `${start.getDate()} ${MONTH_SHORT_NAMES[start.getMonth()]} - ${end.getDate()} ${MONTH_SHORT_NAMES[end.getMonth()]} ${end.getFullYear()}`
}
export function fmtDay(d: Date): string {
  return `${DAY_NAMES[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTH_SHORT_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

export function toTimeValue(iso: string | null, fallbackDayISO: string): number {
  const safeISO = iso && iso.includes('T') ? iso : `${fallbackDayISO}T08:00:00`
  const d = new Date(safeISO)
  if (!Number.isFinite(d.getTime())) return new Date(`${fallbackDayISO}T08:00:00`).getTime()
  return d.getTime()
}

// ─── Block position (week view) ────────────────────────────────────────────────

export function getWeekBlockMetrics(ot: OT, weekStart: Date): BlockMetrics | null {
  const weekStartMs    = weekStart.getTime()
  const weekDurationMs = 7 * 24 * 60 * 60 * 1000
  const weekEndMs      = weekStartMs + weekDurationMs

  const startISO = ot.date_chargement_prevue ?? ot.date_livraison_prevue
  const endISO   = ot.date_livraison_prevue  ?? ot.date_chargement_prevue
  if (!startISO || !endISO) return null

  const startMs = toTimeValue(startISO, startISO.slice(0, 10))
  const endMs   = toTimeValue(endISO,   endISO.slice(0, 10))

  if (endMs < weekStartMs || startMs >= weekEndMs) return null

  const visStartMs = Math.max(startMs, weekStartMs)
  const visEndMs   = Math.min(endMs,   weekEndMs)

  const minWidthMs = 30 * 60 * 1000
  const left  = (visStartMs - weekStartMs) / weekDurationMs
  const width = Math.max(minWidthMs, visEndMs - visStartMs) / weekDurationMs

  return { leftPct: left * 100, widthPct: width * 100 }
}

export function blockPos(ot: OT, weekStart: Date): CSSProperties | null {
  const metrics = getWeekBlockMetrics(ot, weekStart)
  if (!metrics) return null
  return { position:'absolute', top:'6px', height:'52px', left:`calc(${metrics.leftPct}% + 2px)`, width:`calc(${metrics.widthPct}% - 4px)` }
}

// ─── Block position (day view - full 24h) ─────────────────────────────────────

export const DAY_START_MIN  = 0
export const DAY_TOTAL_MIN  = 24 * 60

export function getDayBlockMetrics(startISO: string | null, endISO: string | null, selectedDay: string): BlockMetrics | null {
  if (!startISO) return null
  const startDate = isoToDate(startISO)
  const endDate   = isoToDate(endISO ?? startISO)
  if (startDate > selectedDay || endDate < selectedDay) return null
  const startMin = startDate < selectedDay ? DAY_START_MIN : minutesFromMidnight(startISO)
  const endMin   = endDate   > selectedDay ? DAY_START_MIN + DAY_TOTAL_MIN : minutesFromMidnight(endISO ?? startISO)
  const cStart = Math.max(DAY_START_MIN, Math.min(DAY_START_MIN + DAY_TOTAL_MIN, startMin))
  const cEnd   = Math.max(cStart + 15,  Math.min(DAY_START_MIN + DAY_TOTAL_MIN, endMin > cStart ? endMin : cStart + 60))
  const left  = (cStart - DAY_START_MIN) / DAY_TOTAL_MIN
  const width = (cEnd   - cStart)        / DAY_TOTAL_MIN
  if (width <= 0) return null
  return { leftPct: left * 100, widthPct: width * 100 }
}

export function blockPosDay(startISO: string | null, endISO: string | null, selectedDay: string): CSSProperties | null {
  const metrics = getDayBlockMetrics(startISO, endISO, selectedDay)
  if (!metrics) return null
  return { position:'absolute', top:'4px', height:'52px', left:`${metrics.leftPct}%`, width:`${metrics.widthPct}%` }
}

// ─── Color constants ───────────────────────────────────────────────────────────

// Aliases vers la source de vérité centralisée dans transportCourses.ts.
export const STATUT_CLS   = OT_STATUT_BLOCK_CLS
export const BADGE_CLS    = OT_STATUT_BADGE_CLS
export const STATUT_LABEL = OT_STATUT_LABELS
export const CUSTOM_COLORS = [
  'bg-sky-600 border-sky-500','bg-rose-600 border-rose-500','bg-amber-600 border-amber-500',
  'bg-lime-600 border-lime-500','bg-fuchsia-600 border-fuchsia-500','bg-cyan-600 border-cyan-500',
]
export const INLINE_EVENT_COLORS: Record<Exclude<PlanningInlineType, 'course'>, string> = {
  hlp: 'bg-slate-600 border-slate-500',
  maintenance: 'bg-orange-600 border-orange-500',
  repos: 'bg-indigo-600 border-indigo-500',
}
export const INLINE_EVENT_LABELS: Record<PlanningInlineType, string> = {
  course: 'Course',
  hlp: 'HLP',
  maintenance: 'Nettoyage',
  repos: 'Pause',
}
export const COLOR_PALETTE = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6',
  '#f97316','#84cc16','#06b6d4','#fb7185',
]
export const TYPE_TRANSPORT_COLORS: Record<string, string> = {
  complet:       '#1e3a8a', // bleu marine — charge complète
  groupage:      '#c2410c', // orange brûlé — groupage multi-clients
  express:       '#be185d', // rose/fuchsia — urgence (≠ rouge bordure annulé)
  partiel:       '#6d28d9', // violet — chargement partiel
  messagerie:    '#0284c7', // bleu ciel — messagerie/colis (≠ marine complet)
  frigorifique:  '#0f766e', // teal — température dirigée (≠ bleu ciel)
  vrac:          '#3f6212', // vert olive foncé — vrac (≠ vert bordure ok)
  conventionnel: '#374151', // anthracite — conventionnel
}

/** Couleur de contour OT selon timing/statut : vert = ok, orange = retard, rouge = annulé */
export function getOtBorderColor(ot: {
  statut?: string | null
  statut_transport?: string | null
  date_livraison_prevue?: string | null
}): string {
  if (ot.statut === 'annule' || ot.statut_transport === 'annule') return '#ef4444'
  if (['facture', 'livre'].includes(ot.statut ?? '') || ot.statut_transport === 'termine') return '#22c55e'
  const lp = ot.date_livraison_prevue
  if (lp && new Date(lp).getTime() < Date.now()) return '#f97316'
  const st = ot.statut_transport ?? ''
  if (['planifie', 'en_cours_approche_chargement', 'en_chargement', 'en_transit', 'en_livraison'].includes(st)) return '#4ade80'
  return '#94a3b8'
}

// ─── Site utilities ────────────────────────────────────────────────────────────

export const SITE_USAGE_LABELS: Record<SiteUsageType, string> = {
  chargement: 'Chargement uniquement',
  livraison: 'Livraison uniquement',
  mixte: 'Chargement et livraison',
}
export const EMPTY_SITE_DRAFT: SiteDraft = {
  entreprise_id: '',
  nom: '',
  adresse: '',
  usage_type: 'mixte',
  horaires_ouverture: '',
  jours_ouverture: '',
  notes_livraison: '',
  latitude: null,
  longitude: null,
  showMap: false,
}

export function normalizeAddressValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function siteSupportsKind(site: LogisticSite, kind: SiteKind) {
  return site.usage_type === 'mixte' || site.usage_type === kind
}

export function sortLogisticSites(items: LogisticSite[]) {
  return [...items].sort((left, right) => left.nom.localeCompare(right.nom, 'fr-FR'))
}

export function makeEmptySiteDraft(entrepriseId = ''): SiteDraft {
  return { ...EMPTY_SITE_DRAFT, entreprise_id: entrepriseId }
}

export function mapSiteLoadRow(row: SiteLoadRow): LogisticSite {
  return {
    id: row.id,
    nom: row.nom,
    adresse: row.adresse,
    company_id: row.company_id ?? 1,
    entreprise_id: row.entreprise_id ?? null,
    usage_type: (row.usage_type === 'chargement' || row.usage_type === 'livraison' || row.usage_type === 'mixte')
      ? row.usage_type
      : 'mixte',
    horaires_ouverture: row.horaires_ouverture ?? null,
    jours_ouverture: row.jours_ouverture ?? null,
    notes_livraison: row.notes_livraison ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    created_at: row.created_at ?? new Date(0).toISOString(),
    updated_at: row.updated_at ?? new Date(0).toISOString(),
    code_postal: row.code_postal ?? null,
    contact_nom: row.contact_nom ?? null,
    contact_tel: row.contact_tel ?? null,
    est_depot_relais: row.est_depot_relais ?? false,
    ville: row.ville ?? null,
    pays: row.pays ?? 'France',
    type_site: row.type_site ?? 'autre',
    capacite_m3: row.capacite_m3 ?? null,
    notes: row.notes ?? null,
  } as unknown as LogisticSite
}

// ─── localStorage keys ─────────────────────────────────────────────────────────

export const ROWS_KEY             = 'nexora_planning_custom_rows_v1'
export const BLOCKS_KEY           = 'nexora_planning_custom_blocks_v1'
export const CONDUCTOR_COLORS_KEY = 'nexora_planning_conductor_colors_v1'
export const ROW_ORDER_KEY        = 'nexora_planning_row_order_v1'
export const SHOW_AFF_ASSETS_KEY  = 'nexora_planning_show_affretement_assets_v1'
export const COMPLIANCE_BLOCK_KEY = 'nexora_planning_compliance_block_v1'
export const COMPLIANCE_BLOCK_RULES_KEY = 'nexora_planning_compliance_block_rules_v1'
export const SIMULATION_MODE_KEY = 'nexora_planning_simulation_mode_v1'
export const AUTO_HABILLAGE_KEY = 'nexora_planning_auto_habillage_v1'
export const AUTO_PAUSE_KEY = 'nexora_planning_auto_pause_v1'
export const PLANNING_HEADER_COLLAPSED_KEY = 'nexora_planning_header_collapsed_v1'
export const BOTTOM_DOCK_HEIGHT_KEY = 'nexora_planning_bottom_dock_height_v1'
export const BOTTOM_DOCK_COLLAPSED_KEY = 'nexora_planning_bottom_dock_collapsed_v1'
export const PLANNING_SCOPE_KEY = 'nexora_planning_scope_v1'
export const BOTTOM_DOCK_VIEWPORT_OFFSET = 8

// ─── Compliance constants ──────────────────────────────────────────────────────

export const COMPLIANCE_RULE_LABELS: Record<string, string> = {
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

export const DEFAULT_BLOCKING_RULE_CODES = new Set<string>([
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

// ─── localStorage helpers ──────────────────────────────────────────────────────

export function loadCustomRows(): CustomRow[]   { try { return JSON.parse(localStorage.getItem(ROWS_KEY)   ?? '[]') } catch { return [] } }
export function saveCustomRows(r: CustomRow[])  { localStorage.setItem(ROWS_KEY, JSON.stringify(r)); void syncCustomRows(r.map(x => ({ id: x.id, label: x.label, subtitle: x.subtitle }))) }
export function loadCustomBlocks(): CustomBlock[]   { try { return JSON.parse(localStorage.getItem(BLOCKS_KEY) ?? '[]') } catch { return [] } }
export function saveCustomBlocks(b: CustomBlock[])  { localStorage.setItem(BLOCKS_KEY, JSON.stringify(b)); void syncCustomBlocks(b.map(x => ({ id: x.id, row_id: x.rowId, label: x.label, date_start: x.dateStart, date_end: x.dateEnd, color: x.color, ot_id: x.otId ?? null, kind: x.kind ?? null }))) }
export function loadConductorColors(): Record<string,string> { try { return JSON.parse(localStorage.getItem(CONDUCTOR_COLORS_KEY) ?? '{}') } catch { return {} } }
export function saveConductorColors(c: Record<string,string>) { localStorage.setItem(CONDUCTOR_COLORS_KEY, JSON.stringify(c)) }
export function loadRowOrder(): RowOrderMap { try { return JSON.parse(localStorage.getItem(ROW_ORDER_KEY) ?? '{}') } catch { return {} as RowOrderMap } }
export function saveRowOrder(o: RowOrderMap)  { localStorage.setItem(ROW_ORDER_KEY, JSON.stringify(o)) }
export function loadShowAffretementAssets(): boolean {
  try {
    const raw = localStorage.getItem(SHOW_AFF_ASSETS_KEY)
    return raw === null ? true : raw === '1'
  } catch {
    return true
  }
}
export function saveShowAffretementAssets(value: boolean) { localStorage.setItem(SHOW_AFF_ASSETS_KEY, value ? '1' : '0') }
export function loadComplianceBlockMode(): boolean {
  try { return localStorage.getItem(COMPLIANCE_BLOCK_KEY) === '1' } catch { return false }
}
export function saveComplianceBlockMode(value: boolean) { localStorage.setItem(COMPLIANCE_BLOCK_KEY, value ? '1' : '0') }
export function loadComplianceBlockingRules(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(COMPLIANCE_BLOCK_RULES_KEY) ?? '{}') as Record<string, boolean> } catch { return {} }
}
export function saveComplianceBlockingRules(value: Record<string, boolean>) {
  localStorage.setItem(COMPLIANCE_BLOCK_RULES_KEY, JSON.stringify(value))
}
export function loadBooleanSetting(key: string, defaultValue = false): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return defaultValue
    return raw === '1'
  } catch {
    return defaultValue
  }
}
export function saveBooleanSetting(key: string, value: boolean) { localStorage.setItem(key, value ? '1' : '0') }
export function loadNumberSetting(key: string, defaultValue: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return defaultValue
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : defaultValue
  } catch {
    return defaultValue
  }
}
export function saveNumberSetting(key: string, value: number) { localStorage.setItem(key, String(value)) }
export function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
