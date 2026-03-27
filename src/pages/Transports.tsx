import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'
import { STATUT_OPS, StatutOpsDot, type StatutOps } from '@/lib/statut-ops'

type OT = Tables<'ordres_transport'>
type EtapeMission = Tables<'etapes_mission'>
type ClientLookup = { id: string; nom: string }
type ConducteurLookup = { id: string; nom: string; prenom: string }
type VehiculeLookup = { id: string; immatriculation: string; marque: string | null }

const STATUT_COLORS: Record<string, string> = {
  brouillon:   'bg-slate-100 text-slate-600',
  confirme:    'bg-blue-100 text-blue-700',
  en_cours:    'bg-yellow-100 text-yellow-700',
  livre:       'bg-green-100 text-green-700',
  facture:     'bg-purple-100 text-purple-700',
  annule:      'bg-red-100 text-red-600',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', confirme: 'Confirmé', en_cours: 'En cours',
  livre: 'Livré', facture: 'Facturé', annule: 'Annulé',
}
const TYPE_TRANSPORT_LABELS: Record<string, string> = {
  complet: 'Complet', partiel: 'Partiel', express: 'Express', groupage: 'Groupage',
}

const EMPTY_OT: TablesInsert<'ordres_transport'> = {
  client_id: '', type_transport: 'complet', statut: 'brouillon',
  nature_marchandise: null, poids_kg: null, volume_m3: null, nombre_colis: null,
  date_chargement_prevue: null, date_livraison_prevue: null,
  conducteur_id: null, vehicule_id: null, remorque_id: null,
  prix_ht: null, taux_tva: 20, distance_km: null,
  numero_cmr: null, numero_bl: null,
  instructions: null, notes_internes: null,
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

export default function Transports() {
  const [list, setList] = useState<OT[]>([])
  const [clients, setClients] = useState<ClientLookup[]>([])
  const [conducteurs, setConducteurs] = useState<ConducteurLookup[]>([])
  const [vehicules, setVehicules] = useState<VehiculeLookup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('tous')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TablesInsert<'ordres_transport'>>(EMPTY_OT)
  const [saving, setSaving] = useState(false)

  // Detail panel
  const [selected, setSelected] = useState<OT | null>(null)
  const [etapes, setEtapes] = useState<EtapeMission[]>([])
  const [loadingEtapes, setLoadingEtapes] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [ots, cls, conds, vehs] = await Promise.all([
      supabase.from('ordres_transport').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, nom').order('nom'),
      supabase.from('conducteurs').select('id, nom, prenom').order('nom'),
      supabase.from('vehicules').select('id, immatriculation, marque').order('immatriculation'),
    ])
    setList(ots.data ?? [])
    setClients(cls.data ?? [])
    setConducteurs(conds.data ?? [])
    setVehicules(vehs.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function loadEtapes(otId: string) {
    setLoadingEtapes(true)
    const { data } = await supabase.from('etapes_mission').select('*').eq('ot_id', otId).order('ordre')
    setEtapes(data ?? [])
    setLoadingEtapes(false)
  }

  function openOT(ot: OT) {
    setSelected(ot)
    loadEtapes(ot.id)
  }

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.nom]))
  const conducteurMap = Object.fromEntries(conducteurs.map(c => [c.id, `${c.prenom} ${c.nom}`]))
  const vehiculeMap = Object.fromEntries(vehicules.map(v => [v.id, `${v.immatriculation}${v.marque ? ` · ${v.marque}` : ''}`]))

  const filtered = list.filter(ot => {
    const matchSearch = ot.reference.toLowerCase().includes(search.toLowerCase()) ||
      (clientMap[ot.client_id] ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'tous' || ot.statut === filterStatut
    return matchSearch && matchStatut
  })

  function setF<K extends keyof TablesInsert<'ordres_transport'>>(k: K, v: TablesInsert<'ordres_transport'>[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_id) return
    setSaving(true)
    await supabase.from('ordres_transport').insert(form)
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_OT)
    loadAll()
  }

  async function updateStatut(ot: OT, statut: string) {
    await supabase.from('ordres_transport').update({ statut }).eq('id', ot.id)
    if (selected?.id === ot.id) setSelected({ ...ot, statut })
    loadAll()
  }

  async function del(id: string) {
    if (!confirm('Supprimer cet ordre de transport ?')) return
    await supabase.from('ordres_transport').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    loadAll()
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left: list */}
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Ordres de Transport</h2>
            <p className="text-slate-500 text-sm">{list.length} OT{list.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            + Nouvel OT
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <input
            type="text"
            placeholder="Référence ou client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-56 outline-none focus:ring-2 focus:ring-slate-300"
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
                {s === 'tous' ? 'Tous' : STATUT_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {search || filterStatut !== 'tous' ? 'Aucun résultat' : 'Aucun ordre de transport enregistré'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Référence', 'Client', 'Type', 'Livraison prévue', 'Conducteur', 'Prix HT', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ot, i) => (
                  <tr
                    key={ot.id}
                    onClick={() => openOT(ot)}
                    className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selected?.id === ot.id ? 'bg-blue-50' : i % 2 !== 0 ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-800 font-mono text-xs">
                      <span className="flex items-center gap-1.5">
                        <StatutOpsDot statut={ot.statut_operationnel} size="sm" />
                        {ot.reference}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{clientMap[ot.client_id] ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_TRANSPORT_LABELS[ot.type_transport] ?? ot.type_transport}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {ot.date_livraison_prevue ? new Date(ot.date_livraison_prevue).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ot.conducteur_id ? conducteurMap[ot.conducteur_id] ?? '—' : <span className="text-slate-300">Non affecté</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {ot.prix_ht != null ? `${ot.prix_ht.toLocaleString('fr-FR')} €` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[ot.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUT_LABELS[ot.statut] ?? ot.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={ev => { ev.stopPropagation(); del(ot.id) }}
                        className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Suppr.
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-full lg:w-[45%] shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <p className="text-xs font-mono text-slate-400 mb-0.5">{selected.reference}</p>
                <h3 className="text-lg font-bold text-slate-800">{clientMap[selected.client_id] ?? '—'}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[selected.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUT_LABELS[selected.statut] ?? selected.statut}
                  </span>
                  <span className="text-xs text-slate-500">{TYPE_TRANSPORT_LABELS[selected.type_transport] ?? selected.type_transport}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            {/* Statut actions */}
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

            {/* Statut opérationnel */}
            <div className="px-5 py-3 border-b bg-slate-50/50">
              <p className="text-xs font-medium text-slate-500 mb-2">Statut opérationnel</p>
              <div className="flex gap-1.5 flex-wrap">
                {(Object.entries(STATUT_OPS) as [StatutOps, typeof STATUT_OPS[StatutOps]][]).map(([k, cfg]) => (
                  <button
                    key={k}
                    onClick={async () => {
                      const newVal = selected.statut_operationnel === k ? null : k
                      await supabase.from('ordres_transport').update({ statut_operationnel: newVal }).eq('id', selected.id)
                      setSelected(s => s ? { ...s, statut_operationnel: newVal } : s)
                      setList(l => l.map(o => o.id === selected.id ? { ...o, statut_operationnel: newVal } : o))
                    }}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all border ${
                      selected.statut_operationnel === k
                        ? `${cfg.dot} text-white border-transparent`
                        : 'border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="p-5 grid grid-cols-2 gap-3 text-sm border-b">
              <Info label="Conducteur" value={selected.conducteur_id ? conducteurMap[selected.conducteur_id] : null} />
              <Info label="Véhicule" value={selected.vehicule_id ? vehiculeMap[selected.vehicule_id] : null} />
              <Info label="Chargement prévu" value={selected.date_chargement_prevue ? new Date(selected.date_chargement_prevue).toLocaleDateString('fr-FR') : null} />
              <Info label="Livraison prévue" value={selected.date_livraison_prevue ? new Date(selected.date_livraison_prevue).toLocaleDateString('fr-FR') : null} />
              <Info label="Livraison réelle" value={selected.date_livraison_reelle ? new Date(selected.date_livraison_reelle).toLocaleDateString('fr-FR') : null} />
              <Info label="Marchandise" value={selected.nature_marchandise} />
              <Info label="Poids" value={selected.poids_kg ? `${selected.poids_kg} kg` : null} />
              <Info label="Volume" value={selected.volume_m3 ? `${selected.volume_m3} m³` : null} />
              <Info label="Nombre de colis" value={selected.nombre_colis?.toString() ?? null} />
              <Info label="Distance" value={selected.distance_km ? `${selected.distance_km} km` : null} />
              <Info label="Prix HT" value={selected.prix_ht != null ? `${selected.prix_ht.toLocaleString('fr-FR')} €` : null} />
              <Info label="TVA" value={selected.taux_tva ? `${selected.taux_tva}%` : null} />
              {selected.prix_ht && selected.taux_tva && (
                <Info label="Prix TTC" value={`${(selected.prix_ht * (1 + selected.taux_tva / 100)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`} />
              )}
              <Info label="N° CMR" value={selected.numero_cmr} />
              <Info label="N° BL" value={selected.numero_bl} />
              {selected.instructions && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-500">Instructions</span>
                  <p className="text-slate-600 mt-0.5 text-sm">{selected.instructions}</p>
                </div>
              )}
              {selected.notes_internes && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-500">Notes internes</span>
                  <p className="text-slate-600 mt-0.5 text-sm">{selected.notes_internes}</p>
                </div>
              )}
            </div>

            {/* Etapes */}
            <div className="p-5">
              <h4 className="text-sm font-semibold text-slate-700 mb-3">Étapes de mission</h4>
              {loadingEtapes ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : etapes.length === 0 ? (
                <p className="text-xs text-slate-400">Aucune étape enregistrée</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-200" />
                  <div className="space-y-3">
                    {etapes.map(et => (
                      <div key={et.id} className="relative flex gap-4 pl-8">
                        <div className={`absolute left-2 top-2 w-3 h-3 rounded-full border-2 ${
                          et.type_etape === 'chargement' ? 'bg-blue-500 border-blue-300' :
                          et.type_etape === 'livraison' ? 'bg-green-500 border-green-300' :
                          'bg-slate-300 border-slate-200'
                        }`} />
                        <div className="flex-1 bg-slate-50 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className={`text-xs font-medium ${
                                et.type_etape === 'chargement' ? 'text-blue-600' :
                                et.type_etape === 'livraison' ? 'text-green-600' : 'text-slate-600'
                              }`}>
                                {et.type_etape === 'chargement' ? 'Chargement' :
                                 et.type_etape === 'livraison' ? 'Livraison' : et.type_etape}
                              </span>
                              <p className="text-sm font-medium text-slate-800 mt-0.5">
                                {et.adresse_libre ?? [et.ville, et.code_postal].filter(Boolean).join(', ')}
                              </p>
                              {et.contact_nom && <p className="text-xs text-slate-500">{et.contact_nom}{et.contact_tel ? ` · ${et.contact_tel}` : ''}</p>}
                            </div>
                            {et.date_prevue && (
                              <span className="text-xs text-slate-500 shrink-0">
                                {new Date(et.date_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                          </div>
                          <span className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full ${
                            et.statut === 'realise' ? 'bg-green-100 text-green-700' :
                            et.statut === 'en_cours' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {et.statut === 'realise' ? 'Réalisé' : et.statut === 'en_cours' ? 'En cours' : 'En attente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: new OT */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Nouvel Ordre de Transport</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Client *">
                    <select className={inp} value={form.client_id} onChange={e => setF('client_id', e.target.value)} required>
                      <option value="">Sélectionner un client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Type de transport">
                  <select className={inp} value={form.type_transport ?? 'complet'} onChange={e => setF('type_transport', e.target.value)}>
                    {Object.entries(TYPE_TRANSPORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Statut initial">
                  <select className={inp} value={form.statut ?? 'brouillon'} onChange={e => setF('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>

                <div className="col-span-2 border-t pt-4 mt-1">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Planification</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Date de chargement"><input className={inp} type="datetime-local" value={form.date_chargement_prevue ?? ''} onChange={e => setF('date_chargement_prevue', e.target.value || null)} /></Field>
                    <Field label="Date de livraison"><input className={inp} type="datetime-local" value={form.date_livraison_prevue ?? ''} onChange={e => setF('date_livraison_prevue', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Ressources</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Conducteur">
                      <select className={inp} value={form.conducteur_id ?? ''} onChange={e => setF('conducteur_id', e.target.value || null)}>
                        <option value="">— Non affecté</option>
                        {conducteurs.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                      </select>
                    </Field>
                    <Field label="Véhicule">
                      <select className={inp} value={form.vehicule_id ?? ''} onChange={e => setF('vehicule_id', e.target.value || null)}>
                        <option value="">— Non affecté</option>
                        {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}{v.marque ? ` · ${v.marque}` : ''}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Marchandise</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Field label="Nature de la marchandise"><input className={inp} value={form.nature_marchandise ?? ''} onChange={e => setF('nature_marchandise', e.target.value || null)} /></Field>
                    </div>
                    <Field label="Poids (kg)"><input className={inp} type="number" value={form.poids_kg ?? ''} onChange={e => setF('poids_kg', parseFloat(e.target.value) || null)} /></Field>
                    <Field label="Volume (m³)"><input className={inp} type="number" value={form.volume_m3 ?? ''} onChange={e => setF('volume_m3', parseFloat(e.target.value) || null)} /></Field>
                    <Field label="Nombre de colis"><input className={inp} type="number" value={form.nombre_colis ?? ''} onChange={e => setF('nombre_colis', parseInt(e.target.value) || null)} /></Field>
                    <Field label="Distance (km)"><input className={inp} type="number" value={form.distance_km ?? ''} onChange={e => setF('distance_km', parseFloat(e.target.value) || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Tarification</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Prix HT (€)"><input className={inp} type="number" step="0.01" value={form.prix_ht ?? ''} onChange={e => setF('prix_ht', parseFloat(e.target.value) || null)} /></Field>
                    <Field label="TVA (%)"><input className={inp} type="number" value={form.taux_tva ?? 20} onChange={e => setF('taux_tva', parseFloat(e.target.value) || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Documents</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="N° CMR"><input className={inp} value={form.numero_cmr ?? ''} onChange={e => setF('numero_cmr', e.target.value || null)} /></Field>
                    <Field label="N° BL"><input className={inp} value={form.numero_bl ?? ''} onChange={e => setF('numero_bl', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2">
                  <Field label="Instructions chauffeur"><textarea className={`${inp} resize-none h-16`} value={form.instructions ?? ''} onChange={e => setF('instructions', e.target.value || null)} /></Field>
                </div>
                <div className="col-span-2">
                  <Field label="Notes internes"><textarea className={`${inp} resize-none h-16`} value={form.notes_internes ?? ''} onChange={e => setF('notes_internes', e.target.value || null)} /></Field>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : "Créer l'OT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
