import { useState, useEffect, useRef, useCallback, useMemo, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ST_BROUILLON, ST_CONFIRME, ST_PLANIFIE, ST_EN_COURS, ST_TERMINE } from '@/lib/transportCourses'
import { looseSupabase } from '@/lib/supabaseLoose'
import { STATUT_OPS, StatutOpsDot, type StatutOps } from '@/lib/statut-ops'
import SiteMapPicker from '@/components/transports/SiteMapPicker'
import RouteOptimizerPanel from '@/components/transports/RouteOptimizerPanel'
import { ComplianceCountersBar } from '@/components/planning/ComplianceCountersBar'
import {
  getAffretementContextByOtId,
  listAffretementContracts,
  listAffreteurEquipments,
  subscribeAffretementPortalUpdates,
  type AffretementContract,
} from '@/lib/affretementPortal'
import { validatePlanningDropAudit, type CEAlert } from '@/lib/ce561Validation'
import { validateTrailerAssignment } from '@/lib/trailerValidation'
import { createLogisticSite, updateLogisticSite, type LogisticSite } from '@/lib/transportCourses'
import { addCourseToMission, createMissionFromCourses, removeCourseFromMission } from '@/lib/transportMissions'
import { listCourseTemplates, saveCourseTemplate, deleteCourseTemplate, type CourseTemplate } from '@/lib/courseTemplates'
import { listPersonsForDirectory } from '@/lib/services/personsService'
import { listAssets } from '@/lib/services/assetsService'
import { fetchCustomRows, fetchCustomBlocks, deleteCustomRow as dbDeleteCustomRow, deleteCustomBlock as dbDeleteCustomBlock, type RemoteCustomRow, type RemoteCustomBlock } from '@/lib/planningCustomBlocks'
import { generatePlanningWeekPDF } from '@/lib/planningPdf'
import { fetchAllAbsencesValideesPeriode, TYPE_ABSENCE_LABELS, type AbsenceRh } from '@/lib/absencesRh'
import { useAuth } from '@/lib/auth'
import { usePlanningCompliance } from '@/hooks/useCompliancePlanning'
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange'
import type {
  OT, Conducteur, Vehicule, Remorque, ClientRef, Affectation,
  Tab, ViewMode, PlanningScope, ColorMode,
  AssignForm, EditDraft,
  PlanningInlineType, CustomRow, CustomBlock,
  DragState, NativeDragPayload, BlockMetrics, RowOrderMap, ContextMenu,
  AffretementContext, RowConflict, BottomDockTab,
  TransportRelaisStatut, TypeRelais, TransportRelaisRecord,
  RelaisModal, RelaisDepotForm, RelaisAssignForm,
  RetourChargeSuggestion, RetourChargeForm,
  SiteUsageType, SiteKind, SiteDraft, SiteLoadRow,
  GeneratedInlineEvent,
} from './planning/planningTypes'
import {
  getUpdateFailureReason, ACTIVE_AFFRETEMENT_STATUSES,
  getMonday, addDays, toISO, parseDay, daysDiff,
  getMonthStart, addMonths, getMonthDays, MONTH_FULL_NAMES,
  snapToQuarter, toDateTimeISO, toDateTimeFromDate, isoToTime, isoToDate,
  DAY_NAMES, fmtWeek, fmtDay, toTimeValue,
  getWeekBlockMetrics, blockPos, DAY_START_MIN, DAY_TOTAL_MIN, getDayBlockMetrics, blockPosDay,
  STATUT_CLS, BADGE_CLS, STATUT_LABEL, CUSTOM_COLORS, INLINE_EVENT_COLORS, INLINE_EVENT_LABELS, COLOR_PALETTE, TYPE_TRANSPORT_COLORS,
  SITE_USAGE_LABELS, normalizeAddressValue, siteSupportsKind, sortLogisticSites, makeEmptySiteDraft, mapSiteLoadRow,
  ROWS_KEY, BLOCKS_KEY,
  SIMULATION_MODE_KEY, AUTO_HABILLAGE_KEY, AUTO_PAUSE_KEY,
  PLANNING_HEADER_COLLAPSED_KEY, BOTTOM_DOCK_HEIGHT_KEY, BOTTOM_DOCK_COLLAPSED_KEY,
  PLANNING_SCOPE_KEY,
  COMPLIANCE_RULE_LABELS, DEFAULT_BLOCKING_RULE_CODES,
  loadCustomRows, saveCustomRows, loadCustomBlocks, saveCustomBlocks,
  loadConductorColors, saveConductorColors, loadRowOrder, saveRowOrder,
  loadShowAffretementAssets,
  loadComplianceBlockMode, saveComplianceBlockMode,
  loadComplianceBlockingRules, saveComplianceBlockingRules,
  loadBooleanSetting, saveBooleanSetting, loadNumberSetting, saveNumberSetting,
  uid,
} from './planning/planningUtils'
import {
  applyAssignDurationFromStart,
  formatAssignDurationLabel,
  getAssignScheduleMeta,
  shiftAssignStartKeepingDuration,
  updateAssignStartKeepingDuration,
} from './planning/planningAssignUtils'
import {
  buildRowConflicts,
  findOverlapTargetInRow,
  getOtInterval,
} from './planning/planningConflictUtils'
import { buildPlanningUrgences } from './planning/planningUrgenceUtils'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'nexora_sidebar_collapsed_v2'
const SIDEBAR_COLLAPSED_EVENT = 'nexora:sidebar-collapsed-change'
const EXPLOITANT_FEATURES_KEY = 'nexora_planning_exploitant_features_v1'
const ASSIGNMENT_IMPOSSIBLE_BLOCK_KEY = 'nexora_planning_assignment_impossible_block_v1'

type ExploitantFeatureKey =
  | 'tab_urgences'
  | 'tab_non_affectees'
  | 'tab_conflits'
  | 'tab_affretement'
  | 'tab_groupages'
  | 'tab_non_programmees'
  | 'tab_annulees'
  | 'tab_entrepots'
  | 'tab_relais'
  | 'tab_retour_charge'
  | 'action_affecter'
  | 'action_groupage'
  | 'action_relais'
  | 'action_notifier_client'
  | 'action_optimize_tour'
  | 'action_resoudre_conflits'

const EXPLOITANT_FEATURE_DEFAULTS: Record<ExploitantFeatureKey, boolean> = {
  tab_urgences: true,
  tab_non_affectees: true,
  tab_conflits: true,
  tab_affretement: true,
  tab_groupages: true,
  tab_non_programmees: true,
  tab_annulees: true,
  tab_entrepots: true,
  tab_relais: true,
  tab_retour_charge: true,
  action_affecter: true,
  action_groupage: true,
  action_relais: true,
  action_notifier_client: true,
  action_optimize_tour: true,
  action_resoudre_conflits: true,
}

