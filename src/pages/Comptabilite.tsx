import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SaisieEcrituresTab from '@/components/comptabilite/SaisieEcrituresTab'
import PlanComptableTab from '@/components/comptabilite/PlanComptableTab'
import TvaDeclarativeTab from '@/components/comptabilite/TvaDeclarativeTab'
import PrimesRapprochementTab from '@/components/comptabilite/PrimesRapprochementTab'

type Tab = 'saisie' | 'plan-comptable' | 'primes-paie' | 'balance' | 'grand-livre' | 'bilan' | 'resultat' | 'tva' | 'export-fec'

interface BalanceRow {
  exercice: number
  compte_code: string
  compte_libelle: string
  total_debit: number
  total_credit: number
  solde_gestion: number
}

interface GLRow {
  date_ecriture: string
  journal_code: string
  numero_mouvement: number
  compte_code: string
  libelle: string
  debit: number
  credit: number
  solde_courant: number
}

interface BilanDetail {
  code_compte: string
  libelle_compte: string
  categorie: string
  montant: number
}

interface BilanSynthese {
  exercice: number
  total_actif: number
  total_passif: number
  ecart: number
}

interface ResultatDetail {
  code_compte: string
  libelle_compte: string
  categorie: string
  solde_gestion: number
}

interface ResultatSynthese {
  exercice: number
  total_produits: number
  total_charges: number
  resultat_net: number
}

