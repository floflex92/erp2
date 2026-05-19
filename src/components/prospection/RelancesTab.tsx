import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type RelanceRow = {
  id: string
  prospect_id: string
  devis_id: string | null
  type_relance: string
  date_prevue: string
  statut: string
  priorite: string
  notes: string | null
  commercial_nom: string | null
  created_at: string
  // JOIN
  prospect_nom?: string
}

type ProspectLight = { id: string; nom_entreprise: string; statut: string }
type DevisLight   = { id: string; numero: string; origine: string; destination: string }

type RelanceForm = {
  prospect_id: string
  devis_id: string
  type_relance: string
  date_prevue: string
  priorite: string
  notes: string
  commercial_nom: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_RELANCE_OPTIONS = [
  { value: 'devis_sans_reponse', label: 'Devis sans réponse',  icon: '📋' },
  { value: 'prospect_inactif',   label: 'Prospect inactif',     icon: '😴' },
  { value: 'devis_expire',       label: 'Devis expiré',         icon: '⏰' },
  { value: 'suivi_regulier',     label: 'Suivi régulier',       icon: '🔄' },
  { value: 'autre',              label: 'Autre',                icon: '💬' },
]

const PRIORITE_META: Record<string, { label: string; bg: string; color: string }> = {
  haute:   { label: 'Haute',   bg: 'rgba(239,68,68,0.15)',   color: '#fda4af' },
  normale: { label: 'Normale', bg: 'rgba(14,165,233,0.12)',  color: '#7dd3fc' },
  basse:   { label: 'Basse',   bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
}

const EMPTY_FORM: RelanceForm = {
  prospect_id: '',
  devis_id: '',
  type_relance: 'suivi_regulier',
  date_prevue: '',
  priorite: 'normale',
  notes: '',
  commercial_nom: '',
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDateFR(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function daysDiff(dateStr: string): number {
  const d = new Date(dateStr)
  d.setHours(0, 0, 0, 0)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor((d.getTime() - now.getTime()) / 86400000)
}

function urgenceMeta(diff: number): { label: string; bg: string; color: string } {
  if (diff < 0)  return { label: `${Math.abs(diff)}j de retard`, bg: 'rgba(239,68,68,0.15)',   color: '#fda4af' }
  if (diff === 0) return { label: "Aujourd'hui",                  bg: 'rgba(245,158,11,0.18)',   color: '#fdba74' }
  if (diff <= 2)  return { label: `Dans ${diff}j`,               bg: 'rgba(250,204,21,0.14)',   color: '#fde68a' }
  return                  { label: `Dans ${diff}j`,               bg: 'rgba(148,163,184,0.10)', color: '#94a3b8' }
}

function typeRelanceMeta(v: string) {
  return TYPE_RELANCE_OPTIONS.find(t => t.value === v) ?? TYPE_RELANCE_OPTIONS[TYPE_RELANCE_OPTIONS.length - 1]
}

function defaultDatePrevue(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium nx-subtle">{label}</span>
      {children}
    </label>
  )
}

// ─── Génération suggestions automatiques ──────────────────────────────────────
function generateSuggestions(prospects: ProspectLight[], relances: RelanceRow[]): string[] {
  const suggestions: string[] = []
  // Prospects avec devis envoyé depuis > 3 jours sans relance planifiée
  const prospAvecDevisEnvoye = prospects.filter(p => p.statut === 'devis_envoye')
  prospAvecDevisEnvoye.forEach(p => {
    const hasRelance = relances.some(r => r.prospect_id === p.id && r.statut === 'planifiee')
    if (!hasRelance) {
      suggestions.push(`📋 Relancer ${p.nom_entreprise} — devis envoyé sans suivi planifié`)
    }
  })

  // Plus de 5 relances en retard
  const enRetard = relances.filter(r => r.statut === 'planifiee' && daysDiff(r.date_prevue) < 0)
  if (enRetard.length >= 3) {
    suggestions.push(`⚠️ ${enRetard.length} relances en retard — prioriser aujourd'hui`)
  }

  // Prospects en closing depuis longtemps
  const closing = prospects.filter(p => p.statut === 'closing')
  if (closing.length > 0) {
    suggestions.push(`🎯 ${closing.length} prospect(s) en closing — pousser pour signature`)
  }

  return suggestions.slice(0, 4) // Max 4 suggestions
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function RelancesTab() {
  const [relances, setRelances]     = useState<RelanceRow[]>([])
  const [prospects, setProspects]   = useState<ProspectLight[]>([])
  const [devis, setDevis]           = useState<DevisLight[]>([])
  const [form, setForm]             = useState<RelanceForm>({ ...EMPTY_FORM, date_prevue: defaultDatePrevue() })
  const [filterStatut, setFilterStatut] = useState<'planifiee' | 'faite' | 'annulee' | 'tous'>('planifiee')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [notice, setNotice]         = useState<string | null>(null)

  const sb = supabase as any

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: r }, { data: p }, { data: d }] = await Promise.all([
        sb.from('relances_commerciales').select('*').order('date_prevue', { ascending: true }),
        sb.from('prospects').select('id, nom_entreprise, statut').order('nom_entreprise', { ascending: true }),
        sb.from('devis_transport').select('id, numero, origine, destination').order('created_at', { ascending: false }),
      ])

      const prospectsById = Object.fromEntries((p ?? []).map((p: ProspectLight) => [p.id, p.nom_entreprise]))

      const enriched = ((r ?? []) as RelanceRow[]).map(rel => ({
        ...rel,
        prospect_nom: prospectsById[rel.prospect_id] ?? '—',
      }))

      setRelances(enriched)
      setProspects((p ?? []) as ProspectLight[])
      setDevis((d ?? []) as DevisLight[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // ── Filtrage + groupement ──
  const filteredRelances = useMemo(() => {
    if (filterStatut === 'tous') return relances
    return relances.filter(r => r.statut === filterStatut)
  }, [relances, filterStatut])

  const grouped = useMemo(() => {
    const enRetard = filteredRelances.filter(r => r.statut === 'planifiee' && daysDiff(r.date_prevue) < 0)
    const aujHui   = filteredRelances.filter(r => r.statut === 'planifiee' && daysDiff(r.date_prevue) === 0)
    const aVenir   = filteredRelances.filter(r => r.statut === 'planifiee' && daysDiff(r.date_prevue) > 0)
    const termines = filteredRelances.filter(r => ['faite', 'annulee'].includes(r.statut))
    return { enRetard, aujHui, aVenir, termines }
  }, [filteredRelances])

  const suggestions = useMemo(() => generateSuggestions(prospects, relances), [prospects, relances])

  // ── CRUD ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.prospect_id) { setError('Sélectionnez un prospect.'); return }
    if (!form.date_prevue) { setError('La date est obligatoire.'); return }
    setSaving(true); setError(null)
    try {
      const { error: err } = await sb.from('relances_commerciales').insert({
        prospect_id: form.prospect_id,
        devis_id: form.devis_id || null,
        type_relance: form.type_relance,
        date_prevue: form.date_prevue,
        priorite: form.priorite,
        notes: form.notes.trim() || null,
        commercial_nom: form.commercial_nom.trim() || null,
        statut: 'planifiee',
      })
      if (err) throw err
      setForm({ ...EMPTY_FORM, date_prevue: defaultDatePrevue() })
      setShowForm(false)
      setNotice('Relance planifiée.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(id: string, statut: 'faite' | 'annulee') {
    const { error: err } = await sb.from('relances_commerciales').update({ statut }).eq('id', id)
    if (err) { setError(err.message); return }
    setRelances(cur => cur.map(r => r.id === id ? { ...r, statut } : r))
    setNotice(statut === 'faite' ? 'Relance marquée comme faite.' : 'Relance annulée.')
  }

  async function handleDelete(id: string) {
    const { error: err } = await sb.from('relances_commerciales').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setRelances(cur => cur.filter(r => r.id !== id))
  }

  // ─────────────────────────────────────────────────────────────────────────
  const renderRelance = (r: RelanceRow) => {
    const diff = daysDiff(r.date_prevue)
    const urgence = urgenceMeta(diff)
    const prio = PRIORITE_META[r.priorite] ?? PRIORITE_META.normale
    const typeMeta = typeRelanceMeta(r.type_relance)

    return (
      <div key={r.id} className="flex gap-4 border-b px-4 py-3 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
        <span className="text-lg mt-0.5">{typeMeta.icon}</span>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{r.prospect_nom}</p>
            <span className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: prio.bg, color: prio.color }}>{prio.label}</span>
            {r.statut === 'planifiee' && (
              <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ background: urgence.bg, color: urgence.color }}>{urgence.label}</span>
            )}
            {r.statut === 'faite' && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">✅ Faite</span>
            )}
            {r.statut === 'annulee' && (
              <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-xs text-muted">Annulée</span>
            )}
            <span className="ml-auto text-xs nx-subtle">{formatDateFR(r.date_prevue)}</span>
          </div>
          <p className="text-xs nx-subtle">{typeMeta.label}{r.commercial_nom ? ` • ${r.commercial_nom}` : ''}</p>
          {r.notes && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.notes}</p>}
        </div>
        {r.statut === 'planifiee' && (
          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={() => void handleAction(r.id, 'faite')}
              className="rounded-lg bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-600/30">
              ✓ Faite
            </button>
            <button onClick={() => void handleAction(r.id, 'annulee')}
              className="rounded-lg px-2 py-1 text-xs nx-subtle hover:text-slate-200">
              Annuler
            </button>
          </div>
        )}
        {['faite', 'annulee'].includes(r.statut) && (
          <button onClick={() => void handleDelete(r.id)}
            className="shrink-0 rounded-lg border px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
            style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
            ✕
          </button>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Alertes */}
      {(error || notice) && (
        <div className="rounded-2xl border px-4 py-3 text-sm" style={{
          borderColor: error ? 'rgba(244,114,182,0.25)' : 'rgba(56,189,248,0.25)',
          background: error ? 'rgba(127,29,29,0.18)' : 'rgba(8,47,73,0.25)',
          color: error ? '#fecdd3' : '#bae6fd',
        }}>
          {error ?? notice}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'En retard',         val: String(grouped.enRetard.length),  highlight: grouped.enRetard.length > 0 },
          { label: "Aujourd'hui",       val: String(grouped.aujHui.length),    highlight: grouped.aujHui.length > 0 },
          { label: 'À venir',           val: String(grouped.aVenir.length),    highlight: false },
          { label: 'Faites (total)',     val: String(relances.filter(r => r.statut === 'faite').length), highlight: false },
        ].map(k => (
          <div key={k.label} className="nx-card p-4">
            <p className="text-xs nx-subtle">{k.label}</p>
            <p className={`mt-1.5 text-2xl font-semibold ${k.highlight ? 'text-rose-400' : ''}`}>{k.val}</p>
          </div>
        ))}
      </div>

      {/* Suggestions automatiques */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.06)' }}>
          <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Suggestions commerciales</p>
          {suggestions.map((s, i) => (
            <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s}</p>
          ))}
        </div>
      )}

      {/* Barre actions */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {([
            { key: 'planifiee', label: 'À faire' },
            { key: 'faite',     label: 'Faites' },
            { key: 'annulee',   label: 'Annulées' },
            { key: 'tous',      label: 'Toutes' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setFilterStatut(tab.key)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${filterStatut === tab.key ? 'bg-slate-700 text-white' : 'text-muted hover:text-slate-200'}`}>
              {tab.label}
              {tab.key === 'planifiee' && grouped.enRetard.length > 0 && (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-xs text-white">
                  {grouped.enRetard.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={() => setShowForm(f => !f)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          {showForm ? 'Annuler' : '+ Planifier une relance'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={e => void handleCreate(e)} className="nx-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nouvelle relance</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Prospect *">
              <select value={form.prospect_id} onChange={e => setForm(f => ({ ...f, prospect_id: e.target.value }))}
                required className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                <option value="">— Sélectionner —</option>
                {prospects.map(p => <option key={p.id} value={p.id}>{p.nom_entreprise}</option>)}
              </select>
            </Field>
            <Field label="Lié à un devis">
              <select value={form.devis_id} onChange={e => setForm(f => ({ ...f, devis_id: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                <option value="">— Aucun devis —</option>
                {devis.map(d => <option key={d.id} value={d.id}>{d.numero} – {d.origine} → {d.destination}</option>)}
              </select>
            </Field>
            <Field label="Type de relance">
              <select value={form.type_relance} onChange={e => setForm(f => ({ ...f, type_relance: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                {TYPE_RELANCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.icon} {o.label}</option>)}
              </select>
            </Field>
            <Field label="Date prévue *">
              <input value={form.date_prevue} onChange={e => setForm(f => ({ ...f, date_prevue: e.target.value }))}
                type="date" required
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Priorité">
              <select value={form.priorite} onChange={e => setForm(f => ({ ...f, priorite: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                <option value="haute">🔴 Haute</option>
                <option value="normale">🔵 Normale</option>
                <option value="basse">⚪ Basse</option>
              </select>
            </Field>
            <Field label="Commercial">
              <input value={form.commercial_nom} onChange={e => setForm(f => ({ ...f, commercial_nom: e.target.value }))}
                placeholder="Martin D."
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <div className="sm:col-span-2 lg:col-span-3">
              <Field label="Notes">
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Objectif de la relance, message à passer..." rows={2}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none resize-none" />
              </Field>
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
            {saving ? 'Création...' : 'Planifier'}
          </button>
        </form>
      )}

      {loading && <div className="py-8 text-center text-sm nx-subtle">Chargement des relances...</div>}

      {/* ── Listes groupées ── */}
      {!loading && (
        <div className="space-y-4">
          {filterStatut === 'planifiee' && (
            <>
              {/* En retard */}
              {grouped.enRetard.length > 0 && (
                <div className="nx-card overflow-hidden">
                  <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)' }}>
                    <p className="text-sm font-semibold text-rose-300">⚠️ En retard ({grouped.enRetard.length})</p>
                  </div>
                  {grouped.enRetard.map(renderRelance)}
                </div>
              )}

              {/* Aujourd'hui */}
              {grouped.aujHui.length > 0 && (
                <div className="nx-card overflow-hidden">
                  <div className="border-b px-4 py-3" style={{ borderColor: 'rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.06)' }}>
                    <p className="text-sm font-semibold text-amber-300">📅 Aujourd'hui ({grouped.aujHui.length})</p>
                  </div>
                  {grouped.aujHui.map(renderRelance)}
                </div>
              )}

              {/* À venir */}
              {grouped.aVenir.length > 0 && (
                <div className="nx-card overflow-hidden">
                  <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                    <p className="text-sm font-semibold">À venir ({grouped.aVenir.length})</p>
                  </div>
                  {grouped.aVenir.map(renderRelance)}
                </div>
              )}

              {grouped.enRetard.length === 0 && grouped.aujHui.length === 0 && grouped.aVenir.length === 0 && (
                <div className="nx-card flex items-center justify-center py-12 text-sm nx-subtle">
                  Aucune relance planifiée. 🎉
                </div>
              )}
            </>
          )}

          {filterStatut !== 'planifiee' && (
            <div className="nx-card overflow-hidden">
              {filteredRelances.length === 0 ? (
                <p className="px-5 py-8 text-sm nx-subtle">Aucune relance.</p>
              ) : filteredRelances.map(renderRelance)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
