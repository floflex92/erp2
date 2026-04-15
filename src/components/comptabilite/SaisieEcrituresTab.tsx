import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { listAssets } from '@/lib/services/assetsService'
import { listPersonsForDirectory } from '@/lib/services/personsService'

interface Journal { id: string; code_journal: string; libelle: string }
interface Compte { code_compte: string; libelle: string; classe: number }
interface LigneSaisie { ordre: number; compte_code: string; libelle_ligne: string; debit: string; credit: string; axe_camion_id: string; axe_chauffeur_id: string; axe_client_id: string; axe_mission_id: string }
interface VehiculeRef { id: string; immatriculation: string }
interface ChauffeurRef { id: string; nom: string; prenom: string | null }
interface ClientRef { id: string; nom: string }
interface MissionRef { id: string; reference: string }

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnPrimary = `${btn} bg-slate-800 text-white hover:bg-slate-900`
const btnSecondary = `${btn} border border-slate-300 text-slate-700 hover:bg-slate-100`

const EMPTY_LIGNE = (): LigneSaisie => ({ ordre: 1, compte_code: '', libelle_ligne: '', debit: '', credit: '', axe_camion_id: '', axe_chauffeur_id: '', axe_client_id: '', axe_mission_id: '' })

interface EcritureRow {
  id: string
  date_ecriture: string
  numero_mouvement: number
  libelle: string
  statut: string
  journal_code: string
  total_debit: number
  total_credit: number
}

