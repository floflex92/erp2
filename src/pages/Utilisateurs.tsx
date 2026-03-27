import { useEffect, useState } from 'react'
import { useAuth, ROLE_LABELS, type Role } from '@/lib/auth'
import type { Tables } from '@/lib/database.types'

type Profil = Tables<'profils'>
type ManagedUser = Profil & {
  email: string | null
  email_confirmed_at: string | null
  last_sign_in_at: string | null
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-yellow-100 text-yellow-700',
  dirigeant: 'bg-violet-100 text-violet-700',
  exploitant: 'bg-blue-100 text-blue-700',
  mecanicien: 'bg-orange-100 text-orange-700',
  commercial: 'bg-emerald-100 text-emerald-700',
  comptable: 'bg-slate-100 text-slate-600',
}

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300'
const DEFAULT_ROLE: Role = 'exploitant'

async function adminRequest<T>(accessToken: string, method: 'GET' | 'POST' | 'PATCH', body?: unknown): Promise<T> {
  const response = await fetch('/.netlify/functions/admin-users', {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload.error === 'string' ? payload.error : 'Operation impossible.')
  }

  return payload as T
}

export default function Utilisateurs() {
  const { session } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<Role>(DEFAULT_ROLE)
  const [editNom, setEditNom] = useState('')
  const [editPrenom, setEditPrenom] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createRole, setCreateRole] = useState<Role>(DEFAULT_ROLE)
  const [createNom, setCreateNom] = useState('')
  const [createPrenom, setCreatePrenom] = useState('')
  const [creating, setCreating] = useState(false)

  async function load() {
    if (!session?.access_token) return

    setLoading(true)
    setError(null)

    try {
      const data = await adminRequest<{ users: ManagedUser[] }>(session.access_token, 'GET')
      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [session?.access_token])

  function startEdit(user: ManagedUser) {
    setEditId(user.id)
    setEditRole(user.role as Role)
    setEditNom(user.nom ?? '')
    setEditPrenom(user.prenom ?? '')
    setNotice(null)
    setError(null)
  }

  async function saveEdit() {
    if (!session?.access_token || !editId) return

    setSavingEdit(true)
    setError(null)
    setNotice(null)

    try {
      await adminRequest(session.access_token, 'PATCH', {
        id: editId,
        role: editRole,
        nom: editNom,
        prenom: editPrenom,
      })
      setEditId(null)
      setNotice('Profil mis a jour.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise a jour impossible.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    if (!session?.access_token) return

    setCreating(true)
    setError(null)
    setNotice(null)

    try {
      const payload = await adminRequest<{ user: { email: string; role: Role; requires_email_confirmation?: boolean } }>(session.access_token, 'POST', {
        email: createEmail,
        password: createPassword,
        role: createRole,
        nom: createNom,
        prenom: createPrenom,
      })

      setCreateEmail('')
      setCreatePassword('')
      setCreateRole(DEFAULT_ROLE)
      setCreateNom('')
      setCreatePrenom('')
      setNotice(
        payload.user.requires_email_confirmation
          ? `Compte cree pour ${payload.user.email}. Une confirmation email Supabase peut etre necessaire avant la premiere connexion.`
          : `Compte cree pour ${payload.user.email} (${ROLE_LABELS[payload.user.role]}).`,
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation impossible.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Utilisateurs</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Creez des comptes supplementaires et attribuez leur type de session depuis l&apos;ERP.
        </p>
      </div>

      {(error || notice) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Creer un compte</h3>
              <p className="text-sm text-slate-500">Le compte est cree dans Supabase Auth et son type de session est prepare dans `profils`.</p>
            </div>
          </div>

          <form onSubmit={createUser} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Email">
                <input className={inp} type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} required />
              </Field>
            </div>
            <Field label="Mot de passe provisoire">
              <input className={inp} type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} minLength={8} required />
            </Field>
            <Field label="Type de session">
              <select className={inp} value={createRole} onChange={e => setCreateRole(e.target.value as Role)}>
                {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Prenom">
              <input className={inp} value={createPrenom} onChange={e => setCreatePrenom(e.target.value)} />
            </Field>
            <Field label="Nom">
              <input className={inp} value={createNom} onChange={e => setCreateNom(e.target.value)} />
            </Field>

            <div className="col-span-2 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Le role choisi devient le type de session attribue au compte.
              </p>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {creating ? 'Creation...' : 'Creer le compte'}
              </button>
            </div>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-2">
          {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
            <div key={role} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[role]}`}>
                {label}
              </span>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                {role === 'admin' && 'Super administrateur'}
                {role === 'dirigeant' && 'Acces complet'}
                {role === 'exploitant' && 'Planning, OT, flotte'}
                {role === 'mecanicien' && 'Vehicules, tachy'}
                {role === 'commercial' && 'Clients, OT, facturation'}
                {role === 'comptable' && 'Dashboard, facturation'}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Aucun utilisateur enregistre.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Utilisateur', 'Email', 'Type de session', 'Derniere connexion', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} className={`border-t border-slate-100 ${index % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                  <td className="px-4 py-3">
                    {editId === user.id ? (
                      <div className="flex gap-2">
                        <input className={inp} placeholder="Prenom" value={editPrenom} onChange={e => setEditPrenom(e.target.value)} />
                        <input className={inp} placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-slate-800">
                          {[user.prenom, user.nom].filter(Boolean).join(' ') || <span className="text-slate-400 italic">Non renseigne</span>}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{user.user_id.slice(0, 8)}...</div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{user.email ?? <span className="text-slate-400 italic">Email indisponible</span>}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {user.email_confirmed_at ? 'Confirme' : 'A confirmer'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editId === user.id ? (
                      <select className={inp} value={editRole} onChange={e => setEditRole(e.target.value as Role)}>
                        {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
                          <option key={role} value={role}>{label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[user.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_LABELS[user.role as Role] ?? user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('fr-FR') : 'Jamais'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editId === user.id ? (
                      <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => setEditId(null)} className="text-xs text-slate-400 hover:text-slate-600">
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveEdit()}
                          disabled={savingEdit}
                          className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-white hover:bg-slate-700 disabled:opacity-50"
                        >
                          {savingEdit ? '...' : 'Sauvegarder'}
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => startEdit(user)} className="text-xs text-slate-400 hover:text-slate-700">
                        Modifier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}
