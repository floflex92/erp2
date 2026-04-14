import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { looseSupabase } from '@/lib/supabaseLoose'
import { useAuth } from '@/lib/auth'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  // joined
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPES_LABELS: Record<string, string> = {
  panne_vehicule: 'Panne véhicule',
  retard_chargement: 'Retard chargement',
  retard_livraison: 'Retard livraison',
  refus_chargement: 'Refus de chargement',
  accident: 'Accident',
  absence_conducteur: 'Absence conducteur',
  autre: 'Autre',
}

const PRIORITE_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  critique: { label: 'Critique', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-200' },
  elevee:   { label: 'Élevée',   dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  normale:  { label: 'Normale',  dot: 'bg-slate-400', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
}

const STATUT_CONFIG: Record<string, { label: string; cls: string }> = {
  ouvert:    { label: 'Ouvert',    cls: 'bg-red-100 text-red-700' },
  en_cours:  { label: 'En cours',  cls: 'bg-blue-100 text-blue-700' },
  resolu:    { label: 'Résolu',    cls: 'bg-slate-100 text-slate-700' },
  clos:      { label: 'Clos',      cls: 'bg-slate-100 text-slate-500' },
}

const STATUT_OPS_CONFIG: Record<string, { label: string; cls: string }> = {
  retard_mineur: { label: 'Retard mineur', cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  retard_majeur: { label: 'Retard majeur', cls: 'bg-red-100 text-red-700 border-red-300' },
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

function fmtAge(h: number | null | undefined): string {
  if (h === null || h === undefined) return ''
  if (h < 1) return `< 1h`
  if (h < 24) return `${Math.floor(h)}h`
  return `${Math.floor(h / 24)}j`
}

// ─── Sous-composant: Carte imprévu ────────────────────────────────────────────

function ImprevuCard({
  imp,
  onUpdate,
}: {
  imp: Imprevu
  onUpdate: (id: string, patch: Partial<Imprevu>) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [actionText, setActionText] = useState(imp.action_prise ?? '')
  const [saving, setSaving] = useState(false)

  const pc = PRIORITE_CONFIG[imp.priorite] ?? PRIORITE_CONFIG.normale
  const sc = STATUT_CONFIG[imp.statut] ?? STATUT_CONFIG.ouvert

  const nextStatut = (cur: string): 'ouvert' | 'en_cours' | 'resolu' | 'clos' => {
    const flow: Array<'ouvert' | 'en_cours' | 'resolu' | 'clos'> = ['ouvert', 'en_cours', 'resolu', 'clos']
    const idx = flow.indexOf(cur as never)
    return flow[Math.min(idx + 1, flow.length - 1)]
  }

  async function handleStatutForward() {
    const ns = nextStatut(imp.statut)
    await onUpdate(imp.id, {
      statut: ns,
      action_prise: actionText || imp.action_prise,
      ...(ns === 'resolu' ? { resolved_at: new Date().toISOString() } : {}),
    })
  }

  async function saveAction() {
    setSaving(true)
    await onUpdate(imp.id, { action_prise: actionText, statut: imp.statut === 'ouvert' ? 'en_cours' : imp.statut })
    setSaving(false)
  }

  return (
    <div className={`rounded-xl border ${imp.statut === 'clos' ? 'opacity-50' : ''} bg-white shadow-sm`}>
      <div
        className="flex cursor-pointer items-start gap-3 px-4 py-3"
        onClick={() => setExpanded(e => !e)}
      >
        <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${pc.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 truncate">{imp.titre}</span>
            {imp.ot_reference && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{imp.ot_reference}</span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{TYPES_LABELS[imp.type] ?? imp.type}</span>
            {imp.vehicule_immat && <span>· {imp.vehicule_immat}</span>}
            {imp.conducteur_nom  && <span>· {imp.conducteur_nom}</span>}
            <span>· {new Date(imp.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${pc.badge}`}>{pc.label}</span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.cls}`}>{sc.label}</span>
          <ChevronIcon open={expanded} />
        </div>
      </div>

      {expanded && (
        <div className="border-t px-4 pb-4 pt-3 space-y-3">
          {imp.description && (
            <p className="text-sm text-slate-600">{imp.description}</p>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Action corrective</label>
            <textarea
              rows={2}
              value={actionText}
              onChange={e => setActionText(e.target.value)}
              placeholder="Décrivez l'action prise…"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 resize-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveAction}
              disabled={saving}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Sauvegarder l\'action'}
            </button>
            {imp.statut !== 'clos' && (
              <button
                onClick={handleStatutForward}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                → {STATUT_CONFIG[nextStatut(imp.statut)].label}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function WarRoom() {
  const { companyId } = useAuth()

  const [imprevus, setImprevus]           = useState<Imprevu[]>([])
  const [otRetards, setOtRetards]         = useState<OTRetard[]>([])
  const [otNonAffectes, setOtNonAffectes] = useState<OTNonAffecte[]>([])
  const [otList, setOtList]               = useState<OTLite[]>([])
  const [vehicules, setVehicules]         = useState<VehiculeLite[]>([])
  const [conducteurs, setConducteurs]     = useState<ConducteurLite[]>([])

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]             = useState<CreateForm>(EMPTY_FORM)
  const [creating, setCreating]     = useState(false)
  const [filterStatut, setFilterStatut] = useState<string>('actifs')
  const [loading, setLoading]       = useState(true)

  const channelRef = useRef<RealtimeChannel | null>(null)

  // ─── Fetch data ────────────────────────────────────────────────────────────

  const fetchImprevus = useCallback(async () => {
    const q = looseSupabase
      .from('imprevu_exploitation')
      .select(`
        *,
        ordres_transport:ot_id (reference),
        vehicules:vehicule_id (immatriculation),
        conducteurs:conducteur_id (nom, prenom)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (filterStatut === 'actifs') {
      q.in('statut', ['ouvert', 'en_cours'])
    } else if (filterStatut === 'resolus') {
      q.in('statut', ['resolu', 'clos'])
    }

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
      supabase.from('ordres_transport').select('id, reference, client_id')
        .not('statut', 'in', '("annule","facture")')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('vehicules').select('id, immatriculation').eq('statut', 'actif'),
      supabase.from('conducteurs').select('id, nom, prenom').eq('statut', 'actif'),
    ])
    if (ots)   setOtList(ots as OTLite[])
    if (vehs)  setVehicules(vehs as VehiculeLite[])
    if (conds) setConducteurs(conds as ConducteurLite[])
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchImprevus(), fetchRetards(), fetchNonAffectes(), fetchReferentiel()])
      setLoading(false)
    }
    void init()
  }, [fetchImprevus, fetchRetards, fetchNonAffectes, fetchReferentiel])

  // Rechargement quand le filtre change
  useEffect(() => { void fetchImprevus() }, [fetchImprevus])

  // ─── Realtime ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const chan = supabase
      .channel('war-room-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'imprevu_exploitation',
      }, () => { void fetchImprevus() })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ordres_transport',
        filter: 'statut_operationnel=in.(retard_mineur,retard_majeur)',
      }, () => { void fetchRetards() })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'historique_statuts',
      }, () => { void fetchRetards(); void fetchNonAffectes() })
      .subscribe()

    channelRef.current = chan
    return () => { void supabase.removeChannel(chan) }
  }, [fetchImprevus, fetchRetards, fetchNonAffectes])

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleUpdate = useCallback(async (id: string, patch: Partial<Imprevu>) => {
    await looseSupabase.from('imprevu_exploitation').update(patch).eq('id', id)
    void fetchImprevus()
  }, [fetchImprevus])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titre.trim()) return
    setCreating(true)
    await looseSupabase.from('imprevu_exploitation').insert({
      company_id:    companyId ?? null,
      ot_id:         form.ot_id || null,
      vehicule_id:   form.vehicule_id || null,
      conducteur_id: form.conducteur_id || null,
      type:          form.type,
      titre:         form.titre.trim(),
      description:   form.description.trim() || null,
      priorite:      form.priorite,
      statut:        'ouvert',
    })
    setCreating(false)
    setShowCreate(false)
    setForm(EMPTY_FORM)
    void fetchImprevus()
  }

  // ─── Compteurs zone ────────────────────────────────────────────────────────

  const nbCritique = imprevus.filter(i => i.priorite === 'critique' && i.statut !== 'clos').length
    + otRetards.filter(o => o.statut_operationnel === 'retard_majeur').length

  const nbVigilance = imprevus.filter(i => i.priorite === 'elevee' && i.statut !== 'clos').length
    + otRetards.filter(o => o.statut_operationnel === 'retard_mineur').length
    + otNonAffectes.filter(o => (o.age_heures ?? 0) > 12).length

  const nbOrdre = Math.max(0,
    imprevus.filter(i => i.priorite === 'normale' && i.statut === 'ouvert').length
    + otNonAffectes.filter(o => (o.age_heures ?? 0) <= 12).length
  )

  const formF = (k: keyof CreateForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const activeImprevus = imprevus.filter(i => i.statut !== 'clos')
  const closedImprevus = imprevus.filter(i => i.statut === 'clos')

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-800 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <SirenIcon />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">War Room Exploitation</h1>
            <p className="text-xs text-slate-500">Supervision temps réel — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(s => !s)}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          <PlusIcon />
          Signaler un imprévu
        </button>
      </div>

      {/* Compteurs zones */}
      <div className="grid grid-cols-3 gap-4">
        <ZoneCounter
          color="red"
          icon={<AlertIcon className="h-5 w-5 text-red-600" />}
          label="Critique"
          count={nbCritique}
          sub="imprévus urgents + retards majeurs"
        />
        <ZoneCounter
          color="amber"
          icon={<AlertIcon className="h-5 w-5 text-slate-500" />}
          label="Vigilance"
          count={nbVigilance}
          sub="retards mineurs + OT non affectés"
        />
        <ZoneCounter
          color="green"
          icon={<CheckIcon className="h-5 w-5 text-slate-500" />}
          label="En ordre"
          count={nbOrdre}
          sub="imprévus normaux"
        />
      </div>

      {/* Formulaire création */}
      {showCreate && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <h2 className="mb-4 font-semibold text-slate-800">Signaler un imprévu</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Type *</label>
                <select
                  value={form.type}
                  onChange={e => formF('type', e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  {Object.entries(TYPES_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Priorité *</label>
                <select
                  value={form.priorite}
                  onChange={e => formF('priorite', e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="critique">🔴 Critique</option>
                  <option value="elevee">🟡 Élevée</option>
                  <option value="normale">🔵 Normale</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Titre *</label>
              <input
                required
                type="text"
                value={form.titre}
                onChange={e => formF('titre', e.target.value)}
                placeholder="Ex : Panne boîte de vitesse camion AB-123-CD"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">OT concerné</label>
                <select
                  value={form.ot_id}
                  onChange={e => formF('ot_id', e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">— Aucun —</option>
                  {otList.map(o => (
                    <option key={o.id} value={o.id}>{o.reference}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Véhicule</label>
                <select
                  value={form.vehicule_id}
                  onChange={e => formF('vehicule_id', e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">— Aucun —</option>
                  {vehicules.map(v => (
                    <option key={v.id} value={v.id}>{v.immatriculation}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Conducteur</label>
                <select
                  value={form.conducteur_id}
                  onChange={e => formF('conducteur_id', e.target.value)}
                  className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="">— Aucun —</option>
                  {conducteurs.map(c => (
                    <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={e => formF('description', e.target.value)}
                placeholder="Contexte, localisation, informations utiles…"
                className="w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !form.titre.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {creating ? 'Création…' : 'Créer l\'imprévu'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM) }}
                className="rounded-lg border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contenu principal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Colonne gauche — OT en retard + OT non affectés */}
        <div className="space-y-4">

          {/* OT en retard */}
          <Section
            label="OT en retard"
            count={otRetards.length}
            color="red"
          >
            {otRetards.length === 0 ? (
              <EmptyState text="Aucun OT en retard actuellement" />
            ) : (
              <div className="space-y-2">
                {otRetards.map(ot => (
                  <div
                    key={ot.id}
                    className={`rounded-xl border p-3 ${
                      ot.statut_operationnel === 'retard_majeur'
                        ? 'border-red-200 bg-red-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{ot.reference}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        STATUT_OPS_CONFIG[ot.statut_operationnel]?.cls ?? ''
                      }`}>
                        {STATUT_OPS_CONFIG[ot.statut_operationnel]?.label ?? ot.statut_operationnel}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                      {ot.client_nom    && <span>{ot.client_nom}</span>}
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

          {/* OT non affectés */}
          <Section
            label="OT sans conducteur"
            count={otNonAffectes.length}
            color="amber"
          >
            {otNonAffectes.length === 0 ? (
              <EmptyState text="Tous les OT ont un conducteur assigné" />
            ) : (
              <div className="space-y-2">
                {otNonAffectes.map(ot => (
                  <div
                    key={ot.id}
                    className={`rounded-xl border p-3 ${
                      (ot.age_heures ?? 0) > 24
                        ? 'border-red-200 bg-red-50'
                        : (ot.age_heures ?? 0) > 12
                          ? 'border-slate-200 bg-slate-50'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800">{ot.reference}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        {fmtAge(ot.age_heures)} sans affectation
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
                      {ot.client_nom && <span>{ot.client_nom}</span>}
                      {ot.type_transport && <span>· {ot.type_transport}</span>}
                      {ot.poids_kg && <span>· {ot.poids_kg.toLocaleString('fr-FR')} kg</span>}
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

        {/* Colonne droite — Feed des imprévus */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              Imprévus signalés
              {activeImprevus.length > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                  {activeImprevus.length}
                </span>
              )}
            </h2>
            <div className="flex gap-1 text-xs">
              {[
                { key: 'actifs',  label: 'Actifs' },
                { key: 'resolus', label: 'Résolus' },
                { key: 'tous',    label: 'Tous' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setFilterStatut(opt.key)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                    filterStatut === opt.key
                      ? 'bg-slate-800 text-white'
                      : 'border text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Critiques en premier */}
          {['critique', 'elevee', 'normale'].map(prio => {
            const groupe = (filterStatut === 'resolus' ? closedImprevus : activeImprevus)
              .filter(i => i.priorite === prio)
            if (groupe.length === 0) return null
            const pc = PRIORITE_CONFIG[prio]
            return (
              <div key={prio}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${pc.dot}`} />
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {pc.label} ({groupe.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {groupe.map(imp => (
                    <ImprevuCard key={imp.id} imp={imp} onUpdate={handleUpdate} />
                  ))}
                </div>
              </div>
            )
          })}

          {imprevus.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
              <CheckIcon className="mx-auto mb-2 h-8 w-8 text-slate-500" />
              <p className="font-medium text-slate-700">Aucun imprévu en cours</p>
              <p className="text-sm text-slate-600">L'exploitation se déroule normalement</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Micro-composants ─────────────────────────────────────────────────────────

function ZoneCounter({
  color, icon, label, count, sub,
}: {
  color: 'red' | 'amber' | 'green'
  icon: React.ReactNode
  label: string
  count: number
  sub: string
}) {
  const cls = {
    red:   'border-red-200   bg-red-50',
    amber: 'border-slate-200 bg-slate-50',
    green: 'border-slate-200 bg-slate-50',
  }[color]
  const countCls = {
    red:   'text-red-700',
    amber: 'text-slate-700',
    green: 'text-slate-700',
  }[color]

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-sm font-semibold text-slate-700">{label}</span></div>
      <p className={`text-3xl font-bold ${countCls}`}>{count}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  )
}

function Section({
  label, count, color, children,
}: {
  label: string
  count: number
  color: 'red' | 'amber' | 'slate'
  children: React.ReactNode
}) {
  const badgeCls = {
    red:   'bg-red-100 text-red-700',
    amber: 'bg-slate-100 text-slate-700',
    slate: 'bg-slate-100 text-slate-600',
  }[color]

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="font-semibold text-slate-800">{label}</h2>
        {count > 0 && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${badgeCls}`}>{count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-400">
      <CheckIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
      {text}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SirenIcon() {
  return (
    <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 2v3M4.9 4.9l2.1 2.1M2 12h3M19.1 4.9l-2.1 2.1M22 12h-3" />
      <path d="M7 17v-5a5 5 0 0 1 10 0v5" />
      <rect x="4" y="17" width="16" height="3" rx="1" />
    </svg>
  )
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
