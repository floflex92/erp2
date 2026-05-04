/**
 * PlanningCommandBar — Barre de commande restructurée du planning exploitant
 *
 * 3 zones :
 *  GAUCHE  : navigation temporelle (< semaine > + Aujourd'hui) + bascule vue (7j/Jour/Mois)
 *  CENTRE  : titre + bascule scope (Principal / Affrètement)
 *  DROITE  : "+ Créer ▼" + "⚙ Expert ▼" + indicateur simulation
 */

import { useRef, useState, useEffect } from 'react'
import type { ViewMode, PlanningScope } from '@/pages/planning/planningTypes'
import {
  addDays, addMonths, getMonday, getMonthStart,
  fmtWeek, toISO, parseDay,
} from '@/pages/planning/planningUtils'

export interface PlanningCommandBarProps {
  // Navigation
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  weekStart: Date
  onWeekChange: (d: Date) => void
  monthStart: Date
  onMonthChange: (d: Date) => void
  selectedDay: string
  onDayChange: (d: string) => void

  // Scope
  planningScope: PlanningScope
  onScopeChange: (s: PlanningScope) => void

  // Actions
  onCreateCourse: () => void
  onCreateHlp: () => void
  onNavigateOT: () => void
  onExportPDF: () => void

  // Expert — réorganisation
  isRowEditMode: boolean
  onRowEditModeChange: (v: boolean) => void

  // Expert — toggles
  blockImpossibleAssignments: boolean
  onBlockImpossibleChange: (v: boolean) => void
  blockOnCompliance: boolean
  onBlockOnComplianceChange: (v: boolean) => void
  simulationMode: boolean
  onSimulationModeChange: (v: boolean) => void

  // Expert — scan CE561
  scanningWeek: boolean
  hasScanResults: boolean
  onScanWeek: () => void
  onClearScan: () => void
  complianceRuleCodes: string[]
  isRuleBlocking: (code: string) => boolean
  onRuleBlockingChange: (code: string, v: boolean) => void
  complianceRuleLabels: Record<string, string>

  // Layout
  isDragging: boolean
}

