import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────
type ProspectLight = {
  id: string
  nom_entreprise: string
  statut: string
  commercial_nom: string | null
  ville: string | null
}

type ContactRow = {
  id: string
  prospect_id: string
  nom: string
  prenom: string | null
  poste: string | null
  telephone: string | null
  email: string | null
  canal_preference: string
  est_principal: boolean
  notes: string | null
  created_at: string
}

type ActionRow = {
  id: string
  prospect_id: string
  type_action: string
  date_action: string
  duree_minutes: number | null
  resultat: string | null
  notes: string
  commercial_nom: string | null
  created_at: string
}

type ContactForm = {
  nom: string
  prenom: string
  poste: string
  telephone: string
  email: string
  canal_preference: string
  est_principal: boolean
  notes: string
}

type ActionForm = {
  type_action: string
  duree_minutes: string
  resultat: string
  notes: string
  commercial_nom: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const CANAL_OPTIONS = [
  { value: 'telephone', label: 'Téléphone' },
  { value: 'email',     label: 'Email' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'visio',     label: 'Visio' },
]

const ACTION_TYPES = [
  { value: 'appel',   label: 'Appel téléphonique', icon: '📞' },
  { value: 'email',   label: 'Email envoyé',        icon: '✉️' },
  { value: 'rdv',     label: 'Rendez-vous',         icon: '🤝' },
  { value: 'visite',  label: 'Visite client',       icon: '🏢' },
  { value: 'relance', label: 'Relance',             icon: '🔔' },
  { value: 'note',    label: 'Note interne',        icon: '📝' },
]

const RESULTAT_OPTIONS = [
  { value: '',             label: '— Résultat —' },
  { value: 'positif',      label: '✅ Positif' },
  { value: 'neutre',       label: '⚪ Neutre' },
  { value: 'negatif',      label: '❌ Négatif' },
  { value: 'sans_reponse', label: '📵 Sans réponse' },
]

const EMPTY_CONTACT: ContactForm = {
  nom: '', prenom: '', poste: '', telephone: '', email: '',
  canal_preference: 'telephone', est_principal: false, notes: '',
}

const EMPTY_ACTION: ActionForm = {
  type_action: 'appel', duree_minutes: '', resultat: '', notes: '', commercial_nom: '',
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function actionMeta(type: string) {
  return ACTION_TYPES.find(a => a.value === type) ?? ACTION_TYPES[ACTION_TYPES.length - 1]
}

function resultatColor(r: string | null) {
  if (r === 'positif')      return { bg: 'rgba(16,185,129,0.15)',  color: '#6ee7b7' }
  if (r === 'negatif')      return { bg: 'rgba(239,68,68,0.15)',   color: '#fda4af' }
  if (r === 'sans_reponse') return { bg: 'rgba(148,163,184,0.15)', color: '#94a3b8' }
  return                           { bg: 'rgba(148,163,184,0.10)', color: '#94a3b8' }
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
export default function ContactsTab() {
  const [prospects, setProspects]         = useState<ProspectLight[]>([])
  const [selectedId, setSelectedId]       = useState<string>('')
  const [contacts, setContacts]           = useState<ContactRow[]>([])
  const [actions, setActions]             = useState<ActionRow[]>([])
  const [contactForm, setContactForm]     = useState<ContactForm>(EMPTY_CONTACT)
  const [actionForm, setActionForm]       = useState<ActionForm>(EMPTY_ACTION)
  const [showContactForm, setShowContactForm] = useState(false)
  const [showActionForm, setShowActionForm]   = useState(false)
  const [loadingProspects, setLoadingProspects] = useState(true)
  const [loadingData, setLoadingData]     = useState(false)
  const [savingContact, setSavingContact] = useState(false)
  const [savingAction, setSavingAction]   = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [notice, setNotice]               = useState<string | null>(null)
  const [searchProspect, setSearchProspect] = useState('')

  const sb = supabase as any

  // ── Chargement prospects ──
  useEffect(() => {
    async function loadProspects() {
      setLoadingProspects(true)
      const { data } = await sb.from('prospects')
        .select('id, nom_entreprise, statut, commercial_nom, ville')
        .order('nom_entreprise', { ascending: true })
      setProspects((data ?? []) as ProspectLight[])
      setLoadingProspects(false)
    }
    void loadProspects()
  }, [])

  // ── Chargement contacts + actions du prospect sélectionné ──
  const loadData = useCallback(async (prospectId: string) => {
    if (!prospectId) return
    setLoadingData(true)
    setError(null)
    try {
      const [{ data: c }, { data: a }] = await Promise.all([
        sb.from('contacts_prospects').select('*').eq('prospect_id', prospectId).order('est_principal', { ascending: false }),
        sb.from('actions_commerciales').select('*').eq('prospect_id', prospectId).order('date_action', { ascending: false }),
      ])
      setContacts((c ?? []) as ContactRow[])
      setActions((a ?? []) as ActionRow[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) void loadData(selectedId)
    else { setContacts([]); setActions([]) }
  }, [selectedId, loadData])

  // ── Filtrage prospects ──
  const filteredProspects = prospects.filter(p => {
    if (!searchProspect.trim()) return true
    return p.nom_entreprise.toLowerCase().includes(searchProspect.toLowerCase())
  })

  const selectedProspect = prospects.find(p => p.id === selectedId)

  // ── CRUD contacts ──
  async function handleCreateContact(e: React.FormEvent) {
    e.preventDefault()
    if (!contactForm.nom.trim()) { setError('Le nom est obligatoire.'); return }
    if (!selectedId) { setError('Sélectionnez un prospect.'); return }
    setSavingContact(true); setError(null)
    try {
      const { error: err } = await sb.from('contacts_prospects').insert({
        prospect_id: selectedId,
        nom: contactForm.nom.trim(),
        prenom: contactForm.prenom.trim() || null,
        poste: contactForm.poste.trim() || null,
        telephone: contactForm.telephone.trim() || null,
        email: contactForm.email.trim() || null,
        canal_preference: contactForm.canal_preference,
        est_principal: contactForm.est_principal,
        notes: contactForm.notes.trim() || null,
      })
      if (err) throw err
      setContactForm(EMPTY_CONTACT)
      setShowContactForm(false)
      setNotice('Contact ajouté.')
      await loadData(selectedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.')
    } finally {
      setSavingContact(false)
    }
  }

  async function handleDeleteContact(id: string) {
    const { error: err } = await sb.from('contacts_prospects').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setContacts(cur => cur.filter(c => c.id !== id))
    setNotice('Contact supprimé.')
  }

  // ── CRUD actions ──
  async function handleCreateAction(e: React.FormEvent) {
    e.preventDefault()
    if (!actionForm.notes.trim()) { setError('Les notes sont obligatoires.'); return }
    if (!selectedId) { setError('Sélectionnez un prospect.'); return }
    setSavingAction(true); setError(null)
    try {
      const { error: err } = await sb.from('actions_commerciales').insert({
        prospect_id: selectedId,
        type_action: actionForm.type_action,
        duree_minutes: actionForm.duree_minutes ? Number(actionForm.duree_minutes) : null,
        resultat: actionForm.resultat || null,
        notes: actionForm.notes.trim(),
        commercial_nom: actionForm.commercial_nom.trim() || null,
        date_action: new Date().toISOString(),
      })
      if (err) throw err
      setActionForm(EMPTY_ACTION)
      setShowActionForm(false)
      setNotice('Action enregistrée.')
      await loadData(selectedId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.')
    } finally {
      setSavingAction(false)
    }
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

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">

        {/* ── Sélecteur prospect (colonne gauche) ── */}
        <div className="nx-card overflow-hidden">
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold">Prospects</p>
            <input value={searchProspect} onChange={e => setSearchProspect(e.target.value)}
              placeholder="Rechercher..."
              className="mt-2 w-full rounded-xl border px-3 py-1.5 text-xs outline-none"
              style={{ borderColor: 'var(--border)', background: 'var(--card-bg, white)', color: 'var(--text)' }} />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            {loadingProspects ? (
              <p className="px-4 py-4 text-xs nx-subtle">Chargement...</p>
            ) : filteredProspects.length === 0 ? (
              <p className="px-4 py-4 text-xs nx-subtle">Aucun prospect.</p>
            ) : filteredProspects.map(p => (
              <button key={p.id} onClick={() => { setSelectedId(p.id); setError(null); setNotice(null) }}
                className={`w-full border-b px-4 py-3 text-left transition-colors last:border-b-0 ${
                  selectedId === p.id ? 'bg-slate-700/40' : 'hover:bg-slate-700/20'
                }`}
                style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium">{p.nom_entreprise}</p>
                <p className="text-xs nx-subtle">{p.ville ?? '—'} {p.commercial_nom ? `• ${p.commercial_nom}` : ''}</p>
              </button>
            ))}
          </div>
        </div>

        {/* ── Zone principale (colonne droite) ── */}
        <div className="space-y-5">
          {!selectedId && (
            <div className="nx-card flex items-center justify-center py-16 text-sm nx-subtle">
              Sélectionnez un prospect à gauche
            </div>
          )}

          {selectedId && (
            <>
              {/* En-tête prospect */}
              <div className="nx-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold">{selectedProspect?.nom_entreprise}</p>
                    <p className="text-sm nx-subtle">{selectedProspect?.ville} {selectedProspect?.commercial_nom ? `• ${selectedProspect.commercial_nom}` : ''}</p>
                  </div>
                </div>
              </div>

              {/* ── CONTACTS ── */}
              <div className="nx-card overflow-hidden">
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold">Contacts ({contacts.length})</p>
                  <button onClick={() => setShowContactForm(f => !f)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                    {showContactForm ? 'Annuler' : '+ Contact'}
                  </button>
                </div>

                {/* Formulaire nouveau contact */}
                {showContactForm && (
                  <form onSubmit={e => void handleCreateContact(e)} className="border-b p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label="Nom *">
                        <input value={contactForm.nom} onChange={e => setContactForm(f => ({ ...f, nom: e.target.value }))}
                          placeholder="Dupont" required
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                      <Field label="Prénom">
                        <input value={contactForm.prenom} onChange={e => setContactForm(f => ({ ...f, prenom: e.target.value }))}
                          placeholder="Jean"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                      <Field label="Poste">
                        <input value={contactForm.poste} onChange={e => setContactForm(f => ({ ...f, poste: e.target.value }))}
                          placeholder="Responsable transport"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                      <Field label="Téléphone">
                        <input value={contactForm.telephone} onChange={e => setContactForm(f => ({ ...f, telephone: e.target.value }))}
                          placeholder="06 12 34 56 78" type="tel"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                      <Field label="Email">
                        <input value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="jean@societe.fr" type="email"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                      <Field label="Canal préféré">
                        <select value={contactForm.canal_preference} onChange={e => setContactForm(f => ({ ...f, canal_preference: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none">
                          {CANAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </Field>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <input type="checkbox" id="est_principal" checked={contactForm.est_principal}
                          onChange={e => setContactForm(f => ({ ...f, est_principal: e.target.checked }))}
                          className="rounded" />
                        <label htmlFor="est_principal" className="text-sm nx-subtle">Contact principal</label>
                      </div>
                      <Field label="Notes">
                        <input value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))}
                          placeholder="Disponible le matin..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                    </div>
                    <button type="submit" disabled={savingContact}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                      {savingContact ? 'Enregistrement...' : 'Ajouter le contact'}
                    </button>
                  </form>
                )}

                {/* Liste contacts */}
                {loadingData ? (
                  <p className="px-4 py-4 text-xs nx-subtle">Chargement...</p>
                ) : contacts.length === 0 ? (
                  <p className="px-4 py-4 text-xs nx-subtle">Aucun contact enregistré.</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {contacts.map(c => (
                      <div key={c.id} className="flex items-start justify-between gap-4 px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</p>
                            {c.est_principal && (
                              <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">Principal</span>
                            )}
                          </div>
                          {c.poste && <p className="text-xs nx-subtle">{c.poste}</p>}
                          <div className="flex flex-wrap gap-3 pt-0.5">
                            {c.telephone && (
                              <a href={`tel:${c.telephone}`}
                                className="text-xs text-blue-400 hover:underline">
                                📞 {c.telephone}
                              </a>
                            )}
                            {c.email && (
                              <a href={`mailto:${c.email}`}
                                className="text-xs text-blue-400 hover:underline">
                                ✉️ {c.email}
                              </a>
                            )}
                          </div>
                          {c.notes && <p className="text-xs nx-subtle italic">{c.notes}</p>}
                        </div>
                        <button onClick={() => void handleDeleteContact(c.id)}
                          className="rounded-lg border px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                          style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── JOURNAL D ACTIONS ── */}
              <div className="nx-card overflow-hidden">
                <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm font-semibold">Journal d'activités ({actions.length})</p>
                  <button onClick={() => setShowActionForm(f => !f)}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                    {showActionForm ? 'Annuler' : '+ Action'}
                  </button>
                </div>

                {/* Formulaire nouvelle action */}
                {showActionForm && (
                  <form onSubmit={e => void handleCreateAction(e)} className="border-b p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label="Type d action">
                        <select value={actionForm.type_action} onChange={e => setActionForm(f => ({ ...f, type_action: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none">
                          {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Durée (min)">
                        <input value={actionForm.duree_minutes} onChange={e => setActionForm(f => ({ ...f, duree_minutes: e.target.value }))}
                          placeholder="15" type="number" min="1"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                      <Field label="Résultat">
                        <select value={actionForm.resultat} onChange={e => setActionForm(f => ({ ...f, resultat: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none">
                          {RESULTAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Commercial">
                        <input value={actionForm.commercial_nom} onChange={e => setActionForm(f => ({ ...f, commercial_nom: e.target.value }))}
                          placeholder="Martin D."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none" />
                      </Field>
                      <div className="sm:col-span-2 lg:col-span-4">
                        <Field label="Notes *">
                          <textarea value={actionForm.notes} onChange={e => setActionForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Résumé de l'échange, prochaine étape..." required rows={2}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none resize-none" />
                        </Field>
                      </div>
                    </div>
                    <button type="submit" disabled={savingAction}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                      {savingAction ? 'Enregistrement...' : 'Enregistrer l\'action'}
                    </button>
                  </form>
                )}

                {/* Timeline actions */}
                {!loadingData && actions.length === 0 && (
                  <p className="px-4 py-4 text-xs nx-subtle">Aucune action enregistrée.</p>
                )}
                {!loadingData && actions.length > 0 && (
                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {actions.map(a => {
                      const meta = actionMeta(a.type_action)
                      const rColor = resultatColor(a.resultat)
                      return (
                        <div key={a.id} className="px-4 py-3 flex gap-3">
                          <span className="text-lg leading-none mt-0.5" title={meta.label}>{meta.icon}</span>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold">{meta.label}</span>
                              {a.resultat && (
                                <span className="rounded-full px-2 py-0.5 text-xs font-medium"
                                  style={{ background: rColor.bg, color: rColor.color }}>
                                  {RESULTAT_OPTIONS.find(r => r.value === a.resultat)?.label ?? a.resultat}
                                </span>
                              )}
                              {a.duree_minutes && (
                                <span className="text-xs nx-subtle">{a.duree_minutes} min</span>
                              )}
                              {a.commercial_nom && (
                                <span className="text-xs nx-subtle">• {a.commercial_nom}</span>
                              )}
                              <span className="ml-auto text-xs nx-subtle">{formatDate(a.date_action)}</span>
                            </div>
                            {a.notes && (
                              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.notes}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
