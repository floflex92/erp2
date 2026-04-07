import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type DriverGroup = {
  id: string
  nom: string
  description: string | null
  couleur: string
  created_at: string
}

type Conducteur = {
  id: string
  nom: string
  prenom: string
  statut: string
}

type GroupMember = {
  id: string
  conducteur_id: string
  added_at: string
  conducteurs: Conducteur | null
}

const COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
]

const inp = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500'

export function DriverGroupsSettings() {
  const [groups, setGroups]             = useState<DriverGroup[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [members, setMembers]           = useState<GroupMember[]>([])
  const [allConducteurs, setAllConducteurs] = useState<Conducteur[]>([])
  const [loading, setLoading]           = useState(false)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [notice, setNotice]             = useState<string | null>(null)

  // form création groupe
  const [newNom, setNewNom]             = useState('')
  const [newDesc, setNewDesc]           = useState('')
  const [newColor, setNewColor]         = useState(COLORS[0])

  // form edition groupe
  const [editGroup, setEditGroup]       = useState<DriverGroup | null>(null)

  const fetchToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  }, [])

  async function callApi(path: string, method: string, payload?: object) {
    const token = await fetchToken()
    if (!token) throw new Error('Session absente.')
    const res = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: payload ? JSON.stringify(payload) : undefined,
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
    return json
  }

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const resp = await callApi('/.netlify/functions/v11-driver-groups', 'GET')
      setGroups(resp.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur chargement groupes.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMembers = useCallback(async (groupId: string) => {
    try {
      const resp = await callApi(`/.netlify/functions/v11-driver-groups/members?group_id=${groupId}`, 'GET')
      setMembers(resp.data ?? [])
    } catch {
      setMembers([])
    }
  }, [])

  const loadConducteurs = useCallback(async () => {
    const { data } = await supabase
      .from('conducteurs')
      .select('id, nom, prenom, statut')
      .order('nom', { ascending: true })
    setAllConducteurs(data ?? [])
  }, [])

  useEffect(() => {
    void loadGroups()
    void loadConducteurs()
  }, [loadGroups, loadConducteurs])

  useEffect(() => {
    if (selectedGroupId) void loadMembers(selectedGroupId)
    else setMembers([])
  }, [selectedGroupId, loadMembers])

  async function handleCreateGroup(event: React.FormEvent) {
    event.preventDefault()
    if (!newNom.trim()) return
    setSaving(true)
    setError(null)
    try {
      await callApi('/.netlify/functions/v11-driver-groups', 'POST', {
        nom: newNom.trim(), description: newDesc.trim() || null, couleur: newColor,
      })
      setNewNom(''); setNewDesc(''); setNewColor(COLORS[0])
      setNotice('Groupe créé.')
      await loadGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur création.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdateGroup(event: React.FormEvent) {
    event.preventDefault()
    if (!editGroup) return
    setSaving(true)
    setError(null)
    try {
      await callApi(`/.netlify/functions/v11-driver-groups?group_id=${editGroup.id}`, 'PUT', {
        nom: editGroup.nom, description: editGroup.description, couleur: editGroup.couleur,
      })
      setNotice('Groupe mis à jour.')
      setEditGroup(null)
      await loadGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur mise à jour.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteGroup(groupId: string) {
    if (!confirm('Supprimer ce groupe et tous ses membres ?')) return
    setError(null)
    try {
      await callApi(`/.netlify/functions/v11-driver-groups?group_id=${groupId}`, 'DELETE')
      if (selectedGroupId === groupId) setSelectedGroupId(null)
      setNotice('Groupe supprimé.')
      await loadGroups()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression.')
    }
  }

  async function handleAddMember(conducteurId: string) {
    if (!selectedGroupId) return
    try {
      await callApi('/.netlify/functions/v11-driver-groups/members', 'POST', {
        group_id: selectedGroupId, conducteur_id: conducteurId,
      })
      setNotice('Conducteur ajouté.')
      await loadMembers(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur ajout membre.')
    }
  }

  async function handleRemoveMember(conducteurId: string) {
    if (!selectedGroupId) return
    try {
      await callApi(
        `/.netlify/functions/v11-driver-groups/members?group_id=${selectedGroupId}&conducteur_id=${conducteurId}`,
        'DELETE',
      )
      setNotice('Conducteur retiré.')
      await loadMembers(selectedGroupId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur suppression membre.')
    }
  }

  const memberIds = new Set(members.map(m => m.conducteur_id))
  const disponibles = allConducteurs.filter(c => !memberIds.has(c.id))
  const selectedGroup = groups.find(g => g.id === selectedGroupId)

  return (
    <div className="space-y-4">
      {/* Feedback ─────────────────────────────────────────────────────────── */}
      {(notice || error) && (
        <div
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: error ? 'rgba(244,114,182,0.25)' : 'rgba(56,189,248,0.25)',
            background:  error ? 'rgba(127,29,29,0.18)' : 'rgba(8,47,73,0.15)',
            color:       error ? '#fecdd3' : '#bae6fd',
          }}
        >
          {error ?? notice}
        </div>
      )}

      {/* Créer un groupe ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <p className="text-sm font-semibold text-slate-800 mb-3">Nouveau groupe</p>
        <form onSubmit={event => void handleCreateGroup(event)} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nom du groupe</label>
            <input className={inp} value={newNom} onChange={e => setNewNom(e.target.value)} placeholder="Ex: Zone Nord" required />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-xs font-medium text-slate-600 mb-1">Description (optionnel)</label>
            <input className={inp} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Ex: Conducteurs affectés Nord" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Couleur</label>
            <div className="flex gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: newColor === c ? '#1e293b' : 'transparent' }}
                />
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !newNom.trim()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--primary)' }}
          >
            Créer
          </button>
        </form>
      </div>

      {/* Liste des groupes ────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun groupe créé.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map(g => (
            <div
              key={g.id}
              className="rounded-2xl border cursor-pointer transition-all"
              style={{
                borderColor: selectedGroupId === g.id ? g.couleur : 'var(--border)',
                background: selectedGroupId === g.id ? `${g.couleur}15` : 'var(--surface)',
              }}
              onClick={() => setSelectedGroupId(selectedGroupId === g.id ? null : g.id)}
            >
              <div className="flex items-center gap-3 p-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: g.couleur }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{g.nom}</p>
                  {g.description && <p className="text-xs text-slate-500 truncate">{g.description}</p>}
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setEditGroup({ ...g }) }}
                    className="rounded-lg px-2 py-1 text-[10px] font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); void handleDeleteGroup(g.id) }}
                    className="rounded-lg px-2 py-1 text-[10px] font-medium border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    Suppr.
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form édition groupe ───────────────────────────────────────────────── */}
      {editGroup && (
        <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <p className="text-sm font-semibold text-slate-800 mb-3">Modifier le groupe</p>
          <form onSubmit={event => void handleUpdateGroup(event)} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nom</label>
              <input className={inp} value={editGroup.nom} onChange={e => setEditGroup(g => g ? { ...g, nom: e.target.value } : g)} required />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input className={inp} value={editGroup.description ?? ''} onChange={e => setEditGroup(g => g ? { ...g, description: e.target.value || null } : g)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Couleur</label>
              <div className="flex gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditGroup(g => g ? { ...g, couleur: c } : g)}
                    className="w-6 h-6 rounded-full border-2 transition-all"
                    style={{ backgroundColor: c, borderColor: editGroup.couleur === c ? '#1e293b' : 'transparent' }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: 'var(--primary)' }}>
                Enregistrer
              </button>
              <button type="button" onClick={() => setEditGroup(null)} className="rounded-xl border px-4 py-2.5 text-sm font-medium" style={{ borderColor: 'var(--border)' }}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gestion des membres ──────────────────────────────────────────────── */}
      {selectedGroupId && selectedGroup && (
        <div className="rounded-2xl border p-5" style={{ borderColor: selectedGroup.couleur, background: `${selectedGroup.couleur}08` }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full" style={{ background: selectedGroup.couleur }} />
            <p className="text-sm font-semibold text-slate-900">Membres — {selectedGroup.nom}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Membres actuels */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Conducteurs dans le groupe ({members.length})</p>
              {members.length === 0 ? (
                <p className="text-xs text-slate-400">Aucun membre.</p>
              ) : (
                <ul className="space-y-1.5">
                  {members.map(m => (
                    <li key={m.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <span className="text-sm text-slate-800">
                        {m.conducteurs?.prenom} {m.conducteurs?.nom}
                        <span className="ml-1.5 text-[10px] text-slate-400">{m.conducteurs?.statut}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRemoveMember(m.conducteur_id)}
                        className="text-[10px] text-red-400 hover:text-red-600"
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Conducteurs disponibles */}
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Ajouter un conducteur</p>
              {disponibles.length === 0 ? (
                <p className="text-xs text-slate-400">Tous les conducteurs sont déjà dans ce groupe.</p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                  {disponibles.map(c => (
                    <li key={c.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <span className="text-sm text-slate-700">{c.prenom} {c.nom}</span>
                      <button
                        type="button"
                        onClick={() => void handleAddMember(c.id)}
                        className="text-[10px] rounded-lg px-2 py-0.5 text-indigo-600 border border-indigo-200 hover:bg-indigo-50"
                      >
                        Ajouter
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
