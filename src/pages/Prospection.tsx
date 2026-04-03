import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead', tone: { bg: 'rgba(59,130,246,0.12)', color: '#93c5fd' } },
  { value: 'qualification', label: 'Qualification', tone: { bg: 'rgba(14,165,233,0.12)', color: '#7dd3fc' } },
  { value: 'devis_envoye', label: 'Devis envoye', tone: { bg: 'rgba(34,197,94,0.12)', color: '#86efac' } },
  { value: 'negociation', label: 'Negociation', tone: { bg: 'rgba(250,204,21,0.12)', color: '#fde68a' } },
  { value: 'closing', label: 'Closing', tone: { bg: 'rgba(245,158,11,0.12)', color: '#fdba74' } },
  { value: 'gagne', label: 'Gagne', tone: { bg: 'rgba(16,185,129,0.16)', color: '#6ee7b7' } },
  { value: 'perdu', label: 'Perdu', tone: { bg: 'rgba(239,68,68,0.16)', color: '#fda4af' } },
] as const

type ProspectStatus = (typeof STATUS_OPTIONS)[number]['value']

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
}

type ProspectForm = {
  nom_entreprise: string
  statut: ProspectStatus
  montant_mensuel_estime: string
  commercial_nom: string
  secteur: string
  type_transport: string
}

const ACTIVE_STATUSES: ProspectStatus[] = ['lead', 'qualification', 'devis_envoye', 'negociation', 'closing']

const EMPTY_FORM: ProspectForm = {
  nom_entreprise: '',
  statut: 'lead',
  montant_mensuel_estime: '',
  commercial_nom: '',
  secteur: '',
  type_transport: '',
}

function parseStatus(value: string): ProspectStatus {
  const match = STATUS_OPTIONS.find(option => option.value === value)
  return match ? match.value : 'lead'
}

