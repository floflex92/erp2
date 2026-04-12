import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Compte {
  code_compte: string
  libelle: string
  classe: number
  actif: boolean
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnPrimary = `${btn} bg-slate-800 text-white hover:bg-slate-900`
const btnSecondary = `${btn} border border-slate-300 text-slate-700 hover:bg-slate-100`

const CLASSES = [
  { value: 1, label: '1 - Comptes de capitaux' },
  { value: 2, label: '2 - Comptes d\'immobilisations' },
  { value: 3, label: '3 - Comptes de stocks' },
  { value: 4, label: '4 - Comptes de tiers' },
  { value: 5, label: '5 - Comptes financiers' },
  { value: 6, label: '6 - Comptes de charges' },
  { value: 7, label: '7 - Comptes de produits' },
]

export default function PlanComptableTab() {
  const [comptes, setComptes] = useState<Compte[]>([])
  const [filtreClasse, setFiltreClasse] = useState<number | null>(null)
  const [filtreTexte, setFiltreTexte] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Formulaire ajout
  const [showForm, setShowForm] = useState(false)
  const [editMode, setEditMode] = useState<string | null>(null) // code_compte en édition
  const [formCode, setFormCode] = useState('')
  const [formLibelle, setFormLibelle] = useState('')
  const [formClasse, setFormClasse] = useState<number>(6)
  const [saving, setSaving] = useState(false)

  const fetchComptes = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase.from('compta_plan_comptable').select('*').order('code_compte')
      if (filtreClasse !== null) query = query.eq('classe', filtreClasse)
      const { data, error: err } = await query
      if (err) throw new Error(err.message)
      setComptes((data || []) as Compte[])
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }, [filtreClasse])

  useEffect(() => { fetchComptes() }, [fetchComptes])

  const filteredComptes = comptes.filter(c => {
    if (!filtreTexte) return true
    const q = filtreTexte.toLowerCase()
    return c.code_compte.includes(q) || c.libelle.toLowerCase().includes(q)
  })

  const startEdit = (c: Compte) => {
    setEditMode(c.code_compte)
    setFormCode(c.code_compte)
    setFormLibelle(c.libelle)
    setFormClasse(c.classe)
    setShowForm(true)
  }

  const startAdd = () => {
    setEditMode(null)
    setFormCode('')
    setFormLibelle('')
    setFormClasse(6)
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditMode(null)
    setFormCode('')
    setFormLibelle('')
    setFormClasse(6)
  }

  const handleSave = async () => {
    setError(null)
    setSuccess(null)

    if (!formCode.match(/^\d{2,8}$/)) {
      setError('Le code compte doit contenir entre 2 et 8 chiffres.')
      return
    }
    if (!formLibelle.trim()) {
      setError('Le libellé est requis.')
      return
    }

    // Vérifier que la classe correspond au premier chiffre
    const expectedClasse = parseInt(formCode[0])
    if (expectedClasse !== formClasse && expectedClasse >= 1 && expectedClasse <= 7) {
      setFormClasse(expectedClasse)
    }

    setSaving(true)
    try {
      if (editMode) {
        // Mise à jour libellé/actif (code non modifiable)
        const { error: err } = await supabase
          .from('compta_plan_comptable')
          .update({ libelle: formLibelle.trim(), classe: formClasse })
          .eq('code_compte', editMode)

        if (err) throw new Error(err.message)
        setSuccess(`Compte ${editMode} mis à jour.`)
      } else {
        const { error: err } = await supabase
          .from('compta_plan_comptable')
          .insert({
            code_compte: formCode,
            libelle: formLibelle.trim(),
            classe: parseInt(formCode[0]) || formClasse,
            actif: true,
          })

        if (err) throw new Error(err.message)
        setSuccess(`Compte ${formCode} créé.`)
      }

      resetForm()
      fetchComptes()
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setSaving(false)
    }
  }

  const toggleActif = async (c: Compte) => {
    const { error: err } = await supabase
      .from('compta_plan_comptable')
      .update({ actif: !c.actif })
      .eq('code_compte', c.code_compte)

    if (err) {
      setError(`Erreur: ${err.message}`)
    } else {
      fetchComptes()
    }
  }

  const exportCSV = () => {
    const header = 'Code;Libellé;Classe;Actif'
    const rows = filteredComptes.map(c => `${c.code_compte};${c.libelle};${c.classe};${c.actif ? 'Oui' : 'Non'}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'plan_comptable.csv'
    link.click()
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Classe</label>
          <select
            value={filtreClasse ?? ''}
            onChange={e => setFiltreClasse(e.target.value ? parseInt(e.target.value) : null)}
            className={inp}
          >
            <option value="">Toutes</option>
            {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-slate-600 block mb-1">Recherche</label>
          <input
            type="text"
            placeholder="Code ou libellé..."
            value={filtreTexte}
            onChange={e => setFiltreTexte(e.target.value)}
            className={inp}
          />
        </div>
        <button onClick={startAdd} className={btnPrimary}>+ Ajouter un compte</button>
        <button onClick={exportCSV} className={btnSecondary}>Export CSV</button>
      </div>

      {showForm && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
          <h3 className="font-medium text-sm text-slate-800">{editMode ? `Modifier ${editMode}` : 'Nouveau compte'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Code compte *</label>
              <input
                type="text"
                placeholder="ex: 625200"
                value={formCode}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setFormCode(v)
                  if (v.length >= 1) {
                    const cl = parseInt(v[0])
                    if (cl >= 1 && cl <= 7) setFormClasse(cl)
                  }
                }}
                disabled={!!editMode}
                className={`${inp} ${editMode ? 'bg-slate-100' : ''}`}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Libellé *</label>
              <input
                type="text"
                placeholder="Libellé du compte"
                value={formLibelle}
                onChange={e => setFormLibelle(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Classe</label>
              <select value={formClasse} onChange={e => setFormClasse(parseInt(e.target.value))} className={inp}>
                {CLASSES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className={btnPrimary}>
              {saving ? 'Enregistrement...' : editMode ? 'Modifier' : 'Créer'}
            </button>
            <button onClick={resetForm} className={`${btn} text-slate-500 hover:text-slate-700`}>Annuler</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Chargement...</div>
      ) : (
        <div className="overflow-auto">
          <div className="text-xs text-slate-500 mb-2">{filteredComptes.length} compte(s)</div>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Code</th>
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Libellé</th>
                <th className="px-3 py-2 text-center font-medium text-slate-800 border border-slate-200">Classe</th>
                <th className="px-3 py-2 text-center font-medium text-slate-800 border border-slate-200">Actif</th>
                <th className="px-3 py-2 text-center font-medium text-slate-800 border border-slate-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredComptes.map(c => (
                <tr key={c.code_compte} className={`hover:bg-slate-50 border-b border-slate-200 ${!c.actif ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-slate-700">{c.code_compte}</td>
                  <td className="px-3 py-2 text-slate-700">{c.libelle}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{c.classe}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center space-x-2">
                    <button onClick={() => startEdit(c)} className="text-xs text-blue-600 hover:text-blue-800">Modifier</button>
                    <button onClick={() => toggleActif(c)} className="text-xs text-slate-500 hover:text-slate-700">
                      {c.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
