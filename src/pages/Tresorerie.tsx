import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Tab = 'mouvements' | 'rapprochement' | 'previsions'

interface Mouvement {
  id: string
  date_operation: string
  date_valeur: string | null
  libelle: string
  montant: number
  solde_apres: number | null
  reference_banque: string | null
  compte_bancaire: string
  statut: string
  import_hash: string | null
  created_at: string
}

interface Facture {
  id: string
  numero: string
  client_id: string
  montant_ht: number
  montant_ttc: number | null
  statut: string
  date_echeance: string | null
}

interface FactureFournisseur {
  id: string
  numero: string
  fournisseur_nom: string
  montant_ht: number
  montant_ttc: number | null
  statut: string
  date_echeance: string | null
}

interface MatchScore {
  facture: Facture | FactureFournisseur
  type: 'client' | 'fournisseur'
  score: number   // 0-100
  detail: string
}

interface Client { id: string; nom: string }

interface FluxPrevisionnel {
  id: string
  date_flux: string
  libelle: string
  montant: number
  type_flux: string
  probabilite: number
  source: string
  realise: boolean
  created_at: string
}

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
const btn = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors'
const btnPrimary = `${btn} bg-slate-800 text-white hover:bg-slate-700`
const btnGhost = `${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`

const fmtEur = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })

const TYPE_FLUX_LABELS: Record<string, string> = {
  client: 'Encaissement client',
  fournisseur: 'Paiement fournisseur',
  charge_fixe: 'Charge fixe',
  leasing: 'Leasing / crédit',
  salaires: 'Salaires',
  impot: 'Impôts / taxes',
  autre: 'Autre',
}

