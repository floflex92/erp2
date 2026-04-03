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

interface WidgetDef {
  id: string
  title: string
  subtitle: string
  colSpan: WidgetSize
  roles: Role[]
  component: React.ComponentType
}

const WIDGET_REGISTRY: WidgetDef[] = [
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
]

const WIDGET_SIZE_ORDER: WidgetSize[] = ['third', 'half', 'full']
const WIDGET_SIZE_LABEL: Record<WidgetSize, string> = {
  third: 'Petit',
  half: 'Moyen',
  full: 'Grand',
}

export default function Dashboard() {
  const { role } = useAuth()
  const currentRole = (role as Role) ?? 'exploitant'

  const [prefs, setPrefs] = useState<WidgetPrefsMap>(() => loadPrefs(currentRole))
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<{ id: string; position: 'before' | 'after' } | null>(null)

  const roleWidgets = useMemo(() => WIDGET_REGISTRY.filter(widget => widget.roles.includes(currentRole)), [currentRole])

  useEffect(() => {
    setPrefs(loadPrefs(currentRole))
  }, [currentRole])

  useEffect(() => {
    setPrefs(previous => {
      const missing = roleWidgets.filter(widget => !previous[widget.id])
      if (missing.length === 0) return previous

      const next: WidgetPrefsMap = { ...previous }
      let nextOrder = Object.keys(next).length
      for (const widget of missing) {
        next[widget.id] = { visible: true, order: nextOrder++ }
      }

      savePrefs(currentRole, next)
      return next
    })
  }, [currentRole, roleWidgets])

  function updatePrefs(newPrefs: WidgetPrefsMap) {
    setPrefs(newPrefs)
    savePrefs(currentRole, newPrefs)
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
  }

  const orderedIds = sortedWidgets(prefs).filter(id => roleWidgets.some(w => w.id === id))
  const visibleIds = orderedIds.filter(id => prefs[id]?.visible !== false)
  const hiddenIds = orderedIds.filter(id => prefs[id]?.visible === false)

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-heading)' }}>Dashboard</h1>
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>Vue {ROLE_LABELS[currentRole] ?? currentRole}</p>
        </div>
        <div className="flex items-center gap-2">
          {isCustomizing && hiddenIds.length > 0 && <span className="text-xs text-slate-500">{hiddenIds.length} fenetre(s) masquee(s)</span>}
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
          <div className="nx-card rounded-2xl px-4 py-3 text-sm lg:col-span-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)', color: 'var(--text-secondary)' }}>
            <span className="font-semibold text-[color:var(--primary)]">Mode personnalisation</span>
            {' '}Maintenez clic gauche sur un widget pour le deplacer, puis deposez-le. Utilisez - / + pour reduire ou agrandir sa taille.
          </div>

          {menuOpen && (
            <div className="nx-card rounded-2xl p-3 lg:col-span-1" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>Fenetres du role</p>
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
                title={def.title}
                subtitle={def.subtitle}
                colSpan={currentSize}
                isCustomizing={isCustomizing}
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
  )
}
