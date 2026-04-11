import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/database.types'
import { evaluateAffretementCompletionReadiness, getAffretementContractByOtId } from '@/lib/affretementPortal'

type Facture = Tables<'factures'>
type ClientLookup = { id: string; nom: string }
type OTLookup = { id: string; reference: string; client_id: string }
type Tab = 'factures' | 'tva' | 'tresorerie' | 'previsionnel' | 'rapports' | 'journal' | 'tarifs'

const STATUT_COLORS: Record<string, string> = {
  brouillon:  'bg-slate-100 text-slate-600',
  envoyee:    'bg-blue-100 text-blue-700',
  payee:      'bg-green-100 text-green-700',
  en_retard:  'bg-red-100 text-red-600',
  annulee:    'bg-slate-100 text-slate-400',
}
const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', envoyee: 'Envoyée', payee: 'Payée', en_retard: 'En retard', annulee: 'Annulée',
}
const MODE_PAIEMENT_LABELS: Record<string, string> = {
  virement: 'Virement', cheque: 'Chèque', prelevement: 'Prélèvement', especes: 'Espèces',
}
const MOIS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
const TAUX_TVA_OPTIONS = [0, 2.1, 5.5, 8.5, 10, 20]

const inp = 'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[color:var(--primary)] focus:ring-2 focus:ring-[color:var(--primary-soft)]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'factures',    label: 'Factures' },
    { key: 'tva',         label: 'TVA & Taxes' },
    { key: 'tresorerie',  label: 'Trésorerie' },
    { key: 'previsionnel',label: 'Prévisionnel' },
    { key: 'rapports',    label: 'Rapports' },
    { key: 'journal',     label: 'Journal' },
    { key: 'tarifs',      label: 'Tarifs transport' },
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

