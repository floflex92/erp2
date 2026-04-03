import { useCallback, useEffect, useMemo, useState } from 'react'
import { ROLE_LABELS, type Role, useAuth } from '@/lib/auth'
import type { Tables } from '@/lib/database.types'

type Profil = Tables<'profils'>
type ManagedUser = Profil & {
  email: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
  account_status?: string | null
  account_type?: string | null
  account_origin?: string | null
  is_demo_account?: boolean | null
  is_investor_account?: boolean | null
  requested_from_public_form?: boolean | null
  demo_expires_at?: string | null
  notes_admin?: string | null
  permissions?: string[] | null
  max_concurrent_screens?: number | null
}

type AccessRequest = {
  id: string
  full_name: string
  company_name: string
  email: string
  phone: string
  need_type: string
  request_status: string
  lead_status: string
  linked_profile_id: string | null
  created_at: string
  message: string | null
  notes_admin: string | null
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const DEFAULT_ROLE: Role = 'dirigeant'

async function adminRequest<T>(accessToken: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<T> {
  const response = await fetch('/.netlify/functions/admin-users', {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error ?? 'Operation impossible.')
  }
  return payload as T
}

export default function Utilisateurs() {
  const { session } = useAuth()

  const [users, setUsers] = useState<ManagedUser[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<Role>(DEFAULT_ROLE)
  const [createNom, setCreateNom] = useState('')
  const [createPrenom, setCreatePrenom] = useState('')
  const [createAccountType, setCreateAccountType] = useState('test')
  const [createMaxScreens, setCreateMaxScreens] = useState(1)
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<Role>(DEFAULT_ROLE)
  const [editStatus, setEditStatus] = useState('actif')
  const [editType, setEditType] = useState('standard')
  const [editMaxScreens, setEditMaxScreens] = useState(1)
  const [editPermissions, setEditPermissions] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const data = await adminRequest<{ users: ManagedUser[]; requests: AccessRequest[] }>(session.access_token, 'GET')
      setUsers(Array.isArray(data.users) ? data.users : [])
      setRequests(Array.isArray(data.requests) ? data.requests : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
      setUsers([])
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    void load()
  }, [load])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter(user => {
      const fullname = `${user.prenom ?? ''} ${user.nom ?? ''}`.trim().toLowerCase()
      const matchQuery = q.length === 0 || fullname.includes(q) || (user.email ?? '').toLowerCase().includes(q)
      const matchRole = filterRole === 'all' || user.role === filterRole
      const status = user.account_status ?? 'actif'
      const matchStatus = filterStatus === 'all' || status === filterStatus
      return matchQuery && matchRole && matchStatus
    })
  }, [filterRole, filterStatus, search, users])

  function startEdit(user: ManagedUser) {
    setEditId(user.id)
    setEditRole((user.role as Role) ?? DEFAULT_ROLE)
    setEditStatus(user.account_status ?? 'actif')
    setEditType(user.account_type ?? 'standard')
    setEditMaxScreens(Math.max(1, Math.min(12, Number(user.max_concurrent_screens ?? 1))))
    setEditPermissions((user.permissions ?? []).join(', '))
    setEditNotes(user.notes_admin ?? '')
  }

  async function saveEdit() {
    if (!session?.access_token || !editId) return
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      await adminRequest(session.access_token, 'PATCH', {
        id: editId,
        role: editRole,
        account_status: editStatus,
        account_type: editType,
        max_concurrent_screens: editMaxScreens,
        notes_admin: editNotes,
        permissions: editPermissions.split(',').map(item => item.trim()).filter(Boolean),
      })
      setEditId(null)
      setNotice('Compte mis a jour.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function applyAction(id: string, action: 'enable' | 'disable' | 'archive' | 'delete') {
    if (!session?.access_token) return
    setError(null)
    setNotice(null)
    try {
      await adminRequest(session.access_token, 'PATCH', { id, action })
      setNotice('Action appliquee.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible.')
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.access_token) return
    setCreating(true)
    setError(null)
    setNotice(null)
    try {
      const payload = await adminRequest<{ user: { email: string; role: string } }>(session.access_token, 'POST', {
        email: createEmail,
        password: createPassword,
        role: createRole,
        nom: createNom,
        prenom: createPrenom,
        account_type: createAccountType,
        max_concurrent_screens: createMaxScreens,
        account_origin: 'manuel_admin',
        is_demo_account: createAccountType === 'test' || createAccountType === 'demo',
        is_investor_account: createAccountType === 'investisseur',
      })
      setCreateEmail('')
      setCreatePassword('')
      setCreateRole(DEFAULT_ROLE)
      setCreateNom('')
      setCreatePrenom('')
      setCreateAccountType('test')
      setCreateMaxScreens(1)
      setNotice(`Compte cree pour ${payload.user.email} (${payload.user.role}).`)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation impossible.')
    } finally {
      setCreating(false)
    }
  }

  async function createFromRequest(request: AccessRequest) {
    if (!session?.access_token) return
    setError(null)
    setNotice(null)
    try {
      await adminRequest(session.access_token, 'POST', {
        email: request.email,
        password: `Nx!${Math.random().toString(36).slice(2, 12)}A9`,
        role: DEFAULT_ROLE,
        nom: request.full_name.split(' ').slice(1).join(' ') || request.full_name,
        prenom: request.full_name.split(' ')[0] || request.full_name,
        account_type: request.need_type === 'investisseur' ? 'investisseur' : 'test',
        account_origin: 'demande_page_connexion',
        requested_from_public_form: true,
        request_id: request.id,
      })
      setNotice('Compte cree depuis la demande.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation impossible depuis la demande.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Comptes de demonstration et acces</h2>
        <p className="mt-1 text-sm text-slate-500">Gestion complete des comptes, roles, droits et demandes publiques.</p>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Creer un compte</h3>
          <p className="mt-1 text-sm text-slate-500">Tout nouveau compte est en role dirigeant par defaut.</p>
          <form onSubmit={createUser} className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Email"><input className={inp} type="email" required value={createEmail} onChange={e => setCreateEmail(e.target.value)} /></Field>
            <Field label="Mot de passe provisoire"><input className={inp} type="text" minLength={8} required value={createPassword} onChange={e => setCreatePassword(e.target.value)} /></Field>
            <Field label="Prenom"><input className={inp} value={createPrenom} onChange={e => setCreatePrenom(e.target.value)} /></Field>
            <Field label="Nom"><input className={inp} value={createNom} onChange={e => setCreateNom(e.target.value)} /></Field>
            <Field label="Role">
              <select className={inp} value={createRole} onChange={e => setCreateRole(e.target.value as Role)}>
                {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Type de compte">
              <select className={inp} value={createAccountType} onChange={e => setCreateAccountType(e.target.value)}>
                <option value="standard">Standard</option>
                <option value="test">Test</option>
                <option value="prospect">Prospect</option>
                <option value="investisseur">Investisseur</option>
                <option value="demo">Demo</option>
              </select>
            </Field>
            <Field label="Ecrans max simultanes">
              <input
                className={inp}
                type="number"
                min={1}
                max={12}
                value={createMaxScreens}
                onChange={e => setCreateMaxScreens(Math.max(1, Math.min(12, Number(e.target.value || 1))))}
              />
            </Field>
            <div className="col-span-2 flex justify-end">
              <button type="submit" disabled={creating} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
                {creating ? 'Creation...' : 'Creer le compte'}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800">Filtres</h3>
          <div className="mt-4 space-y-3">
            <Field label="Recherche">
              <input className={inp} placeholder="Nom, email" value={search} onChange={e => setSearch(e.target.value)} />
            </Field>
            <Field label="Role">
              <select className={inp} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
                <option value="all">Tous</option>
                {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Statut">
              <select className={inp} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Tous</option>
                <option value="actif">Actif</option>
                <option value="suspendu">Suspendu</option>
                <option value="desactive">Desactive</option>
                <option value="archive">Archive</option>
              </select>
            </Field>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Chargement...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Nom', 'Societe', 'Email', 'Telephone', 'Role', 'Statut', 'Type', 'Creation', 'Derniere connexion', 'Origine', 'Actions'].map(header => (
                  <th key={header} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-700">{[user.prenom, user.nom].filter(Boolean).join(' ') || 'Non renseigne'}</td>
                  <td className="px-3 py-2 text-slate-500">-</td>
                  <td className="px-3 py-2 text-slate-600">{user.email ?? 'N/A'}</td>
                  <td className="px-3 py-2 text-slate-500">-</td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <select className={inp} value={editRole} onChange={e => setEditRole(e.target.value as Role)}>
                        {(Object.entries(ROLE_LABELS) as Array<[Role, string]>).map(([role, label]) => (
                          <option key={role} value={role}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      ROLE_LABELS[user.role as Role] ?? user.role
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <select className={inp} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        <option value="actif">Actif</option>
                        <option value="suspendu">Suspendu</option>
                        <option value="desactive">Desactive</option>
                        <option value="archive">Archive</option>
                      </select>
                    ) : (user.account_status ?? 'actif')}
                  </td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <div className="space-y-2">
                        <select className={inp} value={editType} onChange={e => setEditType(e.target.value)}>
                          <option value="standard">Standard</option>
                          <option value="test">Test</option>
                          <option value="prospect">Prospect</option>
                          <option value="investisseur">Investisseur</option>
                          <option value="demo">Demo</option>
                        </select>
                        <input
                          className={inp}
                          type="number"
                          min={1}
                          max={12}
                          value={editMaxScreens}
                          onChange={e => setEditMaxScreens(Math.max(1, Math.min(12, Number(e.target.value || 1))))}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div>{user.account_type ?? 'standard'}</div>
                        <div className="text-xs text-slate-500">{user.max_concurrent_screens ?? 1} ecran(s) max</div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('fr-FR') : 'Jamais'}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{user.account_origin ?? 'manuel_admin'}</td>
                  <td className="px-3 py-2">
                    {editId === user.id ? (
                      <div className="space-y-2">
                        <textarea className={inp} rows={2} value={editPermissions} onChange={e => setEditPermissions(e.target.value)} placeholder="permissions (csv)" />
                        <textarea className={inp} rows={2} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="note interne" />
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditId(null)} className="rounded border border-slate-300 px-2 py-1 text-xs">Annuler</button>
                          <button type="button" disabled={saving} onClick={() => void saveEdit()} className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Sauver</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => startEdit(user)} className="rounded border border-slate-300 px-2 py-1 text-xs">Editer</button>
                        <button type="button" onClick={() => void applyAction(user.id, 'enable')} className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-700">Activer</button>
                        <button type="button" onClick={() => void applyAction(user.id, 'disable')} className="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700">Desactiver</button>
                        <button type="button" onClick={() => void applyAction(user.id, 'archive')} className="rounded border border-slate-300 px-2 py-1 text-xs">Archiver</button>
                        <button type="button" onClick={() => void applyAction(user.id, 'delete')} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">Supprimer</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-sm text-slate-400">Aucun compte ne correspond aux filtres.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800">Demandes "Parler de votre projet"</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                {['Nom', 'Societe', 'Email', 'Type besoin', 'Statut', 'Date', 'Actions'].map(header => (
                  <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(request => (
                <tr key={request.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{request.full_name}</td>
                  <td className="px-3 py-2">{request.company_name}</td>
                  <td className="px-3 py-2">{request.email}</td>
                  <td className="px-3 py-2">{request.need_type}</td>
                  <td className="px-3 py-2">{request.request_status}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(request.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={Boolean(request.linked_profile_id)}
                      onClick={() => void createFromRequest(request)}
                      className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      {request.linked_profile_id ? 'Compte deja cree' : 'Creer un compte depuis cette demande'}
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-400">Aucune demande enregistree.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-xs font-medium text-slate-600">
      <span>{label}</span>
      {children}
    </label>
  )
}