const TYPE_FLUX_COLORS: Record<string, string> = {
  client: 'bg-blue-100 text-blue-700',
  fournisseur: 'bg-orange-100 text-orange-700',
  charge_fixe: 'bg-slate-100 text-slate-700',
  leasing: 'bg-purple-100 text-purple-700',
  salaires: 'bg-pink-100 text-pink-700',
  impot: 'bg-red-100 text-red-700',
  autre: 'bg-slate-100 text-slate-600',
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'mouvements', label: 'Mouvements bancaires' },
    { key: 'rapprochement', label: 'Rapprochement' },
    { key: 'previsions', label: 'Prévisions 90 jours' },
  ]
  return (
    <div className="flex gap-1 mb-6 border-b border-slate-200">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
            active === t.key ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >{t.label}</button>
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
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

// ─── Import CSV helper ────────────────────────────────────────────────────────
function parseCsvBancaire(text: string): Array<{
  date_operation: string
  libelle: string
  montant: number
  solde_apres?: number
  import_hash: string
}> {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  const rows: ReturnType<typeof parseCsvBancaire> = []
  const sep = text.includes(';') ? ';' : ','

  for (const raw of lines) {
    const parts = raw.split(sep).map(p => p.replace(/^["']|["']$/g, '').trim())
    if (parts.length < 3) continue
    // Format attendu: date | libelle | montant [| solde]
    const [dateRaw, libelle, montantRaw, soldeRaw] = parts
    if (!dateRaw || !libelle || !montantRaw) continue

    // Parse date (dd/mm/yyyy ou yyyy-mm-dd)
    let date_op = ''
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw)) {
      const [d, m, y] = dateRaw.split('/')
      date_op = `${y}-${m}-${d}`
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      date_op = dateRaw
    } else {
      continue // format non reconnu
    }

    const montant = parseFloat(montantRaw.replace(',', '.').replace(/\s/g, ''))
    if (isNaN(montant)) continue
    const solde_apres = soldeRaw ? parseFloat(soldeRaw.replace(',', '.').replace(/\s/g, '')) : undefined

    const hash = `${date_op}|${libelle.slice(0, 50)}|${montant}`
    rows.push({ date_operation: date_op, libelle, montant, solde_apres, import_hash: hash })
  }
  return rows
}

// ─── Onglet Mouvements bancaires ─────────────────────────────────────────────
function MouvementsTab() {
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [filterStatut, setFilterStatut] = useState('tous')
  const fileRef = useRef<HTMLInputElement>(null)
  const [formManuel, setFormManuel] = useState({
    date_operation: new Date().toISOString().split('T')[0],
    libelle: '',
    montant: '',
  })
  const [savingManuel, setSavingManuel] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await (supabase.from('mouvements_bancaires' as any)
      .select('*')
      .order('date_operation', { ascending: false })
      .limit(500) as any)
    setMouvements(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (filterStatut === 'tous') return mouvements
    return mouvements.filter(m => m.statut === filterStatut)
  }, [mouvements, filterStatut])

  const solde = useMemo(() =>
    mouvements.sort((a, b) => a.date_operation < b.date_operation ? 1 : -1)[0]?.solde_apres
    ?? mouvements.reduce((s, m) => s + m.montant, 0), [mouvements])

  const entrees = useMemo(() => mouvements.filter(m => m.montant > 0).reduce((s, m) => s + m.montant, 0), [mouvements])
  const sorties = useMemo(() => mouvements.filter(m => m.montant < 0).reduce((s, m) => s + m.montant, 0), [mouvements])
  const aRapprocher = useMemo(() => mouvements.filter(m => m.statut === 'a_rapprocher').length, [mouvements])

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg(null)
    const text = await file.text()
    const rows = parseCsvBancaire(text)
    if (rows.length === 0) {
      setImportMsg('Aucune ligne valide trouvée. Format attendu : date;libelle;montant[;solde]')
      setImporting(false)
      return
    }
    let imported = 0
    let skipped = 0
    for (const row of rows) {
      const { error } = await (supabase.from('mouvements_bancaires' as any) as any).insert({
        date_operation: row.date_operation,
        libelle: row.libelle,
        montant: row.montant,
        solde_apres: row.solde_apres ?? null,
        import_hash: row.import_hash,
        statut: 'a_rapprocher',
      })
      if (error?.code === '23505') skipped++  // doublon
      else if (!error) imported++
    }
    setImportMsg(`Import terminé : ${imported} ligne(s) importée(s), ${skipped} doublon(s) ignoré(s)`)
    setImporting(false)
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  async function ajouterManuel() {
    if (!formManuel.date_operation || !formManuel.libelle || !formManuel.montant) return
    setSavingManuel(true)
    const montant = parseFloat(formManuel.montant.replace(',', '.'))
    if (isNaN(montant)) { setSavingManuel(false); return }
    const hash = `manuel|${formManuel.date_operation}|${formManuel.libelle}|${montant}|${Date.now()}`
    await (supabase.from('mouvements_bancaires' as any) as any).insert({
      date_operation: formManuel.date_operation,
      libelle: formManuel.libelle,
      montant,
      statut: 'a_rapprocher',
      import_hash: hash,
    })
    setFormManuel({ date_operation: new Date().toISOString().split('T')[0], libelle: '', montant: '' })
    setSavingManuel(false)
    load()
  }

  async function ignorerMouvement(id: string) {
    await (supabase.from('mouvements_bancaires' as any) as any).update({ statut: 'ignore' }).eq('id', id)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Solde estimé" value={fmtEur(solde ?? 0)} color={solde !== null && solde < 0 ? 'red' : 'green'} />
        <Stat label="Entrées (total)" value={fmtEur(entrees)} color="blue" />
        <Stat label="Sorties (total)" value={fmtEur(Math.abs(sorties))} color="amber" />
        <Stat label="À rapprocher" value={String(aRapprocher)} sub="mouvements" color={aRapprocher > 0 ? 'amber' : 'slate'} />
      </div>

      {/* Import CSV */}
      <div className="border border-dashed border-slate-300 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Import relevé bancaire (CSV)</p>
        <p className="text-xs text-slate-400">Format : <code>date;libelle;montant[;solde]</code> — séparateur ; ou , — décimale . ou ,</p>
        <div className="flex gap-3 items-center">
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleImportFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className={btnPrimary}>
            {importing ? 'Import en cours...' : 'Choisir un fichier CSV'}
          </button>
          {importMsg && <p className="text-sm text-slate-600">{importMsg}</p>}
        </div>
      </div>

      {/* Saisie manuelle */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Ajouter un mouvement manuellement</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Date</label>
            <input type="date" value={formManuel.date_operation}
              onChange={e => setFormManuel(p => ({ ...p, date_operation: e.target.value }))}
              className={inp} />
          </div>
          <div className="col-span-1">
            <label className="text-xs text-slate-500 font-medium block mb-1">Libellé</label>
            <input type="text" placeholder="Ex : Virement CLIENT SA..." value={formManuel.libelle}
              onChange={e => setFormManuel(p => ({ ...p, libelle: e.target.value }))}
              className={inp} />
          </div>
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Montant (+ crédit / − débit)</label>
            <input type="text" placeholder="Ex : 1500 ou -850" value={formManuel.montant}
              onChange={e => setFormManuel(p => ({ ...p, montant: e.target.value }))}
              className={inp} />
          </div>
        </div>
        <button onClick={ajouterManuel} disabled={savingManuel} className={btnPrimary}>
          {savingManuel ? 'Enregistrement...' : 'Ajouter'}
        </button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        {(['tous', 'a_rapprocher', 'rapproche', 'ignore'] as const).map(s => {
          const labels = { tous: 'Tous', a_rapprocher: 'À rapprocher', rapproche: 'Rapproché', ignore: 'Ignoré' }
          return (
            <button key={s} onClick={() => setFilterStatut(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filterStatut === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >{labels[s]}</button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400">Aucun mouvement</div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Libellé', 'Montant', 'Solde après', 'Statut', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{m.date_operation}</td>
                  <td className="px-3 py-2 text-slate-700 truncate max-w-[250px]">{m.libelle}</td>
                  <td className={`px-3 py-2 text-right font-semibold ${m.montant >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {m.montant >= 0 ? '+' : ''}{fmtEur(m.montant)}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-500 text-xs">
                    {m.solde_apres !== null ? fmtEur(m.solde_apres) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      m.statut === 'rapproche' ? 'bg-green-100 text-green-700' :
                      m.statut === 'ignore' ? 'bg-slate-100 text-slate-400' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {m.statut === 'a_rapprocher' ? 'À rapprocher' : m.statut === 'rapproche' ? 'Rapproché' : 'Ignoré'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {m.statut === 'a_rapprocher' && (
                      <button onClick={() => ignorerMouvement(m.id)}
                        className="text-xs text-slate-400 hover:text-slate-600">Ignorer</button>
                    )}
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

// ─── Scoring de rapprochement ────────────────────────────────────────────────
function scoreMatch(mvt: Mouvement, facture: Facture | FactureFournisseur, type: 'client' | 'fournisseur'): MatchScore {
  const facMontant = facture.montant_ttc ?? facture.montant_ht
  const mvtAbs = Math.abs(mvt.montant)
  let score = 0
  const details: string[] = []

  // Montant exact (±0.01) = +50, ±2% = +35, ±5% = +20
  const ecartPct = facMontant > 0 ? Math.abs(mvtAbs - facMontant) / facMontant : 1
  if (ecartPct <= 0.0001) { score += 50; details.push('Montant exact') }
  else if (ecartPct <= 0.02) { score += 35; details.push(`Montant ±${(ecartPct * 100).toFixed(1)}%`) }
  else if (ecartPct <= 0.05) { score += 20; details.push(`Montant ±${(ecartPct * 100).toFixed(1)}%`) }

  // Date (si date_echeance & date_operation proches) ±3j = +25, ±7j = +15, ±15j = +8
  const dateEch = facture.date_echeance
  if (dateEch && mvt.date_operation) {
    const diff = Math.abs((new Date(mvt.date_operation).getTime() - new Date(dateEch).getTime()) / 86400000)
    if (diff <= 3) { score += 25; details.push(`Date ±${Math.round(diff)}j`) }
    else if (diff <= 7) { score += 15; details.push(`Date ±${Math.round(diff)}j`) }
    else if (diff <= 15) { score += 8; details.push(`Date ±${Math.round(diff)}j`) }
  }

  // Référence / mots-clés dans le libellé : numéro facture ou nom
  const lib = mvt.libelle.toLowerCase()
  const ref = mvt.reference_banque?.toLowerCase() || ''
  const num = facture.numero.toLowerCase()
  const nom = type === 'client'
    ? '' // nom client résolu plus tard dans le composant
    : (facture as FactureFournisseur).fournisseur_nom?.toLowerCase() || ''

  if (lib.includes(num) || ref.includes(num)) { score += 25; details.push('Réf. facture trouvée') }
  else if (nom && (lib.includes(nom.slice(0, 8)) || ref.includes(nom.slice(0, 8)))) { score += 15; details.push('Nom trouvé') }

  return { facture, type, score, detail: details.join(' · ') || 'Aucun critère' }
}

// ─── Onglet Rapprochement bancaire ───────────────────────────────────────────
function RapprochementTab() {
  const [mouvements, setMouvements] = useState<Mouvement[]>([])
  const [factures, setFactures] = useState<Facture[]>([])
  const [factFourn, setFactFourn] = useState<FactureFournisseur[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMvt, setSelectedMvt] = useState<Mouvement | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<MatchScore | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [mode, setMode] = useState<'credits' | 'debits'>('credits')
  const [autoBatching, setAutoBatching] = useState(false)

  async function load() {
    setLoading(true)
    const [m, f, ff, c] = await Promise.all([
      (supabase.from('mouvements_bancaires' as any).select('*')
        .eq('statut', 'a_rapprocher')
        .order('date_operation', { ascending: false })
        .limit(200) as any),
      supabase.from('factures').select('id, numero, client_id, montant_ht, montant_ttc, statut, date_echeance')
        .in('statut', ['envoyee', 'en_retard'])
        .order('date_echeance'),
      (supabase.from('compta_factures_fournisseurs' as any).select('id, numero, fournisseur_nom, montant_ht, montant_ttc, statut, date_echeance')
        .in('statut', ['a_payer', 'en_retard'])
        .order('date_echeance') as any),
      supabase.from('clients').select('id, nom').order('nom'),
    ])
    setMouvements(m.data ?? [])
    setFactures(f.data ?? [])
    setFactFourn(ff.data ?? [])
    setClients(c.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const clientMap = useMemo(() =>
    Object.fromEntries(clients.map(c => [c.id, c.nom])), [clients])

  // Filtrer mouvements selon le mode
  const mvtFiltered = useMemo(() =>
    mode === 'credits'
      ? mouvements.filter(m => m.montant > 0)
      : mouvements.filter(m => m.montant < 0),
    [mouvements, mode])

  // Calculer les scores pour le mouvement sélectionné
  const matchScores = useMemo(() => {
    if (!selectedMvt) return []
    const pool = mode === 'credits'
      ? factures.map(f => ({ ...scoreMatch(selectedMvt, f, 'client'), clientNom: clientMap[(f as Facture).client_id] }))
      : factFourn.map(f => scoreMatch(selectedMvt, f, 'fournisseur'))
    // Injecter le nom client dans le score si mode crédits
    if (mode === 'credits') {
      for (const m of pool) {
        const lib = selectedMvt.libelle.toLowerCase()
        const ref = selectedMvt.reference_banque?.toLowerCase() || ''
        const nom = (m as any).clientNom?.toLowerCase() || ''
        if (nom && m.score < 100 && (lib.includes(nom.slice(0, 8)) || ref.includes(nom.slice(0, 8)))) {
          if (!m.detail.includes('Nom trouvé')) { m.score += 15; m.detail += (m.detail ? ' · ' : '') + 'Nom client trouvé' }
        }
      }
    }
    return (pool as MatchScore[]).sort((a, b) => b.score - a.score)
  }, [selectedMvt, factures, factFourn, clientMap, mode])

  // Meilleurs matches auto (score >= 70) pour le batch
  const autoMatches = useMemo(() => {
    const result: { mvt: Mouvement; match: MatchScore }[] = []
    const usedFactIds = new Set<string>()
    for (const mvt of mvtFiltered) {
      const pool = mode === 'credits'
        ? factures.map(f => scoreMatch(mvt, f, 'client'))
        : factFourn.map(f => scoreMatch(mvt, f, 'fournisseur'))
      const best = pool.filter(m => m.score >= 70 && !usedFactIds.has(m.facture.id)).sort((a, b) => b.score - a.score)[0]
      if (best) { result.push({ mvt, match: best }); usedFactIds.add(best.facture.id) }
    }
    return result
  }, [mvtFiltered, factures, factFourn, mode])

  async function rapprocher(mvt: Mouvement, match: MatchScore) {
    const facMontant = match.facture.montant_ttc ?? match.facture.montant_ht
    const ecart = Math.abs(mvt.montant) - facMontant

    const insertData: Record<string, unknown> = {
      mouvement_bancaire_id: mvt.id,
      montant_rapproche: facMontant,
      ecart,
      mode: 'manuel',
    }
    if (match.type === 'client') insertData.facture_id = match.facture.id
    else insertData.facture_fournisseur_id = match.facture.id

    const updateFacture = match.type === 'client'
      ? supabase.from('factures').update({ statut: 'payee', date_paiement: mvt.date_operation }).eq('id', match.facture.id)
      : (supabase.from('compta_factures_fournisseurs' as any) as any).update({ statut: 'payee', date_paiement: mvt.date_operation }).eq('id', match.facture.id)

    await Promise.all([
      (supabase.from('rapprochements_bancaires' as any) as any).insert(insertData),
      (supabase.from('mouvements_bancaires' as any) as any).update({ statut: 'rapproche' }).eq('id', mvt.id),
      updateFacture,
    ])
  }

  async function rapprocherSelection() {
    if (!selectedMvt || !selectedMatch) return
    setSaving(true)
    await rapprocher(selectedMvt, selectedMatch)
    const facNum = selectedMatch.facture.numero
    const montant = fmtEur(Math.abs(selectedMvt.montant))
    const ecart = Math.abs(selectedMvt.montant) - (selectedMatch.facture.montant_ttc ?? selectedMatch.facture.montant_ht)
    setSuccess(`Rapproché — ${facNum} ↔ ${montant}${Math.abs(ecart) > 0.01 ? ` (écart : ${fmtEur(ecart)})` : ''}`)
    setTimeout(() => setSuccess(null), 4000)
    setSelectedMvt(null)
    setSelectedMatch(null)
    setSaving(false)
    load()
  }

  async function rapprochementAuto() {
    if (autoMatches.length === 0) return
    setAutoBatching(true)
    let count = 0
    for (const { mvt, match } of autoMatches) {
      await rapprocher(mvt, match)
      count++
    }
    setSuccess(`Auto-rapprochement : ${count} correspondance(s) traitée(s)`)
    setTimeout(() => setSuccess(null), 5000)
    setAutoBatching(false)
    setSelectedMvt(null)
    setSelectedMatch(null)
    load()
  }

  const scoreColor = (s: number) =>
    s >= 70 ? 'bg-green-100 text-green-700' : s >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'

  return (
    <div className="space-y-4">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400">Chargement...</div>
      ) : (
        <>
          {/* Mode toggle + auto btn */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              <button onClick={() => { setMode('credits'); setSelectedMvt(null); setSelectedMatch(null) }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${mode === 'credits' ? 'bg-green-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Crédits → Factures clients ({mouvements.filter(m => m.montant > 0).length})
              </button>
              <button onClick={() => { setMode('debits'); setSelectedMvt(null); setSelectedMatch(null) }}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${mode === 'debits' ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Débits → Factures fournisseurs ({mouvements.filter(m => m.montant < 0).length})
              </button>
            </div>
            {autoMatches.length > 0 && (
              <button onClick={rapprochementAuto} disabled={autoBatching} className={btnPrimary}>
                {autoBatching ? 'Rapprochement...' : `⚡ Auto-rapprocher ${autoMatches.length} match(es) (score ≥ 70)`}
              </button>
            )}
          </div>

          <p className="text-sm text-slate-500">
            Sélectionnez un mouvement puis la facture correspondante. Le scoring combine montant, date d'échéance et mots-clés du libellé.
          </p>

          {/* Bouton Rapprocher */}
          {selectedMvt && selectedMatch && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="text-sm">
                <span className="font-semibold text-blue-800">{selectedMvt.libelle.slice(0, 40)}</span>
                <span className="mx-2 text-blue-400">↔</span>
                <span className="font-semibold text-blue-800">{selectedMatch.facture.numero}</span>
                <span className="ml-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${scoreColor(selectedMatch.score)}`}>Score {selectedMatch.score}</span></span>
                {(() => {
                  const ecart = Math.abs(selectedMvt.montant) - (selectedMatch.facture.montant_ttc ?? selectedMatch.facture.montant_ht)
                  return Math.abs(ecart) > 0.01 ? <span className="ml-2 text-amber-700 text-xs">Écart : {fmtEur(ecart)}</span> : null
                })()}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedMvt(null); setSelectedMatch(null) }} className={btnGhost}>Annuler</button>
                <button onClick={rapprocherSelection} disabled={saving} className={btnPrimary}>
                  {saving ? 'Rapprochement...' : 'Rapprocher'}
                </button>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Mouvements */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">
                  {mode === 'credits' ? `Entrées bancaires (${mvtFiltered.length})` : `Sorties bancaires (${mvtFiltered.length})`}
                </h3>
              </div>
              {mvtFiltered.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">
                  Aucun {mode === 'credits' ? 'crédit' : 'débit'} à rapprocher
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {mvtFiltered.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setSelectedMvt(selectedMvt?.id === m.id ? null : m); setSelectedMatch(null) }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                        selectedMvt?.id === m.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400">{m.date_operation}</span>
                        <span className={`font-semibold text-sm ${m.montant >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {m.montant >= 0 ? '+' : ''}{fmtEur(m.montant)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 truncate mt-0.5">{m.libelle}</p>
                      {m.reference_banque && <p className="text-xs text-slate-400 mt-0.5">Réf : {m.reference_banque}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Factures avec scores */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">
                  {mode === 'credits'
                    ? `Factures clients (${factures.length})`
                    : `Factures fournisseurs (${factFourn.length})`}
                  {selectedMvt && matchScores.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-slate-400">— triées par score</span>
                  )}
                </h3>
              </div>
              {(mode === 'credits' ? factures.length : factFourn.length) === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">Aucune facture à rapprocher</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {(selectedMvt ? matchScores : (mode === 'credits'
                    ? factures.map(f => ({ facture: f, type: 'client' as const, score: 0, detail: '' }))
                    : factFourn.map(f => ({ facture: f, type: 'fournisseur' as const, score: 0, detail: '' }))
                  )).map(ms => {
                    const f = ms.facture
                    const isSelected = selectedMatch?.facture.id === f.id
                    return (
                      <button
                        key={f.id}
                        onClick={() => setSelectedMatch(isSelected ? null : ms)}
                        className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                          isSelected ? 'bg-blue-50 border-l-4 border-blue-500' :
                          ms.score >= 70 ? 'bg-green-50/50 border-l-4 border-green-400' :
                          ms.score >= 40 ? 'bg-amber-50/50 border-l-2 border-amber-300' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-slate-500">{f.numero}</span>
                            {ms.score > 0 && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${scoreColor(ms.score)}`}>{ms.score}</span>
                            )}
                          </div>
                          <span className="font-semibold text-slate-800 text-sm">{fmtEur(f.montant_ttc ?? f.montant_ht)}</span>
                        </div>
                        <p className="text-sm text-slate-600 truncate mt-0.5">
                          {ms.type === 'client' ? clientMap[(f as Facture).client_id] ?? '—' : (f as FactureFournisseur).fournisseur_nom}
                        </p>
                        {ms.detail && <p className="text-xs text-slate-400 mt-0.5">{ms.detail}</p>}
                        {f.date_echeance && (
                          <p className="text-xs text-slate-400 mt-0.5">Éch. {f.date_echeance}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Onglet Prévisions de trésorerie ─────────────────────────────────────────
function PrevisionsTab() {
  const [flux, setFlux] = useState<FluxPrevisionnel[]>([])
  const [mouvements, setMouvements] = useState<{ montant: number; solde_apres: number | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date_flux: new Date().toISOString().split('T')[0],
    libelle: '',
    montant: '',
    type_flux: 'autre' as string,
    probabilite: '100',
  })
  const [saving, setSaving] = useState(false)
  const [projectionStart, setProjectionStart] = useState<string>('')

  useEffect(() => {
    setProjectionStart(new Date().toISOString().split('T')[0])
  }, [])

  async function load() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const in90 = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
    const [f, m] = await Promise.all([
      (supabase.from('treso_flux_previsionnels' as any)
        .select('*')
        .gte('date_flux', today)
        .lte('date_flux', in90)
        .order('date_flux') as any),
      (supabase.from('mouvements_bancaires' as any)
        .select('montant, solde_apres')
        .order('date_operation', { ascending: false })
        .limit(200) as any),
    ])
    setFlux(f.data ?? [])
    setMouvements(m.data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Solde bancaire actuel (dernier mouvement avec solde, sinon sum)
  const soldeBancaire = useMemo(() => {
    const avecSolde = mouvements.find(m => m.solde_apres !== null)
    if (avecSolde?.solde_apres !== undefined && avecSolde.solde_apres !== null) return avecSolde.solde_apres
    return mouvements.reduce((s, m) => s + m.montant, 0)
  }, [mouvements])

  // Flux agrégés par semaine pour le graphe
  const fluxSemaines = useMemo(() => {
    if (!projectionStart) return []

    const semaines: { label: string; entrees: number; sorties: number; net: number }[] = []
    const baseDate = new Date(`${projectionStart}T00:00:00`)
    for (let i = 0; i < 13; i++) {
      const debut = new Date(baseDate.getTime() + i * 7 * 86400000)
      const fin = new Date(debut.getTime() + 7 * 86400000)
      const dS = debut.toISOString().split('T')[0]
      const dF = fin.toISOString().split('T')[0]
      const semFlux = flux.filter(f => f.date_flux >= dS && f.date_flux < dF)
      const entrees = semFlux.filter(f => f.montant > 0).reduce((s, f) => s + f.montant * f.probabilite / 100, 0)
      const sorties = semFlux.filter(f => f.montant < 0).reduce((s, f) => s + f.montant * f.probabilite / 100, 0)
      semaines.push({ label: `S${i + 1}`, entrees, sorties: Math.abs(sorties), net: entrees + sorties })
    }
    return semaines
  }, [flux, projectionStart])

  // Solde cumulé prévisionnel
  const soldePrev90 = useMemo(() => {
    return soldeBancaire + flux.reduce((s, f) => s + f.montant * f.probabilite / 100, 0)
  }, [soldeBancaire, flux])

  // Flux nets cumulés pour le graphe en bâtons
  const netMax = Math.max(...fluxSemaines.map(s => Math.max(s.entrees, s.sorties, 1)))

  async function ajouterFlux() {
    if (!form.libelle || !form.montant) return
    setSaving(true)
    const montant = parseFloat(form.montant.replace(',', '.'))
    if (isNaN(montant)) { setSaving(false); return }
    await (supabase.from('treso_flux_previsionnels' as any) as any).insert({
      date_flux: form.date_flux,
      libelle: form.libelle,
      montant,
      type_flux: form.type_flux,
      probabilite: parseFloat(form.probabilite) || 100,
    })
    setForm({ date_flux: new Date().toISOString().split('T')[0], libelle: '', montant: '', type_flux: 'autre', probabilite: '100' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function supprimerFlux(id: string) {
    await (supabase.from('treso_flux_previsionnels' as any) as any).delete().eq('id', id)
    load()
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Solde bancaire actuel" value={fmtEur(soldeBancaire)}
          color={soldeBancaire < 0 ? 'red' : soldeBancaire < 5000 ? 'amber' : 'green'} />
        <Stat label="Flux prév. 90 j (probabilisés)" value={fmtEur(flux.reduce((s, f) => s + f.montant * f.probabilite / 100, 0))}
          color="blue" sub={`${flux.length} flux configurés`} />
        <Stat label="Solde prévisionnel J+90"
          value={fmtEur(soldePrev90)}
          color={soldePrev90 < 0 ? 'red' : soldePrev90 < 5000 ? 'amber' : 'green'}
          sub={soldePrev90 < 0 ? '⚠ Risque de découvert' : 'Projection'} />
      </div>

      {/* Graphe bâtons semaines */}
      {flux.length > 0 && (
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-600 mb-3">Flux hebdomadaires prévisionnels (13 semaines)</p>
          <div className="flex items-end gap-1.5" style={{ height: 80 }}>
            {fluxSemaines.map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0" style={{ height: 80 }}>
                <div className="flex-1 w-full flex items-end gap-0.5">
                  <div className="flex-1 rounded-t bg-blue-300 transition-all"
                    style={{ height: `${netMax > 0 ? (s.entrees / netMax) * 100 : 0}%`, minHeight: s.entrees > 0 ? 3 : 0 }} />
                  <div className="flex-1 rounded-t bg-red-300 transition-all"
                    style={{ height: `${netMax > 0 ? (s.sorties / netMax) * 100 : 0}%`, minHeight: s.sorties > 0 ? 3 : 0 }} />
                </div>
                <span className="text-[9px] text-slate-400 truncate w-full text-center">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-300 inline-block"></span>Entrées</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-300 inline-block"></span>Sorties</span>
          </div>
        </div>
      )}

      {/* Ajouter un flux */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-slate-700">Flux prévisionnels (90 jours)</h3>
        <button onClick={() => setShowForm(!showForm)} className={btnPrimary}>
          {showForm ? 'Annuler' : '+ Ajouter un flux'}
        </button>
      </div>

      {showForm && (
        <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Date</label>
              <input type="date" value={form.date_flux}
                onChange={e => setForm(p => ({ ...p, date_flux: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Libellé</label>
              <input type="text" placeholder="Ex : Loyer camion..."
                value={form.libelle} onChange={e => setForm(p => ({ ...p, libelle: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Montant (+ encaissement / − décaissement)</label>
              <input type="text" placeholder="Ex : 2500 ou -1800"
                value={form.montant} onChange={e => setForm(p => ({ ...p, montant: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Type</label>
              <select value={form.type_flux}
                onChange={e => setForm(p => ({ ...p, type_flux: e.target.value }))} className={inp}>
                {Object.entries(TYPE_FLUX_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Probabilité (%)</label>
              <input type="number" min={0} max={100} value={form.probabilite}
                onChange={e => setForm(p => ({ ...p, probabilite: e.target.value }))} className={inp} />
            </div>
          </div>
          <button onClick={ajouterFlux} disabled={saving} className={btnPrimary}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400">Chargement...</div>
      ) : flux.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          Aucun flux prévisionnel — ajoutez vos charges et encaissements attendus
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Libellé', 'Type', 'Montant', 'Probabilité', 'Probabilisé', ''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flux.map(f => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 text-xs text-slate-500 whitespace-nowrap">{f.date_flux}</td>
                  <td className="px-3 py-2 text-slate-700">{f.libelle}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_FLUX_COLORS[f.type_flux] ?? 'bg-slate-100 text-slate-600'}`}>
                      {TYPE_FLUX_LABELS[f.type_flux] ?? f.type_flux}
                    </span>
                  </td>
                  <td className={`px-3 py-2 text-right font-semibold ${f.montant >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {f.montant >= 0 ? '+' : ''}{fmtEur(f.montant)}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500 text-xs">{f.probabilite} %</td>
                  <td className={`px-3 py-2 text-right text-xs font-medium ${(f.montant * f.probabilite / 100) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {fmtEur(f.montant * f.probabilite / 100)}
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => supprimerFlux(f.id)} className="text-xs text-red-400 hover:text-red-600">Suppr.</button>
                  </td>
                </tr>
              ))}
              {/* Ligne totaux */}
              <tr className="bg-slate-50 font-semibold">
                <td colSpan={3} className="px-3 py-2 text-xs text-slate-600">Total</td>
                <td className="px-3 py-2 text-right text-slate-800">{fmtEur(flux.reduce((s, f) => s + f.montant, 0))}</td>
                <td></td>
                <td className={`px-3 py-2 text-right text-sm ${
                  flux.reduce((s, f) => s + f.montant * f.probabilite / 100, 0) >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {fmtEur(flux.reduce((s, f) => s + f.montant * f.probabilite / 100, 0))}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Page principale ─────────────────────────────────────────────────────────
export default function Tresorerie() {
  const [tab, setTab] = useState<Tab>('mouvements')
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-2">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">Trésorerie</h1>
        <p className="text-sm text-slate-500 mt-0.5">Mouvements bancaires, rapprochement, prévisions 90 jours</p>
      </div>
      <TabBar active={tab} onChange={setTab} />
      {tab === 'mouvements'    && <MouvementsTab />}
      {tab === 'rapprochement' && <RapprochementTab />}
      {tab === 'previsions'    && <PrevisionsTab />}
    </div>
  )
}