// ─── Bar chart (CSS) ─────────────────────────────────────────────────────────
function BarChart({ data, height = 120, color = '#1e293b' }: {
  data: { label: string; value: number }[]
  height?: number
  color?: string
}) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full">
          <div className="flex-1 w-full flex items-end">
            <div
              className="w-full rounded-t transition-all"
              style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: d.value > 0 ? 4 : 0 }}
            />
          </div>
          <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function DualBarChart({ data, height = 120 }: {
  data: { label: string; a: number; b: number; labelA?: string; labelB?: string }[]
  height?: number
}) {
  const max = Math.max(...data.flatMap(d => [d.a, d.b]), 1)
  return (
    <div className="flex items-end gap-2 w-full" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full">
          <div className="flex-1 w-full flex items-end gap-0.5">
            <div className="flex-1 rounded-t transition-all bg-slate-700" style={{ height: `${(d.a / max) * 100}%`, minHeight: d.a > 0 ? 4 : 0 }} />
            <div className="flex-1 rounded-t transition-all bg-emerald-400" style={{ height: `${(d.b / max) * 100}%`, minHeight: d.b > 0 ? 4 : 0 }} />
          </div>
          <span className="text-[10px] text-slate-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── MiniStat ────────────────────────────────────────────────────────────────
function MiniStat({ label, value, color, sub }: { label: string; value: string; color: 'blue' | 'red' | 'green' | 'slate' | 'amber'; sub?: string }) {
  const cls = {
    blue:  'bg-blue-50 text-blue-700 border-blue-100',
    red:   'bg-red-50 text-red-700 border-red-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
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

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <p className="text-slate-700 mt-0.5">{value || '—'}</p>
    </div>
  )
}

// ─── Journal entry type ───────────────────────────────────────────────────────
type JournalEntry = {
  id: string
  date: string
  libelle: string
  compte: string
  debit: number
  credit: number
}

const COMPTES_COMPTABLES = [
  '101 - Capital social', '106 - Réserves', '110 - Report à nouveau',
  '401 - Fournisseurs', '411 - Clients', '421 - Personnel – rémunérations',
  '431 - Sécurité sociale', '444 - Etat – IS', '445 - TVA',
  '512 - Banque', '530 - Caisse',
  '601 - Achats matières', '606 - Achats non stockés', '607 - Achats marchandises',
  '611 - Sous-traitance', '615 - Entretien réparations', '622 - Honoraires',
  '625 - Déplacements', '641 - Salaires', '645 - Charges sociales',
  '681 - Dotations amortissement',
  '706 - Prestations de services', '707 - Ventes marchandises',
  '708 - Produits activités annexes', '758 - Produits divers',
]

// ─── Tarifs Transport component ──────────────────────────────────────────────
type TarifClient = {
  id: string; client_id: string; libelle: string; tarif_km: number
  coeff_gazole: boolean; peages_refactures: boolean; forfait_minimum: number | null
  actif: boolean; date_debut: string
}
type CnrIndice = { id: string; annee: number; mois: number; indice_gazole: number; indice_reference: number }

const fmtEur2 = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
const MOIS_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function TarifsTransportTab({ clients }: { clients: ClientLookup[] }) {
  const [tarifs, setTarifs] = useState<TarifClient[]>([])
  const [cnrIndices, setCnrIndices] = useState<CnrIndice[]>([])
  const [showTarifForm, setShowTarifForm] = useState(false)
  const [showCnrForm, setShowCnrForm] = useState(false)
  const [saving, setSaving] = useState(false)
  // Tarif form
  const [tClientId, setTClientId] = useState('')
  const [tLibelle, setTLibelle] = useState('Tarif standard')
  const [tTarifKm, setTTarifKm] = useState('1.20')
  const [tCoeffGazole, setTCoeffGazole] = useState(true)
  const [tPeages, setTPeages] = useState(false)
  const [tForfait, setTForfait] = useState('')
  const [tDateDebut, setTDateDebut] = useState(new Date().toISOString().slice(0,10))
  // CNR form
  const [cAnnee, setCAnnee] = useState(String(new Date().getFullYear()))
  const [cMois, setCMois] = useState(String(new Date().getMonth() + 1))
  const [cIndice, setCIndice] = useState('')
  const [cRef, setCRef] = useState('145.00')
  // Calculator
  const [calcKm, setCalcKm] = useState('')
  const [calcTarifBase, setCalcTarifBase] = useState('')
  const [calcCnrIdx, setCalcCnrIdx] = useState('')
  const [calcRef, setCalcRef] = useState('145.00')

  const loadTarifs = async () => {
    const { data } = await supabase.from('transport_tarifs_clients' as any).select('*').order('created_at', { ascending: false })
    if (data) setTarifs(data as unknown as TarifClient[])
  }
  const loadCnr = async () => {
    const { data } = await supabase.from('transport_cnr_indices' as any).select('*').order('annee', { ascending: false }).order('mois', { ascending: false })
    if (data) setCnrIndices(data as unknown as CnrIndice[])
  }

  useEffect(() => { loadTarifs(); loadCnr() }, [])

  const clientMap = Object.fromEntries(clients.map(c => [c.id, c.nom]))

  const resetTarifForm = () => {
    setTClientId(''); setTLibelle('Tarif standard'); setTTarifKm('1.20')
    setTCoeffGazole(true); setTPeages(false); setTForfait(''); setTDateDebut(new Date().toISOString().slice(0,10))
    setShowTarifForm(false)
  }

  const saveTarif = async () => {
    if (!tClientId) return
    setSaving(true)
    await supabase.from('transport_tarifs_clients' as any).insert({
      client_id: tClientId, libelle: tLibelle, tarif_km: parseFloat(tTarifKm) || 0,
      coeff_gazole: tCoeffGazole, peages_refactures: tPeages,
      forfait_minimum: tForfait ? parseFloat(tForfait) : null,
      date_debut: tDateDebut, actif: true,
    })
    await loadTarifs(); setSaving(false); resetTarifForm()
  }

  const toggleActif = async (t: TarifClient) => {
    await supabase.from('transport_tarifs_clients' as any).update({ actif: !t.actif }).eq('id', t.id)
    await loadTarifs()
  }

  const deleteTarif = async (id: string) => {
    if (!confirm('Supprimer ce tarif ?')) return
    await supabase.from('transport_tarifs_clients' as any).delete().eq('id', id)
    await loadTarifs()
  }

  const saveCnr = async () => {
    if (!cIndice) return
    setSaving(true)
    await supabase.from('transport_cnr_indices' as any).upsert({
      annee: parseInt(cAnnee), mois: parseInt(cMois),
      indice_gazole: parseFloat(cIndice), indice_reference: parseFloat(cRef) || 145,
    }, { onConflict: 'annee,mois' })
    await loadCnr(); setSaving(false); setCIndice(''); setShowCnrForm(false)
  }

  // Calcul CNR : prix_ht = km × tarif_base × (1 + coeff × (indice/ref - 1))
  const calcResult = (() => {
    const km = parseFloat(calcKm); const base = parseFloat(calcTarifBase)
    const idx = parseFloat(calcCnrIdx); const ref = parseFloat(calcRef)
    if (!km || !base) return null
    const prix = idx && ref ? km * base * (1 + 0.25 * (idx / ref - 1)) : km * base
    return prix
  })()

  return (
    <div className="space-y-6">
      {/* ── Barèmes tarifaires ── */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Barèmes tarifaires clients</h3>
          <button onClick={() => setShowTarifForm(true)}
            className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
            + Nouveau tarif
          </button>
        </div>

        {showTarifForm && (
          <div className="mb-4 p-4 border rounded-xl bg-slate-50 grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Client</label>
              <select value={tClientId} onChange={e => setTClientId(e.target.value)} className={inp}>
                <option value="">— Sélectionner un client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Libellé</label>
              <input value={tLibelle} onChange={e => setTLibelle(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tarif / km (€)</label>
              <input type="number" step="0.0001" value={tTarifKm} onChange={e => setTTarifKm(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Forfait minimum (€)</label>
              <input type="number" step="0.01" value={tForfait} onChange={e => setTForfait(e.target.value)} placeholder="Facultatif" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date début</label>
              <input type="date" value={tDateDebut} onChange={e => setTDateDebut(e.target.value)} className={inp} />
            </div>
            <div className="col-span-2 flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={tCoeffGazole} onChange={e => setTCoeffGazole(e.target.checked)} className="w-4 h-4" />
                Clause gazole CNR
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={tPeages} onChange={e => setTPeages(e.target.checked)} className="w-4 h-4" />
                Péages refacturés
              </label>
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <button onClick={resetTarifForm} className="px-3 py-1.5 border rounded-lg text-sm text-slate-600 hover:bg-slate-100">Annuler</button>
              <button onClick={saveTarif} disabled={saving || !tClientId}
                className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
              <th className="px-3 py-2 text-left">Client</th>
              <th className="px-3 py-2 text-left">Libellé</th>
              <th className="px-3 py-2 text-right">Tarif/km</th>
              <th className="px-3 py-2 text-center">Gazole CNR</th>
              <th className="px-3 py-2 text-center">Péages</th>
              <th className="px-3 py-2 text-right">Forfait min.</th>
              <th className="px-3 py-2 text-center">Statut</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {tarifs.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-400 text-sm">Aucun barème enregistré</td></tr>
            )}
            {tarifs.map(t => (
              <tr key={t.id} className="border-b hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{clientMap[t.client_id] ?? t.client_id.slice(0,8)}</td>
                <td className="px-3 py-2 text-slate-600">{t.libelle}</td>
                <td className="px-3 py-2 text-right font-mono">{t.tarif_km.toFixed(4)} €</td>
                <td className="px-3 py-2 text-center">{t.coeff_gazole ? '✓' : '—'}</td>
                <td className="px-3 py-2 text-center">{t.peages_refactures ? '✓' : '—'}</td>
                <td className="px-3 py-2 text-right">{t.forfait_minimum != null ? fmtEur2(t.forfait_minimum) : '—'}</td>
                <td className="px-3 py-2 text-center">
                  <button onClick={() => toggleActif(t)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.actif ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.actif ? 'Actif' : 'Inactif'}
                  </button>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => deleteTarif(t.id)} className="text-red-400 hover:text-red-600 text-xs">Suppr.</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Indices CNR ── */}
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Indices CNR gazole</h3>
            <button onClick={() => setShowCnrForm(v => !v)}
              className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90">
              + Ajouter
            </button>
          </div>
          {showCnrForm && (
            <div className="mb-4 p-3 border rounded-lg bg-slate-50 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Année</label>
                <input type="number" value={cAnnee} onChange={e => setCAnnee(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mois</label>
                <select value={cMois} onChange={e => setCMois(e.target.value)} className={inp}>
                  {MOIS_LABELS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Indice gazole</label>
                <input type="number" step="0.01" value={cIndice} onChange={e => setCIndice(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Indice de référence</label>
                <input type="number" step="0.01" value={cRef} onChange={e => setCRef(e.target.value)} className={inp} />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button onClick={() => setShowCnrForm(false)} className="px-3 py-1.5 border rounded-lg text-sm text-slate-600">Annuler</button>
                <button onClick={saveCnr} disabled={saving || !cIndice}
                  className="px-3 py-1.5 bg-[color:var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50">
                  {saving ? '…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
              <th className="px-3 py-2 text-left">Période</th>
              <th className="px-3 py-2 text-right">Indice gazole</th>
              <th className="px-3 py-2 text-right">Référence</th>
              <th className="px-3 py-2 text-right">Variation</th>
            </tr></thead>
            <tbody>
              {cnrIndices.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-sm">Aucun indice</td></tr>
              )}
              {cnrIndices.map(c => {
                const variation = ((c.indice_gazole - c.indice_reference) / c.indice_reference * 100)
                return (
                  <tr key={c.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{MOIS_LABELS[c.mois-1]} {c.annee}</td>
                    <td className="px-3 py-2 text-right font-mono">{c.indice_gazole.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400">{c.indice_reference.toFixed(2)}</td>
                    <td className={`px-3 py-2 text-right font-medium ${variation >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Calculateur CNR ── */}
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Calculateur gazole CNR</h3>
          <p className="text-xs text-slate-500 mb-4">
            Prix = km × tarif × (1 + 0,25 × (indice / référence − 1))
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Distance (km)</label>
              <input type="number" value={calcKm} onChange={e => setCalcKm(e.target.value)} placeholder="ex: 450" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tarif de base (€/km)</label>
              <input type="number" step="0.0001" value={calcTarifBase} onChange={e => setCalcTarifBase(e.target.value)} placeholder="ex: 1.2500" className={inp} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Indice CNR du mois</label>
                <input type="number" step="0.01" value={calcCnrIdx} onChange={e => setCalcCnrIdx(e.target.value)} placeholder="ex: 157.30" className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Indice de référence</label>
                <input type="number" step="0.01" value={calcRef} onChange={e => setCalcRef(e.target.value)} className={inp} />
              </div>
            </div>
            {calcResult != null && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
                <p className="text-xs text-blue-500 mb-1">Prix transport calculé HT</p>
                <p className="text-2xl font-bold text-blue-700">{fmtEur2(calcResult)}</p>
                {calcCnrIdx && calcRef && (
                  <p className="text-xs text-blue-400 mt-1">
                    Coefficient gazole : {(1 + 0.25 * (parseFloat(calcCnrIdx) / parseFloat(calcRef) - 1)).toFixed(4)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Facturation() {
  const [tab, setTab] = useState<Tab>('factures')
  const [list, setList] = useState<Facture[]>([])
  const [clients, setClients] = useState<ClientLookup[]>([])
  const [ots, setOts] = useState<OTLookup[]>([])
  const [loading, setLoading] = useState(true)

  // Factures tab state
  const [filterStatut, setFilterStatut] = useState('tous')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    client_id: '',
    ot_id: null as string | null,
    montant_ht: 0,
    taux_tva: 20,
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: null as string | null,
    statut: 'brouillon',
    mode_paiement: null as string | null,
    notes: null as string | null,
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Facture | null>(null)

  // Écriture comptable liée à la facture sélectionnée (Epic A3)
  const [comptaInfo, setComptaInfo] = useState<{ statut: string; numero_mouvement: number; date_ecriture: string } | null>(null)
  const [comptaLoading, setComptaLoading] = useState(false)

  // TVA tab state
  const [tvaCalcHT, setTvaCalcHT] = useState('')
  const [tvaCalcTaux, setTvaCalcTaux] = useState(20)
  const [tvaPeriod, setTvaPeriod] = useState<'mensuel' | 'trimestriel' | 'annuel'>('trimestriel')

  // Prévisionnel tab state
  const thisYear = new Date().getFullYear()
  const [budgets, setBudgets] = useState<number[]>(Array(12).fill(0))
  const [editBudget, setEditBudget] = useState<number | null>(null)
  const [budgetInput, setBudgetInput] = useState('')

  // Journal tab state
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [journalForm, setJournalForm] = useState({
    date: new Date().toISOString().split('T')[0],
    libelle: '',
    compte: '',
    debit: '',
    credit: '',
  })

  async function loadAll() {
    setLoading(true)
    const [facts, cls, otList] = await Promise.all([
      supabase.from('factures').select('*').order('date_emission', { ascending: false }),
      supabase.from('clients').select('id, nom').order('nom'),
      supabase.from('ordres_transport').select('id, reference, client_id').order('reference'),
    ])
    setList(facts.data ?? [])
    setClients(cls.data ?? [])
    setOts(otList.data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  useEffect(() => {
    if (!selected) { setComptaInfo(null); return }
    if (selected.statut === 'brouillon' || selected.statut === 'annulee') { setComptaInfo(null); return }
    setComptaLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    db
      .from('compta_pieces')
      .select('id')
      .eq('source_table', 'factures')
      .eq('source_id', selected.id)
      .maybeSingle()
      .then(async ({ data: piece }: { data: { id: string } | null }) => {
        if (!piece) { setComptaInfo(null); setComptaLoading(false); return }
        const { data: e } = await db
          .from('compta_ecritures')
          .select('statut, numero_mouvement, date_ecriture')
          .eq('piece_id', piece.id)
          .maybeSingle()
        setComptaInfo(e ? { statut: e.statut, numero_mouvement: e.numero_mouvement, date_ecriture: e.date_ecriture } : null)
        setComptaLoading(false)
      })
  }, [selected?.id, selected?.statut])

  const clientMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.nom])), [clients])
  const otMap = useMemo(() => Object.fromEntries(ots.map(o => [o.id, o.reference])), [ots])
  const fmtEur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
  const fmtPct = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' %'

  // ── Computed aggregates ───────────────────────────────────────────────────
  const activeList = list.filter(f => f.statut !== 'annulee')

  const totalCA = useMemo(() => activeList.reduce((s, f) => s + f.montant_ht, 0), [activeList])
  const totalTVACollectee = useMemo(() => activeList.reduce((s, f) => s + (f.montant_tva ?? 0), 0), [activeList])
  const totalEncaisse = useMemo(() => activeList.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [activeList])
  const totalEnAttente = useMemo(() => activeList.filter(f => f.statut === 'envoyee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [activeList])
  const totalEnRetard = useMemo(() => activeList.filter(f => f.statut === 'en_retard').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [activeList])

  const startOfMonth = useMemo(() => {
    const currentDate = new Date()
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString()
  }, [])
  const totalPayeeMois = useMemo(() => list
    .filter(f => f.statut === 'payee' && f.date_paiement && f.date_paiement >= startOfMonth)
    .reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0), [list, startOfMonth])

  // Monthly CA (current year)
  const monthlyCA = useMemo(() => {
    const months = Array(12).fill(0)
    activeList.forEach(f => {
      const d = new Date(f.date_emission)
      if (d.getFullYear() === thisYear) months[d.getMonth()] += f.montant_ht
    })
    return months
  }, [activeList, thisYear])

  // Monthly TVA collected (current year)
  const monthlyTVA = useMemo(() => {
    const months = Array(12).fill(0)
    activeList.forEach(f => {
      const d = new Date(f.date_emission)
      if (d.getFullYear() === thisYear) months[d.getMonth()] += (f.montant_tva ?? 0)
    })
    return months
  }, [activeList, thisYear])

  // Monthly encaissé
  const monthlyEncaisse = useMemo(() => {
    const months = Array(12).fill(0)
    list.filter(f => f.statut === 'payee' && f.date_paiement).forEach(f => {
      const d = new Date(f.date_paiement!)
      if (d.getFullYear() === thisYear) months[d.getMonth()] += (f.montant_ttc ?? f.montant_ht)
    })
    return months
  }, [list, thisYear])

  // Quarterly TVA
  const quarterlyTVA = useMemo(() => {
    const q = [0, 0, 0, 0]
    monthlyTVA.forEach((v, i) => { q[Math.floor(i / 3)] += v })
    return q
  }, [monthlyTVA])

  // Top clients
  const topClients = useMemo(() => {
    const map: Record<string, number> = {}
    activeList.filter(f => f.statut === 'payee').forEach(f => {
      map[f.client_id] = (map[f.client_id] ?? 0) + f.montant_ht
    })
    return Object.entries(map)
      .map(([id, ca]) => ({ nom: clientMap[id] ?? 'Inconnu', ca }))
      .sort((a, b) => b.ca - a.ca)
      .slice(0, 5)
  }, [activeList, clientMap])

  // Taux de recouvrement
  const tauxRecouvrement = useMemo(() => {
    const total = list.filter(f => f.statut !== 'brouillon' && f.statut !== 'annulee').reduce((s, f) => s + (f.montant_ttc ?? f.montant_ht), 0)
    return total > 0 ? (totalEncaisse / total) * 100 : 0
  }, [list, totalEncaisse])

  // Upcoming invoices (due in next 30 days)
  const upcoming = useMemo(() => {
    const now = new Date()
    const in30 = new Date(now)
    in30.setDate(in30.getDate() + 30)
    return list.filter(f =>
      f.statut === 'envoyee' && f.date_echeance &&
      new Date(f.date_echeance) <= in30 &&
      new Date(f.date_echeance) >= now
    ).sort((a, b) => (a.date_echeance! > b.date_echeance! ? 1 : -1))
  }, [list])

  // TVA by rate breakdown
  const tvaByRate = useMemo(() => {
    const map: Record<number, { ht: number; tva: number }> = {}
    activeList.forEach(f => {
      const t = f.taux_tva ?? 20
      if (!map[t]) map[t] = { ht: 0, tva: 0 }
      map[t].ht += f.montant_ht
      map[t].tva += (f.montant_tva ?? 0)
    })
    return Object.entries(map).map(([taux, v]) => ({ taux: parseFloat(taux), ...v })).sort((a, b) => b.taux - a.taux)
  }, [activeList])

  // TVA by period for declarations
  const tvaDeclarations = useMemo(() => {
    if (tvaPeriod === 'mensuel') {
      return MOIS_FR.map((label, i) => ({ label, tva: monthlyTVA[i], ht: monthlyCA[i] }))
    }
    if (tvaPeriod === 'trimestriel') {
      return ['T1', 'T2', 'T3', 'T4'].map((label, i) => ({
        label,
        tva: quarterlyTVA[i],
        ht: monthlyCA.slice(i * 3, i * 3 + 3).reduce((s, v) => s + v, 0),
      }))
    }
    // annuel
    return [{ label: String(thisYear), tva: monthlyTVA.reduce((s, v) => s + v, 0), ht: monthlyCA.reduce((s, v) => s + v, 0) }]
  }, [tvaPeriod, monthlyTVA, monthlyCA, quarterlyTVA, thisYear])

  // IS estimation (simplified: 15% up to 42500, 25% above)
  const resultatBrut = totalCA * 0.3 // assuming 30% net margin (simplified)
  const isEstimate = resultatBrut <= 42500
    ? resultatBrut * 0.15
    : 42500 * 0.15 + (resultatBrut - 42500) * 0.25

  // ── Factures tab helpers ────────────────────────────────────────────────────
  const filtered = list.filter(f => {
    const matchSearch =
      f.numero.toLowerCase().includes(search.toLowerCase()) ||
      (clientMap[f.client_id] ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatut = filterStatut === 'tous' || f.statut === filterStatut
    return matchSearch && matchStatut
  })

  function setF<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  const clientOts = form.client_id ? ots.filter(o => o.client_id === form.client_id) : ots

  async function submit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    if (form.date_echeance && form.date_echeance < form.date_emission) {
      setFormError('La date d\'échéance ne peut pas être antérieure à la date d\'émission.')
      return
    }
    if (form.ot_id) {
      const contract = getAffretementContractByOtId(form.ot_id)
      if (contract) {
        const readiness = evaluateAffretementCompletionReadiness(contract)
        if (!readiness.readyForCompletion) {
          setFormError('Facturation bloquée : les statuts de course affrétée sont incomplets.')
          return
        }
      }
    }
    setSaving(true)
    const montant_tva = form.montant_ht * (form.taux_tva / 100)
    const montant_ttc = form.montant_ht + montant_tva
    const { error } = await supabase.from('factures').insert({ ...form, montant_tva, montant_ttc })
    setSaving(false)
    if (error) {
      setFormError(`Erreur lors de la création : ${error.message}`)
      return
    }
    setShowForm(false)
    loadAll()
  }

  async function updateStatut(f: Facture, statut: string) {
    setActionError(null)
    const extra: Record<string, string | null> = {}
    if (statut === 'payee') extra.date_paiement = new Date().toISOString().split('T')[0]
    const { error } = await supabase.from('factures').update({ statut, ...extra }).eq('id', f.id)
    if (error) {
      setActionError(`Impossible de mettre à jour le statut : ${error.message}`)
      return
    }
    if (selected?.id === f.id) setSelected({ ...f, statut })
    loadAll()
  }

  async function del(id: string) {
    if (!confirm('Supprimer cette facture ?')) return
    setActionError(null)
    const { error } = await supabase.from('factures').delete().eq('id', id)
    if (error) {
      setActionError(`Impossible de supprimer la facture : ${error.message}`)
      return
    }
    if (selected?.id === id) setSelected(null)
    loadAll()
  }

  // ── Journal helpers ─────────────────────────────────────────────────────────
  function addEntry(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const debit = parseFloat(journalForm.debit) || 0
    const credit = parseFloat(journalForm.credit) || 0
    if (!journalForm.libelle || !journalForm.compte || (debit === 0 && credit === 0)) return
    setEntries(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      date: journalForm.date,
      libelle: journalForm.libelle,
      compte: journalForm.compte,
      debit,
      credit,
    }])
    setJournalForm(f => ({ ...f, libelle: '', compte: '', debit: '', credit: '' }))
  }

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0)
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0)

  // ── TVA calculator ──────────────────────────────────────────────────────────
  const calcHT = parseFloat(tvaCalcHT) || 0
  const calcTVA = calcHT * (tvaCalcTaux / 100)
  const calcTTC = calcHT + calcTVA

  // ── Prévisionnel ────────────────────────────────────────────────────────────
  const totalBudget = budgets.reduce((s, v) => s + v, 0)
  const totalReel = monthlyCA.reduce((s, v) => s + v, 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Comptabilité</h2>
          <p className="text-slate-500 text-sm">{list.length} facture{list.length !== 1 ? 's' : ''} · CA {fmtEur(totalCA)}</p>
        </div>
        {tab === 'factures' && (
          <button onClick={() => setShowForm(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
            + Nouvelle facture
          </button>
        )}
      </div>

      <TabBar active={tab} onChange={t => { setTab(t); setSelected(null); setActionError(null) }} />

      {actionError && (
        <div className="mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ══ TAB: FACTURES ══════════════════════════════════════════════════════ */}
      {tab === 'factures' && (
        <div className="flex gap-6 flex-1 min-h-0">
          <div className={`flex-1 min-w-0 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <MiniStat label="En attente" value={fmtEur(totalEnAttente)} color="blue" />
              <MiniStat label="En retard" value={fmtEur(totalEnRetard)} color="red" />
              <MiniStat label="Encaissé ce mois" value={fmtEur(totalPayeeMois)} color="green" />
            </div>
            <div className="flex gap-3 mb-4 flex-wrap">
              <input
                type="text"
                placeholder="N° facture ou client..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-52 outline-none focus:ring-2 focus:ring-slate-300"
              />
              <div className="flex gap-1 flex-wrap">
                {['tous', ...Object.keys(STATUT_LABELS)].map(s => (
                  <button key={s} onClick={() => setFilterStatut(s)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterStatut === s ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {s === 'tous' ? 'Toutes' : STATUT_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm">Chargement...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  {search || filterStatut !== 'tous' ? 'Aucun résultat' : 'Aucune facture enregistrée'}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {['Numéro', 'Client', 'Émission', 'Échéance', 'Montant HT', 'TTC', 'Statut', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((f, i) => {
                      const isLate = f.statut === 'envoyee' && f.date_echeance && new Date(f.date_echeance) < new Date()
                      return (
                        <tr key={f.id} onClick={() => setSelected(f)}
                          className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors ${selected?.id === f.id ? 'bg-blue-50' : i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                          <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{f.numero}</td>
                          <td className="px-4 py-3 text-slate-700">{clientMap[f.client_id] ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{new Date(f.date_emission).toLocaleDateString('fr-FR')}</td>
                          <td className={`px-4 py-3 ${isLate ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                            {f.date_echeance ? new Date(f.date_echeance).toLocaleDateString('fr-FR') : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{fmtEur(f.montant_ht)}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{f.montant_ttc != null ? fmtEur(f.montant_ttc) : '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUT_COLORS[f.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                              {STATUT_LABELS[f.statut] ?? f.statut}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={ev => { ev.stopPropagation(); del(f.id) }} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Suppr.</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {selected && (
            <div className="w-full lg:w-[42%] shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between p-5 border-b">
                  <div>
                    <p className="text-xs font-mono text-slate-400 mb-0.5">{selected.numero}</p>
                    <h3 className="text-lg font-bold text-slate-800">{clientMap[selected.client_id] ?? '—'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_COLORS[selected.statut] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUT_LABELS[selected.statut] ?? selected.statut}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">✕</button>
                </div>
                <div className="px-5 py-3 border-b bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-2">Changer le statut</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(STATUT_LABELS).map(([k, v]) => (
                      <button key={k} onClick={() => updateStatut(selected, k)} disabled={selected.statut === k}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${selected.statut === k ? 'bg-slate-200 text-slate-500 cursor-default' : 'border border-slate-200 text-slate-600 hover:bg-white hover:shadow-sm'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4 text-sm">
                  <Info label="OT lié" value={selected.ot_id ? otMap[selected.ot_id] : null} />
                  <Info label="Date d'émission" value={new Date(selected.date_emission).toLocaleDateString('fr-FR')} />
                  <Info label="Date d'échéance" value={selected.date_echeance ? new Date(selected.date_echeance).toLocaleDateString('fr-FR') : null} />
                  <Info label="Date de paiement" value={selected.date_paiement ? new Date(selected.date_paiement).toLocaleDateString('fr-FR') : null} />
                  <Info label="Mode de paiement" value={selected.mode_paiement ? MODE_PAIEMENT_LABELS[selected.mode_paiement] ?? selected.mode_paiement : null} />
                  <div className="col-span-2 border-t pt-4 mt-1">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-slate-500">Montant HT</span><span className="font-medium text-slate-800">{fmtEur(selected.montant_ht)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-slate-500">TVA ({selected.taux_tva}%)</span><span className="text-slate-600">{fmtEur(selected.montant_tva ?? 0)}</span></div>
                      <div className="flex justify-between text-sm border-t pt-2 mt-1"><span className="font-semibold text-slate-700">Total TTC</span><span className="font-bold text-slate-900 text-base">{fmtEur(selected.montant_ttc ?? selected.montant_ht)}</span></div>
                    </div>
                  </div>
                  {selected.notes && <div className="col-span-2"><span className="text-xs font-medium text-slate-500">Notes</span><p className="text-slate-600 mt-0.5">{selected.notes}</p></div>}
                  {(selected.statut === 'envoyee' || selected.statut === 'payee') && (
                    <div className="col-span-2 border-t pt-4 mt-1">
                      <p className="text-xs font-medium text-slate-500 mb-2">Écriture comptable</p>
                      {comptaLoading ? (
                        <p className="text-xs text-slate-400">Vérification...</p>
                      ) : comptaInfo ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">✓ Générée</span>
                          <span className="text-xs text-slate-500">Mouvement VT-{comptaInfo.numero_mouvement} · {new Date(comptaInfo.date_ecriture).toLocaleDateString('fr-FR')}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${comptaInfo.statut === 'validee' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                            {comptaInfo.statut === 'validee' ? 'Validée' : 'Brouillon'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">⏳ En attente</span>
                          <span className="text-xs text-slate-400">Aucune écriture générée</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: TVA & TAXES ════════════════════════════════════════════════════ */}
      {tab === 'tva' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="CA HT total" value={fmtEur(totalCA)} color="slate" />
            <MiniStat label="TVA collectée" value={fmtEur(totalTVACollectee)} color="blue" />
            <MiniStat label="Résultat brut estimé" value={fmtEur(resultatBrut)} color="green" sub="Marge 30% estimée" />
            <MiniStat label="IS estimé" value={fmtEur(isEstimate)} color="amber" sub="15% / 25% selon seuil" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calculateur TVA */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Calculateur TVA</h3>
              <div className="space-y-3">
                <Field label="Montant HT (€)">
                  <input className={inp} type="number" step="0.01" value={tvaCalcHT} onChange={e => setTvaCalcHT(e.target.value)} placeholder="0.00" />
                </Field>
                <Field label="Taux TVA">
                  <select className={inp} value={tvaCalcTaux} onChange={e => setTvaCalcTaux(parseFloat(e.target.value))}>
                    {TAUX_TVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
                  </select>
                </Field>
              </div>
              {calcHT > 0 && (
                <div className="mt-4 bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-600"><span>Montant HT</span><span className="font-medium">{fmtEur(calcHT)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>TVA {tvaCalcTaux} %</span><span>{fmtEur(calcTVA)}</span></div>
                  <div className="flex justify-between font-bold text-slate-800 border-t pt-2"><span>Total TTC</span><span className="text-lg">{fmtEur(calcTTC)}</span></div>
                </div>
              )}
              {/* TVA par taux */}
              {tvaByRate.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Répartition par taux</p>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="text-left py-1.5">Taux</th>
                      <th className="text-right py-1.5">Base HT</th>
                      <th className="text-right py-1.5">TVA</th>
                    </tr></thead>
                    <tbody>
                      {tvaByRate.map(r => (
                        <tr key={r.taux} className="border-b border-slate-50">
                          <td className="py-1.5 text-slate-700">{r.taux} %</td>
                          <td className="py-1.5 text-right text-slate-600">{fmtEur(r.ht)}</td>
                          <td className="py-1.5 text-right font-medium text-slate-800">{fmtEur(r.tva)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Déclarations TVA */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Déclarations TVA — {thisYear}</h3>
                <div className="flex gap-1">
                  {(['mensuel', 'trimestriel', 'annuel'] as const).map(p => (
                    <button key={p} onClick={() => setTvaPeriod(p)}
                      className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${tvaPeriod === p ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {p === 'mensuel' ? 'Mensuel' : p === 'trimestriel' ? 'Trim.' : 'Annuel'}
                    </button>
                  ))}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-400 border-b border-slate-100">
                  <th className="text-left py-1.5">Période</th>
                  <th className="text-right py-1.5">CA HT</th>
                  <th className="text-right py-1.5">TVA collectée</th>
                  <th className="text-right py-1.5">Statut</th>
                </tr></thead>
                <tbody>
                  {tvaDeclarations.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 font-medium text-slate-700">{row.label}</td>
                      <td className="py-2 text-right text-slate-600">{fmtEur(row.ht)}</td>
                      <td className="py-2 text-right font-medium text-slate-800">{fmtEur(row.tva)}</td>
                      <td className="py-2 text-right">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${row.tva > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-400'}`}>
                          {row.tva > 0 ? 'À déclarer' : 'Néant'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* IS summary */}
              <div className="mt-5 pt-4 border-t space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Simulation IS {thisYear}</p>
                <div className="flex justify-between text-sm text-slate-600"><span>CA total HT</span><span>{fmtEur(totalCA)}</span></div>
                <div className="flex justify-between text-sm text-slate-600"><span>Résultat estimé (30%)</span><span>{fmtEur(resultatBrut)}</span></div>
                <div className="flex justify-between text-sm text-slate-600"><span>Tranche 15% (≤ 42 500 €)</span><span>{fmtEur(Math.min(resultatBrut, 42500) * 0.15)}</span></div>
                {resultatBrut > 42500 && <div className="flex justify-between text-sm text-slate-600"><span>Tranche 25% (au-delà)</span><span>{fmtEur((resultatBrut - 42500) * 0.25)}</span></div>}
                <div className="flex justify-between text-sm font-bold text-slate-800 border-t pt-2"><span>IS estimé</span><span>{fmtEur(isEstimate)}</span></div>
                <p className="text-[11px] text-amber-600 italic mt-2">⚠ Simulation indicative uniquement — marge nette hypothétique 30%, sans charges réelles. Consultez votre expert-comptable.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: TRÉSORERIE ═════════════════════════════════════════════════════ */}
      {tab === 'tresorerie' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Encaissé total" value={fmtEur(totalEncaisse)} color="green" />
            <MiniStat label="En attente" value={fmtEur(totalEnAttente)} color="blue" />
            <MiniStat label="En retard" value={fmtEur(totalEnRetard)} color="red" />
            <MiniStat label="Taux recouvrement" value={fmtPct(tauxRecouvrement)} color={tauxRecouvrement >= 80 ? 'green' : tauxRecouvrement >= 50 ? 'amber' : 'red'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Flux mensuel encaissé */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Flux encaissé mensuel — {thisYear}</h3>
              <BarChart
                data={MOIS_FR.map((label, i) => ({ label, value: monthlyEncaisse[i] }))}
                height={140}
                color="#10b981"
              />
              <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                <span className="text-slate-500">Total encaissé {thisYear}</span>
                <span className="font-semibold text-slate-800">{fmtEur(monthlyEncaisse.reduce((s, v) => s + v, 0))}</span>
              </div>
            </div>

            {/* Taux de recouvrement visuel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Recouvrement & balance</h3>
              <div className="space-y-4">
                {[
                  { label: 'Encaissé', value: totalEncaisse, color: 'bg-emerald-500' },
                  { label: 'En attente', value: totalEnAttente, color: 'bg-blue-400' },
                  { label: 'En retard', value: totalEnRetard, color: 'bg-red-400' },
                ].map(row => {
                  const total = totalEncaisse + totalEnAttente + totalEnRetard
                  const pct = total > 0 ? (row.value / total) * 100 : 0
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="font-medium text-slate-800">{fmtEur(row.value)} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${row.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Upcoming */}
              {upcoming.length > 0 && (
                <div className="mt-5 pt-4 border-t">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Échéances dans 30 jours ({upcoming.length})</p>
                  <div className="space-y-1.5">
                    {upcoming.slice(0, 5).map(f => (
                      <div key={f.id} className="flex justify-between items-center text-sm">
                        <div>
                          <span className="font-mono text-xs text-slate-500">{f.numero}</span>
                          <span className="ml-2 text-slate-700">{clientMap[f.client_id] ?? '—'}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium text-slate-800">{fmtEur(f.montant_ttc ?? f.montant_ht)}</span>
                          <span className="ml-2 text-xs text-amber-600">{new Date(f.date_echeance!).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tableau CA vs encaissé */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">CA facturé vs encaissé par mois — {thisYear}</h3>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-2 text-xs text-slate-500"><div className="w-3 h-3 rounded bg-slate-700" />CA facturé</div>
              <div className="flex items-center gap-2 text-xs text-slate-500"><div className="w-3 h-3 rounded bg-emerald-400" />Encaissé</div>
            </div>
            <DualBarChart
              data={MOIS_FR.map((label, i) => ({ label, a: monthlyCA[i], b: monthlyEncaisse[i] }))}
              height={140}
            />
          </div>
        </div>
      )}

      {/* ══ TAB: PRÉVISIONNEL ═══════════════════════════════════════════════════ */}
      {tab === 'previsionnel' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Budget annuel" value={fmtEur(totalBudget)} color="slate" />
            <MiniStat label="CA réel" value={fmtEur(totalReel)} color="green" />
            <MiniStat label="Écart" value={fmtEur(totalReel - totalBudget)} color={totalReel >= totalBudget ? 'green' : 'red'} />
            <MiniStat label="Avancement" value={totalBudget > 0 ? fmtPct((totalReel / totalBudget) * 100) : '—'} color="blue" />
          </div>

          {/* Visual comparison */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Budget vs Réel — {thisYear}</h3>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500"><div className="w-3 h-3 rounded bg-slate-700" />Budget</div>
              <div className="flex items-center gap-2 text-xs text-slate-500"><div className="w-3 h-3 rounded bg-emerald-400" />Réel</div>
            </div>
            <DualBarChart
              data={MOIS_FR.map((label, i) => ({ label, a: budgets[i], b: monthlyCA[i] }))}
              height={160}
            />
          </div>

          {/* Table budget */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Tableau budgétaire mensuel</p>
              <p className="text-xs text-slate-400">Cliquez sur un budget pour le modifier</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-slate-400 border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-2.5">Mois</th>
                <th className="text-right px-4 py-2.5">Budget</th>
                <th className="text-right px-4 py-2.5">CA réel</th>
                <th className="text-right px-4 py-2.5">Écart</th>
                <th className="text-right px-4 py-2.5">%</th>
              </tr></thead>
              <tbody>
                {MOIS_FR.map((mois, i) => {
                  const ecart = monthlyCA[i] - budgets[i]
                  const pct = budgets[i] > 0 ? (monthlyCA[i] / budgets[i]) * 100 : null
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{mois} {thisYear}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">
                        {editBudget === i ? (
                          <form onSubmit={e => { e.preventDefault(); const v = parseFloat(budgetInput) || 0; setBudgets(b => b.map((x, j) => j === i ? v : x)); setEditBudget(null) }} className="inline">
                            <input autoFocus type="number" step="100" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                              onBlur={() => { const v = parseFloat(budgetInput) || 0; setBudgets(b => b.map((x, j) => j === i ? v : x)); setEditBudget(null) }}
                              className="w-28 px-2 py-0.5 border border-blue-300 rounded text-right text-sm outline-none" />
                          </form>
                        ) : (
                          <button onClick={() => { setEditBudget(i); setBudgetInput(String(budgets[i])) }}
                            className="hover:bg-slate-100 px-2 py-0.5 rounded transition-colors">
                            {fmtEur(budgets[i])}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">{fmtEur(monthlyCA[i])}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${ecart > 0 ? 'text-emerald-600' : ecart < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {ecart > 0 ? '+' : ''}{fmtEur(ecart)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {pct !== null ? (
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pct >= 100 ? 'bg-green-100 text-green-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {pct.toFixed(0)} %
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td className="px-4 py-3 font-bold text-slate-800">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtEur(totalBudget)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtEur(totalReel)}</td>
                  <td className={`px-4 py-3 text-right font-bold ${totalReel >= totalBudget ? 'text-emerald-600' : 'text-red-500'}`}>
                    {totalReel - totalBudget > 0 ? '+' : ''}{fmtEur(totalReel - totalBudget)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700">
                    {totalBudget > 0 ? fmtPct((totalReel / totalBudget) * 100) : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Projection annuelle */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Projection annuelle</h3>
            {(() => {
              const moisCoules = new Date().getMonth() + 1
              const moyenneMensuelle = moisCoules > 0 ? totalReel / moisCoules : 0
              const projection = moyenneMensuelle * 12
              const resteAFaire = projection - totalReel
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Mois écoulés</p><p className="font-bold text-slate-800 text-lg">{moisCoules}</p></div>
                  <div className="bg-slate-50 rounded-lg p-3"><p className="text-xs text-slate-500">Moyenne / mois</p><p className="font-bold text-slate-800 text-lg">{fmtEur(moyenneMensuelle)}</p></div>
                  <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs text-blue-600">CA projeté {thisYear}</p><p className="font-bold text-blue-800 text-lg">{fmtEur(projection)}</p></div>
                  <div className="bg-emerald-50 rounded-lg p-3"><p className="text-xs text-emerald-600">Reste à facturer</p><p className="font-bold text-emerald-800 text-lg">{fmtEur(Math.max(0, resteAFaire))}</p></div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ══ TAB: RAPPORTS ═══════════════════════════════════════════════════════ */}
      {tab === 'rapports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Factures émises" value={String(list.filter(f => f.statut !== 'annulee').length)} color="slate" />
            <MiniStat label="CA moyen / facture" value={list.filter(f => f.statut !== 'annulee').length > 0 ? fmtEur(totalCA / list.filter(f => f.statut !== 'annulee').length) : '—'} color="blue" />
            <MiniStat label="Délai moyen paiement" value="—" color="slate" sub="Données insuffisantes" />
            <MiniStat label="Taux impayés" value={fmtPct(totalEnRetard > 0 ? (totalEnRetard / (totalEncaisse + totalEnAttente + totalEnRetard)) * 100 : 0)} color={totalEnRetard > 0 ? 'red' : 'green'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CA mensuel */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">CA HT mensuel — {thisYear}</h3>
              <BarChart
                data={MOIS_FR.map((label, i) => ({ label, value: monthlyCA[i] }))}
                height={140}
                color="#334155"
              />
              <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div><span className="block font-semibold text-slate-700">{fmtEur(Math.max(...monthlyCA))}</span>Meilleur mois</div>
                <div><span className="block font-semibold text-slate-700">{fmtEur(monthlyCA.filter(v => v > 0).reduce((s, v, _, a) => s + v / a.length, 0))}</span>Moyenne</div>
                <div><span className="block font-semibold text-slate-700">{fmtEur(totalCA)}</span>Total {thisYear}</div>
              </div>
            </div>

            {/* TVA trimestrielle */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">TVA collectée par trimestre — {thisYear}</h3>
              <BarChart
                data={['T1', 'T2', 'T3', 'T4'].map((label, i) => ({ label, value: quarterlyTVA[i] }))}
                height={140}
                color="#3b82f6"
              />
              <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                <span className="text-slate-500">TVA totale {thisYear}</span>
                <span className="font-semibold text-slate-800">{fmtEur(totalTVACollectee)}</span>
              </div>
            </div>
          </div>

          {/* Top clients */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Top clients par CA encaissé</h3>
            {topClients.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-3">
                {topClients.map((c, i) => {
                  const pct = topClients[0].ca > 0 ? (c.ca / topClients[0].ca) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                      <span className="text-sm text-slate-700 w-40 truncate">{c.nom}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-700 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-slate-800 text-right w-28">{fmtEur(c.ca)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Répartition statuts */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Répartition des factures par statut</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Object.entries(STATUT_LABELS).map(([k, v]) => {
                const count = list.filter(f => f.statut === k).length
                const pct = list.length > 0 ? (count / list.length) * 100 : 0
                return (
                  <div key={k} className={`rounded-lg border p-3 ${STATUT_COLORS[k] ?? 'bg-slate-100 text-slate-600'}`}>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-xs mt-0.5 opacity-80">{v}</p>
                    <p className="text-xs mt-1 opacity-60">{pct.toFixed(0)} %</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ TAB: JOURNAL ════════════════════════════════════════════════════════ */}
      {tab === 'journal' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Total débit" value={fmtEur(totalDebit)} color="slate" />
            <MiniStat label="Total crédit" value={fmtEur(totalCredit)} color="slate" />
            <MiniStat label="Balance" value={fmtEur(totalDebit - totalCredit)} color={Math.abs(totalDebit - totalCredit) < 0.01 ? 'green' : 'amber'} sub={Math.abs(totalDebit - totalCredit) < 0.01 ? 'Équilibrée' : 'À équilibrer'} />
          </div>

          {/* Saisie */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Saisie d'écriture</h3>
            <form onSubmit={addEntry} className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <Field label="Date">
                <input className={inp} type="date" value={journalForm.date} onChange={e => setJournalForm(f => ({ ...f, date: e.target.value }))} required />
              </Field>
              <div className="lg:col-span-2">
                <Field label="Libellé">
                  <input className={inp} value={journalForm.libelle} onChange={e => setJournalForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Description de l'opération" required />
                </Field>
              </div>
              <Field label="Compte">
                <select className={inp} value={journalForm.compte} onChange={e => setJournalForm(f => ({ ...f, compte: e.target.value }))} required>
                  <option value="">Sélectionner...</option>
                  {COMPTES_COMPTABLES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Débit (€)">
                  <input className={inp} type="number" step="0.01" value={journalForm.debit} onChange={e => setJournalForm(f => ({ ...f, debit: e.target.value, credit: '' }))} placeholder="0.00" />
                </Field>
                <Field label="Crédit (€)">
                  <input className={inp} type="number" step="0.01" value={journalForm.credit} onChange={e => setJournalForm(f => ({ ...f, credit: e.target.value, debit: '' }))} placeholder="0.00" />
                </Field>
              </div>
              <button type="submit" className="lg:col-span-5 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                Ajouter l'écriture
              </button>
            </form>
          </div>

          {/* Journal entries table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Journal comptable ({entries.length} écritures)</p>
              {entries.length > 0 && (
                <button onClick={() => setEntries([])} className="text-xs text-slate-400 hover:text-red-500 transition-colors">Effacer tout</button>
              )}
            </div>
            {entries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucune écriture saisie. Utilisez le formulaire ci-dessus pour commencer.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Date', 'Libellé', 'Compte', 'Débit', 'Crédit', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={e.id} className={`border-t border-slate-100 ${i % 2 !== 0 ? 'bg-slate-50' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-600">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-slate-700">{e.libelle}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs font-mono">{e.compte}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">{e.debit > 0 ? fmtEur(e.debit) : '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">{e.credit > 0 ? fmtEur(e.credit) : '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setEntries(prev => prev.filter(x => x.id !== e.id))} className="text-xs text-slate-400 hover:text-red-500 transition-colors">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs font-bold text-slate-600 uppercase">Totaux</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtEur(totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{fmtEur(totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ══ TAB: TARIFS TRANSPORT ══════════════════════════════════════════════ */}
      {tab === 'tarifs' && <TarifsTransportTab clients={clients} />}

      {/* ══ MODAL: Nouvelle facture ═════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-base font-semibold">Nouvelle facture</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Client *">
                    <select className={inp} value={form.client_id} onChange={e => { setF('client_id', e.target.value); setF('ot_id', null); setFormError(null) }} required>
                      <option value="">Sélectionner un client</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="OT lié (optionnel)">
                    <select className={inp} value={form.ot_id ?? ''} onChange={e => { setF('ot_id', e.target.value || null); setFormError(null) }}>
                      <option value="">— Aucun OT</option>
                      {clientOts.map(o => {
                        const contract = getAffretementContractByOtId(o.id)
                        const readiness = contract ? evaluateAffretementCompletionReadiness(contract) : null
                        const blocked = Boolean(contract && !readiness?.readyForCompletion)
                        return (
                          <option key={o.id} value={o.id} disabled={blocked}>
                            {contract ? '[AFF] ' : ''}{o.reference}{blocked ? ' (statuts incomplets)' : ''}
                          </option>
                        )
                      })}
                    </select>
                  </Field>
                </div>
                {formError && <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">{formError}</div>}
                <Field label="Montant HT (€) *">
                  <input className={inp} type="number" step="0.01" value={form.montant_ht || ''} onChange={e => setF('montant_ht', parseFloat(e.target.value) || 0)} required />
                </Field>
                <Field label="TVA (%)">
                  <select className={inp} value={form.taux_tva} onChange={e => setF('taux_tva', parseFloat(e.target.value))}>
                    {TAUX_TVA_OPTIONS.map(t => <option key={t} value={t}>{t} %</option>)}
                  </select>
                </Field>
                <Field label="Date d'émission">
                  <input className={inp} type="date" value={form.date_emission} onChange={e => setF('date_emission', e.target.value)} />
                </Field>
                <Field label="Date d'échéance">
                  <input className={inp} type="date" value={form.date_echeance ?? ''} onChange={e => setF('date_echeance', e.target.value || null)} />
                </Field>
                <Field label="Statut">
                  <select className={inp} value={form.statut} onChange={e => setF('statut', e.target.value)}>
                    {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Mode de paiement">
                  <select className={inp} value={form.mode_paiement ?? ''} onChange={e => setF('mode_paiement', e.target.value || null)}>
                    <option value="">—</option>
                    {Object.entries(MODE_PAIEMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <div className="col-span-2">
                  <Field label="Notes"><textarea className={`${inp} resize-none h-16`} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value || null)} /></Field>
                </div>
                {form.montant_ht > 0 && (
                  <div className="col-span-2 bg-slate-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between text-slate-600"><span>HT</span><span>{fmtEur(form.montant_ht)}</span></div>
                    <div className="flex justify-between text-slate-600"><span>TVA {form.taux_tva}%</span><span>{fmtEur(form.montant_ht * form.taux_tva / 100)}</span></div>
                    <div className="flex justify-between font-bold text-slate-800 border-t pt-1.5 mt-1.5"><span>TTC</span><span>{fmtEur(form.montant_ht * (1 + form.taux_tva / 100))}</span></div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 mt-5 pt-4 border-t">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {saving ? 'Enregistrement...' : 'Créer la facture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
