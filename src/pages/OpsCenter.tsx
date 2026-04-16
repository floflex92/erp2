import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { useAuth } from '@/lib/auth'
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange'
import {
  ST_ACTIFS,
  ST_EN_COURS,
  ST_PLANIFIE,
  TRANSPORT_STATUS_LABELS,
  type TransportStatus,
  setCourseTransportStatus,
} from '@/lib/transportCourses'
import { useAlertesTransport } from '@/hooks/useAlertesTransport'
import { LABELS_TYPE, type AlerteItem, type SeveriteAlerte, type CategorieAlerte } from '@/lib/alertesTransport'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Types ─────────────────────────────────────────────────────────────────────

type MissionActive = {
  id: string
  reference: string
  statut_transport: string | null
  statut_operationnel: string | null
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  type_transport: string | null
  nature_marchandise: string | null
  notes_internes: string | null
  client_id: string | null
  conducteur_id: string | null
  vehicule_id: string | null
  client_nom: string | null
  conducteur_nom: string | null
  conducteur_email: string | null
  vehicule_immat: string | null
}

type EtapeMission = {
  id: string
  ot_id: string
  ordre: number
  type_etape: string | null
  ville: string | null
  adresse_libre: string | null
  statut_etape: string | null
  date_prevue: string | null
  date_reelle: string | null
}

type StatutHistorique = {
  id: string
  ot_id: string
  statut_nouveau: string | null
  commentaire: string | null
  created_at: string
}

type Imprevu = {
  id: string
  ot_id: string | null
  vehicule_id: string | null
  conducteur_id: string | null
  type: string
  titre: string
  description: string | null
  priorite: 'critique' | 'elevee' | 'normale'
  statut: 'ouvert' | 'en_cours' | 'resolu' | 'clos'
  action_prise: string | null
  notif_client_envoyee: boolean
  created_at: string
  updated_at: string
  ot_reference?: string | null
  vehicule_immat?: string | null
  conducteur_nom?: string | null
}

type OTRetard = {
  id: string
  reference: string
  statut_operationnel: string
  date_livraison_prevue: string | null
  client_nom: string | null
  conducteur_nom: string | null
  vehicule_immat: string | null
  nature_marchandise: string | null
}

type OTNonAffecte = {
  id: string
  reference: string
  statut_transport: string
  date_chargement_prevue: string | null
  date_livraison_prevue: string | null
  type_transport: string
  nature_marchandise: string | null
  poids_kg: number | null
  client_nom: string | null
  age_heures: number | null
}

type OTLite = { id: string; reference: string; client_id: string | null }
type VehiculeLite = { id: string; immatriculation: string }
type ConducteurLite = { id: string; nom: string; prenom: string }

type CreateForm = {
  ot_id: string
  vehicule_id: string
  conducteur_id: string
  type: string
  titre: string
  description: string
  priorite: string
}

