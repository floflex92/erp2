/**
 * PlanningDecisionBar — Bandeau décisionnel du planning exploitant
 *
 * Remplace le KPI Strip (plain metrics) par des chips filtrables,
 * classées par niveau d'urgence.
 *
 * Chips cliquables → filtrent le gantt instantanément.
 * CA planifié affiché à droite, discret.
 */

interface PlanningDecisionBarProps {
  // Métriques
  aPlacerCount: number
  retardCount: number
  conflitsCount: number
  sansVehiculeCount: number    // OT planifiés sans véhicule assigné
  planifiesCount: number
  nbAffretement: number
  caPlanning: number

  // Ressources (pour info)
  conducteursCount: number
  vehiculesCount: number
  remoquesCount: number

  // Filtres actifs
  showOnlyAlert: boolean
  showOnlyConflicts: boolean

  // Callbacks filtres
  onToggleAlerts: () => void
  onToggleConflicts: () => void

  // Collapsible
  collapsed: boolean
  onToggleCollapse: () => void
}

function KpiChip({
  label, value, variant = 'neutral', active = false, onClick,
}: {
  label: string
  value: number | string
  variant?: 'danger' | 'warning' | 'success' | 'neutral' | 'info'
  active?: boolean
  onClick?: () => void
}) {
  const base = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border flex-shrink-0 transition-all select-none'
  const interactive = onClick ? 'cursor-pointer hover:brightness-110' : ''

  const styles: Record<string, string> = {
    danger:  active ? 'bg-red-500/25 border-red-400/60 text-red-200 shadow-sm shadow-red-900/30' : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
    warning: active ? 'bg-amber-500/25 border-amber-400/60 text-amber-200' : 'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20',
    success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
    info:    'bg-blue-500/10 border-blue-500/25 text-blue-400',
    neutral: 'bg-slate-800/60 border-slate-700/50 text-slate-400',
  }

  const tag = onClick ? 'button' : 'div'

  if (tag === 'button') {
    return (
      <button type="button" onClick={onClick} className={`${base} ${interactive} ${styles[variant]}`}>
        <span className="text-[10px] whitespace-nowrap">{label}</span>
        <span className="text-sm font-bold leading-none" style={{ color: 'inherit' }}>{value}</span>
        {onClick && <span className="text-[8px] opacity-50 ml-0.5">{active ? '✕' : '▼'}</span>}
      </button>
    )
  }

  return (
    <div className={`${base} ${styles[variant]}`}>
      <span className="text-[10px] whitespace-nowrap">{label}</span>
      <span className="text-sm font-bold leading-none">{value}</span>
    </div>
  )
}

export function PlanningDecisionBar({
  aPlacerCount,
  retardCount,
  conflitsCount,
  sansVehiculeCount,
  planifiesCount,
  nbAffretement,
  caPlanning,
  conducteursCount,
  vehiculesCount,
  remoquesCount,
  showOnlyAlert,
  showOnlyConflicts,
  onToggleAlerts,
  onToggleConflicts,
  collapsed,
  onToggleCollapse,
}: PlanningDecisionBarProps) {
  return (
    <div className="border-b border-slate-800/60 bg-slate-950/70 flex-shrink-0">
      {/* Header row (toujours visible) */}
      <div className="flex items-center gap-2 px-4 py-1.5 flex-wrap overflow-x-hidden">

        {/* ── Chips priorité haute : action requise ─────────────────────── */}
        {aPlacerCount > 0 && (
          <KpiChip
            label="À placer"
            value={aPlacerCount}
            variant="danger"
            active={showOnlyAlert && retardCount === 0}
          />
        )}

        {retardCount > 0 && (
          <KpiChip
            label="Retard"
            value={retardCount}
            variant="danger"
            active={showOnlyAlert}
            onClick={onToggleAlerts}
          />
        )}

        {conflitsCount > 0 && (
          <KpiChip
            label="Conflits"
            value={conflitsCount}
            variant="warning"
            active={showOnlyConflicts}
            onClick={onToggleConflicts}
          />
        )}

        {sansVehiculeCount > 0 && (
          <KpiChip
            label="Sans véhicule"
            value={sansVehiculeCount}
            variant="warning"
          />
        )}

        {/* Séparateur (si au moins un chip d'alerte visible) */}
        {(retardCount > 0 || conflitsCount > 0 || sansVehiculeCount > 0) && (
          <span className="h-4 w-px bg-slate-700/60 flex-shrink-0" aria-hidden="true" />
        )}

        {/* ── Chips info : état normal ──────────────────────────────────── */}
        <KpiChip label="Planifiés" value={planifiesCount} variant="success" />

        <KpiChip label="Conducteurs" value={conducteursCount} variant="neutral" />
        <KpiChip label="Véhicules" value={vehiculesCount} variant="neutral" />
        <KpiChip label="Remorques" value={remoquesCount} variant="neutral" />

        {nbAffretement > 0 && (
          <KpiChip label="Affrété" value={nbAffretement} variant="info" />
        )}

        {/* ── CA planifié — aligné à droite ─────────────────────────────── */}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {caPlanning > 0 && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">CA planifié</span>
              <span className="text-sm font-bold text-slate-300 tabular-nums">
                {caPlanning >= 1000
                  ? `${(caPlanning / 1000).toFixed(0)}k €`
                  : `${caPlanning.toFixed(0)} €`
                }
              </span>
            </div>
          )}

          {/* Bouton collapse */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
            title={collapsed ? 'Agrandir le bandeau KPI' : 'Réduire le bandeau KPI'}
          >
            <svg
              className={`w-3 h-3 transition-transform ${collapsed ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            >
              <path d="m18 15-6-6-6 6"/>
            </svg>
            {collapsed ? 'Voir KPI' : 'Réduire'}
          </button>
        </div>
      </div>

      {/* Ligne filtre actif (bandeau de rappel quand filtre) */}
      {(showOnlyAlert || showOnlyConflicts) && (
        <div className="px-4 pb-1.5 flex items-center gap-2">
          <span className="text-[10px] text-slate-400">Filtre actif :</span>
          {showOnlyAlert && (
            <button
              type="button"
              onClick={onToggleAlerts}
              className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
            >
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">Retards</span>
              <span className="text-[9px]">✕</span>
            </button>
          )}
          {showOnlyConflicts && (
            <button
              type="button"
              onClick={onToggleConflicts}
              className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30">Conflits</span>
              <span className="text-[9px]">✕</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
