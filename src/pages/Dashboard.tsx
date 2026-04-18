import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { ROLE_LABELS, useAuth, type Role } from '@/lib/auth'
import {
  getDefaultPrefs,
  loadPrefs,
  savePrefs,
  toggleWidget,
  moveWidget,
  moveWidgetToTarget,
  sortedWidgets,
  type WidgetSize,
  type WidgetPrefsMap,
} from '@/lib/dashboardPrefs'
import { WidgetShell } from '@/components/dashboard/WidgetShell'
import { WidgetKpiDirigeant } from '@/components/dashboard/WidgetKpiDirigeant'
import { WidgetKpiExploitant } from '@/components/dashboard/WidgetKpiExploitant'
import { WidgetKpiCommercial } from '@/components/dashboard/WidgetKpiCommercial'
import { WidgetTransportsEnAttente } from '@/components/dashboard/WidgetTransportsEnAttente'
import { WidgetAlertesChrono } from '@/components/dashboard/WidgetAlertesChrono'
import { WidgetActiviteRecente } from '@/components/dashboard/WidgetActiviteRecente'
import { WidgetMiniCarteVehicules } from '@/components/dashboard/WidgetMiniCarteVehicules'
import { WidgetPipelineProspects } from '@/components/dashboard/WidgetPipelineProspects'
import { WidgetCarteClients } from '@/components/dashboard/WidgetCarteClients'
import { WidgetRaccourcisMetier } from '@/components/dashboard/WidgetRaccourcisMetier'
import { WidgetSyntheseOperationnelle } from '@/components/dashboard/WidgetSyntheseOperationnelle'
import { WidgetConversationsLive } from '@/components/dashboard/WidgetConversationsLive'
import { WidgetTrackingOverview } from '@/components/dashboard/WidgetTrackingOverview'
import { WidgetEtaDecisionCockpit } from '@/components/dashboard/WidgetEtaDecisionCockpit'
import { RoleCockpitPanelV21 } from '@/components/dashboard-v21/RoleCockpitPanelV21'

interface WidgetDef {
  id: string
  title: string
  subtitle: string
  colSpan: WidgetSize
  roles: Role[]
  component: React.ComponentType
}

type WidgetPreviewTone = 'blue' | 'green' | 'amber' | 'violet' | 'slate'

