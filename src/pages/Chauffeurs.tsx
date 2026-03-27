import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'

type Conducteur = Tables<'conducteurs'>

const STATUT_COLORS: Record<string, string> = {
  actif:          'bg-green-100 text-green-700',
  inactif:        'bg-slate-100 text-slate-600',
  conge:          'bg-blue-100 text-blue-700',
  arret_maladie:  'bg-red-100 text-red-700',
}
const STATUT_LABELS: Record<string, string> = {
  actif: 'Actif', inactif: 'Inactif', conge: 'Congé', arret_maladie: 'Arrêt maladie',
}

function expColor(date: string | null) {
  if (!date) return 'text-slate-400'
  const d = (new Date(date).getTime() - Date.now()) / 86400000
  return d < 0 ? 'text-red-600 font-semibold' : d < 60 ? 'text-orange-500 font-semibold' : 'text-slate-600'
}

const EMPTY: TablesInsert<'conducteurs'> = {
  nom: '', prenom: '', telephone: null, email: null, adresse: null,
  date_naissance: null, numero_permis: null, permis_categories: [],
  permis_expiration: null, fimo_date: null, fco_date: null, fco_expiration: null,
  carte_tachy_numero: null, carte_tachy_expiration: null, statut: 'actif', notes: null,
}

export default function Chauffeurs() {
  const [list, setList] = useState<Conducteur[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TablesInsert<'conducteurs'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('conducteurs').select('*').order('nom')
    setList(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = list.filter(c =>
    `${c.nom} ${c.prenom}`.toLowerCase().includes(search.toLowerCase())
  )

  function set<K extends keyof TablesInsert<'conducteurs'>>(k: K, v: TablesInsert<'conducteurs'>[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('conducteurs').insert(form)
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY)
    load()
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce conducteur ?')) return
    await supabase.from('conducteurs').delete().eq('id', id)
    load()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Conducteurs</h2>
          <p className="text-slate-500 text-sm">{list.length} conducteur{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          + Ajouter
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Rechercher..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 px-3 py-2 border border-slate-200 rounded-lg text-sm w-72 outline-none focus:ring-2 focus:ring-slate-300"
      />

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? 'Aucun résultat' : 'Aucun conducteur enregistré'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Conducteur', 'Contact', 'Permis', 'FCO exp.', 'Carte tachy', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{c.nom} {c.prenom}</div>
                    {c.date_naissance && <div className="text-xs text-slate-400">{new Date(c.date_naissance).toLocaleDateString('fr-FR')}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-600">{c.telephone ?? '—'}</div>
                    <div className="text-xs text-slate-400">{c.email ?? ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{c.numero_permis ?? '—'}</div>
                    <div className={`text-xs ${expColor(c.permis_expiration)}`}>
                      {c.permis_expiration ? `exp. ${new Date(c.permis_expiration).toLocaleDateString('fr-FR')}` : ''}
                    </div>
                    {c.permis_categories && c.permis_categories.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {c.permis_categories.map(cat => (
                          <span key={cat} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{cat}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm ${expColor(c.fco_expiration)}`}>
                      {c.fco_expiration ? new Date(c.fco_expiration).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>{c.carte_tachy_numero ?? '—'}</div>
                    <div className={`text-xs ${expColor(c.carte_tachy_expiration)}`}>
                      {c.carte_tachy_expiration ? `exp. ${new Date(c.carte_tachy_expiration).toLocaleDateString('fr-FR')}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[c.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUT_LABELS[c.statut] ?? c.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(c.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Ajouter un conducteur</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nom *"><input className={inp} value={form.nom} onChange={e => set('nom', e.target.value)} required /></Field>
                <Field label="Prénom *"><input className={inp} value={form.prenom} onChange={e => set('prenom', e.target.value)} required /></Field>
                <Field label="Téléphone"><input className={inp} value={form.telephone ?? ''} onChange={e => set('telephone', e.target.value || null)} /></Field>
                <Field label="Email"><input className={inp} type="email" value={form.email ?? ''} onChange={e => set('email', e.target.value || null)} /></Field>
                <Field label="Date de naissance"><input className={inp} type="date" value={form.date_naissance ?? ''} onChange={e => set('date_naissance', e.target.value || null)} /></Field>
                <Field label="Statut">
                  <select className={inp} value={form.statut ?? 'actif'} onChange={e => set('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>

                <div className="col-span-2 border-t pt-4 mt-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Permis de conduire</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Numéro"><input className={inp} value={form.numero_permis ?? ''} onChange={e => set('numero_permis', e.target.value || null)} /></Field>
                    <Field label="Expiration"><input className={inp} type="date" value={form.permis_expiration ?? ''} onChange={e => set('permis_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">FCO / FIMO</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date FIMO"><input className={inp} type="date" value={form.fimo_date ?? ''} onChange={e => set('fimo_date', e.target.value || null)} /></Field>
                    <Field label="Date FCO"><input className={inp} type="date" value={form.fco_date ?? ''} onChange={e => set('fco_date', e.target.value || null)} /></Field>
                    <Field label="Expiration FCO"><input className={inp} type="date" value={form.fco_expiration ?? ''} onChange={e => set('fco_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Carte conducteur tachygraphe</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Numéro carte"><input className={inp} value={form.carte_tachy_numero ?? ''} onChange={e => set('carte_tachy_numero', e.target.value || null)} /></Field>
                    <Field label="Expiration"><input className={inp} type="date" value={form.carte_tachy_expiration ?? ''} onChange={e => set('carte_tachy_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
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
