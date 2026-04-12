import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface TvaPeriode {
  id: string
  annee: number
  periode_type: string
  periode_index: number
  date_debut: string
  date_fin: string
  statut: string
}

interface TvaLigne {
  id: string
  periode_id: string
  code_case: string
  base_ht: number
  montant_tva: number
  origine: string
}

interface TvaRegle {
  id: string
  code_tva: string
  taux: number
  regime: string
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnPrimary = `${btn} bg-slate-800 text-white hover:bg-slate-900`
const btnSecondary = `${btn} border border-slate-300 text-slate-700 hover:bg-slate-100`

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

export default function TvaDeclarativeTab() {
  const [periodes, setPeriodes] = useState<TvaPeriode[]>([])
  const [regles, setRegles] = useState<TvaRegle[]>([])
  const [selectedPeriode, setSelectedPeriode] = useState<TvaPeriode | null>(null)
  const [lignes, setLignes] = useState<TvaLigne[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [annee, setAnnee] = useState(new Date().getFullYear())

  // Formulaire nouvelle période
  const [showCreate, setShowCreate] = useState(false)
  const [newType, setNewType] = useState<'mensuel' | 'trimestriel'>('mensuel')
  const [newIndex, setNewIndex] = useState(new Date().getMonth() + 1)
  const [saving, setSaving] = useState(false)

  const fetchPeriodes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pRes, rRes] = await Promise.all([
        supabase.from('compta_tva_periodes').select('*').eq('annee', annee).order('periode_index'),
        supabase.from('compta_tva_regles').select('*').eq('actif', true).order('taux'),
      ])
      if (pRes.error) throw new Error(pRes.error.message)
      if (rRes.error) throw new Error(rRes.error.message)
      setPeriodes((pRes.data || []) as TvaPeriode[])
      setRegles((rRes.data || []) as TvaRegle[])
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setLoading(false)
    }
  }, [annee])

  useEffect(() => { fetchPeriodes() }, [fetchPeriodes])

  const fetchLignes = async (p: TvaPeriode) => {
    setSelectedPeriode(p)
    setLignes([])
    const { data, error: err } = await supabase
      .from('compta_tva_lignes')
      .select('*')
      .eq('periode_id', p.id)
      .order('code_case')

    if (err) {
      setError(`Erreur: ${err.message}`)
    } else {
      setLignes((data || []) as TvaLigne[])
    }
  }

  const createPeriode = async () => {
    setError(null)
    setSuccess(null)
    setSaving(true)

    try {
      let dateDebut: string, dateFin: string

      if (newType === 'mensuel') {
        const d = new Date(annee, newIndex - 1, 1)
        const f = new Date(annee, newIndex, 0)
        dateDebut = d.toISOString().slice(0, 10)
        dateFin = f.toISOString().slice(0, 10)
      } else {
        const qStart = (newIndex - 1) * 3
        const d = new Date(annee, qStart, 1)
        const f = new Date(annee, qStart + 3, 0)
        dateDebut = d.toISOString().slice(0, 10)
        dateFin = f.toISOString().slice(0, 10)
      }

      const { error: err } = await supabase
        .from('compta_tva_periodes')
        .insert({
          annee,
          periode_type: newType,
          periode_index: newIndex,
          date_debut: dateDebut,
          date_fin: dateFin,
          statut: 'ouverte',
        })

      if (err) throw new Error(err.message)

      setSuccess('Période créée.')
      setShowCreate(false)
      fetchPeriodes()
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setSaving(false)
    }
  }

  const calculerTvaPeriode = async (p: TvaPeriode) => {
    setError(null)
    setSuccess(null)

    try {
      // Calculer TVA collectée et déductible depuis les écritures validées de la période
      const { data: collectee, error: errC } = await (supabase.rpc('compta_calcul_tva_collectee' as any, {
        p_date_debut: p.date_debut,
        p_date_fin: p.date_fin,
      }) as any)

      const { data: deductible, error: errD } = await (supabase.rpc('compta_calcul_tva_deductible' as any, {
        p_date_debut: p.date_debut,
        p_date_fin: p.date_fin,
      }) as any)

      // Fallback: calcul direct depuis les écritures
      if (errC || errD) {
        const { data: ecrituresTva } = await (supabase
          .from('compta_ecriture_lignes' as any)
          .select('compte_code, debit, credit, compta_ecritures!inner(date_ecriture, statut)')
          .gte('compta_ecritures.date_ecriture', p.date_debut)
          .lte('compta_ecritures.date_ecriture', p.date_fin)
          .eq('compta_ecritures.statut', 'validee')
          .in('compte_code', ['445710', '445660']) as any)

        if (ecrituresTva) {
          let tvaCollectee = 0
          let tvaDeductible = 0

          for (const l of ecrituresTva) {
            if (l.compte_code === '445710') tvaCollectee += (l.credit - l.debit)
            if (l.compte_code === '445660') tvaDeductible += (l.debit - l.credit)
          }

          // Upsert lignes TVA
          const upserts = [
            { periode_id: p.id, code_case: 'TVA_COLLECTEE', base_ht: 0, montant_tva: Math.round(tvaCollectee * 100) / 100, origine: 'calcul_auto' },
            { periode_id: p.id, code_case: 'TVA_DEDUCTIBLE', base_ht: 0, montant_tva: Math.round(tvaDeductible * 100) / 100, origine: 'calcul_auto' },
            { periode_id: p.id, code_case: 'TVA_A_PAYER', base_ht: 0, montant_tva: Math.round((tvaCollectee - tvaDeductible) * 100) / 100, origine: 'calcul_auto' },
          ]

          for (const u of upserts) {
            await supabase
              .from('compta_tva_lignes')
              .upsert(u, { onConflict: 'periode_id,code_case' })
          }

          setSuccess('TVA calculée depuis les écritures validées.')
          fetchLignes(p)
          return
        }
      }

      if (collectee && deductible) {
        setSuccess('TVA calculée.')
        fetchLignes(p)
      }
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    }
  }

  const cloturerPeriode = async (p: TvaPeriode) => {
    const { error: err } = await supabase
      .from('compta_tva_periodes')
      .update({ statut: 'cloturee' })
      .eq('id', p.id)

    if (err) {
      setError(`Erreur: ${err.message}`)
    } else {
      setSuccess('Période clôturée.')
      fetchPeriodes()
      if (selectedPeriode?.id === p.id) setSelectedPeriode({ ...p, statut: 'cloturee' })
    }
  }

  const exportCA3 = () => {
    if (!selectedPeriode || lignes.length === 0) return

    const header = 'Case;Base HT;Montant TVA;Origine'
    const rows = lignes.map(l => `${l.code_case};${l.base_ht.toFixed(2)};${l.montant_tva.toFixed(2)};${l.origine}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    const label = selectedPeriode.periode_type === 'mensuel'
      ? MOIS[selectedPeriode.periode_index - 1]
      : `T${selectedPeriode.periode_index}`
    link.download = `CA3_${selectedPeriode.annee}_${label}.csv`
    link.click()
  }

  const statutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      ouverte: 'bg-blue-100 text-blue-700',
      cloturee: 'bg-green-100 text-green-700',
      declaree: 'bg-slate-100 text-slate-600',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[statut] || 'bg-slate-100 text-slate-600'}`}>{statut}</span>
  }

  if (loading) return <div className="text-center py-8 text-slate-500">Chargement...</div>

  return (
    <div className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      {/* Taux en vigueur */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        <h4 className="text-xs font-medium text-slate-600 mb-2">Taux TVA en vigueur</h4>
        <div className="flex gap-3 flex-wrap">
          {regles.map(r => (
            <span key={r.id} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700">
              {r.code_tva}: <strong>{r.taux}%</strong> ({r.regime})
            </span>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Année</label>
          <input type="number" value={annee} onChange={e => setAnnee(parseInt(e.target.value))} className={inp} style={{ width: 100 }} />
        </div>
        <button onClick={() => setShowCreate(true)} className={btnPrimary}>+ Nouvelle période</button>
      </div>

      {showCreate && (
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
          <h3 className="font-medium text-sm text-slate-800">Nouvelle période TVA</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Type</label>
              <select value={newType} onChange={e => { setNewType(e.target.value as any); setNewIndex(1) }} className={inp}>
                <option value="mensuel">Mensuel (CA3)</option>
                <option value="trimestriel">Trimestriel</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                {newType === 'mensuel' ? 'Mois' : 'Trimestre'}
              </label>
              <select value={newIndex} onChange={e => setNewIndex(parseInt(e.target.value))} className={inp}>
                {newType === 'mensuel'
                  ? MOIS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)
                  : [1, 2, 3, 4].map(q => <option key={q} value={q}>T{q}</option>)
                }
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={createPeriode} disabled={saving} className={btnPrimary}>
              {saving ? 'Création...' : 'Créer'}
            </button>
            <button onClick={() => setShowCreate(false)} className={`${btn} text-slate-500 hover:text-slate-700`}>Annuler</button>
          </div>
        </div>
      )}

      {/* Liste des périodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium text-slate-800 mb-3">Périodes {annee}</h3>
          {periodes.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">Aucune période pour {annee}</div>
          ) : (
            <div className="space-y-2" role="list">
              {periodes.map(p => {
                const label = p.periode_type === 'mensuel' ? MOIS[p.periode_index - 1] : `Trimestre ${p.periode_index}`
                const isSelected = selectedPeriode?.id === p.id
                return (
                  <div
                    key={p.id}
                    role="listitem"
                    onClick={() => fetchLignes(p)}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'border-slate-800 bg-slate-100' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-slate-800 text-sm">{label}</span>
                        <span className="ml-2 text-xs text-slate-500">{p.date_debut} → {p.date_fin}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {statutBadge(p.statut)}
                        {p.statut === 'ouverte' && (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); calculerTvaPeriode(p) }}
                              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Calculer
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); cloturerPeriode(p) }}
                              className="text-xs text-slate-500 hover:text-slate-700"
                            >
                              Clôturer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Détail période sélectionnée */}
        <div>
          {selectedPeriode ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-slate-800">
                  Détail TVA — {selectedPeriode.periode_type === 'mensuel' ? MOIS[selectedPeriode.periode_index - 1] : `T${selectedPeriode.periode_index}`} {selectedPeriode.annee}
                </h3>
                {lignes.length > 0 && (
                  <button onClick={exportCA3} className={btnSecondary}>Export CA3 CSV</button>
                )}
              </div>

              {lignes.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-300 rounded-lg">
                  Aucune ligne TVA. Cliquez "Calculer" pour générer.
                </div>
              ) : (
                <div className="space-y-3">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Case</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Base HT</th>
                        <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Montant TVA</th>
                        <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Origine</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map(l => (
                        <tr key={l.id} className={`hover:bg-slate-50 border-b border-slate-200 ${l.code_case === 'TVA_A_PAYER' ? 'font-bold bg-slate-50' : ''}`}>
                          <td className="px-3 py-2 text-slate-700">{l.code_case.replace(/_/g, ' ')}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{l.base_ht.toFixed(2)} €</td>
                          <td className="px-3 py-2 text-right text-slate-700">{l.montant_tva.toFixed(2)} €</td>
                          <td className="px-3 py-2 text-slate-500 text-xs">{l.origine}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Résumé */}
                  {lignes.find(l => l.code_case === 'TVA_A_PAYER') && (
                    <div className={`p-3 rounded-lg border ${
                      (lignes.find(l => l.code_case === 'TVA_A_PAYER')?.montant_tva || 0) >= 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="text-sm font-medium">
                        {(lignes.find(l => l.code_case === 'TVA_A_PAYER')?.montant_tva || 0) >= 0
                          ? `TVA à payer: ${lignes.find(l => l.code_case === 'TVA_A_PAYER')?.montant_tva.toFixed(2)} €`
                          : `Crédit de TVA: ${Math.abs(lignes.find(l => l.code_case === 'TVA_A_PAYER')?.montant_tva || 0).toFixed(2)} €`
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-sm">
              Sélectionnez une période pour voir le détail TVA
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
