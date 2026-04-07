import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { STATUT_OPS, StatutOpsDot, type StatutOps } from '@/lib/statut-ops'
import SiteMapPicker from '@/components/transports/SiteMapPicker'
import {
  getAffretementContextByOtId,
  listAffretementContracts,
  listAffreteurEquipments,
  subscribeAffretementPortalUpdates,
  type AffretementContract,
} from '@/lib/affretementPortal'
import { validatePlanningDropAudit, type CEAlert } from '@/lib/ce561Validation'
import { createLogisticSite, updateLogisticSite, type LogisticSite } from '@/lib/transportCourses'
import { useAuth } from '@/lib/auth'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type OT = {
  id: string; reference: string; client_nom: string
  date_chargement_prevue: string | null; date_livraison_prevue: string | null
  type_transport: string; nature_marchandise: string | null
  statut: string; conducteur_id: string | null; vehicule_id: string | null
  remorque_id: string | null; prix_ht: number | null; statut_operationnel: string | null
  distance_km: number | null; donneur_ordre_id: string | null
  chargement_site_id: string | null; livraison_site_id: string | null
  groupage_id: string | null; groupage_fige: boolean
  est_affretee: boolean
}
type Conducteur = { id: string; nom: string; prenom: string; statut: string }
type Vehicule   = { id: string; immatriculation: string; marque: string | null; modele: string | null; statut: string }
type Remorque   = { id: string; immatriculation: string; type_remorque: string; statut: string }
type ClientRef  = { id: string; nom: string; actif: boolean | null }
type Affectation = {
  id: string
  conducteur_id: string | null
  vehicule_id: string | null
  remorque_id: string | null
  actif: boolean
}
type Tab        = 'conducteurs' | 'camions' | 'remorques'
type ViewMode   = 'semaine' | 'jour'
type PlanningScope = 'principal' | 'affretement'
type ColorMode  = 'statut' | 'conducteur' | 'type' | 'client'
type AssignForm = {
  ot: OT; conducteur_id: string; vehicule_id: string; remorque_id: string
  date_chargement: string; time_chargement: string; date_livraison: string; time_livraison: string
  applyToGroupage: boolean
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
type BlockMetrics = { leftPct: number; widthPct: number }
type RowOrderMap = Record<Tab, string[]>
type ContextMenu = { x: number; y: number; ot: OT } | null
type AffretementContext = NonNullable<ReturnType<typeof getAffretementContextByOtId>>
type RowConflict = { first: OT; second: OT; overlapMinutes: number }
type BottomDockTab = 'missions' | 'non_affectees' | 'conflits' | 'affretement' | 'groupages' | 'non_programmees' | 'annulees' | 'urgences' | 'retour_charge' | 'entrepots' | 'relais'

// ─── Types Relais ─────────────────────────────────────────────────────────────
type TransportRelaisStatut = 'en_attente' | 'assigne' | 'en_cours_reprise' | 'termine' | 'annule'
type TypeRelais = 'depot_marchandise' | 'relais_conducteur'

type TransportRelaisRecord = {
  id: string
  ot_id: string
  type_relais: TypeRelais
  statut: TransportRelaisStatut
  site_id: string | null
  site: { id: string; nom: string; adresse: string; ville: string | null } | null
  lieu_nom: string
  lieu_adresse: string | null
  lieu_lat: number | null
  lieu_lng: number | null
  conducteur_depose_id: string | null
  vehicule_depose_id: string | null
  remorque_depose_id: string | null
  date_depot: string
  conducteur_reprise_id: string | null
  vehicule_reprise_id: string | null
  remorque_reprise_id: string | null
  date_reprise_prevue: string | null
  date_reprise_reelle: string | null
  notes: string | null
  created_at: string
  updated_at: string
  ordres_transport: { id: string; reference: string; client_nom: string; statut: string; statut_operationnel: string | null; vehicule_id: string | null; conducteur_id: string | null } | null
  conducteur_depose: { id: string; nom: string; prenom: string } | null
  vehicule_depose: { id: string; immatriculation: string; modele: string | null } | null
  conducteur_reprise: { id: string; nom: string; prenom: string } | null
  vehicule_reprise: { id: string; immatriculation: string; modele: string | null } | null
  remorque_reprise: { id: string; immatriculation: string } | null
}

type RelaisModalMode = 'depot' | 'relais_conducteur' | 'assign' | null
type RelaisModal = {
  mode: RelaisModalMode
  ot: OT | null
  relais: TransportRelaisRecord | null
}

type RelaisDepotForm = {
  type_relais: TypeRelais
  site_id: string
  lieu_nom: string
  lieu_adresse: string
  date_depot: string
  conducteur_depose_id: string
  vehicule_depose_id: string
  remorque_depose_id: string
  notes: string
}

type RelaisAssignForm = {
  conducteur_reprise_id: string
  vehicule_reprise_id: string
  remorque_reprise_id: string
  date_reprise_prevue: string
  notes: string
}

type RetourChargeSuggestion = {
  id: string
  reference: string
  client_nom: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  nature_marchandise: string | null
  prix_ht: number | null
  distance_km: number | null
  dist_vide_km: number | null
  score_rentabilite: number
  duree_vide_estimee_h: number | null
  retour_depot_ok: boolean
  explication_ia: string | null
  ia_provider: string
}

type RetourChargeForm = {
  vehicule_id: string
  date_debut: string
  date_fin: string
  retour_depot_avant: string
  rayon_km: number
}
type SiteUsageType = 'chargement' | 'livraison' | 'mixte'
type SiteKind = 'chargement' | 'livraison'
type SiteDraft = {
  entreprise_id: string
  nom: string
  adresse: string
  usage_type: SiteUsageType
  horaires_ouverture: string
  jours_ouverture: string
  notes_livraison: string
  latitude: number | null
  longitude: number | null
  showMap: boolean
}
type SiteLoadRow = {
  id: string
  nom: string
  adresse: string
  entreprise_id?: string | null
  usage_type?: string | null
  horaires_ouverture?: string | null
  jours_ouverture?: string | null
  notes_livraison?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at?: string | null
  updated_at?: string | null
}
// AddressLoadRow supprimé (non utilisé)
type GeneratedInlineEvent = {
  id: string
  rowId: string
  label: string
  dateStart: string
  dateEnd: string
  color: string
  kind: Exclude<PlanningInlineType, 'course'>
}
type PlanningUrgence = {
  id: string
  level: 'critique' | 'haute' | 'moyenne'
  source: 'retard' | 'non_affectee' | 'conflit'
  label: string
  detail: string
  otId?: string
  rowId?: string
  score: number
}

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

function getWeekBlockMetrics(ot: OT, weekStart: Date): BlockMetrics | null {
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

  return { leftPct: left * 100, widthPct: width * 100 }
}

function blockPos(ot: OT, weekStart: Date): React.CSSProperties | null {
  const metrics = getWeekBlockMetrics(ot, weekStart)
  if (!metrics) return null
  return { position:'absolute', top:'6px', height:'52px', left:`calc(${metrics.leftPct}% + 2px)`, width:`calc(${metrics.widthPct}% - 4px)` }
}

// Block position (day view - full 24h)

const DAY_START_MIN  = 0            // 00:00
const DAY_TOTAL_MIN  = 24 * 60      // 00:00 - 23:59

function getDayBlockMetrics(startISO: string | null, endISO: string | null, selectedDay: string): BlockMetrics | null {
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
  return { leftPct: left * 100, widthPct: width * 100 }
}

function blockPosDay(startISO: string | null, endISO: string | null, selectedDay: string): React.CSSProperties | null {
  const metrics = getDayBlockMetrics(startISO, endISO, selectedDay)
  if (!metrics) return null
  return { position:'absolute', top:'4px', height:'52px', left:`${metrics.leftPct}%`, width:`${metrics.widthPct}%` }
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
  maintenance: 'Nettoyage',
  repos: 'Pause',
}
const COLOR_PALETTE = [
  '#6366f1','#ec4899','#f59e0b','#10b981',
  '#3b82f6','#8b5cf6','#ef4444','#14b8a6',
  '#f97316','#84cc16','#06b6d4','#fb7185',
]
const SITE_USAGE_LABELS: Record<SiteUsageType, string> = {
  chargement: 'Chargement uniquement',
  livraison: 'Livraison uniquement',
  mixte: 'Chargement et livraison',
}
const EMPTY_SITE_DRAFT: SiteDraft = {
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

function normalizeAddressValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function siteSupportsKind(site: LogisticSite, kind: SiteKind) {
  return site.usage_type === 'mixte' || site.usage_type === kind
}

function sortLogisticSites(items: LogisticSite[]) {
  return [...items].sort((left, right) => left.nom.localeCompare(right.nom, 'fr-FR'))
}

function makeEmptySiteDraft(entrepriseId = ''): SiteDraft {
  return { ...EMPTY_SITE_DRAFT, entreprise_id: entrepriseId }
}

function mapSiteLoadRow(row: SiteLoadRow): LogisticSite {
  return {
    id: row.id,
    nom: row.nom,
    adresse: row.adresse,
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
    // Champs non charges dans ce contexte (planning simplifie)
    code_postal: null,
    contact_nom: null,
    contact_tel: null,
    est_depot_relais: false,
    ville: null,
    pays: null,
    type_site: null,
    capacite_m3: null,
    notes: null,
  } as unknown as LogisticSite
}
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
const SIMULATION_MODE_KEY = 'nexora_planning_simulation_mode_v1'
const AUTO_HABILLAGE_KEY = 'nexora_planning_auto_habillage_v1'
const AUTO_PAUSE_KEY = 'nexora_planning_auto_pause_v1'
const PLANNING_HEADER_COLLAPSED_KEY = 'nexora_planning_header_collapsed_v1'
const BOTTOM_DOCK_HEIGHT_KEY = 'nexora_planning_bottom_dock_height_v1'
const BOTTOM_DOCK_COLLAPSED_KEY = 'nexora_planning_bottom_dock_collapsed_v1'
const PLANNING_SCOPE_KEY = 'nexora_planning_scope_v1'
const BOTTOM_DOCK_VIEWPORT_OFFSET = 8

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
function loadBooleanSetting(key: string, defaultValue = false): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return defaultValue
    return raw === '1'
  } catch {
    return defaultValue
  }
}
function saveBooleanSetting(key: string, value: boolean) {
  localStorage.setItem(key, value ? '1' : '0')
}
function loadNumberSetting(key: string, defaultValue: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw == null) return defaultValue
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : defaultValue
  } catch {
    return defaultValue
  }
}
function saveNumberSetting(key: string, value: number) {
  localStorage.setItem(key, String(value))
}
function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Planning() {
  const { role } = useAuth()
  const [weekStart,   setWeekStart]   = useState(() => getMonday(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => toISO(new Date()))
  const [tab,         setTab]         = useState<Tab>('conducteurs')
  const [viewMode,    setViewMode]    = useState<ViewMode>('semaine')
  const [planningScope, setPlanningScope] = useState<PlanningScope>(() => {
    try {
      const raw = localStorage.getItem(PLANNING_SCOPE_KEY)
      if (raw === 'principal' || raw === 'affretement') return raw
    } catch {
      // ignore localStorage access issues
    }
    return 'principal'
  })

  const [pool,        setPool]        = useState<OT[]>([])
  const [ganttOTs,    setGanttOTs]    = useState<OT[]>([])
  const [cancelledOTs, setCancelledOTs] = useState<OT[]>([])
  const [conducteurs, setConducteurs] = useState<Conducteur[]>([])
  const [vehicules,   setVehicules]   = useState<Vehicule[]>([])
  const [remorques,   setRemorques]   = useState<Remorque[]>([])
  const [clients,     setClients]     = useState<ClientRef[]>([])
  const [logisticSites, setLogisticSites] = useState<LogisticSite[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])

  const [assignModal,  setAssignModal]  = useState<AssignForm | null>(null)
  const [selected,     setSelected]     = useState<OT | null>(null)
  const [editDraft,    setEditDraft]    = useState<EditDraft | null>(null)
  const [editSiteDrafts, setEditSiteDrafts] = useState<Record<SiteKind, SiteDraft>>({
    chargement: makeEmptySiteDraft(),
    livraison: makeEmptySiteDraft(),
  })
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
  const [editingCustomBlockId, setEditingCustomBlockId] = useState<string | null>(null)
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
  const [newBlockDurationMinutes, setNewBlockDurationMinutes] = useState('00')
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
  const [centerFilter, setCenterFilter] = useState('')
  const [showOnlyAlert, setShowOnlyAlert] = useState(false)
  const [showOnlyConflicts, setShowOnlyConflicts] = useState(false)
  const [conflictPanelRowId, setConflictPanelRowId] = useState<string | null>(null)
  const [resolvingRowId, setResolvingRowId] = useState<string | null>(null)
  const [conflictActionKey, setConflictActionKey] = useState<string | null>(null)
  const [bottomDockTab, setBottomDockTab] = useState<BottomDockTab>('missions')
  const [simulationMode, setSimulationMode] = useState<boolean>(() => loadBooleanSetting(SIMULATION_MODE_KEY, false))
  const [autoHabillage, setAutoHabillage] = useState<boolean>(() => loadBooleanSetting(AUTO_HABILLAGE_KEY, true))
  const [autoPauseReglementaire, setAutoPauseReglementaire] = useState<boolean>(() => loadBooleanSetting(AUTO_PAUSE_KEY, true))
  const [planningHeaderCollapsed, setPlanningHeaderCollapsed] = useState<boolean>(() => loadBooleanSetting(PLANNING_HEADER_COLLAPSED_KEY, false))
  const [bottomDockHeight, setBottomDockHeight] = useState<number>(() => loadNumberSetting(BOTTOM_DOCK_HEIGHT_KEY, 260))
  const [bottomDockCollapsed, setBottomDockCollapsed] = useState<boolean>(() => loadBooleanSetting(BOTTOM_DOCK_COLLAPSED_KEY, false))
  const [isResizingBottomDock, setIsResizingBottomDock] = useState(false)
  const [groupageTargetId, setGroupageTargetId] = useState('')

  // Retour en charge IA
  const [retourChargeForm, setRetourChargeForm] = useState<RetourChargeForm>({
    vehicule_id: '',
    date_debut: '',
    date_fin: '',
    retour_depot_avant: '',
    rayon_km: 200,
  })
  const [retourChargeSuggestions, setRetourChargeSuggestions] = useState<RetourChargeSuggestion[]>([])
  const [retourChargeLoading, setRetourChargeLoading] = useState(false)
  const [retourChargeError, setRetourChargeError] = useState<string | null>(null)

  // ── Relais ──────────────────────────────────────────────────────────────────
  const [relaisList, setRelaisList] = useState<TransportRelaisRecord[]>([])
  const [relaisLoading, setRelaisLoading] = useState(false)
  const [relaisError, setRelaisError] = useState<string | null>(null)
  const [relaisModal, setRelaisModal] = useState<RelaisModal>({ mode: null, ot: null, relais: null })
  const [relaisDepotForm, setRelaisDepotForm] = useState<RelaisDepotForm>({
    type_relais: 'depot_marchandise',
    site_id: '',
    lieu_nom: '',
    lieu_adresse: '',
    date_depot: new Date().toISOString().slice(0, 16),
    conducteur_depose_id: '',
    vehicule_depose_id: '',
    remorque_depose_id: '',
    notes: '',
  })
  const [relaisAssignForm, setRelaisAssignForm] = useState<RelaisAssignForm>({
    conducteur_reprise_id: '',
    vehicule_reprise_id: '',
    remorque_reprise_id: '',
    date_reprise_prevue: '',
    notes: '',
  })
  const [relaisSaving, setRelaisSaving] = useState(false)
  const [relaisDepotSites, setRelaisDepotSites] = useState<{ id: string; nom: string; ville: string | null; adresse: string }[]>([])

  // Menu contextuel
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null)

  // Ordre des lignes
  const [rowOrder,      setRowOrder]      = useState<RowOrderMap>(() => loadRowOrder())
  const [isRowEditMode, setIsRowEditMode] = useState(false)
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null)
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)

  const noticeTimerRef = useRef<number | null>(null)
  const bottomDockResizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const today = toISO(new Date())

  function pushPlanningNotice(message: string, type: 'success' | 'error' = 'success') {
    setPlanningNotice({ type, message })
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => {
      setPlanningNotice(null)
      noticeTimerRef.current = null
    }, 3500)
  }

  function ensureWriteAllowed(actionLabel: string): boolean {
    if (!simulationMode) return true
    pushPlanningNotice(`Mode simulation actif: ${actionLabel} non enregistree en base.`, 'error')
    return false
  }

  function startBottomDockResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    bottomDockResizeRef.current = { startY: event.clientY, startHeight: bottomDockHeight }
    setIsResizingBottomDock(true)
  }

  useEffect(() => {
    if (!isResizingBottomDock) return

    function handleMouseMove(event: MouseEvent) {
      const resizeState = bottomDockResizeRef.current
      if (!resizeState) return
      const delta = resizeState.startY - event.clientY
      const nextHeight = Math.max(180, Math.min(560, resizeState.startHeight + delta))
      setBottomDockHeight(nextHeight)
    }

    function handleMouseUp() {
      setIsResizingBottomDock(false)
      bottomDockResizeRef.current = null
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('blur', handleMouseUp)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('blur', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingBottomDock])

  useEffect(() => {
    saveNumberSetting(BOTTOM_DOCK_HEIGHT_KEY, bottomDockHeight)
  }, [bottomDockHeight])

  useEffect(() => {
    saveBooleanSetting(BOTTOM_DOCK_COLLAPSED_KEY, bottomDockCollapsed)
  }, [bottomDockCollapsed])

  useEffect(() => {
    try {
      localStorage.setItem(PLANNING_SCOPE_KEY, planningScope)
    } catch {
      // ignore localStorage access issues
    }
  }, [planningScope])

  useEffect(() => {
    if (role !== 'affreteur') return
    setPlanningScope(current => current === 'principal' ? 'affretement' : current)
  }, [role])

  useEffect(() => {
    saveBooleanSetting(PLANNING_HEADER_COLLAPSED_KEY, planningHeaderCollapsed)
    window.dispatchEvent(new Event('nexora:planning-header-visibility-change'))
  }, [planningHeaderCollapsed])

  function buildGeneratedInlineEvents(ot: OT, rowId: string): GeneratedInlineEvent[] {
    if (!autoHabillage) return []
    const startISO = ot.date_chargement_prevue
    const endISO = ot.date_livraison_prevue ?? ot.date_chargement_prevue
    if (!startISO || !endISO) return []

    const start = new Date(startISO)
    const end = new Date(endISO)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return []

    const events: GeneratedInlineEvent[] = []
    const beforeStart = new Date(start.getTime() - 20 * 60000)
    events.push({
      id: `hlp-before-${ot.id}`,
      rowId,
      label: `HLP ${ot.reference}`,
      dateStart: toDateTimeFromDate(beforeStart),
      dateEnd: toDateTimeFromDate(start),
      color: INLINE_EVENT_COLORS.hlp,
      kind: 'hlp',
    })

    const afterEnd = new Date(end.getTime() + 15 * 60000)
    events.push({
      id: `maint-after-${ot.id}`,
      rowId,
      label: `Nettoyage ${ot.reference}`,
      dateStart: toDateTimeFromDate(end),
      dateEnd: toDateTimeFromDate(afterEnd),
      color: INLINE_EVENT_COLORS.maintenance,
      kind: 'maintenance',
    })

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
    if (autoPauseReglementaire && durationMinutes >= 6 * 60) {
      const pauseStart = new Date(start.getTime() + Math.floor(durationMinutes / 2) * 60000)
      const pauseEnd = new Date(pauseStart.getTime() + 45 * 60000)
      events.push({
        id: `pause-${ot.id}`,
        rowId,
        label: `Pause 45 min ${ot.reference}`,
        dateStart: toDateTimeFromDate(pauseStart),
        dateEnd: toDateTimeFromDate(pauseEnd),
        color: INLINE_EVENT_COLORS.repos,
        kind: 'repos',
      })
    }

    return events
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
    // ── Sélect OT canonique (schema stable depuis les migrations du 2026-03-30) ──
    const OT_SELECT = 'id, reference, statut, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, distance_km, donneur_ordre_id, chargement_site_id, livraison_site_id, groupage_id, groupage_fige, est_affretee, clients!ordres_transport_client_id_fkey(nom)'
    const SITE_SELECT = 'id, nom, adresse, entreprise_id, usage_type, horaires_ouverture, jours_ouverture, notes_livraison, latitude, longitude, created_at, updated_at'

    // Fenêtre glissante centrée sur la semaine affichée :
    //   • 7 jours en arrière  → couvre les OTs en cours / passés récents
    //   • 21 jours en avant   → couvre 3 semaines de planning à venir
    // Les brouillons sans date (pool) sont toujours inclus via .is.null.
    const winFrom = new Date(weekStart)
    winFrom.setDate(winFrom.getDate() - 7)
    const winTo = new Date(weekStart)
    winTo.setDate(winTo.getDate() + 21)
    const winFromISO = winFrom.toISOString().slice(0, 10)
    const winToISO   = winTo.toISOString().slice(0, 10)
    // Filtre : (chargement dans fenêtre ET livraison dans fenêtre) OU pas de date (pool)
    const otDateFilter = `and(date_chargement_prevue.gte.${winFromISO},date_chargement_prevue.lte.${winToISO}),date_chargement_prevue.is.null`

    // ── Toutes les requêtes en parallèle — 1 seul round-trip réseau ─────────
    const [otR, siteR, cR, vR, rR, clientR, aR] = await Promise.all([
      supabase
        .from('ordres_transport')
        .select(OT_SELECT)
        .or(otDateFilter)
        .order('date_chargement_prevue', { ascending: true, nullsFirst: false }),
      looseSupabase
        .from('sites_logistiques')
        .select(SITE_SELECT)
        .order('nom'),
      supabase.from('conducteurs').select('id, nom, prenom, statut').eq('statut', 'actif').order('nom'),
      supabase.from('vehicules').select('id, immatriculation, marque, modele, statut').neq('statut', 'hors_service').order('immatriculation'),
      supabase.from('remorques').select('id, immatriculation, type_remorque, statut').neq('statut', 'hors_service').order('immatriculation'),
      supabase.from('clients').select('id, nom, actif').eq('actif', true).order('nom'),
      supabase.from('affectations').select('id, conducteur_id, vehicule_id, remorque_id, actif').eq('actif', true),
    ])

    // ── OT : fallback minimal si la colonne est_affretee est manquante ───────
    let finalOtR = otR as { data: unknown[] | null; error: { message?: string } | null }
    if (otR.error) {
      const fallback = await supabase
        .from('ordres_transport')
        .select('id, reference, statut, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, distance_km, chargement_site_id, livraison_site_id, groupage_id, groupage_fige, clients!ordres_transport_client_id_fkey(nom)')
        .or(otDateFilter)
        .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
      if (!fallback.error) finalOtR = fallback as typeof finalOtR
    }

    // ── Traitement OTs ───────────────────────────────────────────────────────
    if (finalOtR.error) {
      setPool([])
      setGanttOTs([])
      setCancelledOTs([])
      setSelected(null)
    } else if (finalOtR.data) {
      type OtLoadRow = Omit<OT, 'client_nom'> & {
        clients: { nom: string } | { nom: string }[] | null
        distance_km?: number | null
        donneur_ordre_id?: string | null
        chargement_site_id?: string | null
        livraison_site_id?: string | null
        groupage_id?: string | null
        groupage_fige?: boolean | null
      }
      const ots: OT[] = (finalOtR.data as OtLoadRow[]).map(r => ({
        id: r.id, reference: r.reference, client_nom: (Array.isArray(r.clients) ? r.clients[0] : r.clients)?.nom ?? '-',
        date_chargement_prevue: r.date_chargement_prevue, date_livraison_prevue: r.date_livraison_prevue,
        type_transport: r.type_transport, nature_marchandise: r.nature_marchandise,
        statut: r.statut, conducteur_id: r.conducteur_id, vehicule_id: r.vehicule_id,
        remorque_id: r.remorque_id, prix_ht: r.prix_ht, statut_operationnel: r.statut_operationnel,
        distance_km: r.distance_km ?? null, donneur_ordre_id: r.donneur_ordre_id ?? null,
        chargement_site_id: r.chargement_site_id ?? null, livraison_site_id: r.livraison_site_id ?? null,
        groupage_id: r.groupage_id ?? null, groupage_fige: Boolean(r.groupage_fige),
        est_affretee: Boolean(r.est_affretee),
      }))
      const scopedPlanning = ots.filter(o => planningScope === 'affretement' ? o.est_affretee : !o.est_affretee)
      const cancelled = scopedPlanning.filter(o => o.statut === 'annule')
      const principalPlanning = scopedPlanning.filter(o => o.statut !== 'annule')
      const isDraftStatut = (ot: OT) => ot.statut === 'brouillon' || ot.statut === 'confirme'
      const hasAssignedResource = (ot: OT) => Boolean(ot.conducteur_id || ot.vehicule_id || ot.remorque_id)
      setCancelledOTs(cancelled)
      setPool(principalPlanning.filter(o => isDraftStatut(o) && !hasAssignedResource(o)))
      setGanttOTs(principalPlanning.filter(o => !isDraftStatut(o) || hasAssignedResource(o)))
      setSelected(current => current ? (scopedPlanning.find(ot => ot.id === current.id) ?? null) : current)
    }

    // ── Ressources ───────────────────────────────────────────────────────────
    if (cR.error) setConducteurs([])
    else if (cR.data) setConducteurs(cR.data)

    if (vR.error) setVehicules([])
    else if (vR.data) setVehicules(vR.data)

    if (rR.error) setRemorques([])
    else if (rR.data) setRemorques(rR.data)

    if (clientR.error) setClients([])
    else if (clientR.data) setClients(clientR.data)

    if (siteR.error) setLogisticSites([])
    else if (siteR.data) setLogisticSites(sortLogisticSites((siteR.data as SiteLoadRow[] ?? []).map(mapSiteLoadRow)))

    if (aR.error) setAffectations([])
    else if (aR.data) setAffectations(aR.data)
  }, [planningScope, weekStart])

  useEffect(() => { void loadAll() }, [loadAll])

  const realtimeReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const debouncedLoad = () => {
      if (realtimeReloadTimer.current) clearTimeout(realtimeReloadTimer.current)
      realtimeReloadTimer.current = setTimeout(() => { void loadAll() }, 2000)
    }

    const db = looseSupabase
    const channel = db
      .channel('planning-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordres_transport' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'etapes_mission' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historique_statuts' }, debouncedLoad)
      .subscribe()

    return () => {
      if (realtimeReloadTimer.current) clearTimeout(realtimeReloadTimer.current)
      void db.removeChannel(channel)
    }
  }, [loadAll])

  // â”€â”€ Assign modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // ── Edit modal (clic sur un bloc du planning) ─────────────────────────────────────────────

  function openSelected(ot: OT) {
    const enterpriseId = ot.donneur_ordre_id ?? ''
    setGroupageTargetId('')
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
    setEditSiteDrafts({
      chargement: makeEmptySiteDraft(enterpriseId),
      livraison: makeEmptySiteDraft(enterpriseId),
    })
  }
  function closeSelected() {
    setSelected(null)
    setEditDraft(null)
    setGroupageTargetId('')
    setEditSiteDrafts({
      chargement: makeEmptySiteDraft(),
      livraison: makeEmptySiteDraft(),
    })
  }

  function ensureGroupageEditable(ot: OT, actionLabel: string): boolean {
    if (!ot.groupage_fige) return true
    pushPlanningNotice(`${actionLabel} impossible: ce lot est fige. Defigez-le depuis le planning avant modification.`, 'error')
    return false
  }

  function setEditSiteDraft<K extends keyof SiteDraft>(kind: SiteKind, key: K, value: SiteDraft[K]) {
    setEditSiteDrafts(current => ({
      ...current,
      [kind]: {
        ...current[kind],
        [key]: value,
      },
    }))
  }

  function resetEditSiteDraft(kind: SiteKind, entrepriseId?: string) {
    setEditSiteDrafts(current => ({
      ...current,
      [kind]: makeEmptySiteDraft(entrepriseId ?? editDraft?.donneur_ordre_id ?? ''),
    }))
  }

  async function createOrSelectPlanningSite(kind: SiteKind) {
    if (!editDraft) return

    const draft = editSiteDrafts[kind]
    const entrepriseId = (draft.entreprise_id || editDraft.donneur_ordre_id).trim()
    const adresse = draft.adresse.trim()

    if (!entrepriseId) {
      pushPlanningNotice('Impossible d ajouter une adresse: selectionnez d abord le donneur d ordre.', 'error')
      return
    }

    if (!adresse) {
      pushPlanningNotice('Adresse manquante: saisissez une adresse ou posez un point GPS sur la carte.', 'error')
      return
    }

    const existing = logisticSites.find(site =>
      site.entreprise_id === entrepriseId && normalizeAddressValue(site.adresse) === normalizeAddressValue(adresse),
    )

    if (existing) {
      const nextUsageType = siteSupportsKind(existing, kind) ? existing.usage_type : 'mixte'
      let linkedSite = existing
      if (nextUsageType !== existing.usage_type) {
        linkedSite = await updateLogisticSite(existing.id, { usage_type: nextUsageType })
        setLogisticSites(current => sortLogisticSites(current.map(site => site.id === linkedSite.id ? linkedSite : site)))
      }
      setEditDraft(current => current ? {
        ...current,
        ...(kind === 'chargement'
          ? { chargement_site_id: linkedSite.id }
          : { livraison_site_id: linkedSite.id }),
      } : current)
      resetEditSiteDraft(kind, entrepriseId)
      pushPlanningNotice('Adresse existante detectee: site deja present en base et selectionne.')
      return
    }

    try {
      const companyName = clients.find(client => client.id === entrepriseId)?.nom ?? 'Entreprise'
      const defaultName = kind === 'chargement'
        ? `Chargement - ${companyName}`
        : `Livraison - ${companyName}`

      const created = await createLogisticSite({
        nom: draft.nom.trim() || defaultName,
        adresse,
        entreprise_id: entrepriseId,
        usage_type: draft.usage_type,
        horaires_ouverture: draft.horaires_ouverture.trim() || null,
        jours_ouverture: draft.jours_ouverture.trim() || null,
        notes_livraison: draft.notes_livraison.trim() || null,
        latitude: draft.latitude,
        longitude: draft.longitude,
      })

      setLogisticSites(current => sortLogisticSites([created, ...current.filter(site => site.id !== created.id)]))
      setEditDraft(current => current ? {
        ...current,
        ...(kind === 'chargement'
          ? { chargement_site_id: created.id }
          : { livraison_site_id: created.id }),
      } : current)
      resetEditSiteDraft(kind, entrepriseId)
      pushPlanningNotice('Nouveau lieu cree et selectionne dans la course.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Creation du site logistique impossible.'
      pushPlanningNotice(message, 'error')
    }
  }
  async function saveEdit() {
    if (!selected || !editDraft) return
    if (!ensureWriteAllowed('Mise a jour de course')) return
    if (!ensureGroupageEditable(selected, 'Mise a jour')) return
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

  function openAssign(ot: OT, resourceId?: string, dropDay?: string, dropTimeMin?: number, applyToGroupage = false) {
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
      date_chargement:baseDate, time_chargement:baseTime, date_livraison:endDate, time_livraison:endTime, applyToGroupage })
    closeSelected()
  }

  async function saveAssign() {
    if (!assignModal) return
    if (!ensureWriteAllowed('Affectation')) return
    if (!ensureGroupageEditable(assignModal.ot, 'Affectation')) return
    const targets = assignModal.applyToGroupage ? getGroupageMembersForOt(assignModal.ot) : [assignModal.ot]
    const otId = assignModal.ot.id
    setSaving(true)
    const plannedStartISO = toDateTimeISO(assignModal.date_chargement, assignModal.time_chargement)
    const plannedEndISO = toDateTimeISO(assignModal.date_livraison, assignModal.time_livraison)
    let lastAuditSummary: { message: string; hasBlocking: boolean } | null = null
    for (const target of targets) {
      const auditSummary = await buildComplianceAuditSummary({
        otId: target.id,
        conducteurId: assignModal.conducteur_id || null,
        startISO: plannedStartISO,
        endISO: plannedEndISO,
      })
      lastAuditSummary = auditSummary
      if (blockOnCompliance && auditSummary?.hasBlocking) {
        setSaving(false)
        const prefix = assignModal.applyToGroupage ? `Programmation du lot bloquee sur ${target.reference}.` : 'Affectation bloquee.'
        pushPlanningNotice(`${prefix} ${auditSummary.message}`, 'error')
        return
      }
    }

    const updatePayload = {
      statut: 'planifie',
      conducteur_id:          assignModal.conducteur_id  || null,
      vehicule_id:            assignModal.vehicule_id    || null,
      remorque_id:            assignModal.remorque_id    || null,
      date_chargement_prevue: plannedStartISO,
      date_livraison_prevue:  plannedEndISO,
    }
    const firstTry = assignModal.applyToGroupage
      ? await supabase
          .from('ordres_transport')
          .update(updatePayload)
          .in('id', targets.map(target => target.id))
      : await supabase
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
      const fallbackTry = assignModal.applyToGroupage
        ? await supabase
            .from('ordres_transport')
            .update(fallbackPayload)
            .in('id', targets.map(target => target.id))
        : await supabase
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
      const targetIds = new Set(targets.map(target => target.id))
      const upd = prev.filter(block => !block.otId || !targetIds.has(block.otId))
      if (upd.length !== prev.length) saveCustomBlocks(upd)
      return upd
    })
    setSaving(false); setAssignModal(null); loadAll()
    pushPlanningNotice(
      lastAuditSummary
        ? `${assignModal.applyToGroupage ? 'Lot programme.' : 'Affectation enregistree.'} ${lastAuditSummary.message}`
        : assignModal.applyToGroupage ? 'Lot programme.' : 'Affectation enregistree.',
      lastAuditSummary?.hasBlocking ? 'error' : 'success',
    )
  }

  function getScheduledBounds(ot: OT): { startISO: string; endISO: string } | null {
    const startISO = ot.date_chargement_prevue ?? ot.date_livraison_prevue
    const endISO = ot.date_livraison_prevue ?? ot.date_chargement_prevue
    if (!startISO || !endISO) return null
    return { startISO, endISO }
  }

  async function assignCourseToResourceWithoutTimelineMove(ot: OT, resourceId: string) {
    if (!ensureWriteAllowed('Affectation par glisser-deposer')) return
    if (!ensureGroupageEditable(ot, 'Affectation')) return

    const members = getGroupageMembersForOt(ot)
    for (const member of members) {
      const schedule = getScheduledBounds(member)
      if (!schedule) {
        openAssign(member, resourceId)
        pushPlanningNotice('Cette course doit etre reglee depuis sa fiche pour definir debut et fin avant positionnement sur le planning.', 'error')
        return
      }
    }

    setSavingOtId(ot.id)
    try {
      let lastAuditSummary: { message: string; hasBlocking: boolean } | null = null
      for (const member of members) {
        const schedule = getScheduledBounds(member)
        if (!schedule) continue
        const targetConducteurId = tab === 'conducteurs' ? resourceId : (member.conducteur_id ?? null)
        const auditSummary = await buildComplianceAuditSummary({
          otId: member.id,
          conducteurId: targetConducteurId,
          startISO: schedule.startISO,
          endISO: schedule.endISO,
        })
        lastAuditSummary = auditSummary
        if (blockOnCompliance && auditSummary?.hasBlocking) {
          pushPlanningNotice(`Affectation du lot bloquee sur ${member.reference}. ${auditSummary.message}`, 'error')
          return
        }
      }

      const updatePayload: Record<string, string> = { statut: 'planifie' }
      if (tab === 'conducteurs') updatePayload.conducteur_id = resourceId
      if (tab === 'camions') updatePayload.vehicule_id = resourceId
      if (tab === 'remorques') updatePayload.remorque_id = resourceId

      const result = await supabase
        .from('ordres_transport')
        .update(updatePayload)
        .in('id', members.map(member => member.id))

      if (result.error) {
        pushPlanningNotice(`Affectation impossible: ${result.error.message}`, 'error')
        return
      }

      setCustomBlocks(prev => {
        const memberIds = new Set(members.map(member => member.id))
        const upd = prev.filter(block => !block.otId || !memberIds.has(block.otId))
        if (upd.length !== prev.length) saveCustomBlocks(upd)
        return upd
      })

      await loadAll()
      pushPlanningNotice(
        members.length > 1
          ? (lastAuditSummary ? `Lot de ${members.length} courses deplace ensemble. ${lastAuditSummary.message}` : `Lot de ${members.length} courses deplace ensemble sans changer leurs dates.`)
          : (lastAuditSummary ? `Ressource mise a jour. ${lastAuditSummary.message}` : 'Ressource mise a jour sans changer les dates de la course.'),
        lastAuditSummary?.hasBlocking ? 'error' : 'success',
      )
    } finally {
      setSavingOtId(null)
    }
  }

  async function unassign(ot: OT) {
    if (!ensureWriteAllowed('Desaffectation')) return
    if (!ensureGroupageEditable(ot, 'Desaffectation')) return
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

  async function loadRelais() {
    setRelaisLoading(true)
    try {
      const res = await fetch('/.netlify/functions/v11-transport-relay')
      if (!res.ok) { setRelaisError('Erreur chargement relais.'); return }
      const body = await res.json() as { data?: TransportRelaisRecord[] }
      setRelaisList(body.data ?? [])
      setRelaisError(null)
    } catch {
      setRelaisError('Erreur reseau relais.')
    } finally {
      setRelaisLoading(false)
    }
  }

  async function loadRelaisDepotSites() {
    try {
      const res = await fetch('/.netlify/functions/v11-logistic-sites?est_depot_relais=true')
      if (!res.ok) return
      const body = await res.json() as { data?: { id: string; nom: string; ville: string | null; adresse: string }[] }
      setRelaisDepotSites(body.data ?? [])
    } catch { /* silencieux */ }
  }

  function openRelaisDepot(ot: OT, type: TypeRelais = 'depot_marchandise') {
    if (!ensureWriteAllowed('Depot relais')) return
    setRelaisDepotForm({
      type_relais: type,
      site_id: '',
      lieu_nom: '',
      lieu_adresse: '',
      date_depot: new Date().toISOString().slice(0, 16),
      conducteur_depose_id: ot.conducteur_id ?? '',
      vehicule_depose_id: ot.vehicule_id ?? '',
      remorque_depose_id: ot.remorque_id ?? '',
      notes: '',
    })
    void loadRelaisDepotSites()
    setRelaisModal({ mode: type === 'relais_conducteur' ? 'relais_conducteur' : 'depot', ot, relais: null })
    setContextMenu(null)
  }

  function openRelaisAssign(relais: TransportRelaisRecord) {
    setRelaisAssignForm({
      conducteur_reprise_id: '',
      vehicule_reprise_id: '',
      remorque_reprise_id: '',
      date_reprise_prevue: '',
      notes: '',
    })
    setRelaisModal({ mode: 'assign', ot: null, relais })
  }

  async function submitRelaisDepot(e: React.FormEvent) {
    e.preventDefault()
    if (!relaisModal.ot) return
    const form = relaisDepotForm
    const lieuNom = form.site_id
      ? (relaisDepotSites.find(s => s.id === form.site_id)?.nom ?? form.lieu_nom.trim())
      : form.lieu_nom.trim()
    if (!lieuNom) return
    setRelaisSaving(true)
    try {
      const res = await fetch('/.netlify/functions/v11-transport-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ot_id: relaisModal.ot.id,
          type_relais: form.type_relais,
          site_id: form.site_id || null,
          lieu_nom: lieuNom,
          lieu_adresse: form.lieu_adresse.trim() || null,
          conducteur_depose_id: form.conducteur_depose_id || null,
          vehicule_depose_id: form.vehicule_depose_id || null,
          remorque_depose_id: form.remorque_depose_id || null,
          date_depot: form.date_depot || new Date().toISOString(),
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) { pushPlanningNotice('Erreur creation relais.', 'error'); return }
      setRelaisModal({ mode: null, ot: null, relais: null })
      void loadRelais()
      setBottomDockTab('relais')
    } catch {
      pushPlanningNotice('Erreur reseau.', 'error')
    } finally {
      setRelaisSaving(false)
    }
  }

  async function submitRelaisAssign(e: React.FormEvent) {
    e.preventDefault()
    if (!relaisModal.relais) return
    const form = relaisAssignForm
    setRelaisSaving(true)
    try {
      const res = await fetch(`/.netlify/functions/v11-transport-relay?relais_id=${relaisModal.relais.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conducteur_reprise_id: form.conducteur_reprise_id || null,
          vehicule_reprise_id: form.vehicule_reprise_id || null,
          remorque_reprise_id: form.remorque_reprise_id || null,
          date_reprise_prevue: form.date_reprise_prevue || null,
          notes: form.notes.trim() || null,
        }),
      })
      if (!res.ok) { pushPlanningNotice('Erreur affectation.', 'error'); return }
      setRelaisModal({ mode: null, ot: null, relais: null })
      void loadRelais()
    } catch {
      pushPlanningNotice('Erreur reseau.', 'error')
    } finally {
      setRelaisSaving(false)
    }
  }

  async function updateRelaisStatut(relaisId: string, statut: TransportRelaisStatut) {
    try {
      await fetch(`/.netlify/functions/v11-transport-relay?relais_id=${relaisId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      void loadRelais()
    } catch { /* silencieux */ }
  }

  async function moveBlock(ot: OT, resourceId: string, newStartISO: string, newEndISO: string, notifySuccess = true) {
    if (!ensureWriteAllowed('Deplacement de course')) return
    if (!ensureGroupageEditable(ot, 'Deplacement')) return
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

  function findOverlapTarget(rowId: string, startISO: string, endISO: string, movingOtIds: string[]): OT | null {
    const start = new Date(startISO).getTime()
    const end = Math.max(start + 15 * 60 * 1000, new Date(endISO).getTime())
    return rowOTs(rowId)
      .filter(item => !movingOtIds.includes(item.id))
      .find(item => {
        const interval = otInterval(item)
        return Math.min(end, interval.end) > Math.max(start, interval.start)
      }) ?? null
  }

  async function normalizeSingletonGroupage(groupId: string) {
    const membersRes = await supabase
      .from('ordres_transport')
      .select('id')
      .eq('groupage_id', groupId)

    if ((membersRes.data?.length ?? 0) <= 1) {
      await supabase
        .from('ordres_transport')
        .update({ groupage_id: null, groupage_fige: false })
        .eq('groupage_id', groupId)
    }
  }

  async function linkCoursesToGroupage(source: OT, target: OT) {
    if (!ensureWriteAllowed('Liaison de groupage')) return false
    if (source.groupage_fige || target.groupage_fige) {
      pushPlanningNotice('Groupage impossible: un des lots est fige.', 'error')
      return false
    }

    const previousSourceGroupId = source.groupage_id
    const previousTargetGroupId = target.groupage_id
    const nextGroupId = source.groupage_id ?? target.groupage_id ?? crypto.randomUUID()

    const result = await supabase
      .from('ordres_transport')
      .update({ groupage_id: nextGroupId, groupage_fige: false, type_transport: 'groupage' })
      .in('id', [source.id, target.id])

    if (result.error) {
      pushPlanningNotice(`Groupage impossible: ${result.error.message}`, 'error')
      return false
    }

    if (previousSourceGroupId && previousSourceGroupId !== nextGroupId) await normalizeSingletonGroupage(previousSourceGroupId)
    if (previousTargetGroupId && previousTargetGroupId !== nextGroupId) await normalizeSingletonGroupage(previousTargetGroupId)
    return nextGroupId
  }

  async function applyConflictGroupage(conflict: RowConflict, freezeGroupage: boolean) {
    const actionLabel = freezeGroupage ? 'Validation de lot' : 'Proposition de groupage'
    if (!ensureGroupageEditable(conflict.first, actionLabel)) return
    if (!ensureGroupageEditable(conflict.second, actionLabel)) return

    const actionKey = `${conflict.first.id}:${conflict.second.id}:${freezeGroupage ? 'freeze' : 'link'}`
    setConflictActionKey(actionKey)
    try {
      const alreadyGrouped = sharesSameGroupage(conflict.first, conflict.second)
      const alreadyFrozen = alreadyGrouped && (conflict.first.groupage_fige || conflict.second.groupage_fige)

      if (alreadyGrouped && !freezeGroupage) {
        pushPlanningNotice('Ces courses sont deja dans le meme groupage.')
        return
      }

      if (alreadyFrozen && freezeGroupage) {
        pushPlanningNotice('Ce lot est deja verrouille.')
        return
      }

      let nextGroupId = alreadyGrouped ? conflict.first.groupage_id : null
      if (!nextGroupId) {
        const linkedGroupId = await linkCoursesToGroupage(conflict.first, conflict.second)
        if (!linkedGroupId) return
        nextGroupId = linkedGroupId
      }

      if (freezeGroupage && nextGroupId) {
        const freezeResult = await supabase
          .from('ordres_transport')
          .update({ groupage_fige: true })
          .eq('groupage_id', nextGroupId)

        if (freezeResult.error) {
          pushPlanningNotice(`Verrouillage impossible: ${freezeResult.error.message}`, 'error')
          return
        }
      }

      await loadAll()
      pushPlanningNotice(
        freezeGroupage
          ? `Lot verrouille pour ${conflict.first.reference} et ${conflict.second.reference}.`
          : `Groupage propose entre ${conflict.first.reference} et ${conflict.second.reference}.`,
      )
    } finally {
      setConflictActionKey(current => (current === actionKey ? null : current))
    }
  }

  async function unlinkCourseFromGroupage(ot: OT) {
    if (!ensureWriteAllowed('Deliaison de groupage')) return
    if (!ot.groupage_id) return
    if (ot.groupage_fige) {
      pushPlanningNotice('Ce lot est fige. Defigez-le avant de delier une course.', 'error')
      return
    }

    const previousGroupId = ot.groupage_id
    const result = await supabase
      .from('ordres_transport')
      .update({ groupage_id: null, groupage_fige: false })
      .eq('id', ot.id)

    if (result.error) {
      pushPlanningNotice(`Deliaison impossible: ${result.error.message}`, 'error')
      return
    }

    await normalizeSingletonGroupage(previousGroupId)
    await loadAll()
    pushPlanningNotice('Course deliee du groupage.')
  }

  async function toggleGroupageFreeze(ot: OT, nextFrozen: boolean) {
    if (!ot.groupage_id) return
    if (!ensureWriteAllowed(nextFrozen ? 'Figeage de groupage' : 'Defigeage de groupage')) return

    const result = await supabase
      .from('ordres_transport')
      .update({ groupage_fige: nextFrozen })
      .eq('groupage_id', ot.groupage_id)

    if (result.error) {
      pushPlanningNotice(`Mise a jour du lot impossible: ${result.error.message}`, 'error')
      return
    }

    await loadAll()
    pushPlanningNotice(nextFrozen ? 'Groupage fige: modifications bloquees.' : 'Groupage degele: modifications autorisees.')
  }

  async function toggleSelectedGroupageFreeze(nextFrozen: boolean) {
    if (!selected) return
    await toggleGroupageFreeze(selected, nextFrozen)
  }

  async function linkSelectedToGroupage() {
    if (!selected || !groupageTargetId) return
    const target = [...pool, ...ganttOTs].find(ot => ot.id === groupageTargetId)
    if (!target) {
      pushPlanningNotice('Course cible introuvable pour le groupage.', 'error')
      return
    }
    if (!ensureGroupageEditable(selected, 'Liaison de groupage')) return
    if (!ensureGroupageEditable(target, 'Liaison de groupage')) return

    const linked = await linkCoursesToGroupage(selected, target)
    if (!linked) return

    setGroupageTargetId('')
    await loadAll()
    pushPlanningNotice(`Course liee au groupage avec ${target.reference}.`)
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
      if (activeDrag.kind === 'pool') {
        if (activeDrag.ot) {
          const currentSchedule = getScheduledBounds(activeDrag.ot)
          const movingOtIds = getGroupageMemberIds(activeDrag.ot)
          if (!currentSchedule) {
            openAssign(activeDrag.ot, rowId)
            pushPlanningNotice('Reglez les dates de la course depuis sa fiche avant de la placer sur le planning.', 'error')
            setDrag(null)
            return
          }
          if (!getWeekBlockMetrics(activeDrag.ot, weekStart)) {
            pushPlanningNotice('Cette course n\'est pas planifiée cette semaine. Naviguez vers sa période pour l\'assigner.', 'error')
            setDrag(null)
            return
          }
          const overlapTarget = findOverlapTarget(rowId, currentSchedule.startISO, currentSchedule.endISO, movingOtIds)
          if (overlapTarget) {
            const shouldCreateGroupage = window.confirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
            if (shouldCreateGroupage) {
              const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
              if (linked) {
                await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
                pushPlanningNotice(`Groupage cree avec ${overlapTarget.reference}.`)
                setDrag(null)
                return
              }
            }
          }
          await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
        }
      } else if (activeDrag.kind === 'block' && activeDrag.ot) {
        const currentSchedule = getScheduledBounds(activeDrag.ot)
        const movingOtIds = getGroupageMemberIds(activeDrag.ot)
        if (!currentSchedule) {
          openSelected(activeDrag.ot)
          pushPlanningNotice('Pour changer la position sur la timeline, modifiez les dates et heures depuis la fiche course.', 'error')
          setDrag(null)
          return
        }
        const overlapTarget = findOverlapTarget(rowId, currentSchedule.startISO, currentSchedule.endISO, movingOtIds)
        if (overlapTarget) {
          const shouldCreateGroupage = window.confirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
          if (shouldCreateGroupage) {
            const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
            if (linked) {
              await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
              if (activeDrag.customBlockId) {
                const upd = customBlocks.filter(b => b.id !== activeDrag.customBlockId)
                if (upd.length !== customBlocks.length) { setCustomBlocks(upd); saveCustomBlocks(upd) }
              }
              pushPlanningNotice(`Groupage cree avec ${overlapTarget.reference}.`)
              setDrag(null)
              return
            }
          }
        }
        await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
        if (activeDrag.customBlockId) {
          const upd = customBlocks.filter(b => b.id !== activeDrag.customBlockId)
          if (upd.length !== customBlocks.length) { setCustomBlocks(upd); saveCustomBlocks(upd) }
        }
      }
    } else {
      if (activeDrag.kind === 'pool') {
        if (activeDrag.ot) {
          const currentSchedule = getScheduledBounds(activeDrag.ot)
          const movingOtIds = getGroupageMemberIds(activeDrag.ot)
          if (!currentSchedule) {
            openAssign(activeDrag.ot, rowId)
            pushPlanningNotice('Reglez les dates de la course depuis sa fiche avant de la placer sur le planning.', 'error')
            setDrag(null)
            return
          }
          if (!getDayBlockMetrics(activeDrag.ot.date_chargement_prevue, activeDrag.ot.date_livraison_prevue, selectedDay)) {
            pushPlanningNotice('Cette course n\'est pas planifiée ce jour. Naviguez vers son jour pour l\'assigner.', 'error')
            setDrag(null)
            return
          }
          const overlapTarget = findOverlapTarget(rowId, currentSchedule.startISO, currentSchedule.endISO, movingOtIds)
          if (overlapTarget) {
            const shouldCreateGroupage = window.confirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
            if (shouldCreateGroupage) {
              const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
              if (linked) {
                await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
                pushPlanningNotice(`Groupage cree avec ${overlapTarget.reference}.`)
                setDrag(null)
                return
              }
            }
          }
          await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
        }
      } else if (activeDrag.kind === 'block' && activeDrag.ot) {
        const currentSchedule = getScheduledBounds(activeDrag.ot)
        const movingOtIds = getGroupageMemberIds(activeDrag.ot)
        if (!currentSchedule) {
          openSelected(activeDrag.ot)
          pushPlanningNotice('Pour changer la position sur la timeline, modifiez les dates et heures depuis la fiche course.', 'error')
          setDrag(null)
          return
        }
        const overlapTarget = findOverlapTarget(rowId, currentSchedule.startISO, currentSchedule.endISO, movingOtIds)
        if (overlapTarget) {
          const shouldCreateGroupage = window.confirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
          if (shouldCreateGroupage) {
            const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
            if (linked) {
              await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
              if (activeDrag.customBlockId) {
                const upd = customBlocks.filter(b => b.id !== activeDrag.customBlockId)
                if (upd.length !== customBlocks.length) { setCustomBlocks(upd); saveCustomBlocks(upd) }
              }
              pushPlanningNotice(`Groupage cree avec ${overlapTarget.reference}.`)
              setDrag(null)
              return
            }
          }
        }
        await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
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

  function openPlanningCreationModal(options?: { rowId?: string; dateStart?: string; type?: PlanningInlineType }) {
    const dateStart = options?.dateStart ?? (viewMode === 'jour' ? `${selectedDay}T08:00` : toISO(weekStart))
    const defaultDay = dateStart.includes('T') ? dateStart.slice(0, 10) : dateStart
    const defaultTime = dateStart.includes('T') ? dateStart.slice(11, 16) : '08:00'
    const resolvedRowId = options?.rowId ?? orderedRows.find(row => !row.isAffretementAsset)?.id ?? orderedRows[0]?.id ?? ''
    setEditingCustomBlockId(null)
    setAddBlockFor({ rowId: resolvedRowId, dateStart })
    setNewBlockLabel('')
    setNewBlockType(options?.type ?? 'hlp')
    setNewBlockDurationHours('10')
    setNewBlockDurationMinutes('00')
    setNewBlockClientId(clients[0]?.id ?? '')
    setNewBlockDonneurOrdreId(clients[0]?.id ?? '')
    setNewBlockReferenceCourse(generatePlanningCourseReference())
    setNewBlockChargementSiteId('')
    setNewBlockLivraisonSiteId('')
    setNewBlockDistanceKm('')
    setNewBlockDateChargement(defaultDay)
    setNewBlockTimeChargement(defaultTime)
    setNewBlockDateLivraison(defaultDay)
    setNewBlockTimeLivraison('18:00')
  }

  function openPlanningBlockEditor(block: CustomBlock) {
    const startDate = new Date(block.dateStart)
    const endDate = new Date(block.dateEnd)
    const durationMinutes = Math.max(15, Math.round((endDate.getTime() - startDate.getTime()) / 60000))
    setEditingCustomBlockId(block.id)
    setAddBlockFor({ rowId: block.rowId, dateStart: block.dateStart })
    setNewBlockLabel(block.label)
    setNewBlockType(block.kind ?? 'hlp')
    setNewBlockDurationHours(String(Math.floor(durationMinutes / 60)))
    setNewBlockDurationMinutes(String(durationMinutes % 60).padStart(2, '0'))
    setNewBlockDateChargement(block.dateStart.slice(0, 10))
    setNewBlockTimeChargement(block.dateStart.slice(11, 16))
    setNewBlockDateLivraison(block.dateEnd.slice(0, 10))
    setNewBlockTimeLivraison(block.dateEnd.slice(11, 16))
  }

  function getPlanningEventDurationMinutes(): number {
    const hours = Math.max(0, Number.parseInt(newBlockDurationHours, 10) || 0)
    const minutesRaw = Number.parseInt(newBlockDurationMinutes, 10) || 0
    const minutes = Math.min(59, Math.max(0, minutesRaw))
    return Math.max(15, hours * 60 + minutes)
  }

  function setPlanningEventDurationParts(durationMinutes: number) {
    const safeDuration = Math.max(15, durationMinutes)
    setNewBlockDurationHours(String(Math.floor(safeDuration / 60)))
    setNewBlockDurationMinutes(String(safeDuration % 60).padStart(2, '0'))
  }

  function computePlanningEventEndISO(startISO: string, durationMinutes: number): string {
    return toDateTimeFromDate(new Date(new Date(startISO).getTime() + durationMinutes * 60000))
  }

  function setPlanningEventEnd(endISO: string) {
    setNewBlockDateLivraison(endISO.slice(0, 10))
    setNewBlockTimeLivraison(endISO.slice(11, 16))
  }

  function setPlanningEventStart(startISO: string) {
    setNewBlockDateChargement(startISO.slice(0, 10))
    setNewBlockTimeChargement(startISO.slice(11, 16))
    setPlanningEventEnd(computePlanningEventEndISO(startISO, getPlanningEventDurationMinutes()))
  }

  function setPlanningEventDurationAndSync(hours: string, minutes: string) {
    const parsedHours = Math.max(0, Number.parseInt(hours, 10) || 0)
    const parsedMinutes = Math.min(59, Math.max(0, Number.parseInt(minutes, 10) || 0))
    const nextDuration = Math.max(15, parsedHours * 60 + parsedMinutes)
    setPlanningEventDurationParts(nextDuration)
    const startISO = toDateTimeISO(newBlockDateChargement, newBlockTimeChargement)
    setPlanningEventEnd(computePlanningEventEndISO(startISO, nextDuration))
  }

  function setPlanningEventEndAndSync(endISO: string) {
    const startISO = toDateTimeISO(newBlockDateChargement, newBlockTimeChargement)
    const durationMinutes = Math.max(15, Math.round((new Date(endISO).getTime() - new Date(startISO).getTime()) / 60000))
    setPlanningEventDurationParts(durationMinutes)
    setPlanningEventEnd(computePlanningEventEndISO(startISO, durationMinutes))
  }

  function openPlanningEventNearCourse(rowId: string, ot: OT, type: Exclude<PlanningInlineType, 'course'>) {
    const defaultDuration = type === 'repos' ? 45 : 60
    const interval = otInterval(ot)
    const anchor = type === 'hlp' ? new Date(interval.start - defaultDuration * 60000) : new Date(interval.end)
    const startISO = toDateTimeFromDate(anchor)
    openPlanningCreationModal({ rowId, dateStart: startISO, type })
    setPlanningEventDurationParts(defaultDuration)
    setPlanningEventStart(startISO)
    setNewBlockLabel(`${INLINE_EVENT_LABELS[type]} ${ot.reference}`)
  }

  const nearestPlanningCourseSuggestion = (() => {
    if (!addBlockFor || newBlockType === 'course' || !addBlockFor.rowId) return null

    const startISO = toDateTimeISO(newBlockDateChargement, newBlockTimeChargement)
    const startMs = toTimeValue(startISO, newBlockDateChargement)
    const durationMs = getPlanningEventDurationMinutes() * 60000
    const rowCourses = rowOTs(addBlockFor.rowId)
      .map(ot => ({ ot, ...otInterval(ot) }))
      .filter(item => Number.isFinite(item.start) && Number.isFinite(item.end))

    if (rowCourses.length === 0) return null

    const nearest = rowCourses.reduce((best, current) => {
      const bestGap = Math.min(Math.abs(startMs - best.start), Math.abs(startMs - best.end))
      const currentGap = Math.min(Math.abs(startMs - current.start), Math.abs(startMs - current.end))
      return currentGap < bestGap ? current : best
    })

    const beforeStartISO = toDateTimeFromDate(new Date(nearest.start - durationMs))
    const afterStartISO = toDateTimeFromDate(new Date(nearest.end))
    const preferredMode = newBlockType === 'hlp' ? 'before' : 'after'

    return {
      ot: nearest.ot,
      beforeStartISO,
      afterStartISO,
      beforeLabel: `${isoToDate(beforeStartISO)} ${isoToTime(beforeStartISO)}`,
      afterLabel: `${isoToDate(afterStartISO)} ${isoToTime(afterStartISO)}`,
      preferredMode,
    }
  })()

  function resolveRowAssignment(rowId: string): Pick<AssignForm, 'conducteur_id' | 'vehicule_id' | 'remorque_id'> {
    const row = allRows.find(item => item.id === rowId)
    if (!row || row.isCustom || row.isAffretementAsset) return { conducteur_id: '', vehicule_id: '', remorque_id: '' }
    if (tab === 'conducteurs') return { conducteur_id: rowId, vehicule_id: '', remorque_id: '' }
    if (tab === 'camions') return { conducteur_id: '', vehicule_id: rowId, remorque_id: '' }
    return { conducteur_id: '', vehicule_id: '', remorque_id: rowId }
  }

  async function addCustomBlock() {
    if (!addBlockFor || !newBlockLabel.trim()) return
    const startISO = toDateTimeISO(newBlockDateChargement, newBlockTimeChargement)
    const startDate = new Date(startISO)
    const safeStart = Number.isNaN(startDate.getTime()) ? new Date(`${toISO(new Date())}T08:00:00`) : startDate
    const durationMinutes = getPlanningEventDurationMinutes()
    const endDate = new Date(safeStart.getTime() + durationMinutes * 60000)

    if (newBlockType === 'course') {
      if (!ensureWriteAllowed('Creation de course depuis planning')) return
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
        setEditingCustomBlockId(null)
        setNewBlockDistanceKm('')
        setNewBlockDurationMinutes('00')
        await loadAll()
        pushPlanningNotice('Course creee depuis le planning.')
      } finally {
        setCreatingInlineEvent(false)
      }
      return
    }

    const nextBlock: CustomBlock = {
      id: editingCustomBlockId ?? uid(), rowId:addBlockFor.rowId, label:newBlockLabel.trim(),
      dateStart: toDateTimeFromDate(safeStart),
      dateEnd:   toDateTimeFromDate(endDate),
      color: INLINE_EVENT_COLORS[newBlockType],
      kind: newBlockType,
    }
    const upd = editingCustomBlockId
      ? customBlocks.map(block => block.id === editingCustomBlockId ? { ...block, ...nextBlock, otId: block.otId } : block)
      : [...customBlocks, nextBlock]
    setCustomBlocks(upd); saveCustomBlocks(upd)
    setNewBlockLabel(''); setAddBlockFor(null); setEditingCustomBlockId(null); setNewBlockDurationMinutes('00')
    pushPlanningNotice(`${INLINE_EVENT_LABELS[newBlockType]} ${editingCustomBlockId ? 'mis a jour' : 'ajoute'} sur le planning.`)
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
          if (sharesSameGroupage(segments[i].ot, segments[j].ot)) continue
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

  const resourceLoadRows = (() => {
    const rangeStart = viewMode === 'semaine'
      ? new Date(`${toISO(weekStart)}T00:00:00`).getTime()
      : new Date(`${selectedDay}T00:00:00`).getTime()
    const rangeEnd = viewMode === 'semaine'
      ? new Date(`${toISO(addDays(weekStart, 6))}T23:59:59`).getTime()
      : new Date(`${selectedDay}T23:59:59`).getTime()

    return visibleRows
      .filter(row => !row.isCustom)
      .map(row => {
        const scopedOts = rowOTs(row.id).filter(ot => {
          const interval = otInterval(ot)
          return interval.end >= rangeStart && interval.start <= rangeEnd
        })
        const plannedMinutes = scopedOts.reduce((sum, ot) => {
          const interval = otInterval(ot)
          return sum + Math.max(15, Math.round((interval.end - interval.start) / 60000))
        }, 0)
        return {
          rowId: row.id,
          label: row.primary,
          missionCount: scopedOts.length,
          plannedMinutes,
          conflictCount: rowConflictCountById[row.id] ?? 0,
          hasLate: scopedOts.some(ot => ot.statut !== 'facture' && ot.date_livraison_prevue && ot.date_livraison_prevue.slice(0, 10) < today),
        }
      })
      .sort((left, right) => {
        if (right.missionCount !== left.missionCount) return right.missionCount - left.missionCount
        return right.plannedMinutes - left.plannedMinutes
      })
  })()

  const bottomDockMissions = useMemo(() => {
    const sorted = [...ganttOTs]
      .filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter)
      .sort((left, right) => {
      const leftTs = new Date(left.date_chargement_prevue ?? left.date_livraison_prevue ?? 0).getTime()
      const rightTs = new Date(right.date_chargement_prevue ?? right.date_livraison_prevue ?? 0).getTime()
      return leftTs - rightTs
    })
    return sorted.slice(0, 80)
  }, [centerFilter, ganttOTs])

  const bottomDockNonProgrammees = useMemo(
    () => pool.filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter),
    [centerFilter, pool],
  )

  const bottomDockGroupages = useMemo(() => {
    const allPlanning = [...pool, ...ganttOTs]
      .filter(ot => ot.groupage_id)
      .filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter)
    const byGroup = new Map<string, OT[]>()
    for (const ot of allPlanning) {
      if (!ot.groupage_id) continue
      byGroup.set(ot.groupage_id, [...(byGroup.get(ot.groupage_id) ?? []), ot])
    }
    return Array.from(byGroup.entries())
      .map(([groupId, members]) => ({
        groupId,
        members: members.sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR')),
        frozen: members.some(member => member.groupage_fige),
      }))
      .sort((left, right) => right.members.length - left.members.length)
  }, [centerFilter, ganttOTs, pool])

  const groupageMembersByGroupId = useMemo(() => {
    const next = new Map<string, OT[]>()
    for (const ot of [...pool, ...ganttOTs, ...cancelledOTs]) {
      if (!ot.groupage_id) continue
      next.set(ot.groupage_id, [...(next.get(ot.groupage_id) ?? []), ot])
    }
    for (const [groupId, members] of next.entries()) {
      next.set(groupId, [...members].sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR')))
    }
    return next
  }, [cancelledOTs, ganttOTs, pool])

  const selectedGroupMembers = useMemo(() => {
    if (!selected?.groupage_id) return []
    return [...pool, ...ganttOTs, ...cancelledOTs]
      .filter(ot => ot.groupage_id === selected.groupage_id)
      .sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR'))
  }, [cancelledOTs, ganttOTs, pool, selected?.groupage_id])

  const assignGroupMembers = useMemo(() => {
    if (!assignModal?.ot) return []
    if (!assignModal.ot.groupage_id) return [assignModal.ot]
    return groupageMembersByGroupId.get(assignModal.ot.groupage_id) ?? [assignModal.ot]
  }, [assignModal, groupageMembersByGroupId])

  const planningGroupageCandidates = useMemo(() => {
    if (!selected) return []
    return [...pool, ...ganttOTs]
      .filter(ot => ot.id !== selected.id)
      .filter(ot => planningScope === 'affretement' ? ot.est_affretee : !ot.est_affretee)
      .filter(ot => !ot.groupage_fige)
      .sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR'))
  }, [ganttOTs, planningScope, pool, selected])

  const bottomDockAnnulees = useMemo(
    () => cancelledOTs.filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter),
    [cancelledOTs, centerFilter],
  )

  const bottomDockConflicts = useMemo(() => {
    const rows = Object.entries(rowConflictPairsById)
      .filter(([, pairs]) => pairs.length > 0)
      .map(([rowId, pairs]) => ({
        rowId,
        rowLabel: orderedRows.find(row => row.id === rowId)?.primary ?? rowId,
        pairs,
      }))
    return rows
  }, [orderedRows, rowConflictPairsById])

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
    if (centerFilter) list = list.filter(ot => ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter)
    if (poolSearch) {
      const q = poolSearch.toLowerCase()
      list = list.filter(o => o.reference.toLowerCase().includes(q) || o.client_nom.toLowerCase().includes(q))
    }
    if (filterType) list = list.filter(o => o.type_transport === filterType)
    if (filterClient) list = list.filter(o => o.client_nom === filterClient)
    return list
  }, [pool, customOTIds, centerFilter, poolSearch, filterType, filterClient])

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

  function getGroupageMembersForOt(ot: OT): OT[] {
    if (!ot.groupage_id) return [ot]
    return groupageMembersByGroupId.get(ot.groupage_id) ?? [ot]
  }

  function getGroupageMemberIds(ot: OT): string[] {
    return getGroupageMembersForOt(ot).map(member => member.id)
  }

  function getGroupageBubbleLabel(ot: OT): string | null {
    if (!ot.groupage_id) return null
    const members = getGroupageMembersForOt(ot)
    return members.length > 1 ? `LOT ${members.length}` : 'LOT'
  }

  function sharesSameGroupage(first: OT, second: OT): boolean {
    return Boolean(first.groupage_id && first.groupage_id === second.groupage_id)
  }

  function buildFrozenGroupageOverlays(ots: OT[]): Array<{ groupId: string; leftPct: number; widthPct: number; label: string; references: string }> {
    const byGroup = new Map<string, OT[]>()
    for (const ot of ots) {
      if (!ot.groupage_id || !ot.groupage_fige) continue
      byGroup.set(ot.groupage_id, [...(byGroup.get(ot.groupage_id) ?? []), ot])
    }

    const overlays: Array<{ groupId: string; leftPct: number; widthPct: number; label: string; references: string }> = []
    for (const [groupId, members] of byGroup.entries()) {
      const visibleMembers = members
        .map(member => ({
          member,
          metrics: viewMode === 'semaine'
            ? getWeekBlockMetrics(member, weekStart)
            : getDayBlockMetrics(member.date_chargement_prevue, member.date_livraison_prevue, selectedDay),
        }))
        .filter((item): item is { member: OT; metrics: BlockMetrics } => Boolean(item.metrics))

      if (visibleMembers.length < 2) continue

      const leftPct = Math.min(...visibleMembers.map(item => item.metrics.leftPct))
      const rightPct = Math.max(...visibleMembers.map(item => item.metrics.leftPct + item.metrics.widthPct))
      overlays.push({
        groupId,
        leftPct,
        widthPct: rightPct - leftPct,
        label: `Lot verrouille · ${visibleMembers.length} courses`,
        references: visibleMembers.map(item => item.member.reference).join(' · '),
      })
    }

    return overlays
  }

  function buildGroupedBlockLayout(ots: OT[]): Record<string, { top: number; height: number; compact: boolean }> {
    const layout: Record<string, { top: number; height: number; compact: boolean }> = {}
    const byGroup = new Map<string, OT[]>()

    for (const ot of ots) {
      if (!ot.groupage_id) continue
      byGroup.set(ot.groupage_id, [...(byGroup.get(ot.groupage_id) ?? []), ot])
    }

    for (const members of byGroup.values()) {
      if (members.length < 2) continue
      const sortedMembers = [...members].sort((left, right) => {
        const leftInterval = otInterval(left)
        const rightInterval = otInterval(right)
        return leftInterval.start - rightInterval.start
      })
      const laneCount = sortedMembers.length
      const usableHeight = 42
      const gap = 2
      const blockHeight = Math.max(10, Math.floor((usableHeight - gap * (laneCount - 1)) / laneCount))
      const compact = blockHeight <= 18

      sortedMembers.forEach((member, index) => {
        layout[member.id] = {
          top: 10 + index * (blockHeight + gap),
          height: blockHeight,
          compact,
        }
      })
    }

    return layout
  }

  function buildGroupageCards(ots: OT[]): Array<{
    groupId: string
    leftPct: number
    widthPct: number
    members: OT[]
    frozen: boolean
  }> {
    const byGroup = new Map<string, OT[]>()
    for (const ot of ots) {
      if (!ot.groupage_id) continue
      byGroup.set(ot.groupage_id, [...(byGroup.get(ot.groupage_id) ?? []), ot])
    }

    const cards: Array<{
      groupId: string
      leftPct: number
      widthPct: number
      members: OT[]
      frozen: boolean
    }> = []

    for (const [groupId, members] of byGroup.entries()) {
      if (members.length < 2) continue

      const visibleMembers = members
        .map(member => ({
          member,
          metrics: viewMode === 'semaine'
            ? getWeekBlockMetrics(member, weekStart)
            : getDayBlockMetrics(member.date_chargement_prevue, member.date_livraison_prevue, selectedDay),
        }))
        .filter((item): item is { member: OT; metrics: BlockMetrics } => Boolean(item.metrics))

      if (visibleMembers.length < 2) continue

      const leftPct = Math.min(...visibleMembers.map(item => item.metrics.leftPct))
      const rightPct = Math.max(...visibleMembers.map(item => item.metrics.leftPct + item.metrics.widthPct))
      const sortedMembers = [...visibleMembers]
        .sort((left, right) => otInterval(left.member).start - otInterval(right.member).start)
        .map(item => item.member)

      cards.push({
        groupId,
        leftPct,
        widthPct: rightPct - leftPct,
        members: sortedMembers,
        frozen: sortedMembers.some(member => member.groupage_fige),
      })
    }

    return cards
  }

  function rowOTs(resourceId: string): OT[] {
    return ganttOTs.filter(ot => {
      const matchResource = resolveRowId(ot) === resourceId && !customOTIds.has(ot.id)
      if (!matchResource) return false
      if (!centerFilter) return true
      return ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter
    })
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

  const unresourced = ganttOTs
    .filter(ot => !resolveRowId(ot))
    .filter(ot => !customOTIds.has(ot.id))
    .filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter)
    .filter(ot => viewMode === 'semaine' ? blockPos(ot, weekStart) !== null : isoToDate(ot.date_chargement_prevue) === selectedDay)

  const bottomDockUrgences = useMemo(() => {
    const now = Date.now()
    const in24h = now + 24 * 60 * 60 * 1000
    const urgences: PlanningUrgence[] = []

    for (const ot of ganttOTs) {
      const endTs = new Date(ot.date_livraison_prevue ?? ot.date_chargement_prevue ?? 0).getTime()
      if (!Number.isFinite(endTs)) continue
      if (ot.statut !== 'facture' && endTs < now) {
        const minutesLate = Math.max(0, Math.round((now - endTs) / 60000))
        urgences.push({
          id: `late-${ot.id}`,
          level: minutesLate >= 180 ? 'critique' : 'haute',
          source: 'retard',
          label: ot.reference,
          detail: `Retard livraison ${formatMinutes(minutesLate)}`,
          otId: ot.id,
          score: 200 + Math.min(minutesLate, 600),
        })
      }
    }

    for (const ot of unresourced) {
      const startTs = new Date(ot.date_chargement_prevue ?? ot.date_livraison_prevue ?? 0).getTime()
      if (!Number.isFinite(startTs)) continue
      if (startTs >= now && startTs <= in24h) {
        const minutesToStart = Math.max(0, Math.round((startTs - now) / 60000))
        urgences.push({
          id: `unresourced-${ot.id}`,
          level: minutesToStart <= 240 ? 'critique' : 'haute',
          source: 'non_affectee',
          label: ot.reference,
          detail: `Depart dans ${formatMinutes(minutesToStart)} sans ressource`,
          otId: ot.id,
          score: 180 + Math.max(0, 300 - minutesToStart),
        })
      }
    }

    for (const conflict of bottomDockConflicts) {
      const overlap = conflict.pairs.reduce((sum, pair) => sum + pair.overlapMinutes, 0)
      if (overlap <= 0) continue
      urgences.push({
        id: `conflict-${conflict.rowId}`,
        level: overlap >= 120 ? 'critique' : 'moyenne',
        source: 'conflit',
        label: conflict.rowLabel,
        detail: `${conflict.pairs.length} conflit(s), chevauchement cumule ${formatMinutes(overlap)}`,
        rowId: conflict.rowId,
        score: 120 + overlap,
      })
    }

    return urgences
      .sort((left, right) => right.score - left.score)
      .slice(0, 40)
  }, [bottomDockConflicts, ganttOTs, unresourced])

  const canMove   = (ot: OT) => (ot.statut === 'planifie' || ot.statut === 'confirme') && !ot.groupage_fige
  const canUnlock = canMove

  function ghostPos(rowId: string): React.CSSProperties | null {
    if (!hoverRow || hoverRow.rowId !== rowId || !drag) return null
    if (drag.kind === 'pool' || drag.kind === 'block') {
      // La course reste à sa propre position sur la timeline – on affiche le ghost à cet endroit
      if (!drag.ot) return null
      if (viewMode === 'semaine') {
        const metrics = getWeekBlockMetrics(drag.ot, weekStart)
        if (!metrics) return null
        return { position:'absolute', top:'6px', height:'40px', left:`calc(${metrics.leftPct}% + 2px)`, width:`calc(${metrics.widthPct}% - 4px)`, zIndex:20, pointerEvents:'none' }
      } else {
        const metrics = getDayBlockMetrics(drag.ot.date_chargement_prevue, drag.ot.date_livraison_prevue, selectedDay)
        if (!metrics) return null
        return { position:'absolute', top:'4px', height:'44px', left:`${metrics.leftPct}%`, width:`${metrics.widthPct}%`, zIndex:20, pointerEvents:'none' }
      }
    }
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
            <button onClick={() => openPlanningCreationModal({ rowId: row.id, dateStart: toISO(weekStart), type: 'hlp' })}
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
    <div
      className={`nx-planning relative flex h-full bg-slate-950 overflow-x-hidden ${isResizingBottomDock ? 'cursor-ns-resize' : ''}`}
      style={{ paddingBottom: `${BOTTOM_DOCK_VIEWPORT_OFFSET}px` }}
    >
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
                  const chargSite = ot.chargement_site_id ? logisticSites.find(s => s.id === ot.chargement_site_id) : null
                  const livrSite  = ot.livraison_site_id  ? logisticSites.find(s => s.id === ot.livraison_site_id)  : null
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
                      {(chargSite || livrSite) && (
                        <div className="mt-1 space-y-0.5">
                          {chargSite && (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0"/>
                              <span className="text-[10px] text-slate-400 truncate">{chargSite.ville ?? chargSite.nom}</span>
                            </div>
                          )}
                          {livrSite && (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 flex-shrink-0"/>
                              <span className="text-[10px] text-slate-400 truncate">{livrSite.ville ?? livrSite.nom}</span>
                            </div>
                          )}
                        </div>
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
      <div className="flex-1 flex flex-col min-w-0">

        {/* â”€â”€ Top bar â”€â”€ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-900 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base font-bold text-white flex-shrink-0">Planning</h1>

            <div className="flex rounded-lg border border-slate-700 overflow-hidden flex-shrink-0">
              <button
                type="button"
                onClick={() => setPlanningScope('principal')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${planningScope === 'principal' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Principal
              </button>
              <button
                type="button"
                onClick={() => setPlanningScope('affretement')}
                className={`px-3 py-1 text-xs font-medium transition-colors ${planningScope === 'affretement' ? 'bg-blue-600/30 text-blue-100' : 'text-slate-400 hover:text-white'}`}
              >
                Affreteur dedie
              </button>
            </div>

            {/* View mode */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden flex-shrink-0">
              {(['semaine','jour'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => setViewMode(v)}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${viewMode===v ? 'bg-indigo-500/25 text-indigo-100' : 'text-slate-400 hover:text-white'}`}>
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
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-800/60 bg-slate-950/60 flex-shrink-0 overflow-x-hidden">
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
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Scope</span>
            <span className="text-sm font-bold text-white">{planningScope === 'affretement' ? 'Affretement' : 'Principal'}</span>
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
                      isSel  ? 'bg-indigo-500/25 text-indigo-100 border border-indigo-400/45'
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
        <div className="flex flex-wrap items-center border-b border-slate-700/80 bg-slate-900 px-4 flex-shrink-0 gap-1 overflow-x-hidden">
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

          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-[10px] text-slate-600 whitespace-nowrap">Centre :</span>
            <select value={centerFilter} onChange={e => setCenterFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-white outline-none focus:border-indigo-500 transition-colors max-w-[140px]">
              <option value="">Tous</option>
              {logisticSites.map(site => (
                <option key={site.id} value={site.id}>{site.nom}</option>
              ))}
            </select>
          </div>

          {/* Option planning affreteur */}
          <div className="flex items-center gap-1 flex-shrink-0 border-l border-slate-700 ml-1 pl-2">
            <button
              type="button"
              onClick={() => openPlanningCreationModal({ type: 'course' })}
              className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] rounded-full font-medium transition-colors border border-emerald-600/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
            >
              <span className="text-xs leading-none">+</span>
              Nouvelle course
            </button>
            <button
              type="button"
              onClick={() => openPlanningCreationModal({ type: 'hlp' })}
              className="flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] rounded-full font-medium transition-colors border border-slate-600/50 bg-slate-700/30 text-slate-100 hover:bg-slate-700/50"
            >
              <span className="text-xs leading-none">+</span>
              HLP / pause / bloc
            </button>
            <button
              type="button"
              onClick={() => setShowAffretementAssets(current => { const next = !current; saveShowAffretementAssets(next); return next })}
              title="Afficher ou masquer le planning affreteur"
              className={`flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] rounded-full font-medium transition-colors border ${
                showAffretementAssets ? 'bg-blue-500/20 border-blue-600/40 text-blue-200' : 'border-slate-700 text-slate-500 hover:text-slate-300'
              }`}>
              <span className="text-[9px] font-bold uppercase tracking-wide">Planning affreteur</span>
              <span className={`text-[9px] px-1.5 py-[1px] rounded-full border ${
                showAffretementAssets ? 'bg-blue-500/30 border-blue-500/60 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {showAffretementAssets ? 'Visible' : 'Masque'}
              </span>
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
          <div className="overflow-visible" onDragOver={e => e.preventDefault()}>
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
              const generatedBlocks = row.isCustom ? [] : ots.flatMap(ot => buildGeneratedInlineEvents(ot, row.id))
              const groupageCards = row.isCustom ? [] : buildGroupageCards(ots)
              const groupedOtIds = new Set(groupageCards.flatMap(card => card.members.map(member => member.id)))
              const frozenGroupageOverlays = row.isCustom ? [] : buildFrozenGroupageOverlays(ots)
              const groupedBlockLayout = row.isCustom ? {} : buildGroupedBlockLayout(ots)
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
                    {frozenGroupageOverlays.map(overlay => (
                      <div
                        key={`frozen-week-${overlay.groupId}`}
                        style={{ position:'absolute', top:'2px', height:'60px', left:`calc(${overlay.leftPct}% + 1px)`, width:`calc(${overlay.widthPct}% - 2px)` }}
                        className="pointer-events-none rounded-[20px] border border-indigo-400/45 bg-indigo-500/10 shadow-inner ring-1 ring-indigo-300/10"
                        title={overlay.references}
                      >
                        <span className="absolute left-3 -top-2 rounded-full border border-indigo-400/40 bg-slate-950/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                          {overlay.label}
                        </span>
                      </div>
                    ))}
                    {groupageCards.map(card => (
                      <div
                        key={`group-card-week-${card.groupId}`}
                        style={{ position:'absolute', top:'6px', height:'52px', left:`calc(${card.leftPct}% + 2px)`, width:`calc(${card.widthPct}% - 4px)` }}
                        className={`rounded-xl border overflow-hidden shadow-lg ${card.frozen ? 'border-indigo-400/60 bg-slate-900/96' : 'border-emerald-400/45 bg-slate-950/92'}`}
                      >
                        <div className={`flex items-center justify-between px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${card.frozen ? 'bg-indigo-500/20 text-indigo-100' : 'bg-emerald-500/15 text-emerald-100'}`}>
                          <span>Lot {card.members.length}</span>
                          <span>{card.frozen ? 'Verrouille' : 'Deliable'}</span>
                        </div>
                        <div className="grid h-[calc(100%-22px)] divide-x divide-white/8" style={{ gridTemplateColumns: `repeat(${card.members.length}, minmax(0, 1fr))` }}>
                          {card.members.map(member => {
                            const isLate = member.statut !== 'facture' && member.date_livraison_prevue && member.date_livraison_prevue.slice(0,10) < today
                            return (
                              <button
                                key={member.id}
                                type="button"
                                onClick={() => !isRowEditMode && openSelected(member)}
                                onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot:member }) }}
                                className={`flex min-w-0 flex-col justify-center px-2 text-left transition-colors ${isRowEditMode ? 'cursor-default' : 'cursor-pointer hover:bg-white/5'}`}
                              >
                                <div className="flex items-center gap-1 min-w-0">
                                  {isAffretedOt(member.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                                  {isLate && <span className="rounded px-1 text-[8px] font-bold bg-red-500/30 text-red-200 flex-shrink-0">!</span>}
                                  <StatutOpsDot statut={member.statut_operationnel} size="xs"/>
                                  <span className="truncate font-mono text-[10px] font-bold text-white">{member.reference}</span>
                                </div>
                                <span className="truncate text-[10px] font-semibold text-white/80">{member.client_nom}</span>
                                <span className="truncate text-[9px] font-mono text-white/45">{isoToTime(member.date_chargement_prevue)}-{isoToTime(member.date_livraison_prevue)}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                    {ots.map(ot => {
                      if (groupedOtIds.has(ot.id)) return null
                      const pos = blockPos(ot, weekStart); if (!pos) return null
                      const { cls:cCls, style:cStyle } = getBlockColors(ot, row.id)
                      const groupedLayout = groupedBlockLayout[ot.id]
                      const groupageBubbleLabel = getGroupageBubbleLabel(ot)
                      const isSaving   = savingOtId === ot.id
                      const isDragging = drag?.ot?.id === ot.id
                      const isLate = ot.statut !== 'facture' && ot.date_livraison_prevue && ot.date_livraison_prevue.slice(0,10) < today
                      const hCharge = ot.date_chargement_prevue?.includes('T') ? ot.date_chargement_prevue.slice(11,16) : ''
                      const hLivre  = ot.date_livraison_prevue?.includes('T')  ? ot.date_livraison_prevue.slice(11,16)  : ''
                      return (
                        <div key={ot.id} style={{...pos,...cStyle, ...(groupedLayout ? { top:`${groupedLayout.top}px`, height:`${groupedLayout.height}px` } : null)}}
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
                            {groupageBubbleLabel && <span className="rounded px-1 text-[8px] font-bold bg-amber-500/30 text-amber-100 flex-shrink-0">{groupageBubbleLabel}</span>}
                            {isLate && <span className="rounded px-1 text-[8px] font-bold bg-red-500/30 text-red-200 flex-shrink-0">?</span>}
                            {ot.statut === 'facture' && <span className="rounded px-1 text-[8px] font-bold bg-violet-500/30 text-violet-200 flex-shrink-0">EUR</span>}
                            <StatutOpsDot statut={ot.statut_operationnel} size="xs"/>
                            <span className="font-mono text-[10px] font-bold truncate flex-1">{ot.reference}</span>
                            {!isRowEditMode && !drag && (
                              <>
                                <button title="Ajouter HLP avant" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                  onClick={e => { e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'hlp') }}>HLP</button>
                                <button title="Ajouter pause apres" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                  onClick={e => { e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'repos') }}>PAUSE</button>
                              </>
                            )}
                            {!isRowEditMode && (
                              <button title="Desaffecter" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/20 text-[10px]"
                                onClick={e => { e.stopPropagation(); unassign(ot) }}>x</button>
                            )}
                          </div>
                          {!groupedLayout?.compact && (
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="truncate flex-1 text-[10px] text-white/80 font-semibold">{ot.client_nom}</span>
                              {(hCharge || hLivre) && (
                                <span className="text-[9px] text-white/50 flex-shrink-0 font-mono">{hCharge}{hCharge && hLivre ? '-' : ''}{hLivre}</span>
                              )}
                            </div>
                          )}
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
                        const groupageBubbleLabel = getGroupageBubbleLabel(linkedOT)
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
                              {groupageBubbleLabel && <span className="rounded px-1 text-[8px] font-bold bg-amber-500/30 text-amber-100 flex-shrink-0">{groupageBubbleLabel}</span>}
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
                          onClick={() => !isRowEditMode && openPlanningBlockEditor(block)}
                          className={`${block.color} border rounded-md text-white text-[11px] font-medium flex items-center px-2 gap-1.5 cursor-grab active:cursor-grabbing group/cblock overflow-hidden shadow-sm ${drag?.customBlockId===block.id?'opacity-30':''} ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}`}>
                          <span className="truncate flex-1">{block.label}</span>
                          {!isRowEditMode && <button className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                            title="Modifier"
                            onClick={e => { e.stopPropagation(); openPlanningBlockEditor(block) }}>
                            ✎</button>}
                          {!isRowEditMode && <button className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                            onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>}
                        </div>
                      )
                    })}
                    {generatedBlocks.map(block => {
                      const start = block.dateStart.slice(0,10)
                      const end = block.dateEnd.slice(0,10)
                      const sD = parseDay(start)
                      const eD = parseDay(end)
                      const wE = addDays(weekStart, 6)
                      if (eD < weekStart || sD > wE) return null
                      const vS = sD < weekStart ? weekStart : sD
                      const vE = eD > wE ? wE : eD
                      const p2: React.CSSProperties = {
                        position:'absolute',
                        top:'44px',
                        height:'16px',
                        left:`calc(${daysDiff(weekStart,vS)/7*100}% + 2px)`,
                        width:`calc(${(daysDiff(vS,vE)+1)/7*100}% - 4px)`,
                      }
                      return (
                        <div key={block.id} style={p2}
                          className={`${block.color} border rounded text-white/90 text-[9px] px-1.5 flex items-center overflow-hidden pointer-events-none opacity-80`}>
                          <span className="truncate">{block.label}</span>
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
          <div className="flex flex-col">
            {/* Hour header */}
            <div className="flex flex-shrink-0 bg-slate-900 border-b border-slate-700 overflow-hidden">
              <div className="w-44 flex-shrink-0 border-r border-slate-700 bg-slate-900"/>
              <div className="flex-1 overflow-hidden">
                <div className="flex w-full">
                  {hourSlots.map(h => (
                    <div key={h} className="min-w-0 flex-1 border-r border-slate-700/50">
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
            <div className="overflow-x-hidden overflow-y-visible" onDragOver={e => e.preventDefault()}>
              {visibleRows.map(row => {
                const ots    = row.isCustom ? [] : rowOTs(row.id)
                const cBlocks = row.isCustom ? customBlocks.filter(b => b.rowId===row.id) : []
                const generatedBlocks = row.isCustom ? [] : ots.flatMap(ot => buildGeneratedInlineEvents(ot, row.id))
                const groupageCards = row.isCustom ? [] : buildGroupageCards(ots)
                const groupedOtIds = new Set(groupageCards.flatMap(card => card.members.map(member => member.id)))
                const frozenGroupageOverlays = row.isCustom ? [] : buildFrozenGroupageOverlays(ots)
                const groupedBlockLayout = row.isCustom ? {} : buildGroupedBlockLayout(ots)
                const isDropTarget = hoverRow?.rowId===row.id && !isRowEditMode
                const gPos = ghostPos(row.id)
                return (
                  <div key={row.id}
                    onDragOver={!isRowEditMode ? e => { e.preventDefault(); e.stopPropagation() } : undefined}
                    onDrop={!isRowEditMode ? e => onRowDrop(e, row.id, !!row.isCustom) : undefined}
                    className={`flex border-b border-slate-800/50 transition-colors group ${isDropTarget?'bg-indigo-950/30':'hover:bg-white/[0.01]'}`}>
                    {renderRowLabel(row)}
                    <div className="flex-1 relative overflow-hidden" style={{ height:ROW_H }}
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
                        openPlanningCreationModal({ rowId: row.id, dateStart: `${selectedDay}T${hh}:${mm}`, type: 'hlp' })
                      }}>
                      {/* Hour grid */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {hourSlots.map(h => (
                          <div key={h} className="min-w-0 flex-1 border-r border-slate-800/40">
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
                      {frozenGroupageOverlays.map(overlay => (
                        <div
                          key={`frozen-day-${overlay.groupId}`}
                          style={{ position:'absolute', top:'2px', height:'58px', left:`${overlay.leftPct}%`, width:`${overlay.widthPct}%` }}
                          className="pointer-events-none rounded-[20px] border border-indigo-400/45 bg-indigo-500/10 shadow-inner ring-1 ring-indigo-300/10"
                          title={overlay.references}
                        >
                          <span className="absolute left-3 -top-2 rounded-full border border-indigo-400/40 bg-slate-950/95 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-200">
                            {overlay.label}
                          </span>
                        </div>
                      ))}
                      {groupageCards.map(card => (
                        <div
                          key={`group-card-day-${card.groupId}`}
                          style={{ position:'absolute', top:'4px', height:'52px', left:`${card.leftPct}%`, width:`${card.widthPct}%` }}
                          className={`rounded-xl border overflow-hidden shadow-lg ${card.frozen ? 'border-indigo-400/60 bg-slate-900/96' : 'border-emerald-400/45 bg-slate-950/92'}`}
                        >
                          <div className={`flex items-center justify-between px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] ${card.frozen ? 'bg-indigo-500/20 text-indigo-100' : 'bg-emerald-500/15 text-emerald-100'}`}>
                            <span>Lot {card.members.length}</span>
                            <span>{card.frozen ? 'Verrouille' : 'Deliable'}</span>
                          </div>
                          <div className="grid h-[calc(100%-22px)] divide-x divide-white/8" style={{ gridTemplateColumns: `repeat(${card.members.length}, minmax(0, 1fr))` }}>
                            {card.members.map(member => {
                              const isLate = member.statut !== 'facture' && member.date_livraison_prevue && member.date_livraison_prevue.slice(0,10) < today
                              return (
                                <button
                                  key={member.id}
                                  type="button"
                                  onClick={() => !isRowEditMode && openSelected(member)}
                                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot:member }) }}
                                  className={`flex min-w-0 flex-col justify-center px-2 text-left transition-colors ${isRowEditMode ? 'cursor-default' : 'cursor-pointer hover:bg-white/5'}`}
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    {isAffretedOt(member.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                                    {isLate && <span className="rounded px-1 text-[8px] font-bold bg-red-500/30 text-red-200 flex-shrink-0">!</span>}
                                    <StatutOpsDot statut={member.statut_operationnel} size="xs"/>
                                    <span className="truncate font-mono text-[10px] font-bold text-white">{member.reference}</span>
                                  </div>
                                  <span className="truncate text-[10px] font-semibold text-white/80">{member.client_nom}</span>
                                  <span className="truncate text-[9px] font-mono text-white/45">{isoToTime(member.date_chargement_prevue)}-{isoToTime(member.date_livraison_prevue)}</span>
                                  {!isRowEditMode && (
                                    <span className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button type="button" className="rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                        onClick={e => { e.stopPropagation(); openPlanningEventNearCourse(row.id, member, 'hlp') }}>HLP</button>
                                      <button type="button" className="rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                        onClick={e => { e.stopPropagation(); openPlanningEventNearCourse(row.id, member, 'repos') }}>PAUSE</button>
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                      {ots.map(ot => {
                        if (groupedOtIds.has(ot.id)) return null
                        const pos = blockPosDay(ot.date_chargement_prevue, ot.date_livraison_prevue, selectedDay)
                        if (!pos) return null
                        const { cls:cCls, style:cStyle } = getBlockColors(ot, row.id)
                        const groupedLayout = groupedBlockLayout[ot.id]
                        const groupageBubbleLabel = getGroupageBubbleLabel(ot)
                        const isDragging = drag?.ot?.id===ot.id
                        const isLate = ot.statut !== 'facture' && ot.date_livraison_prevue && ot.date_livraison_prevue.slice(0,10) < today
                        return (
                          <div key={ot.id} style={{...pos,...cStyle, ...(groupedLayout ? { top:`${groupedLayout.top}px`, height:`${groupedLayout.height}px` } : null)}}
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
                              {groupageBubbleLabel && <span className="rounded px-1 text-[8px] font-bold bg-amber-500/30 text-amber-100 flex-shrink-0">{groupageBubbleLabel}</span>}
                              {isLate && <span className="text-[8px] flex-shrink-0">?</span>}
                              {ot.statut === 'facture' && <span className="text-[8px] flex-shrink-0 text-violet-300">EUR</span>}
                              <StatutOpsDot statut={ot.statut_operationnel} size="xs"/>
                              <span className="font-mono font-bold truncate flex-1">{ot.reference}</span>
                              {!isRowEditMode && !drag && (
                                <>
                                  <button title="Ajouter HLP avant" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                    onClick={e => { e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'hlp') }}>HLP</button>
                                  <button title="Ajouter pause apres" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                    onClick={e => { e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'repos') }}>PAUSE</button>
                                </>
                              )}
                            </div>
                            {!groupedLayout?.compact && (
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-white/80 text-[10px] font-semibold truncate flex-1">{ot.client_nom}</span>
                                <span className="text-white/50 text-[9px] font-mono flex-shrink-0">{isoToTime(ot.date_chargement_prevue)}-{isoToTime(ot.date_livraison_prevue)}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {cBlocks.map(block => {
                        const pos = blockPosDay(block.dateStart, block.dateEnd, selectedDay)
                        if (!pos) return null
                        const linkedOT = findOTById(block.otId)
                        if (linkedOT) {
                          const { cls:cCls, style:cStyle } = getBlockColors(linkedOT, row.id)
                          const groupageBubbleLabel = getGroupageBubbleLabel(linkedOT)
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
                                {groupageBubbleLabel && <span className="rounded px-1 text-[8px] font-bold bg-amber-500/30 text-amber-100 flex-shrink-0">{groupageBubbleLabel}</span>}
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
                            onClick={() => !isRowEditMode && openPlanningBlockEditor(block)}
                            className={`${block.color} border rounded-md text-white text-[11px] font-medium flex flex-col justify-center px-2 cursor-grab active:cursor-grabbing group/cblock overflow-hidden shadow-sm ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}`}>
                            <span className="truncate leading-tight">{block.label}</span>
                              <span className="text-white/60 text-[9px]">{block.dateStart.slice(11,16)}-{block.dateEnd.slice(11,16)}</span>
                            {!isRowEditMode && <button className="absolute right-5 top-1 opacity-0 group-hover/cblock:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                              title="Modifier"
                              onClick={e => { e.stopPropagation(); openPlanningBlockEditor(block) }}>✎</button>}
                            {!isRowEditMode && <button className="absolute right-1 top-1 opacity-0 group-hover/cblock:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                              onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>}
                          </div>
                        )
                      })}
                      {generatedBlocks.map(block => {
                        const pos = blockPosDay(block.dateStart, block.dateEnd, selectedDay)
                        if (!pos) return null
                        return (
                          <div key={block.id} style={{...pos, top:'42px', height:'14px'}}
                            className={`${block.color} border rounded text-white/90 text-[9px] px-1.5 flex items-center overflow-hidden pointer-events-none opacity-80`}>
                            <span className="truncate">{block.label}</span>
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

        <div className="sticky bottom-0 z-[30] mb-2">
          {bottomDockCollapsed ? (
            <div className="border border-slate-800 bg-slate-950/95 px-4 py-2 rounded-t-xl">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Panneau operations replie
                </p>
                <button
                  type="button"
                  onClick={() => setBottomDockCollapsed(false)}
                  className="rounded-full border border-indigo-500/50 bg-indigo-500/20 px-3 py-1 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/30"
                >
                  Ouvrir le panneau
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative h-3 flex-shrink-0 border-t border-slate-800 bg-slate-950/95">
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  onMouseDown={startBottomDockResize}
                  className="absolute inset-0 z-[25] flex cursor-ns-resize items-center justify-center"
                  title="Redimensionner le dock"
                >
                  <div className="h-1 w-16 rounded-full bg-slate-600/80 transition-colors hover:bg-indigo-400" />
                </div>
              </div>

              <div className="border-t border-slate-800 bg-slate-950/95 flex-shrink-0 overflow-hidden" style={{ height: `${bottomDockHeight}px` }}>
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/80 overflow-x-auto scrollbar-none flex-shrink-0">
            {([
              { key: 'missions' as BottomDockTab, label: 'Missions', count: bottomDockMissions.length },
              { key: 'urgences' as BottomDockTab, label: 'Urgences', count: bottomDockUrgences.length },
              { key: 'non_affectees' as BottomDockTab, label: 'Non affectees', count: unresourced.length },
              { key: 'conflits' as BottomDockTab, label: 'Conflits', count: bottomDockConflicts.reduce((sum, item) => sum + item.pairs.length, 0) },
              { key: 'affretement' as BottomDockTab, label: 'Affretement', count: activeAffretementContracts.length },
              { key: 'groupages' as BottomDockTab, label: 'Groupages', count: bottomDockGroupages.length },
              { key: 'non_programmees' as BottomDockTab, label: 'Non programmees', count: bottomDockNonProgrammees.length },
              { key: 'annulees' as BottomDockTab, label: 'Annulees', count: bottomDockAnnulees.length },
              { key: 'entrepots' as BottomDockTab, label: 'Entrepots', count: relaisList.filter(r => r.type_relais === 'depot_marchandise' && r.statut === 'en_attente').length },
              { key: 'relais' as BottomDockTab, label: 'Relais conducteur', count: relaisList.filter(r => r.type_relais === 'relais_conducteur' && (r.statut === 'en_attente' || r.statut === 'assigne')).length },
              { key: 'retour_charge' as BottomDockTab, label: 'Retour en charge IA', count: retourChargeSuggestions.length },
            ]).map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setBottomDockTab(item.key)
                  if (item.key === 'relais' || item.key === 'entrepots') void loadRelais()
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border whitespace-nowrap ${
                  bottomDockTab === item.key
                    ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-200'
                    : 'border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${bottomDockTab === item.key ? 'bg-indigo-500/50 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {item.count}
                </span>
              </button>
            ))}

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBottomDockTab('urgences')}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-rose-500/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 transition-colors whitespace-nowrap"
              >
                Focus urgences
              </button>
              <button
                type="button"
                onClick={() => {
                  setPoolSearch('')
                  setResourceSearch('')
                  setFilterType('')
                  setFilterClient('')
                  setCenterFilter('')
                  setShowOnlyAlert(false)
                  setShowOnlyConflicts(false)
                }}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-slate-700 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Reset filtres
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !simulationMode
                  setSimulationMode(next)
                  saveBooleanSetting(SIMULATION_MODE_KEY, next)
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${simulationMode ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-200' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
              >
                Mode simulation {simulationMode ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !autoHabillage
                  setAutoHabillage(next)
                  saveBooleanSetting(AUTO_HABILLAGE_KEY, next)
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${autoHabillage ? 'bg-sky-500/20 border-sky-600/40 text-sky-200' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
              >
                Habillage auto {autoHabillage ? 'active' : 'off'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !autoPauseReglementaire
                  setAutoPauseReglementaire(next)
                  saveBooleanSetting(AUTO_PAUSE_KEY, next)
                }}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${autoPauseReglementaire ? 'bg-amber-500/20 border-amber-600/40 text-amber-200' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
              >
                Pause 45 min {autoPauseReglementaire ? 'activee' : 'off'}
              </button>
              <button
                type="button"
                onClick={() => setPlanningHeaderCollapsed(current => !current)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${planningHeaderCollapsed ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-200' : 'border-slate-700 text-slate-300 hover:text-white'}`}
              >
                {planningHeaderCollapsed ? 'Afficher bandeau haut' : 'Retracter bandeau haut'}
              </button>
              <button
                type="button"
                onClick={() => setBottomDockCollapsed(true)}
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold border border-slate-700 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                Replier panneau
              </button>
            </div>
          </div>

          <div className="grid h-[calc(100%-52px)] grid-cols-1 gap-3 overflow-auto px-4 py-3 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
              {bottomDockTab === 'missions' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Reference</th>
                        <th className="text-left px-3 py-2">Client</th>
                        <th className="text-left px-3 py-2">Ressource</th>
                        <th className="text-left px-3 py-2">Fenetre</th>
                        <th className="text-left px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockMissions.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={5}>Aucune mission planifiee.</td></tr>
                      )}
                      {bottomDockMissions.map(ot => (
                        <tr key={ot.id} className="border-t border-slate-800/70 hover:bg-slate-800/40 cursor-pointer" onClick={() => openSelected(ot)}>
                          <td className="px-3 py-2 font-mono text-slate-300">{ot.reference}</td>
                          <td className="px-3 py-2 text-slate-200">{ot.client_nom}</td>
                          <td className="px-3 py-2 text-slate-400">{resolveRowId(ot) ? (orderedRows.find(row => row.id === resolveRowId(ot))?.primary ?? '-') : '-'}</td>
                          <td className="px-3 py-2 text-slate-400">{isoToDate(ot.date_chargement_prevue)} {isoToTime(ot.date_chargement_prevue)} - {isoToDate(ot.date_livraison_prevue)} {isoToTime(ot.date_livraison_prevue)}</td>
                          <td className="px-3 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${BADGE_CLS[ot.statut] ?? 'bg-slate-700 text-slate-300'}`}>{STATUT_LABEL[ot.statut] ?? ot.statut}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'urgences' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Priorite</th>
                        <th className="text-left px-3 py-2">Objet</th>
                        <th className="text-left px-3 py-2">Details</th>
                        <th className="text-left px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockUrgences.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucune urgence immediate.</td></tr>
                      )}
                      {bottomDockUrgences.map(item => (
                        <tr key={item.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                          <td className="px-3 py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              item.level === 'critique'
                                ? 'bg-red-500/25 text-red-200'
                                : item.level === 'haute'
                                  ? 'bg-amber-500/25 text-amber-200'
                                  : 'bg-sky-500/25 text-sky-200'
                            }`}>
                              {item.level === 'critique' ? 'Critique' : item.level === 'haute' ? 'Haute' : 'Moyenne'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-300">{item.label}</td>
                          <td className="px-3 py-2 text-slate-300">{item.detail}</td>
                          <td className="px-3 py-2">
                            {item.source === 'conflit' ? (
                              <button type="button" onClick={() => item.rowId && setConflictPanelRowId(item.rowId)} className="text-rose-300 hover:text-rose-200">
                                Ouvrir conflits
                              </button>
                            ) : item.source === 'non_affectee' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const ot = item.otId ? findOTById(item.otId) : null
                                  if (ot) openAssign(ot)
                                }}
                                className="text-indigo-300 hover:text-indigo-200"
                              >
                                Affecter
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  const ot = item.otId ? findOTById(item.otId) : null
                                  if (ot) openSelected(ot)
                                }}
                                className="text-indigo-300 hover:text-indigo-200"
                              >
                                Ouvrir OT
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'non_affectees' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Reference</th>
                        <th className="text-left px-3 py-2">Client</th>
                        <th className="text-left px-3 py-2">Date</th>
                        <th className="text-left px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unresourced.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucune mission non affectee.</td></tr>
                      )}
                      {unresourced.map(ot => (
                        <tr key={ot.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono text-slate-300">{ot.reference}</td>
                          <td className="px-3 py-2 text-slate-200">{ot.client_nom}</td>
                          <td className="px-3 py-2 text-slate-400">{isoToDate(ot.date_chargement_prevue)} {isoToTime(ot.date_chargement_prevue)}</td>
                          <td className="px-3 py-2"><button type="button" onClick={() => openAssign(ot)} className="text-indigo-300 hover:text-indigo-200">Affecter</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'conflits' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Ressource</th>
                        <th className="text-left px-3 py-2">Courses</th>
                        <th className="text-left px-3 py-2">Chevauchement</th>
                        <th className="text-left px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockConflicts.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucun conflit detecte.</td></tr>
                      )}
                      {bottomDockConflicts.flatMap(item => item.pairs.map((pair, idx) => (
                        <tr key={`${item.rowId}-${pair.first.id}-${pair.second.id}-${idx}`} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                          <td className="px-3 py-2 text-slate-200">{item.rowLabel}</td>
                          <td className="px-3 py-2 font-mono text-slate-300">{pair.first.reference} / {pair.second.reference}</td>
                          <td className="px-3 py-2 text-rose-300">{formatMinutes(pair.overlapMinutes)}</td>
                          <td className="px-3 py-2"><button type="button" onClick={() => setConflictPanelRowId(item.rowId)} className="text-rose-300 hover:text-rose-200">Voir</button></td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'affretement' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Course</th>
                        <th className="text-left px-3 py-2">Affreteur</th>
                        <th className="text-left px-3 py-2">Statut</th>
                        <th className="text-left px-3 py-2">Affectations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeAffretementContracts.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucune course affretee en cours.</td></tr>
                      )}
                      {activeAffretementContracts.map(contract => {
                        const ot = ganttOTs.find(item => item.id === contract.otId) ?? pool.find(item => item.id === contract.otId)
                        const context = affretementContextByOtId[contract.otId]
                        return (
                          <tr key={contract.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                            <td className="px-3 py-2 font-mono text-slate-300">{ot?.reference ?? contract.otId.slice(0, 8)}</td>
                            <td className="px-3 py-2 text-slate-200">{context?.onboarding?.companyName ?? '-'}</td>
                            <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px]">{contract.status}</span></td>
                            <td className="px-3 py-2 text-slate-400">
                              {context?.driver ? `Cond. ${context.driver.fullName}` : 'Cond. -'}
                              {' / '}
                              {context?.vehicle ? `Veh. ${context.vehicle.plate}` : 'Veh. -'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'groupages' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Lot</th>
                        <th className="text-left px-3 py-2">Courses</th>
                        <th className="text-left px-3 py-2">Etat</th>
                        <th className="text-left px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockGroupages.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucun groupage actif.</td></tr>
                      )}
                      {bottomDockGroupages.map(group => (
                        <tr key={group.groupId} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono text-slate-300">{group.groupId.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-slate-200">{group.members.map(item => item.reference).join(', ')}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${group.frozen ? 'bg-indigo-500/25 text-indigo-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                              {group.frozen ? 'Fige' : 'Deliable'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => openSelected(group.members[0])} className="text-indigo-300 hover:text-indigo-200">Ouvrir</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'non_programmees' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Reference</th>
                        <th className="text-left px-3 py-2">Client</th>
                        <th className="text-left px-3 py-2">Statut</th>
                        <th className="text-left px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockNonProgrammees.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucune course non programmee.</td></tr>
                      )}
                      {bottomDockNonProgrammees.map(ot => (
                        <tr key={ot.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono text-slate-300">{ot.reference}</td>
                          <td className="px-3 py-2 text-slate-200">{ot.client_nom}</td>
                          <td className="px-3 py-2"><span className={`text-[10px] px-1.5 py-0.5 rounded-full ${BADGE_CLS[ot.statut] ?? 'bg-slate-700 text-slate-300'}`}>{STATUT_LABEL[ot.statut] ?? ot.statut}</span></td>
                          <td className="px-3 py-2"><button type="button" onClick={() => openAssign(ot)} className="text-indigo-300 hover:text-indigo-200">Programmer</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'annulees' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Reference</th>
                        <th className="text-left px-3 py-2">Client</th>
                        <th className="text-left px-3 py-2">Date prevue</th>
                        <th className="text-left px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockAnnulees.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucune course annulee.</td></tr>
                      )}
                      {bottomDockAnnulees.map(ot => (
                        <tr key={ot.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono text-slate-300">{ot.reference}</td>
                          <td className="px-3 py-2 text-slate-200">{ot.client_nom}</td>
                          <td className="px-3 py-2 text-slate-400">{isoToDate(ot.date_chargement_prevue)} {isoToTime(ot.date_chargement_prevue)}</td>
                          <td className="px-3 py-2"><button type="button" onClick={() => openSelected(ot)} className="text-indigo-300 hover:text-indigo-200">Consulter</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {bottomDockTab === 'retour_charge' && (
                <div className="overflow-auto p-3 space-y-3">
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
                    <p className="text-xs font-semibold text-indigo-300 mb-0.5">Placement retour en charge</p>
                    <p className="text-[11px] text-indigo-200/70">
                      Trouvez les courses disponibles les plus proches de la position actuelle du vehicule.
                      L'IA Anthropic Claude sera branchee dans la prochaine phase.
                    </p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wide">Vehicule</label>
                      <select
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-2 outline-none"
                        value={retourChargeForm.vehicule_id}
                        onChange={e => setRetourChargeForm(f => ({ ...f, vehicule_id: e.target.value }))}
                      >
                        <option value="">-- Choisir --</option>
                        {vehicules.map(v => (
                          <option key={v.id} value={v.id}>{v.immatriculation} {v.marque ?? ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wide">Date debut</label>
                      <input
                        type="date"
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-2 outline-none"
                        value={retourChargeForm.date_debut}
                        onChange={e => setRetourChargeForm(f => ({ ...f, date_debut: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wide">Date fin</label>
                      <input
                        type="date"
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-2 outline-none"
                        value={retourChargeForm.date_fin}
                        onChange={e => setRetourChargeForm(f => ({ ...f, date_fin: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wide">Retour depot avant</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-2 outline-none"
                        value={retourChargeForm.retour_depot_avant}
                        onChange={e => setRetourChargeForm(f => ({ ...f, retour_depot_avant: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1 uppercase tracking-wide">Rayon (km)</label>
                      <input
                        type="number"
                        min={10}
                        max={1000}
                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs px-2 py-2 outline-none"
                        value={retourChargeForm.rayon_km}
                        onChange={e => setRetourChargeForm(f => ({ ...f, rayon_km: Number(e.target.value) || 200 }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={retourChargeLoading || !retourChargeForm.vehicule_id || !retourChargeForm.date_debut || !retourChargeForm.date_fin}
                        onClick={async () => {
                          setRetourChargeLoading(true)
                          setRetourChargeError(null)
                          try {
                            const { data: sessionData } = await supabase.auth.getSession()
                            const token = sessionData.session?.access_token
                            if (!token) throw new Error('Session absente.')
                            // Position de reference : derniere livraison du vehicule dans les OT termines
                            const { data: lastOt } = await supabase
                              .from('ordres_transport')
                              .select('livraison_lat, livraison_lng')
                              .eq('vehicule_id', retourChargeForm.vehicule_id)
                              .eq('statut', 'livre')
                              .order('date_livraison_prevue', { ascending: false })
                              .limit(1)
                              .maybeSingle()
                            const posLat: number = (lastOt as { livraison_lat?: number | null } | null)?.livraison_lat ?? 48.8566
                            const posLng: number = (lastOt as { livraison_lng?: number | null } | null)?.livraison_lng ?? 2.3522
                            const res = await fetch('/.netlify/functions/v11-ai-placement', {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                vehicule_id: retourChargeForm.vehicule_id,
                                position_lat: posLat,
                                position_lng: posLng,
                                date_debut: retourChargeForm.date_debut,
                                date_fin: retourChargeForm.date_fin,
                                retour_depot_avant: retourChargeForm.retour_depot_avant || undefined,
                                rayon_km: retourChargeForm.rayon_km,
                                limit: 15,
                              }),
                            })
                            const json = await res.json()
                            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
                            setRetourChargeSuggestions(json.suggestions ?? [])
                          } catch (err) {
                            setRetourChargeError(err instanceof Error ? err.message : 'Erreur recherche.')
                          } finally {
                            setRetourChargeLoading(false)
                          }
                        }}
                        className="w-full rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-40 transition-colors"
                        style={{ background: '#6366f1' }}
                      >
                        {retourChargeLoading ? 'Recherche...' : 'Chercher courses'}
                      </button>
                    </div>
                  </div>

                  {retourChargeError && (
                    <p className="text-xs text-red-300 bg-red-500/10 rounded-lg px-3 py-2">{retourChargeError}</p>
                  )}

                  {!retourChargeLoading && retourChargeSuggestions.length > 0 && (
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                        <tr>
                          <th className="text-left px-3 py-2">Reference</th>
                          <th className="text-left px-3 py-2">Client</th>
                          <th className="text-left px-3 py-2">Chargement</th>
                          <th className="text-left px-3 py-2">Km a vide</th>
                          <th className="text-left px-3 py-2">Prix HT</th>
                          <th className="text-left px-3 py-2">Score</th>
                          <th className="text-left px-3 py-2">Depot OK</th>
                          <th className="text-left px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {retourChargeSuggestions.map((s, i) => {
                          const ot = [...pool, ...ganttOTs].find(o => o.id === s.id)
                          return (
                            <tr key={s.id} className="border-t border-slate-800/70 hover:bg-slate-800/40">
                              <td className="px-3 py-2">
                                <span className="mr-1.5 text-[10px] text-indigo-400 font-bold">#{i + 1}</span>
                                <span className="font-mono text-slate-300">{s.reference}</span>
                              </td>
                              <td className="px-3 py-2 text-slate-200">{s.client_nom}</td>
                              <td className="px-3 py-2 text-slate-400">{isoToDate(s.date_chargement_prevue)}</td>
                              <td className="px-3 py-2">
                                {s.dist_vide_km != null
                                  ? <span className={`font-semibold ${s.dist_vide_km < 50 ? 'text-emerald-300' : s.dist_vide_km < 150 ? 'text-amber-300' : 'text-red-300'}`}>
                                      {s.dist_vide_km} km
                                    </span>
                                  : <span className="text-slate-500">N/A</span>
                                }
                              </td>
                              <td className="px-3 py-2 text-slate-300">{s.prix_ht != null ? `${s.prix_ht.toFixed(0)} €` : '—'}</td>
                              <td className="px-3 py-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200">
                                  {s.score_rentabilite.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {s.retour_depot_ok
                                  ? <span className="text-emerald-300 text-[10px]">✓</span>
                                  : <span className="text-red-300 text-[10px]">✗</span>
                                }
                              </td>
                              <td className="px-3 py-2">
                                {ot ? (
                                  <button type="button" onClick={() => openAssign(ot)} className="text-indigo-300 hover:text-indigo-200">
                                    Affecter
                                  </button>
                                ) : (
                                  <span className="text-slate-500">—</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}

                  {!retourChargeLoading && retourChargeSuggestions.length === 0 && retourChargeForm.vehicule_id && (
                    <p className="text-xs text-slate-500 px-1">
                      Aucune suggestion. Elargissez la plage de dates ou le rayon.
                    </p>
                  )}
                </div>
              )}

              {/* ── Onglet Entrepôts : marchandises en attente de reprise ── */}
              {bottomDockTab === 'entrepots' && (
                <div className="overflow-auto p-3 space-y-3">
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-amber-300 mb-0.5">Marchandises en depot</p>
                      <p className="text-[11px] text-amber-200/70">Courses deposees dans un entrepot ou depot, en attente d un autre conducteur.</p>
                    </div>
                    <button type="button" onClick={() => void loadRelais()}
                      className="flex-shrink-0 px-2.5 py-1 text-xs rounded-lg border border-amber-600/40 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 transition-colors">
                      Actualiser
                    </button>
                  </div>
                  {relaisLoading && <p className="text-xs text-slate-500 px-1">Chargement...</p>}
                  {relaisError && <p className="text-xs text-red-400 px-1">{relaisError}</p>}
                  {!relaisLoading && (() => {
                    const enEntrepot = relaisList.filter(r => r.type_relais === 'depot_marchandise' && r.statut !== 'termine' && r.statut !== 'annule')
                    if (enEntrepot.length === 0) return (
                      <p className="text-xs text-slate-500 px-1">Aucune marchandise en depot pour l instant.</p>
                    )
                    return (
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-3 py-2 text-slate-400 font-medium">Course</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Client</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Depot / Site</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Depose le</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Reprise prevue</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Conducteur reprise</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Statut</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enEntrepot.map(relais => (
                            <tr key={relais.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                              <td className="px-3 py-2">
                                <button type="button"
                                  onClick={() => { const ot = [...pool, ...ganttOTs].find(o => o.id === relais.ot_id); if (ot) openSelected(ot) }}
                                  className="text-indigo-300 hover:text-indigo-200 font-medium">
                                  {relais.ordres_transport?.reference ?? '—'}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-slate-300">{relais.ordres_transport?.client_nom ?? '—'}</td>
                              <td className="px-3 py-2">
                                <p className="text-slate-200 font-medium">{relais.lieu_nom}</p>
                                {relais.lieu_adresse && <p className="text-slate-500 text-[10px]">{relais.lieu_adresse}</p>}
                              </td>
                              <td className="px-3 py-2 text-slate-400">{new Date(relais.date_depot).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                              <td className="px-3 py-2 text-slate-400">
                                {relais.date_reprise_prevue ? new Date(relais.date_reprise_prevue).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) : '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {relais.conducteur_reprise ? `${relais.conducteur_reprise.prenom} ${relais.conducteur_reprise.nom}` : <span className="text-slate-500 italic">Non assigne</span>}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  relais.statut === 'en_attente' ? 'bg-amber-500/20 text-amber-300' :
                                  relais.statut === 'assigne' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-emerald-500/20 text-emerald-300'
                                }`}>
                                  {relais.statut === 'en_attente' ? 'En attente' : relais.statut === 'assigne' ? 'Assigne' : 'En cours'}
                                </span>
                              </td>
                              <td className="px-3 py-2 flex items-center gap-2">
                                {relais.statut === 'en_attente' && (
                                  <button type="button" onClick={() => openRelaisAssign(relais)}
                                    className="text-indigo-300 hover:text-indigo-200 text-[11px]">Assigner reprise</button>
                                )}
                                {(relais.statut === 'assigne' || relais.statut === 'en_cours_reprise') && (
                                  <button type="button" onClick={() => void updateRelaisStatut(relais.id, 'termine')}
                                    className="text-emerald-300 hover:text-emerald-200 text-[11px]">Terminer</button>
                                )}
                                <button type="button" onClick={() => void updateRelaisStatut(relais.id, 'annule')}
                                  className="text-rose-400 hover:text-rose-300 text-[11px]">Annuler</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}
                </div>
              )}

              {/* ── Onglet Relais conducteur ── */}
              {bottomDockTab === 'relais' && (
                <div className="overflow-auto p-3 space-y-3">
                  <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-violet-300 mb-0.5">Relais conducteur</p>
                      <p className="text-[11px] text-violet-200/70">Echange de conducteur : le conducteur B rejoint le camion, ils s echangent, conducteur A rentre a l entreprise.</p>
                    </div>
                    <button type="button" onClick={() => void loadRelais()}
                      className="flex-shrink-0 px-2.5 py-1 text-xs rounded-lg border border-violet-600/40 bg-violet-900/20 text-violet-300 hover:bg-violet-900/40 transition-colors">
                      Actualiser
                    </button>
                  </div>
                  {relaisLoading && <p className="text-xs text-slate-500 px-1">Chargement...</p>}
                  {relaisError && <p className="text-xs text-red-400 px-1">{relaisError}</p>}
                  {!relaisLoading && (() => {
                    const relaisConducteur = relaisList.filter(r => r.type_relais === 'relais_conducteur' && r.statut !== 'termine' && r.statut !== 'annule')
                    if (relaisConducteur.length === 0) return (
                      <p className="text-xs text-slate-500 px-1">Aucun relais conducteur actif.</p>
                    )
                    return (
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-left">
                            <th className="px-3 py-2 text-slate-400 font-medium">Course</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Client</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Point de relais</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Cond. depart</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Cond. arrivee</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">RDV prevu</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Statut</th>
                            <th className="px-3 py-2 text-slate-400 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {relaisConducteur.map(relais => (
                            <tr key={relais.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                              <td className="px-3 py-2">
                                <button type="button"
                                  onClick={() => { const ot = [...pool, ...ganttOTs].find(o => o.id === relais.ot_id); if (ot) openSelected(ot) }}
                                  className="text-indigo-300 hover:text-indigo-200 font-medium">
                                  {relais.ordres_transport?.reference ?? '—'}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-slate-300">{relais.ordres_transport?.client_nom ?? '—'}</td>
                              <td className="px-3 py-2">
                                <p className="text-slate-200 font-medium">{relais.lieu_nom}</p>
                                {relais.lieu_adresse && <p className="text-slate-500 text-[10px]">{relais.lieu_adresse}</p>}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {relais.conducteur_depose ? `${relais.conducteur_depose.prenom} ${relais.conducteur_depose.nom}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {relais.conducteur_reprise ? `${relais.conducteur_reprise.prenom} ${relais.conducteur_reprise.nom}` : <span className="text-slate-500 italic">Non assigne</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-400">
                                {relais.date_reprise_prevue ? new Date(relais.date_reprise_prevue).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}
                              </td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  relais.statut === 'en_attente' ? 'bg-amber-500/20 text-amber-300' :
                                  relais.statut === 'assigne' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-violet-500/20 text-violet-300'
                                }`}>
                                  {relais.statut === 'en_attente' ? 'En attente' : relais.statut === 'assigne' ? 'Planifie' : 'En cours'}
                                </span>
                              </td>
                              <td className="px-3 py-2 flex items-center gap-2">
                                {relais.statut === 'en_attente' && (
                                  <button type="button" onClick={() => openRelaisAssign(relais)}
                                    className="text-indigo-300 hover:text-indigo-200 text-[11px]">Assigner</button>
                                )}
                                {relais.statut === 'assigne' && (
                                  <button type="button" onClick={() => void updateRelaisStatut(relais.id, 'en_cours_reprise')}
                                    className="text-violet-300 hover:text-violet-200 text-[11px]">Confirmer RDV</button>
                                )}
                                {relais.statut === 'en_cours_reprise' && (
                                  <button type="button" onClick={() => void updateRelaisStatut(relais.id, 'termine')}
                                    className="text-emerald-300 hover:text-emerald-200 text-[11px]">Terminer</button>
                                )}
                                <button type="button" onClick={() => void updateRelaisStatut(relais.id, 'annule')}
                                  className="text-rose-400 hover:text-rose-300 text-[11px]">Annuler</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Charge ressource</p>
              <div className="space-y-1.5 max-h-48 overflow-auto">
                {resourceLoadRows.length === 0 && <p className="text-xs text-slate-500">Aucune donnee de charge.</p>}
                {resourceLoadRows.slice(0, 12).map(item => (
                  <div key={item.rowId} className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-200 truncate">{item.label}</p>
                      <span className="text-[10px] text-slate-500">{item.missionCount} mission{item.missionCount > 1 ? 's' : ''}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">Temps planifie: {formatMinutes(item.plannedMinutes)}</span>
                      {item.conflictCount > 0 && <span className="text-rose-300">Conflits: {item.conflictCount}</span>}
                      {item.hasLate && <span className="text-red-300">Retard</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
            </>
          )}
        </div>
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
              {assignGroupMembers.length > 1 && (
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignModal(m => m ? { ...m, applyToGroupage: false } : m)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${assignModal.applyToGroupage ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-900'}`}
                    >
                      Modifier cette course
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignModal(m => m ? { ...m, applyToGroupage: true } : m)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors ${assignModal.applyToGroupage ? 'bg-indigo-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      Modifier tout le lot
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-100/90">
                    {assignModal.applyToGroupage
                      ? `Cette programmation s'appliquera aux ${assignGroupMembers.length} courses du lot ${getGroupageBubbleLabel(assignModal.ot)}.`
                      : `Seule la course ${assignModal.ot.reference} sera modifiee. Le reste du lot restera inchange.`}
                  </p>
                </div>
              )}
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
            <h3 className="text-sm font-semibold text-white mb-1">{newBlockType === 'course' ? 'Creer une course' : editingCustomBlockId ? 'Modifier un evenement planning' : 'Ajouter un evenement planning'}</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              {newBlockType === 'course'
                ? 'Creer une course directement depuis la ligne du planning.'
                : editingCustomBlockId
                ? 'Ajustez le type, le libelle ou la duree du bloc selectionne.'
                : 'Ajoutez un HLP, une pause, une maintenance ou un autre bloc directement sur la ligne choisie.'}
            </p>
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
            {newBlockType !== 'course' && (
              <>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Date debut</span>
                    <input
                      type="date"
                      value={newBlockDateChargement}
                      onChange={e => setNewBlockDateChargement(e.target.value)}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Heure debut</span>
                    <input
                      type="time"
                      step={300}
                      value={newBlockTimeChargement}
                      onChange={e => setNewBlockTimeChargement(e.target.value)}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>
                {nearestPlanningCourseSuggestion && (
                  <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <p className="text-[11px] font-semibold text-amber-100">
                      Course la plus proche : {nearestPlanningCourseSuggestion.ot.reference}
                    </p>
                    <p className="mt-1 text-[10px] text-amber-200/80">
                      {nearestPlanningCourseSuggestion.preferredMode === 'before'
                        ? 'Ce type de bloc est propose en priorite avant le depart de la course.'
                        : 'Ce type de bloc est propose en priorite a la fin de la course.'}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPlanningEventStart(nearestPlanningCourseSuggestion.beforeStartISO)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-800 ${nearestPlanningCourseSuggestion.preferredMode === 'before' ? 'border-amber-300/60 bg-amber-400/20 text-amber-50' : 'border-amber-400/30 bg-slate-900/60 text-amber-100'}`}
                      >
                        Coller avant · {nearestPlanningCourseSuggestion.beforeLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanningEventStart(nearestPlanningCourseSuggestion.afterStartISO)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-800 ${nearestPlanningCourseSuggestion.preferredMode === 'after' ? 'border-amber-300/60 bg-amber-400/20 text-amber-50' : 'border-amber-400/30 bg-slate-900/60 text-amber-100'}`}
                      >
                        Coller apres · {nearestPlanningCourseSuggestion.afterLabel}
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Duree heures</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={newBlockDurationHours}
                      onChange={e => setPlanningEventDurationAndSync(e.target.value, newBlockDurationMinutes)}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Duree minutes</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={5}
                      value={newBlockDurationMinutes}
                      onChange={e => setPlanningEventDurationAndSync(newBlockDurationHours, e.target.value)}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Date fin</span>
                    <input
                      type="date"
                      value={newBlockDateLivraison}
                      onChange={e => setPlanningEventEndAndSync(toDateTimeISO(e.target.value, newBlockTimeLivraison))}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-slate-400">Heure fin</span>
                    <input
                      type="time"
                      step={300}
                      value={newBlockTimeLivraison}
                      onChange={e => setPlanningEventEndAndSync(toDateTimeISO(newBlockDateLivraison, e.target.value))}
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                    />
                  </label>
                </div>
              </>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setAddBlockFor(null); setEditingCustomBlockId(null) }} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
              <button onClick={() => void addCustomBlock()} disabled={creatingInlineEvent} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-60">
                {creatingInlineEvent ? 'Creation...' : newBlockType === 'course' ? 'Creer la course' : editingCustomBlockId ? 'Mettre a jour' : 'Ajouter'}
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
                  {selected.groupage_id && <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${selected.groupage_fige ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'}`}>{selected.groupage_fige ? 'GRP FIGE' : 'GRP'}</span>}
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
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Details course</p>
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
                  {(['chargement', 'livraison'] as const).map(kind => {
                    const draft = editSiteDrafts[kind]
                    const selectedSiteId = kind === 'chargement' ? editDraft.chargement_site_id : editDraft.livraison_site_id
                    const selectedSite = selectedSiteId ? logisticSites.find(site => site.id === selectedSiteId) ?? null : null
                    const filteredSites = logisticSites.filter(site => siteSupportsKind(site, kind))
                    const title = kind === 'chargement' ? 'Lieu de chargement' : 'Lieu de livraison'
                    const placeholder = kind === 'chargement' ? 'Ex: Quai 2 - Entrepot Nord' : 'Ex: Magasin central'
                    const addressPlaceholder = kind === 'chargement'
                      ? 'Saisissez une adresse ou detectez-la sur carte'
                      : 'Saisissez une adresse ou posez un point GPS'
                    return (
                      <div key={kind} className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/55 p-3 space-y-2.5">
                        <label className="block">
                          <span className="text-[10px] text-slate-500">{title}</span>
                          <select
                            value={selectedSiteId}
                            onChange={e => setEditDraft(d => d && {
                              ...d,
                              ...(kind === 'chargement'
                                ? { chargement_site_id: e.target.value }
                                : { livraison_site_id: e.target.value }),
                            })}
                            className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                          >
                            <option value="">Selectionner</option>
                            {filteredSites.map(site => (
                              <option key={site.id} value={site.id}>{site.nom} - {site.adresse}</option>
                            ))}
                          </select>
                        </label>
                        {selectedSite && (
                          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-2 text-[11px] text-slate-300">
                            <p className="font-medium text-slate-200">{selectedSite.nom}</p>
                            <p className="mt-0.5 text-slate-400">{selectedSite.adresse}</p>
                          </div>
                        )}
                        <details className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                          <summary className="cursor-pointer text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Ajouter ou lier une adresse
                          </summary>
                          <div className="mt-2.5 space-y-2">
                            <div className="grid grid-cols-2 gap-2.5">
                            <label className="block">
                              <span className="text-[10px] text-slate-500">Entreprise rattachee</span>
                              <select
                                value={draft.entreprise_id}
                                onChange={e => setEditSiteDraft(kind, 'entreprise_id', e.target.value)}
                                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                              >
                                <option value="">Selectionner</option>
                                {clients.map(client => <option key={client.id} value={client.id}>{client.nom}</option>)}
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-[10px] text-slate-500">Nom du lieu</span>
                              <input
                                value={draft.nom}
                                onChange={e => setEditSiteDraft(kind, 'nom', e.target.value)}
                                placeholder={placeholder}
                                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                              />
                            </label>
                            <label className="col-span-2 block">
                              <span className="text-[10px] text-slate-500">Adresse</span>
                              <input
                                value={draft.adresse}
                                onChange={e => setEditSiteDraft(kind, 'adresse', e.target.value)}
                                placeholder={addressPlaceholder}
                                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] text-slate-500">Usage du lieu</span>
                              <select
                                value={draft.usage_type}
                                onChange={e => setEditSiteDraft(kind, 'usage_type', e.target.value as SiteUsageType)}
                                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
                              >
                                {Object.entries(SITE_USAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                              </select>
                            </label>
                            <label className="block">
                              <span className="text-[10px] text-slate-500">Jours d ouverture</span>
                              <input
                                value={draft.jours_ouverture}
                                onChange={e => setEditSiteDraft(kind, 'jours_ouverture', e.target.value)}
                                placeholder="Ex: Lun-Ven"
                                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                              />
                            </label>
                            <label className="block">
                              <span className="text-[10px] text-slate-500">Horaires d ouverture</span>
                              <input
                                value={draft.horaires_ouverture}
                                onChange={e => setEditSiteDraft(kind, 'horaires_ouverture', e.target.value)}
                                placeholder="Ex: 08:00-12:00 / 14:00-18:00"
                                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                              />
                            </label>
                            <label className="col-span-2 block">
                              <span className="text-[10px] text-slate-500">Specificites du lieu</span>
                              <textarea
                                value={draft.notes_livraison}
                                onChange={e => setEditSiteDraft(kind, 'notes_livraison', e.target.value)}
                                placeholder="Quai, badge, acces PL, securite, horaires..."
                                className="mt-0.5 h-20 w-full resize-none bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors placeholder-slate-600"
                              />
                            </label>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setEditSiteDraft(kind, 'showMap', !draft.showMap)}
                                className="text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
                              >
                                {draft.showMap ? 'Masquer la carte' : 'Poser un point GPS sur la carte'}
                              </button>
                              <button
                                type="button"
                                onClick={() => resetEditSiteDraft(kind)}
                                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                              >
                                Reinitialiser
                              </button>
                            </div>
                            {draft.showMap && (
                              <div className="rounded-lg border border-slate-800 overflow-hidden bg-white">
                                <SiteMapPicker
                                  onPick={({ latitude, longitude, adresse }) => {
                                    setEditSiteDraft(kind, 'latitude', latitude)
                                    setEditSiteDraft(kind, 'longitude', longitude)
                                    setEditSiteDraft(kind, 'adresse', adresse)
                                  }}
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => { void createOrSelectPlanningSite(kind) }}
                              className="w-full rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-500/20 transition-colors"
                            >
                              Enregistrer puis selectionner ce lieu
                            </button>
                          </div>
                        </details>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Statut operationnel */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Statut operationnel</p>
                <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-3 space-y-2.5">
                  <p className="text-[11px] text-slate-400">
                    Statut actuel: <span className="font-semibold text-slate-200">{editDraft.statut_operationnel ? (STATUT_OPS[editDraft.statut_operationnel as StatutOps]?.label ?? editDraft.statut_operationnel) : 'Non defini'}</span>
                  </p>
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

              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Groupage</p>
                <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-900/55 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${selected.groupage_id ? (selected.groupage_fige ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300') : 'bg-slate-800 text-slate-400'}`}>
                      {selected.groupage_id ? (selected.groupage_fige ? 'Lot fige' : 'Lot deliable') : 'Hors groupage'}
                    </span>
                    {selected.groupage_id && (
                      <span className="text-[10px] text-slate-500">{selectedGroupMembers.length} course{selectedGroupMembers.length > 1 ? 's' : ''} dans le lot</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={groupageTargetId}
                      onChange={e => setGroupageTargetId(e.target.value)}
                      disabled={selected.groupage_fige}
                      className="flex-1 min-w-[220px] bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                    >
                      <option value="">Selectionner une course a lier</option>
                      {planningGroupageCandidates.map(item => (
                        <option key={item.id} value={item.id}>{item.reference} - {item.client_nom}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => { void linkSelectedToGroupage() }}
                      disabled={!groupageTargetId || selected.groupage_fige}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      Lier
                    </button>
                    <button
                      type="button"
                      onClick={() => { void toggleSelectedGroupageFreeze(!selected.groupage_fige) }}
                      disabled={!selected.groupage_id}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {selected.groupage_fige ? 'Defiger le lot' : 'Figer le lot'}
                    </button>
                  </div>

                  {selectedGroupMembers.length > 0 && (
                    <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-2">
                      <p className="text-[10px] font-semibold text-slate-300 mb-1.5">Courses du lot</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedGroupMembers.map(item => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => openSelected(item)}
                            className={`rounded-full px-2 py-1 text-[10px] transition-colors ${item.id === selected.id ? 'bg-indigo-500/30 text-indigo-100' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                          >
                            {item.reference}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
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
              {selected.groupage_id && !selected.groupage_fige && (
                <button onClick={() => { void unlinkCourseFromGroupage(selected) }}
                  className="py-2 px-3 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-900/20 rounded-lg border border-amber-900/30 transition-colors">
                  Delier du groupage
                </button>
              )}
              {selected.groupage_id && (
                <button onClick={() => { void toggleSelectedGroupageFreeze(!selected.groupage_fige) }}
                  className="py-2 px-3 text-xs text-indigo-300 hover:text-indigo-200 hover:bg-indigo-900/20 rounded-lg border border-indigo-900/30 transition-colors">
                  {selected.groupage_fige ? 'Defiger le lot' : 'Figer le lot'}
                </button>
              )}
              {selectedGroupMembers.length > 1 && !selected.groupage_fige && (
                <button onClick={() => openAssign(selected, undefined, undefined, undefined, true)}
                  className="py-2 px-3 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/20 rounded-lg border border-emerald-900/30 transition-colors">
                  Modifier tout le lot
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
                  {(() => {
                    const sameGroupage = sharesSameGroupage(conflict.first, conflict.second)
                    const frozenGroupage = sameGroupage && (conflict.first.groupage_fige || conflict.second.groupage_fige)
                    const linkActionKey = `${conflict.first.id}:${conflict.second.id}:link`
                    const freezeActionKey = `${conflict.first.id}:${conflict.second.id}:freeze`
                    return (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-400">
                          {frozenGroupage
                            ? 'Lot deja verrouille sur cette paire.'
                            : sameGroupage
                            ? 'Lot deliable deja cree. Vous pouvez maintenant le verrouiller.'
                            : 'Proposer un groupage deliable ou valider un lot verrouille pour cette paire.'}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { void applyConflictGroupage(conflict, false) }}
                            disabled={sameGroupage || conflictActionKey !== null}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-500/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50 disabled:hover:bg-emerald-500/10 transition-colors"
                          >
                            {conflictActionKey === linkActionKey ? 'Creation...' : sameGroupage ? 'Deja groupees' : 'Proposer groupage'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { void applyConflictGroupage(conflict, true) }}
                            disabled={frozenGroupage || conflictActionKey !== null}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-indigo-500/35 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50 disabled:hover:bg-indigo-500/10 transition-colors"
                          >
                            {conflictActionKey === freezeActionKey ? 'Validation...' : frozenGroupage ? 'Lot verrouille' : sameGroupage ? 'Verrouiller le lot' : 'Valider et verrouiller'}
                          </button>
                        </div>
                      </div>
                    )
                  })()}
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
              {contextMenu.ot.groupage_id && <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${contextMenu.ot.groupage_fige ? 'bg-indigo-600/30 text-indigo-300' : 'bg-amber-500/20 text-amber-300'}`}>{contextMenu.ot.groupage_fige ? 'GRP FIGE' : 'GRP'}</span>}
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

            {contextMenu.ot.groupage_id && !contextMenu.ot.groupage_fige && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-300 hover:bg-amber-900/20 hover:text-amber-200 transition-colors text-left"
                onClick={() => {
                  const target = contextMenu.ot
                  setContextMenu(null)
                  void unlinkCourseFromGroupage(target)
                }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 12h6"/><path d="M4 7h5a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H4"/><path d="M20 17h-5a3 3 0 0 1-3-3v0a3 3 0 0 1 3-3h5"/>
                </svg>
                Delier du groupage
              </button>
            )}

            {contextMenu.ot.groupage_id && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-indigo-300 hover:bg-indigo-900/20 hover:text-indigo-200 transition-colors text-left"
                onClick={() => {
                  const target = contextMenu.ot
                  setContextMenu(null)
                  if (selected?.id !== target.id) openSelected(target)
                  void toggleGroupageFreeze(target, !target.groupage_fige)
                }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/><rect x="4" y="11" width="16" height="10" rx="2"/>
                </svg>
                {contextMenu.ot.groupage_fige ? 'Defiger le lot' : 'Figer le lot'}
              </button>
            )}

            <div className="border-t border-slate-800 my-1"/>

            {/* Déposer en dépôt */}
            {(['planifie','en_cours','livre','confirme'].includes(contextMenu.ot.statut)) && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-300 hover:bg-amber-900/20 hover:text-amber-200 transition-colors text-left"
                onClick={() => openRelaisDepot(contextMenu.ot, 'depot_marchandise')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 9l9-6 9 6v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Deposer en entrepot / depot
              </button>
            )}

            {/* Relais conducteur */}
            {(['planifie','en_cours'].includes(contextMenu.ot.statut)) && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-violet-300 hover:bg-violet-900/20 hover:text-violet-200 transition-colors text-left"
                onClick={() => openRelaisDepot(contextMenu.ot, 'relais_conducteur')}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 21v-2a6 6 0 0 1 6-6h1m3 0h1a6 6 0 0 1 6 6v2"/><path d="M12 12v4m0 0-2-2m2 2 2-2"/>
                </svg>
                Relais conducteur (echange)
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

      {/* ── Modales Relais ─────────────────────────────────────────────────── */}

      {/* Modale Dépôt marchandise */}
      {(relaisModal.mode === 'depot' || relaisModal.mode === 'relais_conducteur') && relaisModal.ot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setRelaisModal({ mode: null, ot: null, relais: null })}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">
                {relaisModal.mode === 'relais_conducteur' ? 'Relais conducteur' : 'Deposer en entrepot / depot'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Course {relaisModal.ot.reference} — {relaisModal.ot.client_nom}</p>
            </div>
            <form onSubmit={e => void submitRelaisDepot(e)} className="p-5 space-y-4">
              {/* Site logistique */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Site connu (optionnel)</label>
                <select
                  value={relaisDepotForm.site_id}
                  onChange={e => {
                    const s = relaisDepotSites.find(x => x.id === e.target.value)
                    setRelaisDepotForm(f => ({
                      ...f,
                      site_id: e.target.value,
                      lieu_nom: s?.nom ?? f.lieu_nom,
                      lieu_adresse: s?.adresse ?? f.lieu_adresse,
                    }))
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">— Saisie libre —</option>
                  {relaisDepotSites.map(s => (
                    <option key={s.id} value={s.id}>{s.nom}{s.ville ? ` (${s.ville})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Lieu libre si pas de site */}
              {!relaisDepotForm.site_id && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {relaisModal.mode === 'relais_conducteur' ? 'Point de rendez-vous *' : 'Nom du depot *'}
                    </label>
                    <input required
                      value={relaisDepotForm.lieu_nom}
                      onChange={e => setRelaisDepotForm(f => ({ ...f, lieu_nom: e.target.value }))}
                      placeholder={relaisModal.mode === 'relais_conducteur' ? 'ex: Aire A7 km 142, Montélimar' : 'ex: Entrepôt Nexora Lille'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Adresse (optionnel)</label>
                    <input
                      value={relaisDepotForm.lieu_adresse}
                      onChange={e => setRelaisDepotForm(f => ({ ...f, lieu_adresse: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500" />
                  </div>
                </>
              )}

              {/* Date dépôt / RDV */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.mode === 'relais_conducteur' ? 'Date / heure du RDV' : 'Date de depot'}
                </label>
                <input type="datetime-local"
                  value={relaisDepotForm.date_depot}
                  onChange={e => setRelaisDepotForm(f => ({ ...f, date_depot: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>

              {/* Véhicule */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.mode === 'relais_conducteur' ? 'Conducteur qui repart (conducteur A)' : 'Conducteur qui dépose'}
                </label>
                <select
                  value={relaisDepotForm.conducteur_depose_id}
                  onChange={e => setRelaisDepotForm(f => ({ ...f, conducteur_depose_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">— Aucun —</option>
                  {conducteurs.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea rows={2}
                  value={relaisDepotForm.notes}
                  onChange={e => setRelaisDepotForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRelaisModal({ mode: null, ot: null, relais: null })}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">Annuler</button>
                <button type="submit" disabled={relaisSaving}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition-colors">
                  {relaisSaving ? 'Enregistrement...' : relaisModal.mode === 'relais_conducteur' ? 'Creer le relais' : 'Deposer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Affectation reprise */}
      {relaisModal.mode === 'assign' && relaisModal.relais && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setRelaisModal({ mode: null, ot: null, relais: null })}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">
                {relaisModal.relais.type_relais === 'relais_conducteur' ? 'Affecter conducteur de relais' : 'Affecter la reprise'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {relaisModal.relais.lieu_nom}
                {relaisModal.relais.ordres_transport ? ` — Course ${relaisModal.relais.ordres_transport.reference}` : ''}
              </p>
            </div>
            <form onSubmit={e => void submitRelaisAssign(e)} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.relais.type_relais === 'relais_conducteur' ? 'Conducteur B (continue la route)' : 'Conducteur qui reprend'}
                </label>
                <select
                  value={relaisAssignForm.conducteur_reprise_id}
                  onChange={e => setRelaisAssignForm(f => ({ ...f, conducteur_reprise_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">— Aucun —</option>
                  {conducteurs.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>

              {relaisModal.relais.type_relais === 'depot_marchandise' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Vehicule pour la reprise</label>
                  <select
                    value={relaisAssignForm.vehicule_reprise_id}
                    onChange={e => setRelaisAssignForm(f => ({ ...f, vehicule_reprise_id: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                    <option value="">— Aucun —</option>
                    {vehicules.map(v => (
                      <option key={v.id} value={v.id}>{v.immatriculation}{v.modele ? ` — ${v.modele}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.relais.type_relais === 'relais_conducteur' ? 'Date / heure RDV' : 'Date de reprise prevue'}
                </label>
                <input type="datetime-local"
                  value={relaisAssignForm.date_reprise_prevue}
                  onChange={e => setRelaisAssignForm(f => ({ ...f, date_reprise_prevue: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes</label>
                <textarea rows={2}
                  value={relaisAssignForm.notes}
                  onChange={e => setRelaisAssignForm(f => ({ ...f, notes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setRelaisModal({ mode: null, ot: null, relais: null })}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">Annuler</button>
                <button type="submit" disabled={relaisSaving}
                  className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-colors">
                  {relaisSaving ? 'Enregistrement...' : 'Affecter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}



