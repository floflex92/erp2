import { useState, useEffect, useCallback } from 'react'
import { useScrollToTopOnChange } from '@/hooks/useScrollToTopOnChange'
import {
  listComptes, listPartenaires, listUtilisateurs, listRoles, listOrdresTransport,
  listDocuments, listMessages, listEvenements, listNotifications, listJournalActions,
  upsertPartenaire, archivePartenaire, upsertUtilisateur, createOrdreTransport,
  sendMessage, createDocument, updateStatutOT, markNotificationRead,
  type CompteErp, type Partenaire, type UtilisateurCompte, type RoleCompte,
  type OrdreTransportCompte, type DocumentCompte, type MessageCompte,
  type EvenementTransport, type NotificationCompte, type JournalAction,
} from '@/lib/compteClientDb'

type Tab = 'overview' | 'partenaires' | 'utilisateurs' | 'ot' | 'documents' | 'messages' | 'evenements' | 'notifications' | 'audit'

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnP = `${btn} bg-slate-800 text-white hover:bg-slate-900`

function Badge({ text, color }: { text: string; color: string }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{text}</span>
}

/* ─────────────── Vue d'ensemble ─────────────── */
function OverviewPanel({ compte, stats }: { compte: CompteErp; stats: { partenaires: number; utilisateurs: number; ot: number; docs: number; messages: number; notifs: number } }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-4 border border-line rounded-lg">
          <div className="text-xs text-discreet">Compte</div>
          <div className="text-lg font-bold text-foreground">{compte.nom}</div>
          <div className="text-xs text-muted font-mono mt-1">{compte.code}</div>
        </div>
        <div className="p-4 border border-line rounded-lg">
          <div className="text-xs text-discreet">Statut</div>
          <Badge text={compte.statut} color={compte.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-surface-2 text-discreet'} />
        </div>
        {[
          { label: 'Partenaires', value: stats.partenaires },
          { label: 'Utilisateurs', value: stats.utilisateurs },
          { label: 'Ordres Transport', value: stats.ot },
          { label: 'Documents', value: stats.docs },
          { label: 'Messages', value: stats.messages },
          { label: 'Notifications non lues', value: stats.notifs },
        ].map(s => (
          <div key={s.label} className="p-4 border border-line rounded-lg">
            <div className="text-xs text-discreet">{s.label}</div>
            <div className="text-2xl font-bold text-foreground">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─────────────── Partenaires ─────────────── */
function PartenairesPanel({ compteId }: { compteId: string }) {
  const [data, setData] = useState<Partenaire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [edit, setEdit] = useState<Partenaire | null>(null)
  const [form, setForm] = useState({ nom: '', siret: '', email: '', telephone: '' })

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: d, error: e } = await listPartenaires(compteId)
    if (e) setError(e.message); else setData(d || [])
    setLoading(false)
  }, [compteId])

  useEffect(() => { fetch() }, [fetch])

  const openAdd = () => { setEdit(null); setForm({ nom: '', siret: '', email: '', telephone: '' }); setShowForm(true) }
  const openEdit = (p: Partenaire) => { setEdit(p); setForm({ nom: p.nom, siret: p.siret || '', email: p.email || '', telephone: p.telephone || '' }); setShowForm(true) }

  const save = async () => {
    setError(null)
    const { error: e } = await upsertPartenaire({ id: edit?.id, compte_erp_id: compteId, nom: form.nom, siret: form.siret || null, email: form.email || null, telephone: form.telephone || null })
    if (e) { setError(e.message); return }
    setShowForm(false); fetch()
  }

  const archive = async (id: string) => {
    const { error: e } = await archivePartenaire(id)
    if (e) setError(e.message); else fetch()
  }

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      <button onClick={openAdd} className={btnP}>+ Ajouter partenaire</button>

      {showForm && (
        <div className="border border-line rounded-lg p-4 bg-surface-soft space-y-3">
          <h3 className="font-medium text-sm text-foreground">{edit ? 'Modifier' : 'Nouveau'} partenaire</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-secondary block mb-1">Nom *</label><input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className={inp} /></div>
            <div><label className="text-xs font-medium text-secondary block mb-1">SIRET</label><input value={form.siret} onChange={e => setForm({ ...form, siret: e.target.value })} className={inp} /></div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inp} /></div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Téléphone</label><input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className={inp} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className={btnP}>{edit ? 'Modifier' : 'Créer'}</button>
            <button onClick={() => setShowForm(false)} className={`${btn} text-discreet`}>Annuler</button>
          </div>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead><tr className="bg-surface-2">
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Nom</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">SIRET</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Email</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Tél</th>
          <th className="px-3 py-2 text-center font-medium text-foreground border border-line">Actions</th>
        </tr></thead>
        <tbody>
          {data.map(p => (
            <tr key={p.id} className="hover:bg-surface-soft border-b border-line">
              <td className="px-3 py-2">{p.nom}</td>
              <td className="px-3 py-2 font-mono text-xs">{p.siret || '—'}</td>
              <td className="px-3 py-2">{p.email || '—'}</td>
              <td className="px-3 py-2">{p.telephone || '—'}</td>
              <td className="px-3 py-2 text-center space-x-2">
                <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:text-blue-800">Modifier</button>
                <button onClick={() => archive(p.id)} className="text-xs text-discreet hover:text-red-600">Archiver</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucun partenaire</div>}
    </div>
  )
}

/* ─────────────── Utilisateurs ─────────────── */
function UtilisateursPanel({ compteId }: { compteId: string }) {
  const [data, setData] = useState<UtilisateurCompte[]>([])
  const [roles, setRoles] = useState<RoleCompte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [edit, setEdit] = useState<UtilisateurCompte | null>(null)
  const [form, setForm] = useState({ email: '', nom: '', prenom: '', role_compte_id: '' })

  const fetch = useCallback(async () => {
    setLoading(true)
    const [u, r] = await Promise.all([listUtilisateurs(compteId), listRoles(compteId)])
    if (u.data) setData(u.data)
    if (r.data) setRoles(r.data)
    setLoading(false)
  }, [compteId])

  useEffect(() => { fetch() }, [fetch])

  const openAdd = () => { setEdit(null); setForm({ email: '', nom: '', prenom: '', role_compte_id: roles[0]?.id || '' }); setShowForm(true) }
  const openEdit = (u: UtilisateurCompte) => { setEdit(u); setForm({ email: u.email, nom: u.nom || '', prenom: u.prenom || '', role_compte_id: u.role_compte_id }); setShowForm(true) }

  const save = async () => {
    setError(null)
    const { error: e } = await upsertUtilisateur({ id: edit?.id, compte_erp_id: compteId, email: form.email, nom: form.nom || null, prenom: form.prenom || null, role_compte_id: form.role_compte_id, actif: true })
    if (e) { setError(e.message); return }
    setShowForm(false); fetch()
  }

  const roleLabel = (rid: string) => roles.find(r => r.id === rid)?.libelle || '?'

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      <button onClick={openAdd} className={btnP}>+ Ajouter utilisateur</button>

      {showForm && (
        <div className="border border-line rounded-lg p-4 bg-surface-soft space-y-3">
          <h3 className="font-medium text-sm text-foreground">{edit ? 'Modifier' : 'Nouvel'} utilisateur</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-secondary block mb-1">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!edit} className={`${inp} ${edit ? 'bg-surface-2' : ''}`} /></div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Rôle *</label>
              <select value={form.role_compte_id} onChange={e => setForm({ ...form, role_compte_id: e.target.value })} className={inp}>
                {roles.map(r => <option key={r.id} value={r.id}>{r.libelle}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Nom</label><input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className={inp} /></div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Prénom</label><input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} className={inp} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className={btnP}>{edit ? 'Modifier' : 'Créer'}</button>
            <button onClick={() => setShowForm(false)} className={`${btn} text-discreet`}>Annuler</button>
          </div>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead><tr className="bg-surface-2">
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Email</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Nom</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Prénom</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Rôle</th>
          <th className="px-3 py-2 text-center font-medium text-foreground border border-line">Actif</th>
          <th className="px-3 py-2 text-center font-medium text-foreground border border-line">Actions</th>
        </tr></thead>
        <tbody>
          {data.map(u => (
            <tr key={u.id} className="hover:bg-surface-soft border-b border-line">
              <td className="px-3 py-2">{u.email}</td>
              <td className="px-3 py-2">{u.nom || '—'}</td>
              <td className="px-3 py-2">{u.prenom || '—'}</td>
              <td className="px-3 py-2">{roleLabel(u.role_compte_id)}</td>
              <td className="px-3 py-2 text-center"><Badge text={u.actif ? 'Actif' : 'Inactif'} color={u.actif ? 'bg-green-100 text-green-700' : 'bg-surface-2 text-discreet'} /></td>
              <td className="px-3 py-2 text-center"><button onClick={() => openEdit(u)} className="text-xs text-blue-600 hover:text-blue-800">Modifier</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucun utilisateur</div>}
    </div>
  )
}

/* ─────────────── Ordres Transport ─────────────── */
function OrdresTransportPanel({ compteId, partenaires }: { compteId: string; partenaires: Partenaire[] }) {
  const [data, setData] = useState<OrdreTransportCompte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ reference: '', partenaire_id: '', date_chargement: '', date_livraison: '' })

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: d, error: e } = await listOrdresTransport(compteId)
    if (e) setError(e.message); else setData(d || [])
    setLoading(false)
  }, [compteId])

  useEffect(() => { fetch() }, [fetch])

  const save = async () => {
    setError(null)
    if (!form.reference || !form.partenaire_id) { setError('Référence et partenaire requis.'); return }
    const { error: e } = await createOrdreTransport({
      compte_erp_id: compteId, partenaire_id: form.partenaire_id, reference: form.reference,
      date_chargement_prevue: form.date_chargement || undefined,
      date_livraison_prevue: form.date_livraison || undefined,
    })
    if (e) { setError(e.message); return }
    setShowForm(false); setForm({ reference: '', partenaire_id: '', date_chargement: '', date_livraison: '' }); fetch()
  }

  const changeStatut = async (id: string, statut: string) => {
    const { error: e } = await updateStatutOT(id, statut)
    if (e) setError(e.message); else fetch()
  }

  const statutColor: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700',
    en_cours: 'bg-blue-100 text-blue-700',
    livre: 'bg-green-100 text-green-700',
    annule: 'bg-red-100 text-red-700',
  }

  const partenaireNom = (id: string) => partenaires.find(p => p.id === id)?.nom || '—'

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      <button onClick={() => setShowForm(true)} className={btnP}>+ Nouvel OT</button>

      {showForm && (
        <div className="border border-line rounded-lg p-4 bg-surface-soft space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-secondary block mb-1">Référence *</label><input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className={inp} /></div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Partenaire *</label>
              <select value={form.partenaire_id} onChange={e => setForm({ ...form, partenaire_id: e.target.value })} className={inp}>
                <option value="">Choisir...</option>
                {partenaires.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Chargement prévu</label><input type="datetime-local" value={form.date_chargement} onChange={e => setForm({ ...form, date_chargement: e.target.value })} className={inp} /></div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Livraison prévue</label><input type="datetime-local" value={form.date_livraison} onChange={e => setForm({ ...form, date_livraison: e.target.value })} className={inp} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className={btnP}>Créer</button>
            <button onClick={() => setShowForm(false)} className={`${btn} text-discreet`}>Annuler</button>
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-surface-2">
            <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Référence</th>
            <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Partenaire</th>
            <th className="px-3 py-2 text-center font-medium text-foreground border border-line">Statut</th>
            <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Chargement</th>
            <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Livraison</th>
            <th className="px-3 py-2 text-center font-medium text-foreground border border-line">Actions</th>
          </tr></thead>
          <tbody>
            {data.map(ot => (
              <tr key={ot.id} className="hover:bg-surface-soft border-b border-line">
                <td className="px-3 py-2 font-mono">{ot.reference}</td>
                <td className="px-3 py-2">{partenaireNom(ot.partenaire_id)}</td>
                <td className="px-3 py-2 text-center"><Badge text={ot.statut_transport} color={statutColor[ot.statut_transport] || 'bg-surface-2 text-secondary'} /></td>
                <td className="px-3 py-2 text-xs">{ot.date_chargement_prevue?.replace('T', ' ').slice(0, 16) || '—'}</td>
                <td className="px-3 py-2 text-xs">{ot.date_livraison_prevue?.replace('T', ' ').slice(0, 16) || '—'}</td>
                <td className="px-3 py-2 text-center">
                  <select
                    value={ot.statut_transport}
                    onChange={e => changeStatut(ot.id, e.target.value)}
                    className="text-xs border rounded px-1 py-0.5"
                  >
                    <option value="en_attente">En attente</option>
                    <option value="en_cours">En cours</option>
                    <option value="livre">Livré</option>
                    <option value="annule">Annulé</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucun OT</div>}
      </div>
    </div>
  )
}

/* ─────────────── Documents ─────────────── */
function DocumentsPanel({ compteId }: { compteId: string }) {
  const [data, setData] = useState<DocumentCompte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type_document: 'cmr', nom_fichier: '' })

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: d, error: e } = await listDocuments(compteId)
    if (e) setError(e.message); else setData(d || [])
    setLoading(false)
  }, [compteId])

  useEffect(() => { fetch() }, [fetch])

  const save = async () => {
    if (!form.nom_fichier) { setError('Nom fichier requis.'); return }
    const { error: e } = await createDocument({ compte_erp_id: compteId, type_document: form.type_document, nom_fichier: form.nom_fichier })
    if (e) { setError(e.message); return }
    setShowForm(false); setForm({ type_document: 'cmr', nom_fichier: '' }); fetch()
  }

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      <button onClick={() => setShowForm(true)} className={btnP}>+ Ajouter document</button>

      {showForm && (
        <div className="border border-line rounded-lg p-4 bg-surface-soft space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-secondary block mb-1">Type</label>
              <select value={form.type_document} onChange={e => setForm({ ...form, type_document: e.target.value })} className={inp}>
                <option value="cmr">CMR</option>
                <option value="bon_livraison">Bon de livraison</option>
                <option value="facture">Facture</option>
                <option value="devis">Devis</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div><label className="text-xs font-medium text-secondary block mb-1">Nom fichier *</label><input value={form.nom_fichier} onChange={e => setForm({ ...form, nom_fichier: e.target.value })} className={inp} /></div>
          </div>
          <div className="flex gap-3">
            <button onClick={save} className={btnP}>Enregistrer</button>
            <button onClick={() => setShowForm(false)} className={`${btn} text-discreet`}>Annuler</button>
          </div>
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead><tr className="bg-surface-2">
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Type</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Nom fichier</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Date</th>
        </tr></thead>
        <tbody>
          {data.map(d => (
            <tr key={d.id} className="hover:bg-surface-soft border-b border-line">
              <td className="px-3 py-2"><Badge text={d.type_document} color="bg-surface-2 text-foreground" /></td>
              <td className="px-3 py-2">{d.nom_fichier}</td>
              <td className="px-3 py-2 text-xs text-discreet">{d.created_at?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucun document</div>}
    </div>
  )
}

/* ─────────────── Messages ─────────────── */
function MessagesPanel({ compteId }: { compteId: string }) {
  const [data, setData] = useState<MessageCompte[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contenu, setContenu] = useState('')
  const [sending, setSending] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: d, error: e } = await listMessages(compteId)
    if (e) setError(e.message); else setData(d || [])
    setLoading(false)
  }, [compteId])

  useEffect(() => { fetch() }, [fetch])

  const send = async () => {
    if (!contenu.trim()) return
    setSending(true)
    const { error: e } = await sendMessage({ compte_erp_id: compteId, contenu: contenu.trim() })
    if (e) setError(e.message); else { setContenu(''); fetch() }
    setSending(false)
  }

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      <div className="flex gap-3">
        <input value={contenu} onChange={e => setContenu(e.target.value)} placeholder="Nouveau message..." className={`flex-1 ${inp}`} onKeyDown={e => e.key === 'Enter' && send()} />
        <button onClick={send} disabled={sending || !contenu.trim()} className={btnP}>{sending ? '...' : 'Envoyer'}</button>
      </div>
      <div className="space-y-2 max-h-96 overflow-auto">
        {data.map(m => (
          <div key={m.id} className="p-3 border border-line rounded-lg">
            <div className="text-sm text-foreground">{m.contenu}</div>
            <div className="text-xs text-muted mt-1">{m.created_at?.replace('T', ' ').slice(0, 19)}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucun message</div>}
      </div>
    </div>
  )
}

/* ─────────────── Événements RT ─────────────── */
function EvenementsPanel({ compteId }: { compteId: string }) {
  const [data, setData] = useState<EvenementTransport[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: d } = await listEvenements(compteId)
      setData(d || [])
      setLoading(false)
    })()
  }, [compteId])

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="space-y-2 max-h-[500px] overflow-auto">
      {data.map(e => (
        <div key={e.id} className="p-3 border border-line rounded-lg flex justify-between items-start">
          <div>
            <Badge text={e.type_evenement} color="bg-blue-100 text-blue-700" />
            <pre className="text-xs text-secondary mt-1 max-w-lg overflow-hidden">{JSON.stringify(e.payload, null, 2).slice(0, 200)}</pre>
          </div>
          <div className="text-xs text-muted whitespace-nowrap">{e.created_at?.replace('T', ' ').slice(0, 19)}</div>
        </div>
      ))}
      {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucun événement</div>}
    </div>
  )
}

