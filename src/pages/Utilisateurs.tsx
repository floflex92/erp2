import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ROLE_LABELS, type Role } from '@/lib/auth'
import type { Tables } from '@/lib/database.types'

type Profil = Tables<'profils'>

const ROLE_BADGE: Record<string, string> = {
  admin:      'bg-yellow-100 text-yellow-700',
  dirigeant:  'bg-violet-100 text-violet-700',
  exploitant: 'bg-blue-100 text-blue-700',
  mecanicien: 'bg-orange-100 text-orange-700',
  commercial: 'bg-emerald-100 text-emerald-700',
  comptable:  'bg-slate-100 text-slate-600',
}

const inp = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-300'

export default function Utilisateurs() {
  const [profils, setProfils] = useState<Profil[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState<Role>('exploitant')
  const [editNom, setEditNom] = useState('')
  const [editPrenom, setEditPrenom] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('profils').select('*').order('created_at')
    setProfils(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(p: Profil) {
    setEditId(p.id)
    setEditRole(p.role as Role)
    setEditNom(p.nom ?? '')
    setEditPrenom(p.prenom ?? '')
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    await supabase.from('profils').update({
      role: editRole,
      nom: editNom || null,
      prenom: editPrenom || null,
    }).eq('id', editId)
    setSaving(false)
    setEditId(null)
    load()
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Utilisateurs</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Gérez les rôles et profils des utilisateurs connectés.
          Pour créer un nouvel utilisateur, utilisez le tableau de bord Supabase.
        </p>
      </div>

      {/* Légende des rôles */}
      <div className="grid grid-cols-6 gap-3 mb-6">
        {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([role, label]) => (
          <div key={role} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[role]}`}>
              {label}
            </span>
            <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
              {role === 'admin'      && 'Super administrateur'}
              {role === 'dirigeant'  && 'Accès complet'}
              {role === 'exploitant' && 'Planning, OT, Flotte'}
              {role === 'mecanicien' && 'Véhicules, Tachy'}
              {role === 'commercial' && 'Clients, OT, Facturation'}
              {role === 'comptable'  && 'Dashboard, Facturation'}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
        ) : profils.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Aucun profil enregistré. Les utilisateurs apparaissent ici après leur première connexion.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Utilisateur', 'Email', 'Rôle', 'Depuis le', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profils.map((p, i) => (
                <tr key={p.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                  <td className="px-4 py-3">
                    {editId === p.id ? (
                      <div className="flex gap-2">
                        <input className={inp} placeholder="Prénom" value={editPrenom} onChange={e => setEditPrenom(e.target.value)} />
                        <input className={inp} placeholder="Nom" value={editNom} onChange={e => setEditNom(e.target.value)} />
                      </div>
                    ) : (
                      <div className="font-medium text-slate-800">
                        {[p.prenom, p.nom].filter(Boolean).join(' ') || <span className="text-slate-400 italic">Non renseigné</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs font-mono">{p.user_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">
                    {editId === p.id ? (
                      <select
                        className={inp}
                        value={editRole}
                        onChange={e => setEditRole(e.target.value as Role)}
                      >
                        {(Object.entries(ROLE_LABELS) as [Role, string][]).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_BADGE[p.role] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_LABELS[p.role as Role] ?? p.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editId === p.id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditId(null)} className="text-xs text-slate-400 hover:text-slate-600">Annuler</button>
                        <button onClick={saveEdit} disabled={saving} className="text-xs bg-slate-800 text-white px-3 py-1 rounded-lg hover:bg-slate-700 disabled:opacity-50">
                          {saving ? '...' : 'Sauvegarder'}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(p)} className="text-xs text-slate-400 hover:text-slate-700">
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

      <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-sm text-blue-700 font-medium mb-1">Créer un nouvel utilisateur</p>
        <p className="text-xs text-blue-600">
          Rendez-vous dans le <strong>tableau de bord Supabase → Authentication → Users → Invite user</strong>.
          L'utilisateur choisit son mot de passe via l'email reçu, puis apparaît ici après sa première connexion.
          Vous pourrez alors lui attribuer un rôle.
        </p>
      </div>
    </div>
  )
}