interface FecExportRow {
  journal_code: string
  date: string
  compte_code: string
  debit: number
  credit: number
  libelle: string
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnPrimary = `${btn} bg-slate-800 text-white hover:bg-slate-900`

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'saisie', label: 'Saisie' },
    { key: 'plan-comptable', label: 'Plan Comptable' },
    { key: 'primes-paie', label: 'Primes paie' },
    { key: 'balance', label: 'Balance' },
    { key: 'grand-livre', label: 'Grand Livre' },
    { key: 'bilan', label: 'Bilan' },
    { key: 'resultat', label: 'Compte Résultat' },
    { key: 'tva', label: 'TVA' },
    { key: 'export-fec', label: 'Export FEC' },
  ]

  return (
    <div className="flex gap-1 mb-6 border-b border-slate-200 pb-0">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === t.key
              ? 'border-slate-800 text-slate-800'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

function BalanceTab() {
  const [data, setData] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exercice, setExercice] = useState<number>(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)

  const exportCSV = () => {
    const header = 'Code;Libellé;Débit;Crédit;Solde'
    const rows = data.map(r => `${r.compte_code};${r.compte_libelle};${r.total_debit.toFixed(2)};${r.total_credit.toFixed(2)};${r.solde_gestion.toFixed(2)}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `balance_${exercice}.csv`
    link.click()
  }

  useEffect(() => {
    const fetchBalance = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: result, error: err } = await (supabase
          .from('vue_compta_balance' as any)
          .select('*')
          .eq('exercice', exercice) as any)
          .order('compte_code')

        if (err) {
          setError(`Erreur : ${err.message}`)
          setData([])
          return
        }

        setData(result || [])
      } catch (err) {
        setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [exercice])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Exercice</label>
          <input
            type="number"
            value={exercice}
            onChange={e => setExercice(parseInt(e.target.value))}
            className={inp}
          />
        </div>
        {data.length > 0 && (
          <button onClick={exportCSV} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors">Export CSV</button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Chargement...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Aucune donnée pour cet exercice</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Code</th>
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Libellé</th>
                <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Débit</th>
                <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Crédit</th>
                <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Solde</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 border-b border-slate-200">
                  <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-200">{row.compte_code}</td>
                  <td className="px-3 py-2 text-slate-700 border-r border-slate-200">{row.compte_libelle}</td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-200">
                    {row.total_debit.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-200">
                    {row.total_credit.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium border-r border-slate-200">
                    <span className={row.solde_gestion !== 0 ? 'text-slate-800' : 'text-slate-400'}>
                      {row.solde_gestion.toFixed(2)}
                    </span>
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

function GrandLivreTab() {
  const [data, setData] = useState<GLRow[]>([])
  const [loading, setLoading] = useState(true)
  const [exercice, setExercice] = useState<number>(new Date().getFullYear())
  const [compteFilter, setCompteFilter] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const exportCSV = () => {
    const header = 'Date;Journal;Mv;Compte;Libellé;Débit;Crédit;Solde'
    const rows = data.map(r => `${r.date_ecriture};${r.journal_code};${r.numero_mouvement};${r.compte_code};${r.libelle};${r.debit.toFixed(2)};${r.credit.toFixed(2)};${r.solde_courant.toFixed(2)}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `grand_livre_${exercice}${compteFilter ? '_' + compteFilter : ''}.csv`
    link.click()
  }

  useEffect(() => {
    const fetchGL = async () => {
      setLoading(true)
      setError(null)
      try {
        let query = (supabase
          .from('vue_compta_grand_livre' as any)
          .select('*')
          .eq('exercice', exercice) as any)

        if (compteFilter) {
          query = query.ilike('compte_code', `${compteFilter}%`)
        }

        const { data: result, error: err } = await query.order('date_ecriture').order('numero_mouvement')

        if (err) {
          setError(`Erreur : ${err.message}`)
          setData([])
          return
        }

        setData(result || [])
      } catch (err) {
        setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchGL()
  }, [exercice, compteFilter])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-600 block mb-1">Exercice</label>
          <input
            type="number"
            value={exercice}
            onChange={e => setExercice(parseInt(e.target.value))}
            className={inp}
          />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium text-slate-600 block mb-1">Filtre compte</label>
          <input
            type="text"
            placeholder="ex: 411"
            value={compteFilter}
            onChange={e => setCompteFilter(e.target.value)}
            className={inp}
          />
        </div>
        {data.length > 0 && (
          <button onClick={exportCSV} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors">Export CSV</button>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Chargement...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Aucune donnée pour ce filtre</div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Date</th>
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Journal</th>
                <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Mv</th>
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Compte</th>
                <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Libellé</th>
                <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Débit</th>
                <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Crédit</th>
                <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Solde</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 border-b border-slate-200">
                  <td className="px-3 py-2 text-slate-700 border-r border-slate-200 whitespace-nowrap">{row.date_ecriture}</td>
                  <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-200">{row.journal_code}</td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-200">{row.numero_mouvement}</td>
                  <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-200">{row.compte_code}</td>
                  <td className="px-3 py-2 text-slate-700 border-r border-slate-200">{row.libelle}</td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-200">
                    {row.debit > 0 ? row.debit.toFixed(2) : ''}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-700 border-r border-slate-200">
                    {row.credit > 0 ? row.credit.toFixed(2) : ''}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{row.solde_courant.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function BilanTab() {
  const [detail, setDetail] = useState<BilanDetail[]>([])
  const [synthese, setSynthese] = useState<BilanSynthese | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercice, setExercice] = useState<number>(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBilan = async () => {
      setLoading(true)
      setError(null)
      try {
        const [detailRes, syntheseRes] = await Promise.all([
          (supabase
            .from('vue_compta_bilan' as any)
            .select('*')
            .eq('exercice', exercice)
            .order('categorie')
            .order('code_compte') as any),
          (supabase
            .from('vue_compta_bilan_synthese' as any)
            .select('*')
            .eq('exercice', exercice)
            .single() as any),
        ])

        if (detailRes.error) {
          setError(`Erreur détail: ${detailRes.error.message}`)
          setDetail([])
        } else {
          setDetail(detailRes.data || [])
        }

        if (syntheseRes.error) {
          setSynthese(null)
        } else {
          setSynthese(syntheseRes.data)
        }
      } catch (err) {
        setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchBilan()
  }, [exercice])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Exercice</label>
          <input
            type="number"
            value={exercice}
            onChange={e => setExercice(parseInt(e.target.value))}
            className={inp}
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Chargement...</div>
      ) : (
        <>
          {synthese && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Total Actif</div>
                <div className="text-2xl font-bold text-slate-800">{synthese.total_actif.toFixed(2)} €</div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Total Passif</div>
                <div className="text-2xl font-bold text-slate-800">{synthese.total_passif.toFixed(2)} €</div>
              </div>
              <div className={`p-4 border rounded-lg ${Math.abs(synthese.ecart) < 0.01 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="text-xs text-slate-600 mb-1">Écart</div>
                <div className={`text-2xl font-bold ${Math.abs(synthese.ecart) < 0.01 ? 'text-green-700' : 'text-red-700'}`}>
                  {synthese.ecart.toFixed(2)} €
                </div>
              </div>
            </div>
          )}

          {detail.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Aucune donnée pour cet exercice</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Code</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Libellé</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Catégorie</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-200">
                      <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-200">{row.code_compte}</td>
                      <td className="px-3 py-2 text-slate-700 border-r border-slate-200">{row.libelle_compte}</td>
                      <td className="px-3 py-2 text-slate-700 border-r border-slate-200">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          row.categorie === 'actif' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {row.categorie}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.montant.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ResultatTab() {
  const [detail, setDetail] = useState<ResultatDetail[]>([])
  const [synthese, setSynthese] = useState<ResultatSynthese | null>(null)
  const [loading, setLoading] = useState(true)
  const [exercice, setExercice] = useState<number>(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResultat = async () => {
      setLoading(true)
      setError(null)
      try {
        const [detailRes, syntheseRes] = await Promise.all([
          (supabase
            .from('vue_compta_compte_resultat' as any)
            .select('*')
            .eq('exercice', exercice)
            .order('categorie')
            .order('code_compte') as any),
          (supabase
            .from('vue_compta_compte_resultat_synthese' as any)
            .select('*')
            .eq('exercice', exercice)
            .single() as any),
        ])

        if (detailRes.error) {
          setError(`Erreur détail: ${detailRes.error.message}`)
          setDetail([])
        } else {
          setDetail(detailRes.data || [])
        }

        if (syntheseRes.error) {
          setSynthese(null)
        } else {
          setSynthese(syntheseRes.data)
        }
      } catch (err) {
        setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchResultat()
  }, [exercice])

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-end">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">Exercice</label>
          <input
            type="number"
            value={exercice}
            onChange={e => setExercice(parseInt(e.target.value))}
            className={inp}
          />
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-8 text-slate-500">Chargement...</div>
      ) : (
        <>
          {synthese && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Total Produits</div>
                <div className="text-2xl font-bold text-slate-800">{synthese.total_produits.toFixed(2)} €</div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Total Charges</div>
                <div className="text-2xl font-bold text-slate-800">{synthese.total_charges.toFixed(2)} €</div>
              </div>
              <div className={`p-4 border rounded-lg ${synthese.resultat_net >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <div className="text-xs text-slate-600 mb-1">Résultat Net</div>
                <div className={`text-2xl font-bold ${synthese.resultat_net >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {synthese.resultat_net.toFixed(2)} €
                </div>
              </div>
            </div>
          )}

          {detail.length === 0 ? (
            <div className="text-center py-8 text-slate-500">Aucune donnée pour cet exercice</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Code</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Libellé</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-800 border border-slate-200">Catégorie</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-800 border border-slate-200">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 border-b border-slate-200">
                      <td className="px-3 py-2 font-mono text-slate-700 border-r border-slate-200">{row.code_compte}</td>
                      <td className="px-3 py-2 text-slate-700 border-r border-slate-200">{row.libelle_compte}</td>
                      <td className="px-3 py-2 text-slate-700 border-r border-slate-200">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          row.categorie === 'produits' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {row.categorie}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.solde_gestion.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ExportFecTab() {
  const [generating, setGenerating] = useState(false)
  const [exercice, setExercice] = useState<number>(new Date().getFullYear())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleExport = async () => {
    setGenerating(true)
    setError(null)
    setSuccess(null)

    try {
      // Appel de la fonction SQL pour générer l'export FEC
      const { data, error: err } = await (supabase
        .rpc('compta_export_fec_v1' as any, { p_exercice: exercice }) as any)

      if (err) {
        setError(`Erreur: ${err.message}`)
        return
      }

      if (!data || data.length === 0) {
        setError('Aucune donnée à exporter pour cet exercice')
        return
      }

      // Formatage FEC (DGFiP spec): JournalCode|Date|Compte|Débit|Crédit|Libellé|...
      const csvContent = [
        'JournalCode|Date|CompteNum|Debit|Credit|EcritureLib|EcritureLet|EcritureLetDate|CompteLib|CompteAux|Devise',
        ...data.map((row: FecExportRow) =>
          [
            row.journal_code || '',
            row.date || '',
            row.compte_code || '',
            row.debit || '0',
            row.credit || '0',
            row.libelle || '',
            '', // EcritureLet
            '', // EcritureLetDate
            '', // CompteLib
            '', // CompteAux
            'EUR', // Devise
          ].join('|')
        ),
      ].join('\n')

      // Téléchargement du fichier
      const blob = new Blob([csvContent], { type: 'text/plain;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `FEC_${exercice}.txt`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setSuccess(`Fichier FEC exporté avec succès (${data.length} lignes)`)
    } catch (err) {
      setError(`Erreur: ${err instanceof Error ? err.message : 'inconnue'}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <h3 className="font-medium text-slate-800 mb-2">Export FEC (Fichier des Écritures Comptables)</h3>
        <p className="text-sm text-slate-600 mb-4">
          Générez un export au format DGFiP (Trésor Public) pour transmission obligatoire en cas de contrôle fiscal.
        </p>

        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <label className="text-xs font-medium text-slate-600 block mb-1">Exercice</label>
            <input
              type="number"
              value={exercice}
              onChange={e => setExercice(parseInt(e.target.value))}
              disabled={generating}
              className={inp}
            />
          </div>
          <button
            onClick={handleExport}
            disabled={generating}
            className={btnPrimary}
          >
            {generating ? 'Génération...' : 'Exporter FEC'}
          </button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
      {success && <div className="p-3 bg-green-50 text-green-700 rounded text-sm">{success}</div>}

      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Format FEC</h4>
        <p className="text-sm text-blue-800 mb-2">
          Le fichier généré respecte le format DGFiP avec séparateur pipe (|):
        </p>
        <pre className="bg-white p-3 rounded text-xs border border-blue-200 overflow-auto">
{`JournalCode|Date|CompteNum|Debit|Credit|EcritureLib|...
AC|2026-04-01|401000|1500.00|0.00|Facture fournisseur...
VT|2026-04-02|411000|0.00|5000.00|Facture client...`}
        </pre>
      </div>
    </div>
  )
}

export default function Comptabilite() {
  const [activeTab, setActiveTab] = useState<Tab>('saisie')

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Comptabilité Générale</h1>
        <p className="text-sm text-slate-600">Saisie, états légaux et reporting comptable</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <TabBar active={activeTab} onChange={setActiveTab} />

        {activeTab === 'saisie' && <SaisieEcrituresTab />}
        {activeTab === 'plan-comptable' && <PlanComptableTab />}
        {activeTab === 'primes-paie' && <PrimesRapprochementTab />}
        {activeTab === 'balance' && <BalanceTab />}
        {activeTab === 'grand-livre' && <GrandLivreTab />}
        {activeTab === 'bilan' && <BilanTab />}
        {activeTab === 'resultat' && <ResultatTab />}
        {activeTab === 'tva' && <TvaDeclarativeTab />}
        {activeTab === 'export-fec' && <ExportFecTab />}
      </div>
    </div>
  )
}
