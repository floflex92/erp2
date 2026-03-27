import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'

type Conducteur = Tables<'conducteurs'>
type Vehicule = Tables<'vehicules'>
type Remorque = Tables<'remorques'>
type Affectation = Tables<'affectations'>

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
  carte_tachy_numero: null, carte_tachy_expiration: null, statut: 'actif',
  notes: null, preferences: null,
}

const EMPTY_AFF: TablesInsert<'affectations'> & { conducteur_id: string } = {
  conducteur_id: '',
  vehicule_id: null,
  remorque_id: null,
  type_affectation: 'fixe',
  date_debut: null,
  date_fin: null,
  notes: null,
}

export default function Chauffeurs() {
  const [list, setList] = useState<Conducteur[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [remorques, setRemorques] = useState<Remorque[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TablesInsert<'conducteurs'>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  // Affectation modal state
  const [affModal, setAffModal] = useState<string | null>(null) // conducteur_id
  const [affForm, setAffForm] = useState(EMPTY_AFF)
  const [affSaving, setAffSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [condRes, vehRes, remRes, affRes] = await Promise.all([
      supabase.from('conducteurs').select('*').order('nom'),
      supabase.from('vehicules').select('*').order('immatriculation'),
      supabase.from('remorques').select('*').order('immatriculation'),
      supabase.from('affectations').select('*').eq('actif', true),
    ])
    setList(condRes.data ?? [])
    setVehicules(vehRes.data ?? [])
    setRemorques(remRes.data ?? [])
    setAffectations(affRes.data ?? [])
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

  // --- Affectation helpers ---
  function currentAff(conducteurId: string) {
    return affectations.find(a => a.conducteur_id === conducteurId) ?? null
  }

  function openAffModal(c: Conducteur) {
    const existing = currentAff(c.id)
    setAffForm(existing
      ? { conducteur_id: c.id, vehicule_id: existing.vehicule_id, remorque_id: existing.remorque_id, type_affectation: existing.type_affectation, date_debut: existing.date_debut, date_fin: existing.date_fin, notes: existing.notes }
      : { ...EMPTY_AFF, conducteur_id: c.id }
    )
    setAffModal(c.id)
  }

  async function saveAff(e: React.FormEvent) {
    e.preventDefault()
    if (!affModal) return
    setAffSaving(true)

    // Désactiver l'affectation précédente si elle existe
    await supabase.from('affectations').update({ actif: false }).eq('conducteur_id', affModal).eq('actif', true)

    // Si camion ET remorque vides → juste désaffectation
    if (!affForm.vehicule_id && !affForm.remorque_id) {
      setAffSaving(false)
      setAffModal(null)
      load()
      return
    }

    await supabase.from('affectations').insert({ ...affForm, conducteur_id: affModal, actif: true })
    setAffSaving(false)
    setAffModal(null)
    load()
  }

  const vehMap = Object.fromEntries(vehicules.map(v => [v.id, v]))
  const remMap = Object.fromEntries(remorques.map(r => [r.id, r]))

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
                {['Conducteur', 'Contact', 'Permis', 'FCO exp.', 'Carte tachy', 'Préférences', 'Affectation', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const aff = currentAff(c.id)
                const veh = aff?.vehicule_id ? vehMap[aff.vehicule_id] : null
                const rem = aff?.remorque_id ? remMap[aff.remorque_id] : null
                return (
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
                    <td className="px-4 py-3 max-w-[160px]">
                      {c.preferences
                        ? <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 whitespace-pre-line">{c.preferences}</p>
                        : <span className="text-xs text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      {aff ? (
                        <div>
                          {veh && <div className="text-slate-700 font-medium">{veh.immatriculation}</div>}
                          {rem && <div className="text-slate-500 text-xs">{rem.immatriculation}</div>}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${aff.type_affectation === 'fixe' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {aff.type_affectation === 'fixe' ? 'Fixe' : 'Temporaire'}
                          </span>
                          {aff.type_affectation === 'temporaire' && aff.date_fin && (
                            <div className="text-xs text-slate-400">jusqu'au {new Date(aff.date_fin).toLocaleDateString('fr-FR')}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                      <button
                        onClick={() => openAffModal(c)}
                        className="mt-1 text-xs text-slate-500 underline hover:text-slate-800 block"
                      >
                        {aff ? 'Modifier' : 'Affecter'}
                      </button>
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
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal ajout conducteur */}
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

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Préférences / Habitudes</p>
                  <p className="text-xs text-slate-400 mb-3">Zones habituelles, types de fret, horaires préférés, langues parlées…</p>
                  <textarea
                    className={`${inp} resize-none`}
                    rows={3}
                    value={form.preferences ?? ''}
                    onChange={e => set('preferences', e.target.value || null)}
                    placeholder="Ex : préfère les trajets nord-est, évite les livraisons nocturnes, parle anglais et allemand"
                  />
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

      {/* Modal affectation véhicule/remorque */}
      {affModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">
                Affecter un véhicule / remorque
              </h3>
              <button onClick={() => setAffModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={saveAff} className="p-6 space-y-4">
              <Field label="Camion">
                <select
                  className={inp}
                  value={affForm.vehicule_id ?? ''}
                  onChange={e => setAffForm(f => ({ ...f, vehicule_id: e.target.value || null }))}
                >
                  <option value="">— Aucun —</option>
                  {vehicules.map(v => (
                    <option key={v.id} value={v.id}>{v.immatriculation}{v.marque ? ` — ${v.marque}` : ''}{v.modele ? ` ${v.modele}` : ''}</option>
                  ))}
                </select>
              </Field>

              <Field label="Remorque">
                <select
                  className={inp}
                  value={affForm.remorque_id ?? ''}
                  onChange={e => setAffForm(f => ({ ...f, remorque_id: e.target.value || null }))}
                >
                  <option value="">— Aucune —</option>
                  {remorques.map(r => (
                    <option key={r.id} value={r.id}>{r.immatriculation}{r.type_remorque ? ` — ${r.type_remorque}` : ''}</option>
                  ))}
                </select>
              </Field>

              <Field label="Type d'affectation">
                <div className="flex gap-3 mt-1">
                  {(['fixe', 'temporaire'] as const).map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="type_aff"
                        value={t}
                        checked={affForm.type_affectation === t}
                        onChange={() => setAffForm(f => ({ ...f, type_affectation: t }))}
                        className="accent-slate-800"
                      />
                      <span className="text-sm capitalize">{t === 'fixe' ? 'Fixe' : 'Temporaire'}</span>
                    </label>
                  ))}
                </div>
              </Field>

              {affForm.type_affectation === 'temporaire' && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Du">
                    <input className={inp} type="date" value={affForm.date_debut ?? ''} onChange={e => setAffForm(f => ({ ...f, date_debut: e.target.value || null }))} />
                  </Field>
                  <Field label="Au">
                    <input className={inp} type="date" value={affForm.date_fin ?? ''} onChange={e => setAffForm(f => ({ ...f, date_fin: e.target.value || null }))} />
                  </Field>
                </div>
              )}

              <Field label="Notes">
                <input className={inp} value={affForm.notes ?? ''} onChange={e => setAffForm(f => ({ ...f, notes: e.target.value || null }))} placeholder="Optionnel" />
              </Field>

              <div className="flex justify-between items-center pt-2 border-t">
                {currentAff(affModal) && (
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:text-red-600"
                    onClick={async () => {
                      await supabase.from('affectations').update({ actif: false }).eq('conducteur_id', affModal).eq('actif', true)
                      setAffModal(null)
                      load()
                    }}
                  >
                    Retirer l'affectation
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={() => setAffModal(null)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                  <button type="submit" disabled={affSaving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                    {affSaving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
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
