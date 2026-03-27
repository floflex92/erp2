import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'

type Facture = Tables<'factures'>
type ClientLookup = { id: string; nom: string }
type OTLookup = { id: string; reference: string; client_id: string }

const STATUT_COLORS: Record<string, string> = {
  brouillon:  'bg-slate-100 text-slate-600',
  envoyee:    'bg-blue-100 text-blue-700',
  payee:      'bg-green-100 text-green-700',
  en_retard:  'bg-red-100 text-red-600',
  annulee:    'bg-slate-100 text-slate-400',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée', en_retard: 'En retard', annulee: 'Annulée',
}
const MODE_PAIEMENT_LABELS: Record<string, string> = {
  virement: 'Virement', cheque: 'Chèque', prelevement: 'Prélèvement', especes: 'Espèces',
}

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

export default function Facturation() {
  const [list, setList] = useState<Facture[]>([])
  const [clients, setClients] = useState<ClientLookup[]>([])
  const [ots, setOts] = useState<OTLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    ot_id: null as string | null,
    montant_ht: 0,
    taux_tva: 20,
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: null as string | null,
    statut: 'brouillon',
    mode_paiement: null as string | null,
    notes: null as string | null,
  })
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState<Facture | null>(null)

  async function loadAll() {
    setLoading(true)
    const [facts, cls, otList] = await Promise.all([
      supabase.from('factures').select('*').order('date_emission', { ascending: false }),
      supabase.from('clients').select('id, nom').order('nom'),
      supabase.from('ordres_transport').select('id, reference, client_id').order('reference'),
    ])
    setList(facts.data ?? [])
    setClients(cls.data ?? [])
    setOts(otList.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.nom]))
  const otMap = Object.fromEntries(ots.map(o => [o.id, o.reference]))

  const filtered = list.filter(f => {
    const matchSearch =
      f.numero.toLowerCase().includes(search.toLowerCase()) ||
      (clientMap[f.client_id] ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'tous' || f.statut === filterStatut
    return matchSearch && matchStatut
  })

  // stats
  const totalEnAttente = list.filter(f => f.statut === 'envoyee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0)
  const totalEnRetard = list.filter(f => f.statut === 'en_retard').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0)
  const totalPayeeMois = (() => {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    return list
      .filter(f => f.statut === 'payee' && f.date_paiement && f.date_paiement >= startOfMonth)
      .reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0)
  })()

  function setF<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const montant_tva = form.montant_ht * (form.taux_tva / 100)
    const montant_ttc = form.montant_ht + montant_tva
    await supabase.from('factures').insert({
      ...form,
      montant_tva,
      montant_ttc,
    })
    setSaving(false)
    setShowForm(false)
    loadAll()
  }

  async function updateStatut(f: Facture, statut: string) {
    const extra: Record<string, string | null> = {}
    if (statut === 'payee') extra.date_paiement = new Date().toISOString().split('T')[0]
    await supabase.from('factures').update({ statut, ...extra }).eq('id', f.id)
    if (selected?.id === f.id) setSelected({ ...f, statut })
    loadAll()
  }

  async function del(id: string) {
    if (!confirm('Supprimer cette facture ?')) return
    await supabase.from('factures').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    loadAll()
  }

  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

  // filter OTs by client
  const clientOts = form.client_id ? ots.filter(o => o.client_id === form.client_id) : ots

  return (
    <div className="flex gap-6 h-full">
      {/* Left */}
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Facturation</h2>
            <p className="text-slate-500 text-sm">{list.length} facture{list.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            + Nouvelle facture
          </button>
        </div>

        {/* Mini-stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <MiniStat label="En attente de paiement" value={fmtEur(totalEnAttente)} color="blue" />
          <MiniStat label="En retard" value={fmtEur(totalEnRetard)} color="red" />
          <MiniStat label="Encaissé ce mois" value={fmtEur(totalPayeeMois)} color="green" />
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="N° facture ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-52 outline-none focus:ring-2 focus:ring-slate-300"
          />
          <div className="flex gap-1 flex-wrap">
            {['tous', ...Object.keys(STATUT_LABELS)].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatut(s)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  filterStatut === s ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {s === 'tous' ? 'Toutes' : STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {search || filterStatut !== 'tous' ? 'Aucun résultat' : 'Aucune facture enregistrée'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Numéro', 'Client', 'Émission', 'Échéance', 'Montant HT', 'TTC', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => {
                  const isLate = f.statut === 'envoyee' && f.date_echeance && new Date(f.date_echeance) < new Date()
                  return (
                    <tr
                      key={f.id}
                      onClick={() => setSelected(f)}
                      className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                        selected?.id === f.id ? 'bg-blue-50' : i % 2 !== 0 ? 'bg-slate-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{f.numero}</td>
                      <td className="px-4 py-3 text-slate-700">{clientMap[f.client_id] ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                      <td className={`px-4 py-3 ${isLate ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                        {f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{fmtEur(f.montant_ht)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{f.montant_ttc != null ? fmtEur(f.montant_ttc) : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[f.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                          {STATUT_LABELS[f.statut] ?? f.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={ev => { ev.stopPropagation(); del(f.id) }}
                          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: detail */}
      {selected && (
        <div className="w-full lg:w-[42%] shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <p className="text-xs font-mono text-slate-400 mb-0.5">{selected.numero}</p>
                <h3 className="text-lg font-bold text-slate-800">{clientMap[selected.client_id] ?? '—'}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[selected.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUT_LABELS[selected.statut] ?? selected.statut}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            {/* Actions statut */}
            <div className="px-5 py-3 border-b bg-slate-50">
              <p className="text-xs font-medium text-slate-500 mb-2">Changer le statut</p>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(STATUT_LABELS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => updateStatut(selected, k)}
                    disabled={selected.statut === k}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      selected.statut === k
                        ? 'bg-slate-200 text-slate-500 cursor-default'
                        : 'border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 gap-4 text-sm">
              <Info label="OT lié" value={selected.ot_id ? otMap[selected.ot_id] : null} />
              <Info label="Date d'émission" value={new Date(selected.date_emission).toLocaleDateString('fr-FR')} />
              <Info label="Date d'échéance" value={selected.date_echeance ? new Date(selected.date_echeance).toLocaleDateString('fr-FR') : null} />
              <Info label="Date de paiement" value={selected.date_paiement ? new Date(selected.date_paiement).toLocaleDateString('fr-FR') : null} />
              <Info label="Mode de paiement" value={selected.mode_paiement ? MODE_PAIEMENT_LABELS[selected.mode_paiement] ?? selected.mode_paiement : null} />
              <div className="col-span-2 border-t pt-4 mt-1">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Montant HT</span>
                    <span className="font-medium text-slate-800">{fmtEur(selected.montant_ht)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">TVA ({selected.taux_tva}%)</span>
                    <span className="text-slate-600">{fmtEur(selected.montant_tva ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 mt-1">
                    <span className="font-semibold text-slate-700">Total TTC</span>
                    <span className="font-bold text-slate-900 text-base">{fmtEur(selected.montant_ttc ?? selected.montant_ht)}</span>
                  </div>
                </div>
              </div>
              {selected.notes && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-500">Notes</span>
                  <p className="text-slate-600 mt-0.5">{selected.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: new invoice */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">Nouvelle facture</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Client *">
                    <select className={inp} value={form.client_id} onChange={e => { setF('client_id', e.target.value); setF('ot_id', null) }} required>
                      <option value="">Sélectionner un client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="OT lié (optionnel)">
                    <select className={inp} value={form.ot_id ?? ''} onChange={e => setF('ot_id', e.target.value || null)}>
                      <option value="">— Aucun OT</option>
                      {clientOts.map(o => <option key={o.id} value={o.id}>{o.reference}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Montant HT (€) *">
                  <input className={inp} type="number" step="0.01" value={form.montant_ht || ''} onChange={e => setF('montant_ht', parseFloat(e.target.value) || 0)} required />
                </Field>
                <Field label="TVA (%)">
                  <input className={inp} type="number" value={form.taux_tva} onChange={e => setF('taux_tva', parseFloat(e.target.value) || 20)} />
                </Field>
                <Field label="Date d'émission">
                  <input className={inp} type="date" value={form.date_emission} onChange={e => setF('date_emission', e.target.value)} />
                </Field>
                <Field label="Date d'échéance">
                  <input className={inp} type="date" value={form.date_echeance ?? ''} onChange={e => setF('date_echeance', e.target.value || null)} />
                </Field>
                <Field label="Statut">
                  <select className={inp} value={form.statut} onChange={e => setF('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Mode de paiement">
                  <select className={inp} value={form.mode_paiement ?? ''} onChange={e => setF('mode_paiement', e.target.value || null)}>
                    <option value="">—</option>
                    {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Notes"><textarea className={`${inp} resize-none h-16`} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value || null)} /></Field>
                </div>
                {form.montant_ht > 0 && (
                  <div className="col-span-2 bg-slate-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>HT</span><span>{fmtEur(form.montant_ht)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>TVA {form.taux_tva}%</span><span>{fmtEur(form.montant_ht * form.taux_tva / 100)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-800 border-t pt-1.5 mt-1.5">
                      <span>TTC</span><span>{fmtEur(form.montant_ht * (1 + form.taux_tva / 100))}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Créer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: string; color: 'blue' | 'red' | 'green' }) {
  const cls = {
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
    red:   'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
  }[color]
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className="text-slate-700 mt-0.5">{value || '—'}</p>
    </div>
  )
}
