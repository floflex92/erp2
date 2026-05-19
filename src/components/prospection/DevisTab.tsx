import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type DevisRow = {
  id: string
  numero: string
  prospect_id: string | null
  client_id: string | null
  origine: string
  destination: string
  distance_km: number | null
  type_transport: string
  poids_kg: number | null
  volume_m3: number | null
  prix_propose_ht: number | null
  cout_estime_ht: number | null
  marge_estime_ht: number | null
  marge_pct: number | null
  statut: string
  date_envoi: string | null
  date_validite: string | null
  date_reponse: string | null
  taux_tva: number | null
  notes: string | null
  commercial_nom: string | null
  ot_reference: string | null
  created_at: string
  updated_at: string
}

type ProspectLight = { id: string; nom_entreprise: string }

type OtHistorique = {
  distance_km: number | null
  prix_ht: number | null
  type_transport: string
}

type DevisForm = {
  prospect_id: string
  origine: string
  destination: string
  distance_km: string
  type_transport: string
  poids_kg: string
  volume_m3: string
  marge_cible_pct: string
  date_validite: string
  commercial_nom: string
  notes: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TARIF_PAR_KM: Record<string, number> = {
  complet:  1.95,
  partiel:  2.35,
  groupage: 2.80,
  express:  3.40,
}

const TYPE_TRANSPORT_OPTIONS = [
  { value: 'complet',  label: 'Lot complet' },
  { value: 'partiel',  label: 'Lot partiel' },
  { value: 'groupage', label: 'Groupage' },
  { value: 'express',  label: 'Express' },
]

const STATUT_OPTIONS = [
  { value: 'brouillon', label: 'Brouillon', bg: 'rgba(148,163,184,0.12)', color: '#94a3b8' },
  { value: 'envoye',    label: 'Envoyé',    bg: 'rgba(59,130,246,0.12)',  color: '#93c5fd' },
  { value: 'accepte',   label: 'Accepté',   bg: 'rgba(16,185,129,0.16)',  color: '#6ee7b7' },
  { value: 'refuse',    label: 'Refusé',    bg: 'rgba(239,68,68,0.16)',   color: '#fda4af' },
  { value: 'expire',    label: 'Expiré',    bg: 'rgba(245,158,11,0.14)',  color: '#fdba74' },
]

const EMPTY_FORM: DevisForm = {
  prospect_id: '',
  origine: '',
  destination: '',
  distance_km: '',
  type_transport: 'complet',
  poids_kg: '',
  volume_m3: '',
  marge_cible_pct: '18',
  date_validite: '',
  commercial_nom: '',
  notes: '',
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function formatCurrency(v: number | null | undefined, decimals = 0) {
  if (v == null) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: decimals }).format(v)
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function statutMeta(s: string) {
  return STATUT_OPTIONS.find(o => o.value === s) ?? STATUT_OPTIONS[0]
}

function generateNumero(): string {
  const now = new Date()
  const year = now.getFullYear()
  const seq = String(now.getTime()).slice(-5)
  return `DEV-${year}-${seq}`
}

function defaultValidite(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
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

// ─── Hook calcul prix ─────────────────────────────────────────────────────────
function usePricing(form: DevisForm, historique: OtHistorique[]) {
  return useMemo(() => {
    const km = Number(form.distance_km) || 0
    const type = form.type_transport
    const margePct = Math.max(0, Math.min(60, Number(form.marge_cible_pct) || 18))

    if (km === 0) return null

    const tarif = TARIF_PAR_KM[type] ?? 2.00
    const prixSuggere = Math.round(km * tarif)
    const coutEstime = Math.round(prixSuggere * (1 - margePct / 100))
    const margeEstimee = prixSuggere - coutEstime

    // Historique OT similaires (±20% de distance, même type)
    const similaires = historique.filter(ot =>
      ot.type_transport === type &&
      ot.distance_km != null &&
      ot.prix_ht != null &&
      Math.abs(ot.distance_km - km) <= km * 0.25
    )

    let histoMoy: number | null = null
    let histoMin: number | null = null
    let histoMax: number | null = null
    if (similaires.length > 0) {
      const prix = similaires.map(o => o.prix_ht as number).sort((a, b) => a - b)
      histoMin = prix[0]
      histoMax = prix[prix.length - 1]
      histoMoy = Math.round(prix.reduce((s, p) => s + p, 0) / prix.length)
    }

    return { prixSuggere, coutEstime, margeEstimee, margePct, histoMoy, histoMin, histoMax, nbSimilaires: similaires.length }
  }, [form.distance_km, form.type_transport, form.marge_cible_pct, historique])
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function DevisTab() {
  const [devis, setDevis]         = useState<DevisRow[]>([])
  const [prospects, setProspects] = useState<ProspectLight[]>([])
  const [historique, setHistorique] = useState<OtHistorique[]>([])
  const [form, setForm]           = useState<DevisForm>({ ...EMPTY_FORM, date_validite: defaultValidite() })
  const [filterStatut, setFilterStatut] = useState<string>('tous')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [notice, setNotice]       = useState<string | null>(null)

  const sb = supabase as any
  const pricing = usePricing(form, historique)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: d }, { data: p }, { data: h }] = await Promise.all([
        sb.from('devis_transport').select('*').order('created_at', { ascending: false }),
        sb.from('prospects').select('id, nom_entreprise').order('nom_entreprise', { ascending: true }),
        // Historique OT pour comparaison tarifaire
        sb.from('ordres_transport').select('distance_km, prix_ht, type_transport')
          .not('prix_ht', 'is', null)
          .not('distance_km', 'is', null)
          .in('statut', ['facture', 'livre'])
          .order('created_at', { ascending: false })
          .limit(500),
      ])
      setDevis((d ?? []) as DevisRow[])
      setProspects((p ?? []) as ProspectLight[])
      setHistorique((h ?? []) as OtHistorique[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // Filtrage
  const filteredDevis = useMemo(() => {
    if (filterStatut === 'tous') return devis
    return devis.filter(d => d.statut === filterStatut)
  }, [devis, filterStatut])

  // ── Création devis ──
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.origine.trim() || !form.destination.trim()) { setError('Origine et destination obligatoires.'); return }
    setSaving(true); setError(null); setNotice(null)
    try {
      const km = Number(form.distance_km) || null
      const margePct = Number(form.marge_cible_pct) || 18
      const prixPropose = pricing?.prixSuggere ?? null
      const coutEstime = pricing?.coutEstime ?? null
      const margeEstimee = pricing?.margeEstimee ?? null

      const { error: err } = await sb.from('devis_transport').insert({
        numero: generateNumero(),
        prospect_id: form.prospect_id || null,
        origine: form.origine.trim(),
        destination: form.destination.trim(),
        distance_km: km,
        type_transport: form.type_transport,
        poids_kg: form.poids_kg ? Number(form.poids_kg) : null,
        volume_m3: form.volume_m3 ? Number(form.volume_m3) : null,
        prix_propose_ht: prixPropose,
        cout_estime_ht: coutEstime,
        marge_estime_ht: margeEstimee,
        marge_pct: margePct,
        statut: 'brouillon',
        date_validite: form.date_validite || null,
        commercial_nom: form.commercial_nom.trim() || null,
        notes: form.notes.trim() || null,
        taux_tva: 20,
      })
      if (err) throw err
      setForm({ ...EMPTY_FORM, date_validite: defaultValidite() })
      setShowForm(false)
      setNotice('Devis créé.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    } finally {
      setSaving(false)
    }
  }

  // ── Changement statut ──
  async function handleStatutChange(id: string, statut: string) {
    const extra: Record<string, string | null> = {}
    if (statut === 'envoye') extra.date_envoi = new Date().toISOString().split('T')[0]
    if (['accepte', 'refuse'].includes(statut)) extra.date_reponse = new Date().toISOString().split('T')[0]

    const { error: err } = await sb.from('devis_transport').update({ statut, ...extra }).eq('id', id)
    if (err) { setError(err.message); return }
    setDevis(cur => cur.map(d => d.id === id ? { ...d, statut, ...extra } : d))
    setNotice(`Devis ${statutMeta(statut).label.toLowerCase()}.`)
  }

  // ── Supprimer devis ──
  async function handleDelete(id: string) {
    if (!window.confirm('Supprimer ce devis ?')) return
    const { error: err } = await sb.from('devis_transport').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setDevis(cur => cur.filter(d => d.id !== id))
    setNotice('Devis supprimé.')
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

      {/* KPIs rapides */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Devis total',  val: String(devis.length) },
          { label: 'En cours',     val: String(devis.filter(d => ['brouillon','envoye'].includes(d.statut)).length) },
          { label: 'Acceptés',     val: String(devis.filter(d => d.statut === 'accepte').length) },
          {
            label: 'CA devis envoyés',
            val: formatCurrency(devis.filter(d => ['envoye','negociation','closing'].includes(d.statut))
              .reduce((s, d) => s + (d.prix_propose_ht ?? 0), 0)),
          },
        ].map(k => (
          <div key={k.label} className="nx-card p-4">
            <p className="text-xs nx-subtle">{k.label}</p>
            <p className="mt-1.5 text-xl font-semibold">{k.val}</p>
          </div>
        ))}
      </div>

      {/* Barre actions */}
      <div className="flex flex-wrap items-center gap-3">
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
          className="rounded-xl border px-3 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--border)', background: 'var(--card-bg, white)', color: 'var(--text)' }}>
          <option value="tous">Tous les statuts</option>
          {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setShowForm(f => !f)}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          {showForm ? 'Annuler' : '+ Nouveau devis'}
        </button>
      </div>

      {/* ── Formulaire création devis ── */}
      {showForm && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <form onSubmit={e => void handleCreate(e)} className="nx-card p-5 space-y-4">
            <h3 className="text-sm font-semibold">Nouveau devis transport</h3>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Prospect">
                  <select value={form.prospect_id} onChange={e => setForm(f => ({ ...f, prospect_id: e.target.value }))}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                    <option value="">— Sélectionner un prospect —</option>
                    {prospects.map(p => <option key={p.id} value={p.id}>{p.nom_entreprise}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Origine *">
                <input value={form.origine} onChange={e => setForm(f => ({ ...f, origine: e.target.value }))}
                  placeholder="Paris, Lyon..." required
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <Field label="Destination *">
                <input value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                  placeholder="Bordeaux, Marseille..." required
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <Field label="Distance (km)">
                <input value={form.distance_km} onChange={e => setForm(f => ({ ...f, distance_km: e.target.value }))}
                  placeholder="550" type="number" min="1"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <Field label="Type transport">
                <select value={form.type_transport} onChange={e => setForm(f => ({ ...f, type_transport: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none">
                  {TYPE_TRANSPORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Poids (kg)">
                <input value={form.poids_kg} onChange={e => setForm(f => ({ ...f, poids_kg: e.target.value }))}
                  placeholder="18000" type="number" min="0"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <Field label="Volume (m³)">
                <input value={form.volume_m3} onChange={e => setForm(f => ({ ...f, volume_m3: e.target.value }))}
                  placeholder="82" type="number" min="0"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <Field label="Marge cible (%)">
                <input value={form.marge_cible_pct} onChange={e => setForm(f => ({ ...f, marge_cible_pct: e.target.value }))}
                  placeholder="18" type="number" min="0" max="60"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <Field label="Validité jusqu'au">
                <input value={form.date_validite} onChange={e => setForm(f => ({ ...f, date_validite: e.target.value }))}
                  type="date"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <Field label="Commercial">
                <input value={form.commercial_nom} onChange={e => setForm(f => ({ ...f, commercial_nom: e.target.value }))}
                  placeholder="Martin D."
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none" />
              </Field>
              <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Notes">
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Conditions spéciales, contraintes..." rows={2}
                    className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-foreground outline-none resize-none" />
                </Field>
              </div>
            </div>

            <button type="submit" disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
              {saving ? 'Création...' : 'Créer le devis'}
            </button>
          </form>

          {/* ── Panneau calcul automatique ── */}
          <div className="space-y-4">
            <div className="nx-card p-4 space-y-4">
              <p className="text-sm font-semibold">Calcul automatique</p>

              {!pricing && (
                <p className="text-xs nx-subtle">Renseignez la distance pour voir le calcul.</p>
              )}

              {pricing && (
                <>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs nx-subtle">Tarif/km ({form.type_transport})</span>
                      <span className="text-sm font-medium">{TARIF_PAR_KM[form.type_transport]?.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs nx-subtle">Distance</span>
                      <span className="text-sm font-medium">{form.distance_km} km</span>
                    </div>
                    <div className="h-px" style={{ background: 'var(--border)' }} />
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-semibold">Prix suggéré HT</span>
                      <span className="text-lg font-bold text-emerald-400">{formatCurrency(pricing.prixSuggere)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs nx-subtle">Coût estimé HT</span>
                      <span className="text-sm">{formatCurrency(pricing.coutEstime)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs nx-subtle">Marge estimée</span>
                      <span className="text-sm font-semibold text-amber-400">
                        {formatCurrency(pricing.margeEstimee)} ({pricing.margePct}%)
                      </span>
                    </div>
                  </div>

                  {/* Historique comparatif */}
                  {pricing.nbSimilaires > 0 && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                      <p className="text-xs font-semibold text-sky-300">
                        Historique — {pricing.nbSimilaires} OT similaires
                      </p>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs nx-subtle">Mini</p>
                          <p className="text-sm font-semibold">{formatCurrency(pricing.histoMin)}</p>
                        </div>
                        <div>
                          <p className="text-xs nx-subtle">Moy.</p>
                          <p className="text-sm font-semibold text-sky-300">{formatCurrency(pricing.histoMoy)}</p>
                        </div>
                        <div>
                          <p className="text-xs nx-subtle">Maxi</p>
                          <p className="text-sm font-semibold">{formatCurrency(pricing.histoMax)}</p>
                        </div>
                      </div>
                      {pricing.histoMoy != null && (
                        <p className="text-xs nx-subtle">
                          {pricing.prixSuggere > pricing.histoMoy
                            ? `+${formatCurrency(pricing.prixSuggere - pricing.histoMoy)} vs. historique`
                            : `${formatCurrency(pricing.prixSuggere - pricing.histoMoy)} vs. historique`}
                        </p>
                      )}
                    </div>
                  )}

                  {pricing.nbSimilaires === 0 && Number(form.distance_km) > 0 && (
                    <p className="text-xs nx-subtle italic">Aucun OT similaire dans l'historique.</p>
                  )}
                </>
              )}
            </div>

            {/* Grille tarifs de référence */}
            <div className="nx-card p-4 space-y-2">
              <p className="text-xs font-semibold nx-subtle uppercase tracking-wide">Tarifs de référence</p>
              {Object.entries(TARIF_PAR_KM).map(([type, tarif]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="nx-subtle capitalize">{TYPE_TRANSPORT_OPTIONS.find(o => o.value === type)?.label ?? type}</span>
                  <span className="font-medium">{tarif.toFixed(2)} €/km</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Liste des devis ── */}
      {loading ? (
        <div className="py-8 text-center text-sm nx-subtle">Chargement des devis...</div>
      ) : (
        <div className="nx-card overflow-hidden">
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold">Devis ({filteredDevis.length})</p>
          </div>
          {filteredDevis.length === 0 ? (
            <p className="px-5 py-8 text-sm nx-subtle">Aucun devis pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto nx-scrollbar">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {['N°', 'Prospect', 'Trajet', 'Type', 'Prix HT', 'Marge', 'Statut', 'Validité', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDevis.map(d => {
                    const meta = statutMeta(d.statut)
                    const prospect = prospects.find(p => p.id === d.prospect_id)
                    return (
                      <tr key={d.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{d.numero}</td>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{prospect?.nom_entreprise ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs">{d.origine}</span>
                          <span className="nx-subtle mx-1">→</span>
                          <span className="text-xs">{d.destination}</span>
                          {d.distance_km && <span className="ml-1 text-xs nx-subtle">({d.distance_km} km)</span>}
                        </td>
                        <td className="px-4 py-3 text-xs nx-subtle capitalize whitespace-nowrap">{d.type_transport}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatCurrency(d.prix_propose_ht)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {d.marge_pct != null ? (
                            <span className={`text-sm font-medium ${d.marge_pct >= 15 ? 'text-emerald-400' : d.marge_pct >= 8 ? 'text-amber-400' : 'text-rose-400'}`}>
                              {d.marge_pct.toFixed(1)}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
                            style={{ background: meta.bg, color: meta.color }}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs nx-subtle whitespace-nowrap">{formatDate(d.date_validite)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <select value={d.statut} onChange={e => void handleStatutChange(d.id, e.target.value)}
                              className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-foreground outline-none">
                              {STATUT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <button onClick={() => void handleDelete(d.id)}
                              className="rounded-lg border px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                              style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
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