function normalizeResourceStatus(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function isDriverActiveStatus(value: string | null | undefined): boolean {
  const normalized = normalizeResourceStatus(value)
  if (!normalized) return true
  return !['inactif', 'inactive', 'disabled', 'archive', 'archived'].includes(normalized)
}

function isAssetAvailableStatus(value: string | null | undefined): boolean {
  const normalized = normalizeResourceStatus(value)
  if (!normalized) return true
  return !['hors_service', 'out_of_service', 'inactive', 'inactif', 'archive', 'archived'].includes(normalized)
}

export default function Planning() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const planningComplianceService = usePlanningCompliance()
  // Guard contre les race conditions : on ne rechargera pas pendant une �criture active.
  const isMutatingRef = useRef(false)
  // -- Performance : �tat de chargement et transition non-bloquante --
  const [isLoadingOTs, setIsLoadingOTs] = useState(true)
  const [, startTransition] = useTransition()
  // Cache des donn�es r�f�rentielles (conducteurs, v�hicules, etc.) � recharg�es max 1�/60s
  const refDataCacheRef = useRef<{ ts: number; conducteurs: Conducteur[]; vehicules: Vehicule[]; remorques: Remorque[]; clients: ClientRef[]; sites: LogisticSite[]; affectations: Affectation[] } | null>(null)
  const REF_DATA_TTL = 60_000 // 60 secondes
  const [weekStart,   setWeekStart]   = useState(() => getMonday(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => toISO(new Date()))
  const [monthStart,  setMonthStart]  = useState(() => getMonthStart(new Date()))
  const [tab,         setTab]         = useState<Tab>('conducteurs')
  const [viewMode,    setViewMode]    = useState<ViewMode>('semaine')
  useScrollToTopOnChange(tab)
  useScrollToTopOnChange(viewMode)
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
  const [conducteurAbsences, setConducteurAbsences] = useState<Map<string, AbsenceRh[]>>(new Map())
  const [assignModal,  setAssignModal]  = useState<AssignForm | null>(null)
  const [assignKeepDuration, setAssignKeepDuration] = useState(true)
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
  // Throttle drag-over updates via RAF to avoid per-frame re-renders causing jitter
  const hoverRowRef = useRef<{ rowId:string; dayIdx:number; timeMin:number } | null>(null)
  const dragOverRafRef = useRef<number | null>(null)

  const liveConducteurId = useMemo(() => {
    if (tab !== 'conducteurs') return null
    if (hoverRow?.rowId) return hoverRow.rowId
    if (assignModal?.conducteur_id) return assignModal.conducteur_id
    return null
  }, [tab, hoverRow?.rowId, assignModal?.conducteur_id])

  const liveComplianceDate = useMemo(() => parseDay(selectedDay), [selectedDay])
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

  // Mod�les de courses
  const [courseTemplates,     setCourseTemplates]     = useState<CourseTemplate[]>([])
  const [saveAsTemplateLabel, setSaveAsTemplateLabel] = useState('')
  const [showSaveTemplate,    setShowSaveTemplate]    = useState(false)
  const [savingTemplate,      setSavingTemplate]      = useState(false)

  // Notification client
  const [notifyClientOt, setNotifyClientOt] = useState<OT | null>(null)
  const [notifyMessage,  setNotifyMessage]  = useState('')

  // Mini-carte itin�raire (tooltip hover)
  const [hoveredBlock,   setHoveredBlock]   = useState<{ ot: OT; x: number; y: number } | null>(null)
  const hoveredMissionId = !drag && hoveredBlock?.ot.mission_id ? hoveredBlock.ot.mission_id : null

  function openHoverPreview(ot: OT, clientX: number, clientY: number) {
    if (drag) return
    setHoveredBlock({ ot, x: clientX, y: clientY })
  }

  function clearHoverPreview() {
    if (drag) return
    setHoveredBlock(null)
  }

  function getMissionHoverClasses(groupId?: string | null, frozen = false): string {
    if (!hoveredMissionId) return ''
    if (!groupId || groupId !== hoveredMissionId) return 'opacity-40 saturate-50'
    return frozen
      ? 'z-20 ring-2 ring-indigo-300/85 shadow-[0_0_0_1px_rgba(165,180,252,0.4),0_0_24px_rgba(99,102,241,0.18)]'
      : 'z-20 ring-2 ring-amber-300/85 shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_0_24px_rgba(251,191,36,0.18)]'
  }

  function getMissionListRowClasses(groupId?: string | null, frozen = false, clickable = false): string {
    const interactive = clickable ? 'cursor-pointer' : ''
    if (!hoveredMissionId) return `border-t border-slate-800/70 hover:bg-slate-800/40 ${interactive}`
    if (!groupId || groupId !== hoveredMissionId) return `border-t border-slate-800/70 opacity-45 ${interactive}`
    return `border-t border-slate-800/70 ${interactive} ${frozen ? 'bg-indigo-500/12 ring-1 ring-inset ring-indigo-400/35' : 'bg-amber-300/10 ring-1 ring-inset ring-amber-300/35'}`
  }

  // Modale de confirmation (remplace window.confirm)
  const [confirmModal, setConfirmModal] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null)

  function showConfirm(message: string): Promise<boolean> {
    return new Promise(resolve => setConfirmModal({ message, resolve }))
  }

  // Couleurs conducteurs
  const [conductorColors, setConductorColors] = useState<Record<string,string>>(() => loadConductorColors())
  const [colorPickerFor,  setColorPickerFor]  = useState<string | null>(null)
  const [colorMode,       setColorMode]       = useState<ColorMode>('statut')
  const [affretementContracts, setAffretementContracts] = useState<AffretementContract[]>(() => listAffretementContracts())
  const [showAffretementAssets] = useState<boolean>(() => loadShowAffretementAssets())
  const [blockOnCompliance, setBlockOnCompliance] = useState<boolean>(() => loadComplianceBlockMode())
  const [blockImpossibleAssignments, setBlockImpossibleAssignments] = useState<boolean>(() => loadBooleanSetting(ASSIGNMENT_IMPOSSIBLE_BLOCK_KEY, true))
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
  const [collapsedPoolGroups, setCollapsedPoolGroups] = useState<Set<string>>(new Set())
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
  const [showExploitantControls, setShowExploitantControls] = useState(false)
  const [exploitantFeatures, setExploitantFeatures] = useState<Record<ExploitantFeatureKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(EXPLOITANT_FEATURES_KEY)
      const parsed = raw ? JSON.parse(raw) as Partial<Record<ExploitantFeatureKey, boolean>> : {}
      return { ...EXPLOITANT_FEATURE_DEFAULTS, ...parsed }
    } catch {
      return { ...EXPLOITANT_FEATURE_DEFAULTS }
    }
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [isDesktopViewport, setIsDesktopViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(min-width: 1024px)').matches
  })
  const [groupageTargetId, setGroupageTargetId] = useState('')
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false)
  const [optimizerConducteurId, setOptimizerConducteurId] = useState<string | null>(null)

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
  const [retourChargeIaConnected, setRetourChargeIaConnected] = useState(false)

  // -- Radar km � vide ---------------------------------------------------------
  const [kmVideSynthese, setKmVideSynthese] = useState<Map<string, { taux_charge_pct: number | null; total_km_vide_estime: number | null }>>(new Map())

  // -- Relais ------------------------------------------------------------------
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
  const [driverPrintMenu, setDriverPrintMenu] = useState<{ x: number; y: number; rowId: string; rowLabel: string } | null>(null)

  // Ordre des lignes
  const [rowOrder,      setRowOrder]      = useState<RowOrderMap>(() => loadRowOrder())
  const [isRowEditMode, setIsRowEditMode] = useState(false)
  const [draggingRowId, setDraggingRowId] = useState<string | null>(null)
  const [dragOverRowId, setDragOverRowId] = useState<string | null>(null)

  const noticeTimerRef = useRef<number | null>(null)
  const lastLoadErrorRef = useRef<string | null>(null)
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
    localStorage.setItem(EXPLOITANT_FEATURES_KEY, JSON.stringify(exploitantFeatures))
  }, [exploitantFeatures])

  useEffect(() => {
    function syncSidebarState() {
      try {
        setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === '1')
      } catch {
        setSidebarCollapsed(false)
      }
    }

    syncSidebarState()
    window.addEventListener('storage', syncSidebarState)
    window.addEventListener(SIDEBAR_COLLAPSED_EVENT, syncSidebarState)

    return () => {
      window.removeEventListener('storage', syncSidebarState)
      window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, syncSidebarState)
    }
  }, [])

  useEffect(() => {
    function syncViewport() {
      setIsDesktopViewport(window.matchMedia('(min-width: 1024px)').matches)
    }

    syncViewport()
    window.addEventListener('resize', syncViewport)
    return () => window.removeEventListener('resize', syncViewport)
  }, [])

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

  const isFeatureEnabled = useCallback((key: ExploitantFeatureKey) => exploitantFeatures[key] ?? true, [exploitantFeatures])

  const toggleExploitantFeature = useCallback((key: ExploitantFeatureKey) => {
    setExploitantFeatures(current => ({ ...current, [key]: !(current[key] ?? true) }))
  }, [])

  const applyExploitantPreset = useCallback((preset: 'leger' | 'complet') => {
    if (preset === 'complet') {
      setExploitantFeatures({ ...EXPLOITANT_FEATURE_DEFAULTS })
      return
    }
    setExploitantFeatures({
      ...EXPLOITANT_FEATURE_DEFAULTS,
      tab_affretement: false,
      tab_annulees: false,
      tab_entrepots: false,
      tab_relais: false,
      tab_retour_charge: false,
      action_relais: false,
      action_optimize_tour: false,
    })
  }, [])

  function clampInt(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)))
  }

  function buildInlineFallbackPrediction(ot: OT, rowId: string): {
    hlpBeforeMinutes: number
    maintenanceAfterMinutes: number
    pauseOffsetMinutes: number
    pauseDurationMinutes: number
  } {
    const startMs = new Date(ot.date_chargement_prevue ?? '').getTime()
    const endMs = new Date(ot.date_livraison_prevue ?? ot.date_chargement_prevue ?? '').getTime()
    const durationMinutes = Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? Math.round((endMs - startMs) / 60000)
      : 240

    const distanceKm = ot.distance_km && ot.distance_km > 0
      ? ot.distance_km
      : Math.max(45, Math.round(durationMinutes * 0.9))

    const rowDensity = ganttOTs
      .filter(item => resolveRowId(item) === rowId && item.id !== ot.id && !customOTIds.has(item.id))
      .filter(item => {
        const itemStart = new Date(item.date_chargement_prevue ?? '').getTime()
        const itemEnd = new Date(item.date_livraison_prevue ?? item.date_chargement_prevue ?? '').getTime()
        if (!Number.isFinite(itemStart) || !Number.isFinite(itemEnd)) return false
        const overlapWindow = 8 * 60 * 60 * 1000
        return Math.abs(itemStart - startMs) <= overlapWindow || Math.abs(itemEnd - endMs) <= overlapWindow
      }).length

    const transportType = (ot.type_transport ?? '').toLowerCase()
    const typeBonus = transportType.includes('groupage') ? 8 : transportType.includes('express') ? 4 : 0

    const hlpBeforeMinutes = clampInt(14 + (distanceKm * 0.045) + (rowDensity * 3) + typeBonus, 15, 95)
    const maintenanceAfterMinutes = clampInt(10 + (durationMinutes / 210) * 5 + (rowDensity * 2), 10, 55)
    const pauseOffsetMinutes = clampInt(Math.min(270, (durationMinutes * 0.46) - (rowDensity * 6)), 120, 270)

    return {
      hlpBeforeMinutes,
      maintenanceAfterMinutes,
      pauseOffsetMinutes,
      pauseDurationMinutes: 45,
    }
  }

  function buildFallbackRetourChargeSuggestions(form: RetourChargeForm): RetourChargeSuggestion[] {
    const startBoundary = new Date(`${form.date_debut}T00:00:00`).getTime()
    const endBoundary = new Date(`${form.date_fin}T23:59:59`).getTime()
    const hasDateWindow = Number.isFinite(startBoundary) && Number.isFinite(endBoundary)
    if (!hasDateWindow) return []

    const retourDepotLimitMs = form.retour_depot_avant
      ? new Date(form.retour_depot_avant).getTime()
      : null

    const allCandidates = [...pool, ...ganttOTs]
    const uniqueById = new Map<string, OT>()
    for (const ot of allCandidates) {
      if (!uniqueById.has(ot.id)) uniqueById.set(ot.id, ot)
    }

    const suggestions = Array.from(uniqueById.values())
      .filter(ot => {
        const transportStatus = (ot.statut_transport ?? '').trim().toLowerCase()
        const legacyStatus = (ot.statut ?? '').trim().toLowerCase()
        const isTerminal = transportStatus === 'termine' || transportStatus === 'annule'
          || legacyStatus === 'livre' || legacyStatus === 'facture' || legacyStatus === 'annule'
        if (isTerminal) return false
        if (ot.vehicule_id && ot.vehicule_id !== form.vehicule_id) return false

        const pickupMs = new Date(ot.date_chargement_prevue ?? '').getTime()
        if (!Number.isFinite(pickupMs)) return false
        if (pickupMs < startBoundary || pickupMs > endBoundary) return false
        return true
      })
      .map<RetourChargeSuggestion | null>(ot => {
        const distanceKm = ot.distance_km && ot.distance_km > 0 ? ot.distance_km : 180
        const estimatedEmptyKm = clampInt((distanceKm * 0.22) + ((ot.type_transport ?? '').toLowerCase().includes('groupage') ? 24 : 0), 8, Math.max(20, form.rayon_km * 2))
        if (estimatedEmptyKm > Math.max(form.rayon_km * 1.25, form.rayon_km + 35)) return null

        const revenue = ot.prix_ht ?? 0
        const estimatedCost = (distanceKm * 0.92) + (estimatedEmptyKm * 0.88)
        const grossMargin = revenue - estimatedCost
        const distancePenalty = Math.max(0, estimatedEmptyKm - 45) * 0.18
        const marginScore = clampInt((grossMargin / Math.max(300, revenue || 700)) * 100 + 45 - distancePenalty, 0, 100)

        const pickupMs = new Date(ot.date_chargement_prevue ?? '').getTime()
        const deliveryMs = new Date(ot.date_livraison_prevue ?? '').getTime()
        const loadedDurationMinutes = Number.isFinite(deliveryMs) && deliveryMs > pickupMs
          ? Math.max(60, Math.round((deliveryMs - pickupMs) / 60000))
          : clampInt((distanceKm / 62) * 60 + 55, 90, 720)
        const estimatedEmptyDurationHours = Math.round(((estimatedEmptyKm / 62) * 10)) / 10
        const predictedFinishMs = pickupMs + (loadedDurationMinutes * 60000) + Math.round(estimatedEmptyDurationHours * 3600000)
        const retourDepotOk = !retourDepotLimitMs || !Number.isFinite(retourDepotLimitMs) || predictedFinishMs <= retourDepotLimitMs
        const finalScore = clampInt(marginScore + (retourDepotOk ? 8 : -22), 0, 100)

        return {
          id: ot.id,
          reference: ot.reference,
          client_nom: ot.client_nom,
          date_chargement_prevue: ot.date_chargement_prevue,
          date_livraison_prevue: ot.date_livraison_prevue,
          nature_marchandise: ot.nature_marchandise,
          prix_ht: ot.prix_ht,
          distance_km: ot.distance_km,
          dist_vide_km: estimatedEmptyKm,
          score_rentabilite: finalScore,
          duree_vide_estimee_h: estimatedEmptyDurationHours,
          retour_depot_ok: retourDepotOk,
          explication_ia: 'Prediction locale optimisee (fallback hors connexion IA).',
          ia_provider: 'local-heuristique',
        }
      })
      .filter((item): item is RetourChargeSuggestion => Boolean(item))
      .sort((left, right) => right.score_rentabilite - left.score_rentabilite)

    return suggestions.slice(0, 15)
  }

  function buildGeneratedInlineEvents(ot: OT, rowId: string): GeneratedInlineEvent[] {
    if (!autoHabillage) return []
    const startISO = ot.date_chargement_prevue
    const endISO = ot.date_livraison_prevue ?? ot.date_chargement_prevue
    if (!startISO || !endISO) return []

    const start = new Date(startISO)
    const end = new Date(endISO)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return []

    const inlinePrediction = retourChargeIaConnected
      ? {
          hlpBeforeMinutes: 20,
          maintenanceAfterMinutes: 15,
          pauseOffsetMinutes: 270,
          pauseDurationMinutes: 45,
        }
      : buildInlineFallbackPrediction(ot, rowId)

    const events: GeneratedInlineEvent[] = []
    const beforeStart = new Date(start.getTime() - inlinePrediction.hlpBeforeMinutes * 60000)
    events.push({
      id: `hlp-before-${ot.id}`,
      rowId,
      label: `HLP ${ot.reference}`,
      dateStart: toDateTimeFromDate(beforeStart),
      dateEnd: toDateTimeFromDate(start),
      color: INLINE_EVENT_COLORS.hlp,
      kind: 'hlp',
    })

    const afterEnd = new Date(end.getTime() + inlinePrediction.maintenanceAfterMinutes * 60000)
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
      // Ne pas g�n�rer de pause auto si une pause mat�rialis�e existe d�j� pour cet OT
      const hasMaterialized = customBlocks.some(b => b.kind === 'repos' && b.rowId === rowId && b.label.includes(ot.reference))
      if (!hasMaterialized) {
        // CE 561 : pause obligatoire de 45 min apr�s 4h30 max de conduite
        // Placement intelligent : si d'autres OTs existent sur la ligne, chercher un cr�neau libre
        const rowItems = ganttOTs
          .filter(o => resolveRowId(o) === rowId && o.id !== ot.id && !customOTIds.has(o.id))
          .map(o => ({ start: new Date(o.date_chargement_prevue ?? '').getTime(), end: new Date(o.date_livraison_prevue ?? o.date_chargement_prevue ?? '').getTime() }))
          .filter(o => Number.isFinite(o.start) && Number.isFinite(o.end))
          .sort((a, b) => a.start - b.start)

        const idealOffsetMs = Math.min(inlinePrediction.pauseOffsetMinutes, Math.floor(durationMinutes / 2)) * 60000
        let pauseStart = new Date(start.getTime() + idealOffsetMs)
        const pauseDuration = inlinePrediction.pauseDurationMinutes * 60000

        // V�rifier si le cr�neau id�al chevauche un autre OT; sinon trouver le premier gap libre
        const conflicts = rowItems.some(item =>
          pauseStart.getTime() < item.end && (pauseStart.getTime() + pauseDuration) > item.start
        )
        if (conflicts) {
          // Chercher un gap entre les OTs de la ligne apr�s le d�but de cet OT
          const sortedAll = [
            { start: start.getTime(), end: end.getTime() },
            ...rowItems,
          ].sort((a, b) => a.start - b.start)
          let placed = false
          for (let i = 0; i < sortedAll.length - 1; i++) {
            const gapStart = sortedAll[i].end
            const gapEnd = sortedAll[i + 1].start
            if (gapEnd - gapStart >= pauseDuration && gapStart >= start.getTime()) {
              pauseStart = new Date(gapStart)
              placed = true
              break
            }
          }
          if (!placed) {
            // Fallback : placer apr�s la derni�re mission de la journ�e
            const lastEnd = sortedAll[sortedAll.length - 1].end
            if (lastEnd >= start.getTime()) {
              pauseStart = new Date(lastEnd)
            }
          }
        }

        const pauseEnd = new Date(pauseStart.getTime() + pauseDuration)
        events.push({
          id: `pause-${ot.id}`,
          rowId,
          label: `Pause ${inlinePrediction.pauseDurationMinutes} min ${ot.reference}`,
          dateStart: toDateTimeFromDate(pauseStart),
          dateEnd: toDateTimeFromDate(pauseEnd),
          color: INLINE_EVENT_COLORS.repos,
          kind: 'repos',
        })
      }
    }

    return events
  }

  /** V�rifie si un conducteur est absent sur une p�riode donn�e */
  function getConducteurAbsencesForPeriod(conducteurId: string, dateDebut: string, dateFin: string): AbsenceRh[] {
    const abs = conducteurAbsences.get(conducteurId)
    if (!abs) return []
    return abs.filter(a => a.date_debut <= dateFin && a.date_fin >= dateDebut)
  }

  /** Mat�rialise une pause auto-g�n�r�e en customBlock �ditable */
  function materializePause(block: GeneratedInlineEvent) {
    const newBlock: CustomBlock = {
      id: uid(),
      rowId: block.rowId,
      label: block.label,
      dateStart: block.dateStart,
      dateEnd: block.dateEnd,
      color: block.color,
      kind: block.kind,
    }
    const next = [...customBlocks, newBlock]
    setCustomBlocks(next)
    saveCustomBlocks(next)
    pushPlanningNotice(`Pause materialisee � vous pouvez la deplacer ou la redimensionner.`)
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
    const modeLabel = blockOnCompliance ? 'conformite bloquante active' : 'audit non bloquant'
    if (totalDrivers === 0) {
      pushPlanningNotice('Scan CE561 : aucune alerte detectee sur la semaine.')
    } else {
      pushPlanningNotice(
        `Scan CE561 (${modeLabel}) : ${blockingDrivers} chauffeur(s) en violation bloquante, ${totalDrivers} avec alerte(s).`,
        blockOnCompliance && blockingDrivers > 0 ? 'error' : 'success',
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
    if (!driverPrintMenu) return
    function close() { setDriverPrintMenu(null) }
    document.addEventListener('click', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [driverPrintMenu])

  useEffect(() => {
    const reloadAffretement = () => setAffretementContracts(listAffretementContracts())
    reloadAffretement()
    const unsubscribe = subscribeAffretementPortalUpdates(reloadAffretement)
    return unsubscribe
  }, [])

  const loadAll = useCallback(async () => {
    // Guard : ne pas recharger si une mutation est en cours (�vite race condition).
    if (isMutatingRef.current) return
    setIsLoadingOTs(true)
    // -- S�lect OT canonique (schema stable depuis les migrations du 2026-03-30) --
    const OT_SELECT = 'id, reference, statut, statut_transport, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, distance_km, donneur_ordre_id, chargement_site_id, livraison_site_id, mission_id, groupage_fige, est_affretee, type_chargement, poids_kg, tonnage, volume_m3, longueur_m, hors_gabarit, temperature_dirigee, charge_indivisible, clients!ordres_transport_client_id_fkey(nom)'
    const SITE_SELECT = 'id, nom, adresse, entreprise_id, usage_type, horaires_ouverture, jours_ouverture, notes_livraison, latitude, longitude, created_at, updated_at'

    // Fen�tre glissante adapt�e selon le mode :
    //   � 'mois'    : 1er du mois ? dernier jour du mois (� 2j buffer)
    //   � 'semaine' : J-7 / J+15 centr� sur weekStart (optimis� pour la perf)
    //   � 'jour'    : identique semaine (la fen�tre journ�e est incluse)
    // Les brouillons sans date (pool) sont toujours inclus via .is.null.
    let winFrom: Date, winTo: Date
    if (viewMode === 'mois') {
      winFrom = addDays(monthStart, -2)
      const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      winTo = addDays(lastDay, 2)
    } else {
      winFrom = addDays(weekStart, -7)
      winTo = addDays(weekStart, 15)
    }
    const winFromISO = toISO(winFrom)
    const winToISO   = toISO(winTo)
    // Filtre : (chargement dans fen�tre ET livraison dans fen�tre) OU pas de date (pool)
    const otDateFilter = `and(date_chargement_prevue.gte.${winFromISO},date_chargement_prevue.lte.${winToISO}),date_chargement_prevue.is.null`

    // -- Donn�es r�f�rentielles : cache TTL 60s pour �viter les re-fetch inutiles -
    const now = Date.now()
    const refCacheValid = refDataCacheRef.current && (now - refDataCacheRef.current.ts) < REF_DATA_TTL

    // -- Requ�tes en parall�le � OTs toujours frais, ref data conditionnelle --
    const otPromise = supabase
      .from('ordres_transport')
      .select(OT_SELECT)
      .or(otDateFilter)
      .order('date_chargement_prevue', { ascending: true, nullsFirst: false })

    let otR: Awaited<typeof otPromise>
    if (refCacheValid) {
      // OTs seulement � ref data depuis le cache
      otR = await otPromise
    } else {
      const loadConducteurs = async () => {
        const primary = await looseSupabase.from('conducteurs').select('id, nom, prenom, statut').order('nom')
        if (!primary.error) return primary
        const rawError = `${primary.error.message ?? ''} ${primary.error.details ?? ''}`.toLowerCase()
        if (!rawError.includes('person_id')) return primary
        return looseSupabase.from('conducteurs').select('id, nom, prenom, statut').order('nom')
      }

      const loadVehicules = async () => {
        const primary = await looseSupabase.from('vehicules').select('id, immatriculation, marque, modele, statut').order('immatriculation')
        if (!primary.error) return primary
        const rawError = `${primary.error.message ?? ''} ${primary.error.details ?? ''}`.toLowerCase()
        if (!rawError.includes('asset_id')) return primary
        return looseSupabase.from('vehicules').select('id, immatriculation, marque, modele, statut').order('immatriculation')
      }

      const loadRemorques = async () => {
        const primary = await looseSupabase.from('remorques').select('id, immatriculation, type_remorque, trailer_type_code, categorie_remorque, charge_utile_kg, volume_max_m3, longueur_m, statut').order('immatriculation')
        if (!primary.error) return primary
        const rawError = `${primary.error.message ?? ''} ${primary.error.details ?? ''}`.toLowerCase()
        if (!rawError.includes('asset_id')) return primary
        return looseSupabase.from('remorques').select('id, immatriculation, type_remorque, trailer_type_code, categorie_remorque, charge_utile_kg, volume_max_m3, longueur_m, statut').order('immatriculation')
      }

      const [otResult, siteR, cR, vR, rR, clientR, aR] = await Promise.all([
        otPromise,
        looseSupabase.from('sites_logistiques').select(SITE_SELECT).order('nom'),
        loadConducteurs(),
        loadVehicules(),
        loadRemorques(),
        supabase.from('clients').select('id, nom, actif').eq('actif', true).order('nom'),
        supabase.from('affectations').select('id, conducteur_id, vehicule_id, remorque_id, actif').eq('actif', true),
      ])
      otR = otResult

      // Mise � jour des donn�es r�f�rentielles
      let newConducteurs: Conducteur[] = cR.error
        ? []
        : (cR.data ?? [])
            .filter((c: { statut?: string | null }) => isDriverActiveStatus(c.statut))
            .map((c: { id: string; nom: string; prenom: string; statut: string }) => c)
      let newVehicules: Vehicule[] = vR.error
        ? []
        : (vR.data ?? [])
            .filter((v: { statut?: string | null }) => isAssetAvailableStatus(v.statut))
            .map((v: { id: string; immatriculation: string; marque: string | null; modele: string | null; statut: string }) => v)
      let newRemorques: Remorque[] = rR.error
        ? []
        : (rR.data ?? [])
            .filter((r: { statut?: string | null }) => isAssetAvailableStatus(r.statut))
            .map((r: { id: string; immatriculation: string; type_remorque: string; statut: string }) => r)
      const newClients = clientR.error ? [] : (clientR.data ?? [])
      const newSites = siteR.error ? [] : sortLogisticSites(((siteR.data ?? []) as SiteLoadRow[]).map(mapSiteLoadRow))
      const newAffectations = aR.error ? [] : (aR.data ?? [])

      // Enrichissement V2: fusionner les drivers persons/profils pour garantir la visibilite tenant.
      const persons = await listPersonsForDirectory()
      const personDrivers = persons
        .filter(p => ['driver', 'conducteur', 'chauffeur'].includes((p.person_type ?? '').toLowerCase()))
        .filter(p => isDriverActiveStatus(p.status))

      const conducteurIds = new Set(newConducteurs.map(c => c.id))
      const conducteurKeys = new Set(newConducteurs.map(c => `${c.nom}|${c.prenom}`.toLowerCase()))

      for (const p of personDrivers) {
        const candidate = {
          id: p.legacy_conducteur_id ?? p.id,
          nom: p.last_name ?? '-',
          prenom: p.first_name ?? '',
          statut: p.status ?? 'active',
        }
        const key = `${candidate.nom}|${candidate.prenom}`.toLowerCase()
        if (conducteurIds.has(candidate.id) || conducteurKeys.has(key)) continue
        newConducteurs.push(candidate)
        conducteurIds.add(candidate.id)
        conducteurKeys.add(key)
      }

      if (newVehicules.length === 0 || newRemorques.length === 0) {
        const assets = await listAssets()

        if (newVehicules.length === 0) {
          newVehicules = assets
            .filter(a => a.type === 'vehicle')
            .filter(a => isAssetAvailableStatus(a.status))
            .map(a => ({
              id: a.legacy_vehicule_id ?? a.id,
              immatriculation: a.registration ?? '-',
              marque: null,
              modele: null,
              statut: a.status ?? 'active',
            }))
        }

        if (newRemorques.length === 0) {
          newRemorques = assets
            .filter(a => a.type === 'trailer')
            .filter(a => isAssetAvailableStatus(a.status))
            .map(a => ({
              id: a.legacy_remorque_id ?? a.id,
              immatriculation: a.registration ?? '-',
              type_remorque: 'standard',
              statut: a.status ?? 'active',
            }))
        }
      }

      // En V2, plusieurs lignes legacy peuvent pointer le meme pivot; on dedupe par id final.
      const uniqueConducteurs = Array.from(new Map(newConducteurs.map(item => [item.id, item])).values())
      const uniqueVehicules = Array.from(new Map(newVehicules.map(item => [item.id, item])).values())
      const uniqueRemorques = Array.from(new Map(newRemorques.map(item => [item.id, item])).values())

      setConducteurs(uniqueConducteurs as Conducteur[])
      setVehicules(uniqueVehicules as Vehicule[])
      setRemorques(uniqueRemorques as Remorque[])
      setClients(newClients as ClientRef[])
      setLogisticSites(newSites)
      setAffectations(newAffectations as Affectation[])

      refDataCacheRef.current = {
        ts: now,
        conducteurs: uniqueConducteurs as Conducteur[],
        vehicules: uniqueVehicules as Vehicule[],
        remorques: uniqueRemorques as Remorque[],
        clients: newClients as ClientRef[],
        sites: newSites,
        affectations: newAffectations as Affectation[],
      }
    }

    // -- OT : fallback minimal si la colonne est_affretee est manquante -------
    let finalOtR = otR as { data: unknown[] | null; error: { message?: string } | null }
    if (otR.error) {
      const fallback = await supabase
        .from('ordres_transport')
        .select('id, reference, statut, statut_transport, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, distance_km, chargement_site_id, livraison_site_id, mission_id, groupage_fige, clients!ordres_transport_client_id_fkey(nom)')
        .or(otDateFilter)
        .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
      if (!fallback.error) finalOtR = fallback as typeof finalOtR
    }

    // Filet de securite: si la fenetre datee remonte 0 OT, recharger un lot recent
    // sans filtre de date pour eviter un planning vide lorsque les courses sont hors fenetre.
    if (!finalOtR.error && (finalOtR.data?.length ?? 0) === 0) {
      const wideFallback = await supabase
        .from('ordres_transport')
        .select(OT_SELECT)
        .order('date_chargement_prevue', { ascending: false, nullsFirst: false })
        .limit(300)
      if (!wideFallback.error && (wideFallback.data?.length ?? 0) > 0) {
        finalOtR = wideFallback as typeof finalOtR
      }
    }

    // -- Traitement OTs (dans une transition pour ne pas bloquer le rendu) ----
    const processOTs = () => {
      if (finalOtR.error) {
        const rawMessage = finalOtR.error.message ?? 'Erreur inconnue de chargement.'
        const normalized = rawMessage.toLowerCase()
        const isAccessDenied = normalized.includes('row-level security') || normalized.includes('permission denied') || normalized.includes('rls')
        const noticeMessage = isAccessDenied
          ? 'Chargement du planning bloque par les droits RLS. Verifiez le role utilisateur et les policies SQL des tables planning.'
          : `Erreur de chargement planning: ${rawMessage}`
        if (lastLoadErrorRef.current !== noticeMessage) {
          pushPlanningNotice(noticeMessage, 'error')
          lastLoadErrorRef.current = noticeMessage
        }
        setPool([])
        setGanttOTs([])
        setCancelledOTs([])
        setSelected(null)
      } else if (finalOtR.data) {
        lastLoadErrorRef.current = null
        type OtLoadRow = Omit<OT, 'client_nom'> & {
          clients: { nom: string } | { nom: string }[] | null
          distance_km?: number | null
          donneur_ordre_id?: string | null
          chargement_site_id?: string | null
          livraison_site_id?: string | null
          mission_id?: string | null
          groupage_fige?: boolean | null
        }
        const ots: OT[] = (finalOtR.data as OtLoadRow[]).map(r => ({
          id: r.id, reference: r.reference, client_nom: (Array.isArray(r.clients) ? r.clients[0] : r.clients)?.nom ?? '-',
          date_chargement_prevue: r.date_chargement_prevue, date_livraison_prevue: r.date_livraison_prevue,
          type_transport: r.type_transport, nature_marchandise: r.nature_marchandise,
          statut: r.statut, statut_transport: (r as OtLoadRow & { statut_transport?: string | null }).statut_transport ?? null, conducteur_id: r.conducteur_id, vehicule_id: r.vehicule_id,
          remorque_id: r.remorque_id, prix_ht: r.prix_ht, statut_operationnel: r.statut_operationnel,
          distance_km: r.distance_km ?? null, donneur_ordre_id: r.donneur_ordre_id ?? null,
          chargement_site_id: r.chargement_site_id ?? null, livraison_site_id: r.livraison_site_id ?? null,
          mission_id: r.mission_id ?? null, groupage_fige: Boolean(r.groupage_fige),
          est_affretee: Boolean(r.est_affretee),
        }))
        const principalCount = ots.filter(o => !o.est_affretee).length
        const affretementCount = ots.filter(o => o.est_affretee).length
        if (planningScope === 'affretement' && affretementCount === 0 && principalCount > 0) {
          setPlanningScope('principal')
          pushPlanningNotice('Aucune course affretee detectee: bascule automatique sur le planning principal.', 'error')
          setIsLoadingOTs(false)
          return
        }
        if (planningScope === 'principal' && principalCount === 0 && affretementCount > 0) {
          setPlanningScope('affretement')
          pushPlanningNotice('Aucune course principale detectee: bascule automatique sur le planning affretement.', 'error')
          setIsLoadingOTs(false)
          return
        }
        const normalizeStatut = (value: string | null | undefined) => (value ?? '').trim().toLowerCase()
        const isCancelledStatut = (ot: OT) => {
          const transport = normalizeStatut(ot.statut_transport)
          const legacy = normalizeStatut(ot.statut)
          return transport === 'annule' || transport === 'annul�' || legacy === 'annule' || legacy === 'annul�'
        }
        const isDraftStatut = (ot: OT) => {
          const transport = normalizeStatut(ot.statut_transport)
          const legacy = normalizeStatut(ot.statut)
          if (transport) {
            return ST_BROUILLON.includes(transport as never) || ST_CONFIRME.includes(transport as never)
          }
          return legacy === 'brouillon' || legacy === 'confirme' || legacy === 'confirm�'
        }
        const hasAssignedResource = (ot: OT) => Boolean(ot.conducteur_id || ot.vehicule_id || ot.remorque_id)
        const hasScheduleDates = (ot: OT) => Boolean(ot.date_chargement_prevue || ot.date_livraison_prevue)

        const scopedPlanning = ots.filter(o => planningScope === 'affretement' ? o.est_affretee : !o.est_affretee)
        const cancelled = scopedPlanning.filter(isCancelledStatut)
        const principalPlanning = scopedPlanning.filter(o => !isCancelledStatut(o))
        const isPoolCandidate = (ot: OT) => !hasScheduleDates(ot) || (isDraftStatut(ot) && !hasAssignedResource(ot))
        const poolItems = principalPlanning.filter(isPoolCandidate)
        const poolIds = new Set(poolItems.map(ot => ot.id))
        setCancelledOTs(cancelled)
        setPool(poolItems)
        setGanttOTs(principalPlanning.filter(o => !poolIds.has(o.id)))
        setSelected(current => current ? (scopedPlanning.find(ot => ot.id === current.id) ?? null) : current)
      }
      setIsLoadingOTs(false)
    }
    startTransition(processOTs)

    // -- Absences RH conducteurs � 1 seule requ�te batch au lieu de N ---------
    const activeConducteurs = refDataCacheRef.current?.conducteurs ?? []
    if (activeConducteurs.length > 0) {
      const absMap = await fetchAllAbsencesValideesPeriode(
        activeConducteurs.map(c => c.id),
        winFromISO,
        winToISO,
      )
      setConducteurAbsences(absMap)
    } else {
      setConducteurAbsences(new Map())
    }
  }, [planningScope, weekStart, viewMode, monthStart])

  useEffect(() => { void loadAll() }, [loadAll])

  // Chargement des mod�les de courses (une seule fois au mount)
  useEffect(() => {
    void listCourseTemplates().then(setCourseTemplates)
  }, [])

  // Hydratation custom rows/blocks depuis Supabase au mount (prime sur localStorage)
  useEffect(() => {
    void Promise.all([fetchCustomRows(), fetchCustomBlocks()]).then(([remoteRows, remoteBlocks]) => {
      if (remoteRows.length > 0) {
        const rows: CustomRow[] = remoteRows.map((r: RemoteCustomRow) => ({ id: r.id, label: r.label, subtitle: r.subtitle }))
        setCustomRows(rows)
        localStorage.setItem(ROWS_KEY, JSON.stringify(rows))
      }
      if (remoteBlocks.length > 0) {
        const blocks: CustomBlock[] = remoteBlocks.map((b: RemoteCustomBlock) => ({
          id: b.id, rowId: b.row_id, label: b.label,
          dateStart: b.date_start, dateEnd: b.date_end, color: b.color,
          otId: b.ot_id ?? undefined,
          kind: (b.kind as CustomBlock['kind']) ?? undefined,
        }))
        setCustomBlocks(blocks)
        localStorage.setItem(BLOCKS_KEY, JSON.stringify(blocks))
      }
    })
  }, [])

  function applyTemplate(tpl: CourseTemplate) {
    if (tpl.client_id) setNewBlockClientId(tpl.client_id)
    if (tpl.chargement_site_id) setNewBlockChargementSiteId(tpl.chargement_site_id)
    if (tpl.livraison_site_id) setNewBlockLivraisonSiteId(tpl.livraison_site_id)
    if (tpl.distance_km != null) setNewBlockDistanceKm(String(tpl.distance_km))
    if (tpl.duree_heures != null) {
      setNewBlockDurationHours(String(Math.floor(tpl.duree_heures)))
      setNewBlockDurationMinutes(String(Math.round((tpl.duree_heures % 1) * 60)).padStart(2, '0'))
    }
    if (tpl.label) setNewBlockLabel(tpl.label)
  }

  async function handleSaveAsTemplate() {
    if (!saveAsTemplateLabel.trim()) return
    setSavingTemplate(true)
    const tpl = await saveCourseTemplate({
      label: saveAsTemplateLabel.trim(),
      type_transport: null,
      nature_marchandise: null,
      chargement_site_id: newBlockChargementSiteId || null,
      livraison_site_id: newBlockLivraisonSiteId || null,
      client_id: newBlockClientId || null,
      distance_km: newBlockDistanceKm ? Number(newBlockDistanceKm) : null,
      duree_heures: newBlockDurationHours
        ? Number(newBlockDurationHours) + Number(newBlockDurationMinutes || 0) / 60
        : null,
      notes: null,
    })
    if (tpl) setCourseTemplates(prev => [...prev, tpl].sort((a, b) => a.label.localeCompare(b.label)))
    setSaveAsTemplateLabel('')
    setShowSaveTemplate(false)
    setSavingTemplate(false)
    pushPlanningNotice(tpl ? `Modele "${tpl.label}" enregistre.` : 'Erreur lors de la sauvegarde du modele.', tpl ? 'success' : 'error')
  }

  async function handleDeleteTemplate(id: string) {
    await deleteCourseTemplate(id)
    setCourseTemplates(prev => prev.filter(t => t.id !== id))
  }

  function openNotifyClient(ot: OT) {
    const livDate = ot.date_livraison_prevue
      ? new Date(ot.date_livraison_prevue).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
      : '-'
    const charDate = ot.date_chargement_prevue
      ? new Date(ot.date_chargement_prevue).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
      : '-'
    setNotifyMessage(
      `Bonjour,\n\nNous vous confirmons la course ${ot.reference}.\n` +
      `Enl�vement pr�vu : ${charDate}\n` +
      `Livraison pr�vue : ${livDate}\n\n` +
      `Cordialement,\nNexora Truck`,
    )
    setNotifyClientOt(ot)
  }

  // Chargement radar km � vide (synth�se par v�hicule, 30 jours)
  // NOTE: v_radar_km_vide_synthese est une vue Supabase non typ�e (looseSupabase).
  // Si la structure de la vue change, mettre � jour le type KmVideRow ci-dessous.
  const kmVideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (kmVideTimerRef.current) clearTimeout(kmVideTimerRef.current)
    kmVideTimerRef.current = setTimeout(() => {
      type KmVideRow = { vehicule_id: string; taux_charge_pct: number | null; total_km_vide_estime: number | null }
      async function fetchKmVide() {
        const { data, error } = await looseSupabase
          .from('v_radar_km_vide_synthese')
          .select('vehicule_id, taux_charge_pct, total_km_vide_estime')
        if (error || !data) return
        const map = new Map<string, Pick<KmVideRow, 'taux_charge_pct' | 'total_km_vide_estime'>>()
        for (const row of (data as KmVideRow[])) {
          map.set(row.vehicule_id, { taux_charge_pct: row.taux_charge_pct, total_km_vide_estime: row.total_km_vide_estime })
        }
        setKmVideSynthese(map)
      }
      void fetchKmVide()
    }, 3000) // debounce 3s � donn�es synth�tiques, pas urgentes
    return () => { if (kmVideTimerRef.current) clearTimeout(kmVideTimerRef.current) }
  }, [ganttOTs]) // rafra�chit quand les OT changent (debounced)

  const realtimeReloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const debouncedLoad = () => {
      if (realtimeReloadTimer.current) clearTimeout(realtimeReloadTimer.current)
      // Ne pas recharger si une mutation est en cours : isMutatingRef est rel�ch�
      // apr�s la mutation ? le prochain �v�nement realtime d�clenchera le rechargement.
      realtimeReloadTimer.current = setTimeout(() => {
        if (!isMutatingRef.current) void loadAll()
      }, 2000)
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

  // ── Assign modal ─────────────────────────────────────────────────────────────

  // -- Edit modal (clic sur un bloc du planning) ---------------------------------------------

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
    isMutatingRef.current = true
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
    isMutatingRef.current = false
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
    // -- V�rification absence RH ----------------------------------------------
    if (assignModal.conducteur_id) {
      const absConflicts = getConducteurAbsencesForPeriod(
        assignModal.conducteur_id,
        assignModal.date_chargement,
        assignModal.date_livraison,
      )
      if (absConflicts.length > 0) {
        const cName = conducteurs.find(c => c.id === assignModal.conducteur_id)
        const absLabel = absConflicts.map(a => `${TYPE_ABSENCE_LABELS[a.type_absence]} (${a.date_debut} ? ${a.date_fin})`).join(', ')
        const ok = window.confirm(
          `? ${cName ? `${cName.prenom} ${cName.nom}` : 'Ce conducteur'} est en absence : ${absLabel}.\n\nVoulez-vous affecter quand meme ?`
        )
        if (!ok) return
      }
    }
    const targets = assignModal.applyToGroupage ? getGroupageMembersForOt(assignModal.ot) : [assignModal.ot]
    const otId = assignModal.ot.id
    setSaving(true)
    isMutatingRef.current = true
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

    // ── Validation remorque ↔ chargement ─────────────────────────────────────
    if (assignModal.remorque_id) {
      const rem = remorques.find(r => r.id === assignModal.remorque_id)
      if (rem) {
        const firstOt = targets[0]
        const otData = {
          type_chargement:    firstOt.type_chargement,
          poids_kg:           firstOt.poids_kg,
          tonnage:            firstOt.tonnage,
          volume_m3:          firstOt.volume_m3,
          longueur_m:         firstOt.longueur_m,
          hors_gabarit:       firstOt.hors_gabarit,
          temperature_dirigee: firstOt.temperature_dirigee,
          charge_indivisible: firstOt.charge_indivisible,
        }
        const validation = validateTrailerAssignment(otData, rem)
        if (validation.status === 'blocked' && blockImpossibleAssignments) {
          setSaving(false)
          isMutatingRef.current = false
          pushPlanningNotice(
            `Affectation remorque BLOQUÉE : ${validation.errors.map(e => e.message).join(' | ')}`,
            'error',
          )
          return
        }
        if (validation.status === 'blocked' && !blockImpossibleAssignments) {
          pushPlanningNotice(
            `Affectation normalement bloquee (mode permissif actif) : ${validation.errors.map(e => e.message).join(' | ')}`,
            'success',
          )
        }
        if (validation.status === 'warning') {
          const msg = validation.warnings.map(w => w.message).join('\n')
          const ok = window.confirm(`⚠ Avertissement remorque :\n\n${msg}\n\nContinuer malgré tout ?`)
          if (!ok) { setSaving(false); isMutatingRef.current = false; return }
        }
      }
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
    setSaving(false); isMutatingRef.current = false; setAssignModal(null); loadAll()
    pushPlanningNotice(
      lastAuditSummary
        ? `${assignModal.applyToGroupage ? 'Lot programme.' : 'Affectation enregistree.'} ${lastAuditSummary.message}`
        : assignModal.applyToGroupage ? 'Lot programme.' : 'Affectation enregistree.',
      blockOnCompliance && lastAuditSummary?.hasBlocking ? 'error' : 'success',
    )
  }

  function getScheduledBounds(ot: OT): { startISO: string; endISO: string } | null {
    const startISO = ot.date_chargement_prevue ?? ot.date_livraison_prevue
    const endISO = ot.date_livraison_prevue ?? ot.date_chargement_prevue
    if (!startISO || !endISO) return null
    return { startISO, endISO }
  }

  async function assignCourseToResourceWithoutTimelineMove(ot: OT, resourceId: string): Promise<boolean> {
    if (!ensureWriteAllowed('Affectation par glisser-deposer')) return false
    if (!ensureGroupageEditable(ot, 'Affectation')) return false

    const members = getGroupageMembersForOt(ot)
    for (const member of members) {
      const schedule = getScheduledBounds(member)
      if (!schedule) {
        openAssign(member, resourceId)
        pushPlanningNotice('Cette course doit etre reglee depuis sa fiche pour definir debut et fin avant positionnement sur le planning.', 'error')
        return false
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
          return false
        }
      }

      const updatePayload: Record<string, string> = { statut: 'planifie', statut_transport: 'planifie' }
      if (tab === 'conducteurs') updatePayload.conducteur_id = resourceId
      if (tab === 'camions') updatePayload.vehicule_id = resourceId
      if (tab === 'remorques') updatePayload.remorque_id = resourceId

      const result = await supabase
        .from('ordres_transport')
        .update(updatePayload)
        .in('id', members.map(member => member.id))

      if (result.error) {
        pushPlanningNotice(`Affectation impossible: ${result.error.message}`, 'error')
        return false
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
        blockOnCompliance && lastAuditSummary?.hasBlocking ? 'error' : 'success',
      )
      return true
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

  // ── Direct block move ─────────────────────────────────────────────────────────

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
    const members = getGroupageMembersForOt(ot)
    const baseStartMs = new Date(ot.date_chargement_prevue ?? newStartISO).getTime()
    const nextStartMs = new Date(newStartISO).getTime()
    const deltaMs = nextStartMs - baseStartMs
    const moveTargets = members.map(member => {
      const memberStartIso = member.date_chargement_prevue ?? newStartISO
      const memberEndIso = member.date_livraison_prevue ?? member.date_chargement_prevue ?? newEndISO
      const memberStartMs = new Date(memberStartIso).getTime()
      const memberEndMs = Math.max(memberStartMs, new Date(memberEndIso).getTime())
      const shiftedStartIso = new Date(memberStartMs + deltaMs).toISOString()
      const shiftedEndIso = new Date(memberEndMs + deltaMs).toISOString()
      const payload: Record<string, string | null> = {
        date_chargement_prevue: shiftedStartIso,
        date_livraison_prevue: shiftedEndIso,
      }
      if (tab === 'conducteurs') payload.conducteur_id = resourceId
      else if (tab === 'camions') payload.vehicule_id = resourceId
      else payload.remorque_id = resourceId
      return {
        member,
        shiftedStartIso,
        shiftedEndIso,
        payload,
      }
    })

    let lastAuditSummary: { message: string; hasBlocking: boolean } | null = null
    for (const target of moveTargets) {
      const targetConducteurId = tab === 'conducteurs' ? resourceId : (target.member.conducteur_id ?? null)
      const auditSummary = await buildComplianceAuditSummary({
        otId: target.member.id,
        conducteurId: targetConducteurId,
        startISO: target.shiftedStartIso,
        endISO: target.shiftedEndIso,
      })
      lastAuditSummary = auditSummary
      if (blockOnCompliance && auditSummary?.hasBlocking) {
        pushPlanningNotice(`Deplacement bloque sur ${target.member.reference}. ${auditSummary.message}`, 'error')
        setSavingOtId(null)
        return
      }
    }

    setGanttOTs(prev => prev.map(item => {
      const target = moveTargets.find(candidate => candidate.member.id === item.id)
      if (!target) return item
      return {
        ...item,
        date_chargement_prevue: target.shiftedStartIso,
        date_livraison_prevue: target.shiftedEndIso,
        ...(tab === 'conducteurs' ? { conducteur_id: resourceId } : {}),
        ...(tab === 'camions' ? { vehicule_id: resourceId } : {}),
        ...(tab === 'remorques' ? { remorque_id: resourceId } : {}),
      }
    }))

    let failureMessage: string | null = null
    for (const target of moveTargets) {
      const firstTry = await supabase
        .from('ordres_transport')
        .update(target.payload)
        .eq('id', target.member.id)

      if (!firstTry.error) continue

      const fallbackPayload: Record<string, string | null> = {
        ...target.payload,
        date_chargement_prevue: target.shiftedStartIso.slice(0, 10),
        date_livraison_prevue: target.shiftedEndIso.slice(0, 10),
      }
      const fallbackTry = await supabase
        .from('ordres_transport')
        .update(fallbackPayload)
        .eq('id', target.member.id)

      if (fallbackTry.error) {
        failureMessage = getUpdateFailureReason(fallbackTry)
        break
      }
    }

    if (failureMessage) {
      pushPlanningNotice(`Deplacement impossible: ${failureMessage}`, 'error')
    } else if (notifySuccess) {
      pushPlanningNotice(
        lastAuditSummary
          ? `${moveTargets.length > 1 ? 'Mission deplacee.' : 'Deplacement enregistre.'} ${lastAuditSummary.message}`
          : moveTargets.length > 1 ? 'Mission deplacee.' : 'Deplacement enregistre.',
        blockOnCompliance && lastAuditSummary?.hasBlocking ? 'error' : 'success',
      )
    }
    setSavingOtId(null)
  }

  function findOverlapTarget(rowId: string, startISO: string, endISO: string, movingOtIds: string[]): OT | null {
    return findOverlapTargetInRow(rowOTs(rowId), startISO, endISO, movingOtIds)
  }

  async function linkCoursesToGroupage(source: OT, target: OT) {
    if (!ensureWriteAllowed('Liaison de groupage')) return false
    if (source.groupage_fige || target.groupage_fige) {
      pushPlanningNotice('Groupage impossible: un des lots est fige.', 'error')
      return false
    }

    try {
      if (source.mission_id && target.mission_id && source.mission_id === target.mission_id) {
        return source.mission_id
      }

      if (source.mission_id && target.mission_id && source.mission_id !== target.mission_id) {
        const mergedMission = await createMissionFromCourses([
          ...getGroupageMemberIds(source),
          ...getGroupageMemberIds(target),
        ])
        return mergedMission.id
      }

      if (source.mission_id) {
        const mission = await addCourseToMission(target.id, source.mission_id)
        return mission.id
      }

      if (target.mission_id) {
        const mission = await addCourseToMission(source.id, target.mission_id)
        return mission.id
      }

      const mission = await createMissionFromCourses([source.id, target.id])
      return mission.id
    } catch (error) {
      pushPlanningNotice(`Groupage impossible: ${error instanceof Error ? error.message : 'erreur inconnue'}`, 'error')
      return false
    }
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

      let nextGroupId = alreadyGrouped ? conflict.first.mission_id : null
      if (!nextGroupId) {
        const linkedGroupId = await linkCoursesToGroupage(conflict.first, conflict.second)
        if (!linkedGroupId) return
        nextGroupId = linkedGroupId
      }

      if (freezeGroupage && nextGroupId) {
        const freezeResult = await supabase
          .from('ordres_transport')
          .update({ groupage_fige: true })
          .eq('mission_id', nextGroupId)

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
    if (!ot.mission_id) return
    if (ot.groupage_fige) {
      pushPlanningNotice('Ce lot est fige. Defigez-le avant de delier une course.', 'error')
      return
    }

    try {
      await removeCourseFromMission(ot.id)
    } catch (error) {
      pushPlanningNotice(`Deliaison impossible: ${error instanceof Error ? error.message : 'erreur inconnue'}`, 'error')
      return
    }

    await loadAll()
    pushPlanningNotice('Course deliee du groupage.')
  }

  function getNextOtStatus(currentStatus: string): string {
    const statusCycle = ['brouillon', 'confirme', 'planifie', 'en_cours', 'livre', 'facture', 'annule']
    const currentIndex = statusCycle.indexOf(currentStatus)
    if (currentIndex === -1) return 'brouillon'
    return statusCycle[(currentIndex + 1) % statusCycle.length]
  }

  async function updateOtStatusFromPlanning(ot: OT, nextStatus: string) {
    if (ot.statut === nextStatus) {
      pushPlanningNotice(`Statut deja defini sur ${STATUT_LABEL[nextStatus] ?? nextStatus}.`)
      return
    }
    if (!ensureWriteAllowed('Mise a jour du statut')) return
    if (!ensureGroupageEditable(ot, 'Mise a jour du statut')) return

    const result = await supabase
      .from('ordres_transport')
      .update({ statut: nextStatus })
      .eq('id', ot.id)

    if (result.error) {
      pushPlanningNotice(`Mise a jour statut impossible: ${result.error.message}`, 'error')
      return
    }

    setContextMenu(null)
    await loadAll()
    pushPlanningNotice(`Statut mis a jour: ${STATUT_LABEL[nextStatus] ?? nextStatus}.`)
  }

  async function toggleGroupageFreeze(ot: OT, nextFrozen: boolean) {
    if (!ot.mission_id) return
    if (!ensureWriteAllowed(nextFrozen ? 'Figeage de groupage' : 'Defigeage de groupage')) return

    const result = await supabase
      .from('ordres_transport')
      .update({ groupage_fige: nextFrozen })
      .eq('mission_id', ot.mission_id)

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

  // ── OT Drag handlers ──────────────────────────────────────────────────────────

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
  function onDragEnd() {
    if (dragOverRafRef.current !== null) { cancelAnimationFrame(dragOverRafRef.current); dragOverRafRef.current = null }
    hoverRowRef.current = null
    setDrag(null)
    setHoverRow(null)
  }

  function onRowDragOver(e: React.DragEvent, rowId: string) {
    if (isRowEditMode) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    const activeDrag = dragRef.current
    const isCustomDrag = activeDrag?.kind === 'custom'

    let next: { rowId: string; dayIdx: number; timeMin: number }
    if (!isCustomDrag) {
      // OT drag (pool/block): only the target row matters; avoid per-frame timeline updates.
      next = { rowId, dayIdx: 0, timeMin: 0 }
    } else {
      const clientX = e.clientX
      const rect = e.currentTarget.getBoundingClientRect()
      const relX = clientX - rect.left
      next = viewMode === 'semaine'
        ? { rowId, dayIdx: Math.max(0, Math.min(6, Math.floor(relX / rect.width * 7))), timeMin: 0 }
        : { rowId, dayIdx: 0, timeMin: snapToQuarter(Math.max(DAY_START_MIN, Math.min(DAY_START_MIN + DAY_TOTAL_MIN - 15, DAY_START_MIN + (relX / rect.width) * DAY_TOTAL_MIN))) }
    }
    const prev = hoverRowRef.current
    // Skip setState if nothing changed (avoid per-frame re-renders)
    if (prev && prev.rowId === next.rowId && prev.dayIdx === next.dayIdx && prev.timeMin === next.timeMin) return
    hoverRowRef.current = next
    if (dragOverRafRef.current !== null) return // already queued
    dragOverRafRef.current = requestAnimationFrame(() => {
      dragOverRafRef.current = null
      setHoverRow(hoverRowRef.current)
    })
  }
  function onRowDragLeave(e: React.DragEvent) {
    const nextTarget = e.relatedTarget as Node | null
    if (nextTarget && e.currentTarget.contains(nextTarget)) return

    const rect = e.currentTarget.getBoundingClientRect()
    const pointerOutside =
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom

    // Some browsers emit dragleave with null relatedTarget while still inside the row.
    if (!pointerOutside && !nextTarget) return

    hoverRowRef.current = null
    if (dragOverRafRef.current !== null) { cancelAnimationFrame(dragOverRafRef.current); dragOverRafRef.current = null }
    setHoverRow(null)
  }

  async function onRowDrop(e: React.DragEvent, rowId: string, isCustomRow = false) {
    if (isRowEditMode) return
    e.preventDefault()
    e.stopPropagation()
    const activeDrag = dragRef.current ?? readNativeDragPayload(e)
    if (!activeDrag) { setDrag(null); return }
    try {
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
            pushPlanningNotice('Cette course n\'est pas planifi�e cette semaine. Naviguez vers sa p�riode pour l\'assigner.', 'error')
            setDrag(null)
            return
          }
          const overlapTarget = findOverlapTarget(rowId, currentSchedule.startISO, currentSchedule.endISO, movingOtIds)
          if (overlapTarget) {
            const shouldCreateGroupage = await showConfirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
            if (shouldCreateGroupage) {
              const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
              if (linked) {
                const assignmentOk = await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
                await loadAll()
                pushPlanningNotice(
                  assignmentOk
                    ? `Groupage cree avec ${overlapTarget.reference}.`
                    : `Groupage cree avec ${overlapTarget.reference}, mais l'affectation n'a pas pu etre appliquee.`,
                  assignmentOk ? 'success' : 'error',
                )
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
          const shouldCreateGroupage = await showConfirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
          if (shouldCreateGroupage) {
            const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
            if (linked) {
              const assignmentOk = await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
              await loadAll()
              if (activeDrag.customBlockId) {
                const upd = customBlocks.filter(b => b.id !== activeDrag.customBlockId)
                if (upd.length !== customBlocks.length) { setCustomBlocks(upd); saveCustomBlocks(upd) }
              }
              pushPlanningNotice(
                assignmentOk
                  ? `Groupage cree avec ${overlapTarget.reference}.`
                  : `Groupage cree avec ${overlapTarget.reference}, mais l'affectation n'a pas pu etre appliquee.`,
                assignmentOk ? 'success' : 'error',
              )
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
            pushPlanningNotice('Cette course n\'est pas planifi�e ce jour. Naviguez vers son jour pour l\'assigner.', 'error')
            setDrag(null)
            return
          }
          const overlapTarget = findOverlapTarget(rowId, currentSchedule.startISO, currentSchedule.endISO, movingOtIds)
          if (overlapTarget) {
            const shouldCreateGroupage = await showConfirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
            if (shouldCreateGroupage) {
              const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
              if (linked) {
                const assignmentOk = await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
                await loadAll()
                pushPlanningNotice(
                  assignmentOk
                    ? `Groupage cree avec ${overlapTarget.reference}.`
                    : `Groupage cree avec ${overlapTarget.reference}, mais l'affectation n'a pas pu etre appliquee.`,
                  assignmentOk ? 'success' : 'error',
                )
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
          const shouldCreateGroupage = await showConfirm(`Superposition detectee avec ${overlapTarget.reference}. Voulez-vous creer un groupage deliable ?`)
          if (shouldCreateGroupage) {
            const linked = await linkCoursesToGroupage(activeDrag.ot, overlapTarget)
            if (linked) {
              const assignmentOk = await assignCourseToResourceWithoutTimelineMove(activeDrag.ot, rowId)
              await loadAll()
              if (activeDrag.customBlockId) {
                const upd = customBlocks.filter(b => b.id !== activeDrag.customBlockId)
                if (upd.length !== customBlocks.length) { setCustomBlocks(upd); saveCustomBlocks(upd) }
              }
              pushPlanningNotice(
                assignmentOk
                  ? `Groupage cree avec ${overlapTarget.reference}.`
                  : `Groupage cree avec ${overlapTarget.reference}, mais l'affectation n'a pas pu etre appliquee.`,
                assignmentOk ? 'success' : 'error',
              )
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
    } finally {
      if (dragOverRafRef.current !== null) { cancelAnimationFrame(dragOverRafRef.current); dragOverRafRef.current = null }
      hoverRowRef.current = null
      setDrag(null)
      setHoverRow(null)
    }
  }

  // ── Row reorder drag handlers ─────────────────────────────────────────────────

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

  // ── Custom rows management ────────────────────────────────────────────────────

  function addCustomRow() {
    if (!newRowLabel.trim()) return
    const row: CustomRow = { id:uid(), label:newRowLabel.trim(), subtitle:'Ligne personnalisee' }
    const upd = [...customRows, row]; setCustomRows(upd); saveCustomRows(upd)
    setNewRowLabel(''); setShowAddRow(false)
  }
  function deleteCustomRow(rowId: string) {
    setCustomRows(r => { const u = r.filter(x => x.id !== rowId); saveCustomRows(u); return u })
    setCustomBlocks(b => { const u = b.filter(x => x.rowId !== rowId); saveCustomBlocks(u); return u })
    void dbDeleteCustomRow(rowId)
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
    if (!rowId) {
      pushPlanningNotice('Ligne planning introuvable pour ajouter un bloc.', 'error')
      return
    }
    const defaultDuration = type === 'repos' ? 45 : 60
    const interval = otInterval(ot)
    const hasValidInterval = Number.isFinite(interval.start) && Number.isFinite(interval.end)
    const fallbackStartMs = new Date(ot.date_chargement_prevue ?? ot.date_livraison_prevue ?? `${selectedDay}T08:00`).getTime()
    const safeStartMs = hasValidInterval ? interval.start : (Number.isFinite(fallbackStartMs) ? fallbackStartMs : new Date(`${selectedDay}T08:00`).getTime())
    const safeEndMs = hasValidInterval
      ? interval.end
      : (Number.isFinite(new Date(ot.date_livraison_prevue ?? '').getTime())
        ? new Date(ot.date_livraison_prevue as string).getTime()
        : safeStartMs + defaultDuration * 60000)

    const anchorMs = type === 'hlp' ? safeStartMs - defaultDuration * 60000 : Math.max(safeEndMs, safeStartMs + 15 * 60000)
    const anchor = new Date(anchorMs)
    if (!Number.isFinite(anchor.getTime())) {
      const fallbackAnchor = new Date(`${selectedDay}T08:00`)
      openPlanningCreationModal({ rowId, dateStart: toDateTimeFromDate(fallbackAnchor), type })
      setPlanningEventDurationParts(defaultDuration)
      setPlanningEventStart(toDateTimeFromDate(fallbackAnchor))
      setNewBlockLabel(`${INLINE_EVENT_LABELS[type]} ${ot.reference}`)
      pushPlanningNotice('Horaire OT incomplet: un horaire par defaut a ete propose pour le bloc.')
      return
    }
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
    void dbDeleteCustomBlock(blockId)
  }
  async function unassignFromCustomBlock(block: CustomBlock) {
    const linkedOT = findOTById(block.otId)
    if (!linkedOT) {
      deleteCustomBlock(block.id)
      return
    }
    await unassign(linkedOT)
  }

  // ── Block color resolver ───────────────────────────────────────────────────────

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

  // ── Computed values ───────────────────────────────────────────────────────────

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
      next[row.id] = buildRowConflicts(rowOTs(row.id), viewStart, viewEnd)
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

  // Map id ? ville pour les sites logistiques
  const sitesMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of logisticSites) m.set(s.id, s.ville ?? s.nom)
    return m
  }, [logisticSites])

  const getOtVilles = (ot: OT) => ({
    dep: ot.chargement_site_id ? (sitesMap.get(ot.chargement_site_id) ?? '') : '',
    arr: ot.livraison_site_id  ? (sitesMap.get(ot.livraison_site_id)  ?? '') : '',
  })

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

  // P�riode visible (� 2j buffer) � utilis�e pour synchroniser la file d'attente
  const viewPeriodStartISO = useMemo(() => {
    if (viewMode === 'mois') return toISO(addDays(monthStart, -2))
    if (viewMode === 'jour') return toISO(addDays(new Date(selectedDay), -2))
    return toISO(addDays(weekStart, -2))
  }, [viewMode, monthStart, selectedDay, weekStart])

  const viewPeriodEndISO = useMemo(() => {
    if (viewMode === 'mois') {
      const lastDay = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
      return toISO(addDays(lastDay, 2))
    }
    if (viewMode === 'jour') return toISO(addDays(new Date(selectedDay), 2))
    return toISO(addDays(weekStart, 9)) // 7j semaine + 2j buffer
  }, [viewMode, monthStart, selectedDay, weekStart])

  const bottomDockNonProgrammees = useMemo(
    () => pool
      .filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter)
      .filter(ot => {
        // OTs sans aucune date ? toujours dans la file (brouillons � planifier)
        if (!ot.date_chargement_prevue && !ot.date_livraison_prevue) return true
        // Chevauchement avec la p�riode visible (� 2j buffer)
        const start = (ot.date_chargement_prevue ?? ot.date_livraison_prevue!).slice(0, 10)
        const end   = (ot.date_livraison_prevue  ?? ot.date_chargement_prevue!).slice(0, 10)
        return start <= viewPeriodEndISO && end >= viewPeriodStartISO
      }),
    [centerFilter, pool, viewPeriodStartISO, viewPeriodEndISO],
  )

  const bottomDockGroupages = useMemo(() => {
    const allPlanning = [...pool, ...ganttOTs]
      .filter(ot => ot.mission_id)
      .filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter)
    const byGroup = new Map<string, OT[]>()
    for (const ot of allPlanning) {
      if (!ot.mission_id) continue
      byGroup.set(ot.mission_id, [...(byGroup.get(ot.mission_id) ?? []), ot])
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
      if (!ot.mission_id) continue
      next.set(ot.mission_id, [...(next.get(ot.mission_id) ?? []), ot])
    }
    for (const [groupId, members] of next.entries()) {
      next.set(groupId, [...members].sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR')))
    }
    return next
  }, [cancelledOTs, ganttOTs, pool])

  const selectedGroupMembers = useMemo(() => {
    if (!selected?.mission_id) return []
    return [...pool, ...ganttOTs, ...cancelledOTs]
      .filter(ot => ot.mission_id === selected.mission_id)
      .sort((left, right) => left.reference.localeCompare(right.reference, 'fr-FR'))
  }, [cancelledOTs, ganttOTs, pool, selected?.mission_id])

  const assignGroupMembers = useMemo(() => {
    if (!assignModal?.ot) return []
    if (!assignModal.ot.mission_id) return [assignModal.ot]
    return groupageMembersByGroupId.get(assignModal.ot.mission_id) ?? [assignModal.ot]
  }, [assignModal, groupageMembersByGroupId])

  useEffect(() => {
    if (!assignModal) return
    setAssignKeepDuration(true)
  }, [assignModal?.ot?.id])

  const assignScheduleMeta = useMemo(() => {
    return getAssignScheduleMeta(assignModal)
  }, [assignModal])

  const assignDurationLabel = useMemo(() => {
    return formatAssignDurationLabel(assignScheduleMeta.durationMinutes)
  }, [assignScheduleMeta.durationMinutes])

  function updateAssignStart(nextDate: string, nextTime: string) {
    setAssignModal(current => {
      if (!current) return current
      return updateAssignStartKeepingDuration(current, nextDate, nextTime, assignKeepDuration)
    })
  }

  function shiftAssignStart(deltaMinutes: number) {
    setAssignModal(current => {
      if (!current) return current
      return shiftAssignStartKeepingDuration(current, deltaMinutes, assignKeepDuration)
    })
  }

  function applyAssignDuration(durationMinutes: number) {
    if (durationMinutes <= 0) return
    setAssignModal(current => {
      if (!current) return current
      return applyAssignDurationFromStart(current, durationMinutes)
    })
  }

  const planningGroupageCandidates = useMemo(() => {
    if (!selected) return []
    const selectedDay = selected.date_chargement_prevue ? selected.date_chargement_prevue.slice(0, 10) : null
    return [...pool, ...ganttOTs]
      .filter(ot => ot.id !== selected.id)
      .filter(ot => planningScope === 'affretement' ? ot.est_affretee : !ot.est_affretee)
      .filter(ot => !ot.groupage_fige)
      .filter(ot => selected.conducteur_id ? ot.conducteur_id === selected.conducteur_id : true)
      .filter(ot => selectedDay ? (ot.date_chargement_prevue ?? '').slice(0, 10) === selectedDay : true)
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
    let list = pool
      .filter(ot => !customOTIds.has(ot.id))
      .filter(ot => !centerFilter || ot.chargement_site_id === centerFilter || ot.livraison_site_id === centerFilter)
      .filter(ot => {
        if (viewMode === 'semaine') return blockPos(ot, weekStart) !== null
        if (viewMode === 'mois') {
          // Vue mois: afficher uniquement les OT qui se croisent avec la periode ouverte.
          if (!ot.date_chargement_prevue && !ot.date_livraison_prevue) return false
          const start = (ot.date_chargement_prevue ?? ot.date_livraison_prevue!).slice(0, 10)
          const end   = (ot.date_livraison_prevue  ?? ot.date_chargement_prevue!).slice(0, 10)
          return start <= viewPeriodEndISO && end >= viewPeriodStartISO
        }
        // mode 'jour'
        return getDayBlockMetrics(ot.date_chargement_prevue, ot.date_livraison_prevue, selectedDay) !== null
      })
    if (poolSearch) {
      const q = poolSearch.toLowerCase()
      list = list.filter(o => o.reference.toLowerCase().includes(q) || o.client_nom.toLowerCase().includes(q))
    }
    if (filterType) list = list.filter(o => o.type_transport === filterType)
    if (filterClient) list = list.filter(o => o.client_nom === filterClient)
    return list
  }, [pool, customOTIds, centerFilter, viewMode, weekStart, selectedDay, poolSearch, filterType, filterClient, viewPeriodStartISO, viewPeriodEndISO])

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
    if (!ot.mission_id) return [ot]
    return groupageMembersByGroupId.get(ot.mission_id) ?? [ot]
  }

  function getGroupageMemberIds(ot: OT): string[] {
    return getGroupageMembersForOt(ot).map(member => member.id)
  }

  type MissionSummary = {
    missionId: string
    missionType: 'complet' | 'groupage' | 'partiel'
    courseCount: number
    label: string
    badge: string
    subtitle: string
    timeRange: string
    statusLabel: string
    clientLabel: string
    referencesLabel: string
    coursePreview: string[]
    frozen: boolean
    members: OT[]
  }

  function getMissionSummaryFromMembers(members: OT[]): MissionSummary {
    const sortedMembers = [...members].sort((left, right) => otInterval(left).start - otInterval(right).start)
    const firstMember = sortedMembers[0]
    const earliest = firstMember?.date_chargement_prevue ?? null
    const latestMember = sortedMembers[sortedMembers.length - 1]
    const latest = latestMember?.date_livraison_prevue ?? latestMember?.date_chargement_prevue ?? null
    const uniqueClients = Array.from(new Set(sortedMembers.map(member => member.client_nom).filter(Boolean)))
    const missionType = sortedMembers.length > 1
      ? 'groupage'
      : firstMember?.type_transport === 'partiel'
        ? 'partiel'
        : 'complet'
    const completedCount = sortedMembers.filter(member => member.statut_transport === 'termine' || member.statut === 'facture').length
    const activeCount = sortedMembers.filter(member => ST_EN_COURS.includes((member.statut_transport ?? '') as never)).length
    const plannedCount = sortedMembers.filter(member => ST_PLANIFIE.includes((member.statut_transport ?? '') as never)).length
    const statusLabel = completedCount === sortedMembers.length
      ? 'Terminee'
      : activeCount > 0
        ? 'En cours'
        : plannedCount > 0
          ? 'Planifiee'
          : 'A confirmer'
    const clientLabel = uniqueClients.length <= 1
      ? (uniqueClients[0] ?? firstMember?.client_nom ?? 'Client non renseigne')
      : `${uniqueClients.length} clients`
    const subtitle = missionType === 'groupage'
      ? `${sortedMembers.length} courses � ${clientLabel}`
      : clientLabel
    const timeRange = [isoToTime(earliest), isoToTime(latest)].filter(Boolean).join(' - ') || 'Horaire non renseigne'
    const coursePreview = sortedMembers.map(member => {
      const memberRange = [isoToTime(member.date_chargement_prevue), isoToTime(member.date_livraison_prevue)].filter(Boolean).join('-')
      const head = [member.reference, member.client_nom].filter(Boolean).join(' � ')
      return memberRange ? `${head} � ${memberRange}` : head
    })

    return {
      missionId: firstMember?.mission_id ?? firstMember?.id ?? crypto.randomUUID(),
      missionType,
      courseCount: sortedMembers.length,
      label: missionType === 'groupage' ? 'Mission groupage' : missionType === 'partiel' ? 'Mission partielle' : 'Course simple',
      badge: missionType === 'groupage' ? `MISSION ${sortedMembers.length}` : missionType.toUpperCase(),
      subtitle,
      timeRange,
      statusLabel,
      clientLabel,
      referencesLabel: sortedMembers.map(member => member.reference).join(' � '),
      coursePreview,
      frozen: sortedMembers.some(member => member.groupage_fige),
      members: sortedMembers,
    }
  }

  function getMissionSummary(ot: OT): MissionSummary {
    return getMissionSummaryFromMembers(getGroupageMembersForOt(ot))
  }

  function getGroupageBubbleLabel(ot: OT): string | null {
    const summary = getMissionSummary(ot)
    return summary.missionType === 'groupage' ? summary.badge : null
  }

  const hoveredMissionSummary = hoveredBlock && hoveredMissionId ? getMissionSummary(hoveredBlock.ot) : null

  function sharesSameGroupage(first: OT, second: OT): boolean {
    return Boolean(first.mission_id && first.mission_id === second.mission_id)
  }

  function buildFrozenGroupageOverlays(ots: OT[]): Array<{ groupId: string; leftPct: number; widthPct: number; label: string; references: string }> {
    const byGroup = new Map<string, OT[]>()
    for (const ot of ots) {
      if (!ot.mission_id || !ot.groupage_fige) continue
      byGroup.set(ot.mission_id, [...(byGroup.get(ot.mission_id) ?? []), ot])
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
        label: `Lot verrouille � ${visibleMembers.length} courses`,
        references: visibleMembers.map(item => item.member.reference).join(' � '),
      })
    }

    return overlays
  }

  function buildHoveredMissionOverlays(ots: OT[]): Array<{ groupId: string; leftPct: number; widthPct: number; frozen: boolean; label: string }> {
    if (!hoveredMissionId) return []
    const members = ots.filter(ot => ot.mission_id === hoveredMissionId)
    if (members.length === 0) return []

    const visibleMembers = members
      .map(member => ({
        member,
        metrics: viewMode === 'semaine'
          ? getWeekBlockMetrics(member, weekStart)
          : getDayBlockMetrics(member.date_chargement_prevue, member.date_livraison_prevue, selectedDay),
      }))
      .filter((item): item is { member: OT; metrics: BlockMetrics } => Boolean(item.metrics))

    if (visibleMembers.length === 0) return []

    const summary = getMissionSummaryFromMembers(visibleMembers.map(item => item.member))
    const leftPct = Math.min(...visibleMembers.map(item => item.metrics.leftPct))
    const rightPct = Math.max(...visibleMembers.map(item => item.metrics.leftPct + item.metrics.widthPct))

    return [{
      groupId: hoveredMissionId,
      leftPct,
      widthPct: rightPct - leftPct,
      frozen: summary.frozen,
      label: `${summary.label} � ${summary.courseCount} course${summary.courseCount > 1 ? 's' : ''}`,
    }]
  }

  function buildGroupedBlockLayout(ots: OT[]): Record<string, { top: number; height: number; compact: boolean }> {
    const layout: Record<string, { top: number; height: number; compact: boolean }> = {}
    const byGroup = new Map<string, OT[]>()

    for (const ot of ots) {
      if (!ot.mission_id) continue
      byGroup.set(ot.mission_id, [...(byGroup.get(ot.mission_id) ?? []), ot])
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
    summary: MissionSummary
  }> {
    const byGroup = new Map<string, OT[]>()
    for (const ot of ots) {
      if (!ot.mission_id) continue
      byGroup.set(ot.mission_id, [...(byGroup.get(ot.mission_id) ?? []), ot])
    }

    const cards: Array<{
      groupId: string
      leftPct: number
      widthPct: number
      members: OT[]
      frozen: boolean
      summary: MissionSummary
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
        summary: getMissionSummaryFromMembers(sortedMembers),
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
    return getOtInterval(ot)
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
    return buildPlanningUrgences({
      nowTs: Date.now(),
      ganttOTs,
      unresourced,
      conflicts: bottomDockConflicts,
      formatMinutes,
      limit: 40,
    })
  }, [bottomDockConflicts, ganttOTs, unresourced])

  const bottomDockTabs = useMemo(() => ([
    { key: 'missions' as BottomDockTab, label: 'Missions', count: bottomDockMissions.length, featureKey: null as ExploitantFeatureKey | null },
    { key: 'urgences' as BottomDockTab, label: 'Alertes', count: bottomDockUrgences.length, featureKey: 'tab_urgences' as ExploitantFeatureKey },
    { key: 'non_affectees' as BottomDockTab, label: 'Non affectees (vue)', count: unresourced.length, featureKey: 'tab_non_affectees' as ExploitantFeatureKey },
    { key: 'conflits' as BottomDockTab, label: 'Conflits', count: bottomDockConflicts.reduce((sum, item) => sum + item.pairs.length, 0), featureKey: 'tab_conflits' as ExploitantFeatureKey },
    { key: 'affretement' as BottomDockTab, label: 'Affretement', count: activeAffretementContracts.length, featureKey: 'tab_affretement' as ExploitantFeatureKey },
    { key: 'groupages' as BottomDockTab, label: 'Groupages', count: bottomDockGroupages.length, featureKey: 'tab_groupages' as ExploitantFeatureKey },
    { key: 'non_programmees' as BottomDockTab, label: 'Non programmees', count: bottomDockNonProgrammees.length, featureKey: 'tab_non_programmees' as ExploitantFeatureKey },
    { key: 'annulees' as BottomDockTab, label: 'Annulees', count: bottomDockAnnulees.length, featureKey: 'tab_annulees' as ExploitantFeatureKey },
    { key: 'entrepots' as BottomDockTab, label: 'Entrepots', count: relaisList.filter(r => r.type_relais === 'depot_marchandise' && r.statut === 'en_attente').length, featureKey: 'tab_entrepots' as ExploitantFeatureKey },
    { key: 'relais' as BottomDockTab, label: 'Relais conducteur', count: relaisList.filter(r => r.type_relais === 'relais_conducteur' && (r.statut === 'en_attente' || r.statut === 'assigne')).length, featureKey: 'tab_relais' as ExploitantFeatureKey },
    { key: 'retour_charge' as BottomDockTab, label: 'Retour en charge IA', count: retourChargeSuggestions.length, featureKey: 'tab_retour_charge' as ExploitantFeatureKey },
  ]), [
    activeAffretementContracts.length,
    bottomDockAnnulees.length,
    bottomDockConflicts,
    bottomDockGroupages.length,
    bottomDockMissions.length,
    bottomDockNonProgrammees.length,
    bottomDockUrgences.length,
    relaisList,
    retourChargeSuggestions.length,
    unresourced.length,
  ])

  const visibleBottomDockTabs = useMemo(
    () => bottomDockTabs.filter(item => !item.featureKey || isFeatureEnabled(item.featureKey)),
    [bottomDockTabs, isFeatureEnabled],
  )

  useEffect(() => {
    if (visibleBottomDockTabs.some(item => item.key === bottomDockTab)) return
    setBottomDockTab(visibleBottomDockTabs[0]?.key ?? 'missions')
  }, [bottomDockTab, visibleBottomDockTabs])

  const exploitantTabOptions = useMemo(() => ([
    { key: 'tab_urgences' as ExploitantFeatureKey, label: 'Alertes', count: bottomDockUrgences.length },
    { key: 'tab_non_affectees' as ExploitantFeatureKey, label: 'Non affectees', count: unresourced.length },
    { key: 'tab_conflits' as ExploitantFeatureKey, label: 'Conflits', count: bottomDockConflicts.reduce((sum, item) => sum + item.pairs.length, 0) },
    { key: 'tab_affretement' as ExploitantFeatureKey, label: 'Affretement', count: activeAffretementContracts.length },
    { key: 'tab_groupages' as ExploitantFeatureKey, label: 'Groupages', count: bottomDockGroupages.length },
    { key: 'tab_non_programmees' as ExploitantFeatureKey, label: 'Non programmees', count: bottomDockNonProgrammees.length },
    { key: 'tab_annulees' as ExploitantFeatureKey, label: 'Annulees', count: bottomDockAnnulees.length },
    { key: 'tab_entrepots' as ExploitantFeatureKey, label: 'Entrepots', count: relaisList.filter(r => r.type_relais === 'depot_marchandise' && r.statut === 'en_attente').length },
    { key: 'tab_relais' as ExploitantFeatureKey, label: 'Relais', count: relaisList.filter(r => r.type_relais === 'relais_conducteur' && (r.statut === 'en_attente' || r.statut === 'assigne')).length },
    { key: 'tab_retour_charge' as ExploitantFeatureKey, label: 'Retour IA', count: retourChargeSuggestions.length },
  ]), [
    activeAffretementContracts.length,
    bottomDockAnnulees.length,
    bottomDockConflicts,
    bottomDockGroupages.length,
    bottomDockNonProgrammees.length,
    bottomDockUrgences.length,
    relaisList,
    retourChargeSuggestions.length,
    unresourced.length,
  ])

  const exploitantActionOptions: Array<{ key: ExploitantFeatureKey; label: string }> = [
    { key: 'action_affecter', label: 'Affectation / programmation' },
    { key: 'action_groupage', label: 'Actions de groupage' },
    { key: 'action_resoudre_conflits', label: 'Resolution auto des conflits' },
    { key: 'action_relais', label: 'Depots & relais conducteur' },
    { key: 'action_notifier_client', label: 'Notification client' },
    { key: 'action_optimize_tour', label: 'Optimisation de tournee' },
  ]

  const canMove = (ot: OT) => {
    // Un OT place doit rester deplacable entre lignes tant que le lot n'est pas fige.
    return !ot.groupage_fige
  }
  const canUnlock = canMove

  function ghostPos(rowId: string): React.CSSProperties | null {
    if (!hoverRow || hoverRow.rowId !== rowId || !drag) return null
    if ((drag.kind === 'pool' || drag.kind === 'block') && drag.ot) {
      // OT drag: la course garde toujours sa position sur la timeline; seule la ressource change.
      if (viewMode === 'semaine') {
        const metrics = getWeekBlockMetrics(drag.ot, weekStart)
        if (!metrics) return null
        return { position:'absolute', top:'6px', height:'40px', left:`calc(${metrics.leftPct}% + 2px)`, width:`calc(${metrics.widthPct}% - 4px)`, zIndex:20, pointerEvents:'none' }
      }
      const metrics = getDayBlockMetrics(drag.ot.date_chargement_prevue, drag.ot.date_livraison_prevue, selectedDay)
      if (!metrics) return null
      return { position:'absolute', top:'4px', height:'44px', left:`${metrics.leftPct}%`, width:`${metrics.widthPct}%`, zIndex:20, pointerEvents:'none' }
    }
    // block et custom: le ghost suit la position du curseur
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

  function escapeHtml(value: unknown): string {
    const text = value == null ? '' : String(value)
    return text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
  }

  function printDriverPlanningPeriod(rowId: string, rowLabel: string, period: 'jour' | 'semaine' | 'mois') {
    const dayStart = new Date(`${selectedDay}T00:00:00`)
    const dayEnd = new Date(`${selectedDay}T23:59:59`)
    const weekStartDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate())
    const weekEndDate = new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 6, 23, 59, 59)
    const monthStartDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1)
    const monthEndDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), getMonthDays(monthStart), 23, 59, 59)

    const range = period === 'jour'
      ? { start: dayStart, end: dayEnd, label: `Journee du ${dayStart.toLocaleDateString('fr-FR')}` }
      : period === 'semaine'
        ? { start: weekStartDate, end: weekEndDate, label: `Semaine du ${weekStartDate.toLocaleDateString('fr-FR')} au ${weekEndDate.toLocaleDateString('fr-FR')}` }
        : { start: monthStartDate, end: monthEndDate, label: `Mois de ${monthStartDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` }

    const ots = rowOTs(rowId)
      .filter(ot => {
        const start = new Date(ot.date_chargement_prevue ?? ot.date_livraison_prevue ?? '')
        const end = new Date(ot.date_livraison_prevue ?? ot.date_chargement_prevue ?? '')
        if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return false
        return start.getTime() <= range.end.getTime() && end.getTime() >= range.start.getTime()
      })
      .sort((a, b) => {
        const aStart = new Date(a.date_chargement_prevue ?? a.date_livraison_prevue ?? '').getTime()
        const bStart = new Date(b.date_chargement_prevue ?? b.date_livraison_prevue ?? '').getTime()
        return aStart - bStart
      })

    const extractPostalAndCity = (address: string | null | undefined): { postal: string; city: string } => {
      const text = (address ?? '').trim()
      if (!text) return { postal: '-', city: '-' }
      const match = text.match(/\b(\d{5})\s+([^,]+)$/)
      if (!match) return { postal: '-', city: '-' }
      return { postal: match[1] ?? '-', city: (match[2] ?? '-').trim() || '-' }
    }

    const rowsHtml = ots.length > 0
      ? ots.map(ot => {
          const startDate = ot.date_chargement_prevue ? new Date(ot.date_chargement_prevue) : null
          const endDate = ot.date_livraison_prevue ? new Date(ot.date_livraison_prevue) : null
          const startDay = startDate ? startDate.toLocaleDateString('fr-FR') : '-'
          const startHour = startDate ? startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'
          const endDay = endDate ? endDate.toLocaleDateString('fr-FR') : '-'
          const endHour = endDate ? endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'
          const originSite = ot.chargement_site_id ? logisticSites.find(site => site.id === ot.chargement_site_id) ?? null : null
          const destinationSite = ot.livraison_site_id ? logisticSites.find(site => site.id === ot.livraison_site_id) ?? null : null
          const origin = originSite?.nom ?? '-'
          const originAddress = originSite?.adresse ?? '-'
          const originHours = originSite?.horaires_ouverture ?? '-'
          const originParsed = extractPostalAndCity(originSite?.adresse)
          const originPostal = (originSite?.code_postal ?? originParsed.postal ?? '-').toString()
          const originCity = (originSite?.ville ?? originParsed.city ?? '-').toString()
          const destination = destinationSite?.nom ?? '-'
          const destinationAddress = destinationSite?.adresse ?? '-'
          const destinationHours = destinationSite?.horaires_ouverture ?? '-'
          const destinationParsed = extractPostalAndCity(destinationSite?.adresse)
          const destinationPostal = (destinationSite?.code_postal ?? destinationParsed.postal ?? '-').toString()
          const destinationCity = (destinationSite?.ville ?? destinationParsed.city ?? '-').toString()
          const referenceChargement = `${ot.reference} / CHARGEMENT`
          const referenceLivraison = `${ot.reference} / LIVRAISON`
          const numeroOt = ot.id.slice(0, 8).toUpperCase()
          const contactName = ot.client_nom || '-'
          const contactPhone = 'N/R'
          return `<tr><td>${escapeHtml(ot.reference)}</td><td>${escapeHtml(referenceChargement)}</td><td>${escapeHtml(referenceLivraison)}</td><td>${escapeHtml(numeroOt)}</td><td>${escapeHtml(contactName)}</td><td>${escapeHtml(contactPhone)}</td><td>${escapeHtml(origin)}</td><td>${escapeHtml(originAddress)}</td><td>${escapeHtml(originPostal)}</td><td>${escapeHtml(originCity)}</td><td>${escapeHtml(originHours)}</td><td>${escapeHtml(destination)}</td><td>${escapeHtml(destinationAddress)}</td><td>${escapeHtml(destinationPostal)}</td><td>${escapeHtml(destinationCity)}</td><td>${escapeHtml(destinationHours)}</td><td>${escapeHtml(startDay)}</td><td>${escapeHtml(startHour)}</td><td>${escapeHtml(endDay)}</td><td>${escapeHtml(endHour)}</td><td>${escapeHtml(STATUT_LABEL[ot.statut] ?? ot.statut)}</td></tr>`
        }).join('')
      : '<tr><td colspan="21">Aucune course sur cette periode.</td></tr>'

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Planning conducteur</title><style>
      @page { size: A4 landscape; margin: 12mm; }
      body { font-family: Arial, sans-serif; margin: 12px; color: #0f172a; }
      h1 { margin: 0 0 8px 0; font-size: 20px; }
      .sub { margin: 0 0 18px 0; color: #334155; }
      table { width: 100%; border-collapse: collapse; font-size: 8px; }
      th, td { border: 1px solid #cbd5e1; padding: 3px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; }
    </style></head><body>
      <h1>Planning conducteur - ${escapeHtml(rowLabel)}</h1>
      <p class="sub">${escapeHtml(range.label)} - genere le ${escapeHtml(new Date().toLocaleString('fr-FR'))}</p>
      <table>
        <thead><tr><th>Reference</th><th>Ref. annotation charg.</th><th>Ref. annotation livr.</th><th>No OT</th><th>Contact</th><th>No contact</th><th>Nom chargement</th><th>Adresse chargement</th><th>CP charg.</th><th>Ville charg.</th><th>Horaires charg.</th><th>Nom livraison</th><th>Adresse livraison</th><th>CP livr.</th><th>Ville livr.</th><th>Horaires livr.</th><th>Date charg.</th><th>Heure charg.</th><th>Date livr.</th><th>Heure livr.</th><th>Statut</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`

    const popup = window.open('about:blank', '_blank', 'width=1100,height=780')
    if (popup) {
      popup.document.open()
      popup.document.write(html)
      popup.document.close()
      popup.onload = () => {
        popup.focus()
        popup.print()
      }
      return
    }

    // Fallback sans popup: impression via iframe cachée.
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument
    if (!doc) {
      document.body.removeChild(iframe)
      pushPlanningNotice('Impossible de preparer l impression.', 'error')
      return
    }
    doc.open()
    doc.write(html)
    doc.close()
    iframe.onload = () => {
      const frameWindow = iframe.contentWindow
      if (frameWindow) {
        frameWindow.focus()
        frameWindow.print()
      }
      window.setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      }, 1500)
    }
    pushPlanningNotice('Popup bloquee: impression lancee en mode integre.', 'success')
  }

  // ── Row label renderer ────────────────────────────────────────────────────────

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
        onContextMenu={e => {
          if (tab !== 'conducteurs' || row.isCustom || row.isAffretementAsset || isRowEditMode) return
          e.preventDefault()
          e.stopPropagation()
          setDriverPrintMenu({ x: e.clientX, y: e.clientY, rowId: row.id, rowLabel: row.primary })
        }}
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

          {/* Badge statut maintenance v�hicule */}
          {tab === 'camions' && !row.isCustom && !row.isAffretementAsset && (() => {
            const vStatut = vehiculeById.get(row.id)?.statut
            if (vStatut === 'maintenance') return <span className="text-[9px] bg-orange-600/30 text-orange-300 rounded px-1 py-0.5 font-bold flex-shrink-0" title="V�hicule en maintenance">MAINT</span>
            if (vStatut === 'hs') return <span className="text-[9px] bg-red-600/30 text-red-300 rounded px-1 py-0.5 font-bold flex-shrink-0" title="Hors service">HS</span>
            return null
          })()}

          {/* Alerte retard */}
          {hasLateOT && !row.isCustom && (
            <span className="text-[9px] text-red-400 flex-shrink-0" title="OT en retard">?</span>
          )}

          {/* Badge absence RH */}
          {tab === 'conducteurs' && !row.isCustom && !row.isAffretementAsset && (() => {
            const abs = conducteurAbsences.get(row.id)
            if (!abs || abs.length === 0) return null
            const labels = abs.map(a => `${TYPE_ABSENCE_LABELS[a.type_absence]} du ${a.date_debut} au ${a.date_fin}`).join('\n')
            return <span className="text-[9px] bg-rose-700/40 text-rose-200 rounded px-1 py-0.5 font-bold flex-shrink-0" title={labels}>ABSENT</span>
          })()}

          <p className={`text-sm font-semibold truncate ${row.isAffretementAsset ? 'text-blue-200' : 'text-slate-200'}`}>{row.primary}</p>

          {/* Badge scan CE561 */}
          {!row.isCustom && !row.isAffretementAsset && weekScanResults[row.id] && (
            <span
              title={weekScanResults[row.id].alerts.map(a => `${a.type === 'bloquant' ? '?' : '?'} ${a.code}: ${a.message}`).join('\n')}
              className={`text-[9px] px-1 py-0.5 rounded font-bold flex-shrink-0 cursor-default ${
                weekScanResults[row.id].hasBlocking
                  ? 'bg-rose-500/30 text-rose-200'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {weekScanResults[row.id].hasBlocking ? '?' : '?'} CE561
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

        {/* Badge km � vide + taux de charge (camions uniquement) */}
        {tab === 'camions' && !row.isCustom && !row.isAffretementAsset && (() => {
          const kmVide = kmVideSynthese.get(row.id)
          if (!kmVide) return null
          const taux = kmVide.taux_charge_pct
          if (taux === null) return null
          const couleur = taux >= 85 ? 'text-emerald-400' : taux >= 65 ? 'text-amber-400' : 'text-red-400'
          const titre = `Taux de charge 30j : ${taux}%${kmVide.total_km_vide_estime ? ` � ${kmVide.total_km_vide_estime} km � vide estim�s` : ''}`
          return (
            <p className={`text-[9px] font-bold mt-0.5 pl-0.5 ${couleur}`} title={titre}>
              {taux >= 85 ? '?' : taux >= 65 ? '?' : '?'} {taux}% chg.
            </p>
          )
        })()}

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

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div
      className={`nx-planning relative flex min-h-full bg-slate-950 ${isResizingBottomDock ? 'cursor-ns-resize' : ''}`}
      style={{ overflowX: 'clip', paddingBottom: bottomDockCollapsed ? '52px' : `${bottomDockHeight + 20}px` }}
    >
      {planningNotice && (
        <div className={`absolute right-4 top-4 z-[80] max-w-sm rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl ${drag ? 'pointer-events-none' : ''}`}
          style={planningNotice.type === 'error'
            ? { borderColor: 'rgba(244,114,182,0.35)', background: 'rgba(127,29,29,0.92)', color: '#fecdd3' }
            : { borderColor: 'rgba(52,211,153,0.35)', background: 'rgba(6,78,59,0.92)', color: '#d1fae5' }}>
          {planningNotice.message}
        </div>
      )}
      {/* Barre de chargement subtile en haut du planning */}
      {isLoadingOTs && ganttOTs.length > 0 && (
        <div className="absolute top-0 left-0 right-0 z-[90] h-0.5 overflow-hidden">
          <div className="h-full w-1/3 bg-blue-500/80 rounded-full animate-[shimmer_1s_ease-in-out_infinite]"
            style={{ animation: 'shimmer 1s ease-in-out infinite', transformOrigin: 'left' }}
          />
          <style>{`@keyframes shimmer { 0% { transform: translateX(-100%) } 100% { transform: translateX(400%) } }`}</style>
        </div>
      )}
      {lastComplianceAudit && (
        <div className={`absolute right-4 top-24 z-[79] w-[26rem] max-h-[45vh] overflow-y-auto rounded-xl border border-amber-500/30 bg-slate-900/95 px-3 py-3 shadow-2xl ${drag ? 'pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
              Detail audit CE561 {blockOnCompliance ? '(mode bloquant)' : '(non bloquant)'}
            </p>
            <button
              type="button"
              onClick={() => setLastComplianceAudit(null)}
              className="text-[10px] px-2 py-0.5 rounded border border-slate-700 text-slate-400 hover:text-slate-200"
            >
              masquer
            </button>
          </div>
          {!blockOnCompliance && (
            <p className="text-[10px] text-emerald-300 mt-1">
              Audit informatif: vous pouvez affecter, puis activer le mode CE561 bloquant si vous souhaitez imposer la conformite.
            </p>
          )}
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
                        {blockOnCompliance
                          ? (activeBlock ? 'bloque' : 'non bloque')
                          : (activeBlock ? 'audit seulement' : 'non bloque')}
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
      <div className="w-60 flex-shrink-0 bg-slate-900 border-r border-slate-700/80 flex flex-col shadow-lg overflow-hidden" style={{ position: 'sticky', top: 0, height: bottomDockCollapsed ? 'calc(100vh - 44px)' : `calc(100vh - ${Math.max(44, bottomDockHeight + 12)}px)`, alignSelf: 'flex-start' }}>
        {/* En-tete pool */}
        <div className="px-3 pt-2.5 pb-2 border-b border-slate-700/60 flex-shrink-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">File d'attente</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-xl font-bold text-white">{visiblePool.length}</span>
                <span className="text-xs text-slate-500">OT{visiblePool.length !== 1 ? 's' : ''} � placer</span>
              </div>
            </div>
            {kpi.retard > 0 && (
              <div className="flex flex-col items-center bg-red-900/30 border border-red-700/40 rounded-lg px-2 py-1 flex-shrink-0">
                <span className="text-base font-bold text-red-400 leading-none">{kpi.retard}</span>
                <span className="text-[9px] text-red-500 font-semibold mt-0.5">RETARD</span>
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

        {/* Gradient scroll indicator */}
        <div className="relative flex-1 min-h-0 flex flex-col">
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none z-10" />
          <div className="flex-1 overflow-y-auto py-1.5 px-2 min-h-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
          {visiblePool.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-2xl mb-2">?</p>
              <p className="text-xs text-slate-600">Aucune OT non affectee sur la vue active</p>
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
            return groups.filter(g => g.list.length > 0).map(group => {
              const isCollapsed = collapsedPoolGroups.has(group.label)
              return (
              <div key={group.label} className="mb-1">
                <button
                  type="button"
                  onClick={() => setCollapsedPoolGroups(prev => {
                    const s = new Set(prev)
                    if (s.has(group.label)) {
                      s.delete(group.label)
                    } else {
                      s.add(group.label)
                    }
                    return s
                  })}
                  className={`w-full flex items-center justify-between px-1 py-1 rounded hover:bg-slate-800/60 transition-colors group ${group.color}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">{group.label} ({group.list.length})</span>
                  <svg className={`w-3 h-3 transition-transform flex-shrink-0 ${isCollapsed ? '-rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {!isCollapsed && group.list.map(ot => {
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
                        <button
                          type="button"
                          title="Cliquer pour changer le statut"
                          onClick={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            void updateOtStatusFromPlanning(ot, getNextOtStatus(ot.statut))
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 transition-opacity hover:opacity-85 ${BADGE_CLS[ot.statut] ?? 'bg-slate-700 text-slate-400'}`}
                        >
                          {STATUT_LABEL[ot.statut] ?? ot.statut}
                        </button>
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
            )})
          })()}
          </div>
        </div>
      </div>

      {/* -- Gantt area ---------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ── Top bar ── */}
        <div className="flex flex-wrap gap-2 px-4 py-2.5 border-b border-slate-700 bg-slate-900 flex-shrink-0 items-start">
          <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-1.5 xl:gap-2">
            <div className="flex rounded-lg border border-slate-700 overflow-hidden flex-shrink-0">
              <button
                type="button"
                onClick={() => setPlanningScope('principal')}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${planningScope === 'principal' ? 'bg-blue-200 text-blue-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Principal
              </button>
              <button
                type="button"
                onClick={() => setPlanningScope('affretement')}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${planningScope === 'affretement' ? 'bg-blue-200 text-blue-900' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Affreteur dedie
              </button>
            </div>

            {/* View mode */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden flex-shrink-0">
              {(['semaine','jour','mois'] as ViewMode[]).map(v => (
                <button key={v} onClick={() => {
                  if (v === 'mois') setMonthStart(getMonthStart(weekStart))
                  setViewMode(v)
                }}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${viewMode===v ? 'bg-blue-200 text-blue-900' : 'text-slate-600 hover:text-slate-900'}`}>
                  {v === 'semaine' ? '7 jours' : v === 'jour' ? 'Journee' : 'Mois'}
                </button>
              ))}
            </div>

            <div className="relative w-[210px]">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                value={resourceSearch}
                onChange={e => setResourceSearch(e.target.value)}
                placeholder="Rechercher une ressource"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="relative flex flex-shrink-0 flex-wrap items-center gap-1.5">
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
              onClick={() => setBlockImpossibleAssignments(current => {
                const next = !current
                saveBooleanSetting(ASSIGNMENT_IMPOSSIBLE_BLOCK_KEY, next)
                return next
              })}
              title="Activer ou desactiver le blocage des affectations declarees impossibles"
              className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border transition-all ${
                blockImpossibleAssignments
                  ? 'bg-red-100 border-red-400 text-red-900'
                  : 'bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200'
              }`}
            >
              Affect. impossible {blockImpossibleAssignments ? 'ON' : 'OFF'}
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
                  ? 'bg-red-100 border-red-400 text-red-900'
                  : 'bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200'
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
                  : 'bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200'
              }`}
            >
              {scanningWeek ? 'Scan...' : 'Scanner la semaine'}
            </button>
            {Object.keys(weekScanResults).length > 0 && (
              <button
                onClick={() => setWeekScanResults({})}
                title="Effacer les resultats du scan"
                className="h-8 w-8 flex items-center justify-center rounded-lg text-xs border border-slate-700 text-slate-500 hover:text-slate-300"
              >?</button>
            )}

            <button
              onClick={() => setShowComplianceRules(v => !v)}
              title="Parametrer le blocage CE561 par regle"
              className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:border-slate-500"
            >
              Regles CE561
            </button>

            {/* Export PDF � uniquement en vue semaine */}
            {viewMode === 'semaine' && (
              <button
                onClick={() => generatePlanningWeekPDF({
                  weekStart,
                  rows: visibleRows.map(r => ({ id: r.id, label: r.primary, subtitle: r.secondary })),
                  getRowOTs: rowId => rowOTs(rowId),
                })}
                title="Exporter le planning de la semaine en PDF"
                className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:border-slate-500"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                PDF
              </button>
            )}
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
              else if (viewMode==='mois') setMonthStart(m => addMonths(m,-1))
              else { const d = parseDay(selectedDay); d.setDate(d.getDate()-1); setSelectedDay(toISO(d)) }
            }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xl font-light transition-colors">&lt;</button>

            <button onClick={() => {
              const todayDate = new Date(); setWeekStart(getMonday(todayDate)); setSelectedDay(toISO(todayDate)); setMonthStart(getMonthStart(todayDate))
            }} className="px-3 h-8 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              Aujourd'hui
            </button>

            <button onClick={() => {
              if (viewMode==='semaine') setWeekStart(w => addDays(w,7))
              else if (viewMode==='mois') setMonthStart(m => addMonths(m,1))
              else { const d = parseDay(selectedDay); d.setDate(d.getDate()+1); setSelectedDay(toISO(d)) }
            }} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-xl font-light transition-colors">&gt;</button>

            <span className="mx-0.5 h-5 w-px bg-slate-700/80" aria-hidden="true" />

            <button
              type="button"
              onClick={() => openPlanningCreationModal({ type: 'course' })}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-colors border border-emerald-600/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
            >
              <span className="text-sm leading-none">+</span>
              Nouvelle course
            </button>
            <button
              type="button"
              onClick={() => openPlanningCreationModal({ type: 'hlp' })}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors border border-slate-600/50 bg-slate-700/30 text-slate-200 hover:bg-slate-700/50"
            >
              <span className="text-sm leading-none">+</span>
              HLP / bloc
            </button>
            <button
              type="button"
              onClick={() => navigate('/transports')}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium transition-colors border border-blue-600/50 bg-blue-500/15 text-blue-300 hover:bg-blue-500/25"
              title="Aller saisir un OT complet"
            >
              OT / Fret ↗
            </button>
          </div>
        </div>

        {/* -- KPI Strip exploitation -- */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-800/60 bg-slate-950/60 flex-shrink-0 overflow-x-hidden">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">A placer</span>
            <span className="text-sm font-bold text-white">{unresourced.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0"/>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Conducteurs</span>
            <span className="text-sm font-bold text-white">{conducteurs.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0"/>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Vehicules</span>
            <span className="text-sm font-bold text-white">{vehicules.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0"/>
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Remorques</span>
            <span className="text-sm font-bold text-white">{remorques.length}</span>
          </div>
          {kpi.retard > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyAlert(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0 animate-pulse transition-colors ${showOnlyAlert ? 'bg-red-200 border-red-400' : 'bg-red-100 border-red-300'}`}
            >
              <span className="text-[10px] font-bold text-red-800 whitespace-nowrap">{kpi.retard} retard{kpi.retard > 1 ? 's' : ''}</span>
            </button>
          )}
          {kpi.conflits > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyConflicts(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0 transition-colors ${showOnlyConflicts ? 'bg-red-200 border-red-400' : 'bg-red-100 border-red-300'}`}
            >
              <span className="text-[10px] font-bold text-red-800 whitespace-nowrap">Conflits {kpi.conflits}</span>
            </button>
          )}
          {kpi.aFacturer > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
              <span className="text-[10px] font-bold text-slate-200 whitespace-nowrap">EUR {kpi.aFacturer} a facturer</span>
            </div>
          )}
          {kpi.nbAff > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
              <span className="text-[10px] font-bold text-slate-200 whitespace-nowrap">Affrete: {kpi.nbAff}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">CA planifie</span>
            <span className="text-sm font-bold text-slate-100">{kpi.caPlanning > 0 ? `${(kpi.caPlanning/1000).toFixed(0)}k EUR` : '-'}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40 flex-shrink-0">
            <span className="text-[10px] text-slate-500 whitespace-nowrap">Scope</span>
            <span className="text-sm font-bold text-white">{planningScope === 'affretement' ? 'Affretement' : 'Principal'}</span>
          </div>
        </div>

        {tab === 'conducteurs' && (
          <div className="border-b border-slate-800/60 bg-slate-950/60 flex-shrink-0">
            <ComplianceCountersBar
              conducteurId={liveConducteurId}
              date={liveComplianceDate}
              service={planningComplianceService}
            />
          </div>
        )}

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
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab===t.key ? 'border-indigo-400 text-white' : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
                }`}>
                {t.label}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab===t.key ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-800'}`}>{t.count}</span>
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

        {/* -- gantt rows area --------------------------------------------- */}
        <div className="overflow-x-auto">

        {/* -- Skeleton de chargement initial ------------------------------- */}
        {isLoadingOTs && ganttOTs.length === 0 && (
          <div className="animate-pulse px-4 py-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-40 h-8 rounded-lg bg-slate-800/70 flex-shrink-0" />
                <div className="flex-1 h-8 rounded-lg bg-slate-800/50" style={{ width: `${40 + Math.random() * 45}%` }} />
              </div>
            ))}
          </div>
        )}

        {/* ── WEEK VIEW ──────────────────────────────────────────────────────── */}
        {viewMode === 'semaine' && (
          <div className="overflow-visible" onDragOver={e => e.preventDefault()}>
            {/* Day headers */}
            <div className="flex sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
              <div className="w-44 flex-shrink-0 border-r border-slate-700 bg-slate-900 px-2 py-1.5 flex items-center">
                <span className="inline-flex items-center rounded-lg border border-slate-600/70 bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-200">
                  {fmtWeek(weekStart)}
                </span>
              </div>
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
              const hoveredMissionOverlays = row.isCustom ? [] : buildHoveredMissionOverlays(ots)
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
                    {hoveredMissionOverlays.map(overlay => (
                      <div
                        key={`hovered-week-${overlay.groupId}`}
                        style={{ position:'absolute', top:'0px', bottom:'0px', left:`calc(${overlay.leftPct}% + 1px)`, width:`calc(${overlay.widthPct}% - 2px)` }}
                        className={`pointer-events-none rounded-[24px] border transition-all ${overlay.frozen ? 'border-indigo-300/55 bg-indigo-400/8 shadow-[0_0_0_1px_rgba(165,180,252,0.24),0_0_30px_rgba(99,102,241,0.12)]' : 'border-amber-300/55 bg-amber-300/10 shadow-[0_0_0_1px_rgba(251,191,36,0.24),0_0_30px_rgba(251,191,36,0.12)]'}`}
                      >
                        <span className={`absolute left-3 -top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${overlay.frozen ? 'border border-indigo-400/45 bg-slate-950/95 text-indigo-200' : 'border border-amber-300/55 bg-slate-950/95 text-amber-200'}`}>
                          {overlay.label}
                        </span>
                      </div>
                    ))}
                    {frozenGroupageOverlays.map(overlay => (
                      <div
                        key={`frozen-week-${overlay.groupId}`}
                        style={{ position:'absolute', top:'2px', height:'60px', left:`calc(${overlay.leftPct}% + 1px)`, width:`calc(${overlay.widthPct}% - 2px)` }}
                        className={`pointer-events-none rounded-[20px] border border-indigo-400/45 bg-indigo-500/10 shadow-inner ring-1 ring-indigo-300/10 transition-all ${getMissionHoverClasses(overlay.groupId, true)}`}
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
                        onMouseEnter={e => openHoverPreview(card.members[0], e.clientX, e.clientY)}
                        onMouseLeave={clearHoverPreview}
                        className={`rounded-xl border overflow-hidden shadow-lg transition-all ${card.frozen ? 'border-indigo-300/70 bg-slate-950/96' : 'border-amber-300/70 bg-amber-50/95'} ${getMissionHoverClasses(card.groupId, card.frozen)}`}
                      >
                        <div className={`flex items-center justify-between gap-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${card.frozen ? 'bg-indigo-500/20 text-indigo-100' : 'bg-amber-100 text-amber-950'}`}>
                          <span className="truncate">{card.summary.label}</span>
                          <span className="flex-shrink-0">{card.frozen ? 'Verrouillee' : 'Deliable'}</span>
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
                                  <span className={`truncate font-mono text-[10px] font-bold ${card.frozen ? 'text-white' : 'text-slate-950'}`}>{member.reference}</span>
                                </div>
                                <span className={`truncate text-[10px] font-semibold ${card.frozen ? 'text-white/80' : 'text-slate-700'}`}>{member.client_nom}</span>
                                <span className={`truncate text-[9px] font-mono ${card.frozen ? 'text-white/45' : 'text-slate-500'}`}>{isoToTime(member.date_chargement_prevue)}-{isoToTime(member.date_livraison_prevue)}</span>
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
                          draggable={canMove(ot) && !isRowEditMode}
                          onDragStart={canMove(ot) && !isRowEditMode ? e => onDragStartBlock(ot, e) : undefined}
                          onDragEnd={onDragEnd}
                          onMouseEnter={!drag ? e => openHoverPreview(ot, e.clientX, e.clientY) : undefined}
                          onMouseLeave={!drag ? clearHoverPreview : undefined}
                          className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col px-2 py-1 gap-0 transition-[opacity,filter] overflow-hidden shadow-md group/block
                            ${canMove(ot)&&!isRowEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                            ${isDragging?'opacity-30':isSaving?'opacity-70 animate-pulse':'hover:brightness-110'}
                            ${isLate ? 'ring-1 ring-red-400/60' : ''}
                            ${drag && !isDragging ? 'pointer-events-none' : ''}
                            ${getMissionHoverClasses(ot.mission_id, ot.groupage_fige)}`}
                            onClick={() => !isRowEditMode && openSelected(ot)}
                          onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot }) }}>
                          {/* Ligne 1 : badges + reference + bouton desaffecter */}
                          <div className="flex items-center gap-1 min-w-0">
                            {isAffretedOt(ot.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                            {groupageBubbleLabel && <span className="rounded-full border border-amber-300/60 bg-amber-50 px-1.5 text-[8px] font-bold text-amber-950 flex-shrink-0">{groupageBubbleLabel}</span>}
                            {isLate && <span className="rounded px-1 text-[8px] font-bold bg-red-500/30 text-red-200 flex-shrink-0">?</span>}
                            {ot.statut === 'facture' && <span className="rounded px-1 text-[8px] font-bold bg-violet-500/30 text-violet-200 flex-shrink-0">EUR</span>}
                            <StatutOpsDot statut={ot.statut_operationnel} size="xs"/>
                            <span className="font-mono text-[10px] font-bold truncate flex-1">{ot.reference}</span>
                            {!isRowEditMode && !drag && (
                              <>
                                <button type="button" title="Ajouter HLP avant" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                  onClick={e => { e.preventDefault(); e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'hlp') }}>HLP</button>
                                <button type="button" title="Ajouter pause apres" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                  onClick={e => { e.preventDefault(); e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'repos') }}>PAUSE</button>
                              </>
                            )}
                            {!isRowEditMode && (
                              <button title="Desaffecter" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/20 text-[10px]"
                                onClick={e => { e.stopPropagation(); unassign(ot) }}>x</button>
                            )}
                          </div>
                          {!groupedLayout?.compact && (() => { const v = getOtVilles(ot); return (
                            <>
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="truncate flex-1 text-[10px] text-white/80 font-semibold">{ot.client_nom}</span>
                                {(hCharge || hLivre) && (
                                  <span className="text-[9px] text-white/50 flex-shrink-0 font-mono">{hCharge}{hCharge && hLivre ? '-' : ''}{hLivre}</span>
                                )}
                              </div>
                              {(v.dep || v.arr) && (
                                <div className="flex items-center gap-0.5 min-w-0 leading-none">
                                  <span className="truncate text-[9px] text-white/45 font-medium">{v.dep}</span>
                                  {v.dep && v.arr && <span className="text-[9px] text-white/25 flex-shrink-0">{String.fromCharCode(8594)}</span>}
                                  <span className="truncate text-[9px] text-white/45 font-medium">{v.arr}</span>
                                </div>
                              )}
                            </>
                          )})()}
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
                            draggable={!isRowEditMode}
                            onDragStart={!isRowEditMode ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                            onMouseEnter={!drag ? e => openHoverPreview(linkedOT, e.clientX, e.clientY) : undefined}
                            onMouseLeave={!drag ? clearHoverPreview : undefined}
                            className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col px-2 py-1 gap-0 transition-[opacity,filter] overflow-hidden shadow-md group/cblock
                              ${!isRowEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                              ${drag?.customBlockId===block.id ? 'opacity-30' : 'hover:brightness-110'}
                              ${isLate ? 'ring-1 ring-red-400/60' : ''}
                              ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}
                              ${getMissionHoverClasses(linkedOT.mission_id, linkedOT.groupage_fige)}`}
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
                            {(() => { const v = getOtVilles(linkedOT); return (
                              <>
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="truncate flex-1 text-[10px] text-white/80 font-semibold">{linkedOT.client_nom}</span>
                                  {(hCharge || hLivre) && (
                                    <span className="text-[9px] text-white/50 flex-shrink-0 font-mono">{hCharge}{hCharge && hLivre ? '-' : ''}{hLivre}</span>
                                  )}
                                </div>
                                {(v.dep || v.arr) && (
                                  <div className="flex items-center gap-0.5 min-w-0 leading-none">
                                    <span className="truncate text-[9px] text-white/45 font-medium">{v.dep}</span>
                                    {v.dep && v.arr && <span className="text-[9px] text-white/25 flex-shrink-0">{String.fromCharCode(8594)}</span>}
                                    <span className="truncate text-[9px] text-white/45 font-medium">{v.arr}</span>
                                  </div>
                                )}
                              </>
                            )})()}
                          </div>
                        )
                      }
                      return (
                        <div key={block.id} style={p2} draggable={!isRowEditMode}
                          onDragStart={!isRowEditMode ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                          onClick={() => !isRowEditMode && openPlanningBlockEditor(block)}
                          className={`${block.color} border rounded-md text-white text-[11px] font-medium flex items-center px-2 gap-1.5 cursor-grab active:cursor-grabbing group/cblock overflow-hidden shadow-sm ${drag?.customBlockId===block.id?'opacity-30':''} ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''} ${hoveredMissionId ? 'opacity-40 saturate-50' : ''}`}>
                          <span className="truncate flex-1">{block.label}</span>
                          {!isRowEditMode && <button className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                            title="Modifier"
                            onClick={e => { e.stopPropagation(); openPlanningBlockEditor(block) }}>
                            ?</button>}
                          {!isRowEditMode && <button className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                            onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>}
                        </div>
                      )
                    })}
                    {/* Bandes d'indisponibilit� RH */}
                    {tab === 'conducteurs' && !row.isCustom && !row.isAffretementAsset && (conducteurAbsences.get(row.id) ?? []).map(abs => {
                      const sD = parseDay(abs.date_debut)
                      const eD = parseDay(abs.date_fin)
                      const wE = addDays(weekStart, 6)
                      if (eD < weekStart || sD > wE) return null
                      const vS = sD < weekStart ? weekStart : sD
                      const vE = eD > wE ? wE : eD
                      const pAbs: React.CSSProperties = {
                        position: 'absolute', top: 0, bottom: 0,
                        left: `${daysDiff(weekStart, vS) / 7 * 100}%`,
                        width: `${(daysDiff(vS, vE) + 1) / 7 * 100}%`,
                      }
                      return (
                        <div key={`abs-${abs.id}`} style={pAbs}
                          title={`${TYPE_ABSENCE_LABELS[abs.type_absence]} du ${abs.date_debut} au ${abs.date_fin}`}
                          className="bg-rose-500/15 border-l-2 border-l-rose-500/60 pointer-events-none z-[1]">
                          <span className="absolute top-1 left-1 text-[8px] text-rose-300/70 font-semibold uppercase tracking-wider truncate max-w-full px-0.5">{TYPE_ABSENCE_LABELS[abs.type_absence]}</span>
                        </div>
                      )
                    })}
                    {generatedBlocks.map(block => {
                      const bS = parseDay(block.dateStart)
                      const bE = parseDay(block.dateEnd)
                      const wE2 = addDays(weekStart, 6)
                      if (bE < weekStart || bS > wE2) return null
                      const vbS = bS < weekStart ? weekStart : bS
                      const vbE = bE > wE2 ? wE2 : bE
                      const p2: React.CSSProperties = {
                        position:'absolute',
                        top:'44px',
                        height:'16px',
                        left:`calc(${daysDiff(weekStart,vbS)/7*100}% + 2px)`,
                        width:`calc(${(daysDiff(vbS,vbE)+1)/7*100}% - 4px)`,
                      }
                      const isPause = block.kind === 'repos'
                      return (
                        <div key={block.id} style={p2}
                          onClick={isPause ? () => materializePause(block) : undefined}
                          title={isPause ? 'Cliquer pour rendre la pause deplacable' : block.label}
                          className={`${block.color} border rounded text-white/90 text-[9px] px-1.5 flex items-center overflow-hidden ${isPause ? 'cursor-pointer hover:opacity-100 hover:ring-1 hover:ring-white/40' : 'pointer-events-none'} opacity-80`}>
                          <span className="truncate">{block.label}</span>
                          {isPause && <span className="ml-auto flex-shrink-0 text-[8px] opacity-60">&#9998;</span>}
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

        {/* ── DAY VIEW ──────────────────────────────────────────────────────── */}
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
                const hoveredMissionOverlays = row.isCustom ? [] : buildHoveredMissionOverlays(ots)
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
                      {hoveredMissionOverlays.map(overlay => (
                        <div
                          key={`hovered-day-${overlay.groupId}`}
                          style={{ position:'absolute', top:'0px', bottom:'0px', left:`${overlay.leftPct}%`, width:`${overlay.widthPct}%` }}
                          className={`pointer-events-none rounded-[24px] border transition-all ${overlay.frozen ? 'border-indigo-300/55 bg-indigo-400/8 shadow-[0_0_0_1px_rgba(165,180,252,0.24),0_0_30px_rgba(99,102,241,0.12)]' : 'border-amber-300/55 bg-amber-300/10 shadow-[0_0_0_1px_rgba(251,191,36,0.24),0_0_30px_rgba(251,191,36,0.12)]'}`}
                        >
                          <span className={`absolute left-3 -top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] ${overlay.frozen ? 'border border-indigo-400/45 bg-slate-950/95 text-indigo-200' : 'border border-amber-300/55 bg-slate-950/95 text-amber-200'}`}>
                            {overlay.label}
                          </span>
                        </div>
                      ))}
                      {frozenGroupageOverlays.map(overlay => (
                        <div
                          key={`frozen-day-${overlay.groupId}`}
                          style={{ position:'absolute', top:'2px', height:'58px', left:`${overlay.leftPct}%`, width:`${overlay.widthPct}%` }}
                          className={`pointer-events-none rounded-[20px] border border-indigo-400/45 bg-indigo-500/10 shadow-inner ring-1 ring-indigo-300/10 transition-all ${getMissionHoverClasses(overlay.groupId, true)}`}
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
                          onMouseEnter={e => openHoverPreview(card.members[0], e.clientX, e.clientY)}
                          onMouseLeave={clearHoverPreview}
                          className={`rounded-xl border overflow-hidden shadow-lg transition-all ${card.frozen ? 'border-indigo-300/70 bg-slate-950/96' : 'border-amber-300/70 bg-amber-50/95'} ${getMissionHoverClasses(card.groupId, card.frozen)}`}
                        >
                            <div className={`flex items-center justify-between gap-2 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] ${card.frozen ? 'bg-indigo-500/20 text-indigo-100' : 'bg-amber-100 text-amber-950'}`}>
                              <span className="truncate">{card.summary.label}</span>
                              <span className="flex-shrink-0">{card.frozen ? 'Verrouillee' : 'Deliable'}</span>
                          </div>
                          <div className="grid h-[calc(100%-22px)] divide-x divide-white/8" style={{ gridTemplateColumns: `repeat(${card.members.length}, minmax(0, 1fr))` }}>
                            {card.members.map(member => {
                              const isLate = member.statut !== 'facture' && member.date_livraison_prevue && member.date_livraison_prevue.slice(0,10) < today
                              return (
                                <div
                                  key={member.id}
                                  role={isRowEditMode ? undefined : 'button'}
                                  tabIndex={isRowEditMode ? -1 : 0}
                                  onClick={() => !isRowEditMode && openSelected(member)}
                                  onKeyDown={e => {
                                    if (isRowEditMode) return
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault()
                                      openSelected(member)
                                    }
                                  }}
                                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot:member }) }}
                                  className={`flex min-w-0 flex-col justify-center px-2 text-left transition-colors ${isRowEditMode ? 'cursor-default' : 'cursor-pointer hover:bg-white/5'}`}
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    {isAffretedOt(member.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                                    {isLate && <span className="rounded px-1 text-[8px] font-bold bg-red-500/30 text-red-200 flex-shrink-0">!</span>}
                                    <StatutOpsDot statut={member.statut_operationnel} size="xs"/>
                                    <span className={`truncate font-mono text-[10px] font-bold ${card.frozen ? 'text-white' : 'text-slate-950'}`}>{member.reference}</span>
                                  </div>
                                  <span className={`truncate text-[10px] font-semibold ${card.frozen ? 'text-white/80' : 'text-slate-700'}`}>{member.client_nom}</span>
                                  <span className={`truncate text-[9px] font-mono ${card.frozen ? 'text-white/45' : 'text-slate-500'}`}>{isoToTime(member.date_chargement_prevue)}-{isoToTime(member.date_livraison_prevue)}</span>
                                  {!isRowEditMode && (
                                    <span className="mt-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                      <button type="button" className="rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); openPlanningEventNearCourse(row.id, member, 'hlp') }}>HLP</button>
                                      <button type="button" className="rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); openPlanningEventNearCourse(row.id, member, 'repos') }}>PAUSE</button>
                                    </span>
                                  )}
                                </div>
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
                            draggable={canMove(ot) && !isRowEditMode}
                            onDragStart={canMove(ot) && !isRowEditMode ? e => onDragStartBlock(ot, e) : undefined}
                            onDragEnd={onDragEnd}
                            onMouseEnter={!drag ? e => openHoverPreview(ot, e.clientX, e.clientY) : undefined}
                            onMouseLeave={!drag ? clearHoverPreview : undefined}
                            className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col justify-center px-2 group/block overflow-hidden shadow-md
                              ${canMove(ot)&&!isRowEditMode?'cursor-grab active:cursor-grabbing':'cursor-pointer'}
                              ${isDragging?'opacity-30':'hover:brightness-110'}
                              ${isLate?'ring-1 ring-red-400/60':''}
                              ${drag && !isDragging ? 'pointer-events-none' : ''}
                              ${getMissionHoverClasses(ot.mission_id, ot.groupage_fige)}`}
                            onClick={() => !isRowEditMode && openSelected(ot)}
                            onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot }) }}>
                            <div className="flex items-center gap-1 min-w-0">
                              {isAffretedOt(ot.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                              {groupageBubbleLabel && <span className="rounded-full border border-amber-300/60 bg-amber-50 px-1.5 text-[8px] font-bold text-amber-950 flex-shrink-0">{groupageBubbleLabel}</span>}
                              {isLate && <span className="text-[8px] flex-shrink-0">?</span>}
                              {ot.statut === 'facture' && <span className="text-[8px] flex-shrink-0 text-violet-300">EUR</span>}
                              <StatutOpsDot statut={ot.statut_operationnel} size="xs"/>
                              <span className="font-mono font-bold truncate flex-1">{ot.reference}</span>
                              {!isRowEditMode && !drag && (
                                <>
                                  <button type="button" title="Ajouter HLP avant" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'hlp') }}>HLP</button>
                                  <button type="button" title="Ajouter pause apres" className="opacity-0 group-hover/block:opacity-100 transition-opacity flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold bg-slate-950/70 hover:bg-slate-950"
                                    onClick={e => { e.preventDefault(); e.stopPropagation(); openPlanningEventNearCourse(row.id, ot, 'repos') }}>PAUSE</button>
                                </>
                              )}
                            </div>
                            {!groupedLayout?.compact && (() => { const v = getOtVilles(ot); return (
                              <>
                                <div className="flex items-center gap-1 min-w-0">
                                  <span className="text-white/80 text-[10px] font-semibold truncate flex-1">{ot.client_nom}</span>
                                  <span className="text-white/50 text-[9px] font-mono flex-shrink-0">{isoToTime(ot.date_chargement_prevue)}-{isoToTime(ot.date_livraison_prevue)}</span>
                                </div>
                                {(v.dep || v.arr) && (
                                  <div className="flex items-center gap-0.5 min-w-0 leading-none">
                                    <span className="truncate text-[9px] text-white/45 font-medium">{v.dep}</span>
                                    {v.dep && v.arr && <span className="text-[9px] text-white/25 flex-shrink-0">{String.fromCharCode(8594)}</span>}
                                    <span className="truncate text-[9px] text-white/45 font-medium">{v.arr}</span>
                                  </div>
                                )}
                              </>
                            )})()}
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
                              draggable={!isRowEditMode}
                              onDragStart={!isRowEditMode ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                              onMouseEnter={!drag ? e => openHoverPreview(linkedOT, e.clientX, e.clientY) : undefined}
                              onMouseLeave={!drag ? clearHoverPreview : undefined}
                              className={`${cCls} border rounded-lg text-white text-[11px] font-medium flex flex-col justify-center px-2 group/cblock overflow-hidden shadow-md
                                ${!isRowEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                                ${drag?.customBlockId===block.id ? 'opacity-30' : 'hover:brightness-110'}
                                ${isLate ? 'ring-1 ring-red-400/60' : ''}
                                ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''}
                                ${getMissionHoverClasses(linkedOT.mission_id, linkedOT.groupage_fige)}`}
                              onClick={() => !isRowEditMode && openSelected(linkedOT)}
                              onContextMenu={e => { e.preventDefault(); setContextMenu({ x:e.clientX, y:e.clientY, ot:linkedOT }) }}>
                              <div className="flex items-center gap-1 min-w-0">
                                {isAffretedOt(linkedOT.id) && <span className="rounded px-1 text-[8px] font-bold bg-blue-500/30 text-blue-200 flex-shrink-0">AFF</span>}
                                {groupageBubbleLabel && <span className="rounded-full border border-amber-300/60 bg-amber-50 px-1.5 text-[8px] font-bold text-amber-950 flex-shrink-0">{groupageBubbleLabel}</span>}
                                {isLate && <span className="text-[8px] flex-shrink-0">!</span>}
                                {linkedOT.statut === 'facture' && <span className="text-[8px] flex-shrink-0 text-violet-300">EUR</span>}
                                <StatutOpsDot statut={linkedOT.statut_operationnel} size="xs"/>
                                <span className="font-mono font-bold truncate flex-1">{linkedOT.reference}</span>
                                {!isRowEditMode && (
                                  <button title="Desaffecter" className="opacity-0 group-hover/cblock:opacity-100 transition-opacity flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center rounded hover:bg-white/20 text-[10px]"
                                    onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>
                                )}
                              </div>
                              {(() => { const v = getOtVilles(linkedOT); return (
                                <>
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="text-white/80 text-[10px] font-semibold truncate flex-1">{linkedOT.client_nom}</span>
                                    <span className="text-white/50 text-[9px] font-mono flex-shrink-0">{isoToTime(linkedOT.date_chargement_prevue)}-{isoToTime(linkedOT.date_livraison_prevue)}</span>
                                  </div>
                                  {(v.dep || v.arr) && (
                                    <div className="flex items-center gap-0.5 min-w-0 leading-none">
                                      <span className="truncate text-[9px] text-white/45 font-medium">{v.dep}</span>
                                      {v.dep && v.arr && <span className="text-[9px] text-white/25 flex-shrink-0">{String.fromCharCode(8594)}</span>}
                                      <span className="truncate text-[9px] text-white/45 font-medium">{v.arr}</span>
                                    </div>
                                  )}
                                </>
                              )})()}
                            </div>
                          )
                        }
                        return (
                          <div key={block.id} style={pos} draggable={!isRowEditMode}
                            onDragStart={!isRowEditMode ? e => onDragStartCustomBlock(block, e) : undefined} onDragEnd={onDragEnd}
                            onClick={() => !isRowEditMode && openPlanningBlockEditor(block)}
                            className={`${block.color} border rounded-md text-white text-[11px] font-medium flex flex-col justify-center px-2 cursor-grab active:cursor-grabbing group/cblock overflow-hidden shadow-sm ${drag && drag.customBlockId !== block.id ? 'pointer-events-none' : ''} ${hoveredMissionId ? 'opacity-40 saturate-50' : ''}`}>
                            <span className="truncate leading-tight">{block.label}</span>
                              <span className="text-white/60 text-[9px]">{block.dateStart.slice(11,16)}-{block.dateEnd.slice(11,16)}</span>
                            {!isRowEditMode && <button className="absolute right-5 top-1 opacity-0 group-hover/cblock:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                              title="Modifier"
                              onClick={e => { e.stopPropagation(); openPlanningBlockEditor(block) }}>?</button>}
                            {!isRowEditMode && <button className="absolute right-1 top-1 opacity-0 group-hover/cblock:opacity-100 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-xs"
                              onClick={async e => { e.stopPropagation(); await unassignFromCustomBlock(block) }}>x</button>}
                          </div>
                        )
                      })}
                      {/* Bandes d'indisponibilit� RH (vue jour) */}
                      {tab === 'conducteurs' && !row.isCustom && !row.isAffretementAsset && (conducteurAbsences.get(row.id) ?? []).map(abs => {
                        if (abs.date_debut > selectedDay || abs.date_fin < selectedDay) return null
                        return (
                          <div key={`abs-day-${abs.id}`}
                            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '100%' }}
                            title={`${TYPE_ABSENCE_LABELS[abs.type_absence]} du ${abs.date_debut} au ${abs.date_fin}`}
                            className="bg-rose-500/15 border-l-2 border-l-rose-500/60 pointer-events-none z-[1]">
                            <span className="absolute top-1 left-1 text-[8px] text-rose-300/70 font-semibold uppercase tracking-wider">{TYPE_ABSENCE_LABELS[abs.type_absence]}</span>
                          </div>
                        )
                      })}
                      {generatedBlocks.map(block => {
                        const gPos = blockPosDay(block.dateStart, block.dateEnd, selectedDay)
                        if (!gPos) return null
                        const gIsPause = block.kind === 'repos'
                        return (
                          <div key={block.id} style={{...gPos, top:'42px', height:'14px'}}
                            onClick={gIsPause ? () => materializePause(block) : undefined}
                            title={gIsPause ? 'Cliquer pour rendre la pause deplacable' : block.label}
                            className={`${block.color} border rounded text-white/90 text-[9px] px-1.5 flex items-center overflow-hidden ${gIsPause ? 'cursor-pointer hover:opacity-100 hover:ring-1 hover:ring-white/40' : 'pointer-events-none'} opacity-80`}>
                            <span className="truncate">{block.label}</span>
                            {gIsPause && <span className="ml-auto flex-shrink-0 text-[8px] opacity-60">&#9998;</span>}
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

        {/* -- MONTH VIEW ---------------------------------------------------- */}
        {viewMode === 'mois' && (() => {
          const monthDaysList = getMonthDays(monthStart)
          const DAY_ABBR = ['D','L','M','M','J','V','S']

          function getStatutDotCls(statut: string): string {
            const blockCls = STATUT_CLS[statut] ?? 'bg-slate-600 border-slate-500'
            return blockCls.split(' ').find(c => c.startsWith('bg-')) ?? 'bg-slate-600'
          }

          return (
            <div className="overflow-x-auto">
              <div style={{ minWidth: `${176 + monthDaysList.length * 36}px` }}>
                {/* Day headers */}
                <div className="flex sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
                  <div className="w-44 flex-shrink-0 border-r border-slate-700 bg-slate-900 py-2" />
                  {monthDaysList.map((day, i) => {
                    const isToday = toISO(day) === today
                    const isWE = day.getDay() === 0 || day.getDay() === 6
                    return (
                      <div key={i} className={`w-9 flex-shrink-0 border-r border-slate-700/40 last:border-r-0 text-center py-2 ${isWE ? 'bg-slate-800/40' : ''}`}>
                        <p className={`text-[9px] font-medium ${isToday ? 'text-blue-400' : isWE ? 'text-slate-600' : 'text-slate-500'}`}>
                          {DAY_ABBR[day.getDay()]}
                        </p>
                        <p className={`text-[11px] font-bold leading-tight ${isToday ? 'text-blue-400' : isWE ? 'text-slate-600' : 'text-slate-300'}`}>
                          {day.getDate()}
                        </p>
                      </div>
                    )
                  })}
                </div>
                {/* Resource rows */}
                {visibleRows.length === 0 ? (
                  <div className="p-16 text-center text-slate-600 text-sm">Aucune ressource disponible</div>
                ) : visibleRows.map(row => {
                  const allRowOTs = row.isCustom ? [] : rowOTs(row.id)
                  return (
                    <div key={row.id} className="flex border-b border-slate-800/50 hover:bg-white/[0.01] transition-colors" style={{ height: '44px' }}>
                      {renderRowLabel(row)}
                      {monthDaysList.map((day, i) => {
                        const dayISO = toISO(day)
                        const isToday = dayISO === today
                        const isWE = day.getDay() === 0 || day.getDay() === 6
                        const dayOTs = allRowOTs.filter(ot => {
                          if (!ot.date_chargement_prevue) return false
                          const charDate = ot.date_chargement_prevue.slice(0, 10)
                          const livDate = (ot.date_livraison_prevue ?? ot.date_chargement_prevue).slice(0, 10)
                          return charDate <= dayISO && livDate >= dayISO
                        })
                        const MAX_DOTS = 3
                        const shown = dayOTs.slice(0, MAX_DOTS)
                        const extra = dayOTs.length - MAX_DOTS
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setSelectedDay(dayISO); setViewMode('jour'); setWeekStart(getMonday(day)) }}
                            className={[
                              'w-9 flex-shrink-0 border-r border-slate-800/40 last:border-r-0 flex flex-col items-center justify-center gap-0.5 transition-colors',
                              isWE ? 'bg-slate-800/15' : '',
                              isToday ? 'bg-blue-950/20' : '',
                              dayOTs.length > 0 ? 'hover:bg-indigo-950/40 cursor-pointer' : 'hover:bg-white/[0.02]',
                            ].join(' ')}
                            title={dayOTs.length > 0 ? dayOTs.map(o => o.reference).join(', ') : undefined}
                          >
                            {dayOTs.length > 0 && (
                              <div className="flex flex-wrap items-center justify-center gap-[2px]">
                                {shown.map(ot => (
                                  <span key={ot.id} className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatutDotCls(ot.statut)}`} />
                                ))}
                                {extra > 0 && <span className="text-[8px] font-bold text-slate-400 leading-none">+{extra}</span>}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        </div>{/* end scrollable view area */}

        <div
          className="fixed bottom-0 z-[120]"
          style={isDesktopViewport
            ? { left: sidebarCollapsed ? 0 : 236, right: 0 }
            : { left: 0, right: 0 }}
        >
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
              <div className="flex h-full min-h-0 flex-col">
              <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-800/80 overflow-x-auto overflow-y-hidden flex-shrink-0">
            {visibleBottomDockTabs.map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setBottomDockTab(item.key)
                  if (item.key === 'relais' || item.key === 'entrepots') void loadRelais()
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border whitespace-nowrap ${
                  bottomDockTab === item.key
                    ? 'bg-blue-200 border-blue-500 text-blue-950 font-bold'
                    : 'border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                {item.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${bottomDockTab === item.key ? 'bg-blue-200 text-blue-900' : 'bg-slate-200 text-slate-800'}`}>
                    {item.count}
                  </span>
                )}
              </button>
            ))}

            <div className="flex flex-wrap items-center gap-1.5">
              {isFeatureEnabled('tab_urgences') && (
                <button
                  type="button"
                  onClick={() => setBottomDockTab('urgences')}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-rose-700 bg-rose-600 text-white hover:bg-rose-500 transition-colors whitespace-nowrap"
                >
                  Focus alertes
                </button>
              )}
              {isFeatureEnabled('action_optimize_tour') && (
                <button
                  type="button"
                  onClick={() => {
                    setOptimizerConducteurId(null)
                    setShowRouteOptimizer(true)
                  }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-600 bg-blue-700 text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
                  title="Optimiser la séquence de livraisons d'un conducteur"
                >
                  🗺 Optimiser tournée
                </button>
              )}
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
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${simulationMode ? 'bg-blue-600/25 border-blue-500/50 text-blue-100' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
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
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${autoHabillage ? 'bg-blue-600/25 border-blue-500/50 text-blue-100' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
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
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${autoPauseReglementaire ? 'bg-blue-600/25 border-blue-500/50 text-blue-100' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
              >
                Pause 45 min {autoPauseReglementaire ? 'activee' : 'off'}
              </button>
              <button
                type="button"
                onClick={() => setPlanningHeaderCollapsed(current => !current)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${planningHeaderCollapsed ? 'bg-blue-600/25 border-blue-500/50 text-blue-100' : 'border-slate-700 text-slate-300 hover:text-white'}`}
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
              <button
                type="button"
                onClick={() => setShowExploitantControls(value => !value)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors whitespace-nowrap ${showExploitantControls ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100' : 'border-slate-700 text-slate-300 hover:text-white'}`}
              >
                Parametres exploitant
              </button>
            </div>
            {showExploitantControls && (
              <div className="w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mode planning</p>
                  <button
                    type="button"
                    onClick={() => applyExploitantPreset('leger')}
                    className="rounded-full border border-emerald-500/60 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-100 hover:bg-emerald-500/30"
                  >
                    Preset leger
                  </button>
                  <button
                    type="button"
                    onClick={() => applyExploitantPreset('complet')}
                    className="rounded-full border border-blue-500/60 bg-blue-500/20 px-2.5 py-1 text-[10px] font-semibold text-blue-100 hover:bg-blue-500/30"
                  >
                    Preset complet
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Onglets du panneau</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exploitantTabOptions.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleExploitantFeature(option.key)}
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${isFeatureEnabled(option.key) ? 'border-emerald-500/55 bg-emerald-500/20 text-emerald-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
                      >
                        {option.label} {option.count > 0 ? `(${option.count})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Actions operateur</p>
                  <div className="flex flex-wrap gap-1.5">
                    {exploitantActionOptions.map(option => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleExploitantFeature(option.key)}
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${isFeatureEnabled(option.key) ? 'border-blue-500/55 bg-blue-500/20 text-blue-100' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-auto px-4 py-3 xl:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 overflow-hidden">
              {bottomDockTab === 'missions' && (
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-900/90 text-slate-500 uppercase tracking-wide text-[10px]">
                      <tr>
                        <th className="text-left px-3 py-2">Mission / course</th>
                        <th className="text-left px-3 py-2">Synthese</th>
                        <th className="text-left px-3 py-2">Ressource</th>
                        <th className="text-left px-3 py-2">Fenetre</th>
                        <th className="text-left px-3 py-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockMissions.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={5}>Aucune mission planifiee.</td></tr>
                      )}
                      {bottomDockMissions.map(ot => {
                        const summary = getMissionSummary(ot)
                        return (
                        <tr
                          key={ot.id}
                          className={getMissionListRowClasses(ot.mission_id, ot.groupage_fige, true)}
                          onMouseEnter={e => openHoverPreview(ot, e.clientX, e.clientY)}
                          onMouseLeave={clearHoverPreview}
                          onClick={() => openSelected(ot)}>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-slate-300 truncate">{ot.reference}</span>
                                {summary.missionType === 'groupage' && (
                                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${ot.groupage_fige ? 'bg-indigo-500/20 text-indigo-200' : 'bg-amber-100 text-amber-950'}`}>{summary.badge}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500">{summary.missionType === 'groupage' ? `Mission ${summary.missionId.slice(0, 8)}` : 'Course simple'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex flex-col gap-0.5">
                              <span>{summary.missionType === 'groupage' ? summary.subtitle : ot.client_nom}</span>
                              <span className="text-[10px] text-slate-500 truncate">{summary.missionType === 'groupage' ? summary.referencesLabel : summary.timeRange}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-400">{resolveRowId(ot) ? (orderedRows.find(row => row.id === resolveRowId(ot))?.primary ?? '-') : '-'}</td>
                          <td className="px-3 py-2 text-slate-400">{isoToDate(ot.date_chargement_prevue)} {isoToTime(ot.date_chargement_prevue)} - {isoToDate(ot.date_livraison_prevue)} {isoToTime(ot.date_livraison_prevue)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              title="Cliquer pour changer le statut"
                              onClick={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                void updateOtStatusFromPlanning(ot, getNextOtStatus(ot.statut))
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-85 ${BADGE_CLS[ot.statut] ?? 'bg-slate-700 text-slate-300'}`}
                            >
                              {STATUT_LABEL[ot.statut] ?? ot.statut}
                            </button>
                          </td>
                        </tr>
                        )
                      })}
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
                              isFeatureEnabled('action_affecter') ? (
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
                                <span className="text-slate-500">Affectation desactivee</span>
                              )
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
                  <div className="px-3 py-2 text-[10px] text-slate-400 border-b border-slate-800/70">
                    Liste calculee selon l'onglet actif (conducteurs, camions ou remorques).
                  </div>
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
                      {unresourced.map(ot => {
                        const summary = getMissionSummary(ot)
                        return (
                        <tr
                          key={ot.id}
                          className={getMissionListRowClasses(ot.mission_id, ot.groupage_fige)}
                          onMouseEnter={e => openHoverPreview(ot, e.clientX, e.clientY)}
                          onMouseLeave={clearHoverPreview}>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-slate-300 truncate">{ot.reference}</span>
                              {summary.missionType === 'groupage' && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${ot.groupage_fige ? 'bg-indigo-500/20 text-indigo-200' : 'bg-amber-100 text-amber-950'}`}>Groupage</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex flex-col gap-0.5">
                              <span>{summary.missionType === 'groupage' ? summary.subtitle : ot.client_nom}</span>
                              {summary.missionType === 'groupage' && <span className="text-[10px] text-slate-500 truncate">{summary.referencesLabel}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-400">{isoToDate(ot.date_chargement_prevue)} {isoToTime(ot.date_chargement_prevue)}</td>
                          <td className="px-3 py-2">
                            {isFeatureEnabled('action_affecter') ? (
                              <button type="button" onClick={() => openAssign(ot)} className="text-indigo-300 hover:text-indigo-200">Affecter</button>
                            ) : (
                              <span className="text-slate-500">Desactivee</span>
                            )}
                          </td>
                        </tr>
                        )
                      })}
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
                        <th className="text-left px-3 py-2">Mission</th>
                        <th className="text-left px-3 py-2">Synthese</th>
                        <th className="text-left px-3 py-2">Etat</th>
                        <th className="text-left px-3 py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bottomDockGroupages.length === 0 && (
                        <tr><td className="px-3 py-3 text-slate-500" colSpan={4}>Aucune mission groupage active.</td></tr>
                      )}
                      {bottomDockGroupages.map(group => {
                        const summary = getMissionSummaryFromMembers(group.members)
                        return (
                        <tr
                          key={group.groupId}
                          className={getMissionListRowClasses(group.groupId, group.frozen, true)}
                          onMouseEnter={e => openHoverPreview(group.members[0], e.clientX, e.clientY)}
                          onMouseLeave={clearHoverPreview}
                          onClick={() => openSelected(group.members[0])}>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-100 flex items-center gap-2">{summary.label}<span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${group.frozen ? 'bg-indigo-500/25 text-indigo-200' : 'bg-amber-100 text-amber-950'}`}>{summary.badge}</span></span>
                              <span className="font-mono text-[10px] text-slate-500">{group.groupId.slice(0, 8)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex flex-col gap-0.5">
                              <span>{summary.subtitle}</span>
                              <span className="text-[10px] text-slate-500">{summary.timeRange} � {summary.referencesLabel}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${group.frozen ? 'bg-indigo-500/25 text-indigo-200' : 'bg-amber-100 text-amber-950'}`}>
                              {group.frozen ? 'Mission figee' : 'Mission modifiable'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => openSelected(group.members[0])} className="text-indigo-300 hover:text-indigo-200">Ouvrir</button>
                          </td>
                        </tr>
                        )
                      })}
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
                      {bottomDockNonProgrammees.map(ot => {
                        const summary = getMissionSummary(ot)
                        return (
                        <tr
                          key={ot.id}
                          className={getMissionListRowClasses(ot.mission_id, ot.groupage_fige)}
                          onMouseEnter={e => openHoverPreview(ot, e.clientX, e.clientY)}
                          onMouseLeave={clearHoverPreview}>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-slate-300 truncate">{ot.reference}</span>
                              {summary.missionType === 'groupage' && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${ot.groupage_fige ? 'bg-indigo-500/20 text-indigo-200' : 'bg-amber-100 text-amber-950'}`}>Groupage</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex flex-col gap-0.5">
                              <span>{summary.missionType === 'groupage' ? summary.subtitle : ot.client_nom}</span>
                              {summary.missionType === 'groupage' && <span className="text-[10px] text-slate-500 truncate">{summary.referencesLabel}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              title="Cliquer pour changer le statut"
                              onClick={event => {
                                event.preventDefault()
                                event.stopPropagation()
                                void updateOtStatusFromPlanning(ot, getNextOtStatus(ot.statut))
                              }}
                              className={`text-[10px] px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-85 ${BADGE_CLS[ot.statut] ?? 'bg-slate-700 text-slate-300'}`}
                            >
                              {STATUT_LABEL[ot.statut] ?? ot.statut}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            {isFeatureEnabled('action_affecter') ? (
                              <button type="button" onClick={() => openAssign(ot)} className="text-indigo-300 hover:text-indigo-200">Programmer</button>
                            ) : (
                              <span className="text-slate-500">Desactivee</span>
                            )}
                          </td>
                        </tr>
                        )
                      })}
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
                      {bottomDockAnnulees.map(ot => {
                        const summary = getMissionSummary(ot)
                        return (
                        <tr
                          key={ot.id}
                          className={getMissionListRowClasses(ot.mission_id, ot.groupage_fige)}
                          onMouseEnter={e => openHoverPreview(ot, e.clientX, e.clientY)}
                          onMouseLeave={clearHoverPreview}>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-slate-300 truncate">{ot.reference}</span>
                              {summary.missionType === 'groupage' && <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${ot.groupage_fige ? 'bg-indigo-500/20 text-indigo-200' : 'bg-amber-100 text-amber-950'}`}>Groupage</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-200">
                            <div className="flex flex-col gap-0.5">
                              <span>{summary.missionType === 'groupage' ? summary.subtitle : ot.client_nom}</span>
                              {summary.missionType === 'groupage' && <span className="text-[10px] text-slate-500 truncate">{summary.referencesLabel}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-400">{isoToDate(ot.date_chargement_prevue)} {isoToTime(ot.date_chargement_prevue)}</td>
                          <td className="px-3 py-2"><button type="button" onClick={() => openSelected(ot)} className="text-indigo-300 hover:text-indigo-200">Consulter</button></td>
                        </tr>
                        )
                      })}
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
                      {retourChargeIaConnected
                        ? 'IA connectee: recommandations cloud actives.'
                        : 'IA indisponible: prediction locale optimisee active (HLP/repos/coupure inclus).'}
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
                            // Position de reference : derniere livraison du vehicule dans les OT termines
                            const { data: lastOt } = await supabase
                              .from('ordres_transport')
                              .select('livraison_lat, livraison_lng')
                              .eq('vehicule_id', retourChargeForm.vehicule_id)
                              .in('statut_transport', ST_TERMINE)
                              .order('date_livraison_prevue', { ascending: false })
                              .limit(1)
                              .maybeSingle()
                            const posLat: number = (lastOt as { livraison_lat?: number | null } | null)?.livraison_lat ?? 48.8566
                            const posLng: number = (lastOt as { livraison_lng?: number | null } | null)?.livraison_lng ?? 2.3522
                            if (!token) throw new Error('Session absente pour le moteur IA distant.')

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
                            setRetourChargeIaConnected(true)
                          } catch (err) {
                            const fallbackSuggestions = buildFallbackRetourChargeSuggestions(retourChargeForm)
                            setRetourChargeIaConnected(false)
                            setRetourChargeSuggestions(fallbackSuggestions)

                            if (fallbackSuggestions.length > 0) {
                              setRetourChargeError(null)
                              pushPlanningNotice('IA indisponible: predictions locales optimisees appliquees.')
                            } else {
                              const detail = err instanceof Error ? err.message : 'Erreur recherche.'
                              setRetourChargeError(`IA indisponible. Mode local actif, mais aucune suggestion exploitable. (${detail})`)
                            }
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
                              <td className="px-3 py-2 text-slate-300">{s.prix_ht != null ? `${s.prix_ht.toFixed(0)} �` : '�'}</td>
                              <td className="px-3 py-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200">
                                  {s.score_rentabilite.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                {s.retour_depot_ok
                                  ? <span className="text-emerald-300 text-[10px]">?</span>
                                  : <span className="text-red-300 text-[10px]">?</span>
                                }
                              </td>
                              <td className="px-3 py-2">
                                {ot ? (
                                  <button type="button" onClick={() => openAssign(ot)} className="text-indigo-300 hover:text-indigo-200">
                                    Affecter
                                  </button>
                                ) : (
                                  <span className="text-slate-500">�</span>
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

              {/* -- Onglet Entrep�ts : marchandises en attente de reprise -- */}
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
                                  {relais.ordres_transport?.reference ?? '�'}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-slate-300">{relais.ordres_transport?.client_nom ?? '�'}</td>
                              <td className="px-3 py-2">
                                <p className="text-slate-200 font-medium">{relais.lieu_nom}</p>
                                {relais.lieu_adresse && <p className="text-slate-500 text-[10px]">{relais.lieu_adresse}</p>}
                              </td>
                              <td className="px-3 py-2 text-slate-400">{new Date(relais.date_depot).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</td>
                              <td className="px-3 py-2 text-slate-400">
                                {relais.date_reprise_prevue ? new Date(relais.date_reprise_prevue).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }) : '�'}
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

              {/* -- Onglet Relais conducteur -- */}
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
                                  {relais.ordres_transport?.reference ?? '�'}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-slate-300">{relais.ordres_transport?.client_nom ?? '�'}</td>
                              <td className="px-3 py-2">
                                <p className="text-slate-200 font-medium">{relais.lieu_nom}</p>
                                {relais.lieu_adresse && <p className="text-slate-500 text-[10px]">{relais.lieu_adresse}</p>}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {relais.conducteur_depose ? `${relais.conducteur_depose.prenom} ${relais.conducteur_depose.nom}` : '�'}
                              </td>
                              <td className="px-3 py-2 text-slate-300">
                                {relais.conducteur_reprise ? `${relais.conducteur_reprise.prenom} ${relais.conducteur_reprise.nom}` : <span className="text-slate-500 italic">Non assigne</span>}
                              </td>
                              <td className="px-3 py-2 text-slate-400">
                                {relais.date_reprise_prevue ? new Date(relais.date_reprise_prevue).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '�'}
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
          </div>
            </>
          )}
        </div>
      </div>

      {/* -- Assign modal -------------------------------------------------------- */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[160] p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-white">Reglage course planning</h3>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-800 text-slate-300">{STATUT_LABEL[assignModal.ot.statut] ?? assignModal.ot.statut}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${assignScheduleMeta.valid ? 'bg-emerald-500/20 text-emerald-200' : 'bg-rose-500/20 text-rose-200'}`}>
                  Duree: {assignDurationLabel}
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono">{assignModal.ot.reference}</span>
                <span className="text-slate-600">-</span><span>{assignModal.ot.client_nom}</span>
                {assignModal.ot.prix_ht && <span className="ml-auto text-slate-500">{assignModal.ot.prix_ht.toFixed(0)} EUR HT</span>}
              </p>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
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
                      Modifier la mission
                    </button>
                  </div>
                  <p className="text-[11px] text-indigo-100/90">
                    {assignModal.applyToGroupage
                      ? `Cette programmation s'appliquera aux ${assignGroupMembers.length} courses de la mission ${getGroupageBubbleLabel(assignModal.ot)}.`
                      : `Seule la course ${assignModal.ot.reference} sera modifiee. Le reste de la mission restera inchange.`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Planification</p>
                    <label className="inline-flex items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={assignKeepDuration}
                        onChange={event => setAssignKeepDuration(event.target.checked)}
                      />
                      Conserver la duree
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-400">Date chargement</span>
                      <input
                        type="date"
                        value={assignModal.date_chargement}
                        onChange={e => updateAssignStart(e.target.value, assignModal.time_chargement)}
                        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-400">Heure depart</span>
                      <input
                        type="time"
                        step={900}
                        value={assignModal.time_chargement}
                        onChange={e => updateAssignStart(assignModal.date_chargement, e.target.value)}
                        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-400">Date livraison</span>
                      <input
                        type="date"
                        value={assignModal.date_livraison}
                        onChange={e => setAssignModal(m => m && { ...m, date_livraison: e.target.value })}
                        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-slate-400">Heure arrivee</span>
                      <input
                        type="time"
                        step={900}
                        value={assignModal.time_livraison}
                        onChange={e => setAssignModal(m => m && { ...m, time_livraison: e.target.value })}
                        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-3 space-y-2">
                    <p className="text-[11px] font-semibold text-slate-300">Ajustements rapides</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => shiftAssignStart(-30)} className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400">Depart -30 min</button>
                      <button type="button" onClick={() => shiftAssignStart(30)} className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400">Depart +30 min</button>
                      <button type="button" onClick={() => shiftAssignStart(60)} className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400">Depart +1h</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[120, 240, 480, 600].map(minutes => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => applyAssignDuration(minutes)}
                          className="px-2.5 py-1 rounded-lg text-[11px] border border-slate-600 text-slate-200 hover:border-slate-400"
                        >
                          Duree {minutes >= 60 ? `${Math.floor(minutes / 60)}h` : `${minutes} min`}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ressources</p>
                  {[
                    { label:'Conducteur', key:'conducteur_id' as const, items: conducteurs.map(c => {
                      const isAbsent = assignModal && getConducteurAbsencesForPeriod(c.id, assignModal.date_chargement, assignModal.date_livraison).length > 0
                      return { id: c.id, label: `${c.prenom} ${c.nom}${isAbsent ? ' ? ABSENT' : ''}`, absent: isAbsent }
                    }).sort((a, b) => (a.absent ? 1 : 0) - (b.absent ? 1 : 0)), placeholder:'Non affecte' },
                    { label:'Camion',     key:'vehicule_id'   as const, items: vehicules.map(v  => ({ id:v.id, label:`${v.immatriculation}${v.marque?` - ${v.marque}`:''}`, absent: false })), placeholder:'Non affecte' },
                    { label:'Remorque',   key:'remorque_id'   as const, items: remorques.map(r  => ({ id:r.id, label:`${r.immatriculation} - ${r.type_remorque}`, absent: false })), placeholder:'Sans remorque' },
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

                  <div className="rounded-xl border border-slate-700/70 bg-slate-800/60 p-3">
                    <p className="text-[11px] text-slate-300 font-semibold">Controle planning</p>
                    <p className={`text-xs mt-1 ${assignScheduleMeta.valid ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {assignScheduleMeta.valid
                        ? `Fenetre valide: ${assignDurationLabel} planifiee.`
                        : 'Fenetre invalide: la livraison doit etre apres le chargement.'}
                    </p>
                  </div>
                </section>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex gap-3 justify-end bg-slate-900/95">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[160] p-4" onClick={() => setAddBlockFor(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1">{newBlockType === 'course' ? 'Creer une course' : editingCustomBlockId ? 'Modifier un evenement planning' : 'Ajouter un evenement planning'}</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              {newBlockType === 'course'
                ? 'Creer une course directement depuis la ligne du planning.'
                : editingCustomBlockId
                ? 'Ajustez le type, le libelle ou la duree du bloc selectionne.'
                : 'Ajoutez un HLP, une pause, une maintenance ou un autre bloc directement sur la ligne choisie.'}
            </p>
            {/* Mod�les de courses */}
            {newBlockType === 'course' && courseTemplates.length > 0 && (
              <div className="mb-3 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Charger un modele</p>
                <div className="flex flex-wrap gap-1.5">
                  {courseTemplates.map(tpl => (
                    <div key={tpl.id} className="group flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1">
                      <button type="button" onClick={() => applyTemplate(tpl)} className="text-[11px] text-slate-200 hover:text-white transition-colors">
                        {tpl.label}
                      </button>
                      <button type="button" onClick={() => void handleDeleteTemplate(tpl.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-300 text-[10px] leading-none">�</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                        Coller avant � {nearestPlanningCourseSuggestion.beforeLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanningEventStart(nearestPlanningCourseSuggestion.afterStartISO)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold hover:bg-slate-800 ${nearestPlanningCourseSuggestion.preferredMode === 'after' ? 'border-amber-300/60 bg-amber-400/20 text-amber-50' : 'border-amber-400/30 bg-slate-900/60 text-amber-100'}`}
                      >
                        Coller apres � {nearestPlanningCourseSuggestion.afterLabel}
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
            {/* Sauvegarder comme mod�le (courses uniquement) */}
            {newBlockType === 'course' && (
              <div className="mb-3">
                {showSaveTemplate ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={saveAsTemplateLabel}
                      onChange={e => setSaveAsTemplateLabel(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') void handleSaveAsTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false) }}
                      placeholder="Nom du modele..."
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-indigo-500"
                    />
                    <button type="button" onClick={() => void handleSaveAsTemplate()} disabled={savingTemplate || !saveAsTemplateLabel.trim()} className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs rounded-xl disabled:opacity-60 transition-colors">
                      {savingTemplate ? '...' : 'Sauvegarder'}
                    </button>
                    <button type="button" onClick={() => setShowSaveTemplate(false)} className="px-3 py-2 text-slate-400 hover:text-white text-xs transition-colors">
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setSaveAsTemplateLabel(newBlockLabel || ''); setShowSaveTemplate(true) }} className="text-[11px] text-slate-500 hover:text-emerald-400 transition-colors">
                    + Sauvegarder comme modele
                  </button>
                )}
              </div>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[160] p-4" onClick={closeSelected}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {isAffretedOt(selected.id) && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/20 text-blue-300">AFF</span>}
                  {selected.mission_id && <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${selected.groupage_fige ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-100 text-amber-950'}`}>{selected.groupage_fige ? 'MISSION FIGEE' : getGroupageBubbleLabel(selected)}</span>}
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
                    { label: 'Conducteur', key: 'conducteur_id' as const, items: conducteurs.map(c => {
                      const isAbsent = editDraft && getConducteurAbsencesForPeriod(c.id, editDraft.date_chargement, editDraft.date_livraison).length > 0
                      return { id: c.id, label: `${c.prenom} ${c.nom}${isAbsent ? ' ? ABSENT' : ''}` }
                    }).sort((a, b) => (a.label.includes('ABSENT') ? 1 : 0) - (b.label.includes('ABSENT') ? 1 : 0)), placeholder: 'Non affecte' },
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
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Mission / groupage</p>
                <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-900/55 p-3">
                  {(() => {
                    const missionSummary = getMissionSummary(selected)
                    return missionSummary.missionType === 'groupage' ? (
                      <div className="rounded-xl border border-amber-300/20 bg-amber-400/5 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Groupage actif</p>
                            <p className="mt-1 text-sm font-semibold text-white">{missionSummary.subtitle}</p>
                          </div>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-950">{missionSummary.badge}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-slate-300">
                          <span className="rounded-full bg-slate-900/70 px-2 py-1">{missionSummary.timeRange}</span>
                          <span className="rounded-full bg-slate-900/70 px-2 py-1">{missionSummary.statusLabel}</span>
                          <span className="rounded-full bg-slate-900/70 px-2 py-1">ID {missionSummary.missionId.slice(0, 8)}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {missionSummary.coursePreview.slice(0, 4).map((line, index) => (
                            <p key={`${missionSummary.missionId}-selected-${index}`} className="truncate text-[10px] text-slate-300">{line}</p>
                          ))}
                        </div>
                      </div>
                    ) : null
                  })()}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${selected.mission_id ? (selected.groupage_fige ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300') : 'bg-slate-800 text-slate-400'}`}>
                      {selected.mission_id ? (selected.groupage_fige ? 'Mission figee' : 'Mission deliable') : 'Course hors mission'}
                    </span>
                    {selected.mission_id && (
                      <span className="text-[10px] text-slate-500">{selectedGroupMembers.length} course{selectedGroupMembers.length > 1 ? 's' : ''} dans la mission</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={groupageTargetId}
                      onChange={e => setGroupageTargetId(e.target.value)}
                      disabled={selected.groupage_fige}
                      className="flex-1 min-w-[220px] bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                    >
                      <option value="">Selectionner une course a ajouter a la mission</option>
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
                      disabled={!selected.mission_id}
                      className="px-3 py-2 text-xs rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                    >
                      {selected.groupage_fige ? 'Defiger la mission' : 'Figer la mission'}
                    </button>
                  </div>

                  {selectedGroupMembers.length > 0 && (
                    <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 px-2.5 py-2">
                      <p className="text-[10px] font-semibold text-slate-300 mb-1.5">Courses de la mission</p>
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
              {selected.mission_id && !selected.groupage_fige && (
                <button onClick={() => { void unlinkCourseFromGroupage(selected) }}
                  className="py-2 px-3 text-xs text-amber-300 hover:text-amber-200 hover:bg-amber-900/20 rounded-lg border border-amber-900/30 transition-colors">
                  Sortir de la mission
                </button>
              )}
              {selected.mission_id && (
                <button onClick={() => { void toggleSelectedGroupageFreeze(!selected.groupage_fige) }}
                  className="py-2 px-3 text-xs text-indigo-300 hover:text-indigo-200 hover:bg-indigo-900/20 rounded-lg border border-indigo-900/30 transition-colors">
                  {selected.groupage_fige ? 'Defiger la mission' : 'Figer la mission'}
                </button>
              )}
              {selectedGroupMembers.length > 1 && !selected.groupage_fige && (
                <button onClick={() => openAssign(selected, undefined, undefined, undefined, true)}
                  className="py-2 px-3 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-900/20 rounded-lg border border-emerald-900/30 transition-colors">
                  Modifier la mission
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[160] p-4" onClick={() => setConflictPanelRowId(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white">Details des conflits</h3>
                <p className="text-xs text-slate-400 mt-0.5">{conflictRow?.primary ?? 'Ressource'} - {activeRowConflicts.length} chevauchement{activeRowConflicts.length > 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-2">
                {conflictRow && !conflictRow.isCustom && !conflictRow.isAffretementAsset && activeRowConflicts.length > 0 && isFeatureEnabled('action_resoudre_conflits') && (
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
                          {isFeatureEnabled('action_groupage') ? (
                            <>
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
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500">Actions de groupage desactivees</span>
                          )}
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
            {(() => {
              const missionSummary = getMissionSummary(contextMenu.ot)
              return (
                <>
            <div className="flex items-center gap-1.5 mb-1">
              {isAffretedOt(contextMenu.ot.id) && <span className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-blue-600/30 text-blue-300">AFF</span>}
              {contextMenu.ot.mission_id && <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${contextMenu.ot.groupage_fige ? 'bg-indigo-600/30 text-indigo-300' : 'bg-amber-100 text-amber-950'}`}>{contextMenu.ot.groupage_fige ? 'MISSION FIGEE' : getGroupageBubbleLabel(contextMenu.ot)}</span>}
              <span className="text-xs font-mono text-slate-400">{contextMenu.ot.reference}</span>
              <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium ${BADGE_CLS[contextMenu.ot.statut] ?? 'bg-slate-700 text-slate-400'}`}>
                {STATUT_LABEL[contextMenu.ot.statut] ?? contextMenu.ot.statut}
              </span>
            </div>
            <p className="text-sm font-bold text-white truncate">{contextMenu.ot.client_nom}</p>
            {missionSummary.missionType === 'groupage' && (
              <div className="mt-1.5 rounded-lg border border-amber-300/20 bg-amber-400/5 px-2 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">Groupage</p>
                <p className="text-[11px] font-semibold text-slate-100">{missionSummary.courseCount} courses � {missionSummary.timeRange}</p>
                <p className="truncate text-[10px] text-slate-400">{missionSummary.referencesLabel}</p>
              </div>
            )}
            {getAffretementCompany(contextMenu.ot.id) && (
              <p className="text-[11px] text-blue-300/80 truncate mt-0.5">{getAffretementCompany(contextMenu.ot.id)}</p>
            )}
            {contextMenu.ot.prix_ht != null && (
              <p className="text-[10px] text-emerald-400/80 mt-0.5">{contextMenu.ot.prix_ht.toFixed(0)} EUR HT</p>
            )}
                </>
              )
            })()}
          </div>

          {/* Actions principales */}
          <div className="py-1">
            <button
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
              onClick={() => { setContextMenu(null); openSelected(contextMenu.ot) }}>
              <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
              {contextMenu.ot.mission_id ? 'Details mission / statut' : 'Details / statut operationnel'}
            </button>

            {isFeatureEnabled('action_affecter') && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors text-left"
                onClick={() => { setContextMenu(null); openAssign(contextMenu.ot) }}>
                <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Modifier dates / ressources
              </button>
            )}

            {(ST_EN_COURS.includes((contextMenu.ot.statut_transport ?? '') as never) || contextMenu.ot.statut_transport === 'termine') && (
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

            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Statut OT</p>
            </div>
            <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
              {(['brouillon', 'confirme', 'planifie', 'en_cours', 'livre', 'annule'] as const).map(status => (
                <button
                  key={status}
                  type="button"
                  disabled={contextMenu.ot.statut === status}
                  onClick={() => { void updateOtStatusFromPlanning(contextMenu.ot, status) }}
                  className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                    contextMenu.ot.statut === status
                      ? `${BADGE_CLS[status] ?? 'bg-slate-700 text-slate-300'} border-transparent cursor-default`
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {STATUT_LABEL[status] ?? status}
                </button>
              ))}
            </div>

            {isFeatureEnabled('action_groupage') && contextMenu.ot.mission_id && !contextMenu.ot.groupage_fige && (
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

            {isFeatureEnabled('action_groupage') && contextMenu.ot.mission_id && (
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

            {/* D�poser en d�p�t */}
            {isFeatureEnabled('action_relais') && (['planifie','en_cours','livre','confirme'].includes(contextMenu.ot.statut)) && (
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
            {isFeatureEnabled('action_relais') && (['planifie','en_cours'].includes(contextMenu.ot.statut)) && (
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

            {/* Notification client */}
            {isFeatureEnabled('action_notifier_client') && (
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-sky-300 hover:bg-sky-900/20 hover:text-sky-200 transition-colors text-left"
                onClick={() => { setContextMenu(null); openNotifyClient(contextMenu.ot) }}>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                Notifier le client
              </button>
            )}

            <div className="border-t border-slate-800 my-1"/>

            {isFeatureEnabled('action_affecter') && canUnlock(contextMenu.ot) && (
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

      {driverPrintMenu && (
        <div
          className="fixed z-[82] min-w-[230px] overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900 py-1 shadow-2xl"
          style={{ left: driverPrintMenu.x, top: driverPrintMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="border-b border-slate-800 bg-slate-800/40 px-3 py-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Conducteur</p>
            <p className="truncate text-sm font-semibold text-white">{driverPrintMenu.rowLabel}</p>
          </div>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setDriverPrintMenu(null)
              printDriverPlanningPeriod(driverPrintMenu.rowId, driverPrintMenu.rowLabel, 'jour')
            }}
          >
            Imprimer la journee
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setDriverPrintMenu(null)
              printDriverPlanningPeriod(driverPrintMenu.rowId, driverPrintMenu.rowLabel, 'semaine')
            }}
          >
            Imprimer la semaine
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setDriverPrintMenu(null)
              printDriverPlanningPeriod(driverPrintMenu.rowId, driverPrintMenu.rowLabel, 'mois')
            }}
          >
            Imprimer le mois
          </button>
        </div>
      )}

      {/* -- Tooltip mini-itin�raire ------------------------------------------ */}
      {hoveredBlock && !drag && (() => {
        const { ot, x, y } = hoveredBlock
        const missionSummary = getMissionSummary(ot)
        const chargSite = ot.chargement_site_id ? logisticSites.find(s => s.id === ot.chargement_site_id) : null
        const livrSite  = ot.livraison_site_id  ? logisticSites.find(s => s.id === ot.livraison_site_id)  : null
        const tooltipX = Math.min(x + 12, window.innerWidth - 280)
        const tooltipY = Math.min(y + 8, window.innerHeight - (missionSummary.missionType === 'groupage' ? 320 : 220))
        return (
          <div
            className={`fixed z-[90] pointer-events-none rounded-xl border bg-slate-950/95 shadow-2xl px-3 py-2.5 w-72 ${missionSummary.missionType === 'groupage' ? 'border-amber-300/60 ring-1 ring-amber-300/25' : 'border-slate-600'}`}
            style={{ left: tooltipX, top: tooltipY }}
          >
            <div className="mb-2 border-b border-slate-800 pb-2">
              <div className="flex items-center justify-between gap-2">
                <p className={`text-[10px] font-bold uppercase tracking-wider ${missionSummary.missionType === 'groupage' ? 'text-amber-200' : 'text-slate-400'}`}>
                  {missionSummary.missionType === 'groupage' ? 'Groupage' : missionSummary.label}
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${missionSummary.missionType === 'groupage' ? 'bg-amber-100 text-amber-950' : 'bg-slate-800 text-slate-200'}`}>
                  {missionSummary.badge}
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-white">{missionSummary.subtitle}</p>
              <p className="text-[10px] text-slate-400">{missionSummary.timeRange} � {missionSummary.statusLabel}</p>
              {hoveredMissionSummary && (
                <p className="mt-1 text-[10px] text-slate-500">Mission {hoveredMissionSummary.missionId.slice(0, 8)} � {missionSummary.courseCount} course{missionSummary.courseCount > 1 ? 's' : ''}</p>
              )}
            </div>
            {missionSummary.missionType === 'groupage' && (
              <div className="mb-2 rounded-lg border border-amber-300/20 bg-amber-400/5 px-2 py-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200">Sous-courses liees</p>
                <div className="mt-1 flex flex-col gap-1">
                  {missionSummary.coursePreview.slice(0, 4).map((line, index) => (
                    <p key={`${missionSummary.missionId}-${index}`} className="truncate text-[10px] text-slate-200">{line}</p>
                  ))}
                  {missionSummary.coursePreview.length > 4 && (
                    <p className="text-[10px] text-slate-500">+ {missionSummary.coursePreview.length - 4} autre{missionSummary.coursePreview.length - 4 > 1 ? 's' : ''} course{missionSummary.coursePreview.length - 4 > 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Itineraire</p>
            <div className="flex flex-col gap-1">
              {chargSite && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 flex-shrink-0"/>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{chargSite.nom}</p>
                    {chargSite.adresse && <p className="text-[10px] text-slate-400 leading-tight">{chargSite.adresse}</p>}
                  </div>
                </div>
              )}
              {chargSite && livrSite && <div className="ml-[7px] w-px h-3 bg-slate-600" />}
              {livrSite && (
                <div className="flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 mt-1 flex-shrink-0"/>
                  <div>
                    <p className="text-xs font-semibold text-white leading-tight">{livrSite.nom}</p>
                    {livrSite.adresse && <p className="text-[10px] text-slate-400 leading-tight">{livrSite.adresse}</p>}
                  </div>
                </div>
              )}
              {!chargSite && !livrSite && (
                <p className="text-[10px] text-slate-500">Itineraire non renseigne.</p>
              )}
            </div>
            <div className="mt-1.5 border-t border-slate-800 pt-1.5 text-[10px] text-slate-400">
              {missionSummary.missionType === 'groupage' && <p>{missionSummary.referencesLabel}</p>}
              {ot.distance_km != null && <p>{Math.round(ot.distance_km)} km</p>}
            </div>
          </div>
        )
      })()}

      {/* -- Modale Confirmation ---------------------------------------------- */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]" onClick={() => { confirmModal.resolve(false); setConfirmModal(null) }}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-white mb-4">{confirmModal.message}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { confirmModal.resolve(false); setConfirmModal(null) }} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
              <button onClick={() => { confirmModal.resolve(true); setConfirmModal(null) }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* -- Modale Notification client --------------------------------------- */}
      {notifyClientOt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[160] p-4" onClick={() => setNotifyClientOt(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-1">Notifier le client</h3>
            <p className="text-[11px] text-slate-400 mb-3">
              Course <span className="font-mono text-slate-300">{notifyClientOt.reference}</span> � <span className="text-slate-300">{notifyClientOt.client_nom}</span>
            </p>
            <textarea
              value={notifyMessage}
              onChange={e => setNotifyMessage(e.target.value)}
              rows={8}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-sky-500 resize-none mb-3 font-mono"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNotifyClientOt(null)} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Fermer
              </button>
              <button
                onClick={() => { void navigator.clipboard.writeText(notifyMessage); pushPlanningNotice('Message copie dans le presse-papiers.', 'success') }}
                className="flex items-center gap-1.5 px-4 py-2 border border-slate-600 hover:border-slate-500 text-slate-300 text-sm rounded-xl transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copier
              </button>
              <a
                href={`mailto:?subject=Course%20${encodeURIComponent(notifyClientOt.reference)}&body=${encodeURIComponent(notifyMessage)}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-700 hover:bg-sky-600 text-white text-sm rounded-xl transition-colors"
                onClick={() => setNotifyClientOt(null)}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Ouvrir messagerie
              </a>
            </div>
          </div>
        </div>
      )}

      {/* -- Panneau Optimisation Tournée ------------------------------------- */}
      <RouteOptimizerPanel
        open={showRouteOptimizer}
        onClose={() => setShowRouteOptimizer(false)}
        conducteurs={conducteurs}
        defaultConducteurId={optimizerConducteurId}
        defaultDate={toISO(new Date())}
        onApplied={() => void loadAll()}
      />

      {/* -- Modales Relais --------------------------------------------------- */}

      {/* Modale D�p�t marchandise */}
      {(relaisModal.mode === 'depot' || relaisModal.mode === 'relais_conducteur') && relaisModal.ot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[160] p-4"
          onClick={() => setRelaisModal({ mode: null, ot: null, relais: null })}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">
                {relaisModal.mode === 'relais_conducteur' ? 'Relais conducteur' : 'Deposer en entrepot / depot'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Course {relaisModal.ot.reference} � {relaisModal.ot.client_nom}</p>
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
                  <option value="">� Saisie libre �</option>
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
                      placeholder={relaisModal.mode === 'relais_conducteur' ? 'ex: Aire A7 km 142, Mont�limar' : 'ex: Entrep�t Nexora Lille'}
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

              {/* Date d�p�t / RDV */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.mode === 'relais_conducteur' ? 'Date / heure du RDV' : 'Date de depot'}
                </label>
                <input type="datetime-local"
                  value={relaisDepotForm.date_depot}
                  onChange={e => setRelaisDepotForm(f => ({ ...f, date_depot: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>

              {/* V�hicule */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {relaisModal.mode === 'relais_conducteur' ? 'Conducteur qui repart (conducteur A)' : 'Conducteur qui d�pose'}
                </label>
                <select
                  value={relaisDepotForm.conducteur_depose_id}
                  onChange={e => setRelaisDepotForm(f => ({ ...f, conducteur_depose_id: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="">� Aucun �</option>
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
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[160] p-4"
          onClick={() => setRelaisModal({ mode: null, ot: null, relais: null })}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">
                {relaisModal.relais.type_relais === 'relais_conducteur' ? 'Affecter conducteur de relais' : 'Affecter la reprise'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {relaisModal.relais.lieu_nom}
                {relaisModal.relais.ordres_transport ? ` � Course ${relaisModal.relais.ordres_transport.reference}` : ''}
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
                  <option value="">� Aucun �</option>
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
                    <option value="">� Aucun �</option>
                    {vehicules.map(v => (
                      <option key={v.id} value={v.id}>{v.immatriculation}{v.modele ? ` � ${v.modele}` : ''}</option>
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