const EMPTY_FORM: CreateForm = {
  ot_id: '', vehicule_id: '', conducteur_id: '',
  type: 'panne_vehicule', titre: '', description: '', priorite: 'normale',
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TRANSPORT_STATUS_COLORS: Record<string, string> = {
  en_attente_validation: 'bg-slate-100 text-slate-700',
  valide: 'bg-blue-100 text-blue-700',
  en_attente_planification: 'bg-indigo-100 text-indigo-700',
  planifie: 'bg-cyan-100 text-cyan-700',
  en_cours_approche_chargement: 'bg-amber-100 text-amber-700',
  en_chargement: 'bg-orange-100 text-orange-700',
  en_transit: 'bg-purple-100 text-purple-700',
  en_livraison: 'bg-fuchsia-100 text-fuchsia-700',
  termine: 'bg-emerald-100 text-emerald-700',
  annule: 'bg-red-100 text-red-700',
}

const STATUT_OPS_LABELS: Record<string, { label: string; cls: string }> = {
  a_l_heure:       { label: "À l'heure",      cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  retard_mineur:   { label: 'Retard < 2h',     cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  retard_majeur:   { label: 'Retard > 2h',     cls: 'bg-red-100 text-red-700 border-red-200' },
  en_attente:      { label: 'En attente',       cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  prise_en_charge: { label: 'Prise en charge', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  termine:         { label: 'Terminé',          cls: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const STATUT_OPS_CONFIG: Record<string, { label: string; cls: string }> = {
  retard_mineur: { label: 'Retard mineur', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  retard_majeur: { label: 'Retard majeur', cls: 'bg-red-100 text-red-700 border-red-300' },
}

const PRIORITE_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  critique: { label: 'Critique', dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700 border-red-200' },
  elevee:   { label: 'Élevée',   dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
  normale:  { label: 'Normale',  dot: 'bg-slate-400',  badge: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const STATUT_IMP_CONFIG: Record<string, { label: string; cls: string }> = {
  ouvert:   { label: 'Ouvert',   cls: 'bg-red-100 text-red-700' },
  en_cours: { label: 'En cours', cls: 'bg-blue-100 text-blue-700' },
  resolu:   { label: 'Résolu',   cls: 'bg-slate-100 text-slate-700' },
  clos:     { label: 'Clos',     cls: 'bg-slate-100 text-slate-600' },
}

const TYPES_LABELS: Record<string, string> = {
  panne_vehicule:     'Panne véhicule',
  retard_chargement:  'Retard chargement',
  retard_livraison:   'Retard livraison',
  refus_chargement:   'Refus de chargement',
  accident:           'Accident',
  absence_conducteur: 'Absence conducteur',
  autre:              'Autre',
}

const ACTIONS_PAR_STATUT: Partial<Record<TransportStatus, TransportStatus[]>> = {
  valide: ['planifie', 'annule'],
  en_attente_planification: ['planifie', 'annule'],
  planifie: ['en_cours_approche_chargement', 'annule'],
  en_cours_approche_chargement: ['en_chargement', 'planifie'],
  en_chargement: ['en_transit'],
  en_transit: ['en_livraison'],
  en_livraison: ['termine'],
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtHeure(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtAge(h: number | null | undefined): string {
  if (h === null || h === undefined) return ''
  if (h < 1) return '< 1h'
  if (h < 24) return `${Math.floor(h)}h`
  return `${Math.floor(h / 24)}j`
}

function isRetard(d: string | null | undefined): boolean {
  if (!d) return false
  return new Date(d) < new Date()
}

function prioriteMission(m: MissionActive): number {
  const enCours = ST_EN_COURS.includes(m.statut_transport as TransportStatus)
  const retard  = isRetard(m.date_livraison_prevue) && enCours
  if (m.statut_operationnel === 'retard_majeur' || retard) return 0
  if (m.statut_operationnel === 'retard_mineur') return 1
  if (enCours) return 2
  return 3
}

// ─── Sous-composants missions ──────────────────────────────────────────────────

function StatusBadge({ st }: { st: string | null }) {
  if (!st) return null
  const label = TRANSPORT_STATUS_LABELS[st as TransportStatus] ?? st.replace(/_/g, ' ')
  const cls   = TRANSPORT_STATUS_COLORS[st] ?? 'bg-slate-100 text-slate-600'
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}>{label}</span>
}

function StatutOpsBadge({ st }: { st: string | null }) {
  if (!st || !(st in STATUT_OPS_LABELS)) return null
  const cfg = STATUT_OPS_LABELS[st]
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>{cfg.label}</span>
}

function InfoCell({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-xs font-medium ${alert ? 'text-red-600' : 'text-slate-700'}`}>{value}</p>
    </div>
  )
}

function KpiCard({ label, value, tone }: { label: string; value: number; tone: 'blue' | 'green' | 'amber' | 'red' | 'slate' }) {
  const colors: Record<string, string> = {
    blue:  'text-slate-800 bg-white border-slate-200',
    green: 'text-slate-800 bg-slate-50 border-slate-200',
    amber: 'text-slate-800 bg-slate-50 border-slate-200',
    red:   'text-red-700 bg-red-50 border-red-100',
    slate: 'text-slate-700 bg-slate-50 border-slate-200',
  }
  return (
    <div className={`rounded-xl border px-4 py-3 ${colors[tone]}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs opacity-75">{label}</p>
    </div>
  )
}

// ─── Sous-composants imprévus ──────────────────────────────────────────────────

function ImprevuCard({ imp, onUpdate }: { imp: Imprevu; onUpdate: (id: string, patch: Partial<Imprevu>) => void }) {
  const [expanded, setExpanded]     = useState(false)
  const [actionText, setActionText] = useState(imp.action_prise ?? '')
  const [saving, setSaving]         = useState(false)

  const pc = PRIORITE_CONFIG[imp.priorite] ?? PRIORITE_CONFIG.normale
  const sc = STATUT_IMP_CONFIG[imp.statut]  ?? STATUT_IMP_CONFIG.ouvert

  const nextStatut = (cur: string): 'ouvert' | 'en_cours' | 'resolu' | 'clos' => {
    const flow = ['ouvert', 'en_cours', 'resolu', 'clos'] as const
    const idx  = flow.indexOf(cur as never)
    return flow[Math.min(idx + 1, flow.length - 1)]
  }

  async function handleStatutForward() {
    const ns = nextStatut(imp.statut)
    await onUpdate(imp.id, {
      statut: ns,
      action_prise: actionText || (imp.action_prise ?? undefined),
      ...(ns === 'resolu' ? { resolved_at: new Date().toISOString() } : {}),
    } as Partial<Imprevu>)
  }

  async function saveAction() {
    setSaving(true)
    await onUpdate(imp.id, {
      action_prise: actionText,
      statut: imp.statut === 'ouvert' ? 'en_cours' : imp.statut,
    })
    setSaving(false)
  }

  return (
    <div className={`rounded-xl border ${imp.statut === 'clos' ? 'opacity-50' : ''} bg-white shadow-sm`}>
      <div className="flex cursor-pointer items-start gap-3 px-4 py-3" onClick={() => setExpanded(e => !e)}>
        <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${pc.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-800">{imp.titre}</span>
            {imp.ot_reference && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{imp.ot_reference}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{TYPES_LABELS[imp.type] ?? imp.type}</span>
            {imp.vehicule_immat && <span>· {imp.vehicule_immat}</span>}
            {imp.conducteur_nom && <span>· {imp.conducteur_nom}</span>}
            <span>· {new Date(imp.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${pc.badge}`}>{pc.label}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.cls}`}>{sc.label}</span>
          <svg className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m6 9 6 6 6-6" /></svg>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t px-4 pb-4 pt-3">
          {imp.description && <p className="text-sm text-slate-600">{imp.description}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Action corrective</label>
            <textarea rows={2} value={actionText} onChange={e => setActionText(e.target.value)} placeholder="Décrivez l'action prise…" className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
          </div>
          <div className="flex gap-2">
            <button onClick={saveAction} disabled={saving} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50">
              {saving ? 'Enregistrement…' : "Sauvegarder l'action"}
            </button>
            {imp.statut !== 'clos' && (
              <button onClick={handleStatutForward} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                → {STATUT_IMP_CONFIG[nextStatut(imp.statut)].label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ label, count, color, children }: {
  label: string; count: number; color: 'red' | 'amber' | 'slate'; children: React.ReactNode
}) {
  const normalizedBadgeCls = color === 'red' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-slate-800">{label}</h2>
        {count > 0 && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${normalizedBadgeCls}`}>{count}</span>}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
      <svg className="h-4 w-4 flex-shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M20 6 9 17l-5-5" /></svg>
      {text}
    </div>
  )
}

// ─── Composants onglet Alertes auto ───────────────────────────────────────────

const ALERTE_SEV_CFG: Record<string, { dot: string; badge: string; border: string }> = {
  critique: { dot: 'bg-red-500',   badge: 'bg-red-100 text-red-700 border-red-200',     border: 'border-red-100' },
  warning:  { dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 border-amber-200', border: 'border-amber-100' },
  info:     { dot: 'bg-blue-400',  badge: 'bg-blue-100 text-blue-700 border-blue-200',   border: 'border-slate-200' },
}

function AlerteOpsCard({ alerte }: { alerte: AlerteItem }) {
  const sev = ALERTE_SEV_CFG[alerte.severite] ?? ALERTE_SEV_CFG.info
  return (
    <div className={`flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-sm ${sev.border}`}>
      <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${sev.dot}`} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-slate-800">{alerte.titre}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${sev.badge}`}>
            {LABELS_TYPE[alerte.type]}
          </span>
          {(alerte.jours_retard ?? 0) > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              J+{alerte.jours_retard}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{alerte.description}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0 text-[11px] text-slate-400">
          {alerte.client_nom     && <span>Client : <strong className="text-slate-600">{alerte.client_nom}</strong></span>}
          {alerte.conducteur_nom && <span>· <strong className="text-slate-600">{alerte.conducteur_nom}</strong></span>}
          {alerte.vehicule_immat && <span>· 🚛 <strong className="text-slate-600">{alerte.vehicule_immat}</strong></span>}
          {alerte.montant != null && (
            <span>· <strong className="text-slate-600">{alerte.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</strong></span>
          )}
        </div>
      </div>
      <Link
        to={alerte.entity_url}
        className="flex-shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        title="Voir"
      >
        Voir →
      </Link>
    </div>
  )
}

function AlerteFilterPill({
  count, label, color, active, onClick,
}: {
  count: number; label: string; color: 'red' | 'amber' | 'blue' | 'slate'; active: boolean; onClick: () => void
}) {
  const act: Record<string, string> = { red: 'bg-red-600 text-white border-red-600', amber: 'bg-amber-500 text-white border-amber-500', blue: 'bg-blue-600 text-white border-blue-600', slate: 'bg-slate-700 text-white border-slate-700' }
  const idle: Record<string, string> = { red: 'bg-red-50 text-red-700 border-red-200', amber: 'bg-amber-50 text-amber-700 border-amber-200', blue: 'bg-blue-50 text-blue-700 border-blue-200', slate: 'bg-slate-50 text-slate-700 border-slate-200' }
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${active ? act[color] : idle[color]}`}>
      <span className="text-sm font-bold">{count}</span>
      {label}
    </button>
  )
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function OpsCenter() {
  const { companyId } = useAuth()

  // ── état missions ──────────────────────────────────────────────────────────
  const [missions, setMissions]           = useState<MissionActive[]>([])
  const [loading, setLoading]             = useState(true)
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [etapes, setEtapes]               = useState<EtapeMission[]>([])
  const [historique, setHistorique]       = useState<StatutHistorique[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [filterMode, setFilterMode]       = useState<'tous' | 'en_cours' | 'planifie' | 'retard'>('tous')

  // ── état imprévus ──────────────────────────────────────────────────────────
  const [imprevus, setImprevus]             = useState<Imprevu[]>([])
  const [otRetards, setOtRetards]           = useState<OTRetard[]>([])
  const [otNonAffectes, setOtNonAffectes]   = useState<OTNonAffecte[]>([])
  const [otList, setOtList]                 = useState<OTLite[]>([])
  const [vehicules, setVehicules]           = useState<VehiculeLite[]>([])
  const [conducteurs, setConducteurs]       = useState<ConducteurLite[]>([])
  const [showCreate, setShowCreate]         = useState(false)
  const [form, setForm]                     = useState<CreateForm>(EMPTY_FORM)
  const [creating, setCreating]             = useState(false)
  const [filterStatut, setFilterStatut]     = useState('actifs')
  const [warRoomLoading, setWarRoomLoading] = useState(true)

  // ── navigation ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'missions' | 'imprevu' | 'alertes'>('missions')
  useScrollToTopOnChange(activeTab)

  // ── alertes proactives ─────────────────────────────────────────────────────
  const alertesResult = useAlertesTransport()
  const [alerteFilterSev, setAlerteFilterSev] = useState<SeveriteAlerte | 'toutes'>('toutes')
  const [alerteFilterCat, setAlerteFilterCat] = useState<CategorieAlerte | 'toutes'>('toutes')

  const channelMissionsRef = useRef<RealtimeChannel | null>(null)
  const channelImprevusRef = useRef<RealtimeChannel | null>(null)

  // ─── Chargement missions ──────────────────────────────────────────────────

  const loadMissions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('ordres_transport')
        .select(`
          id, reference, statut_transport, statut_operationnel,
          date_chargement_prevue, date_livraison_prevue,
          type_transport, nature_marchandise, notes_internes,
          client_id, conducteur_id, vehicule_id,
          clients(nom),
          conducteurs(nom, prenom, email),
          vehicules(immatriculation)
        `)
        .in('statut_transport', ST_ACTIFS)
        .order('date_chargement_prevue', { ascending: true, nullsFirst: false })
        .limit(80)

      if (error) throw error

      const rows: MissionActive[] = (data ?? []).map((row: Record<string, unknown>) => {
        const cli  = Array.isArray(row.clients)     ? row.clients[0]     : row.clients as Record<string, string> | null
        const cond = Array.isArray(row.conducteurs) ? row.conducteurs[0] : row.conducteurs as Record<string, string> | null
        const veh  = Array.isArray(row.vehicules)   ? row.vehicules[0]   : row.vehicules as Record<string, string> | null
        return {
          id: row.id as string,
          reference: row.reference as string,
          statut_transport: row.statut_transport as string | null,
          statut_operationnel: row.statut_operationnel as string | null,
          date_chargement_prevue: row.date_chargement_prevue as string | null,
          date_livraison_prevue: row.date_livraison_prevue as string | null,
          type_transport: row.type_transport as string | null,
          nature_marchandise: row.nature_marchandise as string | null,
          notes_internes: row.notes_internes as string | null,
          client_id: row.client_id as string | null,
          conducteur_id: row.conducteur_id as string | null,
          vehicule_id: row.vehicule_id as string | null,
          client_nom: (cli?.nom as string) ?? null,
          conducteur_nom: cond ? `${(cond.prenom as string) ?? ''} ${(cond.nom as string) ?? ''}`.trim() : null,
          conducteur_email: (cond?.email as string) ?? null,
          vehicule_immat: (veh?.immatriculation as string) ?? null,
        }
      })

      rows.sort((a, b) => prioriteMission(a) - prioriteMission(b))
      setMissions(rows)
      setSelectedId(prev => prev && rows.some(r => r.id === prev) ? prev : rows[0]?.id ?? null)
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const [etapesRes, historiquesRes] = await Promise.all([
        supabase.from('etapes_mission').select('id, ot_id, ordre, type_etape, ville, adresse_libre, statut_etape, date_prevue, date_reelle').eq('ot_id', id).order('ordre', { ascending: true }),
        (supabase.from('ordres_transport_statut_history' as any).select('id, ot_id, statut_nouveau, commentaire, created_at').eq('ot_id', id).order('created_at', { ascending: false }).limit(10) as any),
      ])
      setEtapes((etapesRes.data ?? []) as unknown as EtapeMission[])
      setHistorique((historiquesRes.data ?? []) as StatutHistorique[])
    } catch {
      setEtapes([])
      setHistorique([])
    } finally {
      setDetailLoading(false)
    }
  }, [])

  // ─── Chargement imprévus ───────────────────────────────────────────────────

  const fetchImprevus = useCallback(async () => {
    const q = looseSupabase
      .from('imprevu_exploitation')
      .select('*, ordres_transport:ot_id (reference), vehicules:vehicule_id (immatriculation), conducteurs:conducteur_id (nom, prenom)')
      .order('created_at', { ascending: false })
      .limit(100)
    if (filterStatut === 'actifs')  q.in('statut', ['ouvert', 'en_cours'])
    if (filterStatut === 'resolus') q.in('statut', ['resolu', 'clos'])
    const { data } = await q
    if (!data) return
    setImprevus((data as Record<string, unknown>[]).map((r: Record<string, unknown>) => ({
      ...(r as unknown as Imprevu),
      ot_reference:   (r.ordres_transport as { reference?: string } | null)?.reference ?? null,
      vehicule_immat: (r.vehicules as { immatriculation?: string } | null)?.immatriculation ?? null,
      conducteur_nom: r.conducteurs
        ? `${(r.conducteurs as { prenom?: string }).prenom ?? ''} ${(r.conducteurs as { nom?: string }).nom ?? ''}`.trim()
        : null,
    })))
  }, [filterStatut])

  const fetchRetards = useCallback(async () => {
    const { data } = await looseSupabase.from('v_war_room_ot_retard').select('*')
    if (data) setOtRetards(data as OTRetard[])
  }, [])

  const fetchNonAffectes = useCallback(async () => {
    const { data } = await looseSupabase.from('v_war_room_ot_non_affectes').select('*')
    if (data) setOtNonAffectes(data as OTNonAffecte[])
  }, [])

  const fetchReferentiel = useCallback(async () => {
    const [{ data: ots }, { data: vehs }, { data: conds }] = await Promise.all([
      supabase.from('ordres_transport').select('id, reference, client_id').not('statut', 'in', '("annule","facture")').order('created_at', { ascending: false }).limit(200),
      supabase.from('vehicules').select('id, immatriculation').eq('statut', 'actif'),
      supabase.from('conducteurs').select('id, nom, prenom').eq('statut', 'actif'),
    ])
    if (ots)   setOtList(ots as OTLite[])
    if (vehs)  setVehicules(vehs as VehiculeLite[])
    if (conds) setConducteurs(conds as ConducteurLite[])
  }, [])

  // ─── Effets ───────────────────────────────────────────────────────────────

  useEffect(() => {
    void loadMissions()
    channelMissionsRef.current = supabase
      .channel('ops-center-ot')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ordres_transport' }, () => { void loadMissions(true) })
      .subscribe()
    return () => { void channelMissionsRef.current?.unsubscribe() }
  }, [loadMissions])

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
  }, [selectedId, loadDetail])

  useEffect(() => {
    async function initWarRoom() {
      setWarRoomLoading(true)
      await Promise.all([fetchImprevus(), fetchRetards(), fetchNonAffectes(), fetchReferentiel()])
      setWarRoomLoading(false)
    }
    void initWarRoom()
  }, [fetchImprevus, fetchRetards, fetchNonAffectes, fetchReferentiel])

  useEffect(() => { void fetchImprevus() }, [fetchImprevus])

  useEffect(() => {
    channelImprevusRef.current = supabase
      .channel('ops-center-imprevu')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'imprevu_exploitation' }, () => { void fetchImprevus() })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'ordres_transport',
        filter: 'statut_operationnel=in.(retard_mineur,retard_majeur)',
      }, () => { void fetchRetards() })
      .subscribe()
    return () => { void channelImprevusRef.current?.unsubscribe() }
  }, [fetchImprevus, fetchRetards])

  // ─── Actions ──────────────────────────────────────────────────────────────

  async function handleStatusChange(nextStatus: TransportStatus) {
    if (!selectedId || actionLoading) return
    setActionLoading(true)
    try {
      await setCourseTransportStatus(selectedId, nextStatus)
      await loadMissions(true)
      await loadDetail(selectedId)
    } catch {
      // silencieux
    } finally {
      setActionLoading(false)
    }
  }

  const handleImprevuUpdate = useCallback(async (id: string, patch: Partial<Imprevu>) => {
    await looseSupabase.from('imprevu_exploitation').update(patch).eq('id', id)
    void fetchImprevus()
  }, [fetchImprevus])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titre.trim()) return
    setCreating(true)
    await looseSupabase.from('imprevu_exploitation').insert({
      company_id: companyId ?? null,
      ot_id: form.ot_id || null,
      vehicule_id: form.vehicule_id || null,
      conducteur_id: form.conducteur_id || null,
      type: form.type,
      titre: form.titre.trim(),
      description: form.description.trim() || null,
      priorite: form.priorite,
      statut: 'ouvert',
    })
    setCreating(false)
    setShowCreate(false)
    setForm(EMPTY_FORM)
    void fetchImprevus()
  }

  function openCreateImprevu(otId?: string) {
    setForm({ ...EMPTY_FORM, ot_id: otId ?? '' })
    setShowCreate(true)
    setActiveTab('imprevu')
  }

  const formF = (k: keyof CreateForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  // ─── Données calculées ────────────────────────────────────────────────────

  const missionsFiltrees = missions.filter(m => {
    if (filterMode === 'en_cours') return ST_EN_COURS.includes(m.statut_transport as TransportStatus)
    if (filterMode === 'planifie') return ST_PLANIFIE.includes(m.statut_transport as TransportStatus)
    if (filterMode === 'retard') {
      return (
        m.statut_operationnel === 'retard_mineur' ||
        m.statut_operationnel === 'retard_majeur' ||
        (isRetard(m.date_livraison_prevue) && ST_EN_COURS.includes(m.statut_transport as TransportStatus))
      )
    }
    return true
  })

  const selected           = missions.find(m => m.id === selectedId) ?? null
  const actionsDisponibles = ACTIONS_PAR_STATUT[selected?.statut_transport as TransportStatus] ?? []
  const nbEnCours          = missions.filter(m => ST_EN_COURS.includes(m.statut_transport as TransportStatus)).length
  const nbRetards          = missions.filter(m =>
    m.statut_operationnel === 'retard_mineur' || m.statut_operationnel === 'retard_majeur' ||
    (isRetard(m.date_livraison_prevue) && ST_EN_COURS.includes(m.statut_transport as TransportStatus))
  ).length
  const nbPlanifies        = missions.filter(m => ST_PLANIFIE.includes(m.statut_transport as TransportStatus)).length
  const nbSansAffect       = missions.filter(m => !m.conducteur_id || !m.vehicule_id).length
  const nbImprevus         = imprevus.filter(i => i.statut === 'ouvert' || i.statut === 'en_cours').length
  const activeImprevus     = imprevus.filter(i => i.statut !== 'clos')
  const closedImprevus     = imprevus.filter(i => i.statut === 'clos')

  const alertesFiltrees = alertesResult.alertes.filter(a => {
    if (alerteFilterSev !== 'toutes' && a.severite  !== alerteFilterSev)  return false
    if (alerteFilterCat !== 'toutes' && a.categorie !== alerteFilterCat) return false
    return true
  })

  // ─── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col overflow-hidden">

      {/* KPIs */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-3 border-b p-4 sm:grid-cols-5" style={{ borderColor: 'var(--border)' }}>
        <KpiCard label="En transit"       value={nbEnCours}    tone="blue" />
        <KpiCard label="Retards actifs"   value={nbRetards}    tone={nbRetards > 0 ? 'red' : 'green'} />
        <KpiCard label="Planifiées"       value={nbPlanifies}  tone="slate" />
        <KpiCard label="Sans affectation" value={nbSansAffect} tone={nbSansAffect > 0 ? 'amber' : 'green'} />
        <button
          onClick={() => { setActiveTab('imprevu'); if (nbImprevus === 0) setShowCreate(true) }}
          className={`rounded-xl border px-4 py-3 text-left transition-colors ${
            nbImprevus > 0
              ? 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-green-100 bg-green-50 text-green-700 hover:bg-green-100'
          }`}
        >
          <p className="text-lg font-bold">{nbImprevus}</p>
          <p className="text-xs opacity-75">Alertes actives</p>
        </button>
      </div>

      {/* Onglets */}
      <div className="flex-shrink-0 flex items-center gap-0 border-b px-4" style={{ borderColor: 'var(--border)' }}>
        {([
          { key: 'missions' as const, label: 'Missions actives', badge: missions.length > 0 ? missions.length : null,            badgeCls: 'bg-slate-100 text-slate-700' },
          { key: 'imprevu'  as const, label: 'Imprévus',         badge: nbImprevus > 0 ? nbImprevus : null,                      badgeCls: 'bg-red-100 text-red-700' },
          { key: 'alertes'  as const, label: 'Alertes auto',     badge: alertesResult.total > 0 ? alertesResult.total : null,   badgeCls: alertesResult.totalCritiques > 0 ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-700' },
        ]).map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {tab.badge !== null && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tab.badgeCls}`}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ONGLET MISSIONS ── */}
      {activeTab === 'missions' && (
        <div className="flex min-h-0 flex-1 overflow-hidden">

          {/* Panel gauche : liste */}
          <div className="flex w-72 flex-shrink-0 flex-col overflow-hidden border-r" style={{ borderColor: 'var(--border)' }}>
            <div className="flex gap-1 border-b px-3 py-2" style={{ borderColor: 'var(--border)' }}>
              {([
                { key: 'tous'     as const, label: 'Toutes'  },
                { key: 'en_cours' as const, label: 'Transit' },
                { key: 'planifie' as const, label: 'Planif.' },
                { key: 'retard'   as const, label: 'Retards' },
              ]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterMode(f.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    filterMode === f.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                  {f.key === 'retard' && nbRetards > 0 && (
                    <span className="ml-1 rounded-full bg-red-500 px-1 text-[9px] text-white">{nbRetards}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                </div>
              ) : missionsFiltrees.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">Aucune mission active</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {missionsFiltrees.map(m => {
                    const retard     = isRetard(m.date_livraison_prevue) && ST_EN_COURS.includes(m.statut_transport as TransportStatus)
                    const isSelected = m.id === selectedId
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedId(m.id)}
                        className={`w-full text-left px-3 py-3 transition-colors ${isSelected ? 'bg-slate-100' : 'hover:bg-slate-50'} ${retard ? 'border-l-2 border-red-500' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-xs font-semibold text-slate-800">{m.reference}</span>
                          <StatusBadge st={m.statut_transport} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <StatutOpsBadge st={m.statut_operationnel} />
                          {retard && <span className="text-[10px] font-medium text-red-600">En retard</span>}
                        </div>
                        <div className="mt-1 truncate text-[11px] text-slate-500">
                          {m.client_nom ?? '—'} · {m.vehicule_immat ?? 'Sans véhicule'}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {m.conducteur_nom ? `🧑 ${m.conducteur_nom}` : '⚠ Sans conducteur'} · Livr. {fmtDate(m.date_livraison_prevue)}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Panel centre + droite : détail */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {!selected ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Sélectionnez une mission
              </div>
            ) : (
              <div className="flex h-full flex-col overflow-y-auto">

                {/* En-tête détail */}
                <div className="flex-shrink-0 border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selected.reference}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge st={selected.statut_transport} />
                        <StatutOpsBadge st={selected.statut_operationnel} />
                        {isRetard(selected.date_livraison_prevue) && ST_EN_COURS.includes(selected.statut_transport as TransportStatus) && (
                          <span className="text-xs font-semibold text-red-600">LIVRAISON EN RETARD</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to="/transports" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                        Fiche OT
                      </Link>
                      {selected.conducteur_id && (
                        <Link to="/tchat" className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                          Contacter conducteur
                        </Link>
                      )}
                      <button
                        onClick={() => openCreateImprevu(selected.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Signaler imprévu
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <InfoCell label="Client"           value={selected.client_nom ?? '—'} />
                    <InfoCell label="Conducteur"       value={selected.conducteur_nom ?? '⚠ Non affecté'} alert={!selected.conducteur_nom} />
                    <InfoCell label="Véhicule"         value={selected.vehicule_immat ?? '⚠ Non affecté'} alert={!selected.vehicule_immat} />
                    <InfoCell label="Nature"           value={selected.nature_marchandise ?? '—'} />
                    <InfoCell label="Chargement"       value={fmtDate(selected.date_chargement_prevue)} />
                    <InfoCell
                      label="Livraison prévue"
                      value={fmtDate(selected.date_livraison_prevue)}
                      alert={isRetard(selected.date_livraison_prevue) && ST_EN_COURS.includes(selected.statut_transport as TransportStatus)}
                    />
                  </div>
                </div>

                {/* Actions statut */}
                {actionsDisponibles.length > 0 && (
                  <div className="flex-shrink-0 border-b px-5 py-3" style={{ borderColor: 'var(--border)' }}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Avancer la mission</p>
                    <div className="flex flex-wrap gap-2">
                      {actionsDisponibles.map(nextSt => (
                        <button
                          key={nextSt}
                          disabled={actionLoading}
                          onClick={() => void handleStatusChange(nextSt)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                            TRANSPORT_STATUS_COLORS[nextSt]
                              ? `${TRANSPORT_STATUS_COLORS[nextSt]} border-transparent hover:opacity-80`
                              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          → {TRANSPORT_STATUS_LABELS[nextSt]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Corps : étapes + historique */}
                <div className="flex flex-1 overflow-hidden">

                  <div className="flex-1 overflow-y-auto border-r px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Étapes</p>
                    {detailLoading ? (
                      <div className="flex justify-center py-4"><div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" /></div>
                    ) : etapes.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucune étape définie</p>
                    ) : (
                      <ol className="space-y-3">
                        {etapes.map((etape, idx) => {
                          const done = etape.statut_etape === 'effectue' || etape.statut_etape === 'valide'
                          const late = !done && isRetard(etape.date_prevue)
                          return (
                            <li key={etape.id} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done ? 'bg-emerald-500 text-white' : late ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                  {done ? '✓' : idx + 1}
                                </div>
                                {idx < etapes.length - 1 && <div className={`mt-1 min-h-3 w-0.5 flex-1 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                              </div>
                              <div className="pb-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-800">
                                    {etape.type_etape === 'chargement' ? '⬆ Chargement' : etape.type_etape === 'livraison' ? '⬇ Livraison' : `Étape ${idx + 1}`}
                                  </span>
                                  {late && <span className="text-[10px] font-medium text-red-600">En retard</span>}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-600">{etape.ville ?? etape.adresse_libre ?? '—'}</div>
                                <div className="text-[11px] text-slate-400">
                                  Prévu : {fmtHeure(etape.date_prevue)}
                                  {etape.date_reelle && ` · Réel : ${fmtHeure(etape.date_reelle)}`}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    )}

                    {selected.notes_internes && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                        <p className="mb-1 text-[11px] font-semibold text-amber-800">Notes internes</p>
                        <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-amber-700">{selected.notes_internes}</p>
                      </div>
                    )}
                  </div>

                  {/* Historique */}
                  <div className="w-56 flex-shrink-0 overflow-y-auto px-4 py-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Historique</p>
                    {detailLoading ? (
                      <div className="flex justify-center py-4"><div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" /></div>
                    ) : historique.length === 0 ? (
                      <p className="text-xs text-slate-400">Aucune transition</p>
                    ) : (
                      <ol className="space-y-2">
                        {historique.map(h => (
                          <li key={h.id} className="border-l-2 border-slate-200 pb-2 pl-3">
                            <div className="text-[11px] font-medium text-slate-700">
                              {TRANSPORT_STATUS_LABELS[h.statut_nouveau as TransportStatus] ?? h.statut_nouveau}
                            </div>
                            {h.commentaire && <div className="truncate text-[11px] text-slate-500" title={h.commentaire}>{h.commentaire}</div>}
                            <div className="text-[10px] text-slate-400">
                              {new Date(h.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── ONGLET ALERTES ── */}
      {activeTab === 'imprevu' && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">

            {/* Action bar */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button
                onClick={() => setShowCreate(s => !s)}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 5v14M5 12h14" /></svg>
                Signaler un imprévu
              </button>
            </div>

            {/* Formulaire création */}
            {showCreate && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                <h2 className="mb-4 font-semibold text-slate-800">Signaler un imprévu</h2>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Type *</label>
                      <select value={form.type} onChange={e => formF('type', e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500">
                        {Object.entries(TYPES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Priorité *</label>
                      <select value={form.priorite} onChange={e => formF('priorite', e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500">
                        <option value="critique">🔴 Critique</option>
                        <option value="elevee">🟡 Élevée</option>
                        <option value="normale">🔵 Normale</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Titre *</label>
                    <input required type="text" value={form.titre} onChange={e => formF('titre', e.target.value)} placeholder="Ex : Panne boîte de vitesse camion AB-123-CD" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">OT concerné</label>
                      <select value={form.ot_id} onChange={e => formF('ot_id', e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500">
                        <option value="">— Aucun —</option>
                        {otList.map(o => <option key={o.id} value={o.id}>{o.reference}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Véhicule</label>
                      <select value={form.vehicule_id} onChange={e => formF('vehicule_id', e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500">
                        <option value="">— Aucun —</option>
                        {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">Conducteur</label>
                      <select value={form.conducteur_id} onChange={e => formF('conducteur_id', e.target.value)} className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500">
                        <option value="">— Aucun —</option>
                        {conducteurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                    <textarea rows={2} value={form.description} onChange={e => formF('description', e.target.value)} placeholder="Contexte, localisation, informations utiles…" className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={creating || !form.titre.trim()} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      {creating ? 'Création…' : "Créer l'imprévu"}
                    </button>
                    <button type="button" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM) }} className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {warRoomLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Colonne gauche : OT alertes */}
                <div className="space-y-4">
                  <Section label="OT en retard" count={otRetards.length} color="red">
                    {otRetards.length === 0 ? (
                      <EmptyState text="Aucun OT en retard actuellement" />
                    ) : (
                      <div className="space-y-2">
                        {otRetards.map(ot => (
                          <div key={ot.id} className={`rounded-xl border p-3 ${ot.statut_operationnel === 'retard_majeur' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-800">{ot.reference}</span>
                              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUT_OPS_CONFIG[ot.statut_operationnel]?.cls ?? ''}`}>
                                {STATUT_OPS_CONFIG[ot.statut_operationnel]?.label ?? ot.statut_operationnel}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                              {ot.client_nom     && <span>{ot.client_nom}</span>}
                              {ot.vehicule_immat && <span>🚛 {ot.vehicule_immat}</span>}
                              {ot.conducteur_nom && <span>👤 {ot.conducteur_nom}</span>}
                            </div>
                            {ot.date_livraison_prevue && (
                              <p className="mt-1 text-xs text-slate-500">Livraison prévue : {fmtDate(ot.date_livraison_prevue)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section label="OT sans conducteur" count={otNonAffectes.length} color="amber">
                    {otNonAffectes.length === 0 ? (
                      <EmptyState text="Tous les OT ont un conducteur assigné" />
                    ) : (
                      <div className="space-y-2">
                        {otNonAffectes.map(ot => (
                          <div key={ot.id} className={`rounded-xl border p-3 ${(ot.age_heures ?? 0) > 24 ? 'border-red-200 bg-red-50' : (ot.age_heures ?? 0) > 12 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-800">{ot.reference}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{fmtAge(ot.age_heures)} sans affectation</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                              {ot.client_nom     && <span>{ot.client_nom}</span>}
                              {ot.type_transport && <span>· {ot.type_transport}</span>}
                              {ot.poids_kg       && <span>· {ot.poids_kg.toLocaleString('fr-FR')} kg</span>}
                            </div>
                            <div className="mt-1 flex gap-3 text-xs text-slate-500">
                              {ot.date_chargement_prevue && <span>Chgt : {fmtDate(ot.date_chargement_prevue)}</span>}
                              {ot.date_livraison_prevue  && <span>Liv : {fmtDate(ot.date_livraison_prevue)}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>
                </div>

                {/* Colonne droite : feed imprévus */}
                <div className="space-y-4 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">
                      Imprévus signalés
                      {activeImprevus.length > 0 && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">{activeImprevus.length}</span>
                      )}
                    </h2>
                    <div className="flex gap-1 text-xs">
                      {[
                        { key: 'actifs',  label: 'Actifs'   },
                        { key: 'resolus', label: 'Résolus'  },
                        { key: 'tous',    label: 'Tous'     },
                      ].map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => setFilterStatut(opt.key)}
                          className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${filterStatut === opt.key ? 'bg-slate-800 text-white' : 'border text-slate-600 hover:bg-slate-50'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(['critique', 'elevee', 'normale'] as const).map(prio => {
                    const groupe = (filterStatut === 'resolus' ? closedImprevus : activeImprevus).filter(i => i.priorite === prio)
                    if (groupe.length === 0) return null
                    const pc = PRIORITE_CONFIG[prio]
                    return (
                      <div key={prio}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${pc.dot}`} />
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{pc.label} ({groupe.length})</span>
                        </div>
                        <div className="space-y-2">
                          {groupe.map(imp => <ImprevuCard key={imp.id} imp={imp} onUpdate={handleImprevuUpdate} />)}
                        </div>
                      </div>
                    )
                  })}

                  {imprevus.length === 0 && (
                    <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
                      <svg className="mx-auto mb-2 h-8 w-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path d="M20 6 9 17l-5-5" /></svg>
                      <p className="font-medium text-green-700">Aucun imprévu en cours</p>
                      <p className="text-sm text-green-600">L'exploitation se déroule normalement</p>
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ONGLET ALERTES AUTOMATIQUES ── */}
      {activeTab === 'alertes' && (
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">

            {/* En-tête */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: 'toutes'    as const, label: 'Toutes',    count: alertesResult.total,          color: 'slate' },
                    { key: 'critique'  as const, label: 'Critiques', count: alertesResult.totalCritiques, color: 'red'   },
                    { key: 'warning'   as const, label: 'Attention', count: alertesResult.totalWarnings,  color: 'amber' },
                    { key: 'info'      as const, label: 'Info',      count: alertesResult.totalInfos,     color: 'blue'  },
                  ] as const
                ).map(pill => (
                  <AlerteFilterPill
                    key={pill.key}
                    count={pill.count}
                    label={pill.label}
                    color={pill.color}
                    active={alerteFilterSev === pill.key}
                    onClick={() => setAlerteFilterSev(pill.key)}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={alertesResult.refresh}
                disabled={alertesResult.loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                <svg className={`h-3.5 w-3.5 ${alertesResult.loading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 12A9 9 0 1 1 5.6 5.6" /><path d="M3 3v6h6" /></svg>
                {alertesResult.loading ? 'Actualisation…' : 'Actualiser'}
              </button>
            </div>

            {/* Onglets catégorie */}
            <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(
                [
                  { key: 'toutes'      as const, label: 'Toutes',      count: alertesResult.total },
                  { key: 'transport'   as const, label: 'Transport',   count: alertesResult.alertes.filter(a => a.categorie === 'transport').length },
                  { key: 'facturation' as const, label: 'Facturation', count: alertesResult.alertes.filter(a => a.categorie === 'facturation').length },
                ] as const
              ).map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAlerteFilterCat(tab.key)}
                  className={[
                    'flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                    alerteFilterCat === tab.key
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${alerteFilterCat === tab.key ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Liste */}
            {alertesResult.loading && alertesResult.alertes.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
              </div>
            ) : alertesFiltrees.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 py-12 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Aucune alerte active</p>
                  <p className="mt-0.5 text-sm text-slate-400">Tout est nominal</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {alertesFiltrees.map(a => <AlerteOpsCard key={a.id} alerte={a} />)}
              </div>
            )}

            {!alertesResult.loading && alertesResult.total > 0 && (
              <p className="text-center text-[11px] text-slate-400">
                Actualisé à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Rafraîchissement automatique toutes les 5 min
              </p>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
