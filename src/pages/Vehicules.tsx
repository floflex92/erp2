import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'

type Vehicule = Tables<'vehicules'>

const TYPE_LABELS: Record<string, string> = {
  tracteur: 'Tracteur', porteur: 'Porteur', semi: 'Semi-remorque',
  remorque: 'Remorque', utilitaire: 'Utilitaire',
}
const STATUT_COLORS: Record<string, string> = {
  disponible:  'bg-green-100 text-green-700',
  en_service:  'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  hs:          'bg-red-100 text-red-700',
  vendu:       'bg-slate-100 text-slate-500',
}
const STATUT_LABELS: Record<string, string> = {
  disponible: 'Disponible', en_service: 'En service',
  maintenance: 'Maintenance', hs: 'Hors service', vendu: 'Vendu',
}

function expColor(date: string | null) {
  if (!date) return 'text-slate-400'
  const d = (new Date(date).getTime() - Date.now()) / 86400000
  return d < 0 ? 'text-red-600 font-semibold' : d < 60 ? 'text-orange-500 font-semibold' : 'text-slate-600'
}

const EMPTY: TablesInsert<'vehicules'> = {
  immatriculation: '', marque: null, modele: null, annee: null,
  type_vehicule: 'tracteur', ptac_kg: null, ct_date: null, ct_expiration: null,
  assurance_expiration: null, vignette_expiration: null, tachy_serie: null,
  tachy_etalonnage: null, tachy_etalonnage_prochain: null,
  km_actuel: 0, km_dernier_entretien: null, km_prochain_entretien: null,
  statut: 'disponible', notes: null,
}

export default function Vehicules() {
  const [list, setList] = useState<Vehicule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TablesInsert<'vehicules'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('vehicules').select('*').order('immatriculation')
    setList(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = list.filter(v =>
    `${v.immatriculation} ${v.marque ?? ''} ${v.modele ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  function set<K extends keyof TablesInsert<'vehicules'>>(k: K, v: TablesInsert<'vehicules'>[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('vehicules').insert(form)
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY)
    load()
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce véhicule ?')) return
    await supabase.from('vehicules').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Véhicules</h2>
          <p className="text-slate-500 text-sm">{list.length} véhicule{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
          + Ajouter
        </button>
      </div>

      <input
        type="text"
        placeholder="Immatriculation, marque..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 px-3 py-2 border border-slate-200 rounded-lg text-sm w-72 outline-none focus:ring-2 focus:ring-slate-300"
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">{search ? 'Aucun résultat' : 'Aucun véhicule enregistré'}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Véhicule', 'Type', 'CT', 'Assurance', 'Tachygraphe', 'Km', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v, i) => (
                <tr key={v.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium font-mono text-slate-800">{v.immatriculation}</div>
                    <div className="text-xs text-slate-400">{v.marque} {v.modele} {v.annee ? `(${v.annee})` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABELS[v.type_vehicule] ?? v.type_vehicule}</td>
                  <td className="px-4 py-3">
                    <span className={expColor(v.ct_expiration)}>
                      {v.ct_expiration ? new Date(v.ct_expiration).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={expColor(v.assurance_expiration)}>
                      {v.assurance_expiration ? new Date(v.assurance_expiration).toLocaleDateString('fr-FR') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-slate-500">{v.tachy_serie ?? '—'}</div>
                    <div className={`text-xs ${expColor(v.tachy_etalonnage_prochain)}`}>
                      {v.tachy_etalonnage_prochain ? `Étal. ${new Date(v.tachy_etalonnage_prochain).toLocaleDateString('fr-FR')}` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.km_actuel ? v.km_actuel.toLocaleString('fr-FR') : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[v.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                      {STATUT_LABELS[v.statut] ?? v.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => del(v.id)} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Ajouter un véhicule</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Immatriculation *"><input className={inp} value={form.immatriculation} onChange={e => set('immatriculation', e.target.value.toUpperCase())} required /></Field>
                <Field label="Type *">
                  <select className={inp} value={form.type_vehicule ?? 'tracteur'} onChange={e => set('type_vehicule', e.target.value)}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Marque"><input className={inp} value={form.marque ?? ''} onChange={e => set('marque', e.target.value || null)} /></Field>
                <Field label="Modèle"><input className={inp} value={form.modele ?? ''} onChange={e => set('modele', e.target.value || null)} /></Field>
                <Field label="Année"><input className={inp} type="number" value={form.annee ?? ''} onChange={e => set('annee', e.target.value ? parseInt(e.target.value) : null)} /></Field>
                <Field label="PTAC (kg)"><input className={inp} type="number" value={form.ptac_kg ?? ''} onChange={e => set('ptac_kg', e.target.value ? parseInt(e.target.value) : null)} /></Field>
                <Field label="Km actuel"><input className={inp} type="number" value={form.km_actuel ?? ''} onChange={e => set('km_actuel', e.target.value ? parseInt(e.target.value) : 0)} /></Field>
                <Field label="Statut">
                  <select className={inp} value={form.statut ?? 'disponible'} onChange={e => set('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>

                <div className="col-span-2 border-t pt-4 mt-2">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Documents</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date CT"><input className={inp} type="date" value={form.ct_date ?? ''} onChange={e => set('ct_date', e.target.value || null)} /></Field>
                    <Field label="Expiration CT"><input className={inp} type="date" value={form.ct_expiration ?? ''} onChange={e => set('ct_expiration', e.target.value || null)} /></Field>
                    <Field label="Expiration assurance"><input className={inp} type="date" value={form.assurance_expiration ?? ''} onChange={e => set('assurance_expiration', e.target.value || null)} /></Field>
                    <Field label="Expiration vignette"><input className={inp} type="date" value={form.vignette_expiration ?? ''} onChange={e => set('vignette_expiration', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Tachygraphe</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="N° série"><input className={inp} value={form.tachy_serie ?? ''} onChange={e => set('tachy_serie', e.target.value || null)} /></Field>
                    <Field label="Dernier étalonnage"><input className={inp} type="date" value={form.tachy_etalonnage ?? ''} onChange={e => set('tachy_etalonnage', e.target.value || null)} /></Field>
                    <Field label="Prochain étalonnage"><input className={inp} type="date" value={form.tachy_etalonnage_prochain ?? ''} onChange={e => set('tachy_etalonnage_prochain', e.target.value || null)} /></Field>
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
