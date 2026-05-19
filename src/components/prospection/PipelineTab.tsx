import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type ProspectRow = {
  id: string
  created_at: string
  updated_at: string
  nom_entreprise: string
  statut: string
  montant_mensuel_estime: number | null
  commercial_nom: string | null
  secteur: string | null
  type_transport: string | null
  ville: string | null
  code_postal: string | null
  contact_nom: string | null
  contact_telephone: string | null
  notes: string | null
  probabilite_closing: number | null
  source_lead: string | null
  date_derniere_action: string | null
  date_prochain_contact: string | null
  zones_transport: string | null
  concurrent_actuel: string | null
}

type ProspectForm = {
  nom_entreprise: string
  statut: string
  montant_mensuel_estime: string
  commercial_nom: string
  secteur: string
  type_transport: string
  ville: string
  contact_nom: string
  contact_telephone: string
  probabilite_closing: string
  source_lead: string
  notes: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const KANBAN_STAGES = [
  { value: 'lead',          label: 'Lead',         bg: 'rgba(59,130,246,0.12)',  color: '#93c5fd', prob: 10 },
  { value: 'qualification', label: 'Qualification', bg: 'rgba(14,165,233,0.12)', color: '#7dd3fc', prob: 25 },
  { value: 'devis_envoye',  label: 'Devis envoyé', bg: 'rgba(34,197,94,0.12)',  color: '#86efac', prob: 40 },
  { value: 'negociation',   label: 'Négociation',  bg: 'rgba(250,204,21,0.12)', color: '#fde68a', prob: 65 },
  { value: 'closing',       label: 'Closing',      bg: 'rgba(245,158,11,0.12)', color: '#fdba74', prob: 85 },
] as const

const ALL_STATUS = [
  ...KANBAN_STAGES,
  { value: 'gagne', label: 'Gagné',  bg: 'rgba(16,185,129,0.16)', color: '#6ee7b7', prob: 100 },
  { value: 'perdu', label: 'Perdu',  bg: 'rgba(239,68,68,0.16)',  color: '#fda4af', prob: 0 },
]

const SOURCE_OPTIONS = [
  { value: '',                  label: '— Source —' },
  { value: 'telephone_entrant', label: 'Appel entrant' },
  { value: 'salon',             label: 'Salon / expo' },
  { value: 'bouche_a_oreille',  label: 'Bouche à oreille' },
  { value: 'linkedin',          label: 'LinkedIn' },
  { value: 'bourse_fret',       label: 'Bourse fret' },
  { value: 'site_web',          label: 'Site web' },
  { value: 'recommandation',    label: 'Recommandation' },
  { value: 'autre',             label: 'Autre' },
]

const ACTIVE_STATUSES = KANBAN_STAGES.map(s => s.value)

const EMPTY_FORM: ProspectForm = {
  nom_entreprise: '',
  statut: 'lead',
  montant_mensuel_estime: '',
  commercial_nom: '',
  secteur: '',
  type_transport: '',
  ville: '',
  contact_nom: '',
  contact_telephone: '',
  probabilite_closing: '20',
  source_lead: '',
  notes: '',
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function activityBadge(days: number) {
  if (days <= 3)  return { label: 'Actif',      bg: 'rgba(16,185,129,0.18)',  color: '#6ee7b7' }
  if (days <= 7)  return { label: `${days}j`,   bg: 'rgba(250,204,21,0.15)',  color: '#fde68a' }
  if (days <= 14) return { label: `${days}j`,   bg: 'rgba(245,158,11,0.18)',  color: '#fdba74' }
  return              { label: `${days}j`,   bg: 'rgba(239,68,68,0.18)',   color: '#fda4af' }
}

function statusMeta(value: string) {
  return ALL_STATUS.find(s => s.value === value) ?? ALL_STATUS[0]
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

// ─── Composants UI ────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="nx-card p-5">
      <p className="text-xs nx-subtle">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs nx-subtle">{sub}</p>}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium nx-subtle">{label}</span>
      {children}
    </label>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function PipelineTab() {
  const [prospects, setProspects] = useState<ProspectRow[]>([])
  const [form, setForm] = useState<ProspectForm>(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'kanban' | 'liste'>('kanban')
  const [filterStatut, setFilterStatut] = useState<string>('actif')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const sb = supabase as any

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await sb
        .from('prospects')
        .select('*')
        .order('updated_at', { ascending: false })
      if (e) throw e
      setProspects((data ?? []) as ProspectRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // ── KPIs ──
  const kpis = useMemo(() => {
    const now = Date.now()
    const t90 = now - 90 * 86400000
    const actifs = prospects.filter(p => ACTIVE_STATUSES.includes(p.statut as any))
    const recent90 = prospects.filter(p => new Date(p.created_at).getTime() >= t90)
    const gagnes90 = recent90.filter(p => p.statut === 'gagne')
    const conversionTaux = recent90.length === 0 ? 0 : Math.round((gagnes90.length / recent90.length) * 100)
    const pipelinePondere = actifs.reduce((sum, p) => {
      const prob = p.probabilite_closing ?? statusMeta(p.statut).prob
      return sum + (p.montant_mensuel_estime ?? 0) * (prob / 100)
    }, 0)
    const pipelineBrut = actifs.reduce((sum, p) => sum + (p.montant_mensuel_estime ?? 0), 0)
    const devisOuverts = prospects.filter(p => ['devis_envoye', 'negociation', 'closing'].includes(p.statut)).length
    return { leadsActifs: actifs.length, devisOuverts, pipelinePondere, pipelineBrut, conversionTaux }
  }, [prospects])

  // ── Filtrage ──
  const filtered = useMemo(() => {
    let list = prospects
    if (filterStatut === 'actif')   list = list.filter(p => ACTIVE_STATUSES.includes(p.statut as any))
    else if (filterStatut !== 'tous') list = list.filter(p => p.statut === filterStatut)
    if (!search.trim()) return list
    const q = normalizeSearch(search)
    return list.filter(p => {
      const hay = normalizeSearch([p.nom_entreprise, p.commercial_nom ?? '', p.secteur ?? '', p.ville ?? ''].join(' '))
      return hay.includes(q)
    })
  }, [prospects, filterStatut, search])

  // ── CRUD ──
  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!form.nom_entreprise.trim()) { setError('Le nom est obligatoire.'); return }
    setSaving(true); setError(null); setNotice(null)
    try {
      const montant = form.montant_mensuel_estime.trim() === '' ? null : Number(form.montant_mensuel_estime)
      const prob = form.probabilite_closing.trim() === '' ? 20 : Math.max(0, Math.min(100, Number(form.probabilite_closing)))
      const { error: e } = await sb.from('prospects').insert({
        nom_entreprise: form.nom_entreprise.trim(),
        statut: form.statut,
        montant_mensuel_estime: montant,
        commercial_nom: form.commercial_nom.trim() || null,
        secteur: form.secteur.trim() || null,
        type_transport: form.type_transport.trim() || null,
        ville: form.ville.trim() || null,
        contact_nom: form.contact_nom.trim() || null,
        contact_telephone: form.contact_telephone.trim() || null,
        probabilite_closing: prob,
        source_lead: form.source_lead || null,
        notes: form.notes.trim() || null,
      })
      if (e) throw e
      setForm(EMPTY_FORM)
      setShowForm(false)
      setNotice('Prospect ajouté.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, statut: string) {
    const { error: e } = await sb.from('prospects').update({ statut }).eq('id', id)
    if (e) { setError(e.message); return }
    setProspects(cur => cur.map(p => p.id === id ? { ...p, statut } : p))
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer ce prospect ?')) return
    const { error: e } = await sb.from('prospects').delete().eq('id', id)
    if (e) { setError(e.message); return }
    setProspects(cur => cur.filter(p => p.id !== id))
    setNotice('Prospect supprimé.')
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Leads actifs"          value={String(kpis.leadsActifs)}                sub={`${kpis.devisOuverts} devis ouverts`} />
        <KpiCard label="Pipeline pondéré"      value={formatCurrency(kpis.pipelinePondere)}    sub={`Brut ${formatCurrency(kpis.pipelineBrut)}`} />
        <KpiCard label="Conversion 90 jours"   value={`${kpis.conversionTaux}%`}               sub="Leads → Gagné" />
        <KpiCard label="Prospects total"       value={String(prospects.length)}                sub={`${prospects.filter(p => p.statut === 'gagne').length} gagnés`} />
      </div>

      {/* Barre d actions */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle view */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
          {(['kanban', 'liste'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === mode ? 'bg-slate-700 text-white' : 'text-muted hover:text-slate-200'}`}>
              {mode === 'kanban' ? 'Kanban' : 'Liste'}
            </button>
          ))}
        </div>

        {/* Filtre statut */}
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm text-foreground outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg, white)' }}>
          <option value="actif">Pipeline actif</option>
          <option value="tous">Tous</option>
          {ALL_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>

        {/* Recherche */}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher entreprise, ville, secteur..."
          className="flex-1 min-w-[180px] rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg, white)', color: 'var(--text)' }} />

        <button onClick={() => setShowForm(f => !f)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          {showForm ? 'Annuler' : '+ Prospect'}
        </button>
      </div>

      {/* Formulaire d ajout */}
      {showForm && (
        <form onSubmit={event => void handleCreate(event)} className="nx-card p-5 space-y-4">
          <h3 className="text-sm font-semibold">Nouveau prospect</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Entreprise *">
              <input value={form.nom_entreprise} onChange={e => setForm(f => ({ ...f, nom_entreprise: e.target.value }))}
                placeholder="Transport SA" required
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Étape">
              <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                {KANBAN_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Potentiel mensuel (€)">
              <input value={form.montant_mensuel_estime} onChange={e => setForm(f => ({ ...f, montant_mensuel_estime: e.target.value }))}
                placeholder="25000" type="number" min="0"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Commercial">
              <input value={form.commercial_nom} onChange={e => setForm(f => ({ ...f, commercial_nom: e.target.value }))}
                placeholder="Martin D."
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Secteur">
              <input value={form.secteur} onChange={e => setForm(f => ({ ...f, secteur: e.target.value }))}
                placeholder="Agroalimentaire, Retail..."
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Type transport">
              <input value={form.type_transport} onChange={e => setForm(f => ({ ...f, type_transport: e.target.value }))}
                placeholder="Lots complets, Groupage..."
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Ville">
              <input value={form.ville} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                placeholder="Lyon"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Contact principal">
              <input value={form.contact_nom} onChange={e => setForm(f => ({ ...f, contact_nom: e.target.value }))}
                placeholder="Jean Dupont"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Téléphone">
              <input value={form.contact_telephone} onChange={e => setForm(f => ({ ...f, contact_telephone: e.target.value }))}
                placeholder="06 12 34 56 78" type="tel"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Probabilité closing (%)">
              <input value={form.probabilite_closing} onChange={e => setForm(f => ({ ...f, probabilite_closing: e.target.value }))}
                placeholder="40" type="number" min="0" max="100"
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
            <Field label="Source">
              <select value={form.source_lead} onChange={e => setForm(f => ({ ...f, source_lead: e.target.value }))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Flux régulier Lyon-Paris..."
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
            </Field>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
              {saving ? 'Enregistrement...' : 'Ajouter au pipeline'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-xl px-4 py-2 text-sm nx-subtle">
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading && <div className="py-8 text-center text-sm nx-subtle">Chargement du pipeline...</div>}

      {/* ── Vue KANBAN ── */}
      {!loading && viewMode === 'kanban' && (
        <div className="overflow-x-auto nx-scrollbar pb-4">
          <div className="flex gap-4" style={{ minWidth: `${KANBAN_STAGES.length * 260}px` }}>
            {KANBAN_STAGES.map(stage => {
              const cards = filtered.filter(p => p.statut === stage.value)
              return (
                <div key={stage.value} className="flex-1 min-w-[240px] space-y-3">
                  {/* En-tête colonne */}
                  <div className="flex items-center justify-between px-1">
                    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: stage.bg, color: stage.color }}>
                      {stage.label}
                    </span>
                    <span className="text-xs nx-subtle">{cards.length}</span>
                  </div>

                  {/* Cartes */}
                  <div className="space-y-2">
                    {cards.length === 0 && (
                      <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-xs nx-subtle"
                        style={{ borderColor: 'var(--border)' }}>
                        Aucun prospect
                      </div>
                    )}
                    {cards.map(p => {
                      const days = daysSince(p.date_derniere_action ?? p.updated_at)
                      const badge = activityBadge(days)
                      const prob = p.probabilite_closing ?? stage.prob
                      return (
                        <div key={p.id} className="nx-card p-4 space-y-2">
                          {/* Nom */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold leading-tight">{p.nom_entreprise}</p>
                            <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                              style={{ background: badge.bg, color: badge.color }}>
                              {badge.label}
                            </span>
                          </div>

                          {/* Infos */}
                          <div className="space-y-1">
                            {p.montant_mensuel_estime != null && (
                              <p className="text-sm font-semibold" style={{ color: stage.color }}>
                                {formatCurrency(p.montant_mensuel_estime)}<span className="text-xs font-normal nx-subtle">/mois</span>
                              </p>
                            )}
                            {p.commercial_nom && (
                              <p className="text-xs nx-subtle">👤 {p.commercial_nom}</p>
                            )}
                            {p.ville && (
                              <p className="text-xs nx-subtle">📍 {p.ville}</p>
                            )}
                            {p.contact_telephone && (
                              <a href={`tel:${p.contact_telephone}`} className="text-xs nx-subtle hover:text-blue-400">
                                📞 {p.contact_telephone}
                              </a>
                            )}
                          </div>

                          {/* Probabilité */}
                          <div>
                            <div className="flex justify-between text-xs nx-subtle mb-1">
                              <span>Closing</span><span className="font-medium">{prob}%</span>
                            </div>
                            <div className="h-1 rounded-full" style={{ background: 'var(--border)' }}>
                              <div className="h-1 rounded-full transition-all"
                                style={{ width: `${prob}%`, background: stage.color }} />
                            </div>
                          </div>

                          {/* Déplacer vers */}
                          <select
                            value={p.statut}
                            onChange={e => void handleStatusChange(p.id, e.target.value)}
                            className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-foreground outline-none">
                            {ALL_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>

                          {/* Supprimer */}
                          <button onClick={() => void handleDelete(p.id)}
                            className="w-full rounded-lg border px-2 py-1 text-xs nx-subtle hover:text-rose-300 transition-colors"
                            style={{ borderColor: 'var(--border)' }}>
                            Supprimer
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Vue LISTE ── */}
      {!loading && viewMode === 'liste' && (
        <div className="nx-card overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-5 py-8 text-sm nx-subtle">Aucun prospect pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto nx-scrollbar">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {['Compte', 'Étape', 'Potentiel/mois', 'Probabilité', 'Commercial', 'Ville', 'Dernière activité', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const meta = statusMeta(p.statut)
                    const days = daysSince(p.date_derniere_action ?? p.updated_at)
                    const badge = activityBadge(days)
                    return (
                      <tr key={p.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{p.nom_entreprise}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                            style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {p.montant_mensuel_estime != null ? formatCurrency(p.montant_mensuel_estime) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full" style={{ background: 'var(--border)' }}>
                              <div className="h-1.5 rounded-full" style={{ width: `${p.probabilite_closing ?? meta.prob}%`, background: meta.color }} />
                            </div>
                            <span className="text-xs nx-subtle">{p.probabilite_closing ?? meta.prob}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 nx-subtle whitespace-nowrap">{p.commercial_nom ?? '—'}</td>
                        <td className="px-4 py-3 nx-subtle whitespace-nowrap">{p.ville ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <select value={p.statut} onChange={e => void handleStatusChange(p.id, e.target.value)}
                              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-foreground outline-none">
                              {ALL_STATUS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <button onClick={() => void handleDelete(p.id)}
                              className="rounded-lg border border-rose-300/30 px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10">
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