function statusMeta(value: string) {
  return STATUS_OPTIONS.find(option => option.value === value) ?? STATUS_OPTIONS[0]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value)
}

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export default function Prospection() {
  const [prospects, setProspects] = useState<ProspectRow[]>([])
  const [form, setForm] = useState<ProspectForm>(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadProspects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: loadError } = await (supabase
        .from('prospects' as any)
        .select('*')
        .order('updated_at', { ascending: false }) as any)
      if (loadError) throw loadError
      setProspects((data ?? []) as ProspectRow[])
    } catch (err) {
      setProspects([])
      setError(err instanceof Error ? err.message : 'Chargement des prospects impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProspects()
  }, [loadProspects])

  const filteredProspects = useMemo(() => {
    const query = normalizeSearch(search)
    if (!query) return prospects

    return prospects.filter(prospect => {
      const haystack = normalizeSearch([
        prospect.nom_entreprise,
        prospect.commercial_nom ?? '',
        prospect.secteur ?? '',
        prospect.type_transport ?? '',
      ].join(' '))
      return haystack.includes(query)
    })
  }, [prospects, search])

  const kpis = useMemo(() => {
    const now = Date.now()
    const last30Days = now - 30 * 24 * 60 * 60 * 1000

    const leadsActifs = prospects.filter(prospect => ACTIVE_STATUSES.includes(parseStatus(prospect.statut))).length
    const devisOuverts = prospects.filter(prospect => ['devis_envoye', 'negociation', 'closing'].includes(prospect.statut)).length
    const potentielMensuel = prospects.reduce((sum, prospect) => (
      ACTIVE_STATUSES.includes(parseStatus(prospect.statut))
        ? sum + (Number(prospect.montant_mensuel_estime) || 0)
        : sum
    ), 0)
    const recent = prospects.filter(prospect => new Date(prospect.created_at).getTime() >= last30Days)
    const recentWins = recent.filter(prospect => prospect.statut === 'gagne').length
    const conversion30j = recent.length === 0 ? 0 : Math.round((recentWins / recent.length) * 100)

    return {
      leadsActifs,
      devisOuverts,
      potentielMensuel,
      conversion30j,
    }
  }, [prospects])

  async function handleCreateProspect(event: React.FormEvent) {
    event.preventDefault()
    if (!form.nom_entreprise.trim()) {
      setError('Le nom de l entreprise est obligatoire.')
      return
    }

    setSaving(true)
    setError(null)
    setNotice(null)

    try {
      const amount = form.montant_mensuel_estime.trim() === '' ? null : Number(form.montant_mensuel_estime)
      if (amount != null && !Number.isFinite(amount)) {
        throw new Error('Montant mensuel invalide.')
      }

      const { error: insertError } = await (supabase.from('prospects' as any) as any).insert({
        nom_entreprise: form.nom_entreprise.trim(),
        statut: form.statut,
        montant_mensuel_estime: amount,
        commercial_nom: form.commercial_nom.trim() || null,
        secteur: form.secteur.trim() || null,
        type_transport: form.type_transport.trim() || null,
      })
      if (insertError) throw insertError

      setForm(EMPTY_FORM)
      setNotice('Prospect ajoute au pipeline.')
      await loadProspects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation du prospect impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatusChange(id: string, statut: ProspectStatus) {
    setError(null)
    setNotice(null)
    const { error: updateError } = await ((supabase
      .from('prospects' as any)
      .update({ statut })
      .eq('id', id)) as any)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setNotice('Etape du pipeline mise a jour.')
    setProspects(current => current.map(item => item.id === id ? { ...item, statut } : item))
  }

  async function handleDeleteProspect(id: string) {
    setError(null)
    setNotice(null)
    const { error: deleteError } = await ((supabase.from('prospects' as any).delete().eq('id', id)) as any)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setNotice('Prospect supprime.')
    setProspects(current => current.filter(item => item.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] nx-muted">Developpement commercial</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Prospection</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 nx-subtle">
          Pipeline connecte a Supabase: suivi des comptes cibles, des etapes de vente et du potentiel mensuel.
        </p>
      </div>

      {(error || notice) && (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: error ? 'rgba(244,114,182,0.25)' : 'rgba(56,189,248,0.25)',
            background: error ? 'rgba(127,29,29,0.18)' : 'rgba(8,47,73,0.25)',
            color: error ? '#fecdd3' : '#bae6fd',
          }}
        >
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Leads actifs" value={String(kpis.leadsActifs)} />
        <KpiCard label="Devis ouverts" value={String(kpis.devisOuverts)} />
        <KpiCard label="Potentiel mensuel" value={formatCurrency(kpis.potentielMensuel)} />
        <KpiCard label="Conversion 30 jours" value={`${kpis.conversion30j}%`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="nx-card overflow-hidden">
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h3 className="text-base font-semibold">Pipeline commercial</h3>
                <p className="mt-1 text-xs nx-subtle">{filteredProspects.length} prospect(s) affiche(s)</p>
              </div>
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Recherche entreprise, secteur, commercial..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none md:max-w-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto nx-scrollbar">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                  {['Compte', 'Etape', 'Potentiel', 'Responsable', 'Segment', ''].map(column => (
                    <th key={column} className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em]">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td className="px-5 py-6 text-sm nx-subtle" colSpan={6}>Chargement du pipeline...</td>
                  </tr>
                )}

                {!loading && filteredProspects.length === 0 && (
                  <tr>
                    <td className="px-5 py-6 text-sm nx-subtle" colSpan={6}>Aucun prospect pour ce filtre.</td>
                  </tr>
                )}

                {!loading && filteredProspects.map(prospect => {
                  const meta = statusMeta(prospect.statut)
                  return (
                    <tr key={prospect.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                      <td className="px-5 py-4 font-semibold">{prospect.nom_entreprise}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                            style={{ background: meta.tone.bg, color: meta.tone.color }}
                          >
                            {meta.label}
                          </span>
                          <select
                            value={parseStatus(prospect.statut)}
                            onChange={event => void handleStatusChange(prospect.id, event.target.value as ProspectStatus)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 outline-none"
                          >
                            {STATUS_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4">{prospect.montant_mensuel_estime != null ? formatCurrency(prospect.montant_mensuel_estime) : '-'}</td>
                      <td className="px-5 py-4 nx-subtle">{prospect.commercial_nom ?? '-'}</td>
                      <td className="px-5 py-4 nx-subtle">{[prospect.secteur, prospect.type_transport].filter(Boolean).join(' - ') || '-'}</td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleDeleteProspect(prospect.id)}
                          className="rounded-lg border border-rose-300/40 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/10"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <form onSubmit={event => void handleCreateProspect(event)} className="nx-card p-5">
          <h3 className="text-base font-semibold">Ajouter un prospect</h3>
          <p className="mt-1 text-xs nx-subtle">Creation rapide d une opportunite commerciale.</p>

          <div className="mt-4 space-y-3">
            <Field label="Entreprise">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                value={form.nom_entreprise}
                onChange={event => setForm(current => ({ ...current, nom_entreprise: event.target.value }))}
                placeholder="Nom de l entreprise"
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Etape">
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                  value={form.statut}
                  onChange={event => setForm(current => ({ ...current, statut: event.target.value as ProspectStatus }))}
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Potentiel mensuel EUR">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                  value={form.montant_mensuel_estime}
                  onChange={event => setForm(current => ({ ...current, montant_mensuel_estime: event.target.value }))}
                  placeholder="25000"
                />
              </Field>
            </div>

            <Field label="Responsable commercial">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                value={form.commercial_nom}
                onChange={event => setForm(current => ({ ...current, commercial_nom: event.target.value }))}
                placeholder="Nom du commercial"
              />
            </Field>

            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Secteur">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                  value={form.secteur}
                  onChange={event => setForm(current => ({ ...current, secteur: event.target.value }))}
                  placeholder="Agro, Retail, Industrie..."
                />
              </Field>
              <Field label="Type transport">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                  value={form.type_transport}
                  onChange={event => setForm(current => ({ ...current, type_transport: event.target.value }))}
                  placeholder="Frigo, lot complet..."
                />
              </Field>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Ajouter au pipeline'}
          </button>
        </form>
      </div>
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="nx-card p-5">
      <p className="text-sm nx-subtle">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
