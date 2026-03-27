import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { STATUT_OPS, StatutOpsDot, type StatutOps } from '@/lib/statut-ops'

// ── Types ─────────────────────────────────────────────────────────────────────

type OT = {
  id: string
  reference: string
  client_nom: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  type_transport: string
  nature_marchandise: string | null
  statut: string
  conducteur_id: string | null
  vehicule_id: string | null
  remorque_id: string | null
  prix_ht: number | null
  statut_operationnel: string | null
}

type Conducteur = { id: string; nom: string; prenom: string; statut: string }
type Vehicule   = { id: string; immatriculation: string; marque: string | null; modele: string | null; statut: string }
type Remorque   = { id: string; immatriculation: string; type_remorque: string; statut: string }

type AssignForm = {
  ot: OT
  conducteur_id: string
  vehicule_id: string
  remorque_id: string
  date_chargement: string
  date_livraison: string
}

type Tab = 'conducteurs' | 'camions' | 'remorques'

// ── Date helpers ──────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return date
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d)
  date.setDate(date.getDate() + n)
  return date
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function parseDay(s: string): Date {
  const d = new Date(s)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysDiff(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

const DAY_NAMES   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTH_NAMES = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc']

function fmtWeek(start: Date): string {
  const end = addDays(start, 6)
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
  }
  return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${end.getFullYear()}`
}

// ── Block position ────────────────────────────────────────────────────────────

function blockPos(ot: OT, weekStart: Date): React.CSSProperties | null {
  const weekEnd = addDays(weekStart, 6)
  const start = ot.date_chargement_prevue
    ? parseDay(ot.date_chargement_prevue)
    : ot.date_livraison_prevue ? parseDay(ot.date_livraison_prevue) : null
  const end = ot.date_livraison_prevue
    ? parseDay(ot.date_livraison_prevue)
    : start

  if (!start || !end) return null
  if (end < weekStart || start > weekEnd) return null

  const visStart = start < weekStart ? weekStart : start
  const visEnd   = end   > weekEnd   ? weekEnd   : end
  const left  = daysDiff(weekStart, visStart) / 7
  const width = (daysDiff(visStart, visEnd) + 1) / 7

  return {
    position: 'absolute',
    top: '6px',
    height: '40px',
    left:  `calc(${left  * 100}% + 2px)`,
    width: `calc(${width * 100}% - 4px)`,
  }
}

// ── Statut config ─────────────────────────────────────────────────────────────

const STATUT_CLS: Record<string, string> = {
  planifie: 'bg-indigo-600 border-indigo-500',
  en_cours: 'bg-emerald-600 border-emerald-500',
  livre:    'bg-teal-600 border-teal-500',
  facture:  'bg-violet-700 border-violet-600',
}

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon', confirme: 'Confirmé', planifie: 'Planifié',
  en_cours: 'En cours',  livre: 'Livré',        facture: 'Facturé', annule: 'Annulé',
}

const BADGE_CLS: Record<string, string> = {
  brouillon: 'bg-slate-700 text-slate-400',
  confirme:  'bg-blue-900/60 text-blue-300',
  planifie:  'bg-indigo-900/60 text-indigo-300',
  en_cours:  'bg-emerald-900/60 text-emerald-300',
  livre:     'bg-teal-900/60 text-teal-300',
  facture:   'bg-violet-900/60 text-violet-300',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Planning() {
  const [weekStart,    setWeekStart]    = useState(() => getMonday(new Date()))
  const [tab,          setTab]          = useState<Tab>('conducteurs')
  const [pool,         setPool]         = useState<OT[]>([])
  const [ganttOTs,     setGanttOTs]     = useState<OT[]>([])
  const [conducteurs,  setConducteurs]  = useState<Conducteur[]>([])
  const [vehicules,    setVehicules]    = useState<Vehicule[]>([])
  const [remorques,    setRemorques]    = useState<Remorque[]>([])
  const [assignModal,  setAssignModal]  = useState<AssignForm | null>(null)
  const [selected,     setSelected]     = useState<OT | null>(null)
  const [saving,       setSaving]       = useState(false)

  // drag & drop
  const [draggingOt, setDraggingOt] = useState<OT | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null) // resource id being hovered

  const today = toISO(new Date())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [otR, cR, vR, rR] = await Promise.all([
      supabase
        .from('ordres_transport')
        .select('id, reference, statut, statut_operationnel, conducteur_id, vehicule_id, remorque_id, date_chargement_prevue, date_livraison_prevue, type_transport, nature_marchandise, prix_ht, clients(nom)')
        .neq('statut', 'annule')
        .order('date_chargement_prevue', { ascending: true, nullsFirst: false }),
      supabase.from('conducteurs').select('id, nom, prenom, statut').eq('statut', 'actif').order('nom'),
      supabase.from('vehicules').select('id, immatriculation, marque, modele, statut').neq('statut', 'hors_service').order('immatriculation'),
      supabase.from('remorques').select('id, immatriculation, type_remorque, statut').neq('statut', 'hors_service').order('immatriculation'),
    ])

    if (otR.data) {
      const ots: OT[] = (otR.data as any[]).map(r => ({
        id:                    r.id,
        reference:             r.reference,
        client_nom:            (r.clients as any)?.nom ?? '—',
        date_chargement_prevue: r.date_chargement_prevue,
        date_livraison_prevue:  r.date_livraison_prevue,
        type_transport:        r.type_transport,
        nature_marchandise:    r.nature_marchandise,
        statut:                r.statut,
        conducteur_id:         r.conducteur_id,
        vehicule_id:           r.vehicule_id,
        remorque_id:           r.remorque_id,
        prix_ht:               r.prix_ht,
        statut_operationnel:   r.statut_operationnel,
      }))
      setPool(ots.filter(o => o.statut === 'brouillon' || o.statut === 'confirme'))
      setGanttOTs(ots.filter(o => !['brouillon', 'confirme'].includes(o.statut)))
    }
    if (cR.data) setConducteurs(cR.data)
    if (vR.data) setVehicules(vR.data)
    if (rR.data) setRemorques(rR.data)
  }

  function openAssign(ot: OT, resourceId?: string, dropDay?: string) {
    const prefilledConducteur = tab === 'conducteurs' ? (resourceId ?? ot.conducteur_id ?? '') : (ot.conducteur_id ?? '')
    const prefilledVehicule   = tab === 'camions'     ? (resourceId ?? ot.vehicule_id   ?? '') : (ot.vehicule_id   ?? '')
    const prefilledRemorque   = tab === 'remorques'   ? (resourceId ?? ot.remorque_id   ?? '') : (ot.remorque_id   ?? '')
    const baseDay = dropDay ?? ot.date_chargement_prevue ?? toISO(weekStart)
    const endDay  = ot.date_livraison_prevue ?? toISO(addDays(parseDay(baseDay), 1))
    setAssignModal({
      ot,
      conducteur_id:   prefilledConducteur,
      vehicule_id:     prefilledVehicule,
      remorque_id:     prefilledRemorque,
      date_chargement: baseDay,
      date_livraison:  endDay,
    })
    setSelected(null)
  }

  async function saveAssign() {
    if (!assignModal) return
    setSaving(true)
    await supabase.from('ordres_transport').update({
      statut:                 'planifie',
      conducteur_id:          assignModal.conducteur_id  || null,
      vehicule_id:            assignModal.vehicule_id    || null,
      remorque_id:            assignModal.remorque_id    || null,
      date_chargement_prevue: assignModal.date_chargement || null,
      date_livraison_prevue:  assignModal.date_livraison  || null,
    }).eq('id', assignModal.ot.id)
    setSaving(false)
    setAssignModal(null)
    loadAll()
  }

  async function unassign(ot: OT) {
    await supabase.from('ordres_transport').update({
      statut:        'confirme',
      conducteur_id: null,
      vehicule_id:   null,
      remorque_id:   null,
    }).eq('id', ot.id)
    setSelected(null)
    loadAll()
  }

  // ── Drag & drop handlers ───────────────────────────────────────────────────

  function handleDragStart(ot: OT) {
    setDraggingOt(ot)
  }

  function handleDragEnd() {
    setDraggingOt(null)
    setDropTarget(null)
  }

  function handleTimelineDrop(e: React.DragEvent, resourceId: string) {
    e.preventDefault()
    if (!draggingOt) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX  = e.clientX - rect.left
    const dayIdx = Math.max(0, Math.min(6, Math.floor(relX / rect.width * 7)))
    const dropDay = toISO(addDays(weekStart, dayIdx))
    setDropTarget(null)
    openAssign(draggingOt, resourceId, dropDay)
  }

  // ── Rows ───────────────────────────────────────────────────────────────────

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  type Row = { id: string; primary: string; secondary: string }
  const rows: Row[] = tab === 'conducteurs'
    ? conducteurs.map(c => ({ id: c.id, primary: `${c.prenom} ${c.nom}`, secondary: '' }))
    : tab === 'camions'
    ? vehicules.map(v => ({ id: v.id, primary: v.immatriculation, secondary: [v.marque, v.modele].filter(Boolean).join(' ') }))
    : remorques.map(r => ({ id: r.id, primary: r.immatriculation, secondary: r.type_remorque }))

  function rowOTs(resourceId: string): OT[] {
    if (tab === 'conducteurs') return ganttOTs.filter(o => o.conducteur_id === resourceId)
    if (tab === 'camions')     return ganttOTs.filter(o => o.vehicule_id    === resourceId)
    return ganttOTs.filter(o => o.remorque_id === resourceId)
  }

  const unresourced = ganttOTs.filter(ot =>
    tab === 'conducteurs' ? !ot.conducteur_id :
    tab === 'camions'     ? !ot.vehicule_id   : !ot.remorque_id
  ).filter(ot => blockPos(ot, weekStart) !== null)

  const canUnlock = (ot: OT) => ot.statut === 'planifie' || ot.statut === 'confirme'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex -m-8 overflow-hidden bg-slate-950" style={{ height: '100vh' }}>

      {/* ══ Pool panel ══════════════════════════════════════════════════════════ */}
      <div className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700 flex-shrink-0">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Pot en attente</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-white">{pool.length}</span>
            <span className="text-sm text-slate-500 mb-0.5">ordre{pool.length !== 1 ? 's' : ''}</span>
          </div>
          {draggingOt && (
            <p className="text-[10px] text-indigo-400 mt-2 animate-pulse">Déposer sur une ligne →</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
          {pool.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-xs text-slate-600">Tout est planifié</p>
            </div>
          ) : pool.map(ot => (
            <button
              key={ot.id}
              draggable
              onDragStart={() => handleDragStart(ot)}
              onDragEnd={handleDragEnd}
              onClick={() => openAssign(ot)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                draggingOt?.id === ot.id
                  ? 'border-indigo-500 bg-indigo-900/30 opacity-50'
                  : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                  <StatutOpsDot statut={ot.statut_operationnel} size="xs" />
                  {ot.reference}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${BADGE_CLS[ot.statut] ?? 'bg-slate-700 text-slate-400'}`}>
                  {STATUT_LABEL[ot.statut]}
                </span>
              </div>
              <p className="text-sm font-semibold text-white truncate leading-tight">{ot.client_nom}</p>
              <p className="text-[10px] text-slate-500 mt-1 font-mono">
                {ot.date_chargement_prevue?.slice(5).replace('-', '/') ?? '?'} → {ot.date_livraison_prevue?.slice(5).replace('-', '/') ?? '?'}
              </p>
              {ot.nature_marchandise && (
                <p className="text-[10px] text-slate-600 truncate mt-0.5">{ot.nature_marchandise}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══ Gantt area ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700 bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold text-white">Planning</h1>
            <span className="text-sm text-slate-400">{fmtWeek(weekStart)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekStart(w => addDays(w, -7))}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xl font-light">‹</button>
            <button onClick={() => setWeekStart(getMonday(new Date()))}
              className="px-3 h-8 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              Aujourd'hui
            </button>
            <button onClick={() => setWeekStart(w => addDays(w, 7))}
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xl font-light">›</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-900 px-5 flex-shrink-0">
          {([
            { key: 'conducteurs' as Tab, icon: '👤', label: 'Conducteurs', count: conducteurs.length },
            { key: 'camions'     as Tab, icon: '🚛', label: 'Camions',     count: vehicules.length  },
            { key: 'remorques'   as Tab, icon: '🔧', label: 'Remorques',   count: remorques.length  },
          ]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? 'border-white text-white' : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'
              }`}>
              <span>{t.icon}</span>
              {t.label}
              <span className="text-[10px] opacity-50 font-normal">{t.count}</span>
            </button>
          ))}

          {/* Legend */}
          <div className="ml-auto flex items-center gap-3 text-[10px] text-slate-600 pb-1">
            {Object.entries(STATUT_CLS).map(([k, cls]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={`w-2.5 h-2.5 rounded-sm ${cls.split(' ')[0]}`} />
                {STATUT_LABEL[k]}
              </span>
            ))}
          </div>
        </div>

        {/* Gantt scroll area */}
        <div className="flex-1 overflow-auto">

          {/* Day headers — sticky */}
          <div className="flex sticky top-0 z-10 bg-slate-900 border-b border-slate-700">
            <div className="w-44 flex-shrink-0 border-r border-slate-700 bg-slate-900" />
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((day, i) => {
                const isToday = toISO(day) === today
                const isWE    = i >= 5
                return (
                  <div key={i} className={`py-2 text-center border-r border-slate-700/50 last:border-r-0 ${isWE ? 'bg-slate-800/40' : ''}`}>
                    <p className={`text-[10px] font-medium ${isToday ? 'text-blue-400' : isWE ? 'text-slate-600' : 'text-slate-500'}`}>
                      {DAY_NAMES[i]}
                    </p>
                    <p className={`text-base font-bold leading-tight ${isToday ? 'text-blue-400' : isWE ? 'text-slate-600' : 'text-slate-300'}`}>
                      {day.getDate()}
                    </p>
                    {isToday && <div className="w-1 h-1 bg-blue-400 rounded-full mx-auto mt-0.5" />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resource rows */}
          {rows.length === 0 ? (
            <div className="p-16 text-center text-slate-600 text-sm">Aucune ressource disponible</div>
          ) : rows.map(row => {
            const ots = rowOTs(row.id)
            const isDropTarget = dropTarget === row.id
            return (
              <div
                key={row.id}
                className={`flex border-b border-slate-800/50 transition-colors group ${isDropTarget ? 'bg-indigo-950/40' : 'hover:bg-white/[0.01]'}`}
              >
                {/* Label */}
                <div className="w-44 flex-shrink-0 border-r border-slate-700/40 px-3 py-3 flex flex-col justify-center bg-slate-900 group-hover:bg-slate-800/30 transition-colors">
                  <p className="text-sm font-medium text-slate-300 truncate">{row.primary}</p>
                  {row.secondary && <p className="text-[11px] text-slate-600 truncate">{row.secondary}</p>}
                </div>

                {/* Timeline — drop zone */}
                <div
                  className="flex-1 relative"
                  style={{ height: 52 }}
                  onDragOver={e => { e.preventDefault(); setDropTarget(row.id) }}
                  onDragLeave={() => setDropTarget(null)}
                  onDrop={e => handleTimelineDrop(e, row.id)}
                >
                  {/* Day grid */}
                  <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                    {weekDays.map((day, i) => (
                      <div key={i} className={`border-r border-slate-800/40 last:border-r-0 ${i >= 5 ? 'bg-slate-800/15' : ''} ${toISO(day) === today ? 'bg-blue-950/20' : ''}`} />
                    ))}
                  </div>

                  {/* Drop indicator */}
                  {isDropTarget && draggingOt && (
                    <div className="absolute inset-0 border-2 border-dashed border-indigo-500/50 rounded pointer-events-none z-10" />
                  )}

                  {/* OT blocks */}
                  {ots.map(ot => {
                    const pos = blockPos(ot, weekStart)
                    if (!pos) return null
                    const cls = STATUT_CLS[ot.statut] ?? 'bg-slate-600 border-slate-500'
                    return (
                      <div
                        key={ot.id}
                        style={pos}
                        className={`${cls} border rounded-md text-white text-[11px] font-medium flex items-center px-2 gap-1.5 cursor-pointer hover:brightness-110 transition-all overflow-hidden shadow-sm group/block`}
                        onClick={() => setSelected(ot)}
                      >
                        <StatutOpsDot statut={ot.statut_operationnel} size="xs" />
                        <span className="font-mono truncate flex-1">{ot.reference}</span>
                        <span className="text-white/60 truncate hidden xl:block">· {ot.client_nom}</span>
                        {canUnlock(ot) && (
                          <button
                            title="Retirer du planning"
                            className="opacity-0 group-hover/block:opacity-100 transition-opacity ml-auto flex-shrink-0 w-4 h-4 flex items-center justify-center rounded hover:bg-white/20 text-white/70 hover:text-white text-xs leading-none"
                            onClick={e => { e.stopPropagation(); unassign(ot) }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Non-affecté row */}
          {unresourced.length > 0 && (
            <div className="flex border-b border-slate-800/30 border-dashed opacity-60 hover:opacity-100 transition-opacity">
              <div className="w-44 flex-shrink-0 border-r border-slate-700/30 px-3 py-3 flex items-center bg-slate-900">
                <p className="text-[11px] text-slate-600 italic">Non affecté</p>
              </div>
              <div className="flex-1 relative" style={{ height: 52 }}>
                <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                  {weekDays.map((_, i) => <div key={i} className="border-r border-slate-800/30 last:border-r-0" />)}
                </div>
                {unresourced.map(ot => {
                  const pos = blockPos(ot, weekStart)
                  if (!pos) return null
                  return (
                    <div key={ot.id} style={pos}
                      className="border border-slate-600/40 bg-slate-700/30 rounded-md text-[11px] text-slate-500 flex items-center px-2 cursor-pointer hover:bg-slate-700/50 transition-colors overflow-hidden"
                      onClick={() => openAssign(ot)}>
                      <span className="font-mono truncate">{ot.reference}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>{/* end gantt scroll */}
      </div>{/* end gantt area */}

      {/* ══ Assign modal ════════════════════════════════════════════════════════ */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setAssignModal(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white">Placer sur le planning</h3>
              <p className="text-slate-400 text-sm mt-0.5 flex items-center gap-2">
                <span className="font-mono">{assignModal.ot.reference}</span>
                <span className="text-slate-600">·</span>
                <span>{assignModal.ot.client_nom}</span>
                {assignModal.ot.prix_ht && (
                  <span className="ml-auto text-slate-500">{assignModal.ot.prix_ht.toFixed(0)} € HT</span>
                )}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-400">Date chargement</span>
                  <input type="date" value={assignModal.date_chargement}
                    onChange={e => setAssignModal(m => m && { ...m, date_chargement: e.target.value })}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-400">Date livraison</span>
                  <input type="date" value={assignModal.date_livraison}
                    onChange={e => setAssignModal(m => m && { ...m, date_livraison: e.target.value })}
                    className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors" />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-slate-400">Conducteur</span>
                <select value={assignModal.conducteur_id}
                  onChange={e => setAssignModal(m => m && { ...m, conducteur_id: e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors">
                  <option value="">— Non affecté —</option>
                  {conducteurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-400">Camion</span>
                <select value={assignModal.vehicule_id}
                  onChange={e => setAssignModal(m => m && { ...m, vehicule_id: e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors">
                  <option value="">— Non affecté —</option>
                  {vehicules.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.immatriculation}{v.marque ? ` · ${v.marque}` : ''}{v.modele ? ` ${v.modele}` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-400">
                  Remorque <span className="text-slate-600 font-normal">(optionnel)</span>
                </span>
                <select value={assignModal.remorque_id}
                  onChange={e => setAssignModal(m => m && { ...m, remorque_id: e.target.value })}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-slate-500 transition-colors">
                  <option value="">— Sans remorque —</option>
                  {remorques.map(r => <option key={r.id} value={r.id}>{r.immatriculation} · {r.type_remorque}</option>)}
                </select>
              </label>
            </div>
            <div className="p-6 pt-2 flex gap-3 justify-end">
              <button onClick={() => setAssignModal(null)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                Annuler
              </button>
              <button onClick={saveAssign} disabled={saving}
                className="px-5 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-slate-100 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : '📅 Placer sur le planning'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Block detail ════════════════════════════════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-sm shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-mono text-xs text-slate-500 mb-0.5">{selected.reference}</p>
                <p className="text-white font-bold text-lg leading-tight">{selected.client_nom}</p>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${BADGE_CLS[selected.statut] ?? 'bg-slate-700 text-slate-300'}`}>
                {STATUT_LABEL[selected.statut] ?? selected.statut}
              </span>
            </div>
            <div className="space-y-1.5 text-sm text-slate-400 mb-4 bg-slate-800/50 rounded-lg p-3">
              <p>📅 {selected.date_chargement_prevue?.slice(0, 10) ?? '—'} → {selected.date_livraison_prevue?.slice(0, 10) ?? '—'}</p>
              {selected.nature_marchandise && <p>📦 {selected.nature_marchandise}</p>}
              {selected.prix_ht && <p>💶 {selected.prix_ht.toFixed(2)} € HT</p>}
              <p className="text-slate-600 text-xs">{selected.type_transport}</p>
            </div>
            {/* Statut opérationnel */}
            <div className="mb-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Statut opérationnel</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(STATUT_OPS) as [StatutOps, typeof STATUT_OPS[StatutOps]][]).map(([k, cfg]) => (
                  <button
                    key={k}
                    onClick={async () => {
                      const newVal = selected.statut_operationnel === k ? null : k
                      await supabase.from('ordres_transport').update({ statut_operationnel: newVal }).eq('id', selected.id)
                      setSelected(s => s ? { ...s, statut_operationnel: newVal } : s)
                      setGanttOTs(list => list.map(o => o.id === selected.id ? { ...o, statut_operationnel: newVal } : o))
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                      selected.statut_operationnel === k
                        ? `${cfg.dot} text-white border-transparent`
                        : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {canUnlock(selected) && (
                <button onClick={() => unassign(selected)}
                  className="flex-1 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg border border-red-900/30 transition-colors">
                  Retirer du planning
                </button>
              )}
              <button onClick={() => openAssign(selected)}
                className="flex-1 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                Réaffecter
              </button>
              <button onClick={() => setSelected(null)}
                className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