const WIDGET_REGISTRY: WidgetDef[] = [
  {
    id: 'role-cockpit-panel',
    title: 'Cockpit prioritaire par role',
    subtitle: 'Synthese metier V2.1 par role et period',
    colSpan: 'full',
    roles: ['admin', 'super_admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'administratif', 'facturation', 'flotte', 'observateur', 'investisseur', 'demo', 'affreteur', 'logisticien', 'maintenance', 'rh', 'mecanicien', 'conducteur', 'conducteur_affreteur', 'client'],
    component: RoleCockpitPanelV21,
  },
  {
    id: 'kpi-dirigeant',
    title: 'Tableau de bord financier',
    subtitle: 'CA, marge et OT ce mois',
    colSpan: 'full',
    roles: ['dirigeant', 'admin', 'super_admin', 'comptable', 'administratif', 'facturation', 'observateur', 'investisseur'],
    component: WidgetKpiDirigeant,
  },
  {
    id: 'kpi-exploitant',
    title: 'Indicateurs exploitation',
    subtitle: 'Missions, conducteurs et alertes',
    colSpan: 'full',
    roles: ['exploitant', 'flotte', 'demo'],
    component: WidgetKpiExploitant,
  },
  {
    id: 'kpi-commercial',
    title: 'Indicateurs commerciaux',
    subtitle: 'Clients, CA et pipeline',
    colSpan: 'full',
    roles: ['commercial', 'demo'],
    component: WidgetKpiCommercial,
  },
  {
    id: 'transports-attente',
    title: 'Transports en attente',
    subtitle: 'OT sans prise en charge',
    colSpan: 'half',
    roles: ['dirigeant', 'exploitant', 'admin', 'super_admin', 'comptable', 'administratif', 'facturation', 'flotte', 'observateur', 'demo'],
    component: WidgetTransportsEnAttente,
  },
  {
    id: 'alertes-critiques',
    title: 'Alertes documents',
    subtitle: 'Conducteurs - expirations proches',
    colSpan: 'half',
    roles: ['dirigeant', 'admin', 'super_admin', 'demo'],
    component: WidgetAlertesChrono,
  },
  {
    id: 'alertes-chrono',
    title: 'Alertes chronotachygraphe',
    subtitle: 'Temps de conduite et documents',
    colSpan: 'half',
    roles: ['exploitant', 'flotte', 'demo'],
    component: WidgetAlertesChrono,
  },
  {
    id: 'activite-recente',
    title: 'Activite recente',
    subtitle: 'Derniers mouvements OT',
    colSpan: 'half',
    roles: ['dirigeant', 'admin', 'super_admin', 'comptable', 'administratif', 'facturation', 'observateur', 'investisseur', 'demo'],
    component: WidgetActiviteRecente,
  },
  {
    id: 'carte-vehicules',
    title: 'Carte des missions',
    subtitle: 'Vehicules en route en temps reel',
    colSpan: 'full',
    roles: ['admin', 'super_admin', 'dirigeant', 'exploitant', 'flotte', 'affreteur', 'demo'],
    component: WidgetMiniCarteVehicules,
  },
  {
    id: 'pipeline-prospects',
    title: 'Pipeline commercial',
    subtitle: 'Prospects et opportunites',
    colSpan: 'half',
    roles: ['commercial', 'dirigeant', 'admin', 'super_admin', 'comptable', 'administratif', 'facturation', 'observateur', 'investisseur', 'demo'],
    component: WidgetPipelineProspects,
  },
  {
    id: 'carte-clients',
    title: 'Carte clients et suggestions IA',
    subtitle: 'Couverture geographique et zones a conquerir',
    colSpan: 'full',
    roles: ['commercial', 'demo'],
    component: WidgetCarteClients,
  },
  {
    id: 'raccourcis-metier',
    title: 'Raccourcis metier',
    subtitle: 'Acces rapide a vos ecrans essentiels',
    colSpan: 'half',
    roles: ['admin', 'super_admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'administratif', 'facturation', 'flotte', 'observateur', 'investisseur', 'demo'],
    component: WidgetRaccourcisMetier,
  },
  {
    id: 'synthese-operationnelle',
    title: 'Synthese operationnelle',
    subtitle: 'Charge OT et alertes critiques',
    colSpan: 'half',
    roles: ['admin', 'super_admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'administratif', 'facturation', 'flotte', 'observateur', 'investisseur', 'demo'],
    component: WidgetSyntheseOperationnelle,
  },
  {
    id: 'conversations-live',
    title: 'Conversations en direct',
    subtitle: 'Personnes qui essayent de vous joindre',
    colSpan: 'half',
    roles: ['admin', 'super_admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'administratif', 'facturation', 'flotte', 'observateur', 'investisseur', 'demo', 'affreteur'],
    component: WidgetConversationsLive,
  },
  {
    id: 'tracking-overview',
    title: 'Tracking & map overview',
    subtitle: 'Vue rapide des courses et du suivi terrain',
    colSpan: 'half',
    roles: ['admin', 'super_admin', 'dirigeant', 'exploitant', 'commercial', 'comptable', 'administratif', 'facturation', 'flotte', 'observateur', 'investisseur', 'demo', 'affreteur'],
    component: WidgetTrackingOverview,
  },
  {
    id: 'eta-decision-cockpit',
    title: 'ETA & decisions',
    subtitle: 'ETA predictif, scoring demandes, alertes',
    colSpan: 'full',
    roles: ['admin', 'super_admin', 'dirigeant', 'exploitant', 'flotte', 'demo'],
    component: WidgetEtaDecisionCockpit,
  },
]

const WIDGET_SIZE_ORDER: WidgetSize[] = ['third', 'half', 'full']
const WIDGET_SIZE_LABEL: Record<WidgetSize, string> = {
  third: 'Petit',
  half: 'Moyen',
  full: 'Grand',
}

const WIDGET_SIZE_PREVIEW_CLASS: Record<WidgetSize, string> = {
  third: 'w-20',
  half: 'w-32',
  full: 'w-full',
}

const WIDGET_TONE_BY_ROLE: Record<Role, WidgetPreviewTone> = {
  admin: 'violet',
  super_admin: 'violet',
  dirigeant: 'blue',
  exploitant: 'amber',
  mecanicien: 'slate',
  commercial: 'green',
  comptable: 'blue',
  rh: 'green',
  conducteur: 'slate',
  conducteur_affreteur: 'slate',
  client: 'blue',
  affreteur: 'amber',
  administratif: 'blue',
  facturation: 'blue',
  flotte: 'amber',
  maintenance: 'slate',
  observateur: 'slate',
  demo: 'violet',
  investisseur: 'green',
  logisticien: 'amber',
}

const PREVIEW_TONE_CLASS: Record<WidgetPreviewTone, { shell: string; dot: string; glow: string }> = {
  blue: {
    shell: 'from-blue-100 via-cyan-50 to-white border-blue-200',
    dot: 'bg-blue-500',
    glow: 'shadow-blue-100',
  },
  green: {
    shell: 'from-emerald-100 via-lime-50 to-white border-emerald-200',
    dot: 'bg-emerald-500',
    glow: 'shadow-emerald-100',
  },
  amber: {
    shell: 'from-amber-100 via-orange-50 to-white border-amber-200',
    dot: 'bg-amber-500',
    glow: 'shadow-amber-100',
  },
  violet: {
    shell: 'from-indigo-100 via-violet-50 to-white border-indigo-200',
    dot: 'bg-indigo-500',
    glow: 'shadow-indigo-100',
  },
  slate: {
    shell: 'from-slate-200 via-slate-100 to-white border-slate-200',
    dot: 'bg-slate-500',
    glow: 'shadow-slate-200',
  },
}

function WidgetPreviewCard({
  widget,
  size,
  tone,
}: {
  widget: WidgetDef
  size: WidgetSize
  tone: WidgetPreviewTone
}) {
  const toneClass = PREVIEW_TONE_CLASS[tone]

  return (
    <div className={`rounded-[22px] border bg-gradient-to-br ${toneClass.shell} p-3 shadow-sm ${toneClass.glow}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${toneClass.dot}`} />
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{widget.title}</p>
          <p className="truncate text-xs text-slate-600">{widget.subtitle}</p>
        </div>
      </div>

      <div className="mt-3 rounded-[18px] border border-white/70 bg-white/90 p-3">
        <div className="flex items-end gap-2">
          <div className={`rounded-2xl bg-white shadow-sm transition-all ${WIDGET_SIZE_PREVIEW_CLASS[size]}`}>
            {size === 'third' && (
              <div className="flex h-16 flex-col gap-2 p-3">
                <div className="h-3 rounded-full bg-slate-100" />
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-100" />
                  <div className="rounded-xl bg-slate-50" />
                </div>
              </div>
            )}
            {size === 'half' && (
              <div className="grid h-16 grid-cols-2 gap-2 p-3">
                <div className="rounded-xl bg-slate-100" />
                <div className="rounded-xl bg-slate-100" />
                <div className="rounded-xl bg-slate-50" />
                <div className="rounded-xl bg-slate-50" />
              </div>
            )}
            {size === 'full' && (
              <div className="flex h-16 gap-2 p-3">
                <div className="grid flex-1 grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-100" />
                  <div className="rounded-xl bg-slate-50" />
                  <div className="rounded-xl bg-slate-100" />
                </div>
                <div className="w-20 rounded-2xl bg-slate-50" />
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 rounded-full bg-slate-100" />
            <div className="h-3 w-3/4 rounded-full bg-slate-100" />
            <div className="h-10 rounded-2xl bg-slate-50" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { role } = useAuth()
  const currentRole = (role as Role) ?? 'exploitant'
  const widgetTone = WIDGET_TONE_BY_ROLE[currentRole] ?? 'blue'

  const [prefs, setPrefs] = useState<WidgetPrefsMap>(() => loadPrefs(currentRole))
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null)
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null)
  const [galleryDropTarget, setGalleryDropTarget] = useState<string | null>(null)

  function withLayoutTransition(action: () => void) {
    const docWithTransition = document as Document & {
      startViewTransition?: (callback: () => void) => { finished: Promise<void> }
    }

    if (typeof docWithTransition.startViewTransition === 'function') {
      docWithTransition.startViewTransition(() => {
        action()
      })
      return
    }

    action()
  }

  const roleWidgets = useMemo(() => WIDGET_REGISTRY.filter(widget => widget.roles.includes(currentRole)), [currentRole])

  useEffect(() => {
    setPrefs(loadPrefs(currentRole))
  }, [currentRole])

  useEffect(() => {
    setSelectedWidgetId(null)
    setMenuOpen(false)
  }, [currentRole])

  useEffect(() => {
    if (!isCustomizing) return
    setSelectedWidgetId(previous => {
      if (previous && roleWidgets.some(widget => widget.id === previous)) return previous
      return roleWidgets[0]?.id ?? null
    })
  }, [isCustomizing, roleWidgets])

  useEffect(() => {
    setPrefs(previous => {
      const missing = roleWidgets.filter(widget => !previous[widget.id])
      if (missing.length === 0) return previous

      const next: WidgetPrefsMap = { ...previous }
      const minOrder = Object.values(next).reduce((minimum, pref) => Math.min(minimum, pref.order), 0)
      let nextOrder = Object.keys(next).length
      for (const widget of missing) {
        const order = widget.id === 'role-cockpit-panel' ? minOrder - 1 : nextOrder++
        next[widget.id] = { visible: true, order }
      }

      savePrefs(currentRole, next)
      return next
    })
  }, [currentRole, roleWidgets])

  function updatePrefs(newPrefs: WidgetPrefsMap) {
    withLayoutTransition(() => {
      setPrefs(newPrefs)
      savePrefs(currentRole, newPrefs)
    })
  }

  function getWidgetSize(widgetId: string, fallback: WidgetSize): WidgetSize {
    return prefs[widgetId]?.size ?? fallback
  }

  function setWidgetSize(widgetId: string, size: WidgetSize) {
    const current = prefs[widgetId]
    if (!current || current.size === size) return
    updatePrefs({
      ...prefs,
      [widgetId]: { ...current, size },
    })
  }

  function resizeWidget(widgetId: string, direction: 'shrink' | 'grow', fallback: WidgetSize) {
    const currentSize = getWidgetSize(widgetId, fallback)
    const currentIndex = WIDGET_SIZE_ORDER.indexOf(currentSize)
    if (currentIndex < 0) return
    const targetIndex = direction === 'grow' ? currentIndex + 1 : currentIndex - 1
    if (targetIndex < 0 || targetIndex >= WIDGET_SIZE_ORDER.length) return
    setWidgetSize(widgetId, WIDGET_SIZE_ORDER[targetIndex])
  }

  function setWidgetVisibility(widgetId: string, visible: boolean) {
    const current = prefs[widgetId]
    if (!current || current.visible === visible) return
    updatePrefs({
      ...prefs,
      [widgetId]: { ...current, visible },
    })
  }

  function setAllVisible() {
    const next: WidgetPrefsMap = { ...prefs }
    for (const widget of roleWidgets) {
      const current = next[widget.id]
      if (!current) continue
      next[widget.id] = { ...current, visible: true }
    }
    updatePrefs(next)
  }

  function resetRoleLayout() {
    const defaults = getDefaultPrefs(currentRole)
    const next: WidgetPrefsMap = {}
    let fallbackOrder = Object.keys(defaults).length

    for (const widget of roleWidgets) {
      const defaultPref = defaults[widget.id]
      if (defaultPref) {
        next[widget.id] = { ...defaultPref }
      } else {
        next[widget.id] = { visible: true, order: fallbackOrder++ }
      }
    }

    updatePrefs(next)
  }

  function handleDragStart(widgetId: string, event: DragEvent<HTMLDivElement>) {
    if (!isCustomizing) return
    setDraggedWidgetId(widgetId)
    setDropTarget(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', widgetId)
  }

  function computeDropPosition(event: DragEvent<HTMLDivElement>): 'before' | 'after' {
    const rect = event.currentTarget.getBoundingClientRect()
    return event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
  }

  function handleDragOver(targetId: string, event: DragEvent<HTMLDivElement>) {
    if (!isCustomizing || !draggedWidgetId || draggedWidgetId === targetId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const position = computeDropPosition(event)
    setDropTarget(prev => (prev?.id === targetId && prev.position === position ? prev : { id: targetId, position }))
  }

  function handleGalleryDragOver(targetId: string, event: DragEvent<HTMLButtonElement>) {
    if (!isCustomizing || !draggedWidgetId || draggedWidgetId === targetId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setGalleryDropTarget(prev => (prev === targetId ? prev : targetId))
  }

  function handleGalleryDrop(targetId: string, event: DragEvent<HTMLButtonElement>) {
    if (!isCustomizing) return
    event.preventDefault()
    const sourceId = draggedWidgetId ?? event.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) {
      setGalleryDropTarget(null)
      setDraggedWidgetId(null)
      return
    }

    updatePrefs(moveWidgetToTarget(prefs, sourceId, targetId, 'before'))
    setGalleryDropTarget(null)
    setDraggedWidgetId(null)
  }

  function handleDrop(targetId: string, event: DragEvent<HTMLDivElement>) {
    if (!isCustomizing) return
    event.preventDefault()
    const sourceId = draggedWidgetId ?? event.dataTransfer.getData('text/plain')
    if (!sourceId || sourceId === targetId) {
      setDropTarget(null)
      setDraggedWidgetId(null)
      return
    }

    const position = computeDropPosition(event)
    updatePrefs(moveWidgetToTarget(prefs, sourceId, targetId, position))
    setDropTarget(null)
    setDraggedWidgetId(null)
  }

  function handleDragEnd() {
    setDraggedWidgetId(null)
    setDropTarget(null)
    setGalleryDropTarget(null)
  }

  const orderedIds = sortedWidgets(prefs).filter(id => roleWidgets.some(w => w.id === id))
  const visibleIds = orderedIds.filter(id => prefs[id]?.visible !== false)
  const hiddenIds = orderedIds.filter(id => prefs[id]?.visible === false)
  const selectedWidgetIdSafe = selectedWidgetId && roleWidgets.some(widget => widget.id === selectedWidgetId) ? selectedWidgetId : roleWidgets[0]?.id ?? null
  const selectedWidgetDef = roleWidgets.find(widget => widget.id === selectedWidgetIdSafe) ?? null
  const selectedWidgetSize = selectedWidgetDef ? getWidgetSize(selectedWidgetDef.id, selectedWidgetDef.colSpan) : 'half'

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Cockpit decisionnel</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>Vue priorisee {ROLE_LABELS[currentRole] ?? currentRole}</p>
        </div>
        <div className="flex items-center gap-2">
          {isCustomizing && hiddenIds.length > 0 && <span className="text-xs text-slate-500">{hiddenIds.length} widget(s) retire(s) de l accueil</span>}
          {isCustomizing && (
            <button
              onClick={() => setMenuOpen(v => !v)}
              className={`nx-btn rounded-xl px-3 py-2 text-xs font-medium ${menuOpen ? 'nx-btn-primary' : ''}`}
            >
              Menu personnalisation
            </button>
          )}
          <button
            onClick={() => {
              setIsCustomizing(v => {
                if (v) {
                  setMenuOpen(false)
                  setDraggedWidgetId(null)
                  setDropTarget(null)
                }
                return !v
              })
            }}
            className={`nx-btn flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium ${
              isCustomizing
                ? 'nx-btn-primary'
                : ''
            }`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {isCustomizing ? 'Terminer' : 'Personnaliser'}
          </button>
        </div>
      </div>
      {isCustomizing && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="nx-card rounded-[26px] px-4 py-4 text-sm lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'linear-gradient(145deg, color-mix(in srgb, var(--surface-soft) 80%, #ffffff 20%), color-mix(in srgb, var(--surface) 88%, #dbeafe 12%))', color: 'var(--text-secondary)' }}>
            <span className="font-semibold text-[color:var(--primary)]">Mode widgets style iPhone</span>
            {' '}Ajoutez, retirez, redimensionnez et reordonnez vos widgets avec une galerie visuelle. Le glisser-deposer reste disponible pour l ordre.
          </div>

          {menuOpen && (
            <div className="nx-card rounded-[26px] p-3 lg:col-span-1" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Collection</p>
                <span className="text-xs text-slate-500">{visibleIds.length}/{orderedIds.length}</span>
              </div>

              <div className="max-h-72 space-y-2 overflow-auto pr-1">
                {orderedIds.map((id, index) => {
                  const def = WIDGET_REGISTRY.find(w => w.id === id)
                  if (!def) return null
                  const isVisible = prefs[id]?.visible !== false
                  const isFirst = index === 0
                  const isLast = index === orderedIds.length - 1
                  const currentSize = getWidgetSize(id, def.colSpan)
                  const sizeIndex = WIDGET_SIZE_ORDER.indexOf(currentSize)
                  return (
                    <div key={id} className="rounded-xl border p-2" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-semibold text-slate-900">{def.title}</p>
                        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={event => setWidgetVisibility(id, event.target.checked)}
                          />
                          Visible
                        </label>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          onClick={() => updatePrefs(moveWidget(prefs, id, 'up'))}
                          disabled={isFirst}
                          className="nx-btn rounded-lg px-2 py-1 text-[11px] disabled:opacity-50"
                        >
                          Monter
                        </button>
                        <button
                          onClick={() => updatePrefs(moveWidget(prefs, id, 'down'))}
                          disabled={isLast}
                          className="nx-btn rounded-lg px-2 py-1 text-[11px] disabled:opacity-50"
                        >
                          Descendre
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <button
                          onClick={() => resizeWidget(id, 'shrink', def.colSpan)}
                          disabled={sizeIndex <= 0}
                          className="nx-btn rounded-lg px-2 py-1 text-[11px] disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="rounded-md border px-2 py-1 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                          {WIDGET_SIZE_LABEL[currentSize]}
                        </span>
                        <button
                          onClick={() => resizeWidget(id, 'grow', def.colSpan)}
                          disabled={sizeIndex >= WIDGET_SIZE_ORDER.length - 1}
                          className="nx-btn rounded-lg px-2 py-1 text-[11px] disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={setAllVisible} className="nx-btn rounded-lg px-2 py-1.5 text-xs">Tout afficher</button>
                <button onClick={resetRoleLayout} className="nx-btn rounded-lg px-2 py-1.5 text-xs">Reinitialiser</button>
              </div>
            </div>
          )}
        </div>
      )}

      {isCustomizing && (
        <div className="nx-card rounded-[30px] border p-4 md:p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div className="flex flex-col gap-5">
            <div className="min-w-0 flex-1">
              {selectedWidgetDef ? (
                <>
                  {menuOpen && (
                    <div className="mb-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Mes widgets</p>
                          <p className="text-xs text-slate-600">Maintenez puis glissez pour reordonner comme sur l ecran d accueil Apple.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">{visibleIds.length} visibles</span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleIds.map(id => {
                          const def = roleWidgets.find(widget => widget.id === id)
                          if (!def) return null
                          const size = getWidgetSize(id, def.colSpan)
                          const isSelected = id === selectedWidgetIdSafe
                          const isDropTarget = galleryDropTarget === id
                          return (
                            <button
                              key={id}
                              type="button"
                              draggable
                              onClick={() => setSelectedWidgetId(id)}
                              onDragStart={event => handleDragStart(id, event as unknown as DragEvent<HTMLDivElement>)}
                              onDragOver={event => handleGalleryDragOver(id, event)}
                              onDrop={event => handleGalleryDrop(id, event)}
                              onDragEnd={() => handleDragEnd()}
                              className={`rounded-[24px] border p-3 text-left transition-all ${isSelected ? 'border-blue-300 bg-blue-50 shadow-sm' : 'border-[color:var(--border)] bg-white'} ${draggedWidgetId === id ? 'opacity-50 scale-[0.98]' : ''} ${isDropTarget ? 'ring-2 ring-[color:var(--primary)] ring-offset-2 shadow-[0_0_0_6px_rgba(37,99,235,0.08)]' : ''}`}
                            >
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{WIDGET_SIZE_LABEL[size]}</span>
                                <span className="text-[11px] font-semibold text-slate-500">Glisser</span>
                              </div>
                              <WidgetPreviewCard widget={def} size={size} tone={widgetTone} />
                            </button>
                          )
                        })}
                      </div>
                      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                        Astuce: glissez un widget sur un autre pour l inserer a sa place. Le halo bleu indique la future position.
                      </div>
                    </div>
                  )}

                  <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[color:var(--text-heading)]">{selectedWidgetDef.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{selectedWidgetDef.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(prefs[selectedWidgetDef.id]?.visible !== false) ? (
                        <button
                          type="button"
                          onClick={() => setWidgetVisibility(selectedWidgetDef.id, false)}
                          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
                        >
                          Retirer de l accueil
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setWidgetVisibility(selectedWidgetDef.id, true)}
                          className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-xs font-semibold text-white"
                        >
                          Ajouter a l accueil
                        </button>
                      )}
                    </div>
                  </div>

                  <WidgetPreviewCard widget={selectedWidgetDef} size={selectedWidgetSize} tone={widgetTone} />

                  {menuOpen && (
                    <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Taille du widget</p>
                        <p className="text-xs text-slate-600">Comme sur Apple: choisissez le format avant de revenir au cockpit.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {WIDGET_SIZE_ORDER.map(size => {
                          const isActive = selectedWidgetSize === size
                          return (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setWidgetSize(selectedWidgetDef.id, size)}
                              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${isActive ? 'bg-[color:var(--primary)] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                              {WIDGET_SIZE_LABEL[size]}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updatePrefs(moveWidget(prefs, selectedWidgetDef.id, 'up'))}
                      disabled={visibleIds.indexOf(selectedWidgetDef.id) <= 0}
                      className="rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Monter dans le cockpit
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePrefs(moveWidget(prefs, selectedWidgetDef.id, 'down'))}
                      disabled={visibleIds.indexOf(selectedWidgetDef.id) < 0 || visibleIds.indexOf(selectedWidgetDef.id) >= visibleIds.length - 1}
                      className="rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm font-semibold text-slate-700 disabled:opacity-40"
                    >
                      Descendre dans le cockpit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedWidgetId(roleWidgets[(roleWidgets.findIndex(widget => widget.id === selectedWidgetDef.id) + 1) % roleWidgets.length]?.id ?? selectedWidgetDef.id)}
                      className="rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm font-semibold text-slate-700"
                    >
                      Voir un autre widget
                    </button>
                  </div>
                </>
              ) : null}
            </div>

            <div className="min-w-0 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[color:var(--text-heading)]">Ajouter des widgets</h2>
                  <p className="text-sm text-slate-600">Section placee en bas pour ne pas perturber la lecture du reglage principal.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{roleWidgets.length} disponibles</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {roleWidgets.map(widget => {
                  const isSelected = widget.id === selectedWidgetIdSafe
                  const isVisible = prefs[widget.id]?.visible !== false
                  return (
                    <button
                      key={widget.id}
                      type="button"
                      onClick={() => setSelectedWidgetId(widget.id)}
                      className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors ${isSelected ? 'border-blue-300 bg-blue-50' : 'border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-slate-50'}`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{widget.title}</p>
                        <p className="truncate text-xs text-slate-600">{widget.subtitle}</p>
                      </div>
                      <span className={`ml-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ${isVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {isVisible ? 'Ajoute' : 'Masque'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-heading)' }}>Vue approfondie personnalisable</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Widgets conserves pour l analyse detaillee et le confort de role.</p>
          </div>
        </div>

      {visibleIds.length === 0 ? (
        <div className="nx-panel flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 text-4xl opacity-20">#</div>
          <p className="text-slate-600">Tous les widgets sont masques</p>
          <button onClick={() => setIsCustomizing(true)} className="mt-3 text-sm font-medium text-[color:var(--primary)] hover:underline">
            Personnaliser le dashboard
          </button>
        </div>
      ) : (
        <div className="grid auto-rows-min grid-cols-3 gap-5">
          {visibleIds.map((id, idx) => {
            const def = WIDGET_REGISTRY.find(w => w.id === id)
            if (!def) return null
            const Component = def.component
            const isFirst = idx === 0
            const isLast = idx === visibleIds.length - 1
            const currentSize = getWidgetSize(id, def.colSpan)
            const sizeIndex = WIDGET_SIZE_ORDER.indexOf(currentSize)
            const isDropTarget = dropTarget?.id === id ? dropTarget.position : null
            return (
              <WidgetShell
                key={id}
                widgetId={id}
                title={def.title}
                subtitle={def.subtitle}
                colSpan={currentSize}
                isCustomizing={isCustomizing}
                isSelected={selectedWidgetIdSafe === id}
                onSelect={() => setSelectedWidgetId(id)}
                onMoveUp={!isFirst ? () => updatePrefs(moveWidget(prefs, id, 'up')) : undefined}
                onMoveDown={!isLast ? () => updatePrefs(moveWidget(prefs, id, 'down')) : undefined}
                onHide={() => updatePrefs(toggleWidget(prefs, id))}
                onShrink={() => resizeWidget(id, 'shrink', def.colSpan)}
                onGrow={() => resizeWidget(id, 'grow', def.colSpan)}
                canShrink={sizeIndex > 0}
                canGrow={sizeIndex < WIDGET_SIZE_ORDER.length - 1}
                draggable={isCustomizing}
                onDragStart={event => handleDragStart(id, event)}
                onDragOver={event => handleDragOver(id, event)}
                onDrop={event => handleDrop(id, event)}
                onDragEnd={handleDragEnd}
                isDragging={draggedWidgetId === id}
                dropPosition={isDropTarget}
              >
                <Component />
              </WidgetShell>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