/* ─────────────── Notifications ─────────────── */
function NotificationsPanel({ compteId }: { compteId: string }) {
  const [data, setData] = useState<NotificationCompte[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data: d } = await listNotifications(compteId)
    setData(d || [])
    setLoading(false)
  }, [compteId])

  useEffect(() => { fetch() }, [fetch])

  const markRead = async (id: string) => {
    await markNotificationRead(id)
    fetch()
  }

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="space-y-2 max-h-[500px] overflow-auto">
      {data.map(n => (
        <div key={n.id} className={`p-3 border rounded-lg flex justify-between items-start ${n.lu_at ? 'border-line opacity-60' : 'border-blue-200 bg-blue-50'}`}>
          <div>
            <Badge text={n.type_notification} color="bg-surface-2 text-foreground" />
            <div className="text-xs text-secondary mt-1">{JSON.stringify(n.payload).slice(0, 150)}</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-xs text-muted">{n.created_at?.replace('T', ' ').slice(0, 19)}</div>
            {!n.lu_at && <button onClick={() => markRead(n.id)} className="text-xs text-blue-600 hover:text-blue-800">Marquer lu</button>}
          </div>
        </div>
      ))}
      {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucune notification</div>}
    </div>
  )
}

/* ─────────────── Audit ─────────────── */
function AuditPanel({ compteId }: { compteId: string }) {
  const [data, setData] = useState<JournalAction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data: d } = await listJournalActions(compteId)
      setData(d || [])
      setLoading(false)
    })()
  }, [compteId])

  if (loading) return <div className="text-center py-8 text-discreet">Chargement...</div>

  return (
    <div className="overflow-auto max-h-[500px]">
      <table className="w-full text-sm border-collapse">
        <thead><tr className="bg-surface-2">
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Date</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Action</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Table</th>
          <th className="px-3 py-2 text-left font-medium text-foreground border border-line">Cible</th>
        </tr></thead>
        <tbody>
          {data.map(a => (
            <tr key={a.id} className="hover:bg-surface-soft border-b border-line">
              <td className="px-3 py-2 text-xs whitespace-nowrap">{a.created_at?.replace('T', ' ').slice(0, 19)}</td>
              <td className="px-3 py-2"><Badge text={a.action} color="bg-surface-2 text-foreground" /></td>
              <td className="px-3 py-2 font-mono text-xs">{a.table_cible}</td>
              <td className="px-3 py-2 font-mono text-xs text-discreet">{a.cible_id?.slice(0, 8) || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.length === 0 && <div className="text-center py-6 text-discreet text-sm">Aucune action journalisée</div>}
    </div>
  )
}

/* ═══════════════ PAGE PRINCIPALE ═══════════════ */
export default function CompteClientDB() {
  const [comptes, setComptes] = useState<CompteErp[]>([])
  const [selectedCompte, setSelectedCompte] = useState<CompteErp | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data for stats and OT panel
  const [partenaires, setPartenaires] = useState<Partenaire[]>([])
  const [stats, setStats] = useState({ partenaires: 0, utilisateurs: 0, ot: 0, docs: 0, messages: 0, notifs: 0 })

  useScrollToTopOnChange(activeTab)

  useEffect(() => {
    (async () => {
      const { data, error: e } = await listComptes()
      if (e) { setError(e.message); setLoading(false); return }
      setComptes(data || [])
      if (data && data.length > 0) setSelectedCompte(data[0])
      setLoading(false)
    })()
  }, [])

  // Load stats when compte changes
  useEffect(() => {
    if (!selectedCompte) return
    const cid = selectedCompte.id
    ;(async () => {
      const [p, u, ot, d, m, n] = await Promise.all([
        listPartenaires(cid), listUtilisateurs(cid), listOrdresTransport(cid),
        listDocuments(cid), listMessages(cid), listNotifications(cid),
      ])
      setPartenaires(p.data || [])
      setStats({
        partenaires: p.data?.length || 0,
        utilisateurs: u.data?.length || 0,
        ot: ot.data?.length || 0,
        docs: d.data?.length || 0,
        messages: m.data?.length || 0,
        notifs: n.data?.filter(x => !x.lu_at).length || 0,
      })
    })()
  }, [selectedCompte])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'partenaires', label: 'Partenaires' },
    { key: 'utilisateurs', label: 'Utilisateurs' },
    { key: 'ot', label: 'Ordres Transport' },
    { key: 'documents', label: 'Documents' },
    { key: 'messages', label: 'Messages' },
    { key: 'evenements', label: 'Événements' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'audit', label: 'Audit' },
  ]

  if (loading) return <div className="p-6 text-center text-discreet">Chargement...</div>
  if (error) return <div className="p-6"><div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div></div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Compte Client DB</h1>
          <p className="text-sm text-secondary">Gestion du périmètre client — schémas core / docs / rt / audit</p>
        </div>
        {comptes.length > 1 && (
          <select
            value={selectedCompte?.id || ''}
            onChange={e => setSelectedCompte(comptes.find(c => c.id === e.target.value) || null)}
            className={inp}
            style={{ width: 250 }}
          >
            {comptes.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>)}
          </select>
        )}
      </div>

      {selectedCompte && (
        <div className="bg-surface rounded-lg border border-line p-6">
          <div className="flex gap-1 mb-6 border-b border-line pb-0 overflow-x-auto">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
                  activeTab === t.key
                    ? 'border-slate-800 text-foreground'
                    : 'border-transparent text-discreet hover:text-foreground'
                }`}
              >
                {t.label}
                {t.key === 'notifications' && stats.notifs > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">{stats.notifs}</span>
                )}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewPanel compte={selectedCompte} stats={stats} />}
          {activeTab === 'partenaires' && <PartenairesPanel compteId={selectedCompte.id} />}
          {activeTab === 'utilisateurs' && <UtilisateursPanel compteId={selectedCompte.id} />}
          {activeTab === 'ot' && <OrdresTransportPanel compteId={selectedCompte.id} partenaires={partenaires} />}
          {activeTab === 'documents' && <DocumentsPanel compteId={selectedCompte.id} />}
          {activeTab === 'messages' && <MessagesPanel compteId={selectedCompte.id} />}
          {activeTab === 'evenements' && <EvenementsPanel compteId={selectedCompte.id} />}
          {activeTab === 'notifications' && <NotificationsPanel compteId={selectedCompte.id} />}
          {activeTab === 'audit' && <AuditPanel compteId={selectedCompte.id} />}
        </div>
      )}

      {!selectedCompte && (
        <div className="text-center py-12 text-discreet">Aucun compte ERP trouvé. Exécutez le bootstrap Channel Fret.</div>
      )}
    </div>
  )
}
