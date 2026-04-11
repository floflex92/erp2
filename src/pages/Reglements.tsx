import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Tab = 'reglements' | 'relances' | 'scoring'

interface Facture {
  id: string
  numero: string
  client_id: string
  montant_ht: number
  montant_tva: number | null
  montant_ttc: number | null
  taux_tva: number
  statut: string
  date_emission: string
  date_echeance: string | null
  date_paiement: string | null
  mode_paiement: string | null
  notes: string | null
}

interface Client {
  id: string
  nom: string
}

interface Scenario {
  id: string
  nom: string
  niveau: number
  delai_apres_echeance: number
  type: string
  sujet_template: string | null
  corps_template: string | null
  actif: boolean
}

interface RelanceHist {
  id: string
  facture_id: string
  scenario_id: string | null
  niveau: number
  date_envoi: string
  mode: string
  montant_relance: number
  statut: string
}

interface ScoringRow {
  client_id: string
  client_nom: string
  nb_factures: number
  ca_total: number
  retard_moyen_jours: number
  encours_retard: number
  encours_total: number
  nb_factures_retard: number
  score_paiement: number
  categorie_risque: 'vert' | 'orange' | 'rouge'
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnPrimary = `${btn} bg-slate-800 text-white hover:bg-slate-700`
const btnGhost = `${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`

const STATUT_COLORS: Record<string, string> = {
  brouillon: 'bg-slate-100 text-slate-500',
  envoyee: 'bg-blue-100 text-blue-700',
  payee: 'bg-green-100 text-green-700',
  en_retard: 'bg-red-100 text-red-700',
  annulee: 'bg-slate-100 text-slate-400',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée', en_retard: 'En retard', annulee: 'Annulée',
}

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

function retardJours(f: Facture): number {
  if (f.statut === 'payee' && f.date_paiement && f.date_echeance) {
    const d = Math.floor((new Date(f.date_paiement).getTime() - new Date(f.date_echeance).getTime()) / 86400000)
    return d > 0 ? d : 0
  }
  if ((f.statut === 'en_retard' || f.statut === 'envoyee') && f.date_echeance) {
    const d = Math.floor((Date.now() - new Date(f.date_echeance).getTime()) / 86400000)
    return d > 0 ? d : 0
  }
  return 0
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'reglements', label: 'Règlements' },
    { key: 'relances', label: 'Relances' },
    { key: 'scoring', label: 'Scoring clients' },
  ]
  return (
    <div className="flex gap-1 mb-6 border-b border-slate-200">
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

function Stat({ label, value, sub, color = 'slate' }: {
  label: string; value: string; sub?: string; color?: 'blue' | 'red' | 'green' | 'slate' | 'amber'
}) {
  const cls = {
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
    red:   'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    slate: 'bg-slate-50 text-slate-800 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[color]
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

// ─── Onglet Règlements ───────────────────────────────────────────────────────
function ReglementsTab() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('actifs')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0])
  const [showPayModal, setShowPayModal] = useState<Facture | null>(null)

  async function load() {
    setLoading(true)
    const [f, c] = await Promise.all([
      supabase.from('factures').select('*').order('date_emission', { ascending: false }),
      supabase.from('clients').select('id, nom').order('nom'),
    ])
    setFactures(f.data ?? [])
    setClients(c.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const clientMap = useMemo(() =>
    Object.fromEntries(clients.map(c => [c.id, c.nom])), [clients])

  const filtered = useMemo(() => {
    let list = factures.filter(f => f.statut !== 'annulee' && f.statut !== 'brouillon')
    if (filterStatut === 'en_retard') list = list.filter(f => f.statut === 'en_retard')
    if (filterStatut === 'envoyee') list = list.filter(f => f.statut === 'envoyee')
    if (filterStatut === 'payee') list = list.filter(f => f.statut === 'payee')
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(f =>
        f.numero.toLowerCase().includes(s) ||
        (clientMap[f.client_id] ?? '').toLowerCase().includes(s)
      )
    }
    return list
  }, [factures, filterStatut, search, clientMap])

  const encours = useMemo(() =>
    factures.filter(f => f.statut === 'envoyee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [factures])
  const enRetard = useMemo(() =>
    factures.filter(f => f.statut === 'en_retard').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [factures])
  const total = useMemo(() =>
    factures.filter(f => !['annulee','brouillon'].includes(f.statut)).reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [factures])
  const encaisse = useMemo(() =>
    factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [factures])
  const tauxRecouvrement = total > 0 ? Math.round(encaisse / total * 100) : 0

  const dsoRaw = useMemo(() => {
    const payees = factures.filter(f => f.statut === 'payee' && f.date_paiement && f.date_echeance)
    if (!payees.length) return 0
    const sum = payees.reduce((s, f) => {
      const d = Math.max(0, Math.floor((new Date(f.date_paiement!).getTime() - new Date(f.date_emission).getTime()) / 86400000))
      return s + d
    }, 0)
    return Math.round(sum / payees.length)
  }, [factures])

  async function marquerPayee(f: Facture, date: string) {
    setSaving(f.id)
    await supabase.from('factures').update({
      statut: 'payee',
      date_paiement: date,
    }).eq('id', f.id)
    setSaving(null)
    setShowPayModal(null)
    load()
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Encours envoyé" value={fmtEur(encours)} color="blue" />
        <Stat label="En retard" value={fmtEur(enRetard)} sub={`${factures.filter(f=>f.statut==='en_retard').length} factures`} color="red" />
        <Stat label="DSO moyen" value={`${dsoRaw} j`} sub="délai encaissement" color="amber" />
        <Stat label="Taux recouvrement" value={`${tauxRecouvrement} %`} sub={fmtEur(encaisse)} color="green" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className={`${inp} w-auto`}>
          <option value="actifs">Tous actifs</option>
          <option value="en_retard">En retard</option>
          <option value="envoyee">Envoyées</option>
          <option value="payee">Payées</option>
        </select>
        <input
          className={`${inp} flex-1 min-w-[160px]`}
          placeholder="Rechercher numéro ou client..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tableau */}
      {loading ? (
        <div className="text-center py-10 text-slate-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Aucune facture</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Numéro', 'Client', 'Montant TTC', 'Émission', 'Échéance', 'Retard', 'Statut', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => {
                const retard = retardJours(f)
                return (
                  <tr key={f.id} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">{f.numero}</td>
                    <td className="px-3 py-2 text-slate-800 font-medium truncate max-w-[150px]">{clientMap[f.client_id] ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">{fmtEur(f.montant_ttc ?? f.montant_ht)}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{f.date_emission}</td>
                    <td className="px-3 py-2 text-slate-500 text-xs">{f.date_echeance ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {retard > 0
                        ? <span className="text-red-600 font-semibold text-xs">{retard} j</span>
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUT_COLORS[f.statut] ?? ''}`}>
                        {STATUT_LABELS[f.statut] ?? f.statut}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {f.statut !== 'payee' && (
                        <button
                          onClick={() => { setShowPayModal(f); setPayDate(new Date().toISOString().split('T')[0]) }}
                          disabled={saving === f.id}
                          className="text-xs text-emerald-700 hover:underline font-medium"
                        >
                          Marquer payée
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal paiement */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 space-y-4">
            <h3 className="font-semibold text-slate-800">Enregistrer le paiement</h3>
            <p className="text-sm text-slate-600">
              {showPayModal.numero} — {fmtEur(showPayModal.montant_ttc ?? showPayModal.montant_ht)}
            </p>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Date de paiement</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={inp} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowPayModal(null)} className={btnGhost}>Annuler</button>
              <button
                onClick={() => marquerPayee(showPayModal, payDate)}
                disabled={saving === showPayModal.id}
                className={btnPrimary}
              >
                {saving === showPayModal.id ? 'Enregistrement...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Onglet Relances ─────────────────────────────────────────────────────────
function RelancesTab() {
  const [factures, setFactures] = useState<Facture[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [historique, setHistorique] = useState<RelanceHist[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [view, setView] = useState<'aenvoyer' | 'historique' | 'scenarios'>('aenvoyer')

  async function load() {
    setLoading(true)
    const [f, c, sc, h] = await Promise.all([
      supabase.from('factures').select('*')
        .in('statut', ['en_retard', 'envoyee'])
        .not('date_echeance', 'is', null)
        .order('date_echeance'),
      supabase.from('clients').select('id, nom').order('nom'),
      (supabase.from('relances_scenarios' as any).select('*').eq('actif', true).order('niveau') as any),
      (supabase.from('relances_historique' as any).select('*').order('date_envoi', { ascending: false }).limit(100) as any),
    ])
    setFactures(f.data ?? [])
    setClients(c.data ?? [])
    setScenarios(sc.data ?? [])
    setHistorique(h.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const clientMap = useMemo(() =>
    Object.fromEntries(clients.map(c => [c.id, c.nom])), [clients])

  const facturesEnRetard = useMemo(() =>
    factures.filter(f => {
      if (!f.date_echeance) return false
      return new Date(f.date_echeance) < new Date()
    }), [factures])

  function niveauSuggere(f: Facture): Scenario | null {
    const retard = retardJours(f)
    const hist = historique.filter(h => h.facture_id === f.id)
    const niveauMax = hist.length > 0 ? Math.max(...hist.map(h => h.niveau)) : 0
    const suivant = scenarios.find(s => s.niveau === niveauMax + 1 && retard >= s.delai_apres_echeance)
    return suivant ?? null
  }

  async function envoyerRelance(f: Facture, sc: Scenario) {
    setSending(f.id)
    const { error } = await (supabase.from('relances_historique' as any) as any).insert({
      facture_id: f.id,
      scenario_id: sc.id,
      niveau: sc.niveau,
      mode: sc.type,
      montant_relance: f.montant_ttc ?? f.montant_ht,
      statut: 'envoye',
    })
    if (!error) {
      setSuccess(`Relance niveau ${sc.niveau} enregistrée pour ${f.numero}`)
      setTimeout(() => setSuccess(null), 3000)
      load()
    }
    setSending(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-slate-200 mb-4">
        {(['aenvoyer', 'historique', 'scenarios'] as const).map(v => {
          const labels = { aenvoyer: 'À envoyer', historique: 'Historique', scenarios: 'Scénarios' }
          return (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${
                view === v ? 'border-slate-800 text-slate-800 font-medium' : 'border-transparent text-slate-400'
              }`}
            >{labels[v]}</button>
          )
        })}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">{success}</div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400">Chargement...</div>
      ) : view === 'aenvoyer' ? (
        facturesEnRetard.length === 0 ? (
          <div className="text-center py-10 text-slate-400">Aucune facture en retard — excellente situation !</div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{facturesEnRetard.length} facture(s) en retard de paiement</p>
            {facturesEnRetard.map(f => {
              const sc = niveauSuggere(f)
              const retard = retardJours(f)
              const hist = historique.filter(h => h.facture_id === f.id)
              return (
                <div key={f.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-800">{clientMap[f.client_id] ?? '—'}</span>
                      <span className="ml-2 text-xs text-slate-400 font-mono">{f.numero}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{fmtEur(f.montant_ttc ?? f.montant_ht)}</p>
                      <p className="text-xs text-red-600">{retard} j de retard</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Échéance : {f.date_echeance}</span>
                    {hist.length > 0 && (
                      <span className="bg-slate-100 px-2 py-0.5 rounded">
                        {hist.length} relance(s) envoyée(s) — dernier : niv. {Math.max(...hist.map(h => h.niveau))}
                      </span>
                    )}
                  </div>
                  {sc ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700">Relance suggérée : Niveau {sc.niveau} — {sc.nom}</p>
                        <p className="text-xs text-amber-600 mt-0.5">{sc.sujet_template}</p>
                      </div>
                      <button
                        onClick={() => envoyerRelance(f, sc)}
                        disabled={sending === f.id}
                        className={btnPrimary}
                      >
                        {sending === f.id ? 'Envoi...' : 'Enregistrer relance'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {scenarios.length === 0 ? 'Aucun scénario configuré' : 'Relance max atteinte — action manuelle requise'}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )
      ) : view === 'historique' ? (
        historique.length === 0 ? (
          <div className="text-center py-10 text-slate-400">Aucune relance envoyée</div>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Date', 'Facture', 'Niveau', 'Mode', 'Montant', 'Statut'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historique.map(h => (
                  <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(h.date_envoi).toLocaleDateString('fr-FR')}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-700">
                      {factures.find(f => f.id === h.facture_id)?.numero ?? h.facture_id.slice(0,8)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">Niv. {h.niveau}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{h.mode}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmtEur(h.montant_relance)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        h.statut === 'envoye' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{h.statut}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        // Scénarios
        <div className="space-y-3">
          {scenarios.length === 0 ? (
            <div className="text-center py-10 text-slate-400">Aucun scénario configuré</div>
          ) : (
            scenarios.map(sc => (
              <div key={sc.id} className="border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {sc.niveau}
                  </span>
                  <h4 className="font-semibold text-slate-800">{sc.nom}</h4>
                  <span className="text-xs text-slate-400">J+{sc.delai_apres_echeance} après échéance</span>
                  <span className="ml-auto text-xs bg-slate-100 px-2 py-0.5 rounded">{sc.type}</span>
                </div>
                {sc.sujet_template && (
                  <p className="text-sm text-slate-600 font-medium">{sc.sujet_template}</p>
                )}
                {sc.corps_template && (
                  <pre className="text-xs text-slate-500 bg-slate-50 rounded p-3 whitespace-pre-wrap font-sans leading-relaxed">
                    {sc.corps_template}
                  </pre>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Onglet Scoring clients ───────────────────────────────────────────────────
function ScoringTab() {
  const [data, setData] = useState<ScoringRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'score_asc' | 'ca_desc' | 'retard_desc'>('score_asc')

  async function load() {
    setLoading(true)
    const { data: rows } = await (supabase.from('vue_scoring_clients' as any).select('*') as any)
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const sorted = useMemo(() => {
    const d = [...data]
    if (sort === 'score_asc') d.sort((a, b) => a.score_paiement - b.score_paiement)
    if (sort === 'ca_desc') d.sort((a, b) => b.ca_total - a.ca_total)
    if (sort === 'retard_desc') d.sort((a, b) => b.retard_moyen_jours - a.retard_moyen_jours)
    return d
  }, [data, sort])

  const risqueColors = {
    vert: 'bg-green-100 text-green-700',
    orange: 'bg-amber-100 text-amber-700',
    rouge: 'bg-red-100 text-red-700',
  }
  const risqueLabels = { vert: 'Sûr', orange: 'Surveillé', rouge: 'Risqué' }

  function ScoreBar({ score }: { score: number }) {
    const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-400' : 'bg-red-500'
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
        </div>
        <span className="text-xs font-semibold text-slate-700">{Math.round(score)}</span>
      </div>
    )
  }

  const rouge = data.filter(d => d.categorie_risque === 'rouge').length
  const orange = data.filter(d => d.categorie_risque === 'orange').length
  const encoursTotalRisque = data
    .filter(d => d.categorie_risque !== 'vert')
    .reduce((s, d) => s + d.encours_retard, 0)

  return (
    <div className="space-y-5">
      {/* Résumé risque */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Clients risqués" value={String(rouge)} sub="score < 50" color="red" />
        <Stat label="Clients surveillés" value={String(orange)} sub="score 50-79" color="amber" />
        <Stat label="Encours à risque" value={fmtEur(encoursTotalRisque)} sub="orange + rouge" color="red" />
      </div>

      {/* Tri */}
      <div className="flex gap-2">
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className={`${inp} w-auto`}>
          <option value="score_asc">Score (pire en premier)</option>
          <option value="ca_desc">CA (plus grand en premier)</option>
          <option value="retard_desc">Retard moyen (pire en premier)</option>
        </select>
        <button onClick={load} className={btnGhost}>Actualiser</button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Calcul du scoring...</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Aucun client</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Client', 'Factures', 'CA total', 'Retard moyen', 'Encours', 'En retard', 'Score', 'Risque'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(row => (
                <tr key={row.client_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2.5 font-medium text-slate-800 truncate max-w-[160px]">{row.client_nom}</td>
                  <td className="px-3 py-2.5 text-center text-slate-600">{row.nb_factures}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{fmtEur(row.ca_total)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {row.retard_moyen_jours > 0
                      ? <span className="text-red-600 font-medium">{Math.round(row.retard_moyen_jours)} j</span>
                      : <span className="text-green-600">0 j</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{fmtEur(row.encours_total)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {row.encours_retard > 0
                      ? <span className="text-red-700 font-semibold">{fmtEur(row.encours_retard)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-2.5"><ScoreBar score={row.score_paiement} /></td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${risqueColors[row.categorie_risque]}`}>
                      {risqueLabels[row.categorie_risque]}
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

// ─── Page principale ─────────────────────────────────────────────────────────
export default function Reglements() {
  const [tab, setTab] = useState<Tab>('reglements')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-2">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">Règlements & Recouvrement</h1>
        <p className="text-sm text-slate-500 mt-0.5">Suivi des paiements clients, relances automatiques, scoring de risque</p>
      </div>
      <TabBar active={tab} onChange={setTab} />
      {tab === 'reglements' && <ReglementsTab />}
      {tab === 'relances'   && <RelancesTab />}
      {tab === 'scoring'    && <ScoringTab />}
    </div>
  )
}
