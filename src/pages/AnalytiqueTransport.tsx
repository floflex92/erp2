import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Tab = 'synthese' | 'missions' | 'clients' | 'chauffeurs' | 'flotte'

interface MissionAnalytique {
  ot_id: string
  reference: string
  date_chargement: string | null
  statut: string
  vehicule_id: string | null
  conducteur_id: string | null
  client_id: string | null
  client_nom: string | null
  cout_id: string | null
  km_reels: number | null
  cout_carburant: number
  cout_peages: number
  cout_conducteur: number
  cout_amortissement: number
  cout_sous_traitance: number
  cout_autres: number
  cout_total: number
  prix_vente_ht: number
  marge_nette: number
  marge_pct: number | null
  cout_km: number | null
  facture_id: string | null
  facture_statut: string | null
  created_at: string
}

interface Vehicule { id: string; immatriculation: string; marque: string | null; modele: string | null; numero_parc: string | null }
interface Chauffeur { id: string; nom: string; prenom: string | null }

interface CoutForm {
  km_reels: string
  cout_carburant: string
  cout_peages: string
  cout_conducteur: string
  cout_amortissement: string
  cout_sous_traitance: string
  cout_autres: string
  prix_vente_ht: string
  notes: string
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnPrimary = `${btn} bg-slate-800 text-white hover:bg-slate-700`
const btnGhost = `${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
const fmtPct = (n: number) => `${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`
const fmtN = (n: number | null, unit = '') => n !== null ? `${n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}${unit}` : '—'

function exportCSV(headers: string[], rows: string[][], filename: string) {
  const bom = '\uFEFF'
  const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'synthese', label: 'Synthèse' },
    { key: 'missions', label: 'Missions' },
    { key: 'clients', label: 'Clients' },
    { key: 'chauffeurs', label: 'Chauffeurs' },
    { key: 'flotte', label: 'Flotte' },
  ]
  return (
    <div className="flex gap-1 mb-6 border-b border-slate-200">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === t.key ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >{t.label}</button>
      ))}
    </div>
  )
}

function Stat({ label, value, sub, color = 'slate' }: {
  label: string; value: string; sub?: string; color?: 'blue' | 'red' | 'green' | 'slate' | 'amber'
}) {
  const cls = {
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
    red:   'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    slate: 'bg-slate-50 text-slate-800 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[color]
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

function MargeBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-300 text-xs">—</span>
  const color = pct >= 18 ? 'bg-green-100 text-green-700' : pct >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{fmtPct(pct)}</span>
}

// ─── Onglet Synthèse ─────────────────────────────────────────────────────────
function SyntheseTab({ data }: { data: MissionAnalytique[] }) {
  const avecCouts = data.filter(m => m.cout_id !== null)
  const caTotal = data.reduce((s, m) => s + m.prix_vente_ht, 0)
  const coutTotal = avecCouts.reduce((s, m) => s + m.cout_total, 0)
  const margeGlobale = caTotal - coutTotal
  const margePct = caTotal > 0 ? margeGlobale / caTotal * 100 : 0
  const kmTotal = data.reduce((s, m) => s + (m.km_reels ?? 0), 0)
  const coutKmMoyen = kmTotal > 0
    ? data.reduce((s, m) => s + (m.cout_carburant + m.cout_peages), 0) / kmTotal
    : null

  // Top 5 missions
  const topMissions = [...avecCouts]
    .filter(m => m.prix_vente_ht > 0)
    .sort((a, b) => (b.marge_pct ?? 0) - (a.marge_pct ?? 0))
    .slice(0, 5)

  // Pires 5 missions
  const piresMissions = [...avecCouts]
    .filter(m => m.prix_vente_ht > 0)
    .sort((a, b) => (a.marge_pct ?? 0) - (b.marge_pct ?? 0))
    .slice(0, 5)

  // Agrégation clients
  const clientsAgg = useMemo(() => {
    const map: Record<string, { nom: string; ca: number; cout: number }> = {}
    data.forEach(m => {
      const k = m.client_id ?? 'inconnu'
      if (!map[k]) map[k] = { nom: m.client_nom ?? 'Inconnu', ca: 0, cout: 0 }
      map[k].ca += m.prix_vente_ht
      map[k].cout += m.cout_total
    })
    return Object.values(map)
      .map(r => ({ ...r, marge: r.ca - r.cout, pct: r.ca > 0 ? (r.ca - r.cout) / r.ca * 100 : 0 }))
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 5)
  }, [data])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="CA total (missions)" value={fmtEur(caTotal)} color="blue" sub={`${data.length} missions`} />
        <Stat label="Marge nette" value={fmtEur(margeGlobale)}
          color={margePct >= 18 ? 'green' : margePct >= 10 ? 'amber' : 'red'} sub={fmtPct(margePct)} />
        <Stat label="Missions analysées" value={`${avecCouts.length}`} sub={`/ ${data.length} total`} color="slate" />
        <Stat label="Coût/km moyen" value={coutKmMoyen ? `${coutKmMoyen.toFixed(3)} €/km` : '—'}
          sub="carburant + péages" color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Meilleures missions */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-green-50 px-4 py-2.5 border-b border-green-100">
            <h3 className="text-sm font-semibold text-green-800">Top 5 missions (marge)</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {topMissions.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">Saisir les coûts dans l'onglet Missions</p>
            ) : topMissions.map(m => (
              <div key={m.ot_id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.reference}</p>
                  <p className="text-xs text-slate-400">{m.client_nom ?? '—'}</p>
                </div>
                <div className="text-right">
                  <MargeBadge pct={m.marge_pct} />
                  <p className="text-xs text-slate-500 mt-0.5">{fmtEur(m.marge_nette)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Missions sous-performantes */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-2.5 border-b border-red-100">
            <h3 className="text-sm font-semibold text-red-800">5 missions les moins rentables</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {piresMissions.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">Aucune donnée</p>
            ) : piresMissions.map(m => (
              <div key={m.ot_id} className="px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.reference}</p>
                  <p className="text-xs text-slate-400">{m.client_nom ?? '—'}</p>
                </div>
                <div className="text-right">
                  <MargeBadge pct={m.marge_pct} />
                  <p className="text-xs text-slate-500 mt-0.5">{fmtEur(m.marge_nette)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clients sous-rentables */}
      {clientsAgg.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-amber-50 px-4 py-2.5 border-b border-amber-100">
            <h3 className="text-sm font-semibold text-amber-800">Clients à surveiller (marge faible)</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Client', 'CA', 'Coûts', 'Marge €', 'Marge %'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientsAgg.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-800">{r.nom}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{fmtEur(r.ca)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-700">{fmtEur(r.cout)}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${r.marge >= 0 ? 'text-slate-800' : 'text-red-700'}`}>{fmtEur(r.marge)}</td>
                    <td className="px-3 py-2.5"><MargeBadge pct={r.pct} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Formulaire saisie coûts ──────────────────────────────────────────────────
function CoutsMissionForm({ mission, onSaved, onCancel }: {
  mission: MissionAnalytique
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<CoutForm>({
    km_reels: mission.km_reels?.toString() ?? '',
    cout_carburant: mission.cout_carburant > 0 ? mission.cout_carburant.toString() : '',
    cout_peages: mission.cout_peages > 0 ? mission.cout_peages.toString() : '',
    cout_conducteur: mission.cout_conducteur > 0 ? mission.cout_conducteur.toString() : '',
    cout_amortissement: mission.cout_amortissement > 0 ? mission.cout_amortissement.toString() : '',
    cout_sous_traitance: mission.cout_sous_traitance > 0 ? mission.cout_sous_traitance.toString() : '',
    cout_autres: mission.cout_autres > 0 ? mission.cout_autres.toString() : '',
    prix_vente_ht: mission.prix_vente_ht > 0 ? mission.prix_vente_ht.toString() : '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const p = (v: string) => parseFloat(v.replace(',', '.')) || 0
  const totalCouts = p(form.cout_carburant) + p(form.cout_peages) + p(form.cout_conducteur)
    + p(form.cout_amortissement) + p(form.cout_sous_traitance) + p(form.cout_autres)
  const margeCalc = p(form.prix_vente_ht) - totalCouts
  const margePctCalc = p(form.prix_vente_ht) > 0 ? margeCalc / p(form.prix_vente_ht) * 100 : null

  async function sauvegarder() {
    setSaving(true)
    setError(null)
    const payload = {
      ot_id: mission.ot_id,
      km_reels: p(form.km_reels) || null,
      cout_carburant: p(form.cout_carburant) || null,
      cout_peages: p(form.cout_peages) || null,
      cout_conducteur: p(form.cout_conducteur) || null,
      cout_amortissement: p(form.cout_amortissement) || null,
      cout_sous_traitance: p(form.cout_sous_traitance) || null,
      cout_autres: p(form.cout_autres) || null,
      prix_vente_ht: p(form.prix_vente_ht) || null,
      notes: form.notes || null,
    }
    let err
    if (mission.cout_id) {
      const res = await (supabase.from('transport_missions_couts' as any) as any).update(payload).eq('id', mission.cout_id)
      err = res.error
    } else {
      const res = await (supabase.from('transport_missions_couts' as any) as any).insert(payload)
      err = res.error
    }
    if (err) { setError(err.message); setSaving(false); return }
    setSaving(false)
    onSaved()
  }

  const field = (key: keyof CoutForm, label: string, placeholder = '') => (
    <div>
      <label className="text-xs text-slate-500 font-medium block mb-1">{label}</label>
      <input type="text" placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className={inp} />
    </div>
  )

  return (
    <div className="border-t border-slate-100 pt-4 mt-3 space-y-4">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Saisie des coûts</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {field('km_reels', 'Km réels', '0')}
        {field('cout_carburant', 'Carburant (€)', '0.00')}
        {field('cout_peages', 'Péages (€)', '0.00')}
        {field('cout_conducteur', 'Conducteur (€)', '0.00')}
        {field('cout_amortissement', 'Amortissement (€)', '0.00')}
        {field('cout_sous_traitance', 'Sous-traitance (€)', '0.00')}
        {field('cout_autres', 'Autres charges (€)', '0.00')}
        {field('prix_vente_ht', 'Prix facturation HT (€)', '0.00')}
      </div>

      {/* Calcul temps réel */}
      <div className={`rounded-xl p-3 flex gap-6 text-sm ${
        margePctCalc === null ? 'bg-slate-50' :
        margePctCalc >= 18 ? 'bg-green-50 border border-green-100' :
        margePctCalc >= 10 ? 'bg-amber-50 border border-amber-100' : 'bg-red-50 border border-red-100'
      }`}>
        <div><span className="text-xs text-slate-500">Total coûts</span><br/><strong>{fmtEur(totalCouts)}</strong></div>
        <div><span className="text-xs text-slate-500">Marge nette</span><br/><strong className={margeCalc < 0 ? 'text-red-700' : ''}>{fmtEur(margeCalc)}</strong></div>
        {margePctCalc !== null && (
          <div><span className="text-xs text-slate-500">Marge %</span><br/><strong><MargeBadge pct={margePctCalc} /></strong></div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className={btnGhost}>Annuler</button>
        <button onClick={sauvegarder} disabled={saving} className={btnPrimary}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ─── Onglet Missions ──────────────────────────────────────────────────────────
function MissionsTab({ data, onRefresh }: { data: MissionAnalytique[]; onRefresh: () => void }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterMarge, setFilterMarge] = useState('tous')

  const filtered = useMemo(() => {
    let list = [...data]
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(m =>
        m.reference.toLowerCase().includes(s) ||
        (m.client_nom ?? '').toLowerCase().includes(s)
      )
    }
    if (filterMarge === 'rouge') list = list.filter(m => m.cout_id && (m.marge_pct ?? 0) < 10)
    if (filterMarge === 'amber') list = list.filter(m => m.cout_id && (m.marge_pct ?? 0) >= 10 && (m.marge_pct ?? 0) < 18)
    if (filterMarge === 'sans_couts') list = list.filter(m => m.cout_id === null)
    return list.sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
  }, [data, search, filterMarge])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input className={`${inp} flex-1 min-w-[160px]`} placeholder="Rechercher mission ou client..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filterMarge} onChange={e => setFilterMarge(e.target.value)} className={`${inp} w-auto`}>
          <option value="tous">Toutes</option>
          <option value="sans_couts">Sans coûts saisis</option>
          <option value="rouge">Marge &lt; 10%</option>
          <option value="amber">Marge 10-18%</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Aucune mission</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <div key={m.ot_id} className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 cursor-pointer"
                onClick={() => setEditing(editing === m.ot_id ? null : m.ot_id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{m.reference}</p>
                    <p className="text-xs text-slate-400">{m.client_nom ?? '—'} {m.date_chargement ? `· ${m.date_chargement}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {m.cout_id ? (
                    <>
                      <div className="text-right text-xs text-slate-500">
                        <span>{fmtEur(m.prix_vente_ht)}</span>
                        <span className="mx-1">−</span>
                        <span>{fmtEur(m.cout_total)}</span>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold text-sm ${m.marge_nette < 0 ? 'text-red-700' : 'text-slate-800'}`}>{fmtEur(m.marge_nette)}</p>
                        <MargeBadge pct={m.marge_pct} />
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400 italic">Coûts non saisis</span>
                  )}
                  <span className="text-slate-400 text-sm">{editing === m.ot_id ? '▲' : '▼'}</span>
                </div>
              </div>

              {editing === m.ot_id && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs text-slate-500 mb-2">
                    <div>Carburant<br/><strong className="text-slate-700">{fmtEur(m.cout_carburant)}</strong></div>
                    <div>Péages<br/><strong className="text-slate-700">{fmtEur(m.cout_peages)}</strong></div>
                    <div>Conducteur<br/><strong className="text-slate-700">{fmtEur(m.cout_conducteur)}</strong></div>
                    <div>Amort.<br/><strong className="text-slate-700">{fmtEur(m.cout_amortissement)}</strong></div>
                    <div>S/trait.<br/><strong className="text-slate-700">{fmtEur(m.cout_sous_traitance)}</strong></div>
                    <div>Km réels<br/><strong className="text-slate-700">{fmtN(m.km_reels, ' km')}</strong></div>
                  </div>
                  <CoutsMissionForm mission={m} onSaved={() => { setEditing(null); onRefresh() }} onCancel={() => setEditing(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Onglet Clients ───────────────────────────────────────────────────────────
function ClientsTab({ data }: { data: MissionAnalytique[] }) {
  const clients = useMemo(() => {
    const map: Record<string, { nom: string; missions: number; ca: number; cout: number; km: number }> = {}
    data.forEach(m => {
      const k = m.client_id ?? '__inconnu'
      if (!map[k]) map[k] = { nom: m.client_nom ?? 'Inconnu', missions: 0, ca: 0, cout: 0, km: 0 }
      map[k].missions++
      map[k].ca += m.prix_vente_ht
      map[k].cout += m.cout_total
      map[k].km += m.km_reels ?? 0
    })
    return Object.entries(map)
      .map(([, r]) => ({
        ...r,
        marge: r.ca - r.cout,
        pct: r.ca > 0 ? (r.ca - r.cout) / r.ca * 100 : null,
      }))
      .sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999))
  }, [data])

  const moyennePct = useMemo(() => {
    const v = clients.filter(c => c.pct !== null)
    return v.length > 0 ? v.reduce((s, c) => s + (c.pct ?? 0), 0) / v.length : 0
  }, [clients])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-3 gap-3 flex-1 mr-4">
          <Stat label="Marge moyenne" value={fmtPct(moyennePct)}
            color={moyennePct >= 18 ? 'green' : moyennePct >= 10 ? 'amber' : 'red'} />
          <Stat label="Clients analysés" value={String(clients.length)} color="blue" />
          <Stat label="CA total" value={fmtEur(clients.reduce((s, c) => s + c.ca, 0))} color="slate" />
        </div>
        {clients.length > 0 && <button onClick={() => {
          const headers = ['Client', 'Missions', 'CA total', 'Coûts totaux', 'Marge €', 'Marge %', 'Km totaux']
          const rows = clients.map(c => [c.nom, String(c.missions), c.ca.toFixed(2), c.cout.toFixed(2), c.marge.toFixed(2), c.pct !== null ? c.pct.toFixed(1) : '', String(c.km)])
          exportCSV(headers, rows, `analytique-clients-${new Date().toISOString().slice(0, 10)}.csv`)
        }} className={btnGhost}>Exporter CSV</button>}
      </div>

      <p className="text-xs text-slate-400">Les clients sont classés du moins rentable au plus rentable. Ligne orange = marge entre 10 et 18 %. Ligne rouge = marge &lt; 10 %.</p>

      {clients.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Saisir les coûts depuis l'onglet Missions</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Client', 'Missions', 'CA total', 'Coûts totaux', 'Marge €', 'Marge %', 'Km totaux'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c, i) => {
                const rowBg = c.pct !== null && c.pct < 10 ? 'bg-red-50' : c.pct !== null && c.pct < 18 ? 'bg-amber-50' : ''
                return (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 hover:opacity-80 ${rowBg}`}>
                    <td className="px-3 py-3 font-semibold text-slate-800">{c.nom}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{c.missions}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(c.ca)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(c.cout)}</td>
                    <td className={`px-3 py-3 text-right font-bold ${c.marge < 0 ? 'text-red-700' : 'text-slate-800'}`}>{fmtEur(c.marge)}</td>
                    <td className="px-3 py-3"><MargeBadge pct={c.pct} /></td>
                    <td className="px-3 py-3 text-right text-slate-500">{c.km.toLocaleString('fr-FR')} km</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Chauffeurs ────────────────────────────────────────────────────────
function ChauffeurTab({ data, chauffeurs }: { data: MissionAnalytique[]; chauffeurs: Chauffeur[] }) {
  const chauffeurMap = useMemo(() =>
    Object.fromEntries(chauffeurs.map(c => [c.id, `${c.prenom ?? ''} ${c.nom}`.trim()])), [chauffeurs])

  const chauffeurAgg = useMemo(() => {
    const map: Record<string, { nom: string; missions: number; km: number; coutTotal: number; ca: number; coutCarbu: number; coutPeages: number }> = {}
    data.forEach(m => {
      const cId = m.conducteur_id ?? '__sans'
      const nom = chauffeurMap[cId] ?? 'Non affecté'
      if (!map[cId]) map[cId] = { nom, missions: 0, km: 0, coutTotal: 0, ca: 0, coutCarbu: 0, coutPeages: 0 }
      map[cId].missions++
      map[cId].km += m.km_reels ?? 0
      map[cId].coutCarbu += m.cout_carburant
      map[cId].coutPeages += m.cout_peages
      map[cId].coutTotal += m.cout_total
      map[cId].ca += m.prix_vente_ht
    })
    return Object.values(map).sort((a, b) => b.ca - a.ca)
  }, [data, chauffeurMap])

  function doExport() {
    const headers = ['Chauffeur', 'Missions', 'Km totaux', 'Carburant', 'Péages', 'Coûts totaux', 'CA', 'Marge €', 'Marge %', 'Coût/km']
    const rows = chauffeurAgg.map(r => {
      const marge = r.ca - r.coutTotal
      const pct = r.ca > 0 ? (marge / r.ca * 100).toFixed(1) : ''
      const coutKm = r.km > 0 ? ((r.coutCarbu + r.coutPeages) / r.km).toFixed(3) : ''
      return [r.nom, String(r.missions), String(r.km), r.coutCarbu.toFixed(2), r.coutPeages.toFixed(2), r.coutTotal.toFixed(2), r.ca.toFixed(2), marge.toFixed(2), pct, coutKm]
    })
    exportCSV(headers, rows, `analytique-chauffeurs-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">Agrégation par conducteur — CA, coûts, marge et coût/km.</p>
        {chauffeurAgg.length > 0 && <button onClick={doExport} className={btnGhost}>Exporter CSV</button>}
      </div>

      {chauffeurAgg.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Aucune donnée</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Chauffeur', 'Missions', 'Km', 'Carburant', 'Péages', 'Coûts', 'CA', 'Marge', 'Marge %', 'Coût/km'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chauffeurAgg.map((r, i) => {
                const marge = r.ca - r.coutTotal
                const pct = r.ca > 0 ? marge / r.ca * 100 : null
                const coutKm = r.km > 0 ? (r.coutCarbu + r.coutPeages) / r.km : null
                const rowBg = pct !== null && pct < 10 ? 'bg-red-50' : pct !== null && pct < 18 ? 'bg-amber-50' : ''
                return (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 hover:opacity-80 ${rowBg}`}>
                    <td className="px-3 py-3 font-semibold text-slate-800">{r.nom}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{r.missions}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{r.km.toLocaleString('fr-FR')} km</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.coutCarbu)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.coutPeages)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.coutTotal)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.ca)}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${marge < 0 ? 'text-red-700' : 'text-slate-800'}`}>{fmtEur(marge)}</td>
                    <td className="px-3 py-3"><MargeBadge pct={pct} /></td>
                    <td className="px-3 py-3 text-right">
                      {coutKm !== null
                        ? <span className={`text-xs font-semibold ${coutKm > 0.5 ? 'text-red-600' : coutKm > 0.35 ? 'text-amber-600' : 'text-green-700'}`}>
                            {coutKm.toFixed(3)} €/km
                          </span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Flotte ────────────────────────────────────────────────────────────
function FlotteTab({ data, vehicules }: { data: MissionAnalytique[]; vehicules: Vehicule[] }) {
  const vehiculeMap = useMemo(() =>
    Object.fromEntries(vehicules.map(v => [v.id, v])), [vehicules])

  const flotteAgg = useMemo(() => {
    const map: Record<string, { immat: string; missions: number; km: number; coutCarbu: number; coutPeages: number; coutTotal: number; ca: number }> = {}
    data.forEach(m => {
      const vId = m.vehicule_id ?? '__sans'
      const v = vehiculeMap[vId]
      const immat = v ? `${v.immatriculation}${v.numero_parc ? ` (${v.numero_parc})` : ''}` : 'Non affecté'
      if (!map[vId]) map[vId] = { immat, missions: 0, km: 0, coutCarbu: 0, coutPeages: 0, coutTotal: 0, ca: 0 }
      map[vId].missions++
      map[vId].km += m.km_reels ?? 0
      map[vId].coutCarbu += m.cout_carburant
      map[vId].coutPeages += m.cout_peages
      map[vId].coutTotal += m.cout_total
      map[vId].ca += m.prix_vente_ht
    })
    return Object.values(map).sort((a, b) => b.km - a.km)
  }, [data, vehiculeMap])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-400">Coût/km = (carburant + péages) / km réels saisis. Données basées sur les missions avec coûts renseignés.</p>
        {flotteAgg.length > 0 && <button onClick={() => {
          const headers = ['Véhicule', 'Missions', 'Km totaux', 'Carburant', 'Péages', 'Coûts totaux', 'CA', 'Marge', 'Coût/km']
          const rows = flotteAgg.map(r => {
            const coutKm = r.km > 0 ? ((r.coutCarbu + r.coutPeages) / r.km).toFixed(3) : ''
            return [r.immat, String(r.missions), String(r.km), r.coutCarbu.toFixed(2), r.coutPeages.toFixed(2), r.coutTotal.toFixed(2), r.ca.toFixed(2), (r.ca - r.coutTotal).toFixed(2), coutKm]
          })
          exportCSV(headers, rows, `analytique-flotte-${new Date().toISOString().slice(0, 10)}.csv`)
        }} className={btnGhost}>Exporter CSV</button>}
      </div>

      {flotteAgg.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Aucune donnée — saisir les coûts depuis l'onglet Missions</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Véhicule', 'Missions', 'Km totaux', 'Carburant', 'Péages', 'Coûts totaux', 'CA', 'Marge', 'Coût/km'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flotteAgg.map((r, i) => {
                const coutKm = r.km > 0 ? (r.coutCarbu + r.coutPeages) / r.km : null
                const marge = r.ca - r.coutTotal
                return (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-800">{r.immat}</td>
                    <td className="px-3 py-3 text-center text-slate-600">{r.missions}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{r.km.toLocaleString('fr-FR')} km</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.coutCarbu)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.coutPeages)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.coutTotal)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{fmtEur(r.ca)}</td>
                    <td className={`px-3 py-3 text-right font-semibold ${marge < 0 ? 'text-red-700' : 'text-slate-800'}`}>{fmtEur(marge)}</td>
                    <td className="px-3 py-3 text-right">
                      {coutKm !== null
                        ? <span className={`text-xs font-semibold ${coutKm > 0.5 ? 'text-red-600' : coutKm > 0.35 ? 'text-amber-600' : 'text-green-700'}`}>
                            {coutKm.toFixed(3)} €/km
                          </span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AnalytiqueTransport() {
  const [tab, setTab] = useState<Tab>('synthese')
  const [data, setData] = useState<MissionAnalytique[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [missions, vehs, chauf] = await Promise.all([
      (supabase.from('vue_analytique_missions' as any).select('*').order('created_at', { ascending: false }) as any),
      supabase.from('vehicules').select('id, immatriculation, marque, modele, numero_parc').order('immatriculation'),
      supabase.from('conducteurs').select('id, nom, prenom').order('nom'),
    ])
    setData(missions.data ?? [])
    setVehicules(vehs.data ?? [])
    setChauffeurs((chauf.data ?? []) as Chauffeur[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-2">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">Analytique Transport</h1>
        <p className="text-sm text-slate-500 mt-0.5">Rentabilité par mission, client et véhicule — saisie des coûts réels</p>
      </div>
      <TabBar active={tab} onChange={setTab} />
      {loading ? (
        <div className="text-center py-16 text-slate-400">Chargement des données...</div>
      ) : (
        <>
          {tab === 'synthese'  && <SyntheseTab data={data} />}
          {tab === 'missions'  && <MissionsTab data={data} onRefresh={load} />}
          {tab === 'clients'   && <ClientsTab data={data} />}
          {tab === 'chauffeurs' && <ChauffeurTab data={data} chauffeurs={chauffeurs} />}
          {tab === 'flotte'    && <FlotteTab data={data} vehicules={vehicules} />}
        </>
      )}
    </div>
  )
}
