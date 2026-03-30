import { useEffect, useMemo, useState } from 'react'
import { useAuth, type Role } from '@/lib/auth'
import {
  loadPrefs,
  savePrefs,
  toggleWidget,
  moveWidget,
  sortedWidgets,
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

interface WidgetDef {
  id: string
  title: string
  subtitle: string
  colSpan: 'full' | 'half' | 'third'
  roles: Role[]
  component: React.ComponentType
}

const WIDGET_REGISTRY: WidgetDef[] = [
  {
    id: 'kpi-dirigeant',
    title: 'Tableau de bord financier',
    subtitle: 'CA, marge et OT ce mois',
    colSpan: 'full',
    roles: ['dirigeant', 'admin'],
    component: WidgetKpiDirigeant,
  },
  {
    id: 'kpi-exploitant',
    title: 'Indicateurs exploitation',
    subtitle: 'Missions, conducteurs et alertes',
    colSpan: 'full',
    roles: ['exploitant'],
    component: WidgetKpiExploitant,
  },
  {
    id: 'kpi-commercial',
    title: 'Indicateurs commerciaux',
    subtitle: 'Clients, CA et pipeline',
    colSpan: 'full',
    roles: ['commercial'],
    component: WidgetKpiCommercial,
  },
  {
    id: 'transports-attente',
    title: 'Transports en attente',
    subtitle: 'OT sans prise en charge',
    colSpan: 'half',
    roles: ['dirigeant', 'exploitant', 'admin'],
    component: WidgetTransportsEnAttente,
  },
  {
    id: 'alertes-critiques',
    title: 'Alertes documents',
    subtitle: 'Conducteurs - expirations proches',
    colSpan: 'half',
    roles: ['dirigeant', 'admin'],
    component: WidgetAlertesChrono,
  },
  {
    id: 'alertes-chrono',
    title: 'Alertes chronotachygraphe',
    subtitle: 'Temps de conduite et documents',
    colSpan: 'half',
    roles: ['exploitant'],
    component: WidgetAlertesChrono,
  },
  {
    id: 'activite-recente',
    title: 'Activite recente',
    subtitle: 'Derniers mouvements OT',
    colSpan: 'half',
    roles: ['dirigeant', 'admin'],
    component: WidgetActiviteRecente,
  },
  {
    id: 'carte-vehicules',
    title: 'Carte des missions',
    subtitle: 'Vehicules en route en temps reel',
    colSpan: 'full',
    roles: ['exploitant'],
    component: WidgetMiniCarteVehicules,
  },
  {
    id: 'pipeline-prospects',
    title: 'Pipeline commercial',
    subtitle: 'Prospects et opportunites',
    colSpan: 'half',
    roles: ['commercial', 'dirigeant', 'admin'],
    component: WidgetPipelineProspects,
  },
  {
    id: 'carte-clients',
    title: 'Carte clients et suggestions IA',
    subtitle: 'Couverture geographique et zones a conquerir',
    colSpan: 'full',
    roles: ['commercial'],
    component: WidgetCarteClients,
  },
]

export default function Dashboard() {
  const { role } = useAuth()
  const currentRole = (role as Role) ?? 'exploitant'

  const [prefs, setPrefs] = useState<WidgetPrefsMap>(() => loadPrefs(currentRole))
  const [isCustomizing, setIsCustomizing] = useState(false)

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

  const orderedIds = sortedWidgets(prefs).filter(id => roleWidgets.some(w => w.id === id))
  const visibleIds = orderedIds.filter(id => prefs[id]?.visible !== false)
  const hiddenIds = orderedIds.filter(id => prefs[id]?.visible === false)

  const ROLE_LABELS_DASH: Record<string, string> = {
    dirigeant: 'Dirigeant',
    exploitant: 'Exploitant',
    commercial: 'Commercial',
    admin: 'Administrateur',
    mecanicien: 'Mecanicien',
    comptable: 'Comptable',
    rh: 'Ressources Humaines',
    conducteur: 'Conducteur',
  }

  return (
    <div className="space-y-6 p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-600">Vue {ROLE_LABELS_DASH[currentRole] ?? currentRole}</p>
        </div>
        <div className="flex items-center gap-2">
          {isCustomizing && hiddenIds.length > 0 && (
            <div className="flex items-center gap-1">
              {hiddenIds.map(id => {
                const def = WIDGET_REGISTRY.find(w => w.id === id)
                if (!def) return null
                return (
                  <button
                    key={id}
                    onClick={() => updatePrefs(toggleWidget(prefs, id))}
                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]"
                  >
                    + {def.title}
                  </button>
                )
              })}
            </div>
          )}
          <button
            onClick={() => setIsCustomizing(v => !v)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
              isCustomizing
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:border-[color:var(--primary)] hover:text-[color:var(--primary)]'
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
        <div className="rounded-2xl border px-4 py-3 text-sm text-slate-600" style={{ borderColor: 'var(--border)', background: 'var(--surface-soft)' }}>
          <span className="font-semibold text-[color:var(--primary)]">Mode personnalisation</span>
          {' '}Utilisez les fleches haut/bas pour reordonner les widgets, et x pour les masquer.
        </div>
      )}

      {visibleIds.length === 0 ? (
        <div className="nx-panel flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 text-4xl opacity-20">📊</div>
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
            return (
              <WidgetShell
                key={id}
                title={def.title}
                subtitle={def.subtitle}
                colSpan={def.colSpan}
                isCustomizing={isCustomizing}
                onMoveUp={!isFirst ? () => updatePrefs(moveWidget(prefs, id, 'up')) : undefined}
                onMoveDown={!isLast ? () => updatePrefs(moveWidget(prefs, id, 'down')) : undefined}
                onHide={() => updatePrefs(toggleWidget(prefs, id))}
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
