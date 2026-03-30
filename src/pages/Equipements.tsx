import { useEffect, useMemo, useState } from 'react'
import { looseSupabase } from '@/lib/supabaseLoose'

type VehiculeRef = { id: string; immatriculation: string }
type RemorqueRef = { id: string; immatriculation: string }
type FlotteEquipement = {
  id: string
  vehicule_id: string | null
  remorque_id: string | null
  nom: string
  category: string | null
  quantite: number | null
  statut: string | null
  notes: string | null
  created_at?: string
}
type StorageMode = 'remote' | 'local'
type AssetType = 'vehicule' | 'remorque'

const LOCAL_KEY = 'nexora_flotte_equipements_v1'

const STATUS_OPTIONS = ['conforme', 'a_controler', 'hs'] as const

const INPUT_CLS = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400'

function readLocalEquipements(): FlotteEquipement[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as FlotteEquipement[]
  } catch {
    return []
  }
}

function writeLocalEquipements(rows: FlotteEquipement[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(rows))
}

function safeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function Equipements() {
  const [equipements, setEquipements] = useState<FlotteEquipement[]>([])
  const [vehicules, setVehicules] = useState<VehiculeRef[]>([])
  const [remorques, setRemorques] = useState<RemorqueRef[]>([])
  const [storageMode, setStorageMode] = useState<StorageMode>('remote')
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nom: '',
    category: 'securite',
    quantite: '1',
    statut: 'conforme',
    notes: '',
    assetType: 'vehicule' as AssetType,
    vehicule_id: '',
    remorque_id: '',
  })

  useEffect(() => {
    void loadAssets()
    void loadEquipements()
  }, [])

  async function loadAssets() {
    const [vRes, rRes] = await Promise.all([
      looseSupabase.from('vehicules').select('id, immatriculation').order('immatriculation'),
      looseSupabase.from('remorques').select('id, immatriculation').order('immatriculation'),
    ])
    setVehicules((vRes.data ?? []) as unknown as VehiculeRef[])
    setRemorques((rRes.data ?? []) as unknown as RemorqueRef[])
  }

  async function loadEquipements() {
    const remote = await looseSupabase.from('flotte_equipements').select('*').order('created_at', { ascending: false })
    if (remote.error) {
      setStorageMode('local')
      setEquipements(readLocalEquipements())
      return
    }
    setStorageMode('remote')
    setEquipements((remote.data ?? []) as unknown as FlotteEquipement[])
  }

  const vehiculeById = useMemo(() => new Map(vehicules.map(item => [item.id, item] as const)), [vehicules])
  const remorqueById = useMemo(() => new Map(remorques.map(item => [item.id, item] as const)), [remorques])

  const kpis = useMemo(() => {
    const actifs = equipements.length
    const controles = equipements.filter(item => item.statut === 'a_controler').length
    const hs = equipements.filter(item => item.statut === 'hs').length
    return { actifs, controles, hs }
  }, [equipements])

  function assignmentLabel(item: FlotteEquipement) {
    if (item.vehicule_id) {
      const vehicule = vehiculeById.get(item.vehicule_id)
      return `Camion - ${vehicule?.immatriculation ?? 'Non trouve'}`
    }
    if (item.remorque_id) {
      const remorque = remorqueById.get(item.remorque_id)
      return `Remorque - ${remorque?.immatriculation ?? 'Non trouvee'}`
    }
    return 'Non assigne'
  }

  function resetForm() {
    setEditingId(null)
    setForm({
      nom: '',
      category: 'securite',
      quantite: '1',
      statut: 'conforme',
      notes: '',
      assetType: 'vehicule',
      vehicule_id: '',
      remorque_id: '',
    })
  }

  async function saveEquipement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setNotice(null)

    if (!form.nom.trim()) {
      setError('Le nom de l equipement est obligatoire.')
      return
    }

    const assignmentId = form.assetType === 'vehicule' ? form.vehicule_id : form.remorque_id
    if (!assignmentId) {
      setError('Selectionne un camion ou une remorque.')
      return
    }

    const payload: FlotteEquipement = {
      id: editingId ?? safeId(),
      vehicule_id: form.assetType === 'vehicule' ? assignmentId : null,
      remorque_id: form.assetType === 'remorque' ? assignmentId : null,
      nom: form.nom.trim(),
      category: form.category.trim() || null,
      quantite: Number.parseInt(form.quantite, 10) || 1,
      statut: form.statut,
      notes: form.notes.trim() || null,
    }

    setSaving(true)
    try {
      if (storageMode === 'remote') {
        const action = editingId
          ? looseSupabase.from('flotte_equipements').update(payload).eq('id', editingId)
          : looseSupabase.from('flotte_equipements').insert(payload)
        const result = await action
        if (result.error) throw result.error
        await loadEquipements()
      } else {
        const next = [payload, ...equipements.filter(item => item.id !== payload.id)]
        writeLocalEquipements(next)
        setEquipements(next)
      }

      setNotice(editingId ? 'Equipement mis a jour.' : 'Equipement ajoute.')
      resetForm()
    } catch {
      const next = [payload, ...equipements.filter(item => item.id !== payload.id)]
      writeLocalEquipements(next)
      setEquipements(next)
      setStorageMode('local')
      setNotice('Equipement enregistre en local (table flotte_equipements indisponible).')
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  async function removeEquipement(id: string) {
    setError(null)
    setNotice(null)
    if (!confirm('Supprimer cet equipement ?')) return

    if (storageMode === 'remote') {
      const result = await looseSupabase.from('flotte_equipements').delete().eq('id', id)
      if (result.error) {
        setError(result.error.message)
        return
      }
      await loadEquipements()
      setNotice('Equipement supprime.')
      return
    }

    const next = equipements.filter(item => item.id !== id)
    writeLocalEquipements(next)
    setEquipements(next)
    setNotice('Equipement supprime.')
  }

  function editEquipement(item: FlotteEquipement) {
    setEditingId(item.id)
    setForm({
      nom: item.nom,
      category: item.category ?? '',
      quantite: String(item.quantite ?? 1),
      statut: item.statut ?? 'conforme',
      notes: item.notes ?? '',
      assetType: item.vehicule_id ? 'vehicule' : 'remorque',
      vehicule_id: item.vehicule_id ?? '',
      remorque_id: item.remorque_id ?? '',
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] nx-muted">Flotte</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Equipements</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 nx-subtle">
          Les equipements sont assignables a un camion ou a une remorque, au choix.
        </p>
      </div>

      {(notice || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="nx-card p-5"><p className="text-sm nx-subtle">Equipements actifs</p><p className="mt-3 text-3xl font-semibold">{kpis.actifs}</p></div>
        <div className="nx-card p-5"><p className="text-sm nx-subtle">A controler</p><p className="mt-3 text-3xl font-semibold">{kpis.controles}</p></div>
        <div className="nx-card p-5"><p className="text-sm nx-subtle">Hors service</p><p className="mt-3 text-3xl font-semibold">{kpis.hs}</p></div>
      </div>

      <form onSubmit={event => void saveEquipement(event)} className="nx-card p-5 grid gap-3 md:grid-cols-3">
        <Field label="Nom equipement"><input className={INPUT_CLS} value={form.nom} onChange={event => setForm(current => ({ ...current, nom: event.target.value }))} /></Field>
        <Field label="Type"><input className={INPUT_CLS} value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} /></Field>
        <Field label="Quantite"><input className={INPUT_CLS} type="number" min={1} value={form.quantite} onChange={event => setForm(current => ({ ...current, quantite: event.target.value }))} /></Field>

        <Field label="Assigner a">
          <select className={INPUT_CLS} value={form.assetType} onChange={event => setForm(current => ({ ...current, assetType: event.target.value as AssetType }))}>
            <option value="vehicule">Camion</option>
            <option value="remorque">Remorque</option>
          </select>
        </Field>

        {form.assetType === 'vehicule' ? (
          <Field label="Camion">
            <select className={INPUT_CLS} value={form.vehicule_id} onChange={event => setForm(current => ({ ...current, vehicule_id: event.target.value }))}>
              <option value="">Selectionner</option>
              {vehicules.map(item => <option key={item.id} value={item.id}>{item.immatriculation}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Remorque">
            <select className={INPUT_CLS} value={form.remorque_id} onChange={event => setForm(current => ({ ...current, remorque_id: event.target.value }))}>
              <option value="">Selectionner</option>
              {remorques.map(item => <option key={item.id} value={item.id}>{item.immatriculation}</option>)}
            </select>
          </Field>
        )}

        <Field label="Statut">
          <select className={INPUT_CLS} value={form.statut} onChange={event => setForm(current => ({ ...current, statut: event.target.value }))}>
            {STATUS_OPTIONS.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>

        <Field label="Notes"><input className={INPUT_CLS} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} /></Field>

        <div className="md:col-span-3 flex gap-2 justify-end">
          {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Annuler edition</button>}
          <button type="submit" disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Enregistrement...' : editingId ? 'Mettre a jour' : 'Ajouter'}
          </button>
        </div>
      </form>

      <div className="nx-card overflow-hidden">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-semibold">Registre equipements ({storageMode === 'remote' ? 'base distante' : 'stockage local'})</h3>
        </div>
        <div className="overflow-x-auto nx-scrollbar">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                {['Equipement', 'Affectation', 'Type', 'Quantite', 'Statut', 'Note', ''].map(column => (
                  <th key={column} className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em]">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {equipements.map(item => (
                <tr key={item.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <td className="px-5 py-4 font-semibold">{item.nom}</td>
                  <td className="px-5 py-4">{assignmentLabel(item)}</td>
                  <td className="px-5 py-4">{item.category ?? '-'}</td>
                  <td className="px-5 py-4">{item.quantite ?? 1}</td>
                  <td className="px-5 py-4">{item.statut ?? 'conforme'}</td>
                  <td className="px-5 py-4 nx-subtle">{item.notes ?? '-'}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => editEquipement(item)} className="text-xs text-slate-500 hover:text-slate-800">Modifier</button>
                      <button type="button" onClick={() => void removeEquipement(item.id)} className="text-xs text-slate-500 hover:text-red-600">Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
              {equipements.length === 0 && (
                <tr><td className="px-5 py-8 text-sm nx-subtle" colSpan={7}>Aucun equipement enregistre.</td></tr>
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
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