export function PlanningCommandBar({
  viewMode, onViewModeChange,
  weekStart, onWeekChange,
  monthStart, onMonthChange,
  selectedDay, onDayChange,
  planningScope, onScopeChange,
  onCreateCourse, onCreateHlp, onNavigateOT, onExportPDF,
  isRowEditMode, onRowEditModeChange,
  blockImpossibleAssignments, onBlockImpossibleChange,
  blockOnCompliance, onBlockOnComplianceChange,
  simulationMode, onSimulationModeChange,
  scanningWeek, hasScanResults, onScanWeek, onClearScan,
  complianceRuleCodes, isRuleBlocking, onRuleBlockingChange,
  complianceRuleLabels,
  isDragging,
}: PlanningCommandBarProps) {
  const [showCreateMenu, setShowCreateMenu] = useState(false)
  const [showExpertMenu, setShowExpertMenu] = useState(false)
  const [showRulesPanel, setShowRulesPanel] = useState(false)
  const [showLegend,    setShowLegend]    = useState(false)

  const createMenuRef = useRef<HTMLDivElement>(null)
  const expertMenuRef = useRef<HTMLDivElement>(null)
  const legendRef     = useRef<HTMLDivElement>(null)

  // Fermer les menus au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false)
      }
      if (expertMenuRef.current && !expertMenuRef.current.contains(e.target as Node)) {
        setShowExpertMenu(false)
        setShowRulesPanel(false)
      }
      if (legendRef.current && !legendRef.current.contains(e.target as Node)) {
        setShowLegend(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const LEGEND_TYPES: { label: string; color: string }[] = [
    { label: 'Complet',       color: '#1e3a8a' },
    { label: 'Groupage',      color: '#c2410c' },
    { label: 'Express',       color: '#be185d' },
    { label: 'Partiel',       color: '#6d28d9' },
    { label: 'Messagerie',    color: '#0284c7' },
    { label: 'Frigorifique',  color: '#0f766e' },
    { label: 'Vrac',          color: '#3f6212' },
    { label: 'Conventionnel', color: '#374151' },
  ]

  const LEGEND_STATUS: { label: string; color: string }[] = [
    { label: "À l'heure / planifié", color: '#4ade80' },
    { label: "Terminé / facturé",    color: '#22c55e' },
    { label: "En retard",            color: '#f97316' },
    { label: "Annulé",               color: '#ef4444' },
    { label: "En attente",           color: '#94a3b8' },
  ]

  // ─── Navigation helpers ─────────────────────────────────────────────────────
  function goBack() {
    if (viewMode === 'semaine') onWeekChange(addDays(weekStart, -7))
    else if (viewMode === 'mois') onMonthChange(addMonths(monthStart, -1))
    else {
      const d = parseDay(selectedDay)
      d.setDate(d.getDate() - 1)
      onDayChange(toISO(d))
    }
  }

  function goForward() {
    if (viewMode === 'semaine') onWeekChange(addDays(weekStart, 7))
    else if (viewMode === 'mois') onMonthChange(addMonths(monthStart, 1))
    else {
      const d = parseDay(selectedDay)
      d.setDate(d.getDate() + 1)
      onDayChange(toISO(d))
    }
  }

  function goToday() {
    const todayDate = new Date()
    onWeekChange(getMonday(todayDate))
    onDayChange(toISO(todayDate))
    onMonthChange(getMonthStart(todayDate))
  }

  function getPeriodLabel() {
    if (viewMode === 'semaine') return fmtWeek(weekStart)
    if (viewMode === 'mois') {
      const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
      return `${MONTHS[monthStart.getMonth()]} ${monthStart.getFullYear()}`
    }
    // Vue jour
    const d = parseDay(selectedDay)
    const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
    const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
    return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-line bg-surface flex-shrink-0 flex-wrap">

      {/* ── ZONE GAUCHE : navigation + vue ────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Boutons navigation */}
        <button
          type="button"
          onClick={goBack}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-discreet hover:text-foreground hover:bg-surface-2 transition-colors text-base font-light"
          title="Période précédente"
        >
          ‹
        </button>

        <div className="min-w-[148px] text-center">
          <span className="text-xs font-semibold text-foreground tabular-nums select-none">
            {getPeriodLabel()}
          </span>
        </div>

        <button
          type="button"
          onClick={goForward}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-discreet hover:text-foreground hover:bg-surface-2 transition-colors text-base font-light"
          title="Période suivante"
        >
          ›
        </button>

        <button
          type="button"
          onClick={goToday}
          className="px-2.5 h-7 text-[11px] font-medium text-discreet hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors flex-shrink-0"
        >
          Aujourd'hui
        </button>

        {/* Séparateur */}
        <span className="h-4 w-px bg-line/80 mx-0.5" aria-hidden="true" />

        {/* Bascule vue 7j / Jour / Mois */}
        <div className="flex rounded-lg border border-line overflow-hidden flex-shrink-0">
          {(['semaine', 'jour', 'mois'] as ViewMode[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => {
                if (v === 'mois') onMonthChange(getMonthStart(weekStart))
                onViewModeChange(v)
              }}
              className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                viewMode === v
                  ? 'bg-indigo-600 text-white'
                  : 'text-discreet hover:text-foreground hover:bg-surface-2'
              }`}
            >
              {v === 'semaine' ? '7j' : v === 'jour' ? 'Jour' : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {/* ── ZONE CENTRE : scope ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-1 justify-center min-w-0">
        <div className="flex rounded-lg border border-line overflow-hidden flex-shrink-0">
          <button
            type="button"
            onClick={() => onScopeChange('principal')}
            className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
              planningScope === 'principal'
                ? 'bg-indigo-600 text-white'
                : 'text-discreet hover:text-foreground hover:bg-surface-2'
            }`}
          >
            Principal
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('affretement')}
            className={`px-3 py-1 text-[11px] font-semibold transition-colors ${
              planningScope === 'affretement'
                ? 'bg-blue-600 text-white'
                : 'text-discreet hover:text-foreground hover:bg-surface-2'
            }`}
          >
            Affrètement
          </button>
        </div>

        {simulationMode && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 animate-pulse flex-shrink-0">
            SIMULATION
          </span>
        )}
      </div>

      {/* ── ZONE DROITE : actions + expert ─────────────────────────────────── */}
      <div className="flex items-center gap-1.5 flex-shrink-0">

        {/* Réorganiser lignes (état visible en dehors du menu expert) */}
        {isRowEditMode && (
          <button
            type="button"
            onClick={() => onRowEditModeChange(false)}
            className="flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11px] font-medium bg-amber-500/20 border border-amber-500/40 text-amber-300 transition-colors"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Verrouiller
          </button>
        )}

        {/* 🎨 Légende ▼ */}
        <div className="relative" ref={legendRef}>
          <button
            type="button"
            onClick={() => { setShowLegend(v => !v); setShowCreateMenu(false); setShowExpertMenu(false) }}
            title="Légende des couleurs"
            className={`flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11px] font-medium border transition-colors ${
              showLegend
                ? 'bg-surface-2 border-line-strong text-foreground'
                : 'border-line text-discreet hover:text-foreground hover:border-line-strong hover:bg-surface-2'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" opacity=".15"/>
              <circle cx="8"  cy="9"  r="1.5" fill="currentColor"/>
              <circle cx="16" cy="9"  r="1.5" fill="currentColor"/>
              <circle cx="12" cy="15" r="1.5" fill="currentColor"/>
            </svg>
            Légende
            <svg className="w-2.5 h-2.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {showLegend && (
            <div className={`absolute right-0 top-9 z-[82] w-60 rounded-xl border border-line bg-surface shadow-2xl py-2 ${
              isDragging ? 'pointer-events-none' : ''
            }`}>
              {/* Types de transport — fond */}
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-discreet">Type de transport — fond</p>
              <div className="px-3 space-y-1 pb-2">
                {LEGEND_TYPES.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-[12px] text-secondary">{label}</span>
                  </div>
                ))}
              </div>
              <div className="h-px bg-line mx-3 my-1" />
              {/* Statut / timing — bordure */}
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-discreet">Statut / timing — bordure</p>
              <div className="px-3 space-y-1 pb-1">
                {LEGEND_STATUS.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded flex-shrink-0 bg-surface-2"
                      style={{ border: `3px solid ${color}` }}
                    />
                    <span className="text-[12px] text-secondary">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* + Créer ▼ */}
        <div className="relative" ref={createMenuRef}>
          <button
            type="button"
            onClick={() => { setShowCreateMenu(v => !v); setShowExpertMenu(false) }}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-semibold transition-colors border border-emerald-600/50 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
          >
            <span className="text-sm leading-none font-bold">+</span>
            Créer
            <svg className="w-2.5 h-2.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {showCreateMenu && (
            <div className={`absolute right-0 top-9 z-[82] w-52 rounded-xl border border-line bg-surface shadow-2xl py-1 ${isDragging ? 'pointer-events-none' : ''}`}>
              <button
                type="button"
                onClick={() => { onCreateCourse(); setShowCreateMenu(false) }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[12px] text-foreground hover:bg-surface-2 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-sm">+</span>
                Nouvelle course
              </button>
              <button
                type="button"
                onClick={() => { onCreateHlp(); setShowCreateMenu(false) }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[12px] text-secondary hover:bg-surface-2 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-surface-2 border border-line flex items-center justify-center text-secondary font-bold text-sm">+</span>
                Bloc HLP
              </button>
              <div className="h-px bg-slate-800 my-1" />
              <button
                type="button"
                onClick={() => { onNavigateOT(); setShowCreateMenu(false) }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[12px] text-discreet hover:bg-surface-2 transition-colors"
              >
                <span className="w-5 h-5 rounded bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300 text-xs">↗</span>
                OT / Fret complet
              </button>
            </div>
          )}
        </div>

        {/* ⚙ Expert ▼ */}
        <div className="relative" ref={expertMenuRef}>
          <button
            type="button"
            onClick={() => { setShowExpertMenu(v => !v); setShowCreateMenu(false) }}
            title="Paramètres experts : CE561, affrètement, PDF…"
            className={`flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11px] font-medium border transition-colors ${
              showExpertMenu
                ? 'bg-surface-2 border-line-strong text-foreground'
                : 'border-line text-discreet hover:text-foreground hover:border-line-strong hover:bg-surface-2'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Expert
            <svg className="w-2.5 h-2.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {showExpertMenu && (
            <div className={`absolute right-0 top-9 z-[82] w-72 rounded-xl border border-line bg-surface shadow-2xl py-2 ${isDragging ? 'pointer-events-none' : ''}`}>

              {/* Section CONFORMITÉ */}
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-discreet">Conformité</p>

              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] text-secondary">CE561 mode</span>
                <button
                  type="button"
                  onClick={() => onBlockOnComplianceChange(!blockOnCompliance)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    blockOnCompliance
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-surface-2 border-line text-secondary hover:bg-surface-soft'
                  }`}
                >
                  {blockOnCompliance ? 'Bloquant' : 'Audit seul'}
                </button>
              </div>

              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] text-secondary">Affectations impossibles</span>
                <button
                  type="button"
                  onClick={() => onBlockImpossibleChange(!blockImpossibleAssignments)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    blockImpossibleAssignments
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                  }`}
                >
                  {blockImpossibleAssignments ? 'Bloqué' : 'Permis'}
                </button>
              </div>

              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] text-secondary">Scanner la semaine</span>
                <div className="flex items-center gap-1">
                  {hasScanResults && (
                    <button
                      type="button"
                      onClick={onClearScan}
                      className="h-7 w-7 flex items-center justify-center rounded-lg text-[11px] border border-line text-discreet hover:text-secondary transition-colors"
                      title="Effacer les résultats"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onScanWeek}
                    disabled={scanningWeek}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                      scanningWeek
                        ? 'border-slate-700 text-slate-400 cursor-wait'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-600 hover:bg-amber-500/25'
                    }`}
                  >
                    {scanningWeek ? 'Scan…' : 'Lancer'}
                  </button>
                </div>
              </div>

              {/* Règles CE561 — sous-panneau toggle */}
              <div className="px-3 py-1.5">
                <button
                  type="button"
                  onClick={() => setShowRulesPanel(v => !v)}
                  className="w-full flex items-center justify-between text-[12px] text-secondary hover:text-foreground transition-colors"
                >
                  <span>Règles CE561</span>
                  <svg className={`w-3 h-3 transition-transform ${showRulesPanel ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                </button>
                {showRulesPanel && (
                  <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5 pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
                    {complianceRuleCodes.map(code => (
                      <label key={code} className="flex items-start gap-2 rounded-lg border border-line bg-surface-2 px-2 py-1.5 cursor-pointer hover:bg-surface-soft">
                        <input
                          type="checkbox"
                          checked={isRuleBlocking(code)}
                          onChange={e => onRuleBlockingChange(code, e.target.checked)}
                          className="mt-0.5 accent-indigo-500"
                        />
                        <span className="text-[11px] text-foreground">
                          <span className="font-semibold">{complianceRuleLabels[code] ?? code}</span>
                          <span className="text-discreet"> ({code})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-line my-1.5 mx-3" />

              {/* Section AFFICHAGE */}
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-discreet">Affichage</p>

              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] text-secondary">Réorganiser les lignes</span>
                <button
                  type="button"
                  onClick={() => onRowEditModeChange(!isRowEditMode)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    isRowEditMode
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-surface-2 border-line text-secondary hover:bg-surface-soft'
                  }`}
                >
                  {isRowEditMode ? 'Actif' : 'Inactif'}
                </button>
              </div>

              <div className="px-3 py-1.5 flex items-center justify-between gap-2">
                <span className="text-[12px] text-secondary">Mode simulation</span>
                <button
                  type="button"
                  onClick={() => onSimulationModeChange(!simulationMode)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    simulationMode
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-surface-2 border-line text-secondary hover:bg-surface-soft'
                  }`}
                >
                  {simulationMode ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="h-px bg-line my-1.5 mx-3" />

              {/* Section EXPORT */}
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-discreet">Export</p>

              <button
                type="button"
                onClick={() => { onExportPDF(); setShowExpertMenu(false) }}
                className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-[12px] text-secondary hover:bg-surface-2 transition-colors"
              >
                <svg className="w-4 h-4 text-discreet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                Exporter PDF semaine
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