export default function SaisieEcrituresTab() {
  const [journaux, setJournaux] = useState<Journal[]>([])
  const [comptes, setComptes] = useState<Compte[]>([])
  const [ecritures, setEcritures] = useState<EcritureRow[]>([])
  const [vehicules, setVehicules] = useState<VehiculeRef[]>([])
  const [chauffeursList, setChauffeursList] = useState<ChauffeurRef[]>([])
  const [clientsList, setClientsList] = useState<ClientRef[]>([])
  const [missionsList, setMissionsList] = useState<MissionRef[]>([])
  const [showAxes, setShowAxes] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Formulaire
  const [showForm, setShowForm] = useState(false)
  const [journalId, setJournalId] = useState('')
  const [dateEcriture, setDateEcriture] = useState(new Date().toISOString().slice(0, 10))
  const [libelle, setLibelle] = useState('')
  const [lignes, setLignes] = useState<LigneSaisie[]>([EMPTY_LIGNE(), { ...EMPTY_LIGNE(), ordre: 2 }])
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [jRes, cRes, eRes, assets, persons, clRes, mRes] = await Promise.all([
        supabase.from('compta_journaux').select('id, code_journal, libelle').eq('actif', true).order('code_journal'),
        supabase.from('compta_plan_comptable').select('code_compte, libelle, classe').eq('actif', true).order('code_compte'),
        supabase.rpc('compta_list_ecritures_recentes' as any, { p_limit: 50 }),
        listAssets(),
        listPersonsForDirectory(),
        supabase.from('clients').select('id, nom').order('nom'),
        (supabase.from('ordres_transport' as any).select('id, reference').order('created_at', { ascending: false }).limit(200) as any),
      ])

      setVehicules(
        assets
          .filter(asset => asset.type === 'vehicle')
          .map(asset => ({ id: asset.id, immatriculation: asset.registration ?? 'N/A' })),
      )

      setChauffeursList(
        persons
          .filter(person => person.person_type === 'driver')
          .map(person => ({
            id: person.id,
            nom: person.last_name ?? '',
            prenom: person.first_name,
          })),
      )

      if (clRes.data) setClientsList(clRes.data as ClientRef[])
      if (mRes.data) setMissionsList(mRes.data as MissionRef[])

      if (jRes.data) setJournaux(jRes.data as Journal[])
      if (cRes.data) setComptes(cRes.data as Compte[])

      // Fallback si la RPC n'existe pas encore
      if (eRes.error) {
        const fallback = await (supabase
          .from('compta_ecritures' as any)
          .select('id, date_ecriture, numero_mouvement, libelle, statut, journal_id')
          .order('date_ecriture', { ascending: false })
          .limit(50) as any)

        if (fallback.data && jRes.data) {
          const jMap = new Map((jRes.data as Journal[]).map(j => [j.id, j.code_journal]))
          setEcritures(fallback.data.map((e: any) => ({
            id: e.id,
            date_ecriture: e.date_ecriture,
            numero_mouvement: e.numero_mouvement,
            libelle: e.libelle,
            statut: e.statut,
            journal_code: jMap.get(e.journal_id) || '?',
            total_debit: 0,
            total_credit: 0,
          })))
        }
      } else {
        setEcritures((eRes.data || []) as EcritureRow[])
      }
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const totalDebit = lignes.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lignes.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const isBalancee = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0

  const addLigne = () => {
    setLignes(prev => [...prev, { ...EMPTY_LIGNE(), ordre: prev.length + 1 }])
  }

  const removeLigne = (idx: number) => {
    if (lignes.length <= 2) return
    setLignes(prev => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ordre: i + 1 })))
  }

  const updateLigne = (idx: number, field: keyof LigneSaisie, value: string) => {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))
  }

  const resetForm = () => {
    setJournalId('')
    setDateEcriture(new Date().toISOString().slice(0, 10))
    setLibelle('')
    setLignes([EMPTY_LIGNE(), { ...EMPTY_LIGNE(), ordre: 2 }])
    setShowForm(false)
  }

  const handleSave = async (valider: boolean) => {
    setError(null)
    setSuccess(null)

    if (!journalId || !libelle.trim() || !dateEcriture) {
      setError('Journal, date et libellé sont requis.')
      return
    }

    if (lignes.some(l => !l.compte_code)) {
      setError('Chaque ligne doit avoir un compte.')
      return
    }

    if (!isBalancee) {
      setError('L\'écriture n\'est pas équilibrée (débit ≠ crédit).')
      return
    }

    setSaving(true)
    try {
      const exercice = parseInt(dateEcriture.slice(0, 4))

      // Numéro mouvement
      const { data: maxMvt } = await (supabase
        .from('compta_ecritures' as any)
        .select('numero_mouvement')
        .eq('journal_id', journalId)
        .eq('exercice', exercice)
        .order('numero_mouvement', { ascending: false })
        .limit(1) as any)

      const nextMvt = ((maxMvt?.[0]?.numero_mouvement) || 0) + 1

      // Créer écriture
      const { data: ecriture, error: errE } = await (supabase
        .from('compta_ecritures' as any)
        .insert({
          journal_id: journalId,
          date_ecriture: dateEcriture,
          exercice,
          numero_mouvement: nextMvt,
          libelle: libelle.trim(),
          statut: 'brouillon',
        })
        .select('id')
        .single() as any)

      if (errE) throw new Error(errE.message)

      // Insérer lignes
      const lignesInsert = lignes.map((l, i) => ({
        ecriture_id: ecriture.id,
        ordre: i + 1,
        compte_code: l.compte_code,
        libelle_ligne: l.libelle_ligne || libelle.trim(),
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        axe_camion_id: l.axe_camion_id || null,
        axe_chauffeur_id: l.axe_chauffeur_id || null,
        axe_client_id: l.axe_client_id || null,
        axe_mission_id: l.axe_mission_id || null,
      }))

      const { error: errL } = await (supabase
        .from('compta_ecriture_lignes' as any)
        .insert(lignesInsert) as any)

      if (errL) throw new Error(errL.message)

      // Valider si demandé
      if (valider) {
        const { error: errV } = await (supabase
          .rpc('compta_valider_ecriture' as any, { p_ecriture_id: ecriture.id }) as any)

        if (errV) throw new Error(`Écriture créée mais validation impossible: ${errV.message}`)
      }

      setSuccess(`Écriture #${nextMvt} ${valider ? 'créée et validée' : 'créée en brouillon'}.`)
      resetForm()
      fetchData()
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleValider = async (ecritureId: string) => {
    setError(null)
    setSuccess(null)
    const { error: err } = await (supabase
      .rpc('compta_valider_ecriture' as any, { p_ecriture_id: ecritureId }) as any)

    if (err) {
      setError(`Validation impossible: ${err.message}`)
    } else {
      setSuccess('Écriture validée.')
      fetchData()
    }
  }

  const statutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      brouillon: 'bg-amber-100 text-amber-700',
      validee: 'bg-green-100 text-green-700',
      annulee: 'bg-slate-100 text-slate-500',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[statut] || 'bg-slate-100 text-slate-600'}`}>{statut}</span>
  }

  if (loading) return <div className="text-center py-8 text-slate-500">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      {!showForm ? (
        <button onClick={() => setShowForm(true)} className={btnPrimary}>+ Nouvelle écriture</button>
      ) : (
        <div className="border border-slate-200 rounded-lg p-5 space-y-4 bg-slate-50">
          <h3 className="font-medium text-slate-800">Nouvelle écriture comptable</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Journal *</label>
              <select value={journalId} onChange={e => setJournalId(e.target.value)} className={inp}>
                <option value="">Sélectionner...</option>
                {journaux.map(j => <option key={j.id} value={j.id}>{j.code_journal} - {j.libelle}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Date *</label>
              <input type="date" value={dateEcriture} onChange={e => setDateEcriture(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Libellé *</label>
              <input type="text" placeholder="Ex: Facture fournisseur X" value={libelle} onChange={e => setLibelle(e.target.value)} className={inp} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-600">Lignes comptables</label>
                <button onClick={() => setShowAxes(!showAxes)} className={`text-xs px-2 py-0.5 rounded ${showAxes ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {showAxes ? '▾ Axes analytiques' : '▸ Axes analytiques'}
                </button>
              </div>
              <button onClick={addLigne} className={`${btnSecondary} text-xs px-2 py-1`}>+ Ajouter ligne</button>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-200">
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700 w-8">#</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700">Compte</th>
                  <th className="px-2 py-1.5 text-left font-medium text-slate-700">Libellé ligne</th>
                  <th className="px-2 py-1.5 text-right font-medium text-slate-700 w-32">Débit</th>
                  <th className="px-2 py-1.5 text-right font-medium text-slate-700 w-32">Crédit</th>
                  <th className="px-2 py-1.5 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((l, i) => (
                  <>
                    <tr key={i} className="border-b border-slate-200">
                      <td className="px-2 py-1 text-slate-500">{i + 1}</td>
                      <td className="px-2 py-1">
                        <select
                          value={l.compte_code}
                          onChange={e => updateLigne(i, 'compte_code', e.target.value)}
                          className="w-full rounded border px-2 py-1 text-xs outline-none"
                        >
                          <option value="">Compte...</option>
                          {comptes.map(c => (
                            <option key={c.code_compte} value={c.code_compte}>{c.code_compte} - {c.libelle}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="text"
                          placeholder="Libellé"
                          value={l.libelle_ligne}
                          onChange={e => updateLigne(i, 'libelle_ligne', e.target.value)}
                          className="w-full rounded border px-2 py-1 text-xs outline-none"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={l.debit}
                          onChange={e => updateLigne(i, 'debit', e.target.value)}
                          className="w-full rounded border px-2 py-1 text-xs text-right outline-none"
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={l.credit}
                          onChange={e => updateLigne(i, 'credit', e.target.value)}
                          className="w-full rounded border px-2 py-1 text-xs text-right outline-none"
                        />
                      </td>
                      <td className="px-2 py-1 text-center">
                        {lignes.length > 2 && (
                          <button onClick={() => removeLigne(i)} className="text-red-500 hover:text-red-700 text-xs">✕</button>
                        )}
                      </td>
                    </tr>
                    {showAxes && (
                      <tr className="border-b border-slate-100 bg-blue-50/30">
                        <td className="px-2 py-1"></td>
                        <td colSpan={4} className="px-2 py-1">
                          <div className="flex gap-2 flex-wrap">
                            <select value={l.axe_camion_id} onChange={e => updateLigne(i, 'axe_camion_id' as keyof LigneSaisie, e.target.value)}
                              className="rounded border px-1.5 py-0.5 text-[11px] outline-none min-w-[120px]">
                              <option value="">Camion…</option>
                              {vehicules.map(v => <option key={v.id} value={v.id}>{v.immatriculation}</option>)}
                            </select>
                            <select value={l.axe_chauffeur_id} onChange={e => updateLigne(i, 'axe_chauffeur_id' as keyof LigneSaisie, e.target.value)}
                              className="rounded border px-1.5 py-0.5 text-[11px] outline-none min-w-[120px]">
                              <option value="">Chauffeur…</option>
                              {chauffeursList.map(c => <option key={c.id} value={c.id}>{c.prenom ? `${c.prenom} ` : ''}{c.nom}</option>)}
                            </select>
                            <select value={l.axe_client_id} onChange={e => updateLigne(i, 'axe_client_id' as keyof LigneSaisie, e.target.value)}
                              className="rounded border px-1.5 py-0.5 text-[11px] outline-none min-w-[120px]">
                              <option value="">Client…</option>
                              {clientsList.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                            </select>
                            <select value={l.axe_mission_id} onChange={e => updateLigne(i, 'axe_mission_id' as keyof LigneSaisie, e.target.value)}
                              className="rounded border px-1.5 py-0.5 text-[11px] outline-none min-w-[140px]">
                              <option value="">Mission/OT…</option>
                              {missionsList.map(m => <option key={m.id} value={m.id}>{m.reference}</option>)}
                            </select>
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-medium">
                  <td colSpan={3} className="px-2 py-2 text-right text-slate-700">Totaux</td>
                  <td className="px-2 py-2 text-right text-slate-800">{totalDebit.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right text-slate-800">{totalCredit.toFixed(2)}</td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={6} className="px-2 py-1 text-right">
                    {isBalancee ? (
                      <span className="text-green-600 text-xs font-medium">✓ Écriture équilibrée</span>
                    ) : totalDebit > 0 || totalCredit > 0 ? (
                      <span className="text-red-600 text-xs font-medium">✗ Écart: {Math.abs(totalDebit - totalCredit).toFixed(2)}</span>
                    ) : null}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => handleSave(false)} disabled={saving || !isBalancee} className={btnSecondary}>
              {saving ? 'Enregistrement...' : 'Enregistrer brouillon'}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving || !isBalancee} className={btnPrimary}>
              {saving ? 'Enregistrement...' : 'Enregistrer & valider'}
            </button>
            <button onClick={resetForm} className={`${btn} text-slate-500 hover:text-slate-700`}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des écritures récentes */}
      <div>
        <h3 className="font-medium text-slate-800 mb-3">Écritures récentes</h3>
        {ecritures.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">Aucune écriture enregistrée</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Date</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Journal</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Mv</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Libellé</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-800 border border-slate-200">Statut</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-800 border border-slate-200">Action</th>
                </tr>
              </thead>
              <tbody>
                {ecritures.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{e.date_ecriture}</td>
                    <td className="px-3 py-2 font-mono text-slate-700">{e.journal_code}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{e.numero_mouvement}</td>
                    <td className="px-3 py-2 text-slate-700">{e.libelle}</td>
                    <td className="px-3 py-2 text-center">{statutBadge(e.statut)}</td>
                    <td className="px-3 py-2 text-center">
                      {e.statut === 'brouillon' && (
                        <button onClick={() => handleValider(e.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          Valider
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
