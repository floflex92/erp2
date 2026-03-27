import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert } from '@/lib/database.types'

type Client = Tables<'clients'>
type Contact = Tables<'contacts'>

const TYPE_LABELS: Record<string, string> = {
  chargeur: 'Chargeur', transitaire: 'Transitaire', commissionnaire: 'Commissionnaire', autre: 'Autre',
}
const TYPE_COLORS: Record<string, string> = {
  chargeur: 'bg-blue-100 text-blue-700',
  transitaire: 'bg-purple-100 text-purple-700',
  commissionnaire: 'bg-orange-100 text-orange-700',
  autre: 'bg-slate-100 text-slate-600',
}

const EMPTY_CLIENT: TablesInsert<'clients'> = {
  nom: '', type_client: 'chargeur', telephone: null, email: null,
  adresse: null, code_postal: null, ville: null, pays: 'France',
  siret: null, tva_intra: null, conditions_paiement: 30,
  encours_max: null, taux_tva_defaut: 20, notes: null, actif: true,
}

const EMPTY_CONTACT: TablesInsert<'contacts'> = {
  client_id: '', nom: '', prenom: null, poste: null, telephone: null, email: null, principal: false,
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

export default function Clients() {
  const [list, setList] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<TablesInsert<'clients'>>(EMPTY_CLIENT)
  const [saving, setSaving] = useState(false)

  // Detail panel
  const [selected, setSelected] = useState<Client | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState<TablesInsert<'contacts'>>(EMPTY_CONTACT)
  const [savingContact, setSavingContact] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('nom')
    setList(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function loadContacts(clientId: string) {
    setLoadingContacts(true)
    const { data } = await supabase.from('contacts').select('*').eq('client_id', clientId).order('principal', { ascending: false })
    setContacts(data ?? [])
    setLoadingContacts(false)
  }

  function openClient(c: Client) {
    setSelected(c)
    loadContacts(c.id)
  }

  const filtered = list.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.ville ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function setF<K extends keyof TablesInsert<'clients'>>(k: K, v: TablesInsert<'clients'>[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function setCF<K extends keyof TablesInsert<'contacts'>>(k: K, v: TablesInsert<'contacts'>[K]) {
    setContactForm(f => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await supabase.from('clients').insert(form)
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_CLIENT)
    load()
  }

  async function del(id: string) {
    if (!confirm('Supprimer ce client ?')) return
    await supabase.from('clients').delete().eq('id', id)
    if (selected?.id === id) setSelected(null)
    load()
  }

  async function toggleActif(c: Client) {
    await supabase.from('clients').update({ actif: !c.actif }).eq('id', c.id)
    load()
    if (selected?.id === c.id) setSelected({ ...c, actif: !c.actif })
  }

  async function submitContact(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSavingContact(true)
    await supabase.from('contacts').insert({ ...contactForm, client_id: selected.id })
    setSavingContact(false)
    setShowContactForm(false)
    setContactForm(EMPTY_CONTACT)
    loadContacts(selected.id)
  }

  async function delContact(id: string) {
    if (!confirm('Supprimer ce contact ?')) return
    await supabase.from('contacts').delete().eq('id', id)
    if (selected) loadContacts(selected.id)
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Left: list */}
      <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Clients</h2>
            <p className="text-slate-500 text-sm">{list.length} client{list.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            + Ajouter
          </button>
        </div>

        <input
          type="text"
          placeholder="Rechercher par nom ou ville..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-4 px-3 py-2 border border-slate-200 rounded-lg text-sm w-80 outline-none focus:ring-2 focus:ring-slate-300"
        />

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {search ? 'Aucun résultat' : 'Aucun client enregistré'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Client', 'Type', 'Contact', 'Paiement', 'Statut', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr
                    key={c.id}
                    onClick={() => openClient(c)}
                    className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors ${
                      selected?.id === c.id ? 'bg-blue-50' : i % 2 !== 0 ? 'bg-slate-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{c.nom}</div>
                      {c.ville && <div className="text-xs text-slate-400">{c.ville}{c.pays && c.pays !== 'France' ? ` · ${c.pays}` : ''}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLORS[c.type_client] ?? 'bg-slate-100 text-slate-600'}`}>
                        {TYPE_LABELS[c.type_client] ?? c.type_client}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-600">{c.telephone ?? '—'}</div>
                      <div className="text-xs text-slate-400">{c.email ?? ''}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.conditions_paiement ? `${c.conditions_paiement}j` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={ev => { ev.stopPropagation(); del(c.id) }}
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
            {/* Panel header */}
            <div className="flex items-start justify-between p-5 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selected.nom}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[selected.type_client] ?? 'bg-slate-100 text-slate-600'}`}>
                    {TYPE_LABELS[selected.type_client] ?? selected.type_client}
                  </span>
                  <button onClick={() => toggleActif(selected)} className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${selected.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {selected.actif ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
            </div>

            {/* Infos */}
            <div className="p-5 grid grid-cols-2 gap-3 text-sm border-b">
              <Info label="Téléphone" value={selected.telephone} />
              <Info label="Email" value={selected.email} />
              <Info label="SIRET" value={selected.siret} />
              <Info label="TVA intracommunautaire" value={selected.tva_intra} />
              <Info label="Adresse" value={[selected.adresse, selected.code_postal, selected.ville, selected.pays].filter(Boolean).join(', ')} />
              <Info label="Délai paiement" value={selected.conditions_paiement ? `${selected.conditions_paiement} jours` : null} />
              <Info label="Encours max" value={selected.encours_max ? `${selected.encours_max.toLocaleString('fr-FR')} €` : null} />
              <Info label="TVA défaut" value={selected.taux_tva_defaut ? `${selected.taux_tva_defaut}%` : null} />
              {selected.notes && (
                <div className="col-span-2">
                  <span className="text-xs font-medium text-slate-500">Notes</span>
                  <p className="text-slate-600 mt-0.5">{selected.notes}</p>
                </div>
              )}
            </div>

            {/* Contacts */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-700">Contacts</h4>
                <button
                  onClick={() => setShowContactForm(true)}
                  className="text-xs text-slate-600 hover:text-slate-800 border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-50 transition-colors"
                >
                  + Ajouter
                </button>
              </div>

              {loadingContacts ? (
                <p className="text-xs text-slate-400">Chargement...</p>
              ) : contacts.length === 0 ? (
                <p className="text-xs text-slate-400">Aucun contact enregistré</p>
              ) : (
                <div className="space-y-2">
                  {contacts.map(ct => (
                    <div key={ct.id} className="flex items-start justify-between bg-slate-50 rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">
                            {ct.prenom ? `${ct.prenom} ${ct.nom}` : ct.nom}
                          </span>
                          {ct.principal && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Principal</span>
                          )}
                        </div>
                        {ct.poste && <div className="text-xs text-slate-500 mt-0.5">{ct.poste}</div>}
                        <div className="flex gap-3 mt-1">
                          {ct.telephone && <span className="text-xs text-slate-600">{ct.telephone}</span>}
                          {ct.email && <span className="text-xs text-slate-600">{ct.email}</span>}
                        </div>
                      </div>
                      <button onClick={() => delContact(ct.id)} className="text-xs text-slate-300 hover:text-red-400 transition-colors ml-2">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: add client */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Ajouter un client</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Raison sociale *"><input className={inp} value={form.nom} onChange={e => setF('nom', e.target.value)} required /></Field>
                </div>
                <Field label="Type client">
                  <select className={inp} value={form.type_client ?? 'chargeur'} onChange={e => setF('type_client', e.target.value)}>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="SIRET"><input className={inp} value={form.siret ?? ''} onChange={e => setF('siret', e.target.value || null)} /></Field>
                <Field label="TVA intracommunautaire"><input className={inp} value={form.tva_intra ?? ''} onChange={e => setF('tva_intra', e.target.value || null)} /></Field>
                <Field label="Téléphone"><input className={inp} value={form.telephone ?? ''} onChange={e => setF('telephone', e.target.value || null)} /></Field>
                <Field label="Email"><input className={inp} type="email" value={form.email ?? ''} onChange={e => setF('email', e.target.value || null)} /></Field>

                <div className="col-span-2 border-t pt-4 mt-1">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Adresse</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Field label="Adresse"><input className={inp} value={form.adresse ?? ''} onChange={e => setF('adresse', e.target.value || null)} /></Field>
                    </div>
                    <Field label="Code postal"><input className={inp} value={form.code_postal ?? ''} onChange={e => setF('code_postal', e.target.value || null)} /></Field>
                    <Field label="Ville"><input className={inp} value={form.ville ?? ''} onChange={e => setF('ville', e.target.value || null)} /></Field>
                    <Field label="Pays"><input className={inp} value={form.pays ?? 'France'} onChange={e => setF('pays', e.target.value || null)} /></Field>
                  </div>
                </div>

                <div className="col-span-2 border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Conditions commerciales</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Délai paiement (jours)">
                      <input className={inp} type="number" value={form.conditions_paiement ?? 30} onChange={e => setF('conditions_paiement', parseInt(e.target.value) || null)} />
                    </Field>
                    <Field label="Encours max (€)">
                      <input className={inp} type="number" value={form.encours_max ?? ''} onChange={e => setF('encours_max', parseFloat(e.target.value) || null)} />
                    </Field>
                    <Field label="TVA par défaut (%)">
                      <input className={inp} type="number" value={form.taux_tva_defaut ?? 20} onChange={e => setF('taux_tva_defaut', parseFloat(e.target.value) || null)} />
                    </Field>
                  </div>
                </div>

                <div className="col-span-2">
                  <Field label="Notes"><textarea className={`${inp} resize-none h-20`} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value || null)} /></Field>
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

      {/* Modal: add contact */}
      {showContactForm && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">Ajouter un contact — {selected.nom}</h3>
              <button onClick={() => setShowContactForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submitContact} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Nom *"><input className={inp} value={contactForm.nom} onChange={e => setCF('nom', e.target.value)} required /></Field>
                <Field label="Prénom"><input className={inp} value={contactForm.prenom ?? ''} onChange={e => setCF('prenom', e.target.value || null)} /></Field>
                <Field label="Poste"><input className={inp} value={contactForm.poste ?? ''} onChange={e => setCF('poste', e.target.value || null)} /></Field>
                <Field label="Téléphone"><input className={inp} value={contactForm.telephone ?? ''} onChange={e => setCF('telephone', e.target.value || null)} /></Field>
                <div className="col-span-2">
                  <Field label="Email"><input className={inp} type="email" value={contactForm.email ?? ''} onChange={e => setCF('email', e.target.value || null)} /></Field>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="principal" checked={contactForm.principal ?? false} onChange={e => setCF('principal', e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="principal" className="text-sm text-slate-700">Contact principal</label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
                <button type="button" onClick={() => setShowContactForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={savingContact} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {savingContact ? 'Enregistrement...' : 'Enregistrer'}
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
